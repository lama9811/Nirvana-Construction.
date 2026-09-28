/* ============================================================
   A generic commercial fit-out plan — drawn for the site, not a
   client document. Two offices and a back-of-house run on the west,
   a conference room and a store on the east, open plan between, the
   entrance on the south. [x1, y1, x2, y2, thickness] in drawing
   pixels, y down. Door openings are left as gaps.

   PlanExtrude (the /contact/ hero) prints this sheet as a blueprint
   and grows the walls up out of their own lines.
   ============================================================ */

export const PLAN_PX = { w: 1200, h: 520 } as const;

export const PLAN_WALLS: [number, number, number, number, number][] = [
  /* exterior */
  [60, 60, 1140, 60, 8], // north
  [1140, 60, 1140, 460, 8], // east
  [60, 60, 60, 460, 8], // west
  [60, 460, 520, 460, 8], // south, west of the entrance
  [600, 460, 1140, 460, 8], // south, east of the entrance
  /* west: two offices over a back-of-house run */
  [340, 60, 340, 120, 5], // office corridor wall (door 120-170)
  [340, 170, 340, 300, 5],
  [60, 200, 280, 200, 5], // office 1 | office 2 (door 280-340)
  [60, 300, 200, 300, 5], // back-of-house line (door 200-260)
  [260, 300, 340, 300, 5],
  [200, 300, 200, 460, 5], // restroom divider
  /* east: conference room and store */
  [900, 60, 900, 180, 5], // conference west wall (door 180-220)
  [900, 220, 900, 260, 5],
  [900, 260, 1140, 260, 5], // conference south
  [960, 340, 1140, 340, 5], // store north
  [960, 340, 960, 410, 5], // store west (door 410-460)
];

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/* walls rise left to right across the drawing, each over 0.35 of the scroll */
export function wallRise(p: number, i: number, n: number): number {
  void n;
  const [x1, , x2] = PLAN_WALLS[i];
  const cx = (x1 + x2) / 2 / PLAN_PX.w;
  return ease(clamp((p - 0.05 - 0.45 * cx) / 0.35));
}
