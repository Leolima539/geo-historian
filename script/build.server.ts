import { build as esbuild } from "esbuild";
import { readFile } from "fs/promises";

const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

const pkg = JSON.parse(await readFile("package.json", "utf-8"));
const allDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
];
const externals = allDeps.filter((dep) => !allowlist.includes(dep));

await esbuild({
  entryPoints: ["server/index.prod.ts"],
  platform: "node",
  bundle: true,
  format: "esm",
  target: "node18",
  outfile: "dist/index.js",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  external: externals,
  minify: true,
});
