FROM node:18-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY dist ./dist
COPY server ./server
COPY shared ./shared

EXPOSE 8080
CMD ["node", "dist/index.js"]
