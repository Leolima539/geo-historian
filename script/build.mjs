import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";
import { rm } from "fs/promises";

async function main() {
  // Clean dist
  await rm("dist", { recursive: true, force: true });

  // Client build -> dist/public (per vite.config.ts)
  await viteBuild();

  // Server build -> dist/index.js (production entry)
  await esbuild({
    entryPoints: ["server/index.prod.ts"],
    platform: "node",
    target: "node20",
    format: "esm",
    bundle: true,
    packages: "external",
    outfile: "dist/index.js",
    define: {
      "process.env.NODE_ENV": "\"production\""
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
