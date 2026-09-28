/* ============================================================
   drum.ts — pure maths for three scroll-linked content effects
   (tests/drum.test.ts):

     drumPose   the Services scope list rolling on a 3D drum
     stackTilt  a layered photo stack turning as its band scrolls by
     scrubLit   words lighting up in reading order as you scroll
   ============================================================ */

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/* d = the row's distance from the screen's centre line, in half-screens
   (−1 = top edge, +1 = bottom edge) */
export function drumPose(d: number): { rx: number; opacity: number; scale: number } {
  const c = clamp(d, -1.2, 1.2);
  const a = Math.abs(c);
  return {
    rx: -c * 58 + 0,
    /* never below 0.2: every row is real content and must stay legible */
    opacity: Math.max(0.2, 1 - a * 0.75),
    scale: 1 - a * 0.12,
  };
}

/* p = 0 as the band's top enters the bottom of the screen, 1 as its
   bottom leaves the top */
export function stackTilt(p: number): { ry: number; rx: number } {
  const c = clamp(p, 0, 1) - 0.5;
  return { ry: c * 28 + 0, rx: -c * 10 + 0 };
}

/* how lit word i of n is (0..1) at progress p; a short soft edge
   travels through the text */
export function scrubLit(p: number, i: number, n: number): number {
  const edge = 0.12;
  const head = clamp(p, 0, 1) * (1 + edge);
  const at = n > 1 ? i / (n - 1) : 0;
  return clamp((head - at) / edge, 0, 1);
}

/* data-rise: d = the element's distance below the screen's centre line,
   in half-screens. Below the rise line it lies back into depth; it stands
   up flat as it arrives, and stays flat above. */
export function risePose(d: number): { rx: number; z: number; y: number; opacity: number } {
  const k = clamp((d - 0.2) / 0.9, 0, 1);
  return {
    rx: k * 34 + 0,
    z: -k * 240 + 0,
    y: k * 70 + 0,
    opacity: 1 - k * 0.5,
  };
}
