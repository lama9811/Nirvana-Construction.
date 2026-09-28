/* ============================================================
   plan-extrude-scene — the /contact/ hero: "from the drawings".

   A floor plan (src/data/plan-walls.ts, drawn for the site) is printed
   as a blueprint sheet and its walls grow up out of their own printed
   lines while the camera tilts from plan view to a 3/4 view. To scale:
   on this sheet 10 ft ≈ 140 px ≈ 1.35 units.

   Dynamic import only (PlanExtrude.astro); three comes in the same way.
   ============================================================ */

import { PLAN_WALLS, PLAN_PX, wallRise } from "../../data/plan-walls";

export interface PlanOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  lite: boolean;
  getTarget: () => number;
  onFrame: (p: number) => void;
  still?: number;
}

export interface PlanHandle {
  kick(): void;
  resize(): void;
  dispose(): void;
  stats(): { progress: number; walls: number };
}

const U = 1 / 100; // 100 drawing px = 1 unit
const WALL_H = 1.35;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function createPlan(o: PlanOptions): Promise<PlanHandle | null> {
  const THREE = await import("three");
  const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
  let renderer: import("three").WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: !o.lite, powerPreference: "high-performance" });
    if (!renderer.getContext()) return null;
  } catch {
    return null;
  }
  try {
    return build(THREE, RoomEnvironment, o, renderer);
  } catch (err) {
    console.warn("[plan] 3D build failed, using the static layout", err);
    renderer.dispose();
    renderer.forceContextLoss();
    return null;
  }
}

