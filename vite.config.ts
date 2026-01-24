import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.resolve("./client"),
  plugins: [react()],
  build: {
    outDir: path.resolve("./dist/public"),
    emptyOutDir: true
  }
});
