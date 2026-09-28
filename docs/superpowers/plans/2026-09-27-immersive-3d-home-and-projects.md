> **Note (2026-09-28):** the A101 floor plan referenced below was a client document sent by mistake. It has been removed from the site, the pipeline and the repository; `/contact/` now uses a plan drawn for the site (`src/data/plan-walls.ts`) and the corridor starts on the first photograph. Mentions below are historical.

# Immersive 3D Homepage + Projects Corridor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Prototype B (dusk fly-through) as the homepage hero and Prototype D's stud-field corridor as a 19-panel 3D gallery on `/projects/`, with the fixes and verification the spec requires.

**Architecture:** Each experience is an Astro component (markup, copy and the eager scroll/overlay script) plus a scene module reached only by dynamic `import()` (three.js). All timing and data logic that can be pure lives in small dependency-free TS modules. Those modules are unit-tested with Node's built-in test runner, which runs `.ts` natively on Node 24. Visual behaviour is verified with Playwright against the dev server.

**Tech Stack:** Astro 6, three.js r184 (vanilla, custom GLSL), Lenis + GSAP (untouched), Tailwind v4 tokens, `node --test` (Node 24.14, native type stripping), Playwright MCP.

**Spec:** `docs/superpowers/specs/2026-09-27-immersive-3d-home-and-projects-design.md`

## Global Constraints

- three.js is loaded only via dynamic `import()`. After every build, `grep -c three.module dist/index.html` and `grep -c three.module dist/projects/index.html` must both print `0`.
- `src/lib/motion.ts` and its Lenis/GSAP `tick()` are NOT modified.
- Orange fills carry the dark ink label (`text-on-secondary-container` / `#0a1f14`), never white.
- `#009933` is for large text only; use `green-600`/`green-700` at body size.
- Paragraph max-widths use bracket syntax (`max-w-[32rem]`), never `max-w-md` and similar (spacing-token collision).
- No image is displayed above its source resolution (≤ 1.25 CSS px per texel).
- `/about/`, `/services/`, `/contact/` and `404` are not changed.
- Copy voice: conversational, full sentences, "We…" subject + outcome; CTA wording is "Get in Touch", never "Request a Quote".
- Paths contain spaces: always quote them in shell commands.
- **Commits:** the user has not authorised commits in this session. Treat each "Commit" step as a checkpoint: run `git status --short` and review the diff. Only run `git commit` if the user has said to.
- Prototype sources (temporary scratchpad): `LAB=/private/tmp/claude-501/-Users-mingmalama-Desktop-My-works-Websites-Works-Niravana-Construction/a9303cdb-15cb-46d8-87f9-3b0656476b45/scratchpad/lab`.

## Review Focus

1. **Landing mid-track** (reload with scroll restored, or back navigation): the scene must start at the current scroll progress, not fly in from 0 over the page, and the text must match. Screenshots hit exactly this (scrollY 1818 on first load of D).
2. **Filtered grid + corridor click:** if the grid filter is set to "Medical" and the visitor clicks the ALDI panel, the filter resets to "All" before scrolling, so the target card is visible.
3. **Resize / rotate mid-scroll:** the camera aspect, renderer size, panel honest-widths and pinned labels are all recomputed, and the text doesn't jump to the wrong station.
4. **Keyboard focus in faded stages:** buttons in invisible stages must not be focusable (`inert`), or Tab lands on invisible CTAs.
5. **Slow or failed loads:** a panel texture that hasn't arrived shows a green-tinted placeholder, not black. If `import("three")` rejects after the tall track is laid out, the page collapses to the static layout once, without leaving a tall empty track.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/immersive/flythrough-timeline.ts` | **New, pure.** Camera KEYS, label ANCHORS, STAGES windows, HOTSPOTS, STATIONS and `stageOpacity()`. The one source of truth for homepage timing. |
| `src/components/immersive/flythrough-scene.ts` | Ported from B. The three.js scene; imports KEYS/ANCHORS from the timeline. Light budget applied. |
| `src/components/immersive/FlythroughHero.astro` | Ported from B. Markup, copy and the overlay painter, driven by STAGES/HOTSPOTS. |
| `src/data/corridor.ts` | **New, pure data.** The ordered list of 16 corridor stations. |
| `src/lib/corridor.ts` | **New, pure.** `textureFor`, `resolveStations`, `honestPanelWidth`, `stationProgress`, `activeStation`, `CORRIDOR_PHASES`, `trackVh`. |
| `src/components/immersive/corridor-scene.ts` | Ported from D (`studfield-scene.ts`). Variable station count, pairs, honest sizing, `onSelect`. |
| `src/components/immersive/ProjectCorridor.astro` | Ported from D (`StudField.astro`). Projects h1, skip link, labels, big project-name type, click-to-card, fallbacks. |
| `src/pages/index.astro` | Uses `<FlythroughHero />`; the hero, StudWall3D and trades section are removed. |
| `src/pages/projects.astro` | Uses `<ProjectCorridor />`; cards get `id={p.slug}`; the filter gets `nv:reset-filter` handling. |
| `src/data/projects.ts` | Golf Galaxy `photo` becomes `"golf-galaxy-night"`. |
| `tests/flythrough-timeline.test.ts`, `tests/corridor.test.ts` | Unit tests. |
| `scripts/verify-3d-bundles.mjs` | Post-build check: no eager three, no immersive chunks on the other pages, eager-JS budget. |
| `package.json` | `"test": "node --test tests/"`. |
| `CLAUDE.md` | Decision #8, page table, orphans and gotchas. |

---

### Task 1: Snapshot the prototypes and add the test runner

The scratchpad is temporary, so the prototype code is copied into the repo first. Nothing is wired up yet.

**Files:**
- Create: `src/components/immersive/` (4 files copied from the prototypes, 2 of them renamed)
- Modify: `package.json` (scripts)
- Create: `tests/smoke.test.ts` (deleted in Task 2)

**Interfaces:**
- Produces: `npm test` runs every `tests/*.test.ts`.

- [ ] **Step 1: Copy the prototype sources in**

```bash
LAB="/private/tmp/claude-501/-Users-mingmalama-Desktop-My-works-Websites-Works-Niravana-Construction/a9303cdb-15cb-46d8-87f9-3b0656476b45/scratchpad/lab"
cd "/Users/mingmalama/Desktop/My works/Websites Works/Niravana Construction"
mkdir -p src/components/immersive tests
cp "$LAB/b-flythrough/src/components/immersive/FlythroughHero.astro" src/components/immersive/
cp "$LAB/b-flythrough/src/components/immersive/flythrough-scene.ts" src/components/immersive/
cp "$LAB/d-abstract/src/components/immersive/StudField.astro" src/components/immersive/ProjectCorridor.astro
cp "$LAB/d-abstract/src/components/immersive/studfield-scene.ts" src/components/immersive/corridor-scene.ts
ls src/components/immersive
```
Expected: 4 files listed.

