/* ============================================================
   stage-fade — the one fade rule for scroll-driven copy.
   A copy block fades IN and OUT inside its own [in, out] window,
   so neighbouring windows that don't overlap are never visible at
   the same time. in < 0 = visible from the start; out ≥ 1 = stays.
   Pure: shared by every immersive component and unit-tested.
   ============================================================ */

export const FADE = 0.018;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const ss = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function stageOpacity(p: number, [a, b]: readonly [number, number]): number {
  const fadeIn = a < 0 ? 1 : ss(a, a + FADE, p);
  const fadeOut = b >= 1 ? 1 : 1 - ss(b - FADE, b, p);
  return fadeIn * fadeOut;
}
