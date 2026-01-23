import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { PreloadRequest, PreloadedDiscovery } from "@shared/schema";

export function usePreload() {
  return useMutation({
    mutationFn: async (request: PreloadRequest): Promise<PreloadedDiscovery[]> => {
      const res = await fetch(api.explore.preload.path, {
        method: api.explore.preload.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to preload discoveries");
      }
      
      return res.json();
    },
  });
}

// Helper to generate waypoints between two points
export function generateWaypoints(
  start: [number, number],
  end: [number, number],
  count: number = 3
): { latitude: number; longitude: number }[] {
  const waypoints: { latitude: number; longitude: number }[] = [];
  
  for (let i = 1; i <= count; i++) {
    const ratio = i / (count + 1);
    waypoints.push({
      latitude: start[0] + (end[0] - start[0]) * ratio,
      longitude: start[1] + (end[1] - start[1]) * ratio,
    });
  }
  
  return waypoints;
}
