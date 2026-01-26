import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";

async function main() {
  // Build client (Vite -> dist/client or whatever your vite.config.ts outputs)
  await viteBuild();

  // Build server (compile + bundle ONLY your code; keep node_modules external)
  await esbuild({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",

    // Use .mjs so Node runs it as ESM regardless of package.json "type"
    outfile: "dist/index.mjs",

    // ✅ Key part of Option A:
    // Don't bundle dependencies from node_modules (express, drizzle, pg, etc)
    packages: "external",

    define: {
      "process.env.NODE_ENV": "\"production\"",
    },

    // Keep optional/native pg addon external
    external: ["pg-native"],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
