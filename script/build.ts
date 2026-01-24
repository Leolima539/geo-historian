import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";

async function main() {
  // Build client (uses vite.config.ts, which outputs to dist/public)
  await viteBuild();

  // Build server (bundle server/index.ts -> dist/index.js)
  await esbuild({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: "dist/index.js",
    define: {
      "process.env.NODE_ENV": "\"production\""
    },
    external: ["pg-native"]
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
