/* ============================================================
   quality.ts — device-capability tiering for adaptive 3D.
   The 3D scene reads this to scale pixel ratio, post-processing
   and geometry so phones and low-power machines stay smooth.
   ============================================================ */

export type QualityTier = "high" | "low";

export interface Quality {
  tier: QualityTier;
  dpr: [number, number];
  postProcessing: boolean;
  panelCount: number;
  reducedMotion: boolean;
}

export function detectQuality(): Quality {
  if (typeof window === "undefined") {
    return {
      tier: "high",
      dpr: [1, 2],
      postProcessing: true,
      panelCount: 7,
      reducedMotion: false,
    };
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 768;

  const low =
    memory <= 4 || cores <= 4 || (coarse && small);

  if (low) {
    return {
      tier: "low",
      dpr: [1, 1.5],
      postProcessing: false,
      panelCount: 4,
      reducedMotion,
    };
  }

  return {
    tier: "high",
    dpr: [1, 2],
    postProcessing: true,
    panelCount: 7,
    reducedMotion,
  };
}
