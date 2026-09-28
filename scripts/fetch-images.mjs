/* ============================================================
   fetch-images.mjs
   Builds every display image the site serves.

   Two source groups:
     · REMOTE — the original photographs on the live WP origin
     · LOCAL  — client-supplied photography in assets/source-photos/

   Naming contract (relied on by the templates):
     <slug>.webp / .avif        the safe default — always <= 1600px
     <slug>-<width>.webp/.avif  one pair per declared width
   So `<slug>.webp` is always sane in a bare <img src>, and srcset uses
   the explicit widths. Every emitted width really exists at that size.

   Run with:  npm run fetch-images            (skips work already done)
              npm run fetch-images -- --force (re-processes everything)
   ============================================================ */

import sharp from "sharp";
import { mkdir, readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_LOCAL = join(ROOT, "assets/source-photos");
const OUT_PROJECTS = join(ROOT, "public/images/projects");
const OUT_TEXTURES = join(ROOT, "public/images/textures");
const BASE = "https://nirvanaconstruction.net/wp-content/uploads";

const FORCE = process.argv.includes("--force");
const MANIFEST_ONLY = process.argv.includes("--manifest-only");

/* ⚠ The WP origin has been DOWNGRADED since these were first pulled.
   It now serves much smaller files than the versions committed here —
   flagship-carwash comes back 225x225 and jcc 348x263, against the
   1600px originals in git. Re-fetching therefore DESTROYS quality.

   The committed copies in public/images/projects are now the only
   good versions, so the remote group is skipped unless someone asks
   for it explicitly with --refetch-remote. Do not add it to any npm
   script. Restore with: git checkout -- public/images/ */
const REFETCH_REMOTE = process.argv.includes("--refetch-remote");

/* the bare `<slug>.webp` never exceeds this, whatever the source */
const DISPLAY_CAP = 1600;
const DEFAULT_WIDTHS = [1600, 800];

/* Hero needs true retina/4K. The source is 5623px wide, so every one of
   these is a DOWNscale — no interpolated detail, unlike the old -3840
   variant which was Lanczos-upscaled from a 2000px original. */
const HERO_WIDTHS = [3840, 2400, 1600, 800];

/* ---------- sources ---------------------------------------- */
/* { src|file, slug, widths?, grade?, crop?, texture? }
     grade:   "cinematic" (WP jobsite set) | "natural" (client photos) | "none"
     crop:    "3:2" (default, smart-cropped) | "none" (keep aspect ratio)
     texture: also emit a 1280px WebGL panel texture                        */

const REMOTE = [
  { src: `${BASE}/2024/10/image-1.png`, slug: "flagship-carwash", texture: true },
  { src: `${BASE}/2024/10/jewish-community-center-of-greater-baltimore.jpg`, slug: "jcc", texture: true },
  { src: `${BASE}/2024/01/Mace-Medical-Essex-MD-scaled.jpg`, slug: "mace-medical", texture: true },
  { src: `${BASE}/2024/01/HCPS-Forest-Hill-Annex-MD.jpg`, slug: "hcps-forest-hill", texture: true },
  { src: `${BASE}/2024/01/Golf-Galaxy-Towson-MD-scaled.jpeg`, slug: "golf-galaxy", texture: true },
  { src: `${BASE}/2026/02/2023-12-26.webp`, slug: "jobsite-01", texture: true },
  { src: `${BASE}/2024/10/Photo-1-2.jpg`, slug: "jobsite-02", texture: true },
  { src: `${BASE}/2024/10/Photo-1-1-scaled.jpg`, slug: "jobsite-03", texture: true },
  { src: `${BASE}/2024/10/Photo-1-scaled.jpg`, slug: "jobsite-04", texture: true },
  { src: `${BASE}/2024/09/image_50398977-1-scaled.jpg`, slug: "jobsite-05", texture: true },
  { src: `${BASE}/2024/09/image_50398977-scaled.jpg`, slug: "jobsite-06", texture: true },
  { src: `${BASE}/2024/09/processed-0A075923-DECB-4A8B-AABF-6F996613D56F-scaled.jpeg`, slug: "jobsite-07", texture: true },
  { src: `${BASE}/2024/06/processed-34898ABA-F943-45B8-AEF6-AEBAC9889214.jpeg`, slug: "jobsite-08", widths: [2000, 1600, 800], texture: true },
];

const LOCAL = [
  /* hero — the only true 4K+ asset we have (5623x3649).
     NOTE: the two supplied F45 files are counter-intuitively named.
     "F45_Training 1.jpg" (5623px) is the EXTERIOR storefront and
     "F45-Training.jpg" (640px) is the INTERIOR training floor. They
     are stored here under the slugs that match what they show. */
  { file: "f45-exterior.jpg", slug: "f45-exterior", widths: HERO_WIDTHS, grade: "natural" },

  /* large enough to feature */
  { file: "first-watch.webp", slug: "first-watch", widths: [2400, 1600, 800], grade: "natural" },
  { file: "panda-express.jpeg", slug: "panda-express", grade: "natural" },
  { file: "golf-galaxy-night.png", slug: "golf-galaxy-night", grade: "natural" },
  { file: "autozone.png", slug: "autozone", grade: "natural" },
  { file: "grocery-outlet.jpg", slug: "grocery-outlet", grade: "natural" },
  { file: "johns-hopkins.jpg", slug: "johns-hopkins", grade: "natural" },
  { file: "chipotle.jpg", slug: "chipotle", grade: "natural" },

  /* low-resolution originals — the no-upscale rule clamps these to their
     true source width, so they emit only what they can honestly support */
  { file: "five-below.jpeg", slug: "five-below", grade: "natural" },
  { file: "aldi.webp", slug: "aldi", grade: "natural" },
  { file: "burlington.webp", slug: "burlington", grade: "natural" },
  { file: "golf-galaxy-day.jpeg", slug: "golf-galaxy-day", grade: "natural" },
  { file: "f45-interior.jpg", slug: "f45-interior", grade: "natural" },
  { file: "flagship-carwash-2.webp", slug: "flagship-carwash-2", grade: "natural" },
  { file: "first-watch-interior.webp", slug: "first-watch-interior", grade: "natural" },
  { file: "oreilly.png", slug: "oreilly", grade: "natural" },

];

/* ---------- grading ---------------------------------------- */
/* "cinematic" preserves the existing look of the WP jobsite set.
   "natural" is far gentler: the client photographs are bright retail
   exteriors whose brand colour IS the subject, and they sit on a light
   page, so heavy desaturation would flatten them. */
const GRADES = {
  cinematic: (p) => p.modulate({ brightness: 0.98, saturation: 0.74 }).linear(1.12, -13).gamma(1.04),
  natural: (p) => p.modulate({ brightness: 1.0, saturation: 0.96 }).linear(1.04, -5),
  none: (p) => p,
};

/* ---------- helpers ---------------------------------------- */
async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (build pipeline)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const exists = (p) => access(p).then(() => true, () => false);

/* The widest output a source can fill without inventing pixels.
   For a 3:2 crop that is bounded by HEIGHT as well as width: a 360x173
   source cannot fill a 360x240 box, only a 259x173 one. */
function honestMaxWidth(srcW, srcH, crop) {
  if (crop === "none") return srcW;
  return Math.min(srcW, Math.floor(srcH * 1.5));
}

/* Resolve the widths we can honestly emit for a given source.
   Widths beyond the honest maximum are dropped rather than upscaled; if
   the widest request overshoots, the honest maximum is added so we still
   keep every real pixel the source has. */
function resolveTargets(widths, maxW) {
  const kept = widths.filter((w) => w <= maxW);
  if (Math.max(...widths) > maxW) kept.push(maxW);
  return [...new Set(kept)].sort((a, b) => b - a);
}

async function processOne(item) {
  const { slug, widths = DEFAULT_WIDTHS, grade = "cinematic", crop = "3:2", texture = false } = item;

  const buf = item.file ? await readFile(join(SRC_LOCAL, item.file)) : await download(item.src);
  const meta = await sharp(buf).rotate().metadata();
  const srcW = meta.width ?? 0;
  const srcH = meta.height ?? 0;
  if (!srcW || !srcH) throw new Error("could not read source dimensions");

  const maxW = honestMaxWidth(srcW, srcH, crop);
  const targets = resolveTargets(widths, maxW);

  const apply = GRADES[grade] ?? GRADES.cinematic;
  const render = (w) => {
    const base = sharp(buf).rotate();
    const sized =
      crop === "none"
        ? base.resize({ width: w, withoutEnlargement: true })
        : base.resize(w, Math.round((w * 2) / 3), {
            fit: "cover",
            position: "attention",
            withoutEnlargement: true,
          });
    return apply(sized);
  };

  const write = async (w, name) => {
    await render(w).avif({ quality: 62 }).toFile(join(OUT_PROJECTS, `${name}.avif`));
    await render(w).webp({ quality: w <= 800 ? 78 : 80 }).toFile(join(OUT_PROJECTS, `${name}.webp`));
  };

  for (const w of targets) await write(w, `${slug}-${w}`);

  /* the bare `<slug>` default: largest target that stays within the cap */
  const display = targets.find((w) => w <= DISPLAY_CAP) ?? Math.min(...targets);
  await write(display, slug);

  if (texture) {
    const tw = Math.min(1280, srcW);
    await render(tw).webp({ quality: 82 }).toFile(join(OUT_TEXTURES, `${slug}.webp`));
  }

  return { slug, srcW, srcH, maxW, targets, display, capped: Math.max(...widths) > maxW };
}

/* ---------- main ------------------------------------------- */
async function main() {
  await mkdir(OUT_PROJECTS, { recursive: true });
  await mkdir(OUT_TEXTURES, { recursive: true });

  if (MANIFEST_ONLY) {
    console.log("--manifest-only: rebuilding the manifest from disk, processing nothing.\n");
    await writeManifest();
    return;
  }

  const all = REFETCH_REMOTE ? [...REMOTE, ...LOCAL] : [...LOCAL];
  console.log(`Processing ${all.length} sources (${REFETCH_REMOTE ? REMOTE.length : 0} remote, ${LOCAL.length} local)…`);
  if (!REFETCH_REMOTE) {
    console.log(`Skipping ${REMOTE.length} remote sources — the WP origin now serves`);
    console.log("downgraded files and the committed copies are the good ones.");
    console.log("Override with --refetch-remote only if you know what you are doing.");
  }
  console.log(FORCE ? "--force: re-processing everything below.\n" : "Skipping sources already built — pass --force to redo.\n");

  let ok = 0, skipped = 0, failed = 0;
  for (const item of all) {
    try {
      /* completeness marker: the bare display file plus the smallest width */
      const marker = join(OUT_PROJECTS, `${item.slug}.webp`);
      if (!FORCE && (await exists(marker))) {
        console.log(`  – ${item.slug} (already built)`);
        skipped++;
        continue;
      }

      const r = await processOne(item);
      const note = r.capped ? `  [source ${r.srcW}x${r.srcH} → honest max ${r.maxW}px]` : "";
      console.log(`  ✓ ${r.slug.padEnd(22)} ${r.targets.join("/")}px  default=${r.display}px${note}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${item.slug} — ${err.message}`);
      failed++;
    }
  }

  await writeManifest();

  console.log(`\nDone — ${ok} processed, ${skipped} skipped, ${failed} failed.`);
  if (ok === 0 && skipped === 0) process.exitCode = 1;
}

/* ---------- manifest -------------------------------------------
   Scans what is actually on disk and records the real dimensions of
   every variant. Templates build their srcset from this, so a srcset
   can never advertise a width that was not produced — which is exactly
   the class of bug that had the old hero claiming 2000w for a file the
   pipeline only ever wrote at 1600px.
   Deliberately derived from the filesystem rather than from SOURCES,
   so it stays correct even when sources are skipped.
   ---------------------------------------------------------------- */
/* Smallest number that can legitimately be a width suffix. Slugs like
   `jobsite-08` and `flagship-carwash-2` end in digits of their own, so
   without this floor "jobsite-08.webp" parses as slug=jobsite width=8. */
const MIN_WIDTH_SUFFIX = 200;

function parseVariant(file) {
  const base = file.replace(/\.(webp|avif)$/, "");
  const m = base.match(/^(.+)-(\d+)$/);
  if (m && Number(m[2]) >= MIN_WIDTH_SUFFIX) {
    return { slug: m[1], width: Number(m[2]) };
  }
  return { slug: base, width: null };
}

async function writeManifest() {
  const { readdir, writeFile } = await import("node:fs/promises");
  const all = await readdir(OUT_PROJECTS);

  const entries = {};
  for (const file of all) {
    if (!/\.(webp|avif)$/.test(file)) continue;
    const ext = file.endsWith(".avif") ? "avif" : "webp";
    const { slug, width } = parseVariant(file);

    entries[slug] ??= { webp: [], avif: [], display: null, w: null, h: null, aspect: null };

    if (width !== null) {
      entries[slug][ext].push(width);
    } else if (ext === "webp") {
      /* the bare <slug>.webp — what templates use as the plain src */
      const meta = await sharp(join(OUT_PROJECTS, file)).metadata();
      entries[slug].display = meta.width;
      entries[slug].w = meta.width;
      entries[slug].h = meta.height;
      entries[slug].aspect = +(meta.width / meta.height).toFixed(4);
    } else {
      entries[slug].hasAvifDefault = true;
    }
  }

  /* Widths are tracked per format rather than intersected: the original
     WP-sourced set has an AVIF only at its display width, so an
     intersection would wrongly report it as having no widths at all. */
  for (const e of Object.values(entries)) {
    e.webp = [...new Set(e.webp)].sort((a, b) => a - b);
    e.avif = [...new Set(e.avif)].sort((a, b) => a - b);
  }

  const out = join(ROOT, "src/data/image-manifest.json");
  await writeFile(out, JSON.stringify(entries, null, 2) + "\n");

  const bad = Object.entries(entries).filter(([, e]) => !e.display);
  if (bad.length) console.warn(`  ! ${bad.length} slug(s) have no default file: ${bad.map(([s]) => s).join(", ")}`);
  console.log(`\nWrote manifest for ${Object.keys(entries).length} slugs → src/data/image-manifest.json`);
}

main();
