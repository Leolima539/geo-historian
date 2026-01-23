import { history, routes, routeWaypoints, type HistoryItem, type InsertHistory, type Route, type RouteWaypoint } from "@shared/schema";
import { db } from "./db";
import { eq, desc, lt, sql } from "drizzle-orm";

// Haversine distance calculation in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface CreateRouteInput {
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  transportMode: string;
  waypoints: Array<{
    locationName: string;
    latitude: number;
    longitude: number;
    content: string;
    audio?: string;
  }>;
}

export interface IStorage {
  getHistory(limit?: number): Promise<HistoryItem[]>;
  createHistory(item: InsertHistory): Promise<HistoryItem>;
  deleteHistory(id: number): Promise<void>;
  findNearbyLocation(lat: number, lng: number, radiusMeters: number): Promise<HistoryItem | null>;
  updateHistoryAudio(id: number, audio: string): Promise<void>;
  cleanupOldHistory(daysOld: number): Promise<number>;
  getRoutes(): Promise<Route[]>;
  getRouteWithWaypoints(id: number): Promise<{ route: Route; waypoints: RouteWaypoint[] } | null>;
  createRoute(input: CreateRouteInput): Promise<Route>;
  deleteRoute(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getHistory(limit: number = 50): Promise<HistoryItem[]> {
    return await db.select()
      .from(history)
      .orderBy(desc(history.createdAt))
      .limit(limit);
  }

  async createHistory(insertItem: InsertHistory): Promise<HistoryItem> {
    const [item] = await db.insert(history)
      .values(insertItem)
      .returning();
    return item;
  }

  async deleteHistory(id: number): Promise<void> {
    await db.delete(history).where(eq(history.id, id));
  }

  async findNearbyLocation(lat: number, lng: number, radiusMeters: number = 100): Promise<HistoryItem | null> {
    // Get all history items and find the nearest one within radius
    const allHistory = await db.select().from(history);
    
    for (const item of allHistory) {
      const distance = getDistanceMeters(lat, lng, item.latitude, item.longitude);
      if (distance <= radiusMeters) {
        return item;
      }
    }
    return null;
  }

  async updateHistoryAudio(id: number, audio: string): Promise<void> {
    await db.update(history)
      .set({ audio })
      .where(eq(history.id, id));
  }

  async cleanupOldHistory(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await db.delete(history)
      .where(lt(history.createdAt, cutoffDate))
      .returning();
    
    return result.length;
  }

  async getRoutes(): Promise<Route[]> {
    return await db.select()
      .from(routes)
      .orderBy(desc(routes.createdAt));
  }

  async getRouteWithWaypoints(id: number): Promise<{ route: Route; waypoints: RouteWaypoint[] } | null> {
    const [route] = await db.select()
      .from(routes)
      .where(eq(routes.id, id));
    
    if (!route) return null;
    
    const waypoints = await db.select()
      .from(routeWaypoints)
      .where(eq(routeWaypoints.routeId, id))
      .orderBy(routeWaypoints.orderIndex);
    
    return { route, waypoints };
  }

  async createRoute(input: CreateRouteInput): Promise<Route> {
    const [route] = await db.insert(routes)
      .values({
        name: input.name,
        startLat: input.startLat,
        startLng: input.startLng,
        endLat: input.endLat,
        endLng: input.endLng,
        transportMode: input.transportMode,
      })
      .returning();
    
    // Insert waypoints
    if (input.waypoints.length > 0) {
      await db.insert(routeWaypoints).values(
        input.waypoints.map((wp, index) => ({
          routeId: route.id,
          locationName: wp.locationName,
          latitude: wp.latitude,
          longitude: wp.longitude,
          content: wp.content,
          audio: wp.audio,
          orderIndex: index,
        }))
      );
    }
    
    return route;
  }

  async deleteRoute(id: number): Promise<void> {
    await db.delete(routes).where(eq(routes.id, id));
  }
}

export const storage = new DatabaseStorage();
