/* ============================================================
   corridor-scene — the WebGL half of ProjectCorridor.astro
   (ported from the Concept D "stud field" prototype).

   three.js is imported DYNAMICALLY inside createCorridor(), so this
   module adds only a few KB to the eager bundle. Only `import type`
   touches three at the top level, and that is erased at build time.

   World units are loosely feet. The corridor is as long as the
   station list needs: station i stands at z = -4 - 18i, and during
   the travel phase the camera moves LINEARLY so that station i is
   12 units ahead exactly at stationProgress(i, n) — the same
   function the component uses to name the active station.
   ============================================================ */

import type * as T from "three";
import type { ResolvedStation } from "../../lib/corridor";
import { CORRIDOR_PHASES as PH, honestPanelWidth, activeStation } from "../../lib/corridor";

export interface CorridorHandle {
  /** advance one frame; returns feet travelled (for the HUD) */
  update(p: number, dt: number, vel: number): number;
  resize(): void;
  dispose(): void;
  stats(): { panels: number; progress: number };
}

interface Opts {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  stations: ResolvedStation[];
  /* one label per station, pinned under its first panel */
  labels: HTMLElement[];
  /* a panel was clicked */
  onSelect: (station: number) => void;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* deterministic PRNG so the field is identical on every visit */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- shared GLSL: sky + fog ----------------
   Fog blends toward the backdrop at the fragment's own screen
   position, so a distant stud dissolves into the light behind it
   rather than into a flat grey. */
const COMMON = /* glsl */ `
  uniform float uTime;
  uniform vec2 uRes;
  uniform float uAspect;
  uniform vec3 uDeep;
  uniform vec3 uGlowCol;
  uniform vec2 uGlowPos;
  uniform float uGlowAmt;
  uniform float uFogDensity;

  vec3 backdrop(vec2 uv) {
    vec2 d = uv - uGlowPos;
    d.x *= uAspect;
    float r2 = dot(d, d);
    float g = exp(-r2 * 2.6);
    float core = exp(-r2 * 16.0);
    float a = atan(d.y, d.x);
    float shafts = 0.5 + 0.5 * sin(a * 9.0 + sin(a * 3.0 + uTime * 0.06) * 2.0);
    shafts = pow(shafts, 4.0) * smoothstep(1.1, 0.05, sqrt(r2));
    float floorFade = smoothstep(0.0, 0.55, uv.y);
    vec3 c = uDeep * (0.55 + 0.45 * floorFade);
    c += uGlowCol * (g * 0.5 + core * 0.45 + shafts * 0.07) * uGlowAmt;
    return c;
  }
  float fogF(float d) {
    float x = d * uFogDensity;
    return 1.0 - exp(-x * x);
  }
`;

const STUD_VERT = /* glsl */ `
  attribute vec4 aGrid;   // lying pose: offset in from the wall, pile height, wave stagger, -
  attribute vec4 aCorr;   // corridor centre-base xyz, height
  attribute vec4 aWall;   // wall centre-base xyz, height
  attribute vec4 aMeta;   // seed, wall stagger, kind (0 stud, 1 track), stacked level

  uniform float uTime;
  uniform float uE1;
  uniform float uE2;
  uniform float uE3;
  uniform vec2 uThick;
  uniform float uWallBase;
  uniform float uWallH;
  uniform float uFloorY;

  varying vec3 vN;
  varying vec3 vW;
  varying float vUp;
  varying float vSeed;

  float stag(float e, float s, float k) {
    return smoothstep(0.0, 1.0, clamp(e * (1.0 + k) - s * k, 0.0, 1.0));
  }

  void main() {
    float seed = aMeta.x;
    float kind = aMeta.z;
    float lvl = aMeta.w;
    float e1 = stag(uE1, aGrid.z, 1.1);
    float e3 = stag(uE3, aMeta.y, 0.85);
    float side = sign(aCorr.x);
    float h = aCorr.w;

    // DELIVERED — the studs lie in loose stacks along each wall, the
    // segments of one stud end to end
    vec3 lie = vec3(aCorr.x - side * aGrid.x, uFloorY + aGrid.y + uThick.x, aCorr.z - lvl * h);
    // STAND — a wave runs down the corridor and every stud comes up on layout
    vec3 c = mix(lie, aCorr.xyz, e1);
    float tip = -(1.0 - e1) * 1.5708;
    tip -= sin(e1 * 3.14159) * 0.1;

    // PLUMB — one wall, dead true
    c = mix(c, aWall.xyz, e3);
    h = mix(h, aWall.w, e3);
    float arc3 = sin(e3 * 3.14159);
    c.y += arc3 * (seed - 0.5) * 3.0;
    c.z += arc3 * (0.5 + seed * 3.5);

    // a touch out of plumb until the very end — that is the whole story
    float r1 = fract(seed * 13.73) - 0.5;
    float r2 = fract(seed * 71.31) - 0.5;
    float leanAmt = mix(mix(0.06, 0.025, uE2), 0.0, e3);
    float az = r1 * leanAmt * (1.0 - kind);
    float ax = (r2 * leanAmt + tip) * (1.0 - kind);
    float cz = cos(az), sz = sin(az), cx = cos(ax), sx = sin(ax);
    mat3 R = mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0)
           * mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);

    vec3 lp;
    vec3 ln;
    if (kind < 0.5) {
      lp = vec3(position.x * uThick.x, position.y * h + h * 0.5, position.z * uThick.y);
      ln = normal;
    } else {
      // tracks: the same unit box, laid on its side
      lp = vec3(position.y * h, position.x * uThick.x * 1.5, position.z * uThick.y * 1.15);
      ln = vec3(normal.y, normal.x, normal.z);
    }

    vec3 wp = c + R * lp;
    vN = R * ln;
    vW = wp;
    /* shade by the bar's own height, except in the final wall, where
       the stacked segments must read as ONE plumb stud floor to head */
    vUp = mix(position.y + 0.5, clamp((wp.y - uWallBase) / uWallH, 0.0, 1.0), e3);
    vSeed = seed;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;

const STUD_FRAG = /* glsl */ `
  ${COMMON}
  uniform vec3 uSteel;
  uniform vec3 uLightPos;
  uniform float uLightAmt;
  uniform float uLaserY;
  uniform float uLaserAmt;
  uniform float uPlumbX;
  uniform float uPlumbAmt;
  uniform vec3 uLaserCol;
  uniform float uPulseZ;
  uniform float uPulseT;

