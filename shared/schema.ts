import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const history = pgTable("history", {
  id: serial("id").primaryKey(),
  locationName: text("location_name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  content: text("content").notNull(),
  audio: text("audio"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertHistorySchema = createInsertSchema(history).omit({ 
  id: true, 
  createdAt: true 
});

export type HistoryItem = typeof history.$inferSelect;
export type InsertHistory = z.infer<typeof insertHistorySchema>;

// Request type for the exploration endpoint
export const exploreRequestSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  language: z.enum(["en", "es"]).optional(),
});

export type ExploreRequest = z.infer<typeof exploreRequestSchema>;

// Request type for preloading waypoints along a route
export const preloadRequestSchema = z.object({
  waypoints: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
  })).max(5),
  language: z.enum(["en", "es"]).optional(),
});

export type PreloadRequest = z.infer<typeof preloadRequestSchema>;

// Response type for preloaded discoveries
export interface PreloadedDiscovery {
  latitude: number;
  longitude: number;
  locationName: string;
  content: string;
  historyId?: number;
  cached?: boolean;
}

// Response type for exploration
export interface RelatedLocation {
  locationName: string;
  latitude: number;
  longitude: number;
  snippet: string;
}

export interface ExploreResponse {
  locationName: string;
  content: string;
  relatedLocations?: RelatedLocation[];
  cached?: boolean; // Indicates if content was from cache
  historyId?: number; // Database ID for caching
}

// Routes table for saving historical journeys
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startLat: doublePrecision("start_lat").notNull(),
  startLng: doublePrecision("start_lng").notNull(),
  endLat: doublePrecision("end_lat").notNull(),
  endLng: doublePrecision("end_lng").notNull(),
  transportMode: text("transport_mode").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Route waypoints - stores discovered locations along a route
export const routeWaypoints = pgTable("route_waypoints", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull().references(() => routes.id, { onDelete: "cascade" }),
  locationName: text("location_name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  content: text("content").notNull(),
  audio: text("audio"),
  orderIndex: integer("order_index").notNull(),
});

export const insertRouteSchema = createInsertSchema(routes).omit({ 
  id: true, 
  createdAt: true 
});

export const insertRouteWaypointSchema = createInsertSchema(routeWaypoints).omit({ 
  id: true 
});

export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type RouteWaypoint = typeof routeWaypoints.$inferSelect;
export type InsertRouteWaypoint = z.infer<typeof insertRouteWaypointSchema>;