function build(
  THREE: typeof import("three"),
  RoomEnvironment: typeof import("three/examples/jsm/environments/RoomEnvironment.js").RoomEnvironment,
  o: PlanOptions,
  renderer: import("three").WebGLRenderer,
): PlanHandle {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !o.lite;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.lite ? 1.5 : 1.75));

  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  const scene = new THREE.Scene();
  const deep = new THREE.Color(0x051a0c);
  scene.background = deep;
  scene.fog = new THREE.Fog(deep, 14, 34);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.45;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);

  const W = PLAN_PX.w * U;
  const Hh = PLAN_PX.h * U;
  const plan = new THREE.Group();
  scene.add(plan);

  /* ---------------- the sheet, printed as a blueprint ---------------- */
  const c = document.createElement("canvas");
  c.width = PLAN_PX.w * 2;
  c.height = PLAN_PX.h * 2;
  const g = c.getContext("2d")!;
  g.scale(2, 2);
  g.fillStyle = "#0d2616";
  g.fillRect(0, 0, PLAN_PX.w, PLAN_PX.h);
  /* drafting grid: fine every 20 px, heavier every 100 */
  for (let x = 0; x <= PLAN_PX.w; x += 20) {
    g.strokeStyle = x % 100 ? "rgba(205, 240, 215, 0.06)" : "rgba(205, 240, 215, 0.14)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, PLAN_PX.h);
    g.stroke();
  }
  for (let y = 0; y <= PLAN_PX.h; y += 20) {
    g.strokeStyle = y % 100 ? "rgba(205, 240, 215, 0.06)" : "rgba(205, 240, 215, 0.14)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(PLAN_PX.w, y);
    g.stroke();
  }
  /* the walls as printed lines, a door swing at each opening */
  g.strokeStyle = "#cdf0d7";
  g.lineCap = "square";
  for (const [x1, y1, x2, y2, t] of PLAN_WALLS) {
    g.lineWidth = t;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  /* dimension string along the top and the west side */
  g.strokeStyle = "rgba(205, 240, 215, 0.6)";
  g.fillStyle = "rgba(205, 240, 215, 0.75)";
  g.lineWidth = 1;
  g.font = "11px JetBrains Mono, ui-monospace, monospace";
  g.textAlign = "center";
  g.beginPath();
  g.moveTo(60, 36);
  g.lineTo(1140, 36);
  g.stroke();
  for (const [x, label] of [[60, ""], [340, "20'-0\""], [900, "40'-0\""], [1140, "17'-2\""]] as [number, string][]) {
    g.beginPath();
    g.moveTo(x, 30);
    g.lineTo(x, 42);
    g.stroke();
    if (label) g.fillText(label, x - 8, 28);
  }
  g.save();
  g.translate(34, 260);
  g.rotate(-Math.PI / 2);
  g.fillText("28'-7\"", 0, 0);
  g.restore();
  /* title block */
  g.textAlign = "left";
  g.font = "600 13px Space Grotesk, system-ui, sans-serif";
  g.fillStyle = "rgba(205, 240, 215, 0.9)";
  g.fillText("FLOOR PLAN", 640, 500);
  g.font = "10px JetBrains Mono, ui-monospace, monospace";
  g.fillStyle = "rgba(205, 240, 215, 0.6)";
  g.fillText("SCALE 1/8\" = 1'-0\"   ·   NOT FOR CONSTRUCTION", 760, 500);
  const planTex = track(new THREE.CanvasTexture(c));
  planTex.colorSpace = THREE.SRGBColorSpace;
  planTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const floor = new THREE.Mesh(
    track(new THREE.PlaneGeometry(W, Hh)),
    track(new THREE.MeshStandardMaterial({ map: planTex, roughness: 0.9, metalness: 0, emissive: 0xffffff, emissiveMap: planTex, emissiveIntensity: 0.35 })),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  plan.add(floor);
  /* a slab edge under the sheet */
  const slab = new THREE.Mesh(track(new THREE.BoxGeometry(W + 0.3, 0.12, Hh + 0.3)), track(new THREE.MeshStandardMaterial({ color: 0x0a1f12, roughness: 0.95 })));
  slab.position.y = -0.065;
  plan.add(slab);

  /* ---------------- walls, grown out of the printed lines ---------------- */
  const wallGeo = track(new THREE.BoxGeometry(1, 1, 1));
  wallGeo.translate(0, 0.5, 0);
  const wallMat = track(new THREE.MeshStandardMaterial({ color: 0xe9ece8, roughness: 0.82, metalness: 0 }));
  const walls = new THREE.InstancedMesh(wallGeo, wallMat, PLAN_WALLS.length);
  walls.castShadow = !o.lite;
  walls.receiveShadow = !o.lite;
  plan.add(walls);
  /* orange cap along each wall top: the "just framed" line */
  const capGeo = track(new THREE.BoxGeometry(1, 0.012, 1));
  const capMat = track(new THREE.MeshBasicMaterial({ color: 0xff6600 }));
  const caps = new THREE.InstancedMesh(capGeo, capMat, PLAN_WALLS.length);
  plan.add(caps);

  const toX = (x: number) => x * U - W / 2;
  const toZ = (y: number) => y * U - Hh / 2;
  const segs = PLAN_WALLS.map(([x1, y1, x2, y2, t]) => {
    const ax = toX(x1), az = toZ(y1), bx = toX(x2), bz = toZ(y2);
    return {
      cx: (ax + bx) / 2,
      cz: (az + bz) / 2,
      len: Math.hypot(bx - ax, bz - az) + Math.max(0.06, t * U),
      thick: Math.max(0.06, t * U),
      rot: -Math.atan2(bz - az, bx - ax),
    };
  });
  const dummy = new THREE.Object3D();

  /* ---------------- light ---------------- */
  scene.add(new THREE.HemisphereLight(0xdcefe3, 0x051a0c, 0.7));
  const sun = new THREE.DirectionalLight(0xfff3e2, 2.2);
  sun.position.set(-5, 9, 6);
  sun.castShadow = !o.lite;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 5;
  sun.shadow.camera.bottom = -5;
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 3;
  scene.add(sun);

  /* ---------------- camera: plan view → 3/4 view ---------------- */
  let portrait = false;
  const eyeA = new THREE.Vector3();
  const eyeB = new THREE.Vector3();
  const lookA = new THREE.Vector3(0, 0, 0);
  const lookB = new THREE.Vector3();
  function frame() {
    /* portrait phones: turn the sheet so its long side runs down the screen */
    plan.rotation.y = portrait ? Math.PI / 2 : 0;
    const fovV = THREE.MathUtils.degToRad(camera.fov);
    /* landscape: the copy owns the left, so the sheet is framed into the
       right ~70% of the screen (a view offset, below); portrait: the sheet
       is turned and fills the height */
    const usable = portrait ? 1 : 0.6;
    const need = portrait ? W / (2 * Math.tan(fovV / 2)) : W / (2 * Math.tan(fovV / 2) * camera.aspect * usable);
    const h = need * 1.06;
    eyeA.set(0, h, 0.001);
    /* the 3/4 view stands well back so the whole floor reads in 3D */
    eyeB.set(portrait ? -4.2 : -7.2, h * 0.62, portrait ? 8.4 : 9.8);
    lookB.set(portrait ? 0 : 0.9, 0.2, portrait ? 0.4 : 0.3);
  }

  function apply(p: number) {
    const n = PLAN_WALLS.length;
    segs.forEach((s, i) => {
      const r = wallRise(p, i, n);
      const on = r > 0.001 ? 1 : 0;
      dummy.position.set(s.cx, 0, s.cz);
      dummy.rotation.set(0, s.rot, 0);
      dummy.scale.set(s.len * on, Math.max(0.0001, WALL_H * r), s.thick * on);
      dummy.updateMatrix();
      walls.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.cx, WALL_H * r + 0.006, s.cz);
      /* a fine orange line along the top, not a painted cap */
      dummy.scale.set(s.len * on, 1, s.thick * 0.35 * on * (r > 0.02 ? 1 : 0));
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    });
    walls.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    const t = ease(clamp01(p / 0.7));
    camera.position.lerpVectors(eyeA, eyeB, t);
    const look = lookA.clone().lerp(lookB, t);
    camera.lookAt(look);
  }

  function resize() {
    const w = Math.max(1, o.canvas.clientWidth || o.host.clientWidth);
    const h = Math.max(1, o.canvas.clientHeight || o.host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    portrait = camera.aspect < 0.9;
    camera.clearViewOffset();
    if (!portrait && w >= 900) camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
    camera.updateProjectionMatrix();
    frame();
  }

  let cur = o.still ?? o.getTarget();
  let raf = 0;
  let last = performance.now();
  let alive = true;
  function render() {
    apply(cur);
    renderer.render(scene, camera);
    o.onFrame(cur);
  }
  function tick(now: number) {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const target = o.getTarget();
    cur += (target - cur) * (1 - Math.exp(-dt * 3.4));
    const settled = Math.abs(target - cur) < 0.00004;
    if (settled) cur = target;
    render();
    if (!settled) raf = requestAnimationFrame(tick);
  }
  function kick() {
    if (!alive || o.still !== undefined || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  resize();
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
      walls.dispose();
      caps.dispose();
      disposables.forEach((d) => d.dispose());
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
    stats: () => ({ progress: cur, walls: PLAN_WALLS.length }),
  };
}
