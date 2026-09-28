/* ============================================================
   X-ray wall — scene, choreography and projected callouts.

   Loaded ONLY by dynamic import from XrayWall.astro, and handed the
   three.js namespace that was itself dynamically imported, so neither
   this file nor three ever lands in the eager homepage bundle.

   World units are FEET. The section is a 12ft x 10ft exterior wall:
     interior  Level 5 skim / 5/8" board / 2x blocking /
               6" CFS studs @ 16" o.c. + track / mineral wool /
               sheathing / 2" EPS / EIFS base + finish   exterior
   plus a 2x4 suspended ACT grid on the room side.

   Scroll choreography (p = 0..1 through the pinned track):
     0.00  finished Level 5 face fills the viewport, h1 on the wall
     0.12  camera swings to 3/4; x-ray scan sweeps the board
     0.34  layers peel apart along the wall's thickness, callouts draw
     0.55  exploded hold, slow orbit
     0.72  reassembly, reverse order
     0.90  finished wall to the right, "Get in Touch" to the left
   ============================================================ */

import { XRAY_STAGES, XRAY_CHAPTERS } from "./xray-timeline";
import { stageOpacity } from "./stage-fade";
import {
  finishCanvas,
  boardCanvas,
  osbCanvas,
  woolCanvas,
  epsCanvas,
  laminaCanvas,
  woodCanvas,
  spangleCanvas,
  tileCanvas,
} from "./xray-textures";

type Three = typeof import("three");
type V3 = import("three").Vector3;
type Obj = import("three").Object3D;
type RoomEnvCtor = typeof import("three/examples/jsm/environments/RoomEnvironment.js").RoomEnvironment;

export interface XrayHandle {
  dispose(): void;
  stats(): { progress: number };
  /* loop mode: the component's clock calls this every frame it plays */
  kick(): void;
}

/* background-video mode: progress comes from a clock, not the scroll, and
   the camera keeps the wall clear of a headline that stays on screen */
export interface XrayLoop {
  getTarget: () => number;
  /* fraction of the width kept free on the left for the copy (wide screens) */
  copyLeft: number;
  /* fraction of the height kept free at the bottom for the copy (narrow) */
  copyBottom: number;
}

/* ---- geometry constants (feet) ---- */
const W = 12;
const H = 10;
const D = 0.5; // 6" stud
const T = 0.012; // steel gauge, exaggerated just enough to hold a shadow
const FL = 0.135; // 1-5/8" flange
const LIP = 0.045;
const TF = 0.104; // 1-1/4" track flange
const OC = 16 / 12;
const CEIL_Y = H - 1.2;
const Z_FACE = 0.314; // finished face

/* ---- helpers ---- */
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* per-layer explode stagger; item order = callout order */
const EXPLODE_START = 0.34;
const EXPLODE_SLOT = 0.014;
const EXPLODE_DUR = 0.1;
const JOIN_START = 0.72;
const JOIN_SLOT = 0.01;
const JOIN_DUR = 0.09;
const REDUCED_P = 0.6;

function explodeOf(p: number, i: number, n: number) {
  if (p < 0.62) {
    const a = EXPLODE_START + i * EXPLODE_SLOT;
    return ease(seg(p, a, a + EXPLODE_DUR));
  }
  const a = JOIN_START + (n - 1 - i) * JOIN_SLOT;
  return 1 - ease(seg(p, a, a + JOIN_DUR));
}

interface Box3Like {
  min: [number, number, number];
  max: [number, number, number];
}
interface CamKey {
  p: number;
  az: number;
  el: number;
  box: Box3Like;
  fit: "cover" | "contain";
  pad: number;
  reserve: { t: number; b: number; l: number; r: number };
}
interface Solved {
  p: number;
  az: number;
  el: number;
  d: number;
  tx: number;
  ty: number;
  tz: number;
  sx: number;
  sy: number;
}

