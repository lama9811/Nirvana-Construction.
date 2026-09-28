/* ============================================================
   maryland-scene — the /about/ service-area map.

   The real Maryland outline (src/data/maryland-outline.ts) is
   extruded into a slab that tilts up from flat as the section scrolls
   in; a pin rises at every city in src/data/service-area.ts, nearest
   to headquarters first, and Nottingham HQ pulses orange. lift(i)
   raises one pin when its name is hovered or focused in the list.

   Dynamic import only (MarylandMap.astro); three comes in the same way.
   ============================================================ */

import { MD_OUTLINE } from "../../data/maryland-outline";
import { serviceArea, project } from "../../data/service-area";

export interface PinScreen {
  x: number;
  y: number;
  visible: boolean;
}

export interface MapOptions {
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  lite: boolean;
  /* 0 → 1 as the map scrolls through the viewport */
  getTarget: () => number;
  onPins: (pins: PinScreen[]) => void;
  /* reduced motion: one composed frame at this progress, no loop */
  still?: number;
}

export interface MapHandle {
  kick(): void;
  resize(): void;
  lift(i: number | null): void;
  dispose(): void;
  stats(): { progress: number; pins: number };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export async function createMap(o: MapOptions): Promise<MapHandle | null> {
  const THREE = await import("three");
  let renderer: import("three").WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    if (!renderer.getContext()) return null;
  } catch {
    return null;
  }
  try {
    return build(THREE, o, renderer);
  } catch (err) {
    console.warn("[maryland] 3D build failed, using the static layout", err);
    renderer.dispose();
    renderer.forceContextLoss();
    return null;
  }
}

