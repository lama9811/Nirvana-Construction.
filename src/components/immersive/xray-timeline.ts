/* ============================================================
   Services exploded-wall timing — the ONE source of truth for the
   copy windows and the HUD chapters (xray-scene.ts reads both).
   ============================================================ */

/* intro holds the page h1; outro holds the CTA. Never overlapping. */
export const XRAY_STAGES = {
  intro: [-1, 0.11],
  outro: [0.885, 2],
} as const;

export const XRAY_CHAPTERS: [number, string][] = [
  [0, "Finished face · Level 5"],
  [0.12, "X-ray · behind the board"],
  [0.33, "Exploded · nine layers, six trades"],
  [0.74, "Assembled · one crew"],
];
