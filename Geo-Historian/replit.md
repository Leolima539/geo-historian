# replit.md

## Overview

This is an interactive location exploration application that combines maps with historical content about places. Users can explore locations on a map and receive historical facts and stories about specific places. The app features a React frontend with Leaflet maps and an Express backend.

**Current Status:** Fully operational with free Wikipedia-based content. Zero operational cost.

## Recent Changes (January 2026)

- **MAJOR: Wikipedia Integration** - Real historical content from Wikipedia API (free, no API key)
- **Removed Paid AI** - OpenAI integration completely removed to achieve zero operational cost
- **Audio Narration Disabled** - AI text-to-speech removed (may add free alternative later)
- **Route Waypoint Markers**: Green markers display on map for preloaded and saved route waypoints
- **Live Location Tracking**: GPS tracking starts automatically when navigation begins
- **Save Routes**: Users can save historical routes with all waypoints to revisit later
- **Route Viewing**: Selecting a saved route shows first waypoint content immediately and centers map on it
- **Database Caching**: Locations saved to database, checked before API calls to avoid redundant usage
- **Rate Limiting**: 30 discoveries per hour per user to prevent abuse
- **Auto-Cleanup**: Old locations (90+ days) automatically deleted to manage storage
- **History Limit**: Only last 50 discoveries shown in history view

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Maps**: Leaflet with react-leaflet for interactive mapping
- **Animations**: Framer Motion for smooth UI transitions
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared for shared folder)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: shared/schema.ts contains all database table definitions
- **API Structure**: Routes defined in shared/routes.ts with Zod validation schemas
- **Development**: tsx for running TypeScript directly, Vite dev server with HMR

### Data Flow Pattern
1. Frontend hooks (client/src/hooks/) use React Query to call API endpoints
2. API routes are typed in shared/routes.ts with input/output Zod schemas
3. Server routes in server/routes.ts implement the API logic
4. Database operations use Drizzle ORM through server/storage.ts

### Key Design Decisions
- **Monorepo Structure**: Client, server, and shared code in one repository with TypeScript path aliases
- **Shared Types**: Zod schemas in shared/ folder ensure type safety between frontend and backend
- **Component Library**: Using shadcn/ui provides accessible, customizable components without heavy dependencies
- **Zero-Cost Priority**: Optimizing for free/public data sources and APIs

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via DATABASE_URL environment variable
- **Drizzle ORM**: Type-safe database queries with schema defined in shared/schema.ts
- **Drizzle Kit**: Database migrations via `npm run db:push`

### Mapping
- **OpenStreetMap**: Tile provider for Leaflet maps (free, no API key required)
- **Leaflet**: Core mapping library with react-leaflet React bindings

### Content API (Free)
- **Wikipedia REST API**: For location summaries and historical content (server/wikipedia.ts)
- **Geosearch API**: Finds Wikipedia articles near GPS coordinates
- **Supports**: English and Spanish content

### Planned Integrations
- **OSRM**: For free routing (future enhancement)

### Third-Party Libraries
- **date-fns**: Date formatting and manipulation
- **zod**: Runtime type validation for API requests/responses
- **connect-pg-simple**: PostgreSQL session storage (if sessions are needed)
