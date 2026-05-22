/* ============================================================
   scene-config.ts — geometry layout for the StructureScene.
   ============================================================ */

export const STRUCTURE = {
  studWidth: 0.05,
  studHeight: 4.6,
  studDepth: 0.09,
  studSpacingX: 0.62,
  studsPerRow: 9,
  rowsDeep: 7,
  rowSpacingZ: 2.0,
  plateThickness: 0.08,
} as const;

export const PANEL = {
  width: 1.65,
  height: 1.1,
} as const;

/* hand-placed panel positions inside the structure — staggered
   in x/y, receding in z, slightly rotated for parallax depth */
export const PANEL_PLACEMENTS: {
  pos: [number, number, number];
  rot: [number, number, number];
}[] = [
  { pos: [-1.35, 0.55, -1.6], rot: [0, 0.16, -0.02] },
  { pos: [1.55, -0.30, -3.0], rot: [0, -0.22, 0.03] },
  { pos: [-0.55, 0.95, -4.8], rot: [0, 0.10, 0] },
  { pos: [1.10, 0.10, -6.6], rot: [0, -0.14, -0.02] },
  { pos: [-1.70, -0.55, -8.4], rot: [0, 0.20, 0.02] },
  { pos: [0.85, 0.65, -10.0], rot: [0, -0.10, 0] },
  { pos: [-1.10, -0.10, -11.8], rot: [0, 0.18, -0.03] },
];
