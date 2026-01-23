import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { ExploreRequest } from "@shared/schema";

export function useExplore() {
  return useMutation({
    mutationFn: async (location: ExploreRequest) => {
      const res = await fetch(api.explore.generate.path, {
        method: api.explore.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to explore location");
      }
      
      return api.explore.generate.responses[200].parse(await res.json());
    },
  });
}
