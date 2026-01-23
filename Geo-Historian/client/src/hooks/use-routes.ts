import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Route, RouteWaypoint } from "@shared/schema";

export function useRoutes() {
  return useQuery<Route[]>({
    queryKey: ['/api/routes'],
  });
}

export function useRoute(id: number | null) {
  return useQuery<{ route: Route; waypoints: RouteWaypoint[] }>({
    queryKey: ['/api/routes', id],
    enabled: id !== null,
  });
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
  }>;
}

export function useCreateRoute() {
  return useMutation({
    mutationFn: async (input: CreateRouteInput) => {
      const res = await apiRequest('POST', '/api/routes', input);
      return res.json() as Promise<Route>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
    },
  });
}

export function useDeleteRoute() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/routes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
    },
  });
}
