import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve("./client"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve("./client/src"),
      "@shared": path.resolve("./shared"),
    },
  },
  build: {
    outDir: path.resolve("./dist/public"),
    emptyOutDir: true,
  },
});
