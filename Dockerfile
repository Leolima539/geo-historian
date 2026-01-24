# ---- Builder (needs dev deps for Vite/Tailwind + esbuild) ----
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# Force-install dev + optional deps (esbuild/rollup platform binaries)
RUN npm ci --include=dev --include=optional

COPY . .

# Builds:
#  - client -> dist/public (via vite)
#  - server -> dist/index.js (via esbuild)
RUN npm run build


# ---- Runtime (prod deps only) ----
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
# Prod deps + optional deps (native binaries)
RUN npm ci --omit=dev --include=optional

COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/index.js"]