function build(THREE: typeof import("three"), o: MapOptions, renderer: import("three").WebGLRenderer): MapHandle {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.lite ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  /* ---------------- the state ---------------- */
  const shape = new THREE.Shape();
  MD_OUTLINE.forEach(([lon, lat], i) => {
    const [x, z] = project(lon, lat);
    /* shape space is x/y; y = -z so the extrusion lies flat after rotation */
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  const landGeo = track(new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 }));
  landGeo.rotateX(-Math.PI / 2); // extrude along +y, land in the x/z plane
  const land = new THREE.Mesh(
    landGeo,
    track(new THREE.MeshStandardMaterial({ color: 0x0f4a24, roughness: 0.62, metalness: 0.1, emissive: 0x04210f, emissiveIntensity: 0.4 })),
  );
  const edges = new THREE.LineSegments(
    track(new THREE.EdgesGeometry(landGeo, 25)),
    track(new THREE.LineBasicMaterial({ color: 0x33cc66, transparent: true, opacity: 0.7 })),
  );
  const map = new THREE.Group();
  map.add(land, edges);
  scene.add(map);

  /* ---------------- pins ---------------- */
  const hqIndex = serviceArea.findIndex((c) => c.hq);
  const hqXZ = project(serviceArea[hqIndex].lon, serviceArea[hqIndex].lat);
  const needleGeo = track(new THREE.CylinderGeometry(0.016, 0.016, 1, 8));
  needleGeo.translate(0, 0.5, 0);
  const headGeo = track(new THREE.SphereGeometry(0.075, 20, 14));
  const greenMat = track(new THREE.MeshStandardMaterial({ color: 0x00b33c, emissive: 0x009933, emissiveIntensity: 0.9, roughness: 0.3 }));
  const orangeMat = track(new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 1.2, roughness: 0.3 }));
  const liftMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9ff5bd, emissiveIntensity: 1, roughness: 0.3 }));

  type Pin = { g: import("three").Group; head: import("three").Mesh; needle: import("three").Mesh; order: number; lift: number; hq: boolean };
  /* rise order: nearest to headquarters first */
  const byDist = serviceArea
    .map((c, i) => ({ i, d: Math.hypot(project(c.lon, c.lat)[0] - hqXZ[0], project(c.lon, c.lat)[1] - hqXZ[1]) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.i);
  const pins: Pin[] = serviceArea.map((c, i) => {
    const [x, z] = project(c.lon, c.lat);
    const g = new THREE.Group();
    g.position.set(x, 0.165, z);
    const mat = c.hq ? orangeMat : greenMat;
    const needle = new THREE.Mesh(needleGeo, mat);
    const head = new THREE.Mesh(headGeo, mat);
    g.add(needle, head);
    map.add(g);
    return { g, head, needle, order: byDist.indexOf(i), lift: 0, hq: !!c.hq };
  });

  /* HQ pulse ring */
  const ringMat = track(new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  const ring = new THREE.Mesh(track(new THREE.RingGeometry(0.08, 0.1, 40)), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(hqXZ[0], 0.17, hqXZ[1]);
  map.add(ring);

  /* ---------------- light ---------------- */
  scene.add(new THREE.HemisphereLight(0xdff5e6, 0x051a0c, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-3, 6, 4);
  scene.add(key);

  /* frame central Maryland, where the work is; the rest of the state
     recedes toward the edges */
  const focus = new THREE.Vector3();
  serviceArea.forEach((c) => {
    const [x, z] = project(c.lon, c.lat);
    focus.x += x / serviceArea.length;
    focus.z += z / serviceArea.length;
  });

  const tmp = new THREE.Vector3();
  let W = 1;
  let H = 1;
  let liftIdx: number | null = null;

  function apply(p: number, t: number) {
    /* tilt up from a plan view to a 3/4 view as the section arrives */
    const tilt = easeOut(clamp01(p / 0.45));
    const el = THREE.MathUtils.degToRad(86 - 38 * tilt);
    const az = THREE.MathUtils.degToRad(-18 + 10 * tilt + Math.sin(t * 0.25) * 2 * tilt);
    /* far enough back that the state and the Bay read as Maryland */
    const dist = 11.5 - 2.2 * tilt;
    camera.position.set(
      focus.x + Math.sin(az) * Math.cos(el) * dist,
      Math.sin(el) * dist,
      focus.z + Math.cos(az) * Math.cos(el) * dist,
    );
    camera.lookAt(focus.x, 0.1, focus.z);

    pins.forEach((pin, i) => {
      const start = 0.18 + pin.order * 0.03;
      const r = easeOut(clamp01((p - start) / 0.2));
      pin.lift += ((liftIdx === i ? 1 : 0) - pin.lift) * 0.2;
      const h = (pin.hq ? 0.85 : 0.6) * r + pin.lift * 0.25;
      pin.needle.scale.y = Math.max(0.0001, h);
      pin.head.position.y = h;
      pin.g.visible = r > 0.001;
      if (!pin.hq) pin.head.material = pin.lift > 0.5 ? liftMat : greenMat;
    });

    /* HQ pulse: an expanding ring every 2.2 s once the pins are up */
    const k = (t % 2.2) / 2.2;
    const on = clamp01((p - 0.35) / 0.2);
    ring.scale.setScalar(1 + k * 5);
    ringMat.opacity = (1 - k) * 0.7 * on;
  }

  function projectPins(): PinScreen[] {
    return pins.map((pin) => {
      tmp.set(0, pin.head.position.y + 0.09, 0);
      pin.g.localToWorld(tmp);
      tmp.project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H, visible: pin.g.visible && tmp.z < 1 };
    });
  }

  function resize() {
    W = Math.max(1, o.canvas.clientWidth || o.host.clientWidth);
    H = Math.max(1, o.canvas.clientHeight || o.host.clientHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  /* ---------------- loop ----------------
     Runs while the scroll target is moving or a pin is easing, and keeps
     the HQ pulse alive only while on screen and within 20 s of input. */
  let cur = o.still ?? o.getTarget();
  let raf = 0;
  let last = performance.now();
  let lastInput = performance.now();
  let alive = true;
  let visible = true;
  const t0 = performance.now();

  function render(now: number) {
    apply(cur, (now - t0) / 1000);
    renderer.render(scene, camera);
    o.onPins(projectPins());
  }
  function tick(now: number) {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const target = o.getTarget();
    cur += (target - cur) * (1 - Math.exp(-dt * 3.5));
    const settled = Math.abs(target - cur) < 0.0001 && pins.every((p, i) => Math.abs((liftIdx === i ? 1 : 0) - p.lift) < 0.01);
    if (settled) cur = target;
    render(now);
    const pulsing = visible && !document.hidden && now - lastInput < 20000 && cur > 0.35;
    if (!settled || pulsing) raf = requestAnimationFrame(tick);
  }
  function kick() {
    lastInput = performance.now();
    /* never wake the renderer for a map that is scrolled away */
    if (!alive || o.still !== undefined || raf || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver((e) => {
    visible = e.some((x) => x.isIntersecting);
    if (visible) kick();
  });
  io.observe(o.host);

  resize();
  renderer.compile(scene, camera);
  render(performance.now());

  return {
    kick,
    resize() {
      resize();
      render(performance.now());
    },
    lift(i) {
      liftIdx = i;
      if (o.still !== undefined) render(performance.now());
      else kick();
    },
    dispose() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
    stats: () => ({ progress: cur, pins: pins.filter((p) => p.g.visible).length }),
  };
}