- [ ] **Step 2: Add the test script** to `package.json` `"scripts"`:

```json
"test": "node --test tests/"
```

- [ ] **Step 3: Write a smoke test** in `tests/smoke.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
test("runner executes TypeScript", () => {
  const n: number = 1;
  assert.equal(n, 1);
});
```

- [ ] **Step 4: Run it**

Run: `npm test`
Expected: `# pass 1`, `# fail 0`.

- [ ] **Step 5: Confirm the build still passes.** Nothing imports the new files yet.

Run: `npm run build 2>&1 | tail -3`
Expected: page(s) built, no errors.

- [ ] **Step 6: Checkpoint** (see Global Constraints: Commits).

---

### Task 2: Flythrough timeline, one source of truth with no overlapping text (TDD)

**Files:**
- Create: `src/components/immersive/flythrough-timeline.ts`
- Create: `tests/flythrough-timeline.test.ts`
- Delete: `tests/smoke.test.ts`

**Interfaces:**
- Produces:
  - `type V3 = [number, number, number]`
  - `KEYS: [number, V3, V3][]`
  - `ANCHORS: Record<string, V3>`
  - `STAGES: readonly (readonly [number, number])[]` (7 entries, in markup order)
  - `HOTSPOTS: { id: string; in: number; out: number }[]`
  - `STATIONS: { label: string; p: number }[]`
  - `FADE: number`
  - `stageOpacity(p: number, win: readonly [number, number]): number`

- [ ] **Step 1: Write the failing tests** in `tests/flythrough-timeline.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KEYS, ANCHORS, STAGES, HOTSPOTS, STATIONS, stageOpacity,
} from "../src/components/immersive/flythrough-timeline.ts";

test("stage windows are ordered and do not overlap", () => {
  for (let i = 1; i < STAGES.length; i++) {
    assert.ok(STAGES[i][0] >= STAGES[i - 1][1], `stage ${i} opens before ${i - 1} closes`);
  }
});

test("never more than one stage visible at any progress", () => {
  for (let p = 0; p <= 1.0001; p += 0.0005) {
    const visible = STAGES.filter((w) => stageOpacity(p, w) > 0.01).length;
    assert.ok(visible <= 1, `p=${p.toFixed(4)} shows ${visible} stages`);
  }
});

test("every stage reaches full opacity", () => {
  for (const w of STAGES) {
    const a = Math.max(0, w[0]);
    const b = Math.min(1, w[1]);
    assert.equal(stageOpacity((a + b) / 2, w), 1);
  }
});

test("hero is fully visible at 0 and the finale at 1", () => {
  assert.equal(stageOpacity(0, STAGES[0]), 1);
  assert.equal(stageOpacity(1, STAGES[STAGES.length - 1]), 1);
});

test("camera keys run 0 → 1 in ascending order", () => {
  assert.equal(KEYS[0][0], 0);
  assert.equal(KEYS[KEYS.length - 1][0], 1);
  for (let i = 1; i < KEYS.length; i++) assert.ok(KEYS[i][0] > KEYS[i - 1][0]);
});

test("every hotspot has an anchor; rail stations ascend inside [0,1]", () => {
  for (const h of HOTSPOTS) assert.ok(h.id in ANCHORS, h.id);
  for (let i = 0; i < STATIONS.length; i++) {
    assert.ok(STATIONS[i].p >= 0 && STATIONS[i].p <= 1);
    if (i) assert.ok(STATIONS[i].p > STATIONS[i - 1].p);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `rm tests/smoke.test.ts && npm test`
Expected: FAIL with `ERR_MODULE_NOT_FOUND ... flythrough-timeline.ts`.

- [ ] **Step 3: Implement** `src/components/immersive/flythrough-timeline.ts`. KEYS, ANCHORS, HOTSPOTS and STATIONS are copied verbatim from the prototype. The fade now happens *inside* each window, which fixes the overlap.

```ts
/* ============================================================
   Homepage fly-through timing — the ONE source of truth.
   Imported by flythrough-scene.ts (camera, anchors) and by
   FlythroughHero.astro (stage copy, hotspots, rail). Pure: no
   three.js, no DOM, so it is unit-tested in tests/.
   ============================================================ */

export type V3 = [number, number, number];

/* [progress, eye, look-at] — see flythrough-scene.ts for the spline */
export const KEYS: [number, V3, V3][] = [
  [0.0, [5.0, 1.8, 32], [-1.5, 3.8, 0]],
  [0.1, [3.0, 1.9, 21], [-1.2, 3.9, 0]],
  [0.2, [8.6, 2.6, 8.4], [-2.5, 4.6, 0]],
  [0.3, [-0.7, 1.8, 5.4], [-1.0, 1.8, -2]],
  [0.37, [-1.0, 1.75, -0.7], [-1.9, 1.7, -8]],
  [0.45, [-4.6, 1.75, -6.0], [-5.8, 1.75, -12]],
  [0.53, [-2.9, 1.7, -8.3], [-2.7, 1.75, -12]],
  [0.6, [1.9, 1.7, -8.2], [2.5, 1.9, -12]],
  [0.67, [3.6, 2.1, -6.0], [4.8, 3.9, -7.0]],
  [0.74, [4.4, 2.3, -4.6], [4.9, 3.95, -7.3]],
  [0.82, [5.5, 1.75, -4.8], [12.7, 2.1, -6.5]],
  [0.89, [7.0, 1.7, -8.4], [12.7, 2.0, -7.0]],
  [1.0, [10.2, 1.6, -10.6], [-3.5, 1.9, 0.5]],
];

export const ANCHORS: Record<string, V3> = {
  eifs: [2.5, 5.0, 0.02],
  studs: [-7.3, 2.7, -11.95],
  blocking: [-6.05, 1.22, -11.95],
  insulation: [-3.0, 1.55, -11.94],
  drywall: [1.1, 2.4, -11.92],
  act: [4.8, 3.9, -6.6],
};

/* Stage copy windows, in MARKUP ORDER: hero, façade, entry, wall,
   ceiling, sectors, finale. [in, out]; in < 0 = visible from the
   start, out ≥ 1 = stays to the end. Windows must not overlap. */
export const STAGES = [
  [-1, 0.085],
  [0.13, 0.28],
  [0.305, 0.385],
  [0.41, 0.635],
  [0.655, 0.775],
  [0.795, 0.905],
  [0.925, 2],
] as const;

