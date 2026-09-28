/* ============================================================
   Homepage fly-through timing — the ONE source of truth.
   Imported by flythrough-scene.ts (camera, anchors) and by
   FlythroughHero.astro (stage copy, hotspots, rail). Pure: no
   three.js, no DOM, so it is unit-tested in tests/.
   ============================================================ */

export type V3 = [number, number, number];

/* [progress, eye, look-at] — see flythrough-scene.ts for the spline */
export const KEYS: [number, V3, V3][] = [
  [0.0, [5.0, 1.8, 32], [-1.5, 3.8, 0]], //  street, dusk, wide
  [0.1, [3.0, 1.9, 21], [-1.2, 3.9, 0]], //  push in
  [0.2, [8.6, 2.6, 8.4], [-2.5, 4.6, 0]], // glance along the EIFS
  [0.3, [-0.7, 1.8, 5.4], [-1.0, 1.8, -2]], // line up on the door
  [0.37, [-1.0, 1.75, -0.7], [-1.9, 1.7, -8]], // through the door
  [0.45, [-4.6, 1.75, -6.0], [-5.8, 1.75, -12]], // wall: framing
  [0.53, [-2.9, 1.7, -8.3], [-2.7, 1.75, -12]], // wall: insulation
  [0.6, [1.9, 1.7, -8.2], [2.5, 1.9, -12]], //  wall: board + finish
  [0.67, [3.6, 2.1, -6.0], [4.8, 3.9, -7.0]], // tilt up to the ceiling
  [0.74, [4.4, 2.3, -4.6], [4.9, 3.95, -7.3]], // ACT grid
  [0.82, [5.5, 1.75, -4.8], [12.7, 2.1, -7.6]], // feature wall — lettering sits right of the copy
  [0.89, [7.0, 1.7, -8.4], [12.7, 2.0, -8.2]],
  [1.0, [10.2, 1.6, -10.6], [-3.5, 1.9, 0.5]], // finished room, looking out
];

/* 3D points the HTML hotspot labels are pinned to */
export const ANCHORS: Record<string, V3> = {
  eifs: [1.6, 5.0, 0.02],
  studs: [-7.3, 2.7, -11.95],
  blocking: [-6.05, 1.22, -11.95],
  insulation: [-3.0, 1.55, -11.94],
  drywall: [1.1, 2.4, -11.92],
  act: [4.8, 3.9, -6.6],
};

/* Stage copy windows, in MARKUP ORDER: hero, façade, entry, wall,
   ceiling, sectors, finale. [in, out]; in < 0 = visible from the
   start, out ≥ 1 = stays to the end. Windows must not overlap. */
export const STAGES = [
  [-1, 0.085],
  [0.13, 0.28],
  [0.305, 0.385],
  [0.41, 0.635],
  [0.655, 0.775],
  [0.795, 0.905],
  [0.925, 2],
] as const;

/* Pinned labels. These MAY overlap each other (several wall trades
   are labelled at once) — they are callouts, not stage copy. */
export const HOTSPOTS = [
  { id: "eifs", in: 0.13, out: 0.235 },
  { id: "studs", in: 0.41, out: 0.57 },
  { id: "blocking", in: 0.435, out: 0.55 },
  { id: "insulation", in: 0.47, out: 0.61 },
  { id: "drywall", in: 0.55, out: 0.635 },
  { id: "act", in: 0.66, out: 0.765 },
];

/* the rail: one tick per station, with the progress it scrolls to */
/* named for what the company does, not numbered */
export const STATIONS = [
  { label: "Nirvana", p: 0 },
  { label: "EIFS", p: 0.2 },
  { label: "Fit-Outs", p: 0.345 },
  { label: "Framing & Drywall", p: 0.525 },
  { label: "Ceilings", p: 0.71 },
  { label: "Sectors", p: 0.845 },
  { label: "Contact", p: 1 },
];

/* the fade rule is shared by every immersive component */
export { FADE, stageOpacity } from "./stage-fade.ts";
