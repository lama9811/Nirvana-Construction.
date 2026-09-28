/* ============================================================
   Image helpers.

   Every srcset is derived from src/data/image-manifest.json, which the
   image pipeline writes by measuring the files actually on disk. That
   means a srcset can never advertise a width that was not produced —
   the bug class that had the hero claiming `2000w` for a file the
   pipeline only ever wrote at 1600px.

   Regenerate the manifest with:  npm run fetch-images -- --manifest-only
   ============================================================ */

import manifestJson from "../data/image-manifest.json";

export interface ImageEntry {
  webp: number[];
  avif: number[];
  display: number | null;
  w: number | null;
  h: number | null;
  aspect: number | null;
  hasAvifDefault?: boolean;
}

const manifest = manifestJson as Record<string, ImageEntry>;

const DIR = "/images/projects";

export function imageEntry(slug: string): ImageEntry | undefined {
  return manifest[slug];
}

/** Widest real pixel width available for a slug, in either format. */
export function maxWidth(slug: string): number {
  const e = manifest[slug];
  if (!e) return 0;
  return Math.max(e.display ?? 0, ...e.webp, ...e.avif, 0);
}

/**
 * Build a srcset for one format, listing only widths that exist.
 * The bare `<slug>.<ext>` file is included at its true measured width
 * when no explicit variant already covers that width.
 */
export function srcsetFor(slug: string, ext: "webp" | "avif"): string | undefined {
  const e = manifest[slug];
  if (!e) return undefined;

  const widths = ext === "webp" ? e.webp : e.avif;
  const parts = widths.map((w) => `${DIR}/${slug}-${w}.${ext} ${w}w`);

  const hasDefault = ext === "webp" ? e.display !== null : e.hasAvifDefault === true;
  if (hasDefault && e.display && !widths.includes(e.display)) {
    parts.push(`${DIR}/${slug}.${ext} ${e.display}w`);
  }

  return parts.length ? parts.join(", ") : undefined;
}

/** The plain `src` fallback — always the bare file, always <= 1600px. */
export function srcFor(slug: string): string {
  return `${DIR}/${slug}.webp`;
}

/** Intrinsic dimensions of the bare file, for CLS-free layout. */
export function dimensions(slug: string): { width: number; height: number } | undefined {
  const e = manifest[slug];
  if (!e?.w || !e?.h) return undefined;
  return { width: e.w, height: e.h };
}

/**
 * True when a slug is too small to fill a large slot honestly.
 * Several client-supplied photographs top out between 259px and 841px,
 * so a layout can use this to avoid promoting them to a hero tile.
 */
export function isLowRes(slug: string, needed = 1200): boolean {
  return maxWidth(slug) < needed;
}
