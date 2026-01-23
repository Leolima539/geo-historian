import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { exploreLocation } from "./wikipedia";

// Rate limiting: Track requests per IP (kept for future use with Wikipedia API)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 30; // Max discoveries per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitMap.entries());
  for (const [ip, record] of entries) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

// Schedule daily cleanup of old history (90+ days)
setInterval(async () => {
  try {
    const deleted = await storage.cleanupOldHistory(90);
    if (deleted > 0) {
      console.log(`Cleaned up ${deleted} old history entries`);
    }
  } catch (err) {
    console.error("History cleanup error:", err);
  }
}, 24 * 60 * 60 * 1000); // Run daily

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Explore Endpoint - Uses Wikipedia API for free historical content
  app.post(api.explore.generate.path, async (req, res) => {
    try {
      const { latitude, longitude, language } = api.explore.generate.input.parse(req.body);
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      
      // Check rate limit
      if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ message: "Rate limit exceeded. Please try again later." });
      }
      
      const lang = language || 'en';
      
      // Check database cache first (within 100m) - only for default language (English)
      // Non-English requests bypass cache to ensure correct language content
      if (lang === 'en') {
        const cachedLocation = await storage.findNearbyLocation(latitude, longitude, 100);
        if (cachedLocation) {
          return res.json({
            locationName: cachedLocation.locationName,
            content: cachedLocation.content,
            cached: true,
            historyId: cachedLocation.id,
          });
        }
      }
      
      // Fetch from Wikipedia
      const wikiResult = await exploreLocation(latitude, longitude, lang);
      
      if (!wikiResult) {
        // No Wikipedia articles found nearby
        const fallbackResult = {
          locationName: lang === 'es' ? "Área sin explorar" : "Unexplored Area",
          content: lang === 'es' 
            ? "No se encontraron artículos de Wikipedia cerca de esta ubicación. Intenta explorar un área con más lugares de interés histórico o cultural."
            : "No Wikipedia articles found near this location. Try exploring an area with more historical or cultural landmarks.",
        };
        
        const historyItem = await storage.createHistory({
          locationName: fallbackResult.locationName,
          latitude,
          longitude,
          content: fallbackResult.content,
        });

        return res.json({
          ...fallbackResult,
          cached: false,
          historyId: historyItem.id,
        });
      }
      
      // Save to history
      const historyItem = await storage.createHistory({
        locationName: wikiResult.locationName,
        latitude,
        longitude,
        content: wikiResult.content,
      });

      res.json({
        locationName: wikiResult.locationName,
        content: wikiResult.content,
        cached: false,
        historyId: historyItem.id,
      });
    } catch (err) {
      console.error("Explore error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to generate exploration content" });
    }
  });
  
  // Preload Endpoint - Uses Wikipedia API for route waypoints
  app.post(api.explore.preload.path, async (req, res) => {
    try {
      const { waypoints, language } = api.explore.preload.input.parse(req.body);
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const lang = language || 'en';
      
      // Process all waypoints - return cached or fetch from Wikipedia
      const discoveries = await Promise.all(
        waypoints.map(async ({ latitude, longitude }) => {
          // Check cache first - only for default language (English)
          if (lang === 'en') {
            const cachedLocation = await storage.findNearbyLocation(latitude, longitude, 100);
            if (cachedLocation) {
              return {
                latitude,
                longitude,
                locationName: cachedLocation.locationName,
                content: cachedLocation.content,
                cached: true,
                historyId: cachedLocation.id,
              };
            }
          }
          
          // Check rate limit for non-cached waypoints
          if (!checkRateLimit(clientIp)) {
            return null; // Skip rate-limited waypoints
          }
          
          // Fetch from Wikipedia
          const wikiResult = await exploreLocation(latitude, longitude, lang);
          
          if (!wikiResult) {
            return null; // No content found for this waypoint
          }
          
          // Save to history
          const historyItem = await storage.createHistory({
            locationName: wikiResult.locationName,
            latitude,
            longitude,
            content: wikiResult.content,
          });

          return {
            latitude,
            longitude,
            locationName: wikiResult.locationName,
            content: wikiResult.content,
            cached: false,
            historyId: historyItem.id,
          };
        })
      );

      res.json(discoveries.filter(Boolean));
    } catch (err) {
      console.error("Preload error:", err);
      res.status(500).json({ message: "Failed to preload discoveries" });
    }
  });

  // History Endpoints
  app.get(api.history.list.path, async (req, res) => {
    const history = await storage.getHistory();
    res.json(history);
  });

  app.post(api.history.create.path, async (req, res) => {
    try {
      const input = api.history.create.input.parse(req.body);
      const item = await storage.createHistory(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.history.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    await storage.deleteHistory(id);
    res.status(204).send();
  });

  // Routes Endpoints
  app.get(api.routes.list.path, async (req, res) => {
    const routesList = await storage.getRoutes();
    res.json(routesList);
  });

  app.get(api.routes.get.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const result = await storage.getRouteWithWaypoints(id);
    if (!result) {
      return res.status(404).json({ message: "Route not found" });
    }
    res.json(result);
  });

  app.post(api.routes.create.path, async (req, res) => {
    try {
      const input = api.routes.create.input.parse(req.body);
      const route = await storage.createRoute(input);
      res.status(201).json(route);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.routes.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    await storage.deleteRoute(id);
    res.status(204).send();
  });

  return httpServer;
}