  varying vec3 vN;
  varying vec3 vW;
  varying float vUp;
  varying float vSeed;

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    vec3 L = normalize(vec3(-0.35, 0.85, 0.4));
    float dif = max(dot(N, L), 0.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    // galvanised steel, each stud a touch different
    vec3 steel = uSteel * (0.82 + 0.34 * fract(vSeed * 91.7));
    vec3 col = steel * (0.03 + 0.36 * dif);

    // a soft pool of light that travels ahead of the camera
    float dl = length(vW - uLightPos);
    col += steel * uLightAmt * exp(-dl * dl * 0.016);

    col *= mix(0.4, 1.15, smoothstep(0.0, 1.0, vUp));
    col += uGlowCol * fres * 0.8;
    vec3 H = normalize(L + V);
    col += vec3(0.75, 0.95, 0.82) * pow(max(dot(N, H), 0.0), 48.0) * 0.3;

    float d = length(vW - cameraPosition);
    float f = fogF(d);
    col = mix(col, backdrop(gl_FragCoord.xy / uRes), f);

    // laser level (horizontal) and plumb line (vertical)
    float lw = 0.02 + d * 0.0015;
    float lz = (vW.y - uLaserY) / lw;
    float laser = exp(-lz * lz) * uLaserAmt;
    // station hand-off: a burst runs up the laser line toward the new station
    float pc = uPulseZ + 14.0 * (1.0 - uPulseT);
    float pd = vW.z - pc;
    laser *= 1.0 + 2.6 * exp(-pd * pd * 0.03) * (1.0 - uPulseT);
    float pz = (vW.x - uPlumbX) / 0.06;
    float plumb = exp(-pz * pz) * uPlumbAmt;
    col += uLaserCol * (laser * 2.6 + plumb * 1.6) * (1.0 - f * 0.7);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const SKY_VERT = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.9999, 1.0); }
