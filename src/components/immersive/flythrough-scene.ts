/* ============================================================
   flythrough-scene — the three.js half of FlythroughHero.astro.

   This module is only ever reached through a DYNAMIC import from the
   component, so three.js (and RoomEnvironment) live in their own
   chunk and never touch the homepage's eager bundle.

   World units are METRES. The building is a single-storey retail /
   restaurant pavilion — the kind of box the company actually fits out
   (Chipotle, F45, ALDI, AutoZone) — 26m wide, 18m deep, with an EIFS
   envelope, an entrance tower, full-height storefront glazing and a
   finished interior behind it.

     x  -13 … 13      left → right, looking at the storefront
     y   0 …  6.6     road at 0, sidewalk + floor slab top at 0.15
     z  -18 …  0      the building; the street runs toward +z

   Everything is procedural: geometry is built from boxes, extrusions
   and instances; every texture is painted on a 2D canvas at runtime.
   ============================================================ */

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { KEYS, ANCHORS, type V3 } from "./flythrough-timeline";

export interface HotspotScreen {
  x: number;
  y: number;
  visible: boolean;
}

export interface FlyOptions {
  canvas: HTMLCanvasElement;
  /* the sticky element — the canvas is sized from it */
  host: HTMLElement;
  /* small / touch screens: lower DPR, fewer lights, simpler geometry */
  lite: boolean;
  /* the scroll-derived progress the camera should be heading toward */
  getTarget: () => number;
  /* called after every rendered frame with the damped progress */
  onFrame: (p: number, hot: Record<string, HotspotScreen>) => void;
  /* reduced motion: render one composed frame at this progress, no loop */
  still?: number;
}

export interface FlyController {
  kick(): void;
  resize(): void;
  dispose(): void;
  stats(): { lights: number; progress: number };
}

/* ---------------------------------------------------------------
   Camera choreography. [progress, eye, look-at]. Positions and
   targets each run through a centripetal Catmull-Rom spline; a key's
   progress maps exactly onto its spline knot, so the stations land
   where the copy says they do.
   --------------------------------------------------------------- */
/* ---------------- small utilities ---------------- */
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const ss = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function createFlythrough(o: FlyOptions): Promise<FlyController | null> {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: o.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  /* anything that throws while the scene is built must not leak the
     context: dispose, lose it, and let the caller fall back to static */
  try {
    return await build(o, renderer);
  } catch (err) {
    console.warn("[flythrough] 3D build failed, using the static layout", err);
    renderer.dispose();
    renderer.forceContextLoss();
    return null;
  }
}

