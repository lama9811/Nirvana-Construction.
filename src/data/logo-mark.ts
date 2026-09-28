/* ============================================================
   The Nirvana logo mark, measured from public/logo.png
   (800×780 px, y down). Four bars with slanted tops — the third is
   tallest — two small flaps that step off bars 2 and 3, and two
   crescent swooshes round the base. logo-build-scene.ts turns these
   into stacks of galvanised steel studs.
   ============================================================ */

export interface LogoBar {
  x0: number;
  x1: number;
  /* top edge at x0 and at x1 (the tops are slanted) */
  topL: number;
  topR: number;
  bottom: number;
}

export const LOGO_PX = { w: 800, h: 780 } as const;

export const LOGO_BARS: LogoBar[] = [
  { x0: 218, x1: 270, topL: 240, topR: 215, bottom: 421 },
  { x0: 297, x1: 332, topL: 172, topR: 115, bottom: 418 },
  { x0: 360, x1: 418, topL: 0, topR: 30, bottom: 405 },
  { x0: 446, x1: 507, topL: 155, topR: 187, bottom: 375 },
];

export const LOGO_FLAPS: LogoBar[] = [
  { x0: 255, x1: 297, topL: 152, topR: 172, bottom: 190 },
  { x0: 418, x1: 457, topL: 30, topR: 55, bottom: 130 },
];

/* two crescents: ellipse centre, radii, tilt (rad), arc from→to (rad),
   ribbon width (px) */
export const LOGO_SWOOSH = [
  { cx: 400, cy: 395, rx: 250, ry: 95, tilt: -0.2, from: 2.9, to: 6.1, width: 22 },
  { cx: 420, cy: 430, rx: 270, ry: 105, tilt: -0.22, from: 3.0, to: 6.2, width: 18 },
];
