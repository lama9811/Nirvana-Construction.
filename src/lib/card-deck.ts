/* ============================================================
   card-deck.ts — the maths behind the Services trade deck: a
   pinned, scroll-scrubbed 3D coverflow. Pure, so it is unit
   tested (tests/card-deck.test.ts); the component only applies it.
   ============================================================ */

export interface DeckPose {
  /* horizontal offset, % of the card's own width */
  x: number;
  /* depth, px (negative = further away) */
  z: number;
  /* turn about the vertical axis, deg */
  ry: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* 0 → 1 while a sticky track scrolls through its pinned travel */
export function pinProgress(top: number, height: number, vh: number): number {
  const travel = height - vh;
  return travel > 0 ? clamp01(-top / travel) + 0 : 0;
}

/* d = the card's distance from the centre slot, in cards (fractional
   while scrolling). compact = phones: wider spread, gentler turn. */
export function deckPose(d: number, compact: boolean): DeckPose {
  const a = Math.abs(d);
  const s = Math.sign(d);
  /* the first step out is the big one, further cards tuck in behind it */
  const reach = Math.min(a, 1) + Math.max(0, a - 1) * 0.45;
  const spread = compact ? 88 : 64;
  const x = s * reach * spread;
  const z = -Math.min(a, 3) * (compact ? 160 : 220);
  const ry = -s * Math.min(a, 1.5) * (compact ? 18 : 26);
  const scale = 1 - Math.min(a, 3) * 0.06;
  /* fully opaque out to the first neighbour, so nothing ghosts through the
     card in front; only the far cards fade */
  const opacity = a >= 3 ? 0 : a <= 1.2 ? 1 : 1 - (a - 1.2) / 1.8;
  const zIndex = 100 - Math.round(a * 10);
  /* normalise -0 so mirrored poses compare equal */
  return { x: x + 0, z: z + 0, ry: ry + 0, scale, opacity, zIndex };
}

export function nearestIndex(p: number, n: number): number {
  return Math.max(0, Math.min(n - 1, Math.round(clamp01(p) * (n - 1))));
}

export function progressForIndex(i: number, n: number): number {
  return n > 1 ? i / (n - 1) : 0;
}
