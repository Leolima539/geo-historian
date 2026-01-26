// server/index.ts
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = Number(process.env.PORT || 8080);
const isProd = process.env.NODE_ENV === "production";

// --- middleware / api ---
app.use(express.json());

// ✅ health check (Fly and debugging)
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

// If you have API routes later, mount them like this:
// import routes from "./routes";
// app.use("/api", routes);

if (isProd) {
  // --- serve client build in production only ---
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Expect build output at /app/dist/client
  const clientDir = path.resolve(process.cwd(), "dist", "client");
  const indexHtml = path.join(clientDir, "index.html");

  app.use(express.static(clientDir));

  // SPA fallback
  app.get("*", (req, res) => {
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
    // If build is missing, show a clear message instead of crashing
    return res
      .status(500)
      .send("Client build missing. Expected dist/client/index.html");
  });
} else {
  // --- dev mode ---
  // In dev, Vite serves the UI (usually http://localhost:5173).
  app.get("/", (req, res) => {
    res
      .status(200)
      .send("Backend is running. Open the UI at the Vite dev server (see terminal output).");
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[express] serving on port ${PORT}`);
});