`;
const SKY_FRAG = /* glsl */ `
  ${COMMON}
  void main() {
    gl_FragColor = vec4(backdrop(gl_FragCoord.xy / uRes), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const PANEL_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uVel;
  uniform float uHover;
  varying vec2 vUv;
  varying vec3 vW;
  void main() {
    vUv = uv;
    vec3 p = position;
    // the sheet bends with scroll speed, and ripples under the cursor
    p.z += sin(uv.x * 3.14159) * uVel * 0.45;
    p.z += sin(uv.y * 7.0 + uTime * 1.6) * 0.035 * uHover;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const PANEL_FRAG = /* glsl */ `
  ${COMMON}
  uniform sampler2D uTex;
  uniform float uOpacity;
  uniform float uHover;
  uniform float uVel;
  uniform float uLoaded;
  varying vec2 vUv;
  varying vec3 vW;
  void main() {
    vec2 cuv = vUv - 0.5;
    vec2 uv = cuv / mix(1.07, 1.0, uHover) + 0.5;
    float r = length(cuv);
    uv += cuv * sin(r * 22.0 - uTime * 3.0) * 0.006 * uHover;
    uv.y += sin(uv.x * 12.0 + uTime * 2.0) * 0.005 * uVel;
    float sh = 0.005 * uVel + 0.0015 * uHover;
    vec3 tex = vec3(
      texture2D(uTex, uv + vec2(sh, 0.0)).r,
      texture2D(uTex, uv).g,
      texture2D(uTex, uv - vec2(sh, 0.0)).b
    );
    // restrained, green-tinted grade until the viewer engages
    float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
    vec3 col = mix(vec3(lum) * vec3(0.8, 0.97, 0.86), tex, 0.3 + 0.7 * uHover);
    col *= 0.85 + 0.3 * uHover;
    vec2 e = smoothstep(vec2(0.0), vec2(0.1), vUv) * smoothstep(vec2(0.0), vec2(0.1), 1.0 - vUv);
    col *= mix(0.5, 1.0, e.x * e.y);
    // hairline frame
    vec2 px = fwidth(vUv) * 1.5;
    vec2 fr = step(vUv, px) + step(1.0 - vUv, px);
    col = mix(col, vec3(0.8, 0.95, 0.86), clamp(fr.x + fr.y, 0.0, 1.0) * 0.55);

    float f = fogF(length(vW - cameraPosition));
    col = mix(col, backdrop(gl_FragCoord.xy / uRes), f);
    gl_FragColor = vec4(col, uOpacity * uLoaded);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const DUST_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPx;
  uniform vec3 uBox;
  attribute float aSeed;
  varying float vA;
  varying float vD;
  void main() {
    vec3 drift = vec3(sin(uTime * 0.05 + aSeed * 6.0) * 0.6, uTime * 0.08, cos(uTime * 0.04 + aSeed) * 0.4);
    vec3 rel = mod(position + drift - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5;
    vec3 wp = cameraPosition + rel;
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    vD = -mv.z;
    vA = (0.35 + 0.65 * fract(aSeed * 17.3)) * smoothstep(0.5, 3.0, vD);
    gl_PointSize = uPx * (0.6 + fract(aSeed * 7.1)) * 26.0 / max(vD, 0.5);
    gl_Position = projectionMatrix * mv;
  }
`;
const DUST_FRAG = /* glsl */ `
  ${COMMON}
  varying float vA;
  varying float vD;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, length(q));
    float f = fogF(vD);
    gl_FragColor = vec4(vec3(0.7, 0.9, 0.78) * 0.55, a * vA * (1.0 - f) * 0.5);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const HASH = /* glsl */ `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
`;

/* the slab: power-trowelled concrete with the chalk layout on it */
const FLOOR_VERT = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const FLOOR_FRAG = /* glsl */ `
  ${COMMON}
  ${HASH}
  uniform float uHalfW;
  uniform vec3 uLightPos;
  uniform float uLightAmt;
  uniform float uLaserAmt;
  uniform vec3 uLaserCol;
  uniform float uCeil;
  uniform float uTro0;
  uniform float uFloorA;
  varying vec3 vW;
  void main() {
    vec3 V = normalize(cameraPosition - vW);
    float d = length(vW - cameraPosition);
    float m = hash21(floor(vW.xz * 3.0)) * 0.5 + hash21(floor(vW.xz * 0.7)) * 0.5;
    vec3 col = vec3(0.13, 0.15, 0.14) * (0.8 + 0.4 * m);
    // control joints every 12 ft and down the centre
    float jz = abs(fract(vW.z / 12.0 + 0.5) - 0.5) * 12.0;
    float joint = smoothstep(0.05, 0.0, jz) + smoothstep(0.05, 0.0, abs(vW.x));
    col *= 1.0 - 0.45 * clamp(joint, 0.0, 1.0);
    // chalk layout: both edges of each track line, a tick every 16 in
    float lx = abs(abs(vW.x) - uHalfW);
    float line = exp(-pow((lx - 0.11) / 0.02, 2.0));
    float tick = step(lx, 0.11) * exp(-pow((fract(vW.z / 1.3333) - 0.5) / 0.02, 2.0));
    col += vec3(0.5, 0.7, 0.9) * (line + tick) * 0.45;
    // light: the pool ahead of the camera and the troffers overhead
    float dl = length(vW - uLightPos);
    col += vec3(0.6, 0.75, 0.65) * uLightAmt * 0.35 * exp(-dl * dl * 0.012);
    float tro = pow(0.5 + 0.5 * cos((vW.z - uTro0) * 0.5236), 6.0) * exp(-vW.x * vW.x * 0.2);
    col += vec3(0.9, 0.9, 0.8) * tro * 0.3 * uCeil;
    // the laser level reflected along each wall base
    float lr = exp(-pow((abs(vW.x) - uHalfW) / 0.5, 2.0));
    col += uLaserCol * lr * uLaserAmt * 0.3;
    // sheen: the slab picks up the backdrop at grazing angles
    float fres = pow(1.0 - max(V.y, 0.0), 4.0);
    col += uGlowCol * fres * 0.35;
    float f = fogF(d);
    col = mix(col, backdrop(gl_FragCoord.xy / uRes), f);
    gl_FragColor = vec4(col, uFloorA);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* the ceiling: a 2x4 acoustical grid with a lit troffer every third tile */
const CEIL_FRAG = /* glsl */ `
  ${COMMON}
  uniform float uCeil;
  uniform float uTro0;
  varying vec3 vW;
  void main() {
    vec2 g = vec2(vW.x / 2.0 + 0.5, (vW.z - uTro0) / 4.0 + 0.5);
    vec2 cell = floor(g);
    vec2 fr = fract(g);
    float tee = max(smoothstep(0.03, 0.0, min(fr.x, 1.0 - fr.x)), smoothstep(0.015, 0.0, min(fr.y, 1.0 - fr.y)));
    float lit = step(abs(cell.x), 0.5) * step(abs(mod(cell.y, 3.0)), 0.5);
    vec2 inset = smoothstep(0.0, 0.08, fr) * smoothstep(0.0, 0.08, 1.0 - fr);
    float panel = lit * inset.x * inset.y;
    float near = pow(0.5 + 0.5 * cos((vW.z - uTro0) * 0.5236), 3.0);
    vec3 col = vec3(0.62, 0.66, 0.62) * (0.14 + 0.24 * near);
    col = mix(col, vec3(0.72, 0.74, 0.7) * 0.5, tee * 0.7);
    col += vec3(1.0, 0.98, 0.9) * panel * 1.7;
    float f = fogF(length(vW - cameraPosition));
    col = mix(col, backdrop(gl_FragCoord.xy / uRes), f);
    gl_FragColor = vec4(col, uCeil);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* wallboard and insulation: 4 ft sheets hung on the bays as the camera
   comes — the corridor is boarded up behind you as you walk it */
const SHEET_VERT = /* glsl */ `
  attribute vec4 aSheet;   // side, z, seed, kind (0 board, 1 batt)
  uniform float uCamZ;
  uniform float uE2;
  uniform float uHalfW;
  uniform float uFloorY;
  uniform float uH;
  varying vec2 vUv;
  varying vec3 vW;
  varying vec3 vN;
  varying float vA;
  varying float vKind;
  void main() {
    float side = aSheet.x;
    float seed = aSheet.z;
    float kind = aSheet.w;
    float dz = uCamZ - aSheet.y;
    float hang = kind < 0.5 ? smoothstep(34.0 + seed * 6.0, 22.0 + seed * 6.0, dz) : 1.0;
    float xoff = kind < 0.5 ? uHalfW + 0.17 : uHalfW + 0.04;
    vec3 c = vec3(side * xoff, uFloorY + uH * 0.5, aSheet.y);
    c.x += side * (1.0 - hang) * 3.0;
    c.y += (1.0 - hang) * 1.2;
    vec3 wp = c + vec3(0.0, position.y * uH, position.x * 4.0);
    vUv = uv;
    vW = wp;
    vN = vec3(-side, 0.0, 0.0);
    vA = hang * uE2;
    vKind = kind;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;
const SHEET_FRAG = /* glsl */ `
  ${COMMON}
  ${HASH}
  uniform vec3 uLightPos;
  uniform float uLightAmt;
  uniform float uLaserY;
  uniform float uLaserAmt;
  uniform vec3 uLaserCol;
  uniform float uH;
  varying vec2 vUv;
  varying vec3 vW;
  varying vec3 vN;
  varying float vA;
  varying float vKind;
  void main() {
    vec3 N = normalize(vN);
    vec3 L = normalize(vec3(-0.35, 0.85, 0.4));
    vec3 col;
    if (vKind < 0.5) {
      // gypsum board: paper face, screws on the stud lines, tape at the seams
      float m = hash21(floor(vW.zy * 9.0));
      col = vec3(0.80, 0.80, 0.76) * (0.94 + 0.08 * m);
      vec2 sc = (fract(vec2(vUv.x * 7.0, vUv.y * uH) + 0.5) - 0.5) * vec2(4.0 / 7.0, 1.0);
      float screw = smoothstep(0.035, 0.018, length(sc));
      col *= 1.0 - 0.35 * screw;
      float seam = smoothstep(0.25, 0.0, min(vUv.x, 1.0 - vUv.x) * 4.0);
      col *= 1.0 - 0.08 * seam;
    } else {
      // unfaced batts, pillowed between the studs
      float m = hash21(floor(vW.zy * 14.0)) * 0.6 + hash21(floor(vW.zy * 3.0)) * 0.4;
      col = vec3(0.78, 0.64, 0.34) * (0.75 + 0.4 * m);
      float bay = abs(fract(vUv.x * 7.0) - 0.5) * 2.0;
      col *= 0.7 + 0.3 * (1.0 - bay * bay);
    }
    col *= 0.05 + 0.5 * (0.55 + 0.45 * max(dot(N, L), 0.0));
    float dl = length(vW - uLightPos);
    col += col * uLightAmt * 1.6 * exp(-dl * dl * 0.016);
    float d = length(vW - cameraPosition);
    float lw = 0.02 + d * 0.0015;
    float lz = (vW.y - uLaserY) / lw;
    col += uLaserCol * exp(-lz * lz) * uLaserAmt * 2.2;
    float f = fogF(d);
    col = mix(col, backdrop(gl_FragCoord.xy / uRes), f);
    gl_FragColor = vec4(col, vA);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* camera keyframes: [progress, position, look target, linear?] —
   built per corridor length inside createCorridor() */
type V3 = [number, number, number];
type Key = [number, V3, V3, boolean?];

export async function createCorridor(o: Opts): Promise<CorridorHandle | null> {
  const THREE = await import("three");
  const { canvas } = o;

  const small =
    window.matchMedia("(max-width: 767px), (pointer: coarse)").matches || window.innerWidth < 768;

  let renderer: T.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !small,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  /* anything that throws while the scene is built must not leak the
     context: dispose, lose it, and let the caller fall back to static */
  try {
    return build(THREE, o, renderer, small);
  } catch (err) {
    console.warn("[corridor] 3D build failed, using the static layout", err);
    renderer.dispose();
    renderer.forceContextLoss();
    return null;
  }
}

function build(THREE: typeof import("three"), o: Opts, renderer: T.WebGLRenderer, small: boolean): CorridorHandle {
  const { stage, stations, labels } = o;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  const deep = new THREE.Color(0x051a0c);
  renderer.setClearColor(deep, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 240);

  /* ---- uniforms shared by every material ---- */
  const shared = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uAspect: { value: 1 },
    uDeep: { value: deep },
    uGlowCol: { value: new THREE.Color(0x1f8a4c) },
    uGlowPos: { value: new THREE.Vector2(0.5, 0.6) },
    uGlowAmt: { value: 0.6 },
    uFogDensity: { value: 0.042 },
  };

  /* ---- sky ---- */
  const skyGeo = new THREE.PlaneGeometry(2, 2);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    depthWrite: false,
    depthTest: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  /* ---- corridor geometry, sized to the station list ---- */
  const n = stations.length;
  const SPACING = 18;
  const stationZ = (i: number) => -4 - i * SPACING;
  const camStartZ = 17; //            camera z at PH.travelStart
  const travelLen = n * SPACING; //  linear travel: station i is 12 ahead at stationProgress(i, n)
  const lastZ = stationZ(n - 1);
  const WALL_Z = lastZ - 26;
  const corrStart = 18;
  const corrLen = corrStart - (lastZ - 10);

  const KEYS: Key[] = [
    [0.0, [0.6, 0.55, 20], [0, 0.15, -12]],
    [PH.flow, [0.4, 0.9, 19], [0, 0.25, -12]],
    [PH.flow + 0.035, [1.1, 2.7, 19.5], [0, -0.3, -14]],
    [PH.form + 0.015, [1.2, 1.4, 18], [0, 0.1, -16]],
    [PH.travelStart, [0, 0.35, camStartZ], [0, 0.2, camStartZ - 34], true],
    [PH.travelEnd, [0, 0.35, camStartZ - travelLen], [0, 0.25, camStartZ - travelLen - 40]],
    [0.955, [0, 0.45, WALL_Z + 21.5], [0, 0.35, WALL_Z]],
    [1.0, [0, 0.45, WALL_Z + 20.5], [0, 0.35, WALL_Z]],
  ];

  /* ---- the stud field ----
     Every instance is in every formation, so the instance count is set
     by the longest one — the corridor — at the prototype's stud pitch. */
  const COLS = small ? 32 : 48;
  const Lc = small ? 2 : 3; // stacked levels per corridor wall
  const pitch = small ? 0.86 : 0.57;
  const ROWS = Math.max(small ? 20 : 30, Math.ceil((Math.ceil(corrLen / pitch) * 2 * Lc) / COLS));
  const N = COLS * ROWS;
  const TOTAL = N + 2; // + top and bottom track
  const rand = mulberry32(22204);

  const aGrid = new Float32Array(TOTAL * 4);
  const aCorr = new Float32Array(TOTAL * 4);
  const aWall = new Float32Array(TOTAL * 4);
  const aMeta = new Float32Array(TOTAL * 4);

  const perLevel = Math.ceil(N / 2 / Lc);
  const corrStep = corrLen / perLevel;
  const corrH = 6.2;
  const corrBase = -2.8;
  const halfW = small ? 3.1 : 4.2;

  const wallSp = 0.5;
  const wallH = 10.4;
  const wallBase = -5;
  const wallW = (COLS - 1) * wallSp;
  const plumbCol = Math.floor(COLS / 2);
  const plumbX = (plumbCol - (COLS - 1) / 2) * wallSp;

  /* where each stud lies before it stands: one pile pose per stud column
     (side + position along the corridor), so its stacked segments lie
     end to end as one stud */
  const pileOf = (zi: number, side: number) => {
    const pr = mulberry32(zi * 7 + side * 3 + 100);
    return { x: 0.2 + pr() * 1.8, y: pr() * 0.55 };
  };
  for (let i = 0; i < N; i++) {
    const col = i % COLS;
    const seed = rand();

    const side = i % 2 ? 1 : -1;
    const k = Math.floor(i / 2);
    const lvl = k % Lc;
    const zi = Math.floor(k / Lc);
    const segH = corrH / Lc;
    const zc = corrStart - zi * corrStep;
    aCorr.set([side * halfW, corrBase + lvl * segH + 0.02, zc, segH - 0.04], i * 4);

    const pile = pileOf(zi, side);
    aGrid.set([pile.x, pile.y, (corrStart - zc) / corrLen, 0], i * 4);

    const wl = Math.floor(i / COLS);
    const lvH = wallH / ROWS;
    aWall.set([(col - (COLS - 1) / 2) * wallSp, wallBase + wl * lvH, WALL_Z, lvH + 0.012], i * 4);

    const fromCentre = Math.abs(col - (COLS - 1) / 2) / ((COLS - 1) / 2);
    aMeta.set([seed, fromCentre * 0.75 + rand() * 0.25, 0, lvl], i * 4);
  }
  /* the two tracks, which only exist in the final wall */
  for (let t = 0; t < 2; t++) {
    const i = N + t;
    const y = t === 0 ? wallBase - 0.08 : wallBase + wallH + 0.08;
    aGrid.set([0, 0, 0.5, 0], i * 4);
    aCorr.set([0, y, WALL_Z + 10, 0], i * 4);
    aWall.set([0, y, WALL_Z, wallW + 0.6], i * 4);
    aMeta.set([0.5, 0.35, 1, 0], i * 4);
  }

  const studGeo = new THREE.BoxGeometry(1, 1, 1);
  studGeo.setAttribute("aGrid", new THREE.InstancedBufferAttribute(aGrid, 4));
  studGeo.setAttribute("aCorr", new THREE.InstancedBufferAttribute(aCorr, 4));
  studGeo.setAttribute("aWall", new THREE.InstancedBufferAttribute(aWall, 4));
  studGeo.setAttribute("aMeta", new THREE.InstancedBufferAttribute(aMeta, 4));

  const laserCol = new THREE.Color().setRGB(1.0, 0.16, 0.0); // #ff6600, linear
  const studUniforms = {
    ...shared,
    uE1: { value: 0 },
    uE2: { value: 0 },
    uE3: { value: 0 },
    uPhase: { value: 0 },
    uThick: { value: new THREE.Vector2(0.07, 0.22) },
    uWallBase: { value: wallBase },
    uWallH: { value: wallH },
    uFloorY: { value: corrBase },
    uSteel: { value: new THREE.Color(0xb9cdbf) },
    uLightPos: { value: new THREE.Vector3() },
    uLightAmt: { value: 0.9 },
    uLaserY: { value: -1.2 },
    uLaserAmt: { value: 0 },
    uPlumbX: { value: plumbX },
    uPlumbAmt: { value: 0 },
    uLaserCol: { value: laserCol },
    uPulseZ: { value: 0 },
    uPulseT: { value: 1 },
  };
  const studMat = new THREE.ShaderMaterial({
    uniforms: studUniforms,
    vertexShader: STUD_VERT,
    fragmentShader: STUD_FRAG,
  });
  /* InstancedMesh for one draw call; placement is entirely in the
     vertex shader, so the instance matrices stay identity. */
  const studs = new THREE.InstancedMesh(studGeo, studMat, TOTAL);
  studs.frustumCulled = false;
  scene.add(studs);

  /* ---- the slab, the ceiling grid and the wallboard ---- */
  const tro0 = corrStart - 6;
  const floorGeo = new THREE.PlaneGeometry(small ? 22 : 30, corrLen + 80);
  floorGeo.rotateX(-Math.PI / 2);
  const floorUniforms = {
    ...shared,
    uHalfW: { value: halfW },
    uLightPos: studUniforms.uLightPos,
    uLightAmt: studUniforms.uLightAmt,
    uLaserAmt: studUniforms.uLaserAmt,
    uLaserCol: { value: laserCol },
    uCeil: { value: 0 },
    uTro0: { value: tro0 },
    uFloorA: { value: 1 },
  };
  const floorMat = new THREE.ShaderMaterial({
    uniforms: floorUniforms,
    vertexShader: FLOOR_VERT,
    fragmentShader: FLOOR_FRAG,
    transparent: true,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, corrBase - 0.01, (corrStart + 30 + lastZ - 50) / 2);
  floor.frustumCulled = false;
  scene.add(floor);

  const ceilGeo = new THREE.PlaneGeometry(halfW * 2 + 0.4, corrLen + 20);
  ceilGeo.rotateX(Math.PI / 2);
  const ceilUniforms = { ...shared, uCeil: { value: 0 }, uTro0: { value: tro0 } };
  const ceilMat = new THREE.ShaderMaterial({
    uniforms: ceilUniforms,
    vertexShader: FLOOR_VERT,
    fragmentShader: CEIL_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.position.set(0, corrBase + corrH + 0.35, (corrStart + 10 + lastZ - 10) / 2);
  ceil.frustumCulled = false;
  scene.add(ceil);

  /* boards in runs of three bays (12 ft) with framing left open between,
     batts in roughly half the bays */
  const sheetData: number[] = [];
  const srand = mulberry32(919);
  const frac = (x: number) => x - Math.floor(x);
  const bayCount = Math.floor((corrStart + 2 - (lastZ - 12)) / 4);
  for (let zi = 0; zi < bayCount; zi++) {
    const z = corrStart - zi * 4;
    for (const side of [-1, 1]) {
      const run = Math.floor(zi / 3) * 2 + (side + 1) / 2;
      if (frac(Math.sin(run * 12.9898) * 43758.5453) > 0.42) sheetData.push(side, z, srand(), 0);
      if (frac(Math.sin(run * 78.233 + 1.0) * 43758.5453) > 0.45) sheetData.push(side, z, srand(), 1);
    }
  }
  const sheetGeo = new THREE.PlaneGeometry(1, 1);
  sheetGeo.setAttribute("aSheet", new THREE.InstancedBufferAttribute(new Float32Array(sheetData), 4));
  const sheetUniforms = {
    ...shared,
    uCamZ: { value: 30 },
    uE2: { value: 0 },
    uHalfW: { value: halfW },
    uFloorY: { value: corrBase },
    uH: { value: corrH },
    uLightPos: studUniforms.uLightPos,
    uLightAmt: studUniforms.uLightAmt,
    uLaserY: studUniforms.uLaserY,
    uLaserAmt: studUniforms.uLaserAmt,
    uLaserCol: { value: laserCol },
  };
  const sheetMat = new THREE.ShaderMaterial({
    uniforms: sheetUniforms,
    vertexShader: SHEET_VERT,
    fragmentShader: SHEET_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sheets = new THREE.InstancedMesh(sheetGeo, sheetMat, sheetData.length / 4);
  sheets.frustumCulled = false;
  scene.add(sheets);

  /* ---- laser beams across the final wall ---- */
  const beamMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color().setRGB(2.2, 0.35, 0.0),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beamH = new THREE.Mesh(new THREE.PlaneGeometry(wallW + 4, 0.022), beamMat);
  beamH.position.set(0, 0, WALL_Z + 0.2);
  const beamVMat = beamMat.clone();
  const beamV = new THREE.Mesh(new THREE.PlaneGeometry(0.028, wallH + 2), beamVMat);
  beamV.position.set(plumbX, wallBase + wallH / 2, WALL_Z + 0.2);
  scene.add(beamH, beamV);

  /* ---- dust in the light ---- */
  const DUST = small ? 260 : 620;
  const dPos = new Float32Array(DUST * 3);
  const dSeed = new Float32Array(DUST);
  const box = new THREE.Vector3(24, 12, 40);
  for (let i = 0; i < DUST; i++) {
    dPos.set([rand() * box.x, rand() * box.y, rand() * box.z], i * 3);
    dSeed[i] = rand();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(dSeed, 1));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uPx: { value: dpr }, uBox: { value: box } },
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---- project photographs along the corridor ----
     One mesh per photograph on a shared unit plane, sized by scale.
     A pair takes BOTH walls at the same station; singles alternate.
     Width is resolution-honest (spec §4.3): never more than 1.25 CSS
     px per texel at the closest comfortable viewing distance, so a
     259px photograph gets a smaller panel instead of a blur. */
  let disposed = false;
  const unitGeo = new THREE.PlaneGeometry(1, 1, 24, 16);
  const loader = new THREE.TextureLoader();
  const textures: T.Texture[] = [];
  const closest = small ? 5 : 7;

  type Panel = {
    mesh: T.Mesh;
    mat: T.ShaderMaterial;
    station: number;
    z: number;
    baseY: number;
    hover: number;
    loaded: boolean;
    aspect: number;
    px: number;
    maxW: number;
    failed: boolean;
  };
  const panelObjs: Panel[] = [];
  stations.forEach((st, si) => {
    const pair = st.panels.length === 2;
    st.panels.forEach((pd, k) => {
      const side = pair ? (k === 0 ? -1 : 1) : si % 2 ? 1 : -1;
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          ...shared,
          uTex: { value: null as T.Texture | null },
          uOpacity: { value: 0 },
          uHover: { value: 0 },
          uVel: { value: 0 },
          uLoaded: { value: 0 },
        },
        vertexShader: PANEL_VERT,
        fragmentShader: PANEL_FRAG,
        transparent: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(unitGeo, mat);
      /* the photographs are always the last thing drawn: nothing on the
         wall behind them (board, batts) may paint over a sheet that wrote
         no depth */
      mesh.renderOrder = 2;
      const z = stationZ(si) - (pair && k === 1 ? 2 : 0);
      const baseY = 0.4 + (si % 3 === 1 ? 0.35 : -0.1);
      mesh.position.set(side * (small ? (pair ? 1.35 : 1.05) : 2.25), baseY, z);
      mesh.rotation.y = -side * 0.28;
      scene.add(mesh);
      const obj: Panel = {
        mesh, mat, station: si, z, baseY, hover: 0, loaded: false,
        aspect: pd.aspect || 1.5, px: pd.px,
        maxW: small ? (pair ? 2.2 : 2.8) : 3.4,
        failed: false,
      };
      panelObjs.push(obj);
      loader.load(
        pd.url,
        (tex) => {
          /* a download that lands after a page swap is simply dropped */
          if (disposed) return tex.dispose();
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          textures.push(tex);
          mat.uniforms.uTex.value = tex;
          /* upload now, not on the first frame the panel is on screen —
             a 1600px texture uploading mid-scroll drops a frame */
          renderer.initTexture(tex);
          obj.loaded = true;
        },
        undefined,
        () => {
          /* a missing file leaves no black rectangle; the panel stays
             hidden but its label still names the station */
          obj.failed = true;
        },
      );
    });
  });
  /* the label anchor of each station: its first panel */
  const firstPanel = stations.map((_, si) => panelObjs.find((q) => q.station === si)!);
  const labelLast = stations.map(() => -1);

  /* ---- pointer: parallax + hover ---- */
  const pointer = new THREE.Vector2(0, 0);
  const ptrSmooth = new THREE.Vector2(0, 0);
  let pointerIn = false;
  const ray = new THREE.Raycaster();
  let hovered: Panel | null = null;
  const onMove = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    pointerIn = e.pointerType === "mouse";
  };
  const onLeave = () => {
    pointerIn = false;
    pointer.set(0, 0);
  };
  /* raycast only against panels that are actually on show */
  let corridorVis = 0;
  const pickAt = (ndc: T.Vector2): Panel | null => {
    if (corridorVis <= 0.5) return null;
    const live = panelObjs.filter((q) => q.mesh.visible && q.mat.uniforms.uOpacity.value > 0.3);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(live.map((q) => q.mesh), false);
    return hits.length ? live.find((q) => q.mesh === hits[0].object) ?? null : null;
  };
  /* resolve the click where it happened — a touch tap has no hover state */
  const tapNdc = new THREE.Vector2();
  const onClick = (e: MouseEvent) => {
    const r = stage.getBoundingClientRect();
    tapNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    const q = pickAt(tapNdc);
    if (q) o.onSelect(q.station);
  };
  stage.addEventListener("pointermove", onMove, { passive: true });
  stage.addEventListener("pointerleave", onLeave);
  stage.addEventListener("click", onClick);

  /* ---- sizing ---- */
  let W = 1;
  let H = 1;
  const resize = () => {
    W = Math.max(1, stage.clientWidth);
    H = Math.max(1, stage.clientHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = camera.aspect < 0.8 ? 54 : 40;
    camera.updateProjectionMatrix();
    shared.uRes.value.set(W * dpr, H * dpr);
    shared.uAspect.value = W / H;
    const worldPerCssPx = (2 * closest * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / H;
    for (const q of panelObjs) {
      const w = honestPanelWidth(q.px, q.maxW, worldPerCssPx);
      q.mesh.scale.set(w, w / q.aspect, 1);
    }
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  /* ---- per-frame ---- */
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  let time = 0;
  let alive = 0; // seconds since the scene came up
  let lastP = 0;
  let lastActive = -2;

  const glowAt = (e1: number, e2: number, e3: number) => {
    const gx = 0.5;
    const gy = lerp(lerp(lerp(0.6, 0.74, e1), 0.52, e2), 0.56, e3);
    shared.uGlowPos.value.set(gx, gy);
    shared.uGlowAmt.value = lerp(lerp(lerp(0.75, 0.6, e1), 0.95, e2), 1.15, e3);
    shared.uFogDensity.value = lerp(lerp(lerp(0.042, 0.034, e1), 0.05, e2), 0.021, e3);
  };

  const cameraAt = (p: number) => {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const [p0, a0, l0, linear] = KEYS[i];
    const [p1, a1, l1] = KEYS[i + 1];
    const raw = clamp01((p - p0) / (p1 - p0));
    const t = linear ? raw : smooth(0, 1, raw);
    pos.set(lerp(a0[0], a1[0], t), lerp(a0[1], a1[1], t), lerp(a0[2], a1[2], t));
    look.set(lerp(l0[0], l1[0], t), lerp(l0[1], l1[1], t), lerp(l0[2], l1[2], t));
  };

  const update = (p: number, dt: number, vel: number) => {
    time += dt;
    alive += dt;
    shared.uTime.value = time;

    const e1 = smooth(0.012, PH.flow + 0.025, p);
    const e2 = smooth(PH.flow + 0.03, PH.travelStart - 0.005, p);
    const e3 = smooth(PH.travelEnd + 0.005, PH.plumb + 0.035, p);
    lastP = p;
    studUniforms.uE1.value = e1;
    studUniforms.uE2.value = e2;
    studUniforms.uE3.value = e3;
    studUniforms.uPhase.value = time * 0.3 + p * 14;
    glowAt(e1, e2, e3);
    /* the slab and ceiling belong to the corridor; both leave with it */
    const leaving = smooth(0, 0.6, e3);
    const ceilA = smooth(0.35, 1, e2) * (1 - leaving);
    floorUniforms.uCeil.value = ceilA;
    ceilUniforms.uCeil.value = ceilA;
    floorUniforms.uFloorA.value = 1 - leaving;
    sheetUniforms.uE2.value = e2 * (1 - leaving);

    /* camera: keyframes + corridor sway + pointer parallax + idle drift */
    cameraAt(p);
    ptrSmooth.lerp(pointer, Math.min(1, dt * 3));
    pos.x += Math.sin(pos.z * 0.045) * 0.35 * e2 * (1 - e3);
    pos.x += ptrSmooth.x * 0.55 * (1 - e3 * 0.5);
    pos.y += ptrSmooth.y * 0.3 + Math.sin(time * 0.3) * 0.06;
    camera.position.copy(pos);
    camera.lookAt(look);
    sheetUniforms.uCamZ.value = pos.z;

    fwd.subVectors(look, pos).normalize();
    studUniforms.uLightPos.value.copy(pos).addScaledVector(fwd, 9).add(tmp.set(0, 2.5, 0));

    /* laser: switches on shortly after load, rides at eye level in the
       corridor, then sweeps up the final wall to level it */
    const sweep = lerp(wallBase + 0.2, 0.35, smooth(PH.plumb - 0.01, PH.plumb + 0.045, p));
    studUniforms.uLaserY.value = lerp(lerp(-1.25, -0.2, e2), sweep, e3);
    studUniforms.uLaserAmt.value = 0.9 * smooth(0.7, 1.8, alive) * (1 + 0.3 * Math.min(1, vel));
    const act = activeStation(p, n);
    if (act !== lastActive) {
      lastActive = act;
      if (act >= 0) {
        studUniforms.uPulseZ.value = stationZ(act);
        studUniforms.uPulseT.value = 0;
      }
    }
    studUniforms.uPulseT.value = Math.min(1, studUniforms.uPulseT.value + dt / 0.55);
    const plumb = smooth(PH.plumb + 0.005, 0.985, p);
    studUniforms.uPlumbAmt.value = plumb;
    beamH.position.y = studUniforms.uLaserY.value;
    beamMat.opacity = 0.55 * e3;
    beamVMat.opacity = 0.5 * plumb;

    /* panels: visible only in the corridor */
    const inCorridor = smooth(0.55, 1, e2) * (1 - smooth(0, 0.5, e3));
    corridorVis = inCorridor;
    const hit = pointerIn ? pickAt(pointer) : null;
    if (hit !== hovered) {
      hovered = hit;
      stage.style.cursor = hit ? "pointer" : "";
    }

    for (const q of panelObjs) {
      const dz = pos.z - q.z; // > 0 while the panel is ahead
      const op = smooth(62, 30, dz) * smooth(-1.5, 2.5, dz) * inCorridor;
      q.hover += ((q === hovered ? 1 : 0) - q.hover) * Math.min(1, dt * 5);
      const u = q.mat.uniforms;
      u.uOpacity.value = op;
      u.uHover.value = q.hover;
      u.uVel.value = Math.max(-0.6, Math.min(0.6, vel));
      u.uLoaded.value += ((q.loaded ? 1 : 0) - u.uLoaded.value) * Math.min(1, dt * 3);
      q.mesh.visible = op > 0.002;
      q.mesh.position.y = q.baseY + Math.sin(time * 0.45 + q.z) * 0.06;
    }

    /* HTML label pinned under each station's first panel, bottom-left */
    stations.forEach((_, si) => {
      const q = firstPanel[si];
      const label = labels[si];
      if (!q || !label) return;
      const dz = pos.z - q.z;
      const shown = q.failed ? 1 : q.mat.uniforms.uLoaded.value;
      const lo = smooth(27, 19, dz) * smooth(2.5, 6, dz) * inCorridor * shown;
      if (lo > 0.005) {
        tmp.set(-0.5, -0.5, 0);
        q.mesh.localToWorld(tmp);
        tmp.project(camera);
        const x = (tmp.x * 0.5 + 0.5) * W;
        const y = (-tmp.y * 0.5 + 0.5) * H;
        label.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + 12).toFixed(1)}px, 0)`;
      }
      if (Math.abs(lo - labelLast[si]) > 0.004) {
        labelLast[si] = lo;
        label.style.opacity = lo.toFixed(3);
      }
    });

    renderer.render(scene, camera);
    return Math.max(0, 17 - pos.z);
  };

  /* compile shaders before the fade-in so the first scroll frame never hitches */
  cameraAt(0);
  camera.position.copy(pos);
  camera.lookAt(look);
  renderer.compile(scene, camera);
  update(0, 0.016, 0);

  const dispose = () => {
    disposed = true;
    ro.disconnect();
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerleave", onLeave);
    stage.removeEventListener("click", onClick);
    stage.style.cursor = "";
    for (const l of labels) {
      l.style.opacity = "0";
    }
    textures.forEach((t) => t.dispose());
    [skyGeo, studGeo, dustGeo, unitGeo, floorGeo, ceilGeo, sheetGeo, beamH.geometry, beamV.geometry].forEach((g) => g.dispose());
    [skyMat, studMat, dustMat, floorMat, ceilMat, sheetMat, beamMat, beamVMat, ...panelObjs.map((q) => q.mat)].forEach((m) => m.dispose());
    studs.dispose();
    sheets.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  return {
    update,
    resize,
    dispose,
    stats: () => ({ panels: panelObjs.length, progress: lastP }),
  };
}
