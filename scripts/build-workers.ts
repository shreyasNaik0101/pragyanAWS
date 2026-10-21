import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
await fs.mkdir("dist/lambda", { recursive: true });
await build({
  entryPoints: {
    api: "services/api/lambda.ts",
    workers: "services/workers/handlers.ts",
  },
  outdir: "dist/lambda",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  // Remotion publishes both ESM and CJS clients. Its ESM build uses
  // import.meta.url, which becomes undefined inside a CJS Lambda bundle.
  alias: {
    "@remotion/lambda/client": path.resolve(
      "node_modules/@remotion/lambda/dist/client.js",
    ),
  },
  sourcemap: true,
  external: [
    "@remotion/bundler",
    "@remotion/renderer",
    "pdfjs-dist/legacy/build/pdf.mjs",
  ],
  logLevel: "info",
});
await fs.mkdir("dist/lambda/node_modules/pdfjs-dist", { recursive: true });
await fs.cp(
  "node_modules/pdfjs-dist/legacy",
  "dist/lambda/node_modules/pdfjs-dist/legacy",
  { recursive: true },
);
await fs.copyFile(
  "node_modules/pdfjs-dist/package.json",
  "dist/lambda/node_modules/pdfjs-dist/package.json",
);
await fs.writeFile(
  "dist/lambda/package.json",
  JSON.stringify({ type: "commonjs" }),
);
