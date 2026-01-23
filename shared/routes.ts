import { z } from 'zod';
import { insertHistorySchema, history, exploreRequestSchema, preloadRequestSchema, insertRouteSchema, routes, routeWaypoints } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  explore: {
    generate: {
      method: 'POST' as const,
      path: '/api/explore',
      input: exploreRequestSchema,
      responses: {
        200: z.object({
          locationName: z.string(),
          content: z.string(),
          cached: z.boolean().optional(),
          historyId: z.number().optional(),
        }),
        429: z.object({ message: z.string() }), // Rate limit
        500: errorSchemas.internal,
      },
    },
    preload: {
      method: 'POST' as const,
      path: '/api/explore/preload',
      input: preloadRequestSchema,
      responses: {
        200: z.array(z.object({
          latitude: z.number(),
          longitude: z.number(),
          locationName: z.string(),
          content: z.string(),
          cached: z.boolean().optional(),
          historyId: z.number().optional(),
        })),
        429: z.object({ message: z.string() }), // Rate limit
        500: errorSchemas.internal,
      },
    },
  },
  history: {
    list: {
      method: 'GET' as const,
      path: '/api/history',
      responses: {
        200: z.array(z.custom<typeof history.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/history',
      input: insertHistorySchema,
      responses: {
        201: z.custom<typeof history.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/history/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  routes: {
    list: {
      method: 'GET' as const,
      path: '/api/routes',
      responses: {
        200: z.array(z.custom<typeof routes.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/routes/:id',
      responses: {
        200: z.object({
          route: z.custom<typeof routes.$inferSelect>(),
          waypoints: z.array(z.custom<typeof routeWaypoints.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/routes',
      input: z.object({
        name: z.string(),
        startLat: z.number(),
        startLng: z.number(),
        endLat: z.number(),
        endLng: z.number(),
        transportMode: z.string(),
        waypoints: z.array(z.object({
          locationName: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          content: z.string(),
        })),
      }),
      responses: {
        201: z.custom<typeof routes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/routes/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
