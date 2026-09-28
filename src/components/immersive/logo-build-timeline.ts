/* ============================================================
   About hero timing — "built from the ground up". Pure; tested.
   ============================================================ */
export type V3 = [number, number, number];

/* copy windows: intro (h1), build caption, finale — never overlapping */
export const LB_STAGES = [
  [-1, 0.16],
  [0.24, 0.62],
  [0.7, 2],
] as const;

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/* bar i rises over its own window; bars start 0.08 apart from p = 0.1 */
export function barRise(p: number, i: number, n: number): number {
  void n;
  const a = 0.1 + i * 0.08;
  return ease(clamp((p - a) / 0.3));
}

/* the swoosh snaps round the base once the bars are well under way */
export function swooshDraw(p: number): number {
  return ease(clamp((p - 0.42) / 0.26));
}

/* [progress, eye, look-at] — 1 unit = 100 logo px, origin at the base centre */
/* an orbit out to the side (the studs read in section) and back round to
   the front, so the finished mark is never seen mirrored */
export const LB_KEYS: [number, V3, V3][] = [
  [0, [0.6, 3.4, 10.5], [0, 1.2, 0]],
  [0.3, [4.8, 2.4, 7.6], [-0.2, 1.7, 0]],
  [0.62, [8.2, 3.6, 1.6], [-0.2, 2.0, 0]],
  [1, [2.2, 2.3, 9.2], [-0.35, 2.0, 0]],
];
