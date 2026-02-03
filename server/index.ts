// server/index.ts
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "http";
import { registerRoutes } from "./routes";

const app = express();
const PORT = Number(process.env.PORT || 8080);

app.use(express.json());

// ✅ Register API routes FIRST
async function main() {
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  // ✅ Serve built frontend in production (Fly uses this)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const clientDir = path.resolve(process.cwd(), "dist", "client");
  app.use(express.static(clientDir));

  // SPA fallback (only for non-API routes)
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] serving on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
