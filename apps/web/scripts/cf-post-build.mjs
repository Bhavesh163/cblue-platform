/**
 * Post-build: copy the OpenNext worker bundle into a _worker.js/ DIRECTORY
 * inside .open-next/assets/ so Cloudflare Pages uses directory mode
 * (no re-bundling). This preserves all relative imports.
 *
 * Cloudflare Pages docs:
 *   "If you use a _worker.js directory instead of a file, the directory's
 *    contents will be served as-is without any additional processing."
 */
import { cpSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const src = ".open-next";
const dst = join(src, "assets", "_worker.js");

mkdirSync(dst, { recursive: true });

// Copy worker entry point as index.js
copyFileSync(join(src, "worker.js"), join(dst, "index.js"));

// Copy all directories (cloudflare/, middleware/, .build/, server-functions/, etc.)
for (const entry of readdirSync(src, { withFileTypes: true })) {
  if (entry.name === "assets" || entry.name === "worker.js") continue;
  if (entry.isDirectory()) {
    cpSync(join(src, entry.name), join(dst, entry.name), { recursive: true });
  }
}

console.log("✅ Worker bundle copied to _worker.js/ directory for Cloudflare Pages");