export function createXray(
  THREE: Three,
  RoomEnvironment: RoomEnvCtor,
  root: HTMLElement,
  reduced: boolean,
  loop?: XrayLoop,
): XrayHandle | null {
  const q = <E extends Element>(s: string) => root.querySelector<E>(s);
  const stage = q<HTMLElement>("[data-xw-stage]")!;
  const track = q<HTMLElement>("[data-xw-track]")!;
  const canvas = q<HTMLCanvasElement>("[data-xw-canvas]")!;
  const svg = q<SVGSVGElement>("[data-xw-svg]")!;
  const intro = q<HTMLElement>("[data-xw-intro]");
  const outro = q<HTMLElement>("[data-xw-outro]");
  const hud = q<HTMLElement>("[data-xw-hud]");
  const chapterEl = q<HTMLElement>("[data-xw-chapter]");
  const progressEl = q<HTMLElement>("[data-xw-progress]");
  const legend = q<HTMLElement>("[data-xw-legend]");
  const dimEl = q<HTMLElement>("[data-xw-dim]");
  const scanEl = q<HTMLElement>("[data-xw-scan]");
  const calloutEls = [...root.querySelectorAll<HTMLElement>("[data-callout]")];
  const introLinks = intro ? [...intro.querySelectorAll<HTMLElement>("a, button")] : [];
  const legendEls = [...root.querySelectorAll<HTMLElement>("[data-legend]")];

  /* ---------------- renderer ---------------- */
  let renderer: import("three").WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    if (!renderer.getContext()) return null;
  } catch {
    return null;
  }

  /* anything that throws while the scene is built must not leak the
     context: dispose, lose it, and let the component fall back */
  try {
    return buildXray();
  } catch (err) {
    console.warn("[xray] 3D build failed, using the static layout", err);
    renderer.dispose();
    renderer.forceContextLoss();
    return null;
  }

  function buildXray(): XrayHandle {

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const dprCap = () => (coarse || window.innerWidth < 900 ? 1.5 : 2);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap()));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const BG = 0x061a0e;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 38, 95);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envRT = pmrem.fromScene(roomEnv, 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;
  (roomEnv as any).dispose?.();
  roomEnv.traverse((o: any) => {
    o.geometry?.dispose?.();
    o.material?.dispose?.();
  });

  const camera = new THREE.PerspectiveCamera(30, 1, 0.3, 260);

  /* ---------------- lights ---------------- */
  scene.add(new THREE.HemisphereLight(0xdfeee4, 0x051a0c, 0.45));

  const key = new THREE.DirectionalLight(0xfff4e6, 2.3);
  key.position.set(-9, 19, 15);
  key.target.position.set(0, 4, -3);
  key.castShadow = true;
  const sm = coarse ? 1024 : 2048;
  key.shadow.mapSize.set(sm, sm);
  const sc = key.shadow.camera;
  sc.left = -20;
  sc.right = 20;
  sc.top = 20;
  sc.bottom = -14;
  sc.near = 1;
  sc.far = 70;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 5;
  scene.add(key, key.target);

  /* cool rim from behind-right so layer edges separate from the ground */
  const rim = new THREE.DirectionalLight(0xcfe9d8, 0.9);
  rim.position.set(14, 9, -16);
  scene.add(rim);

  /* A raking spot grazing the finished face. Without it a Level 5 wall
     is a dead flat rectangle — the whole point of Level 5 is how it
     holds up under exactly this kind of light. */
  const rake = new THREE.SpotLight(0xffffff, 520, 0, 0.62, 1, 2);
  rake.position.set(-17, 8.5, 3.2);
  rake.target.position.set(1, 4.5, 0);
  scene.add(rake, rake.target);

  /* ---------------- textures ---------------- */
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures: import("three").Texture[] = [];
  const tex = (c: HTMLCanvasElement, color = true, rx = 1, ry = 1) => {
    const t = new THREE.CanvasTexture(c);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    textures.push(t);
    return t;
  };
  const tFinish = tex(finishCanvas());
  const tBoard = [tex(boardCanvas(3)), tex(boardCanvas(4)), tex(boardCanvas(6))];
  const tOsb = [tex(osbCanvas(5)), tex(osbCanvas(8)), tex(osbCanvas(12))];
  const woolC = woolCanvas();
  const tWool = tex(woolC);
  const tWoolBump = tex(woolC, false);
  const tEps = tex(epsCanvas());
  const lamC = laminaCanvas();
  const tLam = tex(lamC);
  const tLamBump = tex(lamC, false);
  const tWood = tex(woodCanvas());
  const tSpangle = tex(spangleCanvas());
  const tTile = tex(tileCanvas());

  /* ---------------- materials ---------------- */
  const materials: import("three").Material[] = [];
  const M = <T extends import("three").Material>(m: T) => (materials.push(m), m);

  /* shared x-ray uniforms: a scan front that sweeps along world x */
  const uScan = { value: -99 };
  const uXray = { value: 0 };
  const xray = (mat: import("three").MeshPhysicalMaterial | import("three").MeshStandardMaterial, ghost: number) => {
    mat.transparent = true;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uScan = uScan;
      sh.uniforms.uXray = uXray;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vXw;")
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvXw = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uScan;\nuniform float uXray;\nvarying vec3 vXw;")
        .replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
          float xk = uXray * (1.0 - smoothstep(uScan - 0.22, uScan + 0.22, vXw.x));
          vec2 xf = abs(fract(vXw.xy) - 0.5);
          float xline = smoothstep(0.47, 0.495, max(xf.x, xf.y));
          vec3 xg = vec3(0.0, 0.60, 0.20);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, xg * (0.28 + 1.1 * xline), xk * 0.9);
          gl_FragColor.a *= mix(1.0, ${ghost.toFixed(3)} + 0.55 * xline, xk);
          float xb = uXray * exp(-abs(vXw.x - uScan) * 10.0);
          gl_FragColor.rgb += vec3(0.25, 1.0, 0.55) * xb * 0.85;
          gl_FragColor.a = max(gl_FragColor.a, xb * 0.9);`,
        );
    };
    mat.customProgramCacheKey = () => "xray" + ghost;
  };

  const mFinish = M(new THREE.MeshPhysicalMaterial({ map: tFinish, roughness: 0.62, sheen: 0.15, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xffffff) }));
  xray(mFinish, 0.04);
  const mBoard = tBoard.map((t) => {
    const m = M(new THREE.MeshStandardMaterial({ map: t, roughness: 0.86 }));
    xray(m, 0.07);
    return m;
  });
  const mSteel = M(new THREE.MeshStandardMaterial({ map: tSpangle, color: 0xe6ecea, metalness: 0.88, roughness: 0.34, envMapIntensity: 1.25 }));
  const mWool = M(new THREE.MeshStandardMaterial({ map: tWool, bumpMap: tWoolBump, bumpScale: 2.2, roughness: 1 }));
  const mWood = M(new THREE.MeshStandardMaterial({ map: tWood, roughness: 0.72 }));
  const mOsb = tOsb.map((t) => M(new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })));
  const mEps = M(new THREE.MeshStandardMaterial({ map: tEps, roughness: 0.92 }));
  const mLam = M(new THREE.MeshStandardMaterial({ map: tLam, bumpMap: tLamBump, bumpScale: 1.4, roughness: 0.95 }));
  const mTee = M(new THREE.MeshStandardMaterial({ color: 0xf3f3ee, metalness: 0.25, roughness: 0.32 }));
  const mTile = M(new THREE.MeshStandardMaterial({ map: tTile, roughness: 0.96 }));
  const mWire = M(new THREE.MeshStandardMaterial({ color: 0x9aa4a2, metalness: 0.9, roughness: 0.4 }));
  const mEdgeX = M(new THREE.LineBasicMaterial({ color: 0x33dd77, transparent: true, opacity: 0, depthWrite: false }));
  const mEdgeE = M(new THREE.LineBasicMaterial({ color: 0x9fe0b5, transparent: true, opacity: 0, depthWrite: false }));

  /* ---------------- geometry ---------------- */
  const geos: import("three").BufferGeometry[] = [];
  const G = <T extends import("three").BufferGeometry>(g: T) => (geos.push(g), g);
  const box = (w: number, h: number, d: number) => G(new THREE.BoxGeometry(w, h, d));

  const mesh = (g: import("three").BufferGeometry, m: import("three").Material, x = 0, y = 0, z = 0, cast = true) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = cast;
    o.receiveShadow = true;
    return o;
  };
  const edges = (g: import("three").BufferGeometry, m: import("three").LineBasicMaterial, at: Obj) => {
    const l = new THREE.LineSegments(G(new THREE.EdgesGeometry(g)), m);
    l.position.copy(at.position);
    l.renderOrder = 3;
    return l;
  };

  const world = new THREE.Group();
  scene.add(world);

  interface Layer {
    id: string;
    group: import("three").Group;
    rank: number;
    anchorLow: V3;
    anchorHigh: V3;
  }
  const layers: Layer[] = [];
  const addLayer = (id: string, rank: number, low: [number, number, number], high: [number, number, number]) => {
    const g = new THREE.Group();
    world.add(g);
    layers.push({ id, group: g, rank, anchorLow: new THREE.Vector3(...low), anchorHigh: new THREE.Vector3(...high) });
    return g;
  };

  /* 1 — Level 5 skim (one monolithic face) */
  const gFinish = addLayer("finish", 3, [5.4, 0.7, Z_FACE], [5.4, H - 0.7, Z_FACE]);
  const finishGeo = box(W, H, 0.012);
  const finishMesh = mesh(finishGeo, mFinish, 0, H / 2, 0.308);
  gFinish.add(finishMesh, edges(finishGeo, mEdgeX, finishMesh));

  /* 2 — 5/8" board, three 4x10 sheets standing on end */
  const gBoard = addLayer("board", 2, [5.4, 0.7, 0.302], [5.4, H - 0.7, 0.302]);
  const sheetGeo = box(4 - 0.012, H - 0.012, 0.052);
  const boardMeshes: import("three").Mesh[] = [];
  [-4, 0, 4].forEach((x, i) => {
    const s = mesh(sheetGeo, mBoard[i], x, H / 2, 0.276);
    boardMeshes.push(s);
    gBoard.add(s, edges(sheetGeo, mEdgeX, s));
  });

  /* 3 — 2x6 blocking, two rows, set flat behind the board */
  const gBlock = addLayer("blocking", 1, [5.3, 3.3, 0.24], [5.3, 7.3, 0.24]);
  const blockGeo = box(OC - 0.03, 0.458, 0.125);
  for (let i = 0; i < 9; i++) {
    const x = -W / 2 + OC * (i + 0.5);
    gBlock.add(mesh(blockGeo, mWood, x, 3.5, D / 2 - T - 0.0625));
    gBlock.add(mesh(blockGeo, mWood, x, 7.0, D / 2 - T - 0.0625));
  }

  /* 4 — CFS studs + track. The web is a real extrusion with punched
     knock-outs, so the x-ray reveals something recognisably steel. */
  const gFrame = addLayer("frame", 0, [5.6, 0.06, D / 2], [5.6, H - 0.06, D / 2]);
  const L = H - 2 * T;
  const webShape = new THREE.Shape();
  webShape.moveTo(-D / 2, 0);
  webShape.lineTo(D / 2, 0);
  webShape.lineTo(D / 2, L);
  webShape.lineTo(-D / 2, L);
  webShape.closePath();
  for (const y of [2.2, 5.0, 7.8]) {
    const hole = new THREE.Path();
    const rr = 0.0625, hh = 0.104;
    hole.absarc(0, y + hh, rr, 0, Math.PI, false);
    hole.absarc(0, y - hh, rr, Math.PI, Math.PI * 2, false);
    hole.closePath();
    webShape.holes.push(hole);
  }
  const webGeo = G(new THREE.ExtrudeGeometry(webShape, { depth: T, bevelEnabled: false, curveSegments: 10 }));
  webGeo.rotateY(-Math.PI / 2);
  webGeo.translate(T / 2, 0, 0);
  const flangeGeo = box(FL, L, T);
  flangeGeo.translate(FL / 2, L / 2, 0);
  const lipGeo = box(T, L, LIP);
  lipGeo.translate(0, L / 2, 0);
  const studCount = Math.round(W / OC) + 1; // 10
  for (let i = 0; i < studCount; i++) {
    const s = new THREE.Group();
    s.add(mesh(webGeo, mSteel));
    s.add(mesh(flangeGeo, mSteel, 0, 0, D / 2 - T / 2));
    s.add(mesh(flangeGeo, mSteel, 0, 0, -D / 2 + T / 2));
    s.add(mesh(lipGeo, mSteel, FL - T / 2, 0, D / 2 - T - LIP / 2));
    s.add(mesh(lipGeo, mSteel, FL - T / 2, 0, -D / 2 + T + LIP / 2));
    s.position.set(-W / 2 + i * OC, T, 0);
    if (i === studCount - 1) s.rotation.y = Math.PI; // end stud opens inward
    gFrame.add(s);
  }
  const trackWebGeo = box(W, T, D);
  const trackFlGeo = box(W, TF, T);
  gFrame.add(mesh(trackWebGeo, mSteel, 0, T / 2, 0));
  gFrame.add(mesh(trackFlGeo, mSteel, 0, TF / 2, D / 2 - T / 2));
  gFrame.add(mesh(trackFlGeo, mSteel, 0, TF / 2, -D / 2 + T / 2));
  gFrame.add(mesh(trackWebGeo, mSteel, 0, H - T / 2, 0));
  gFrame.add(mesh(trackFlGeo, mSteel, 0, H - TF / 2, D / 2 - T / 2));
  gFrame.add(mesh(trackFlGeo, mSteel, 0, H - TF / 2, -D / 2 + T / 2));

  /* 5 — mineral wool, one batt per cavity */
  const gInsul = addLayer("insulation", -1, [5.3, 1.0, 0.17], [5.3, H - 1.0, 0.17]);
  const battGeo = box(OC - 0.03, H - 2 * TF - 0.02, 0.4);
  for (let i = 0; i < 9; i++) gInsul.add(mesh(battGeo, mWool, -W / 2 + OC * (i + 0.5), H / 2, -0.03));

  /* 6 — sheathing */
  const gSheath = addLayer("sheathing", -2, [5.4, 0.7, -0.25], [5.4, H - 0.7, -0.25]);
  const osbGeo = box(4 - 0.02, H - 0.02, 0.036);
  [-4, 0, 4].forEach((x, i) => {
    const s = mesh(osbGeo, mOsb[i], x, H / 2, -0.268);
    gSheath.add(s, edges(osbGeo, mEdgeE, s));
  });

  /* 7 — EIFS insulation board */
  const gEps = addLayer("eps", -3, [5.4, 0.7, -0.286], [5.4, H - 0.7, -0.286]);
  const epsGeo = box(W, H, 0.167);
  const epsMesh = mesh(epsGeo, mEps, 0, H / 2, -0.3695);
  gEps.add(epsMesh, edges(epsGeo, mEdgeE, epsMesh));

  /* 8 — EIFS base coat + finish (the exterior face) */
  const gLam = addLayer("lamina", -4, [5.4, 0.7, -0.453], [5.4, H - 0.7, -0.453]);
  const lamGeo = box(W + 0.02, H, 0.02);
  const lamMesh = mesh(lamGeo, mLam, 0, H / 2, -0.463);
  gLam.add(lamMesh, edges(lamGeo, mEdgeE, lamMesh));

  /* 9 — suspended ACT grid, 2x4 layout, on the room side */
  const gCeil = addLayer("ceiling", 3, [5.0, 0.14, 3.4], [5.0, 0.14, 3.4]);
  const tiles = new THREE.Group();
  {
    const angleH = box(W, 0.01, 0.078);
    const angleV = box(W, 0.078, 0.01);
    gCeil.add(mesh(angleH, mTee, 0, 0.005, 0.039), mesh(angleV, mTee, 0, 0.039, 0.005));
    const mainFl = box(W, 0.012, 0.078);
    const mainWeb = box(W, 0.125, 0.02);
    const mainBulb = box(W, 0.035, 0.04);
    gCeil.add(mesh(mainFl, mTee, 0, 0.006, 4), mesh(mainWeb, mTee, 0, 0.0745, 4), mesh(mainBulb, mTee, 0, 0.15, 4));
    const crossFl = box(0.078, 0.012, 4);
    const crossWeb = box(0.02, 0.1, 4);
    for (let x = -6; x <= 6; x += 2) {
      gCeil.add(mesh(crossFl, mTee, x, 0.006, 2), mesh(crossWeb, mTee, x, 0.062, 2));
    }
    const wireGeo = G(new THREE.CylinderGeometry(0.008, 0.008, 3, 5));
    for (const x of [-4, 0, 4]) gCeil.add(mesh(wireGeo, mWire, x, 1.65, 4, false));
    const tileGeo = box(1.94, 0.052, 3.94);
    for (let x = -5; x <= 5; x += 2) tiles.add(mesh(tileGeo, mTile, x, 0.038, 2));
    gCeil.add(tiles);
  }

  /* ---------------- ground: shadow catcher + drawing grid ---------------- */
  const groundGeo = G(new THREE.PlaneGeometry(240, 240));
  const groundMat = M(new THREE.ShadowMaterial({ opacity: 0.42 }));
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const gridFine = new THREE.GridHelper(96, 96, 0x0f3d20, 0x0f3d20);
  const gridCoarse = new THREE.GridHelper(96, 24, 0x1c6b39, 0x1c6b39);
  for (const g of [gridFine, gridCoarse]) {
    const m = g.material as import("three").LineBasicMaterial;
    m.transparent = true;
    m.opacity = g === gridFine ? 0.45 : 0.55;
    m.depthWrite = false;
    g.position.y = 0.002;
    g.position.z = -4;
    materials.push(m);
    geos.push(g.geometry);
    scene.add(g);
  }

  /* ---------------- layout + camera keyframes ---------------- */
  let vw = 1, vh = 1, narrow = false, S = 2.8, stickyTop = 0;
  let keys: Solved[] = [];
  let reducedKey: Solved | null = null;
  const labelDims = new Map<HTMLElement, { w: number; h: number }>();

  const up = new THREE.Vector3(0, 1, 0);
  const vBack = new THREE.Vector3(), vFwd = new THREE.Vector3(), vRight = new THREE.Vector3(), vUp = new THREE.Vector3(), vc = new THREE.Vector3();

  function solve(k: CamKey): Solved {
    const fov = (camera.fov * Math.PI) / 180;
    const tv = Math.tan(fov / 2);
    const th = tv * (vw / vh);
    const aw = Math.max(0.2, (vw - k.reserve.l - k.reserve.r) / vw);
    const ah = Math.max(0.2, (vh - k.reserve.t - k.reserve.b) / vh);
    vBack.set(Math.sin(k.az) * Math.cos(k.el), Math.sin(k.el), Math.cos(k.az) * Math.cos(k.el));
    vFwd.copy(vBack).negate();
    vRight.crossVectors(vFwd, up).normalize();
    vUp.crossVectors(vRight, vFwd);
    const cx = (k.box.min[0] + k.box.max[0]) / 2;
    const cy = (k.box.min[1] + k.box.max[1]) / 2;
    const cz = (k.box.min[2] + k.box.max[2]) / 2;
    let dX = 0, dY = 0;
    for (let i = 0; i < 8; i++) {
      vc.set(
        (i & 1 ? k.box.max[0] : k.box.min[0]) - cx,
        (i & 2 ? k.box.max[1] : k.box.min[1]) - cy,
        (i & 4 ? k.box.max[2] : k.box.min[2]) - cz,
      );
      const cf = vc.dot(vFwd);
      dX = Math.max(dX, Math.abs(vc.dot(vRight)) / (th * aw) - cf);
      dY = Math.max(dY, Math.abs(vc.dot(vUp)) / (tv * ah) - cf);
    }
    const d = (k.fit === "cover" ? Math.min(dX, dY) : Math.max(dX, dY)) * k.pad;
    return {
      p: k.p,
      az: k.az,
      el: k.el,
      d,
      tx: cx,
      ty: cy,
      tz: cz,
      sx: (k.reserve.l - k.reserve.r) / 2 / vw,
      sy: (k.reserve.b - k.reserve.t) / 2 / vh,
    };
  }

  function layout() {
    const r = stage.getBoundingClientRect();
    vw = Math.max(1, Math.round(r.width));
    vh = Math.max(1, Math.round(r.height));
    narrow = vw < 1120;
    stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
    root.toggleAttribute("data-narrow", narrow);
    S = narrow ? 2.0 : 2.8;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap()));
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.fov = vw / vh < 0.8 ? 38 : 30;

    calloutEls.forEach((el) => labelDims.set(el, { w: el.offsetWidth, h: el.offsetHeight }));
    const legendH = narrow && legend ? legend.offsetHeight : 0;
    const outroInner = outro?.querySelector<HTMLElement>(".xw-outro-inner");
    const outroH = outroInner ? outroInner.offsetHeight + 64 : 0;
    const introInner = intro?.querySelector<HTMLElement>(".xw-intro-inner");
    const introBottom = introInner ? intro!.offsetTop + introInner.offsetTop + introInner.offsetHeight : 0;

    const wallBox: Box3Like = { min: [-W / 2, 0, -0.47], max: [W / 2, H, Z_FACE] };
    const faceBox: Box3Like = { min: [-W / 2, 0.2, 0.3], max: [W / 2, H - 0.2, Z_FACE] };
    const finalBox: Box3Like = { min: [-W / 2, 0, -0.47], max: [W / 2, H, Z_FACE + 4] };
    const exBox: Box3Like = {
      min: [-W / 2 - 0.2, 0, -0.47 - 4 * S],
      max: [W / 2 + 0.2, H + 3.4 + 1.6, Z_FACE + 3 * S + 4],
    };

    const R = (t: number, b: number, l = 0, rr = 0) => ({ t, b, l, r: rr });
    const exReserve = narrow ? R(20, legendH + 56) : R(150, 170);
    const endReserve = narrow ? R(24, outroH + 48) : R(40, 72, vw * 0.44, 24);
    const k: CamKey[] = [
      { p: 0.0, az: 0.1, el: 0.02, box: faceBox, fit: "cover", pad: 0.9, reserve: R(0, 0) },
      { p: 0.17, az: 0.62, el: 0.12, box: wallBox, fit: "contain", pad: 1.12, reserve: narrow ? R(20, 70) : R(40, 80) },
      { p: 0.3, az: 0.5, el: 0.06, box: wallBox, fit: "contain", pad: narrow ? 1.0 : 0.94, reserve: R(20, 60) },
      { p: 0.5, az: narrow ? 0.8 : 0.95, el: narrow ? 0.42 : 0.3, box: exBox, fit: "contain", pad: 1.0, reserve: exReserve },
      { p: 0.7, az: narrow ? 0.95 : 1.12, el: narrow ? 0.46 : 0.36, box: exBox, fit: "contain", pad: 1.0, reserve: exReserve },
      { p: 0.9, az: 0.44, el: 0.1, box: finalBox, fit: "contain", pad: 1.06, reserve: endReserve },
      { p: 1.0, az: 0.36, el: 0.09, box: finalBox, fit: "contain", pad: 1.06, reserve: endReserve },
    ];
    if (loop) {
      /* the headline never leaves: frame every key clear of it */
      for (const key of k) {
        if (narrow) key.reserve.b = Math.max(key.reserve.b, vh * loop.copyBottom);
        else key.reserve.l = Math.max(key.reserve.l, vw * loop.copyLeft);
      }
    }
    keys = k.map(solve);

    if (reduced) {
      const top = Math.max(20, introBottom + 12);
      reducedKey = solve({
        p: REDUCED_P,
        az: narrow ? 0.8 : 0.95,
        el: narrow ? 0.42 : 0.3,
        box: exBox,
        fit: "contain",
        pad: 1.0,
        reserve: narrow ? R(top, legendH + 40) : R(top + 60, 160),
      });
    }
  }

  function camAt(p: number, out: Solved) {
    if (reduced && reducedKey) return Object.assign(out, reducedKey);
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1].p) i++;
    const a = keys[i], b = keys[i + 1];
    const t = ease(seg(p, a.p, b.p));
    out.az = lerp(a.az, b.az, t);
    out.el = lerp(a.el, b.el, t);
    out.d = lerp(a.d, b.d, t);
    out.tx = lerp(a.tx, b.tx, t);
    out.ty = lerp(a.ty, b.ty, t);
    out.tz = lerp(a.tz, b.tz, t);
    out.sx = lerp(a.sx, b.sx, t);
    out.sy = lerp(a.sy, b.sy, t);
    return out;
  }

  /* ---------------- SVG leaders ---------------- */
  const NS = "http://www.w3.org/2000/svg";
  const leaders = calloutEls.map(() => {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("pathLength", "1");
    path.setAttribute("class", "xw-leader");
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("r", "3");
    dot.setAttribute("class", "xw-leader-dot");
    svg.append(path, dot);
    return { path, dot };
  });
  const dimPath = document.createElementNS(NS, "path");
  dimPath.setAttribute("class", "xw-dim-line");
  svg.append(dimPath);

  /* ---------------- per-frame state ---------------- */
  const cam: Solved = { p: 0, az: 0, el: 0, d: 10, tx: 0, ty: 0, tz: 0, sx: 0, sy: 0 };
  const tmp = new THREE.Vector3();
  const layerById = new Map(layers.map((l) => [l.id, l]));
  const CHAPTERS = XRAY_CHAPTERS;
  let lastChapter = -1;

  const project = (v: V3) => {
    tmp.copy(v).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * vw, y: (-tmp.y * 0.5 + 0.5) * vh, behind: tmp.z > 1 };
  };

  let pointerX = 0, pointerY = 0, px = 0, py = 0;

  function apply(p: number) {
    /* ---- explode ---- */
    const n = layers.length;
    const ex: number[] = layers.map((_, i) => (reduced ? 1 : explodeOf(p, i, n)));
    layers.forEach((l, i) => {
      if (l.id === "ceiling") return;
      l.group.position.z = l.rank * S * ex[i];
    });

    /* ---- ceiling: drops in from above, then settles at 8'-10" ---- */
    const ci = layers.findIndex((l) => l.id === "ceiling");
    const ce = ex[ci];
    const gc = layers[ci].group;
    gc.visible = reduced || p >= EXPLODE_START + 0.02;
    const exY = H + 3.4;
    if (!reduced && p < 0.62) {
      const drop = 1 - easeOut(seg(p, EXPLODE_START + 0.02, EXPLODE_START + 0.2));
      gc.position.set(0, exY + drop * 16, Z_FACE + 3 * S);
      tiles.position.y = 1.1;
    } else {
      gc.position.set(0, lerp(CEIL_Y, exY, ce), Z_FACE + 3 * S * ce);
      tiles.position.y = 1.1 * ce;
    }

    /* ---- x-ray ---- */
    const xv = reduced ? 0 : seg(p, 0.12, 0.16) * (1 - seg(p, 0.3, 0.35));
    uXray.value = xv;
    uScan.value = lerp(-W / 2 - 1.2, W / 2 + 1.2, ease(seg(p, 0.14, 0.27)));
    const ghosting = xv > 0.01;
    finishMesh.castShadow = !ghosting;
    boardMeshes.forEach((b) => (b.castShadow = !ghosting));
    mEdgeX.opacity = xv * 0.85 + (reduced ? 0.25 : ex[1] * 0.25);
    mEdgeE.opacity = reduced ? 0.22 : Math.max(ex[5], ex[6], ex[7]) * 0.22;

    /* ---- camera ---- */
    camAt(p, cam);
    const az = cam.az + px * 0.05;
    const el = cam.el + py * 0.03;
    camera.position.set(
      cam.tx + Math.sin(az) * Math.cos(el) * cam.d,
      cam.ty + Math.sin(el) * cam.d,
      cam.tz + Math.cos(az) * Math.cos(el) * cam.d,
    );
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    const fog = scene.fog as import("three").Fog;
    fog.near = cam.d + 8;
    fog.far = cam.d + 75;
    camera.setViewOffset(vw, vh, -cam.sx * vw, cam.sy * vh, vw, vh);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    world.updateMatrixWorld(true);

    /* ---- overlays ---- */
    /* copy windows: xray-timeline.ts + the shared fade rule (tested: never
       both at once). The intro holds the page h1, so it only fades — its
       links step out of the tab order, the heading stays findable. */
    /* loop mode: the headline is the static layer over a background loop */
    const introO = reduced || loop ? 1 : stageOpacity(p, XRAY_STAGES.intro);
    if (intro && !reduced && !loop) {
      intro.style.opacity = introO.toFixed(3);
      intro.style.transform = `translate3d(0, ${(-(1 - introO) * 40).toFixed(1)}px, 0)`;
      introLinks.forEach((a) => (a.inert = introO < 0.5));
    }
    const outroO = reduced || loop ? 0 : stageOpacity(p, XRAY_STAGES.outro);
    if (outro) {
      outro.style.opacity = outroO.toFixed(3);
      outro.style.transform = `translate3d(0, ${((1 - outroO) * 28).toFixed(1)}px, 0)`;
      outro.style.visibility = outroO < 0.01 ? "hidden" : "visible";
      outro.inert = outroO < 0.5;
    }
    if (hud) hud.style.opacity = reduced ? "1" : (seg(p, 0.08, 0.14) * (1 - seg(p, 0.9, 0.96))).toFixed(3);
    if (legend) legend.style.opacity = reduced ? "1" : (seg(p, 0.36, 0.44) * (1 - seg(p, 0.74, 0.8))).toFixed(3);
    if (progressEl) progressEl.style.transform = `scaleX(${p.toFixed(4)})`;
    let ch = 0;
    CHAPTERS.forEach(([s], i) => (p >= s ? (ch = i) : 0));
    if (reduced) ch = 2;
    if (ch !== lastChapter && chapterEl) {
      lastChapter = ch;
      chapterEl.textContent = CHAPTERS[ch][1];
    }

    /* x-ray dimension: 16" o.c. between two studs, on the board face */
    if (dimEl) {
      const dv = reduced ? 0 : xv * seg(uScan.value, 1.2, 3.4);
      if (dv > 0.01) {
        const a = project(tmp.set(-W / 2 + OC * 6, 8.2, Z_FACE + 0.02).clone());
        const b = project(tmp.set(-W / 2 + OC * 7, 8.2, Z_FACE + 0.02).clone());
        dimPath.setAttribute(
          "d",
          `M${a.x},${a.y - 7}L${a.x},${a.y + 7}M${a.x},${a.y}L${b.x},${b.y}M${b.x},${b.y - 7}L${b.x},${b.y + 7}`,
        );
        dimPath.style.opacity = dv.toFixed(3);
        dimEl.style.opacity = dv.toFixed(3);
        dimEl.style.transform = `translate3d(${((a.x + b.x) / 2).toFixed(1)}px, ${((a.y + b.y) / 2 - 12).toFixed(1)}px, 0) translate(-50%, -100%)`;
      } else {
        dimPath.style.opacity = "0";
        dimEl.style.opacity = "0";
      }
    }
    if (scanEl) {
      const sv = reduced ? 0 : xv * (1 - seg(p, 0.265, 0.29));
      if (sv > 0.01) {
        const s = project(tmp.set(uScan.value, H + 0.25, Z_FACE));
        scanEl.style.opacity = sv.toFixed(3);
        scanEl.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      } else scanEl.style.opacity = "0";
    }

    placeCallouts(ex);
  }

  /* ---------------- callout layout ----------------
     Desktop: engineering callouts in two rows (above and below the
     stack) with vertical leaders and a knee where a label had to be
     nudged aside. Narrow: numbered balloons on the model + a legend. */
  function placeCallouts(ex: number[]) {
    type Item = { el: HTMLElement; i: number; vis: number; ax: number; ay: number; side: "t" | "b"; x: number; w: number; h: number };
    const items: Item[] = [];
    calloutEls.forEach((el, i) => {
      const layer = layerById.get(el.dataset.callout || "");
      if (!layer) return;
      const li = layers.indexOf(layer);
      const vis = reduced ? 1 : clamp01((ex[li] - 0.55) / 0.4);
      const dim = labelDims.get(el) || { w: 200, h: 80 };
      items.push({ el, i, vis, ax: 0, ay: 0, side: "b", x: 0, w: dim.w, h: dim.h });
    });

    /* project the low anchors first to decide sides by screen order */
    items.forEach((it) => {
      const layer = layerById.get(it.el.dataset.callout!)!;
      const s = project(layer.group.localToWorld(tmp.copy(layer.anchorLow)));
      it.ax = s.x;
      it.ay = s.y;
    });
    /* sides alternate in assembly order (which is also screen order in
       every 3/4 view), so a label never hops rows mid-scroll */
    const ordered = items.filter((it) => it.el.dataset.callout !== "ceiling");
    ordered.forEach((it, k) => (it.side = k % 2 ? "t" : "b"));
    items.forEach((it) => {
      if (it.el.dataset.callout === "ceiling") it.side = "t";
      if (it.side === "t") {
        const layer = layerById.get(it.el.dataset.callout!)!;
        const s = project(layer.group.localToWorld(tmp.copy(layer.anchorHigh)));
        it.ax = s.x;
        it.ay = s.y;
      }
    });

    if (narrow) {
      items.forEach((it) => {
        const dx = 16, dy = it.side === "t" ? -22 : 22;
        const bx = it.ax + dx, by = it.ay + dy;
        it.el.style.opacity = it.vis.toFixed(3);
        it.el.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0) translate(-50%, -50%)`;
        const ld = leaders[it.i];
        ld.path.setAttribute("d", `M${it.ax.toFixed(1)},${it.ay.toFixed(1)}L${bx.toFixed(1)},${by.toFixed(1)}`);
        ld.path.style.strokeDashoffset = (1 - it.vis).toFixed(3);
        ld.path.style.opacity = it.vis > 0 ? "1" : "0";
        ld.dot.setAttribute("cx", it.ax.toFixed(1));
        ld.dot.setAttribute("cy", it.ay.toFixed(1));
        ld.dot.style.opacity = it.vis.toFixed(3);
      });
      legendEls.forEach((li) => {
        const it = items.find((x) => x.el.dataset.callout === li.dataset.legend);
        li.style.opacity = (reduced ? 1 : 0.25 + 0.75 * (it?.vis ?? 0)).toFixed(3);
      });
      return;
    }

    const margin = 16, gap = 12, hudH = 56;
    for (const side of ["t", "b"] as const) {
      const row = items.filter((it) => it.side === side).sort((a, b) => a.ax - b.ax);
      if (!row.length) continue;
      const hMax = Math.max(...row.map((r) => r.h));
      let rowY: number;
      if (side === "t") {
        const top = Math.min(...row.map((r) => r.ay));
        rowY = Math.max(margin, top - 44 - hMax);
      } else {
        const bot = Math.max(...row.map((r) => r.ay));
        rowY = Math.min(vh - hudH - hMax, bot + 44);
      }
      row.forEach((it) => (it.x = it.ax - 11));
      for (let k = 1; k < row.length; k++) row[k].x = Math.max(row[k].x, row[k - 1].x + row[k - 1].w + gap);
      const last = row[row.length - 1];
      last.x = Math.min(last.x, vw - margin - last.w);
      for (let k = row.length - 2; k >= 0; k--) row[k].x = Math.min(row[k].x, row[k + 1].x - row[k].w - gap);
      row[0].x = Math.max(row[0].x, margin);

      row.forEach((it) => {
        const lift = (1 - it.vis) * (side === "t" ? -10 : 10);
        it.el.style.opacity = it.vis.toFixed(3);
        it.el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${(rowY + lift).toFixed(1)}px, 0)`;
        it.el.dataset.side = side;
        const lx = it.x + 11;
        const edgeY = side === "t" ? rowY + hMax + 4 : rowY - 4;
        const kneeY = side === "t" ? edgeY + 16 : edgeY - 16;
        const ld = leaders[it.i];
        ld.path.setAttribute(
          "d",
          `M${it.ax.toFixed(1)},${it.ay.toFixed(1)}L${it.ax.toFixed(1)},${kneeY.toFixed(1)}L${lx.toFixed(1)},${kneeY.toFixed(1)}L${lx.toFixed(1)},${edgeY.toFixed(1)}`,
        );
        ld.path.style.strokeDashoffset = (1 - it.vis).toFixed(3);
        ld.path.style.opacity = it.vis > 0 ? "1" : "0";
        ld.dot.setAttribute("cx", it.ax.toFixed(1));
        ld.dot.setAttribute("cy", it.ay.toFixed(1));
        ld.dot.style.opacity = it.vis.toFixed(3);
      });
    }
  }

  /* ---------------- loop: render only while something moves ---------------- */
  /* the stage is sticky at the header's height, so it pins when the
     track's top reaches that line — progress runs from there */
  const progress = () => {
    const r = track.getBoundingClientRect();
    const travel = r.height - vh;
    if (travel <= 1) return 0;
    return clamp01((stickyTop - r.top) / travel);
  };

  let target = reduced ? REDUCED_P : loop ? loop.getTarget() : progress();
  let cur = target;
  let raf = 0;
  let last = performance.now();
  let alive = true;
  let dirty = true;

  const frame = (now: number) => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (loop && !reduced) target = loop.getTarget();
    const k = 1 - Math.exp(-dt * 7.5);
    cur += (target - cur) * k;
    px += (pointerX - px) * (1 - Math.exp(-dt * 4));
    py += (pointerY - py) * (1 - Math.exp(-dt * 4));
    const moving = Math.abs(target - cur) > 0.00004 || Math.abs(pointerX - px) > 0.0005 || Math.abs(pointerY - py) > 0.0005;
    if (!moving) cur = target;
    if (moving || dirty) {
      dirty = false;
      apply(cur);
      renderer.render(scene, camera);
    }
    if (moving) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (alive && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const onScroll = () => {
    if (reduced || loop) return;
    target = progress();
    kick();
  };
  const onPointer = (e: PointerEvent) => {
    if (reduced || coarse || e.pointerType !== "mouse") return;
    /* never wake the renderer for a wall that is scrolled away */
    const sr = stage.getBoundingClientRect();
    if (sr.bottom <= 0 || sr.top >= window.innerHeight) return;
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    kick();
  };
  const ro = new ResizeObserver(() => {
    layout();
    target = reduced ? REDUCED_P : progress();
    dirty = true;
    kick();
  });

  layout();
  apply(cur);
  renderer.render(scene, camera);
  ro.observe(stage);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });

  return {
    dispose() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      leaders.forEach((l) => (l.path.remove(), l.dot.remove()));
      dimPath.remove();
      geos.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
    stats: () => ({ progress: cur }),
    kick,
  };
}
}
