// Post-build guard for the immersive pages. Exit 1 on any violation.
//
//   · every page is immersive now: three.js must never be in the eager
//     graph of any of the five pages, and eager JS stays within budget (gzip)
//
// Usage: npm run build && npm run verify:3d
// BUDGET_KB overrides the eager budget (default 70) — used to prove the
// guard actually fails.
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dist = "dist";
const budgetKb = Number(process.env.BUDGET_KB ?? 70);
const fail = [];
const html = (p) => readFileSync(join(dist, p), "utf8");

/* every /_astro/*.js the HTML loads as a module: external src, plus the
   static imports inside inline module scripts */
function entryScripts(h) {
  const out = [...h.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  for (const m of h.matchAll(/<script type="module"[^>]*>([\s\S]*?)<\/script>/g)) {
    for (const i of m[1].matchAll(/(?:from|import)\s*"(\/_astro\/[^"]+\.js)"/g)) out.push(i[1]);
  }
  return out;
}

/* follow STATIC imports only — import("…") is lazy by definition */
function eagerGraph(h) {
  const seen = new Set();
  const queue = entryScripts(h);
  let bytes = 0;
  while (queue.length) {
    const s = queue.shift();
    if (seen.has(s)) continue;
    seen.add(s);
    const f = join(dist, s);
    /* a referenced chunk that isn't on disk would silently under-count the
       budget — treat it as a failure, not a skip */
    if (!existsSync(f)) {
      fail.push(`${s}: referenced by the page but missing from dist/`);
      continue;
    }
    const code = readFileSync(f);
    bytes += gzipSync(code).length;
    const src = code.toString();
    for (const m of src.matchAll(/(?:^|[;}\s])(?:import|export)[^"'()]*?from\s*["']\.\/([^"']+\.js)["']/g)) queue.push("/_astro/" + m[1]);
    for (const m of src.matchAll(/(?:^|[;}\s])import\s*["']\.\/([^"']+\.js)["']/g)) queue.push("/_astro/" + m[1]);
  }
  return { bytes, files: [...seen] };
}

for (const page of ["index.html", "projects/index.html", "about/index.html", "services/index.html", "contact/index.html"]) {
  const h = html(page);
  if (h.includes("three.module")) fail.push(`${page}: references three.module in HTML`);
  const { bytes, files } = eagerGraph(h);
  if (files.some((f) => f.includes("three.module"))) fail.push(`${page}: three.module is in the eager graph`);
  if (bytes > budgetKb * 1024) fail.push(`${page}: eager JS ${(bytes / 1024).toFixed(1)} KB gz > ${budgetKb} KB`);
  console.log(`${page}: eager ${(bytes / 1024).toFixed(1)} KB gz across ${files.length} file(s)`);
}


if (fail.length) {
  console.error("verify-3d-bundles: FAIL\n  " + fail.join("\n  "));
  process.exit(1);
}
console.log("verify-3d-bundles: OK");
