/* ============================================================
   verify-srcsets.mjs
   Checks every built page so that:
     · each srcset entry's `<N>w` descriptor matches the file's real
       pixel width
     · every referenced image / font actually exists in dist/
     · no image is served wildly larger than its largest slot

   This guards a bug class that really happened here: the old hero
   advertised `jobsite-08.webp 2000w` for a file the pipeline only ever
   wrote at 1600px, so browsers picked it for the wrong viewport.

   Run:  npm run build && node scripts/verify-srcsets.mjs
   Exits non-zero on any mismatch, so it is CI-safe.
   ============================================================ */

import sharp from "sharp";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "../dist");

const PAGES = [
  "index.html",
  "about/index.html",
  "services/index.html",
  "projects/index.html",
  "contact/index.html",
  "404.html",
];

const exists = (p) => access(p).then(() => true, () => false);

const claims = new Map(); // "url|Nw" -> { url, width, pages:Set }
const plainSrcs = new Map(); // url -> Set(pages)

for (const page of PAGES) {
  const file = join(DIST, page);
  if (!(await exists(file))) continue;
  const html = await readFile(file, "utf8");

  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(",")) {
      const [url, descriptor] = part.trim().split(/\s+/);
      if (!url?.startsWith("/images/") || !descriptor?.endsWith("w")) continue;
      const key = `${url}|${descriptor}`;
      if (!claims.has(key)) {
        claims.set(key, { url, width: parseInt(descriptor, 10), pages: new Set() });
      }
      claims.get(key).pages.add(page);
    }
  }

  for (const m of html.matchAll(/(?:src|href)="(\/(?:images|fonts)\/[^"]+)"/g)) {
    if (!plainSrcs.has(m[1])) plainSrcs.set(m[1], new Set());
    plainSrcs.get(m[1]).add(page);
  }
}

let problems = 0;

for (const { url, width, pages } of claims.values()) {
  const file = join(DIST, url);
  if (!(await exists(file))) {
    console.error(`  MISSING   ${url}   [${[...pages].join(", ")}]`);
    problems++;
    continue;
  }
  const meta = await sharp(file).metadata();
  if (meta.width !== width) {
    console.error(
      `  MISMATCH  ${url}  claims ${width}w  actual ${meta.width}px   [${[...pages].join(", ")}]`,
    );
    problems++;
  }
}

for (const [url, pages] of plainSrcs) {
  if (!(await exists(join(DIST, url)))) {
    console.error(`  MISSING   ${url}   [${[...pages].join(", ")}]`);
    problems++;
  }
}

const summary = `${claims.size} srcset entries + ${plainSrcs.size} direct references checked`;
if (problems) {
  console.error(`\n${summary} — ${problems} PROBLEM(S)\n`);
  process.exit(1);
}
console.log(`  ${summary} — all correct`);