async function build(o: FlyOptions, renderer: THREE.WebGLRenderer): Promise<FlyController> {
  const lite = o.lite;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 1.75));
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  /* canvas-painted type needs the self-hosted faces to be ready */
  try {
    await Promise.all([
      document.fonts.load('700 120px "Space Grotesk"'),
      document.fonts.load('400 40px "JetBrains Mono"'),
    ]);
  } catch {
    /* fall back to the system stack — still legible */
  }

  const rand = mulberry32(20260918);
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  /* ============================================================
     Procedural textures
     ============================================================ */
  function canvas2d(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return [c, c.getContext("2d")!];
  }
  function tex(c: HTMLCanvasElement, opts: { srgb?: boolean; repeat?: [number, number] } = {}) {
    const t = track(new THREE.CanvasTexture(c));
    t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
    return t;
  }
  function noiseFill(ctx: CanvasRenderingContext2D, w: number, h: number, base: [number, number, number], amp: number) {
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rand() - 0.5) * amp;
      d[i] = base[0] + n;
      d[i + 1] = base[1] + n;
      d[i + 2] = base[2] + n;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  /* low-frequency blotches: tiny random canvas scaled up with smoothing */
  function blotches(ctx: CanvasRenderingContext2D, w: number, h: number, cells: number, lo: number, hi: number, alpha = 1) {
    const [s, sx] = canvas2d(cells, cells);
    const img = sx.createImageData(cells, cells);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = lo + rand() * (hi - lo);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    sx.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(s, 0, 0, w, h);
    ctx.restore();
  }

  /* fine sand-finish grain — the bump map for EIFS, stone, concrete */
  const [grainC, grainX] = canvas2d(256, 256);
  noiseFill(grainX, 256, 256, [128, 128, 128], 110);
  const grain = (rep: number) => {
    const t = tex(grainC, { srgb: false, repeat: [rep, rep] });
    return t;
  };

  /* asphalt, with wet-look roughness blotches */
  const [asC, asX] = canvas2d(512, 512);
  noiseFill(asX, 512, 512, [40, 42, 41], 26);
  for (let i = 0; i < 900; i++) {
    asX.fillStyle = `rgba(${rand() > 0.5 ? "120,118,112" : "12,12,12"},${0.25 + rand() * 0.3})`;
    asX.fillRect(rand() * 512, rand() * 512, 1 + rand() * 2, 1 + rand() * 2);
  }
  const asphaltMap = tex(asC, { repeat: [60, 60] });
  const [asR, asRX] = canvas2d(512, 512);
  asRX.fillStyle = "#999";
  asRX.fillRect(0, 0, 512, 512);
  blotches(asRX, 512, 512, 10, 70, 220);
  const asphaltRough = tex(asR, { srgb: false, repeat: [9, 9] });

  /* sidewalk: 2m bays with tooled joints */
  const [swC, swX] = canvas2d(512, 512);
  noiseFill(swX, 512, 512, [150, 148, 142], 30);
  blotches(swX, 512, 512, 6, 120, 175, 0.35);
  swX.fillStyle = "rgba(20,20,18,0.55)";
  swX.fillRect(0, 0, 512, 3);
  swX.fillRect(0, 0, 3, 512);
  const sidewalkMap = tex(swC, { repeat: [0.5, 0.5] });

  /* polished concrete floor — mottled, with saw-cut joints every 4m */
  const [flC, flX] = canvas2d(1024, 1024);
  flX.fillStyle = "#8e8b84";
  flX.fillRect(0, 0, 1024, 1024);
  blotches(flX, 1024, 1024, 8, 110, 170, 0.55);
  blotches(flX, 1024, 1024, 40, 120, 160, 0.25);
  for (let i = 0; i < 5000; i++) {
    const g = 60 + rand() * 140;
    flX.fillStyle = `rgba(${g},${g - 4},${g - 8},${0.25 + rand() * 0.35})`;
    flX.fillRect(rand() * 1024, rand() * 1024, 1 + rand() * 2.5, 1 + rand() * 2.5);
  }
  flX.fillStyle = "rgba(30,28,25,0.6)";
  flX.fillRect(0, 0, 1024, 2);
  flX.fillRect(0, 0, 2, 1024);
  const floorMap = tex(flC, { repeat: [0.25, 0.25] });

  /* mineral-wool batt — fibrous strokes */
  const [baC, baX] = canvas2d(256, 512);
  baX.fillStyle = "#d9b865";
  baX.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2600; i++) {
    const x = rand() * 256;
    const y = rand() * 512;
    const a = (rand() - 0.5) * 1.2;
    const l = 4 + rand() * 18;
    baX.strokeStyle = rand() > 0.5 ? `rgba(255,236,170,${0.25 + rand() * 0.4})` : `rgba(120,86,30,${0.15 + rand() * 0.3})`;
    baX.lineWidth = 0.6 + rand() * 1.2;
    baX.beginPath();
    baX.moveTo(x, y);
    baX.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    baX.stroke();
  }
  const battMap = tex(baC);

  /* wood blocking — grain streaks */
  const [wdC, wdX] = canvas2d(512, 64);
  wdX.fillStyle = "#c29560";
  wdX.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 70; i++) {
    const y = rand() * 64;
    wdX.strokeStyle = `rgba(${110 + rand() * 40},${70 + rand() * 30},${30},${0.2 + rand() * 0.35})`;
    wdX.lineWidth = 0.5 + rand() * 1.6;
    wdX.beginPath();
    wdX.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) wdX.lineTo(x, y + Math.sin(x * 0.02 + i) * 2.2);
    wdX.stroke();
  }
  const woodMap = tex(wdC);

  /* acoustical ceiling tile — fissured mineral fibre, 2'x4' */
  const [tlC, tlX] = canvas2d(128, 256);
  noiseFill(tlX, 128, 256, [234, 233, 228], 10);
  for (let i = 0; i < 420; i++) {
    tlX.fillStyle = `rgba(90,92,88,${0.18 + rand() * 0.35})`;
    const l = 1 + rand() * 4;
    rand() > 0.5 ? tlX.fillRect(rand() * 128, rand() * 256, l, 1) : tlX.fillRect(rand() * 128, rand() * 256, 1, l);
  }
  tlX.strokeStyle = "rgba(0,0,0,0.12)";
  tlX.lineWidth = 3;
  tlX.strokeRect(1.5, 1.5, 125, 253);
  const tileMap = tex(tlC);

  /* corrugated roof deck, seen in the plenum */
  const [dkC, dkX] = canvas2d(64, 8);
  const dg = dkX.createLinearGradient(0, 0, 64, 0);
  dg.addColorStop(0, "#222");
  dg.addColorStop(0.5, "#ddd");
  dg.addColorStop(1, "#222");
  dkX.fillStyle = dg;
  dkX.fillRect(0, 0, 64, 8);
  const deckBump = tex(dkC, { srgb: false, repeat: [6, 1] });

  /* distant city — dark volumes with scattered lit windows */
  const [ctC, ctX] = canvas2d(256, 512);
  ctX.fillStyle = "#0b100e";
  ctX.fillRect(0, 0, 256, 512);
  for (let y = 8; y < 512; y += 18)
    for (let x = 6; x < 256; x += 14) {
      if (rand() < 0.2) {
        const w = 180 + rand() * 75;
        ctX.fillStyle = `rgb(${w},${w * 0.78},${w * 0.52})`;
        ctX.fillRect(x, y, 8, 10);
      }
    }
  const cityMap = tex(ctC);

  /* soft radial halo for light sources (fake bloom, zero cost) */
  const [hlC, hlX] = canvas2d(128, 128);
  const hg = hlX.createRadialGradient(64, 64, 0, 64, 64, 64);
  hg.addColorStop(0, "rgba(255,255,255,0.9)");
  hg.addColorStop(0.18, "rgba(255,255,255,0.35)");
  hg.addColorStop(1, "rgba(255,255,255,0)");
  hlX.fillStyle = hg;
  hlX.fillRect(0, 0, 128, 128);
  const haloMap = tex(hlC);

  /* tenant sign on the entrance tower — our own building, carrying the
     real logo lockup (icon + wordmark) from /public/logo.png. If the file
     can't be loaded the sign falls back to set type, never to a blank. */
  const logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/logo.png";
  });
  const [sgC, sgX] = canvas2d(1024, 1024);
  sgX.clearRect(0, 0, 1024, 1024);
  if (logoImg) {
    const k = Math.min(940 / logoImg.naturalWidth, 940 / logoImg.naturalHeight);
    const w = logoImg.naturalWidth * k;
    const h = logoImg.naturalHeight * k;
    sgX.drawImage(logoImg, (1024 - w) / 2, (1024 - h) / 2, w, h);
  } else {
    sgX.fillStyle = "#ffffff";
    sgX.textAlign = "center";
    sgX.font = '700 250px "Space Grotesk", system-ui, sans-serif';
    sgX.fillText("NIRVANA", 512, 540);
    sgX.font = '400 52px "JetBrains Mono", ui-monospace, monospace';
    sgX.fillText("CONSTRUCTION INC.", 512, 650);
  }
  const signMap = tex(sgC);

  /* environmental supergraphic on the feature wall */
  const [fwC, fwX] = canvas2d(2048, 860);
  fwX.fillStyle = "#08331a";
  fwX.fillRect(0, 0, 2048, 860);
  blotches(fwX, 2048, 860, 12, 0, 40, 0.06);
  fwX.fillStyle = "rgba(255,255,255,0.55)";
  fwX.font = '400 30px "JetBrains Mono", ui-monospace, monospace';
  (fwX as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "6px";
  fwX.fillText("THE NIRVANA WAY", 900, 150);
  fwX.fillStyle = "#ff6600";
  fwX.fillRect(900, 178, 46, 6);
  fwX.fillStyle = "#f2f5f1";
  fwX.font = '700 164px "Space Grotesk", system-ui, sans-serif';
  (fwX as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "-7px";
  fwX.fillText("Excellence", 890, 390);
  fwX.fillText("without", 890, 545);
  fwX.fillText("compromise.", 890, 700);
  fwX.strokeStyle = "rgba(255,255,255,0.18)";
  fwX.lineWidth = 2;
  for (let i = 1; i < 8; i++) {
    fwX.beginPath();
    fwX.moveTo(160 + i * 70, 120);
    fwX.lineTo(160 + i * 70, 760);
    fwX.stroke();
  }
  const featureMap = tex(fwC);

  /* ============================================================
     Scene, sky, fog, environment
     ============================================================ */
  const scene = new THREE.Scene();
  const FOG = new THREE.Color(0x2a2520);
  const fog = new THREE.FogExp2(FOG.getHex(), 0.011);
  scene.fog = fog;
  scene.background = FOG.clone();

  const skyUniforms = {
    zenith: { value: new THREE.Color(0x06120d) },
    upper: { value: new THREE.Color(0x14352a) },
    horizon: { value: new THREE.Color(0x9a5a36) },
    glow: { value: new THREE.Color(0xff8a3d) },
    ground: { value: FOG.clone() },
    sunDir: { value: new THREE.Vector3(-0.45, 0.03, -1).normalize() },
  };
  const skyMat = track(
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 zenith, upper, horizon, glow, ground, sunDir;
        varying vec3 vDir;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(horizon, upper, smoothstep(0.0, 0.22, h));
          col = mix(col, zenith, smoothstep(0.2, 0.75, h));
          float s = max(dot(d, sunDir), 0.0);
          col += glow * pow(s, 10.0) * 0.55 * (1.0 - smoothstep(0.0, 0.35, h));
          col += glow * pow(s, 60.0) * 0.6;
          col = mix(col, ground, smoothstep(0.02, -0.04, h));
          col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  const skyGeo = track(new THREE.SphereGeometry(420, 48, 24));
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  /* exterior reflections: the same dusk sky plus a few warm storefront
     glows, so glass and metal pick up the street rather than a studio */
  const envScene = new THREE.Scene();
  const envSkyGeo = track(new THREE.SphereGeometry(40, 32, 16));
  envScene.add(new THREE.Mesh(envSkyGeo, skyMat));
  const envGlowMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.1, 1.3) }));
  const envGlowGeo = track(new THREE.PlaneGeometry(6, 2));
  [-18, 0, 18].forEach((x) => {
    const g = new THREE.Mesh(envGlowGeo, envGlowMat);
    g.position.set(x, 2, 30);
    g.lookAt(0, 2, 0);
    envScene.add(g);
  });
  const envExterior = pmrem.fromScene(envScene, 0.02, 0.1, 100).texture;
  const roomEnv = new RoomEnvironment();
  const envInterior = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose?.();
  track(envExterior);
  track(envInterior);
  scene.environment = envExterior;
  scene.environmentIntensity = 0.7;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 600);

  /* ============================================================
     Materials
     ============================================================ */
  const std = (p: THREE.MeshStandardMaterialParameters) => track(new THREE.MeshStandardMaterial(p));
  const eifs = std({ color: 0xd8d3c9, roughness: 0.93, bumpMap: grain(1.6), bumpScale: 0.9 });
  const eifsDark = std({ color: 0x232c27, roughness: 0.9, bumpMap: grain(1.6), bumpScale: 0.9 });
  const stone = std({ color: 0x5b574f, roughness: 0.85, bumpMap: grain(0.8), bumpScale: 2 });
  const reveal = std({ color: 0x16140f, roughness: 0.9 });
  const alu = std({ color: 0x252a27, metalness: 0.8, roughness: 0.32 });
  const asphalt = std({ color: 0xffffff, map: asphaltMap, roughness: 1, roughnessMap: asphaltRough });
  const sidewalk = std({ color: 0xffffff, map: sidewalkMap, roughness: 0.88, bumpMap: grain(2), bumpScale: 0.6 });
  const paintLine = std({ color: 0xcfcfc6, roughness: 0.75 });
  const floor = std({ color: 0xffffff, map: floorMap, roughness: 0.26, metalness: 0.0 });
  const paint = std({ color: 0xeeebe4, roughness: 0.9 });
  const level5 = std({ color: 0xf4f2ec, roughness: 0.62 });
  const boardEdge = std({ color: 0xe6e1d4, roughness: 0.95 });
  const steel = std({ color: 0xc4cdca, metalness: 0.85, roughness: 0.3 });
  const batt = std({ color: 0xffffff, map: battMap, roughness: 1, bumpMap: battMap, bumpScale: 3 });
  const wood = std({ color: 0xffffff, map: woodMap, roughness: 0.78 });
  const tile = std({ color: 0xffffff, map: tileMap, roughness: 0.96 });
  const tee = std({ color: 0xf2f1ec, roughness: 0.45, metalness: 0.15 });
  const deck = std({ color: 0x3b403d, metalness: 0.55, roughness: 0.55, bumpMap: deckBump, bumpScale: 4 });
  const counterBody = std({ color: 0x0a2716, roughness: 0.42 });
  const counterTop = std({ color: 0xe9e6df, roughness: 0.18 });
  const hedge = std({ color: 0x17321f, roughness: 1, bumpMap: grain(3), bumpScale: 6 });
  const feature = std({ color: 0xffffff, map: featureMap, roughness: 0.72 });
  const city = std({ color: 0x0b100e, roughness: 0.9, emissive: 0xffffff, emissiveMap: cityMap, emissiveIntensity: 0.9 });
  const brandLine = std({ color: 0x009933, emissive: 0x009933, emissiveIntensity: 1.6, roughness: 0.4 });
  const glowWarm = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 1.7) }));
  const glowTroffer = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.55, 2.4) }));
  const signMat = track(
    new THREE.MeshBasicMaterial({ map: signMap, transparent: true, color: new THREE.Color(1.55, 1.55, 1.55), depthWrite: false }),
  );

  /* Storefront glass. Plain alpha glass either looks like a hole or like
     a grey sheet; real glass reflects more at grazing angles. A tiny
     Fresnel term on the alpha gives it that — clear head-on, silvered
     when you look along the facade. */
  const glass = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x9fb8ae,
      metalness: 0,
      roughness: 0.03,
      transparent: true,
      opacity: 0.14,
      envMapIntensity: 1.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  glass.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <opaque_fragment>",
      `#include <opaque_fragment>
       {
         float fres = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 4.0);
         gl_FragColor.a = clamp(gl_FragColor.a + fres * 0.6, 0.0, 0.92);
       }`,
    );
  };

  /* ============================================================
     Geometry builders — boxes are built in WORLD space with box-
     projected UVs in metres, so every texture holds real scale.
     ============================================================ */
  const root = new THREE.Group();
  scene.add(root);

  function boxUV(g: THREE.BufferGeometry) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i));
      const ay = Math.abs(n.getY(i));
      const az = Math.abs(n.getZ(i));
      if (ax >= ay && ax >= az) uv.setXY(i, p.getZ(i), p.getY(i));
      else if (ay >= az) uv.setXY(i, p.getX(i), p.getZ(i));
      else uv.setXY(i, p.getX(i), p.getY(i));
    }
    uv.needsUpdate = true;
  }
  function box(
    x0: number, x1: number, y0: number, y1: number, z0: number, z1: number,
    mat: THREE.Material | THREE.Material[],
    opts: { cast?: boolean; receive?: boolean; worldUV?: boolean; parent?: THREE.Object3D } = {},
  ) {
    /* accept extents in either order (door leaves are built mirrored) */
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    if (z1 < z0) [z0, z1] = [z1, z0];
    const g = track(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (opts.worldUV !== false) boxUV(g);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = opts.cast ?? true;
    m.receiveShadow = opts.receive ?? true;
    (opts.parent ?? root).add(m);
    return m;
  }
  function halo(x: number, y: number, z: number, size: number, color: number, opacity = 0.8) {
    const mat = track(
      new THREE.SpriteMaterial({
        map: haloMap,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z);
    s.scale.set(size, size, 1);
    root.add(s);
    return s;
  }

  const FL = 0.15; // finished floor / sidewalk level
  const CEIL = 3.9; // ACT ceiling
  const ROOF = 6.2;

  /* ---------------- ground plane (asphalt lot + street) ---------------- */
  {
    const g = track(new THREE.PlaneGeometry(400, 400));
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, asphalt);
    m.receiveShadow = true;
    root.add(m);
  }
  /* sidewalk + curb */
  box(-40, 40, 0, FL, 0, 7, sidewalk, { cast: false });
  box(-40, 40, 0, FL + 0.01, 7, 7.18, stone, { cast: false });

  /* parking stalls, drive aisle, crosswalk bars */
  {
    const lineGeo = track(new THREE.BoxGeometry(0.1, 0.01, 5.2));
    const inst = new THREE.InstancedMesh(lineGeo, paintLine, 40);
    const d = new THREE.Object3D();
    let n = 0;
    for (let x = -24; x <= 24; x += 2.8) {
      if (Math.abs(x + 1) < 2.2) continue; // keep the entry walk clear
      d.position.set(x, 0.006, 11.4);
      d.updateMatrix();
      inst.setMatrixAt(n++, d.matrix);
    }
    for (let i = 0; i < 7; i++) {
      d.position.set(-3.2 + i * 0.7, 0.006, 11.4);
      d.scale.set(3.5, 1, 1);
      d.updateMatrix();
      inst.setMatrixAt(n++, d.matrix);
      d.scale.set(1, 1, 1);
    }
    inst.count = n;
    inst.receiveShadow = true;
    root.add(inst);
    box(-40, 40, 0, 0.011, 8.7, 8.8, paintLine, { cast: false });
  }

  /* ============================================================
     The building shell
     ============================================================ */
  /* roof, side walls, back wall */
  box(-13, 13, ROOF - 0.3, ROOF, -18, -0.3, deck);
  box(-13, -12.7, 0, 6.6, -18, -0.3, eifs);
  box(12.7, 13, 0, 6.6, -18, -0.3, eifs);
  box(-13, 13, 0, 6.6, -18, -17.7, eifs);
  /* floor slab */
  box(-12.7, 12.7, 0, FL, -17.7, -0.3, floor, { cast: false });
  box(-3.2, 1.2, 0, FL, -0.3, 0.9, floor, { cast: false });

  /* front band above the glazing, with a control-joint reveal */
  box(-13, 13, CEIL, 6.45, -0.3, 0, eifs);
  box(-13.12, 13.12, 6.45, 6.62, -0.42, 0.12, eifs); // cornice cap
  box(-13, 13, 5.18, 5.22, 0, 0.012, reveal, { cast: false });
  box(-13, 13, CEIL, CEIL + 0.14, 0.0, 0.05, eifs); // head flashing drip

  /* corner piers + stone water table */
  box(-13, -11.5, FL, CEIL, -0.3, 0, eifs);
  box(11, 13, FL, CEIL, -0.3, 0, eifs);
  box(-13.04, -11.46, 0, 0.62, -0.34, 0.04, stone);
  box(10.96, 13.04, 0, 0.62, -0.34, 0.04, stone);
  /* return walls wrap the corners in stone too */
  box(-13.04, -12.96, 0, 0.62, -18, -0.3, stone);
  box(12.96, 13.04, 0, 0.62, -18, -0.3, stone);

  /* entrance tower — darker EIFS so it reads as the event of the facade */
  box(-3.2, -2.4, 0, 8.4, -0.3, 0.9, eifsDark);
  box(0.4, 1.2, 0, 8.4, -0.3, 0.9, eifsDark);
  box(-3.2, 1.2, 3.3, 8.4, -0.3, 0.9, eifsDark);
  box(-3.3, 1.3, 8.4, 8.52, -0.4, 1.0, alu); // coping

  /* tenant sign */
  {
    const g = track(new THREE.PlaneGeometry(3.0, 3.0));
    const m = new THREE.Mesh(g, signMat);
    m.position.set(-1, 6.05, 0.905);
    root.add(m);
  }

  /* canopy with the logo-green fascia line and downlights */
  box(-4.3, 2.3, 3.3, 3.52, 0.9, 3.2, alu);
  box(-4.3, 2.3, 3.33, 3.41, 3.2, 3.215, brandLine, { cast: false });
  {
    const dg = track(new THREE.CircleGeometry(0.09, 20));
    dg.rotateX(Math.PI / 2);
    [-2.8, -1, 0.8].forEach((x) => {
      const m = new THREE.Mesh(dg, glowWarm);
      m.position.set(x, 3.295, 2.1);
      root.add(m);
    });
  }

  /* ---------------- storefront glazing + mullions ---------------- */
  const glazingZones: [number, number][] = [
    [-11.5, -3.2],
    [1.2, 11],
  ];
  {
    const mullGeo = track(new THREE.BoxGeometry(0.07, CEIL - FL, 0.16));
    const mull = new THREE.InstancedMesh(mullGeo, alu, 32);
    const d = new THREE.Object3D();
    let n = 0;
    glazingZones.forEach(([a, b]) => {
      const bays = Math.round((b - a) / 1.55);
      for (let i = 0; i <= bays; i++) {
        d.position.set(a + ((b - a) * i) / bays, (FL + CEIL) / 2, -0.15);
        d.updateMatrix();
        mull.setMatrixAt(n++, d.matrix);
      }
      /* sill, transom, head */
      box(a, b, FL, FL + 0.12, -0.24, -0.06, alu);
      box(a, b, 3.02, 3.09, -0.23, -0.07, alu);
      box(a, b, CEIL - 0.08, CEIL, -0.24, -0.06, alu);
      const gg = track(new THREE.PlaneGeometry(b - a, CEIL - FL));
      const gm = new THREE.Mesh(gg, glass);
      gm.position.set((a + b) / 2, (FL + CEIL) / 2, -0.15);
      gm.renderOrder = 2;
      root.add(gm);
    });
    mull.count = n;
    mull.castShadow = true;
    root.add(mull);
  }

  /* ---------------- entrance doors (open as you arrive) ---------------- */
  const doors: THREE.Group[] = [];
  {
    const leafW = 1.4;
    const leafH = 3.0;
    const glassGeo = track(new THREE.PlaneGeometry(leafW - 0.16, leafH - 0.28));
    [
      { hinge: -2.4, dir: 1 },
      { hinge: 0.4, dir: -1 },
    ].forEach(({ hinge, dir }) => {
      const pivot = new THREE.Group();
      pivot.position.set(hinge, FL, 0.3);
      root.add(pivot);
      const cx = (dir * leafW) / 2;
      box(0, dir * 0.08, 0, leafH, -0.03, 0.03, alu, { parent: pivot });
      box(dir * (leafW - 0.08), dir * leafW, 0, leafH, -0.03, 0.03, alu, { parent: pivot });
      box(0, dir * leafW, 0, 0.2, -0.03, 0.03, alu, { parent: pivot });
      box(0, dir * leafW, leafH - 0.08, leafH, -0.03, 0.03, alu, { parent: pivot });
      box(dir * (leafW - 0.2), dir * (leafW - 0.16), 0.8, 2.2, 0.03, 0.08, steel, { parent: pivot }); // pull
      const gm = new THREE.Mesh(glassGeo, glass);
      gm.position.set(cx, leafH / 2 + 0.06, 0);
      gm.renderOrder = 2;
      pivot.add(gm);
      pivot.userData.dir = dir;
      doors.push(pivot);
    });
  }

  /* ---------------- site furniture ---------------- */
  const lamps: [number, number][] = [
    [-9.5, 6.2],
    [9.5, 6.2],
  ];
  lamps.forEach(([x, z]) => {
    box(x - 0.07, x + 0.07, FL, 6.2, z - 0.07, z + 0.07, alu);
    box(x - 0.05, x + 0.05, 6.1, 6.2, z - 1.2, z, alu);
    box(x - 0.18, x + 0.18, 6.02, 6.12, z - 1.5, z - 0.9, alu);
    const lens = box(x - 0.15, x + 0.15, 6.0, 6.021, z - 1.47, z - 0.93, glowWarm, { cast: false, receive: false });
    lens.castShadow = false;
    halo(x, 5.95, z - 1.2, 2.2, 0xffb070, 0.55);
  });
  /* bollards with warm light bands */
  [-10.5, -7.5, -4.8, 3.8, 6.6, 9.4].forEach((x) => {
    box(x - 0.08, x + 0.08, FL, FL + 0.95, 5.1, 5.26, alu);
    box(x - 0.085, x + 0.085, FL + 0.8, FL + 0.86, 5.095, 5.265, glowWarm, { cast: false });
    halo(x, FL + 0.83, 5.18, 0.9, 0xffa860, 0.35);
  });
  /* planters */
  [
    [-12.8, -10.8],
    [10.6, 12.8],
  ].forEach(([a, b]) => {
    box(a, b, FL, FL + 0.55, 1.4, 3.6, stone);
    box(a + 0.1, b - 0.1, FL + 0.55, FL + 1.05, 1.5, 3.5, hedge);
  });

  /* distant city silhouettes — sell the dusk skyline, fog does the rest */
  if (!lite) {
    for (let i = 0; i < 16; i++) {
      const ang = -Math.PI * 0.95 + (i / 15) * Math.PI * 0.9 + (rand() - 0.5) * 0.08;
      const r = 75 + rand() * 60;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r - 10;
      const w = 10 + rand() * 18;
      const h = 12 + rand() * 38;
      const m = box(x - w / 2, x + w / 2, 0, h, z - w / 2, z + w / 2, city, { cast: false, receive: false });
      const t = cityMap.clone();
      t.repeat.set(w / 14, h / 28);
      t.needsUpdate = true;
      track(t);
      const mat = track(city.clone());
      mat.emissiveMap = t;
      m.material = mat;
    }
  }

  /* ============================================================
     Interior
     ============================================================ */
  /* painted liners on the inside faces of the shell */
  box(-12.7, -12.68, FL, CEIL, -17.7, -0.3, paint);
  box(-12.7, 12.7, FL, CEIL, -17.7, -17.68, paint);
  box(12.68, 12.7, FL, CEIL, -17.7, -0.3, paint);
  /* inside faces of the front piers + tower */
  box(-12.7, -11.5, FL, CEIL, -0.32, -0.3, paint);
  box(11, 12.7, FL, CEIL, -0.32, -0.3, paint);
  box(-3.2, 1.2, 3.3, CEIL, -0.32, -0.3, paint);
  box(-3.2, -2.4, FL, 3.3, -0.32, -0.3, paint);
  box(0.4, 1.2, FL, 3.3, -0.32, -0.3, paint);

  /* feature wall supergraphic on the right-hand wall */
  {
    const g = track(new THREE.PlaneGeometry(9, 3.78));
    const m = new THREE.Mesh(g, feature);
    m.rotation.y = -Math.PI / 2;
    m.position.set(12.665, FL + 3.78 / 2 - 0.03, -6.8);
    m.receiveShadow = true;
    root.add(m);
    /* a slim base + head trim so the graphic reads as built, not projected */
    box(12.6, 12.68, FL, FL + 0.1, -11.3, -2.3, counterBody);
  }

  /* service counter with pendants */
  box(-11.2, -6.6, FL, FL + 1.02, -6.3, -5.5, counterBody);
  box(-11.28, -6.52, FL + 1.02, FL + 1.07, -6.36, -5.38, counterTop);
  const pendantGeo = track(new THREE.CylinderGeometry(0.16, 0.2, 0.28, 24, 1, true));
  const cordGeo = track(new THREE.CylinderGeometry(0.004, 0.004, 1, 4));
  const pendantDisc = track(new THREE.CircleGeometry(0.17, 24));
  pendantDisc.rotateX(Math.PI / 2);
  [-10.1, -8.9, -7.7].forEach((x) => {
    const shade = new THREE.Mesh(pendantGeo, counterBody);
    shade.position.set(x, 2.55, -5.9);
    root.add(shade);
    const cord = new THREE.Mesh(cordGeo, alu);
    cord.scale.y = CEIL - 2.69;
    cord.position.set(x, (CEIL + 2.69) / 2, -5.9);
    root.add(cord);
    const disc = new THREE.Mesh(pendantDisc, glowWarm);
    disc.position.set(x, 2.415, -5.9);
    root.add(disc);
    halo(x, 2.38, -5.9, 0.9, 0xffb070, 0.45);
  });

  /* ---------------- the cut-away partition ----------------
     A finished wall with a section cut out of it, stepped so each
     layer of the assembly shows in build order, left to right:
       finished | studs + track + blocking | + insulation | + board | Level 5
     Studs at 16" o.c. (0.406m), 3-5/8" C-studs.                        */
  const WZ = -12; // wall centreline
  const SD = 0.092; // stud depth
  const FACE = WZ + SD / 2; // front face of the framing
  const STUD_X0 = -9;
  const STUD_X1 = 7;
  const OC = 0.406;
  const studXs: number[] = [];
  for (let x = STUD_X0; x <= STUD_X1 + 1e-6; x += OC) studXs.push(x);

  /* track top and bottom */
  box(STUD_X0 - 0.02, STUD_X1 + 0.02, FL, FL + 0.032, WZ - SD / 2, WZ + SD / 2, steel);
  box(STUD_X0 - 0.02, STUD_X1 + 0.02, CEIL - 0.032, CEIL, WZ - SD / 2, WZ + SD / 2, steel);

  {
    let studGeo: THREE.BufferGeometry;
    const h = CEIL - FL - 0.064;
    if (lite) {
      studGeo = track(new THREE.BoxGeometry(0.041, h, SD));
      studGeo.translate(0, h / 2, 0);
    } else {
      /* a real C-profile: 1-5/8" flange, 3-5/8" web, lipped */
      const f = 0.041;
      const t = 0.0028;
      const lip = 0.011;
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.lineTo(f, 0);
      s.lineTo(f, lip);
      s.lineTo(f - t, lip);
      s.lineTo(f - t, t);
      s.lineTo(t, t);
      s.lineTo(t, SD - t);
      s.lineTo(f - t, SD - t);
      s.lineTo(f - t, SD - lip);
      s.lineTo(f, SD - lip);
      s.lineTo(f, SD);
      s.lineTo(0, SD);
      s.closePath();
      studGeo = track(new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }));
      studGeo.rotateX(-Math.PI / 2); // extrusion now runs up +y, web along -z
      studGeo.translate(-f / 2, 0, SD / 2);
    }
    const studs = new THREE.InstancedMesh(studGeo, steel, studXs.length);
    const d = new THREE.Object3D();
    studXs.forEach((x, i) => {
      d.position.set(x, FL + 0.032, WZ);
      d.updateMatrix();
      studs.setMatrixAt(i, d.matrix);
    });
    studs.castShadow = true;
    studs.receiveShadow = true;
    root.add(studs);
  }

  /* rough carpentry: fire-treated blocking and a plywood backing panel */
  studXs.forEach((x, i) => {
    const nx = studXs[i + 1];
    if (nx === undefined || nx > -5.05) return;
    box(x + 0.022, nx - 0.022, FL + 0.98, FL + 1.12, WZ - 0.044, WZ + 0.044, wood);
    if (i >= 3 && i <= 5) box(x + 0.022, nx - 0.022, FL + 2.05, FL + 2.19, WZ - 0.044, WZ + 0.044, wood);
  });

  /* insulation batts (sections B + C) — these ride the exploded offset */
  const battGroup = new THREE.Group();
  root.add(battGroup);
  {
    const bh = CEIL - FL - 0.08;
    const bGeo = track(new THREE.BoxGeometry(OC - 0.046, bh, 0.084));
    const cav = studXs.filter((x, i) => x >= -5.05 && studXs[i + 1] !== undefined && studXs[i + 1] <= 3.05);
    const batts = new THREE.InstancedMesh(bGeo, batt, cav.length);
    const d = new THREE.Object3D();
    cav.forEach((x, i) => {
      d.position.set(x + OC / 2, FL + 0.04 + bh / 2, WZ);
      /* each batt lofts very slightly proud and uneven — real mineral wool
         is never a perfect block */
      d.scale.set(1, 1, 1 + rand() * 0.12);
      d.updateMatrix();
      batts.setMatrixAt(i, d.matrix);
    });
    batts.castShadow = true;
    batts.receiveShadow = true;
    battGroup.add(batts);
  }

  /* board: section C is hung and taped, section D is Level 5 finished.
     The taping texture is drawn from the real stud positions, so every
     row of screw spots lands on a stud. */
  const boardC = new THREE.Group();
  const boardD = new THREE.Group();
  root.add(boardC, boardD);
  const BT = 0.016; // 5/8" board
  {
    const x0 = -1;
    const x1 = 3;
    const H = CEIL - FL;
    const [bc, bx] = canvas2d(1024, 960);
    const W = bc.width;
    const Hh = bc.height;
    noiseFill(bx, W, Hh, [214, 211, 201], 8);
    const toU = (x: number) => ((x - x0) / (x1 - x0)) * W;
    /* joints at 4' sheets, feathered mud */
    for (let j = x0 + 1.22; j < x1; j += 1.22) {
      const u = toU(j);
      const gr = bx.createLinearGradient(u - 34, 0, u + 34, 0);
      gr.addColorStop(0, "rgba(238,236,229,0)");
      gr.addColorStop(0.5, "rgba(240,238,232,0.95)");
      gr.addColorStop(1, "rgba(238,236,229,0)");
      bx.fillStyle = gr;
      bx.fillRect(u - 34, 0, 68, Hh);
    }
    /* screw spots on every stud, 12" o.c. */
    bx.fillStyle = "rgba(244,242,236,0.95)";
    studXs.forEach((sx) => {
      if (sx < x0 || sx > x1) return;
      const u = toU(sx);
      for (let y = 0.15; y < H; y += 0.305) {
        bx.beginPath();
        bx.ellipse(u, Hh - (y / H) * Hh, 6, 4, 0, 0, Math.PI * 2);
        bx.fill();
      }
    });
    const faceTex = tex(bc);
    const face = std({ color: 0xffffff, map: faceTex, roughness: 0.93 });
    const mats = [boardEdge, boardEdge, boardEdge, boardEdge, face, boardEdge];
    box(x0, x1, FL, CEIL, FACE, FACE + BT, mats, { worldUV: false, parent: boardC });
    /* Level 5: same sheet, skim-coated to a single flat plane */
    box(x1, STUD_X1 + 0.03, FL, CEIL, FACE, FACE + BT + 0.002, level5, { parent: boardD });
  }
  /* the uncut finished wall to the left, and the back face of the whole
     partition, so nothing reads through the cavity */
  box(-12.7, STUD_X0 - 0.02, FL, CEIL, WZ - SD / 2 - BT, FACE + BT + 0.002, level5);
  box(STUD_X0 - 0.02, STUD_X1 + 0.03, FL, CEIL, WZ - SD / 2 - BT, WZ - SD / 2, paint);
  /* a clean cut edge where the section begins, like a drawing's break line */
  box(STUD_X0 - 0.024, STUD_X0 - 0.018, FL, CEIL, FACE, FACE + BT + 0.004, brandLine, { cast: false });

  /* ---------------- ACT ceiling: grid, tiles, troffers ---------------- */
  const GX0 = -12.6;
  const GZ0 = -17.4;
  const COLS = 42;
  const ROWS = 14;
  const TW = 0.6;
  const TL = 1.2;
  const isTroffer = (c: number, r: number) => c % 4 === 1 && r % 3 === 1;
  const inBay = (c: number, r: number) => c >= 25 && c <= 32 && r >= 7 && r <= 10;

  const tileGeo = track(new THREE.BoxGeometry(TW - 0.006, 0.016, TL - 0.006));
  const staticCells: [number, number][] = [];
  const bayCells: [number, number][] = [];
  const trofCells: [number, number][] = [];
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++) {
      if (isTroffer(c, r)) trofCells.push([c, r]);
      else if (inBay(c, r)) bayCells.push([c, r]);
      else staticCells.push([c, r]);
    }
  const cellX = (c: number) => GX0 + c * TW + TW / 2;
  const cellZ = (r: number) => GZ0 + r * TL + TL / 2;
  {
    const inst = new THREE.InstancedMesh(tileGeo, tile, staticCells.length);
    const d = new THREE.Object3D();
    staticCells.forEach(([c, r], i) => {
      d.position.set(cellX(c), CEIL + 0.008, cellZ(r));
      d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
    });
    inst.receiveShadow = true;
    root.add(inst);
  }
  /* the tiles that get laid in during the ceiling station */
  const bayTiles = new THREE.InstancedMesh(tileGeo, tile, bayCells.length);
  bayTiles.frustumCulled = false;
  root.add(bayTiles);
  /* install order: a diagonal wave from the corner nearest the camera */
  const bayOrder = bayCells
    .map(([c, r], i) => ({ i, c, r, k: (32 - c) * 0.6 + (10 - r) * 1.0 }))
    .sort((a, b) => a.k - b.k);

  {
    const trGeo = track(new THREE.BoxGeometry(TW - 0.03, 0.02, TL - 0.03));
    const tr = new THREE.InstancedMesh(trGeo, glowTroffer, trofCells.length);
    const d = new THREE.Object3D();
    trofCells.forEach(([c, r], i) => {
      d.position.set(cellX(c), CEIL + 0.004, cellZ(r));
      d.updateMatrix();
      tr.setMatrixAt(i, d.matrix);
    });
    root.add(tr);
  }
  /* tees: mains every 4', cross tees every 2' */
  {
    const mainGeo = track(new THREE.BoxGeometry(COLS * TW, 0.036, 0.024));
    const crossGeo = track(new THREE.BoxGeometry(0.024, 0.036, ROWS * TL));
    const mains = new THREE.InstancedMesh(mainGeo, tee, ROWS + 1);
    const cross = new THREE.InstancedMesh(crossGeo, tee, COLS + 1);
    const d = new THREE.Object3D();
    for (let r = 0; r <= ROWS; r++) {
      d.position.set(0, CEIL + 0.014, GZ0 + r * TL);
      d.updateMatrix();
      mains.setMatrixAt(r, d.matrix);
    }
    for (let c = 0; c <= COLS; c++) {
      d.position.set(GX0 + c * TW, CEIL + 0.014, GZ0 + (ROWS * TL) / 2);
      d.updateMatrix();
      cross.setMatrixAt(c, d.matrix);
    }
    root.add(mains, cross);
  }
  /* perimeter border strips (tile stock) + wall angle */
  box(-12.7, 12.7, CEIL, CEIL + 0.016, -0.6, -0.3, tile, { cast: false });
  box(-12.7, 12.7, CEIL, CEIL + 0.016, -17.7, -17.4, tile, { cast: false });
  box(-12.7, -12.6, CEIL, CEIL + 0.016, -17.4, -0.6, tile, { cast: false });
  box(12.6, 12.7, CEIL, CEIL + 0.016, -17.4, -0.6, tile, { cast: false });

  /* plenum above the open bay: duct and hanger wires */
  {
    const duct = track(new THREE.CylinderGeometry(0.32, 0.32, 12, 32, 1, true));
    duct.rotateZ(Math.PI / 2);
    const m = new THREE.Mesh(duct, steel);
    m.position.set(4, 4.85, -7.2);
    root.add(m);
    const pts: number[] = [];
    for (let c = 25; c <= 33; c += 2)
      for (let r = 7; r <= 11; r += 1) pts.push(GX0 + c * TW, CEIL + 0.03, GZ0 + r * TL, GX0 + c * TW, ROOF - 0.3, GZ0 + r * TL);
    const lg = track(new THREE.BufferGeometry());
    lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const lm = track(new THREE.LineBasicMaterial({ color: 0x9aa39f, transparent: true, opacity: 0.6 }));
    root.add(new THREE.LineSegments(lg, lm));
  }

  /* ============================================================
     Lighting
     ============================================================ */
  const hemi = new THREE.HemisphereLight(0x8fa7b3, 0x17140f, 0.45);
  scene.add(hemi);

  /* cool dusk key: a low sky light, the only exterior shadow caster */
  const moon = new THREE.DirectionalLight(0xb4c6d8, 0.55);
  moon.position.set(-24, 30, 28);
  moon.target.position.set(0, 0, 0);
  moon.castShadow = true;
  moon.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  moon.shadow.camera.left = -26;
  moon.shadow.camera.right = 26;
  moon.shadow.camera.top = 26;
  moon.shadow.camera.bottom = -26;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 110;
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.03;
  moon.shadow.radius = 4;
  scene.add(moon, moon.target);

  /* Light budget (spec §3.2): the street lamps are NOT lights. Their
     lenses and halos are emissive already; the pool they throw on the
     asphalt is an additive radial decal — same read, zero shader cost. */
  const poolTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, "rgba(255,184,120,0.55)");
    r.addColorStop(0.45, "rgba(255,170,100,0.18)");
    r.addColorStop(1, "rgba(255,170,100,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return track(t);
  })();
  const poolMat = track(
    new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  const poolGeo = track(new THREE.PlaneGeometry(10, 10));
  poolGeo.rotateX(-Math.PI / 2);
  lamps.forEach(([x, z]) => {
    const m = new THREE.Mesh(poolGeo, poolMat);
    m.position.set(x, 0.025, z - 1.2);
    m.renderOrder = 1;
    scene.add(m);
  });
  const canopySpot = new THREE.SpotLight(0xffd2a0, 60, 14, 1.05, 0.9, 2);
  canopySpot.position.set(-1, 3.25, 2.0);
  canopySpot.target.position.set(-1, 0, 3.0);
  if (!lite) scene.add(canopySpot, canopySpot.target);

  /* interior: an even troffer field plus pooled accents */
  const interiorPts: V3[] = lite
    ? [[0, 3.6, -7]]
    : [
        [-6, 3.6, -5],
        [2, 3.6, -6.5],
        [8, 3.6, -9],
      ];
  interiorPts.forEach(([x, y, z]) => {
    /* fewer, stronger troffer lights: same total energy as the prototype's 6 */
    const l = new THREE.PointLight(0xfff0dc, lite ? 26 * 3 : 15 * 2, 22, 2);
    l.position.set(x, y, z);
    scene.add(l);
  });
  /* raking light across the cut-away — the studs throw shadows onto
     the batts and the back board, which is what sells the depth */
  const wallSpot = new THREE.SpotLight(0xfff3e4, 70, 16, 0.95, 0.85, 2);
  wallSpot.position.set(-4.5, 3.75, -8.6);
  wallSpot.target.position.set(-1.5, 1.2, -12);
  wallSpot.castShadow = !lite;
  wallSpot.shadow.mapSize.set(1024, 1024);
  wallSpot.shadow.bias = -0.0006;
  wallSpot.shadow.normalBias = 0.02;
  wallSpot.shadow.radius = 3;
  scene.add(wallSpot, wallSpot.target);

  const featureSpot = new THREE.SpotLight(0xfff0dc, 55, 12, 0.9, 0.8, 2);
  featureSpot.position.set(9.8, 3.8, -6.8);
  featureSpot.target.position.set(12.7, 1.6, -6.8);
  if (!lite) scene.add(featureSpot, featureSpot.target);


  /* ============================================================
     Camera path
     ============================================================ */
  const posCurve = new THREE.CatmullRomCurve3(
    KEYS.map((k) => new THREE.Vector3(...k[1])),
    false,
    "centripetal",
  );
  const lookCurve = new THREE.CatmullRomCurve3(
    KEYS.map((k) => new THREE.Vector3(...k[2])),
    false,
    "centripetal",
  );
  const N = KEYS.length - 1;
  function curveU(p: number) {
    let i = 0;
    while (i < N - 1 && p >= KEYS[i + 1][0]) i++;
    const a = KEYS[i][0];
    const b = KEYS[i + 1][0];
    const t = clamp((p - a) / (b - a), 0, 1);
    /* half-eased: keeps momentum through a station, but lets each one
       settle a little so the copy has a steady frame to sit on */
    const e = t * t * (3 - 2 * t);
    return (i + (t * 0.45 + e * 0.55)) / N;
  }

  const eye = new THREE.Vector3();
  const look = new THREE.Vector3();
  const d3 = new THREE.Object3D();
  const tmp = new THREE.Vector3();

  /* ============================================================
     State as a pure function of progress
     ============================================================ */
  function apply(p: number) {
    const u = curveU(p);
    posCurve.getPoint(u, eye);
    lookCurve.getPoint(u, look);
    camera.position.copy(eye);
    camera.lookAt(look);

    /* doors swing in as the camera lines up on them */
    const open = ss(0.23, 0.33, p) * (Math.PI * 0.5);
    doors.forEach((g) => (g.rotation.y = g.userData.dir * open));

    /* exploded view closes up as the camera trucks along the wall */
    const ex = 1 - ss(0.46, 0.62, p);
    battGroup.position.z = ex * 0.22;
    boardC.position.z = ex * 0.46;
    boardD.position.z = ex * 0.7;

    /* ceiling tiles are tilted up through the grid and dropped in */
    bayOrder.forEach((b, n) => {
      const start = 0.64 + (n / bayOrder.length) * 0.085;
      const t = ss(start, start + 0.03, p);
      const [c, r] = [b.c, b.r];
      if (t <= 0.0001) {
        d3.scale.setScalar(0.0001);
        d3.position.set(cellX(c), CEIL + 1.2, cellZ(r));
        d3.rotation.set(0, 0, 0);
      } else {
        const k = 1 - t;
        d3.scale.setScalar(Math.min(1, t * 4));
        d3.position.set(cellX(c), CEIL + 0.008 + k * 0.55, cellZ(r) + k * 0.2);
        d3.rotation.set(k * 1.1, 0, 0);
      }
      d3.updateMatrix();
      bayTiles.setMatrixAt(b.i, d3.matrix);
    });
    bayTiles.instanceMatrix.needsUpdate = true;

    /* outside → inside: swap reflections, thin the haze */
    const inside = ss(0.8, -1.2, eye.z);
    scene.environment = inside > 0.5 ? envInterior : envExterior;
    scene.environmentIntensity = inside > 0.5 ? 0.42 : 0.75;
    fog.density = 0.011 * (1 - inside) + 0.004 * inside;
    renderer.toneMappingExposure = 1.12 + inside * 0.08;
  }

  /* ============================================================
     Sizing
     ============================================================ */
  function resize() {
    /* size from the canvas's own box, not the host: in the static
       (reduced-motion) layout the host grows to hold every stage while
       the canvas stays one viewport tall */
    const w = Math.max(1, o.canvas.clientWidth || o.host.clientWidth);
    const h = Math.max(1, o.canvas.clientHeight || o.host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* hold a ~68deg horizontal field so portrait phones still see the
       building rather than a sliver of it */
    const hf = (68 * Math.PI) / 180;
    const vf = (2 * Math.atan(Math.tan(hf / 2) / camera.aspect) * 180) / Math.PI;
    camera.fov = clamp(vf, 40, 74);
    camera.updateProjectionMatrix();
  }

  /* ============================================================
     Hotspot projection
     ============================================================ */
  const anchorVecs = Object.fromEntries(Object.entries(ANCHORS).map(([k, v]) => [k, new THREE.Vector3(...v)]));
  const hot: Record<string, HotspotScreen> = {};
  function project() {
    const w = o.host.clientWidth;
    const h = o.host.clientHeight;
    for (const k in anchorVecs) {
      tmp.copy(anchorVecs[k]);
      if (k === "drywall") tmp.z += boardC.position.z;
      if (k === "insulation") tmp.z += battGroup.position.z;
      tmp.project(camera);
      hot[k] = {
        x: (tmp.x * 0.5 + 0.5) * w,
        y: (-tmp.y * 0.5 + 0.5) * h,
        visible: tmp.z < 1 && tmp.z > -1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1,
      };
    }
    return hot;
  }

  /* ============================================================
     Loop — damped toward the scroll target, idle when settled
     ============================================================ */
  let cur = o.still ?? o.getTarget();
  let raf = 0;
  let last = performance.now();
  let alive = true;
  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;
  const fine = window.matchMedia("(pointer: fine)").matches;

  /* idle "breathing": a slow sway of the view after the visitor stops,
     at most 30 fps and for 20 s, so a settled frame is never dead but an
     abandoned tab costs nothing */
  let lastInput = performance.now();
  let skip = false;
  const breathe = (now: number) => {
    const b = (now / 1000) * ((Math.PI * 2) / 7);
    camera.rotateY(Math.sin(b) * 0.0035);
    camera.rotateX(Math.sin(b * 0.73) * 0.0022);
  };

  function render(now = performance.now()) {
    apply(cur);
    breathe(now);
    /* a whisper of pointer parallax — the room responds to you */
    if (fine) {
      camera.rotateY(-px * 0.03);
      camera.rotateX(-py * 0.02);
    }
    renderer.render(scene, camera);
    o.onFrame(cur, project());
  }

  function tick(now: number) {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const target = o.getTarget();
    const k = 1 - Math.exp(-dt * 3.2);
    cur += (target - cur) * k;
    px += (tx - px) * (1 - Math.exp(-dt * 4));
    py += (ty - py) * (1 - Math.exp(-dt * 4));
    const settled = Math.abs(target - cur) < 0.00004 && Math.abs(tx - px) < 0.001 && Math.abs(ty - py) < 0.001;
    if (settled) cur = target;
    if (settled) {
      const r = o.host.getBoundingClientRect();
      const onScreen = r.bottom > 0 && r.top < window.innerHeight;
      if (onScreen && !document.hidden && now - lastInput < 20000) {
        skip = !skip;
        if (!skip) render(now);
        raf = requestAnimationFrame(tick);
        return;
      }
    }
    render(now);
    if (!settled) raf = requestAnimationFrame(tick);
  }
  function kick() {
    lastInput = performance.now();
    if (!alive || o.still !== undefined || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  const onPointer = (e: PointerEvent) => {
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
    const r = o.host.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) kick();
  };
  if (fine && o.still === undefined) window.addEventListener("pointermove", onPointer, { passive: true });

  resize();
  /* compile everything up front so the first scroll never hitches */
  renderer.compile(scene, camera);
  render();

  return {
    kick,
    resize() {
      resize();
      render();
    },
    dispose() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((d) => d.dispose());
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
    stats() {
      let lights = 0;
      scene.traverse((ob) => {
        const l = ob as THREE.Light & { isHemisphereLight?: boolean; isAmbientLight?: boolean };
        if (l.isLight && !l.isHemisphereLight && !l.isAmbientLight) lights++;
      });
      return { lights, progress: cur };
    },
  };
}
