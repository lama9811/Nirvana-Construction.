/* ============================================================
   fetch-images.mjs
   Downloads the real photographs from the live Nirvana site and
   processes them into a cohesive, cinematically-graded set:
     · /public/images/projects/  — display images (AVIF + WebP)
     · /public/images/textures/  — 3D panel textures (WebP)
   Run with:  npm run fetch-images
   ============================================================ */

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PROJECTS = join(ROOT, "public/images/projects");
const OUT_TEXTURES = join(ROOT, "public/images/textures");
const BASE = "https://nirvanaconstruction.net/wp-content/uploads";

/* raw source → output slug */
const SOURCES = [
  // five identifiable project photographs
  { src: `${BASE}/2024/10/image-1.png`, slug: "flagship-carwash" },
  { src: `${BASE}/2024/10/jewish-community-center-of-greater-baltimore.jpg`, slug: "jcc" },
  { src: `${BASE}/2024/01/Mace-Medical-Essex-MD-scaled.jpg`, slug: "mace-medical" },
  { src: `${BASE}/2024/01/HCPS-Forest-Hill-Annex-MD.jpg`, slug: "hcps-forest-hill" },
  { src: `${BASE}/2024/01/Golf-Galaxy-Towson-MD-scaled.jpeg`, slug: "golf-galaxy" },
  // eight real jobsite / finish photographs (used atmospherically)
  { src: `${BASE}/2026/02/2023-12-26.webp`, slug: "jobsite-01" },
  { src: `${BASE}/2024/10/Photo-1-2.jpg`, slug: "jobsite-02" },
  { src: `${BASE}/2024/10/Photo-1-1-scaled.jpg`, slug: "jobsite-03" },
  { src: `${BASE}/2024/10/Photo-1-scaled.jpg`, slug: "jobsite-04" },
  { src: `${BASE}/2024/09/image_50398977-1-scaled.jpg`, slug: "jobsite-05" },
  { src: `${BASE}/2024/09/image_50398977-scaled.jpg`, slug: "jobsite-06" },
  { src: `${BASE}/2024/09/processed-0A075923-DECB-4A8B-AABF-6F996613D56F-scaled.jpeg`, slug: "jobsite-07" },
  { src: `${BASE}/2024/06/processed-34898ABA-F943-45B8-AEF6-AEBAC9889214.jpeg`, slug: "jobsite-08" },
];

/* a restrained cinematic grade — pulls the mixed source photos
   toward one contrasty, desaturated look while keeping real
   colour. The cool cast, grain, vignette and bloom are layered
   on at runtime (CSS overlays + WebGL post-processing), so the
   processed files stay non-destructive and tunable. */
function grade(pipeline) {
  return pipeline
    .modulate({ brightness: 0.98, saturation: 0.74 }) // keep colour, just calm it
    .linear(1.12, -13) // contrast
    .gamma(1.04);
}

async function download(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (build pipeline)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function processOne({ src, slug }) {
  const buf = await download(src);

  /* display — cinematic 3:2, smart-cropped to the subject */
  const display = (w, h) =>
    grade(sharp(buf).rotate().resize(w, h, { fit: "cover", position: "attention" }));

  await display(1600, 1067).avif({ quality: 62 }).toFile(join(OUT_PROJECTS, `${slug}.avif`));
  await display(1600, 1067).webp({ quality: 80 }).toFile(join(OUT_PROJECTS, `${slug}.webp`));
  await display(800, 533).webp({ quality: 78 }).toFile(join(OUT_PROJECTS, `${slug}-800.webp`));

  /* texture — sized for WebGL panels */
  await display(1280, 853).webp({ quality: 82 }).toFile(join(OUT_TEXTURES, `${slug}.webp`));

  return slug;
}

async function main() {
  await mkdir(OUT_PROJECTS, { recursive: true });
  await mkdir(OUT_TEXTURES, { recursive: true });

  console.log(`Processing ${SOURCES.length} source images…\n`);
  let ok = 0;
  for (const item of SOURCES) {
    try {
      await processOne(item);
      console.log(`  ✓ ${item.slug}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${item.slug} — ${err.message}`);
    }
  }
  console.log(`\nDone — ${ok}/${SOURCES.length} images processed.`);
  if (ok === 0) process.exitCode = 1;
}

main();