/* Pinned labels. These MAY overlap each other (several wall trades
   are labelled at once) — they are callouts, not stage copy. */
export const HOTSPOTS = [
  { id: "eifs", in: 0.13, out: 0.235 },
  { id: "studs", in: 0.41, out: 0.57 },
  { id: "blocking", in: 0.435, out: 0.55 },
  { id: "insulation", in: 0.47, out: 0.61 },
  { id: "drywall", in: 0.55, out: 0.635 },
  { id: "act", in: 0.66, out: 0.765 },
];

export const STATIONS = [
  { label: "Street", p: 0 },
  { label: "Façade", p: 0.2 },
  { label: "Entry", p: 0.345 },
  { label: "The wall", p: 0.525 },
  { label: "Ceiling", p: 0.71 },
  { label: "Sectors", p: 0.845 },
  { label: "Contact", p: 1 },
];

/* fade length, spent INSIDE the window so neighbours never overlap */
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: `# pass 6`, `# fail 0`.

- [ ] **Step 5: Checkpoint.**

---

### Task 3: Homepage — wire FlythroughHero, light budget, inert stages, mid-track landing

**Files:**
- Modify: `src/components/immersive/flythrough-scene.ts` (the KEYS/ANCHORS block at lines ~52–84, lighting at ~1036–1113, initial progress, dev handle)
- Modify: `src/components/immersive/FlythroughHero.astro` (frontmatter hotspots/stations at lines ~41–60, stage markup at ~102–197, `windowed` at ~685, `paint()` at ~736)
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: everything exported by `flythrough-timeline.ts` (Task 2).
- Produces: `FlyController` gains `stats(): { lights: number; progress: number }`. It is exposed as `window.__nvFly` in dev only.

- [ ] **Step 1: The scene imports its timing.** In `flythrough-scene.ts`, delete the local `type V3`, `const KEYS` and `const ANCHORS` declarations and add:

```ts
import { KEYS, ANCHORS, type V3 } from "./flythrough-timeline";
```

- [ ] **Step 2: Start at the current scroll position** (Review Focus 1). Find where the damped progress is initialised (search `let cur` / `let prog` in `createFlythrough`) and make it:

```ts
let cur = o.still ?? o.getTarget();   // land where the page already is — never fly in from 0
```

- [ ] **Step 3: Apply the light budget** (≤ 8 punctual lights on desktop, ≤ 3 in lite mode). In the lighting block:
  - Replace the per-lamp `PointLight` loop with emissive lamp heads, which are already modelled, plus a **ground-pool decal** per lamp. The decal is an additive, transparent plane with a radial falloff:

    ```ts
    const poolTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const g = c.getContext("2d")!;
      const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      r.addColorStop(0, "rgba(255,184,120,0.55)"); r.addColorStop(1, "rgba(255,184,120,0)");
      g.fillStyle = r; g.fillRect(0, 0, 256, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    lamps.forEach(([x, z]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), poolMat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z - 1.2); scene.add(m);
    });
    ```
  - Interior troffers: replace the 6/3 `PointLight`s with **3 on desktop and 1 in lite mode**. Keep each light's energy the same by raising intensity by the ratio: desktop `15 * 2`, lite `26 * 3`, and distance `22`.
  - Delete `counterLight` and `plenumLight`. Make the counter pendant and plenum duct materials `emissive` (`emissiveIntensity: 1.2`) so they still read as lit.
  - In lite mode, `canopySpot` and `featureSpot` are not added.
  - **Result:** desktop has moon, canopy, 3 troffers, wallSpot and featureSpot (7 punctual lights, plus the hemisphere light, which is ambient). Lite has moon, 1 troffer and wallSpot (3).
  - Add all disposables created here (the pool geometry, `poolMat`, `poolTex`) to the existing dispose list.

- [ ] **Step 4: Add `stats()` and the dev handle.** In the returned controller:

```ts
stats() {
  let lights = 0;
  scene.traverse((o) => { if ((o as THREE.Light).isLight && !(o as THREE.Light & { isHemisphereLight?: boolean }).isHemisphereLight && !(o as any).isAmbientLight) lights++; });
  return { lights, progress: cur };
},
```
Add `stats(): { lights: number; progress: number };` to the `FlyController` interface.

