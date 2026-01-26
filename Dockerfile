# syntax=docker/dockerfile:1

FROM node:20-slim

WORKDIR /app

# Install deps (INCLUDING dev deps, because Vite/Tailwind build needs them)
COPY package.json package-lock.json ./
RUN npm install --include=dev --include=optional

# Copy the rest of the project and build
COPY . .
RUN npm run build

# Remove dev deps after build (smaller production image)
RUN npm prune --omit=dev && npm cache clean --force

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.mjs"]
