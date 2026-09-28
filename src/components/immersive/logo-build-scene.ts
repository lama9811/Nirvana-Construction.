/* ============================================================
   logo-build-scene — the /about/ hero: the Nirvana mark built in
   3D the way the company builds a wall.

   The four bars of the logo (src/data/logo-mark.ts, measured from
   public/logo.png) go up as galvanised steel stud frames — track,
   studs on layout — and are then clad in logo green. The swoosh,
   which in the flat logo is an ellipse seen in perspective, becomes
   a real ring snapping round the base like a chalk line. The camera
   orbits out to the side and back round to the front.

   Loaded ONLY by dynamic import from LogoBuild.astro; three comes in
   the same way, so none of it reaches the eager bundle.
   ============================================================ */

import { LOGO_BARS, LOGO_FLAPS, LOGO_SWOOSH, type LogoBar } from "../../data/logo-mark";
import { LB_KEYS, barRise, swooshDraw } from "./logo-build-timeline";

export interface LogoBuildOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  lite: boolean;
  getTarget: () => number;
  onFrame: (p: number) => void;
  /* reduced motion: one composed frame at this progress, no loop */
  still?: number;
}

export interface LogoBuildHandle {
  kick(): void;
  resize(): void;
  dispose(): void;
  stats(): { progress: number };
}

const BASE_PX = 421; // the bars' common foot line in logo pixels
const CX_PX = 362; // horizontal centre of the four bars
const U = 1 / 100; // 100 logo px = 1 world unit
const DEPTH = 0.42; // bar thickness, front to back
const OC = 0.13; // stud spacing ("16 in o.c." at this scale)

const toX = (px: number) => (px - CX_PX) * U;
const toY = (px: number) => (BASE_PX - px) * U;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export async function createLogoBuild(o: LogoBuildOptions): Promise<LogoBuildHandle | null> {
  const THREE = await import("three");
  const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");

  let renderer: import("three").WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: !o.lite, powerPreference: "high-performance" });
    if (!renderer.getContext()) return null;
  } catch {
    return null;
  }
  /* anything that throws while the scene is built must not leak the
     context: dispose, lose it, and let the component fall back */
  try {
    return build(THREE, RoomEnvironment, o, renderer);
  } catch (err) {
    console.warn("[logo-build] 3D build failed, using the static layout", err);
    renderer.dispose();
    renderer.forceContextLoss();
    return null;
  }
}

