import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertHistory, HistoryItem } from "@shared/schema";

export function useHistory() {
  return useQuery({
    queryKey: [api.history.list.path],
    queryFn: async () => {
      const res = await fetch(api.history.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch history");
      return api.history.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertHistory) => {
      const res = await fetch(api.history.create.path, {
        method: api.history.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save history");
      return api.history.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.history.list.path] }),
  });
}

export function useDeleteHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.history.delete.path, { id });
      const res = await fetch(url, { 
        method: api.history.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.history.list.path] }),
  });
}
