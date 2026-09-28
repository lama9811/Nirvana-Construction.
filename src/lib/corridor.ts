/* ============================================================
   Pure layout logic for the /projects/ corridor. No three.js, no
   DOM, no data imports — data is passed in, so tests/ can run it
   under plain Node.
   ============================================================ */
import type { CorridorStation } from "../data/corridor";
export type { CorridorStation };

export interface ManifestEntry {
  webp: number[];
  display: number | null;
  aspect: number | null;
}
export interface ProjectLike {
  slug: string;
  index: string;
  name: string;
  category: string;
  location?: string;
}
export interface ResolvedPanel {
  slug: string;
  url: string;
  /* real pixel width of the file behind `url` */
  px: number;
  aspect: number;
}
export interface ResolvedStation {
  key: string;
  project: string | null;
  name: string;
  meta: string;
  index: string;
  panels: ResolvedPanel[];
}

/* Widest processed file ≤ maxPx. `<slug>-<w>.webp` exists for every
   width in `webp`; the un-suffixed `<slug>.webp` is `display` wide. */
export function textureFor(slug: string, e: ManifestEntry, maxPx: number): { url: string; px: number } | null {
  const suffixed = e.webp.filter((w) => w <= maxPx).sort((a, b) => b - a)[0] ?? 0;
  const base = e.display && e.display <= maxPx && !e.webp.includes(e.display) ? e.display : 0;
  if (!suffixed && !base) return null;
  if (base > suffixed) return { url: `/images/projects/${slug}.webp`, px: base };
  return { url: `/images/projects/${slug}-${suffixed}.webp`, px: suffixed };
}

export function resolveStations(
  stations: CorridorStation[],
  projects: ProjectLike[],
  manifest: Record<string, ManifestEntry>,
  maxPx: number,
): ResolvedStation[] {
  return stations.map((s, i) => {
    const pr = s.project ? projects.find((p) => p.slug === s.project) : null;
    if (s.project && !pr) throw new Error(`corridor: unknown project "${s.project}"`);
    const panels = s.photos.map((slug) => {
      const e = manifest[slug];
      if (!e) throw new Error(`corridor: "${slug}" is not in image-manifest.json`);
      const t = textureFor(slug, e, maxPx);
      if (!t) throw new Error(`corridor: no file ≤ ${maxPx}px for "${slug}"`);
      return { slug, url: t.url, px: t.px, aspect: e.aspect ?? 1.5 };
    });
    return {
      key: s.project ?? `station-${i}`,
      project: s.project,
      name: s.label ?? pr!.name,
      meta: pr ? [pr.category, pr.location].filter(Boolean).join(" · ") : "Drawing",
      index: pr ? pr.index : "00",
      panels,
    };
  });
}

/* ≤ 1.25 CSS px per texel at the closest pass (spec §4.3): a small
   photograph gets a smaller panel instead of an upscaled blur. */
export function honestPanelWidth(px: number, maxWorld: number, worldPerCssPx: number): number {
  return Math.min(maxWorld, px * 1.25 * worldPerCssPx);
}

/* scroll-progress breakpoints of the corridor choreography */
export const CORRIDOR_PHASES = {
  layout: 0.0,
  flow: 0.05,
  form: 0.11,
  travelStart: 0.16,
  travelEnd: 0.9,
  plumb: 0.93,
} as const;

/* the progress at which station i is abreast of the camera */
export function stationProgress(i: number, n: number): number {
  const { travelStart: a, travelEnd: b } = CORRIDOR_PHASES;
  return a + ((i + 0.5) / n) * (b - a);
}

/* which station the camera is passing; -1 outside the travel range */
export function activeStation(p: number, n: number): number {
  const { travelStart: a, travelEnd: b } = CORRIDOR_PHASES;
  if (p < a || p > b) return -1;
  return Math.min(n - 1, Math.floor(((p - a) / (b - a)) * n));
}

/* scroll-track height in vh: long enough to linger at every station */
export function trackVh(n: number, small: boolean): number {
  return small ? 200 + n * 45 : 240 + n * 55;
}