function build(
  THREE: typeof import("three"),
  RoomEnvironment: typeof import("three/examples/jsm/environments/RoomEnvironment.js").RoomEnvironment,
  o: LogoBuildOptions,
  renderer: import("three").WebGLRenderer,
): LogoBuildHandle {
  const lite = o.lite;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 1.75));

  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  const scene = new THREE.Scene();
  const deep = new THREE.Color(0x051a0c);
  scene.background = deep;
  scene.fog = new THREE.Fog(deep, 11, 30);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);

  /* ---------------- slab ---------------- */
  const slabTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#3b403d";
    g.fillRect(0, 0, 512, 512);
    const img = g.getImageData(0, 0, 512, 512);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    /* saw-cut control joints */
    g.strokeStyle = "rgba(10,14,12,0.7)";
    g.lineWidth = 3;
    for (let k = 0; k <= 512; k += 128) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.stroke();
      g.beginPath(); g.moveTo(0, k); g.lineTo(512, k); g.stroke();
    }
    const t = track(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    return t;
  })();
  const slab = new THREE.Mesh(
    track(new THREE.BoxGeometry(18, 0.3, 18)),
    track(new THREE.MeshStandardMaterial({ map: slabTex, roughness: 0.92, metalness: 0 })),
  );
  slab.position.y = -0.15;
  slab.receiveShadow = true;
  scene.add(slab);

  /* orange chalk layout lines round the footprint — the first thing on site */
  const chalkMat = track(new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0 }));
  const chalk = new THREE.Group();
  const footprint = [...LOGO_BARS];
  const fx0 = toX(Math.min(...footprint.map((b) => b.x0))) - 0.35;
  const fx1 = toX(Math.max(...footprint.map((b) => b.x1))) + 0.35;
  const fz = DEPTH / 2 + 0.35;
  const chalkGeo = track(new THREE.PlaneGeometry(1, 0.03));
  chalkGeo.rotateX(-Math.PI / 2);
  const addChalk = (x: number, z: number, len: number, rotY: number) => {
    const m = new THREE.Mesh(chalkGeo, chalkMat);
    m.scale.x = len;
    m.position.set(x, 0.006, z);
    m.rotation.y = rotY;
    chalk.add(m);
  };
  addChalk((fx0 + fx1) / 2, fz, fx1 - fx0 + 1.2, 0);
  addChalk((fx0 + fx1) / 2, -fz, fx1 - fx0 + 1.2, 0);
  addChalk(fx0, 0, fz * 2 + 1.2, Math.PI / 2);
  addChalk(fx1, 0, fz * 2 + 1.2, Math.PI / 2);
  scene.add(chalk);

  /* ---------------- materials ---------------- */
  const steel = track(new THREE.MeshStandardMaterial({ color: 0xb9c7bf, metalness: 0.85, roughness: 0.36 }));
  const skinMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x009933,
      metalness: 0.25,
      roughness: 0.32,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      emissive: 0x00852c,
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0,
    }),
  );
  const swooshMat = track(
    new THREE.MeshStandardMaterial({ color: 0x00a63a, emissive: 0x00852c, emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.35 }),
  );

  /* ---------------- bars: stud frame, then green skin ---------------- */
  const studGeo = track(new THREE.BoxGeometry(0.035, 1, 0.09));
  studGeo.translate(0, 0.5, 0); // grow from the foot
  const trackGeo = track(new THREE.BoxGeometry(1, 0.03, 0.1));

  type BuiltBar = {
    studs: import("three").InstancedMesh;
    tops: number[]; // stud heights (world units)
    xs: number[];
    zs: number[];
    skin: import("three").Mesh;
    topTrack: import("three").Mesh;
    bar: LogoBar;
    parent: number; // index in LOGO_BARS it rises with
    flap: boolean; // flaps wait for their parent bar to reach them
  };
  const built: BuiltBar[] = [];
  const dummy = new THREE.Object3D();

  const makeBar = (bar: LogoBar, parent: number, footPx: number, flap = false) => {
    const x0 = toX(bar.x0);
    const x1 = toX(bar.x1);
    const foot = toY(footPx);
    const cols = Math.max(2, Math.round((x1 - x0) / OC) + 1);
    const xs: number[] = [];
    const zs: number[] = [];
    const tops: number[] = [];
    for (let c = 0; c < cols; c++) {
      const t = c / (cols - 1);
      const x = x0 + (x1 - x0) * t;
      const top = toY(bar.topL + (bar.topR - bar.topL) * t) - foot;
      for (const z of [-DEPTH / 2 + 0.05, DEPTH / 2 - 0.05]) {
        xs.push(x);
        zs.push(z);
        tops.push(top);
      }
    }
    const studs = new THREE.InstancedMesh(studGeo, steel, xs.length);
    studs.castShadow = !lite;
    studs.position.y = foot;
    scene.add(studs);

    /* green skin: the bar's own slanted outline, extruded */
    const shape = new THREE.Shape();
    shape.moveTo(x0, 0);
    shape.lineTo(x1, 0);
    shape.lineTo(x1, toY(bar.topR) - foot);
    shape.lineTo(x0, toY(bar.topL) - foot);
    shape.closePath();
    const skinGeo = track(new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: false }));
    skinGeo.translate(0, 0, -DEPTH / 2);
    /* each bar clads on its own schedule, so each gets its own material */
    const skin = new THREE.Mesh(skinGeo, track(skinMat.clone()));
    skin.position.y = foot;
    skin.castShadow = !lite;
    scene.add(skin);

    /* bottom track (always down once the bar starts) and top track (rides up) */
    const bottom = new THREE.Mesh(trackGeo, steel);
    bottom.scale.x = x1 - x0 + 0.04;
    bottom.position.set((x0 + x1) / 2, foot + 0.015, 0);
    bottom.scale.z = DEPTH / 0.1;
    bottom.visible = false;
    scene.add(bottom);
    const topTrack = new THREE.Mesh(trackGeo, steel);
    topTrack.scale.set(Math.hypot(x1 - x0, toY(bar.topR) - toY(bar.topL)) + 0.04, 1, DEPTH / 0.1);
    topTrack.rotation.z = Math.atan2(toY(bar.topR) - toY(bar.topL), x1 - x0);
    scene.add(topTrack);

    const b: BuiltBar = { studs, tops, xs, zs, skin, topTrack, bar, parent, flap };
    (b as BuiltBar & { bottom: typeof bottom; foot: number }).bottom = bottom;
    (b as BuiltBar & { foot: number }).foot = foot;
    built.push(b);
  };
  LOGO_BARS.forEach((b, i) => makeBar(b, i, BASE_PX));
  /* flaps step off bars 2 and 3 */
  makeBar(LOGO_FLAPS[0], 1, LOGO_FLAPS[0].bottom, true);
  makeBar(LOGO_FLAPS[1], 2, LOGO_FLAPS[1].bottom, true);

  /* ---------------- swoosh: rings round the base ---------------- */
  const swooshes = LOGO_SWOOSH.map((s, k) => {
    const pts: import("three").Vector3[] = [];
    const N = 96;
    const rx = s.rx * U * 1.05;
    const rz = 1.1 + k * 0.22;
    const yBase = 0.18 + k * 0.1;
    for (let i = 0; i <= N; i++) {
      /* the full ring runs round the back too; the flat logo only shows the
         front arc because the back is hidden behind the bars */
      const a = (i / N) * Math.PI * 2 + Math.PI * 0.55;
      pts.push(new THREE.Vector3(Math.cos(a) * rx - 0.1, yBase + Math.sin(a) * 0.12 * (k ? -1 : 1), Math.sin(a) * rz));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false);
    const geo = track(new THREE.TubeGeometry(curve, 240, s.width * U * 0.42, 10, false));
    const mesh = new THREE.Mesh(geo, swooshMat);
    mesh.rotation.x = s.tilt * 0.6;
    mesh.castShadow = !lite;
    scene.add(mesh);
    return { mesh, total: geo.index ? geo.index.count : 0 };
  });

  /* ---------------- light ---------------- */
  scene.add(new THREE.HemisphereLight(0xcfe3d6, 0x0b150f, 0.55));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
  key.position.set(-6, 9, 7);
  key.castShadow = !lite;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.0005;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5fe08f, 0.9);
  rim.position.set(6, 4, -6);
  scene.add(rim);
  const warm = new THREE.PointLight(0xffb070, 0.18 * 40, 12, 2);
  warm.position.set(3, 1.2, 4);
  scene.add(warm);

  /* ---------------- camera path ---------------- */
  const eyeCurve = new THREE.CatmullRomCurve3(LB_KEYS.map((k) => new THREE.Vector3(...k[1])), false, "centripetal");
  const lookCurve = new THREE.CatmullRomCurve3(LB_KEYS.map((k) => new THREE.Vector3(...k[2])), false, "centripetal");
  const keyT = (p: number) => {
    /* map progress onto the spline so each key's progress lands on its knot */
    const n = LB_KEYS.length - 1;
    let i = 0;
    while (i < n - 1 && p >= LB_KEYS[i + 1][0]) i++;
    const a = LB_KEYS[i][0];
    const b = LB_KEYS[i + 1][0];
    return (i + clamp01((p - a) / (b - a))) / n;
  };
  const eye = new THREE.Vector3();
  const look = new THREE.Vector3();

  /* ---------------- apply progress ---------------- */
  const n = LOGO_BARS.length;
  function apply(p: number) {
    chalkMat.opacity = clamp01(p / 0.08) * (1 - clamp01((p - 0.7) / 0.2)) * 0.85;
    for (const b of built) {
      const parentRise = barRise(p, b.parent, n);
      /* a flap sits high on its bar, so it only goes up once the bar
         beneath has reached it — nothing is ever built in mid-air */
      const rise = b.flap ? clamp01((parentRise - 0.72) / 0.28) : parentRise;
      const count = b.xs.length;
      for (let i = 0; i < count; i++) {
        /* studs go up left to right within the bar */
        const stagger = (i / count) * 0.25;
        const r = clamp01((rise - stagger) / (1 - stagger + 1e-6));
        dummy.position.set(b.xs[i], 0, b.zs[i]);
        /* an unraised stud is hidden outright, not left as a flat square */
        const on = r > 0.001 ? 1 : 0;
        dummy.scale.set(on, Math.max(0.0001, b.tops[i] * r), on);
        dummy.updateMatrix();
        b.studs.setMatrixAt(i, dummy.matrix);
      }
      b.studs.instanceMatrix.needsUpdate = true;
      const bb = b as BuiltBar & { bottom: import("three").Mesh; foot: number };
      bb.bottom.visible = rise > 0.001;
      const tl = toY(b.bar.topL) - bb.foot;
      const tr = toY(b.bar.topR) - bb.foot;
      b.topTrack.visible = rise > 0.02;
      b.topTrack.position.set((toX(b.bar.x0) + toX(b.bar.x1)) / 2, bb.foot + ((tl + tr) / 2) * rise, 0);
      /* cladding: once the frame is up, the green skin closes it in */
      const clad = clamp01((rise - 0.82) / 0.18);
      b.skin.visible = clad > 0.001;
      b.skin.scale.y = 0.96 + 0.04 * clad;
      (b.skin.material as import("three").MeshPhysicalMaterial).opacity = clad * 0.94;
    }

    const d = swooshDraw(p);
    swooshes.forEach((s, k) => {
      const dk = clamp01((d - k * 0.12) / (1 - k * 0.12));
      s.mesh.visible = dk > 0.001;
      s.mesh.geometry.setDrawRange(0, Math.floor(s.total * dk / 3) * 3);
    });

    const t = keyT(p);
    eyeCurve.getPoint(t, eye);
    lookCurve.getPoint(t, look);
    camera.position.copy(eye);
    camera.lookAt(look);
  }

  /* ---------------- sizing ---------------- */
  function resize() {
    const w = Math.max(1, o.canvas.clientWidth || o.host.clientWidth);
    const h = Math.max(1, o.canvas.clientHeight || o.host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* portrait phones: widen the lens so the whole mark stays in frame */
    camera.fov = camera.aspect < 0.8 ? 52 : 34;
    /* wide screens: the copy sits on the left, so shift the mark right */
    camera.clearViewOffset();
    if (w >= 900) camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
    camera.updateProjectionMatrix();
  }

  /* ---------------- loop: render only while moving ---------------- */
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
    cur += (target - cur) * (1 - Math.exp(-dt * 3.2));
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
      built.forEach((b) => b.studs.dispose());
      disposables.forEach((x) => x.dispose());
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
    stats: () => ({ progress: cur }),
  };
}