- [ ] **Step 5: Drive the component from the timeline.** In `FlythroughHero.astro`:
  - Frontmatter: import `{ HOTSPOTS, STATIONS }` from `"./flythrough-timeline"`. Build `hotspots` as `HOTSPOTS.map((h) => ({ ...h, t: bySlug[TRADE_OF[h.id]] }))` with

    ```ts
    const TRADE_OF: Record<string, string> = {
      eifs: "eifs", studs: "metal-framing", blocking: "rough-carpentry",
      insulation: "insulation", drywall: "drywall", act: "acoustical-ceilings",
    };
    ```

    Replace the local `stations` array with `STATIONS`.
  - Markup: on each of the 7 `.nv-stage` elements, replace `data-in="…" data-out="…"` with `data-stage={i}`, numbering 0–6 in document order. Keep the existing `data-stage` boolean selector by writing it as `data-stage="0"` … `data-stage="6"`.
  - Script: `import { STAGES, HOTSPOTS, stageOpacity } from "./flythrough-timeline";`. Delete `windowed`. In `paint()`:

    ```ts
    stages.forEach((el) => {
      const w = STAGES[Number(el.dataset.stage)];
      const v = stageOpacity(p, w);
      const lift = (1 - v) * 18;
      el.style.opacity = v.toFixed(3);
      el.style.visibility = v < 0.01 ? "hidden" : "visible";
      el.inert = v < 0.5;                       // Review Focus 4
      const base = el.classList.contains("nv-stage-center") ? "translate(-50%, 50%) " : "";
      el.style.transform = `${base}translate3d(0, ${lift.toFixed(1)}px, 0)`;
      v > 0.5 ? el.setAttribute("data-on", "") : el.removeAttribute("data-on");
    });
    ```

    For hotspots, use `stageOpacity(p, [h.in, h.out])` where `windowed` was used, and add `el.setAttribute("aria-hidden", v < 0.5 ? "true" : "false")`.
  - After the controller resolves: `if (import.meta.env.DEV) (window as any).__nvFly = ctl;`
  - If the `import("./flythrough-scene")` promise rejects **or** resolves `null`, set `root.setAttribute("data-static", "")` and remove the tall-track height (the prototype's static path). Confirm the `.catch` exists and calls that path (Review Focus 5).

- [ ] **Step 6: Wire the homepage.** In `src/pages/index.astro`:
  - Replace the `HeroCanvas`/`StudWall3D` imports with `import FlythroughHero from "../components/immersive/FlythroughHero.astro";` and delete the `heroFrames` const.
  - Replace the whole hero `<section class="nv-hero …">…</section>` (starts line ~48) with `<FlythroughHero />`.
  - Delete the block from `{/* ============ The six trades we self-perform ============` through the closing `</section>` of that section (lines ~134–~183).
  - Delete `{/* ============ How a wall goes up (3D) ============ */}` and `<StudWall3D />`.
  - Keep the GC marquee conditional block exactly as it is.
  - Remove `trades` from the imports if it is now unused. Run `grep -n "trades" src/pages/index.astro` to check.
  - Diff against B's prototype page to confirm only these regions differ:

    ```bash
    diff <(sed -n 1,400p "$LAB/b-flythrough/src/pages/index.astro") src/pages/index.astro | head -60
    ```

- [ ] **Step 7: Run the tests and build**

Run: `npm test && npm run build 2>&1 | tail -3 && grep -c three.module dist/index.html`
Expected: tests pass, build OK, last line `0`.

- [ ] **Step 8: Browser verification (Playwright MCP, dev server on :4321/4322).**
  1. Navigate to `/` twice; the first load may show Vite 504s.
  2. `browser_evaluate`: `window.__nvFly.stats().lights`. Expected `<= 8`.
  3. At 1440×900, screenshot at progress 0, 0.2, 0.52, 0.72, 0.85 and 0.99. Scroll `track.top + travel*p` repeatedly until settled, as in the bake-off.
     - Expected: exactly one stage block readable in each.
     - At 0.85 only the sectors block is visible; at 0.99 only the finale.
     - No stage is blown out.
  4. **Landing mid-track:** `scrollTo(mid)`, reload, and screenshot within 300ms. Expected: the camera is already at the mid station, not the street.
  5. **Keyboard:** at p=0.5, `document.querySelectorAll('.nv-stage [href], .nv-stage button')` — every one inside a `[inert]` ancestor, except those in the active stage.
  6. `browser_resize` to 390×844 and repeat step 3 at 0, 0.52 and 0.99. Then `stats().lights <= 3`.

- [ ] **Step 9: Checkpoint.**

---

### Task 4: Corridor data + pure layout logic (TDD)

**Files:**
- Create: `src/data/corridor.ts`
- Create: `src/lib/corridor.ts`
- Create: `tests/corridor.test.ts`
- Modify: `src/data/projects.ts` (Golf Galaxy `photo`)

**Interfaces:**
- Produces (from `src/lib/corridor.ts`):
  - `interface ManifestEntry { webp: number[]; display: number | null; aspect: number | null }`
  - `interface CorridorStation { project: string | null; photos: string[]; label?: string }` (re-exported from the data file)
  - `interface ResolvedPanel { slug: string; url: string; px: number; aspect: number }`
  - `interface ResolvedStation { key: string; project: string | null; name: string; meta: string; index: string; panels: ResolvedPanel[] }`
  - `textureFor(slug: string, e: ManifestEntry, maxPx: number): { url: string; px: number } | null`
  - `resolveStations(stations: CorridorStation[], projects: ProjectLike[], manifest: Record<string, ManifestEntry>, maxPx: number): ResolvedStation[]` — throws on an unknown project or photo slug
  - `honestPanelWidth(px: number, maxWorld: number, worldPerCssPx: number): number`
  - `CORRIDOR_PHASES: { layout: number; flow: number; form: number; travelStart: number; travelEnd: number; plumb: number }`
  - `stationProgress(i: number, n: number): number`
  - `activeStation(p: number, n: number): number` (−1 outside the travel range)
  - `trackVh(n: number, small: boolean): number`

- [ ] **Step 1: Write the failing tests** in `tests/corridor.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import manifest from "../src/data/image-manifest.json" with { type: "json" };
import { projects } from "../src/data/projects.ts";
import { corridorStations } from "../src/data/corridor.ts";
import {
  resolveStations, textureFor, honestPanelWidth, stationProgress,
  activeStation, CORRIDOR_PHASES, trackVh,
} from "../src/lib/corridor.ts";

const CLIENT_PHOTOS = [
  "plan-a101", "aldi", "autozone", "burlington", "chipotle", "f45-exterior",
  "f45-interior", "first-watch", "first-watch-interior", "five-below",
  "flagship-carwash-2", "golf-galaxy-day", "golf-galaxy-night", "johns-hopkins",
  "grocery-outlet", "oreilly", "panda-express",
];
const M = manifest as Record<string, { webp: number[]; display: number | null; aspect: number | null }>;
const resolved = resolveStations(corridorStations, projects, M, 1600);
const allSlugs = resolved.flatMap((s) => s.panels.map((p) => p.slug));

test("16 stations, 19 panels", () => {
  assert.equal(resolved.length, 16);
  assert.equal(allSlugs.length, 19);
});

test("every client photograph appears exactly once", () => {
  for (const s of CLIENT_PHOTOS) assert.equal(allSlugs.filter((x) => x === s).length, 1, s);
});

test("JCC and the blurry WP images are excluded", () => {
  for (const s of ["jcc", "flagship-carwash", "golf-galaxy", "jobsite-01", "jobsite-07"]) {
    assert.ok(!allSlugs.includes(s), s);
  }
});

test("every panel URL is a file that exists on disk", () => {
  for (const st of resolved) for (const p of st.panels) {
    assert.ok(existsSync(`public${p.url}`), p.url);
  }
});

test("names/meta come from projects.ts; the drawing has its label", () => {
  assert.equal(resolved[0].project, null);
  assert.equal(resolved[0].name, "From the drawings");
  const gg = resolved.find((s) => s.project === "golf-galaxy-towson")!;
  assert.equal(gg.name, "Golf Galaxy");
  assert.equal(gg.panels.length, 2);
  const fw = resolved.find((s) => s.project === "first-watch")!;
  assert.ok(!fw.meta.includes("undefined"));
});

test("unknown slugs throw at build time", () => {
  assert.throws(() => resolveStations([{ project: "nope", photos: ["aldi"] }], projects, M, 1600));
  assert.throws(() => resolveStations([{ project: null, photos: ["missing-photo"] }], projects, M, 1600));
});

test("textureFor picks the widest file ≤ maxPx, never above", () => {
  assert.deepEqual(textureFor("f45-exterior", M["f45-exterior"], 1600), { url: "/images/projects/f45-exterior-1600.webp", px: 1600 });
  assert.deepEqual(textureFor("f45-exterior", M["f45-exterior"], 800), { url: "/images/projects/f45-exterior-800.webp", px: 800 });
  assert.deepEqual(textureFor("oreilly", M["oreilly"], 1600), { url: "/images/projects/oreilly-259.webp", px: 259 });
});

test("honestPanelWidth: capped by resolution, never above max", () => {
  // 0.01 world units per CSS px at closest pass: a 259px image may be ≤ 259*1.25*0.01 = 3.2375
  assert.equal(honestPanelWidth(259, 3.4, 0.01), 259 * 1.25 * 0.01);
  assert.equal(honestPanelWidth(1600, 3.4, 0.01), 3.4);
});

test("stations are spread evenly across the travel range", () => {
  const { travelStart, travelEnd } = CORRIDOR_PHASES;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const p = stationProgress(i, n);
    assert.ok(p > travelStart && p < travelEnd);
    assert.equal(activeStation(p, n), i);
  }
  assert.equal(activeStation(travelStart - 0.01, n), -1);
  assert.equal(activeStation(travelEnd + 0.01, n), -1);
});

test("phases are ascending", () => {
  const v = Object.values(CORRIDOR_PHASES);
  for (let i = 1; i < v.length; i++) assert.ok(v[i] > v[i - 1]);
});

test("track length scales with station count", () => {
  assert.equal(trackVh(16, false), 240 + 16 * 55);
  assert.equal(trackVh(16, true), 200 + 16 * 45);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `ERR_MODULE_NOT_FOUND ... corridor.ts`.

- [ ] **Step 3: Write** `src/data/corridor.ts`:

```ts
/* ============================================================
   The /projects/ 3D corridor — curated, ordered stations.
   Data only. Names, categories and locations are looked up from
   projects.ts by slug in src/lib/corridor.ts so they cannot drift.

   Rules (spec §4.2): every client photograph from
   ~/Desktop/My works/Website Photos appears exactly once; the
   blurry JCC upscale is excluded; projects with no photograph
   stay in the grid only.
   ============================================================ */

export interface CorridorStation {
  /* Project.slug, or null for a non-project panel */
  project: string | null;
  /* 1 photo, or 2 shown as a pair on the same station */
  photos: string[];
  label?: string;
}

export const corridorStations: CorridorStation[] = [
  { project: null, photos: ["plan-a101"], label: "From the drawings" },
  { project: "aldi-annapolis", photos: ["aldi"] },
  { project: "golf-galaxy-towson", photos: ["golf-galaxy-night", "golf-galaxy-day"] },
  { project: "hcps-forest-hill-annex", photos: ["hcps-forest-hill"] },
  { project: "chipotle-bel-air", photos: ["chipotle"] },
  { project: "mace-medical-dundalk", photos: ["mace-medical"] },
  { project: "flagship-carwash", photos: ["flagship-carwash-2"] },
  { project: "f45-training", photos: ["f45-exterior", "f45-interior"] },
  { project: "johns-hopkins", photos: ["johns-hopkins"] },
  { project: "first-watch", photos: ["first-watch", "first-watch-interior"] },
  { project: "panda-express", photos: ["panda-express"] },
  { project: "autozone", photos: ["autozone"] },
  { project: "burlington", photos: ["burlington"] },
  { project: "grocery-outlet", photos: ["grocery-outlet"] },
  { project: "five-below", photos: ["five-below"] },
  { project: "oreilly-auto-parts", photos: ["oreilly"] },
];
```

- [ ] **Step 4: Write** `src/lib/corridor.ts`:

```ts
/* ============================================================
   Pure layout logic for the /projects/ corridor. No three.js, no
   DOM, no imports of data — data is passed in, so tests/ can run
   it under plain Node.
   ============================================================ */
import type { CorridorStation } from "../data/corridor";
export type { CorridorStation };

export interface ManifestEntry { webp: number[]; display: number | null; aspect: number | null }
export interface ProjectLike { slug: string; index: string; name: string; category: string; location?: string }
export interface ResolvedPanel { slug: string; url: string; px: number; aspect: number }
export interface ResolvedStation {
  key: string; project: string | null; name: string; meta: string; index: string; panels: ResolvedPanel[];
}

/* widest processed file ≤ maxPx; the un-suffixed file is `display` wide */
export function textureFor(slug: string, e: ManifestEntry, maxPx: number): { url: string; px: number } | null {
  const suffixed = e.webp.filter((w) => w <= maxPx).sort((a, b) => b - a)[0];
  const base = e.display && e.display <= maxPx && !e.webp.includes(e.display) ? e.display : 0;
  if (!suffixed && !base) return null;
  if (base > (suffixed ?? 0)) return { url: `/images/projects/${slug}.webp`, px: base };
  return { url: `/images/projects/${slug}-${suffixed}.webp`, px: suffixed! };
}

export function resolveStations(
  stations: CorridorStation[],
  projects: ProjectLike[],
  manifest: Record<string, ManifestEntry>,
  maxPx: number,
): ResolvedStation[] {
  return stations.map((s, i) => {
    const pr = s.project ? projects.find((p) => p.slug === s.project) : null;
    if (s.project && !pr) throw new Error(`corridor: unknown project "${s.project}"`);
    const panels = s.photos.map((slug) => {
      const e = manifest[slug];
      if (!e) throw new Error(`corridor: "${slug}" is not in image-manifest.json`);
      const t = textureFor(slug, e, maxPx);
      if (!t) throw new Error(`corridor: no file ≤ ${maxPx}px for "${slug}"`);
      return { slug, url: t.url, px: t.px, aspect: e.aspect ?? 1.5 };
    });
    return {
      key: s.project ?? `station-${i}`,
      project: s.project,
      name: s.label ?? pr!.name,
      meta: pr ? [pr.category, pr.location].filter(Boolean).join(" · ") : "A101 · Floor plan",
      index: pr ? pr.index : "00",
      panels,
    };
  });
}

/* ≤ 1.25 CSS px per texel at the closest pass (spec §4.3) */
export function honestPanelWidth(px: number, maxWorld: number, worldPerCssPx: number): number {
  return Math.min(maxWorld, px * 1.25 * worldPerCssPx);
}

export const CORRIDOR_PHASES = {
  layout: 0.0,
  flow: 0.05,
  form: 0.11,
  travelStart: 0.16,
  travelEnd: 0.9,
  plumb: 0.93,
} as const;

export function stationProgress(i: number, n: number): number {
  const { travelStart: a, travelEnd: b } = CORRIDOR_PHASES;
  return a + ((i + 0.5) / n) * (b - a);
}

export function activeStation(p: number, n: number): number {
  const { travelStart: a, travelEnd: b } = CORRIDOR_PHASES;
  if (p < a || p > b) return -1;
  return Math.min(n - 1, Math.floor(((p - a) / (b - a)) * n));
}

export function trackVh(n: number, small: boolean): number {
  return small ? 200 + n * 45 : 240 + n * 55;
}
```

- [ ] **Step 5: Switch the Golf Galaxy grid card** to the client photograph. In `src/data/projects.ts`, in the `golf-galaxy-towson` entry, change `photo: "golf-galaxy",` to `photo: "golf-galaxy-night",`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests pass (6 timeline + 11 corridor).

- [ ] **Step 7: Checkpoint.**

---

### Task 5: ProjectCorridor — port D onto the corridor data

**Files:**
- Modify: `src/components/immersive/corridor-scene.ts`
- Modify: `src/components/immersive/ProjectCorridor.astro`
- Modify: `src/pages/projects.astro`

**Interfaces:**
- Consumes: `resolveStations`, `honestPanelWidth`, `stationProgress`, `activeStation`, `CORRIDOR_PHASES` and `trackVh` (Task 4); `corridorStations`.
- Produces: `createCorridor(o: { canvas; stage; stations: ResolvedStation[]; labels: HTMLElement[]; small: boolean; getTarget: () => number; onFrame: (p: number, active: number) => void; onSelect: (stationIndex: number) => void; still?: number }): Promise<CorridorHandle | null>`, where `CorridorHandle = { kick(): void; resize(): void; dispose(): void; stats(): { panels: number; progress: number } }`. It is exposed as `window.__nvCorridor` in dev.

- [ ] **Step 1: Rename and retype the scene entry point.** In `corridor-scene.ts`:
  - rename `createStudField` → `createCorridor` and `FieldHandle` → `CorridorHandle`
  - replace `PanelData`/`panels` with `stations: ResolvedStation[]` (`import type { ResolvedStation } from "../../lib/corridor"`)
  - add `getTarget`, `onFrame`, `onSelect` and `still` to `Opts`
  - add `stats()`

  If D computes progress in the component, move the damping loop into the scene exactly as B does it (`cur += (target - cur) * (1 - Math.exp(-dt * 6))`, stopping when `|target-cur| < 1e-4`). Initialise `cur = o.still ?? o.getTarget()` (Review Focus 1).

- [ ] **Step 2: Drive the phases from `CORRIDOR_PHASES`.** Replace D's hard-coded formation thresholds (the uniforms that blend grid → wave → corridor → plumb, and the camera-path breakpoints 0.10/0.27/0.43/0.86) with:

```ts
import { CORRIDOR_PHASES as PH, stationProgress, activeStation, honestPanelWidth } from "../../lib/corridor";
const SPACING = 18;                                   // world units between stations
const n = o.stations.length;
const corridorLen = n * SPACING + 24;                 // lead-in + run-out
const stationZ = (i: number) => -12 - i * SPACING;
/* camera z during travel is linear in progress, so station i is abreast at stationProgress(i, n) */
const travelZ = (p: number) => {
  const t = (p - PH.travelStart) / (PH.travelEnd - PH.travelStart);
  return -12 + SPACING * 0.5 - t * n * SPACING + 6;   // +6: panel sits just ahead-left/right as it passes
};
```

  Also:
  - Extend the corridor wall instance count so the stud walls cover `corridorLen`. D sizes the walls for ~120 units, so scale the instance count by `corridorLen / 120` and keep the lite-mode ratio.
  - Put the plumb wall at `stationZ(n - 1) - 30`.

- [ ] **Step 3: Panels — pairs and resolution-honest sizes.** Replace `PANEL_Z` and the fixed `panelW` with one mesh per panel. The panels share a unit `PlaneGeometry(1, 1, 24, 16)` and are sized by `mesh.scale`:

```ts
const maxWorld = o.small ? 2.3 : 3.4;
const closest = o.small ? 1.4 : 2.4;                  // camera-to-panel distance when abreast
const worldPerCssPx = () => (2 * closest * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / stage.clientHeight;
type P = { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; station: number; aspect: number; px: number; side: number; slot: number };
const panelObjs: P[] = [];
o.stations.forEach((st, si) => {
  const pair = st.panels.length === 2;
  const side = si % 2 === 0 ? -1 : 1;
  st.panels.forEach((pd, k) => {
    const mat = /* D's PANEL shader material, uTex loaded from pd.url, uTint green placeholder until loaded */;
    const mesh = new THREE.Mesh(unitPanelGeo, mat);
    /* a pair takes BOTH walls at the same z; a single alternates sides */
    const s = pair ? (k === 0 ? -1 : 1) : side;
    mesh.position.set(s * (o.small ? 1.05 : 2.25), 1.75, stationZ(si));
    mesh.rotation.y = -s * 0.35;
    panelObjs.push({ mesh, mat, station: si, aspect: pd.aspect, px: pd.px, side: s, slot: k });
    scene.add(mesh);
  });
});
const sizePanels = () => {
  const wpp = worldPerCssPx();
  for (const q of panelObjs) {
    const w = honestPanelWidth(q.px, maxWorld, wpp);
    q.mesh.scale.set(w, w / q.aspect, 1);
  }
};
sizePanels();
```

  Also:
  - Call `sizePanels()` inside `resize()` (Review Focus 3).
  - Labels are pinned per **station**, under the first panel's bottom-left corner; use `q.mesh.scale` instead of the old `panelW`.
  - The placeholder: before the texture loads, the panel fragment shader outputs `mix(uTint, tex, uLoaded)` with `uTint = #0b3d1f` and `uLoaded` animated 0→1 over 400ms on load (Review Focus 5). If D's shader lacks `uLoaded`, add the uniform.
  - On a raycast click, call `o.onSelect(q.station)` instead of navigating.

- [ ] **Step 4: Adapt the component** (`ProjectCorridor.astro`).
  - **Frontmatter.** Replace `picks`/`panels`/`textureUrl` with:

    ```ts
    import manifestJson from "../../data/image-manifest.json";
    import { projects } from "../../data/projects";
    import { corridorStations } from "../../data/corridor";
    import { resolveStations, trackVh, type ManifestEntry } from "../../lib/corridor";
    const M = manifestJson as Record<string, ManifestEntry>;
    const stations = resolveStations(corridorStations, projects, M, 1600);
    const stationsSmall = resolveStations(corridorStations, projects, M, 800);
    ```

    Emit both lists as `data-stations` and `data-stations-small`. The script picks one by `small`. Set `style={`--track:${trackVh(stations.length,false)}vh; --track-sm:${trackVh(stations.length,true)}vh`}` on the track, and use `height: var(--track)` (`var(--track-sm)` under the small media query).
  - **Copy.** Replace D's homepage h1, intro, trades and CTA with the projects page's own content:
    - Eyebrow: "Selected Projects"
    - h1 (real HTML, `data-words`): "Work we've framed, boarded and finished."
    - Intro: "We've carried commercial interiors across Maryland — retail, medical, education and community spaces — and every one of them was handed over plumb, on layout and ready for inspection. Walk the corridor, or skip straight to the list."
    - Remove D's six trade titles. In their place, the **active station's name** renders as the large display type (lower-left, `text-display-xl`), with `index · meta` in `label-mono` above it. It cross-fades on station change, driven by `onFrame(p, active)`.
    - Finale line: "Every one of them plumb." with a "Browse all projects ↓" link to `#project-grid`.
  - **Skip link** at the top of the section: `<a href="#project-grid" class="nv-skip">Skip to the project list</a>`, visible on focus.
  - **Labels:** one per station: name, then `index · meta`, in JetBrains Mono.
  - **Selection** (Review Focus 2):

    ```ts
    onSelect: (i) => {
      const slug = stations[i].project;
      if (!slug) return;
      document.dispatchEvent(new CustomEvent("nv:reset-filter"));
      const card = document.getElementById(slug);
      if (!card) return;
      const y = card.getBoundingClientRect().top + window.scrollY - 120;
      const lenis = getLenis();
      lenis ? lenis.scrollTo(y, { duration: 1.6 }) : window.scrollTo({ top: y, behavior: "smooth" });
      card.classList.add("nv-flash");
      setTimeout(() => card.classList.remove("nv-flash"), 1800);
    },
    ```

  - **Reduced motion:** the static layout becomes the station photos as a responsive grid (2 columns ≥ 768px), each a `<ProjectImage>` with its label, followed by the page's normal grid. No tall track.
  - **No WebGL, or the import rejects:** the same static layout, headed by the A101 drawing over `bg-green-950`. The `.catch` sets `data-static` and removes the track height.
  - **Dispose:** on `astro:before-swap`, call `ctl.dispose()` and `renderer.forceContextLoss()` (inside the scene's `dispose`).
  - **Dev handle:** `if (import.meta.env.DEV) (window as any).__nvCorridor = ctl;`

- [ ] **Step 5: Wire the projects page.** In `src/pages/projects.astro`:
  - `import ProjectCorridor from "../components/immersive/ProjectCorridor.astro";` and replace the `<header class="max-w-container-max …">…</header>` hero with `<ProjectCorridor />`. `<main class="blueprint-bg …">` stays.
  - On each `<article class="project-card …">`, add `id={p.slug}`.
  - Add the flash style to the page's `<style>`: `.project-card.nv-flash{outline:3px solid #ff6600;outline-offset:4px;transition:outline-color 1.6s}`.
  - In `setupFilter()`, listen for the reset event by clicking the "All" button:

    ```ts
    document.addEventListener("nv:reset-filter", () => {
      document.querySelector<HTMLButtonElement>('.filter-btn[data-filter="all"]')?.click();
    });
    ```

    Register it once per page load. `setupFilter` already runs on `astro:page-load`, so guard it with a module-level `let resetBound = false`.

- [ ] **Step 6: Run the tests and build**

Run: `npm test && npm run build 2>&1 | tail -3 && grep -c three.module dist/projects/index.html`
Expected: tests pass, build OK, `0`.

- [ ] **Step 7: Browser verification (Playwright MCP).**
  1. `/projects/` at 1440×900: `window.__nvCorridor.stats().panels === 19`.
  2. Screenshots:
     - the intro, at 0: h1 readable
     - the drawing, at `stationProgress(0,16)`
     - the Golf Galaxy pair, at `stationProgress(2,16)`: both photos on opposite walls
     - O'Reilly, at `stationProgress(15,16)`: its panel is visibly smaller and crisp, not blurry
     - the finale, at 0.97
  3. **Click to card:** click the ALDI panel's screen position (from its label's rect). Expected: the page scrolls to `#aldi-annapolis` and it flashes orange.
  4. **Filtered click:** click the "Medical" filter, scroll back into the corridor, and click the ALDI panel. Expected: the filter resets to All and the ALDI card is visible and flashed.
  5. **Resize:** go from 1440 to 900 wide mid-corridor. Expected: labels stay under their panels and panel sizes recompute (compare `mesh.scale` via `stats` or a screenshot).
  6. The 390×844 pass: intro, a mid station, the finale.
  7. The skip link: press Tab once from page top, then Enter. Expected: focus and scroll land at `#project-grid`.

- [ ] **Step 8: Checkpoint.**

---

### Task 6: Bundle guard + page-transition safety

**Files:**
- Create: `scripts/verify-3d-bundles.mjs`
- Modify: `package.json` (add `"verify:3d": "node scripts/verify-3d-bundles.mjs"`)

**Interfaces:**
- Consumes: `dist/` from `npm run build`.

- [ ] **Step 1: Write the guard script**, which is itself the test:

```js
// Post-build guard for the immersive pages. Exit 1 on any violation.
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dist = "dist";
const fail = [];
const html = (p) => readFileSync(join(dist, p), "utf8");
const scripts = (h) => [...h.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)].map((m) => m[1]);
const inlineModules = (h) => [...h.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) => m[1]);

// eager JS = module scripts the HTML references + their static imports (one level)
function eagerGz(h) {
  const seen = new Set();
  const queue = [...scripts(h)];
  for (const src of inlineModules(h)) for (const m of src.matchAll(/from"(\/_astro\/[^"]+)"|import"(\/_astro\/[^"]+)"/g)) queue.push(m[1] || m[2]);
  let bytes = 0;
  while (queue.length) {
    const s = queue.shift();
    if (seen.has(s)) continue;
    seen.add(s);
    const f = join(dist, s);
    if (!existsSync(f)) continue;
    const code = readFileSync(f);
    bytes += gzipSync(code).length;
    for (const m of code.toString().matchAll(/from"\.\/([^"]+\.js)"|import"\.\/([^"]+\.js)"/g)) queue.push("/_astro/" + (m[1] || m[2]));
  }
  return { bytes, files: [...seen] };
}

for (const page of ["index.html", "projects/index.html"]) {
  const h = html(page);
  if (h.includes("three.module")) fail.push(`${page}: references three.module eagerly`);
  const { bytes, files } = eagerGz(h);
  if (files.some((f) => f.includes("three.module"))) fail.push(`${page}: three.module in eager graph`);
  if (bytes > 70 * 1024) fail.push(`${page}: eager JS ${(bytes / 1024).toFixed(1)} KB gz > 70 KB`);
  console.log(`${page}: eager ${(bytes / 1024).toFixed(1)} KB gz`);
}
for (const page of ["about/index.html", "services/index.html", "contact/index.html"]) {
  const h = html(page);
  if (/flythrough|corridor-scene|ProjectCorridor|FlythroughHero/.test(h)) fail.push(`${page}: references an immersive chunk`);
}
if (fail.length) { console.error("FAIL\n" + fail.join("\n")); process.exit(1); }
console.log("verify-3d-bundles: OK");
```

- [ ] **Step 2: Run it**

Run: `npm run build >/dev/null && npm run verify:3d && node scripts/verify-srcsets.mjs`
Expected: `verify-3d-bundles: OK` with both eager sizes printed ≤ 70 KB, and the srcset check passes.
If a page exceeds the budget: find the eager import that pulled in the extra code. It is usually a static `import` of a scene module in a component script; change it to `import()`. Then re-run.

- [ ] **Step 3: ClientRouter loop (Playwright MCP).** On the dev server, from `/`, run in `browser_evaluate`:

```js
async () => {
  const { navigate } = await import("/node_modules/astro/dist/virtual-modules/transitions-router.js").catch(() => ({}));
  for (let i = 0; i < 5; i++) {
    for (const url of ["/projects/", "/"]) {
      if (navigate) await navigate(url); else document.querySelector(`a[href="${url}"]`)?.click();
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
  return document.querySelectorAll("canvas").length;
}
```

Then `browser_console_messages` at level `warning`.
Expected: no "Too many active WebGL contexts", no errors except dev-toolbar 504s, and a canvas count of 1.
If the router import path doesn't resolve, click the header nav links instead; that is what the fallback in the snippet does.

- [ ] **Step 4: Reduced motion and no-WebGL.**
  - `browser_emulate_media` with `reducedMotion: "reduce"`, then reload `/` and `/projects/`. Expected: no tall track (`document.documentElement.scrollHeight < 6000` on `/`), and all copy present.
  - For no-WebGL, run `browser_run_code_unsafe` with `page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; })`, then reload both pages. Expected: the fallback photo/drawing with the h1 and CTA, and no tall empty track.

- [ ] **Step 5: Checkpoint.**

---

### Task 7: Art-direction polish pass

This is the "ten years of motion design" pass. It is judged by eye with Playwright screenshots against the list below. Each item is a concrete, checkable change.

**Files:**
- Modify: `src/components/immersive/flythrough-scene.ts`, `FlythroughHero.astro`, `corridor-scene.ts`, `ProjectCorridor.astro`

- [ ] **Step 1: Readability scrims.** Wherever stage copy sits over the scene, add a directional gradient scrim behind the copy column only, e.g. `linear-gradient(90deg, rgba(5,26,12,.72) 0%, rgba(5,26,12,.35) 45%, transparent 70%)` on a pseudo-element of the stage. Check contrast by sampling the pixels behind the paragraph in a screenshot. Target ≥ 4.5:1 against `#fff` at 80% opacity. D's intro paragraph over the bars is the known failure.

- [ ] **Step 2: Headline entrances.** Stage h2s on `/` and the station name on `/projects/` use a masked line-rise: each line wrapped in `overflow:hidden`, the inner span moving `translateY(105%) → 0` over 700ms with `cubic-bezier(.2,.7,0,1)` and a 60ms stagger per line. Trigger when `data-on` is set, and reverse on removal. This is CSS only (`[data-on] .nv-line > span { transform:none }`), so no per-frame JS. Under reduced motion, lines are static.

- [ ] **Step 3: Camera feel on `/`.**
  - Add a subtle look-at "breathing" (±0.04 world units, 7s sine) only while settled, so the idle frame isn't dead. It stops (the loop idles) under reduced motion and when the tab is hidden.
  - Keep the idle cost honest: the breathing runs at most 30 fps (skip alternate frames) and stops after 20 s of no input.

- [ ] **Step 4: Scroll velocity on `/projects/`.** Panels already bend with scroll speed in D. Clamp the effect so fast flicks never tear the image (`uVel` clamped to ±0.6). The laser line brightens by 30% with velocity.

- [ ] **Step 5: The station hand-off on `/projects/`.** When `active` changes, pulse the orange laser along the wall at the new station's z (a 500ms travelling highlight in the stud shader, from a `uPulseZ`/`uPulseT` uniform pair).

- [ ] **Step 6: Final screenshot review.** At 1440×900 and 390×844, capture `/` at 6 points and `/projects/` at 6 points (the same points as Tasks 3 and 5). Review each against this list:
  - one text block per frame
  - readable copy
  - no blown highlights
  - no clipped labels
  - no upscaled panels
  - orange buttons with dark labels

  Fix anything that fails and re-shoot that frame.

- [ ] **Step 7: Full regression**

Run: `npm test && npm run build 2>&1 | tail -3 && npm run verify:3d && node scripts/verify-srcsets.mjs`
Expected: all green.

- [ ] **Step 8: Checkpoint.**

---

### Task 8: Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `CLAUDE.md`:**
  - **Page table:** `/` becomes "FlythroughHero (dusk fly-through: street → façade → cut-away wall → ACT → sectors → finale), GC marquee (hidden), sector bento, Difference band, CTA". `/projects/` becomes "ProjectCorridor (stud-field corridor, 16 stations / 19 panels from `src/data/corridor.ts`), filter, 19-card grid, CTA".
  - **Where things live:** add `components/immersive/` (4 files), `src/data/corridor.ts`, `src/lib/corridor.ts`, `tests/`, `scripts/verify-3d-bundles.mjs`.
  - **Orphans:** add `HeroCanvas.astro` and `StudWall3D.astro`.
  - **Decision history #8 (2026-09-27):** the four-prototype bake-off (A build-a-room, B fly-through, C x-ray wall, D abstract), and the choice of B for home and D as the projects corridor.
  - **Gotchas:**
    - Homepage timing lives ONLY in `flythrough-timeline.ts`, and stage fades happen inside their windows. `npm test` enforces one visible stage.
    - The corridor is curated in `corridor.ts`. `npm test` fails if a client photo is missing or duplicated, or if a URL doesn't exist on disk.
    - Panels are sized by resolution (`honestPanelWidth`), so a small photo gets a smaller panel. That is intended.
    - Scenes call `forceContextLoss()` on `astro:before-swap`.
    - `window.__nvFly` / `window.__nvCorridor` are dev-only debug handles.
    - Screenshot recipe: scroll to `track.top + travel*p` repeatedly until settled, because Lenis interrupts a single `scrollTo`.
  - **Quick health check:** add `npm test` and `npm run verify:3d`.

- [ ] **Step 2: Final checkpoint.** Run `git status --short`. Summarise the changed and new files for the user.
