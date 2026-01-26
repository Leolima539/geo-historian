// server/index.ts
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
var app = express();
var PORT = Number(process.env.PORT || 8080);
var isProd = true;
app.use(express.json());
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});
if (isProd) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const clientDir = path.resolve(process.cwd(), "dist", "client");
  const indexHtml = path.join(clientDir, "index.html");
  app.use(express.static(clientDir));
  app.get("*", (req, res) => {
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
    return res.status(500).send("Client build missing. Expected dist/client/index.html");
  });
} else {
  app.get("/", (req, res) => {
    res.status(200).send("Backend is running. Open the UI at the Vite dev server (see terminal output).");
  });
}
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[express] serving on port ${PORT}`);
});
