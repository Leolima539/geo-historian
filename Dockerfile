FROM node:18-slim

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy rest of the source
COPY . .

# Build app
RUN npm run build

# Expose Fly port
EXPOSE 8080

# Start server
CMD ["node", "dist/index.js"]
