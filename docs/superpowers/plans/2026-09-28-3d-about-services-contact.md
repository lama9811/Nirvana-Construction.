> **Note (2026-09-28):** the A101 floor plan referenced below was a client document sent by mistake. It has been removed from the site, the pipeline and the repository; `/contact/` now uses a plan drawn for the site (`src/data/plan-walls.ts`) and the corridor starts on the first photograph. Mentions below are historical.

# 3D About, Services and Contact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give About, Services and Contact each a scroll-driven three.js centrepiece, plus a shared depth-motion layer, at the same quality bar and with the same safety rules as `/` and `/projects/`.

**Architecture:**
- Each 3D piece follows the proven pattern: an Astro component holding the copy, fallbacks and the damped scroll loop, plus a scene module reached only by `import()`.
- Every timing table and every data table is a pure TS module, unit-tested with `node --test`.
- The shared motion layer is one small declarative module, `src/lib/depth.ts`.

**Tech Stack:** Astro 6, three.js r184 (vanilla), Tailwind v4 tokens, `node --test` on Node 24, Playwright MCP.

**Spec:** `docs/superpowers/specs/2026-09-28-3d-about-services-contact-design.md`

## Global Constraints

- **three.js:** only via dynamic `import()`. `npm run verify:3d` must pass for ALL five pages: no `three.module` in the eager graph, and eager JS ≤ 70 KB gz.
- **Scene builds:** wrapped in `try`. On a throw: `renderer.dispose()` + `renderer.forceContextLoss()` + return `null`, and the component calls `goStatic()`.
- **WebGL probes** release their context (`WEBGL_lose_context`).
- **`astro:before-swap`** disposes the renderer, geometries, materials, textures and listeners.
- **`goStatic()`:** one per component. It stops the loop, observers and listeners, and clears inline opacity/visibility/transform and `inert`.
- **Accessibility:** the page h1 stays in the accessibility tree after fading (only its links go inert). Other faded copy blocks are `inert`.
- **Heroes:** `margin-top: calc(var(--hdr) * -1)` with a sticky `top: 0; height: 100svh`. `--hdr` is 5rem, or 5.5rem at ≥768px. Static and reduced-motion layouts stay in normal flow.
- **Tracks:** Services 520vh / 440vh small; About 380vh / 320vh; Contact 220vh / 180vh.
- **Small/touch** (`(max-width: 767px), (pointer: coarse)`): DPR ≤ 1.5, lighter geometry, no shadows where optional.
- **Loops** stop when settled or off-screen. Any idle shimmer stops 20 s after the last input.
- **Contrast:** orange fills carry the `#0a1f14` label. `#009933` is for large text only.
- **Copy:** voice as in CLAUDE.md ("Let's build yours", "Get in Touch", "We…" sentences). The existing h1s stay:
  - Services: "Commercial framing & drywall, end to end."
  - About: "A commercial trade partner. Not a sales pitch."
  - Contact: "Start a project. Get a callback."
- **Commits:** not authorised in this session. Treat commit steps as checkpoints (`git status --short`).
- **Paths contain spaces:** quote them.
- **Prototype C source:** `LAB=/private/tmp/claude-501/-Users-mingmalama-Desktop-My-works-Websites-Works-Niravana-Construction/a9303cdb-15cb-46d8-87f9-3b0656476b45/scratchpad/lab/c-xray`

## Review Focus

1. **Contact form reachability.** A visitor who lands on `/contact/` and immediately scrolls or presses Tab must reach the form fields without fighting the 3D. The skip link goes to `#contact-form`, and the track is ≤ 220vh.
2. **Map/list coupling on touch.** Tapping a city name must not do anything surprising. Hover-lift is mouse/focus only, and the list stays plain text.
3. **Flip counters with a non-numeric value** (e.g. `"DBE"`, `"19+"`). Digits roll, while non-digits are placed statically.
4. **Depth tilt-ins and anchor jumps.** Content targeted by an anchor or by Tab focus must be visible even if its tilt-in never fired: the focus handler forces `.is-in`.
5. **Page-to-page swaps.** A ClientRouter swap between two 3D pages (e.g. `/about/` → `/services/`) leaves one canvas and zero WebGL warnings.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/immersive/stage-fade.ts` | **New, pure.** `stageOpacity(p, [in,out])` and `FADE`, moved out of `flythrough-timeline.ts`, which re-exports them. Shared by every component. |
| `src/components/immersive/XrayWall.astro`, `xray-scene.ts`, `xray-textures.ts` | Ported from Prototype C. The Services hero. |
| `src/components/immersive/xray-timeline.ts` | **New, pure.** Intro/outro windows plus chapter list for the exploded wall. |
| `src/data/logo-mark.ts` | **New, pure data.** The logo's bars and swoosh in logo pixels (measured from `public/logo.png`). |
| `src/components/immersive/logo-build-timeline.ts` | **New, pure.** Stage windows, per-bar rise windows and camera keys for the About hero. |
| `src/components/immersive/LogoBuild.astro`, `logo-build-scene.ts` | **New.** The About hero. |
| `src/data/maryland-outline.ts` | **New, pure data.** A simplified Maryland polygon as `[lon, lat][]`. |
| `src/data/service-area.ts` | **New, pure data.** The 12 cities with lat/lon and an `hq` flag; `project(lon, lat)`. |
| `src/components/immersive/MarylandMap.astro`, `maryland-scene.ts` | **New.** The About service-area map. |
| `src/data/a101-walls.ts` | **New, pure data.** A101 wall segments in drawing pixels (1246×526). |
| `src/components/immersive/PlanExtrude.astro`, `plan-extrude-scene.ts` | **New.** The Contact hero. |
| `src/lib/depth.ts` | **New.** `data-depth-in`, `data-flip`, `data-glow`, plus pure `flipParts(value)`. |
| `src/styles/global.css` | Depth-motion CSS (start states under `.js-depth`, flip-drum styles). |
| `src/layouts/BaseLayout.astro` | Imports and initialises `depth.ts`. |
| `src/pages/services.astro`, `about.astro`, `contact.astro` | Hero swaps and depth attributes. |
| `scripts/verify-3d-bundles.mjs` | Checks all five pages. |
| `tests/*.test.ts` | New unit tests. |
| `CLAUDE.md` | Decision #9, page table, files, motion table. |

---

### Task 1: Shared fade module + Services exploded wall

**Files:**
- Create: `src/components/immersive/stage-fade.ts`, `src/components/immersive/xray-timeline.ts`, `tests/xray-timeline.test.ts`
- Modify: `src/components/immersive/flythrough-timeline.ts` (re-export the fade from `stage-fade.ts`)
- Create (port): `src/components/immersive/XrayWall.astro`, `xray-scene.ts`, `xray-textures.ts`
- Modify: `src/pages/services.astro`: the hero section (lines ~35–60) becomes `<XrayWall />`.

**Interfaces:**
- Produces:
  - `stage-fade.ts`: `export const FADE: number` and `export function stageOpacity(p: number, w: readonly [number, number]): number`
  - `xray-timeline.ts`: `export const XRAY_STAGES = { intro: [-1, 0.11], outro: [0.885, 2] } as const` and `export const XRAY_CHAPTERS: [number, string][]`

- [ ] **Step 1: Failing test** in `tests/xray-timeline.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { XRAY_STAGES, XRAY_CHAPTERS } from "../src/components/immersive/xray-timeline.ts";
import { stageOpacity } from "../src/components/immersive/stage-fade.ts";

test("intro and outro never overlap and each reaches full opacity", () => {
  const { intro, outro } = XRAY_STAGES;
  assert.ok(outro[0] >= intro[1]);
  for (let p = 0; p <= 1; p += 0.0005) {
    assert.ok(!(stageOpacity(p, intro) > 0.01 && stageOpacity(p, outro) > 0.01), `p=${p}`);
  }
  assert.equal(stageOpacity(0, intro), 1);
  assert.equal(stageOpacity(1, outro), 1);
});

test("chapters ascend from 0 and stay inside [0,1]", () => {
  assert.equal(XRAY_CHAPTERS[0][0], 0);
  for (let i = 1; i < XRAY_CHAPTERS.length; i++) {
    assert.ok(XRAY_CHAPTERS[i][0] > XRAY_CHAPTERS[i - 1][0]);
    assert.ok(XRAY_CHAPTERS[i][0] <= 1);
  }
});
```

- [ ] **Step 2: Run it.** `npm test` → FAIL: `ERR_MODULE_NOT_FOUND ... xray-timeline.ts`.

- [ ] **Step 3: Implement.**
  - Create `stage-fade.ts` by moving `FADE` and `stageOpacity` out of `flythrough-timeline.ts`. In `flythrough-timeline.ts`, replace them with `export { FADE, stageOpacity } from "./stage-fade.ts";`.
    - Ruling on import style: Node's test runner needs the `.ts` extension, and Vite accepts it. Keep `allowImportingTsExtensions` out of scope: `astro check` isn't run, and the build is the gate.
  - Create `xray-timeline.ts` with the windows above. The chapter list is copied verbatim from `$LAB/src/components/immersive/xray-scene.ts` (`const CHAPTERS` near line 597).

- [ ] **Step 4: Port the prototype.**

```bash
cp "$LAB/src/components/immersive/XrayWall.astro" "$LAB/src/components/immersive/xray-scene.ts" "$LAB/src/components/immersive/xray-textures.ts" src/components/immersive/
```

Then adapt, all in the ported files:

1. **Copy.** The intro h1 becomes the Services h1 ("Commercial framing & drywall, end to end."). The eyebrow reads "Our Services". Keep the lede about self-performing every layer. The `Get in Touch` / `See the Work` actions and the outro stay.
2. **Timing.** `xray-scene.ts` imports `XRAY_STAGES` and `XRAY_CHAPTERS`. Its intro/outro overlay code becomes `stageOpacity(p, XRAY_STAGES.intro)` / `stageOpacity(p, XRAY_STAGES.outro)`.
   - The intro keeps `visibility` visible: only its links get `inert = o < 0.5`, so the h1 stays reachable.
   - The outro gets `visibility` hidden and `inert` when `o < 0.5`.
   - `const CHAPTERS` becomes `XRAY_CHAPTERS`.
3. **Header.** The section gets `margin-top: calc(var(--hdr) * -1)` (`--hdr` 5rem / 5.5rem ≥768px), and the stage becomes `position: sticky; top: 0; height: 100svh`. The prototype's measured-header top offset and the `hdr` term in its progress are removed. Static and reduced layouts stay in flow (`margin-top: 0`).
4. **Track.** `.xw-track { height: 520vh }`, and `440vh` under `(max-width: 767px), (pointer: coarse)`.
5. **Safety.**
   - Wrap `createXray`'s body after renderer creation: `try { return build(...) } catch (e) { console.warn("[xray] 3D build failed, using the static layout", e); renderer.dispose(); renderer.forceContextLoss(); return null; }`.
   - `dispose()` calls `renderer.forceContextLoss()`.
   - The component's `webglAvailable()` calls `gl?.getExtension("WEBGL_lose_context")?.loseContext()`.
   - One `goStatic()`: sets `data-static`, stops the loop, disconnects observers, removes scroll/resize/visibility listeners, and clears inline opacity/visibility/transform/inert on intro, outro and callouts.
   - Dev handle: `if (import.meta.env.DEV) window.__nvXray = handle`, exposing `stats(): { progress: number }`.
6. **`services.astro`.** `import XrayWall from "../components/immersive/XrayWall.astro";` and replace the hero `<section class="relative h-[440px] ...">…</section>` with `<XrayWall />`. The rest is unchanged.

- [ ] **Step 5: Verify.**
  - `npm test && npm run build && npm run verify:3d` → pass. At this point `verify:3d` still checks `/` and `/projects/` only; Task 6 extends it.
  - Playwright at 1440×900 and 390×844, on `/services/` at p = 0, 0.25, 0.55, 0.8 and 0.98:
    - the h1 is readable at 0
    - the x-ray grid shows around 0.25
    - 9 labelled layers show at 0.55
    - the wall is reassembled at 0.8
    - the outro and CTA show at 0.98
    - there is never an intro+outro overlap, no copy under the pill nav, and callouts sit inside the frame on 390px

- [ ] **Step 6: Checkpoint.**

---

### Task 2: Shared depth motion (`src/lib/depth.ts`)

**Files:**
- Create: `src/lib/depth.ts`, `tests/depth.test.ts`
- Modify: `src/styles/global.css` (append the depth block), `src/layouts/BaseLayout.astro` (init script)
- Modify: `src/pages/about.astro`, `services.astro`, `contact.astro` (attributes only)

**Interfaces:**
- Produces:
  - `export type FlipPart = { kind: "digit"; value: number } | { kind: "static"; text: string }`
  - `export function flipParts(value: string): FlipPart[]` (pure)
  - `export function initDepth(): () => void`, which returns a cleanup

- [ ] **Step 1: Failing test** in `tests/depth.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { flipParts } from "../src/lib/depth.ts";

test("digits become drums, everything else is static", () => {
  assert.deepEqual(flipParts("19+"), [
    { kind: "digit", value: 1 }, { kind: "digit", value: 9 }, { kind: "static", text: "+" },
  ]);
  assert.deepEqual(flipParts("DBE"), [{ kind: "static", text: "DBE" }]);
  assert.deepEqual(flipParts("06"), [{ kind: "digit", value: 0 }, { kind: "digit", value: 6 }]);
  assert.deepEqual(flipParts(""), []);
});
```

- [ ] **Step 2: Run it.** → FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/depth.ts`.**

```ts
/* ============================================================
   depth.ts — the shared 3D motion layer for content sections.

     data-depth-in        perspective tilt-in on first view
       data-depth-stagger children cascade 70 ms apart
     data-flip="19+"      odometer: digits roll on 3D drums
     data-glow            cursor light + gentle tilt (mouse only)

   Start states apply only under html.js-depth, which this module
   sets — no JS means everything is simply visible. Reduced motion:
   final states, no observers. lib/motion.ts is not touched.
   ============================================================ */

export type FlipPart = { kind: "digit"; value: number } | { kind: "static"; text: string };

export function flipParts(value: string): FlipPart[] {
  const out: FlipPart[] = [];
  for (const ch of value) {
    if (ch >= "0" && ch <= "9") out.push({ kind: "digit", value: Number(ch) });
    else {
      const last = out[out.length - 1];
      if (last && last.kind === "static") last.text += ch;
      else out.push({ kind: "static", text: ch });
    }
  }
  return out;
}

function buildFlip(el: HTMLElement) {
  if (el.dataset.flipBuilt) return;
  el.dataset.flipBuilt = "1";
  const value = el.dataset.flip ?? el.textContent ?? "";
  el.setAttribute("aria-label", value);
  el.textContent = "";
  for (const part of flipParts(value)) {
    if (part.kind === "static") {
      const s = document.createElement("span");
      s.className = "flip-static";
      s.setAttribute("aria-hidden", "true");
      s.textContent = part.text;
      el.append(s);
      continue;
    }
    const drum = document.createElement("span");
    drum.className = "flip-drum";
    drum.setAttribute("aria-hidden", "true");
    const reel = document.createElement("span");
    reel.className = "flip-reel";
    reel.style.setProperty("--to", String(part.value));
    for (let d = 0; d <= 9; d++) {
      const f = document.createElement("span");
      f.textContent = String(d);
      reel.append(f);
    }
    drum.append(reel);
    el.append(drum);
  }
}

export function initDepth(): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.toggle("js-depth", !reduced);
  const flips = [...document.querySelectorAll<HTMLElement>("[data-flip]")];
  flips.forEach(buildFlip);
  if (reduced) {
    flips.forEach((f) => f.classList.add("is-in"));
    return () => {};
  }

  const ins = [...document.querySelectorAll<HTMLElement>("[data-depth-in]")];
  ins.forEach((el) => {
    if (el.hasAttribute("data-depth-stagger")) {
      [...el.children].forEach((c, i) => (c as HTMLElement).style.setProperty("--d", `${i * 70}ms`));
    }
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
  );
  [...ins, ...flips].forEach((el) => io.observe(el));

  /* anything reached by Tab or an anchor is shown even if its tilt-in never fired */
  const onFocus = (e: FocusEvent) => {
    const host = (e.target as HTMLElement | null)?.closest?.("[data-depth-in]");
    if (host) host.classList.add("is-in");
  };
  document.addEventListener("focusin", onFocus);

  /* cursor light + tilt, mouse only */
  const glows = window.matchMedia("(pointer: fine)").matches
    ? [...document.querySelectorAll<HTMLElement>("[data-glow]")]
    : [];
  const handlers = glows.map((el) => {
    let raf = 0;
    const move = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
        el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
        el.style.setProperty("--rx", `${((0.5 - y) * 6).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
        el.classList.add("glow-on");
      });
    };
    const leave = () => {
      el.classList.remove("glow-on");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  });

  return () => {
    io.disconnect();
    document.removeEventListener("focusin", onFocus);
    handlers.forEach((h) => h());
  };
}
```

- [ ] **Step 4: Append the depth CSS** to `src/styles/global.css`:

```css
/* ---------- Depth motion (src/lib/depth.ts) ---------------- */
html.js-depth [data-depth-in]:not([data-depth-stagger]),
html.js-depth [data-depth-in][data-depth-stagger] > * {
  opacity: 0;
  transform: perspective(1200px) rotateX(18deg) translate3d(0, 40px, -120px);
  transform-origin: 50% 100%;
  transition: opacity 0.9s var(--ease-out-expo), transform 0.9s var(--ease-out-expo);
  transition-delay: var(--d, 0ms);
}
html.js-depth [data-depth-in].is-in:not([data-depth-stagger]),
html.js-depth [data-depth-in].is-in[data-depth-stagger] > * {
  opacity: 1;
  transform: none;
}
[data-flip] { display: inline-flex; align-items: baseline; }
.flip-drum {
  display: inline-block;
  height: 1em;
  line-height: 1;
  overflow: hidden;
  perspective: 400px;
}
.flip-reel {
  display: flex;
  flex-direction: column;
  transform: translateY(0);
  transition: transform 1.6s cubic-bezier(0.2, 0.7, 0, 1);
}
.flip-reel > span { height: 1em; line-height: 1; }
[data-flip].is-in .flip-reel { transform: translateY(calc(var(--to) * -1em)); }
[data-flip].is-in .flip-drum:nth-child(2) .flip-reel { transition-delay: 0.12s; }
[data-flip].is-in .flip-drum:nth-child(3) .flip-reel { transition-delay: 0.24s; }
[data-glow] {
  position: relative;
  transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform 0.5s cubic-bezier(0.2, 0.7, 0, 1);
}
[data-glow]::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.35s ease;
  background: radial-gradient(260px 200px at var(--gx, 50%) var(--gy, 50%), rgba(255, 255, 255, 0.14), transparent 70%);
}
[data-glow].glow-on::after { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  [data-glow] { transform: none !important; }
  .flip-reel { transition: none !important; }
}
```

- [ ] **Step 5: Wire it into `BaseLayout.astro`** with a module script next to the motion init:

```astro
<script>
  import { initDepth } from "../lib/depth";
  let cleanup: (() => void) | null = null;
  document.addEventListener("astro:page-load", () => { cleanup?.(); cleanup = initDepth(); });
  document.addEventListener("astro:before-swap", () => { cleanup?.(); cleanup = null; });
</script>
```

- [ ] **Step 6: Attributes on the pages.**
  - **About:** "Who we are" grid → `data-depth-in data-depth-stagger`. Stat numbers → `data-flip="{value}"`, replacing `data-count` on those elements (flip wins). Value cards → `data-glow` + `data-depth-in data-depth-stagger` on their grid. The certification plaque → `data-depth-in`.
  - **Services:** trade detail sections → `data-depth-in`. The sector pillar grid → `data-depth-in data-depth-stagger`, with `data-glow` on each pillar. Process steps → `data-depth-in data-depth-stagger`. Scope grid → `data-depth-in data-depth-stagger`.
  - **Contact:** sidebar cards → `data-depth-in data-depth-stagger`. The form card → `data-glow` + `data-depth-in`.
  - Remove any `data-reveal` on an element that gets `data-depth-in`, so the two systems never animate the same node.

- [ ] **Step 7: Verify.**
  - `npm test` → pass (tests incl. `depth.test.ts`).
  - Playwright: scroll `/about/`. The flip counters show their final values (read `aria-label` and the reel translate). Tilt-ins end at `opacity 1`.
  - Tab into a card that was never scrolled into view: it becomes visible (Review Focus 4).
  - Reduced motion: every element is at rest, with no `js-depth` class.

- [ ] **Step 8: Checkpoint.**

---

### Task 3: About hero — the logo built from steel studs

**Files:**
- Create: `src/data/logo-mark.ts`, `src/components/immersive/logo-build-timeline.ts`, `tests/logo-build.test.ts`
- Create: `src/components/immersive/LogoBuild.astro`, `src/components/immersive/logo-build-scene.ts`
- Modify: `src/pages/about.astro`: the hero section (lines ~45–77) becomes `<LogoBuild />`.

**Interfaces:**
- Produces:
  - `logo-mark.ts`:
    - `export interface LogoBar { x0: number; x1: number; topL: number; topR: number; bottom: number }`
    - `export const LOGO_BARS: LogoBar[]`
    - `export const LOGO_FLAPS: LogoBar[]`
    - `export const LOGO_SWOOSH: { cx: number; cy: number; rx: number; ry: number; tilt: number; from: number; to: number; width: number }[]`
    - `export const LOGO_PX: { w: 800; h: 780 }`
  - `logo-build-timeline.ts`:
    - `export const LB_STAGES: readonly (readonly [number, number])[]` (intro, build, finale)
    - `export function barRise(p: number, i: number, n: number): number` → 0..1
    - `export function swooshDraw(p: number): number` → 0..1
    - `export const LB_KEYS: [number, [number, number, number], [number, number, number]][]`

- [ ] **Step 1: Failing test** in `tests/logo-build.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { LOGO_BARS, LOGO_SWOOSH } from "../src/data/logo-mark.ts";
import { LB_STAGES, LB_KEYS, barRise, swooshDraw } from "../src/components/immersive/logo-build-timeline.ts";
import { stageOpacity } from "../src/components/immersive/stage-fade.ts";

test("four bars, left to right, the third is tallest", () => {
  assert.equal(LOGO_BARS.length, 4);
  for (let i = 1; i < 4; i++) assert.ok(LOGO_BARS[i].x0 > LOGO_BARS[i - 1].x0);
  const h = LOGO_BARS.map((b) => b.bottom - Math.min(b.topL, b.topR));
  assert.equal(h.indexOf(Math.max(...h)), 2);
  assert.equal(LOGO_SWOOSH.length, 2);
});

test("bars rise in order and finish; swoosh draws after the bars start", () => {
  const n = LOGO_BARS.length;
  for (let i = 0; i < n; i++) {
    assert.equal(barRise(0, i, n), 0);
    assert.equal(barRise(1, i, n), 1);
    if (i) assert.ok(barRise(0.3, i, n) <= barRise(0.3, i - 1, n));
  }
  assert.equal(swooshDraw(0), 0);
  assert.equal(swooshDraw(1), 1);
});

test("never two copy stages at once; keys ascend 0 → 1", () => {
  for (let p = 0; p <= 1; p += 0.0005) {
    assert.ok(LB_STAGES.filter((w) => stageOpacity(p, w) > 0.01).length <= 1, `p=${p}`);
  }
  assert.equal(LB_KEYS[0][0], 0);
  assert.equal(LB_KEYS[LB_KEYS.length - 1][0], 1);
  for (let i = 1; i < LB_KEYS.length; i++) assert.ok(LB_KEYS[i][0] > LB_KEYS[i - 1][0]);
});
```

- [ ] **Step 2: Run it.** → FAIL (modules missing).

- [ ] **Step 3: Implement the data.** `src/data/logo-mark.ts` holds values measured from `public/logo.png` (800×780) in logo pixels, y down:

```ts
/* The Nirvana logo mark, measured from public/logo.png (800×780, y down).
   Four bars with slanted tops (the third is tallest), two small flaps
   that step off bars 2 and 3, and two crescent swooshes round the base.
   logo-build-scene.ts turns these into galvanised-stud stacks. */
export interface LogoBar { x0: number; x1: number; topL: number; topR: number; bottom: number }
export const LOGO_PX = { w: 800, h: 780 } as const;
export const LOGO_BARS: LogoBar[] = [
  { x0: 218, x1: 270, topL: 240, topR: 215, bottom: 421 },
  { x0: 297, x1: 332, topL: 172, topR: 115, bottom: 418 },
  { x0: 360, x1: 418, topL: 0, topR: 30, bottom: 405 },
  { x0: 446, x1: 507, topL: 155, topR: 187, bottom: 375 },
];
export const LOGO_FLAPS: LogoBar[] = [
  { x0: 255, x1: 297, topL: 152, topR: 172, bottom: 190 },
  { x0: 418, x1: 457, topL: 30, topR: 55, bottom: 130 },
];
/* two crescents: ellipse centre, radii, tilt (rad), arc from→to (rad), ribbon width (px) */
export const LOGO_SWOOSH = [
  { cx: 400, cy: 395, rx: 250, ry: 95, tilt: -0.2, from: 2.9, to: 6.1, width: 22 },
  { cx: 420, cy: 430, rx: 270, ry: 105, tilt: -0.22, from: 3.0, to: 6.2, width: 18 },
];
```

- [ ] **Step 4: Implement the timeline.** `logo-build-timeline.ts`:

```ts
import { stageOpacity } from "./stage-fade.ts";
export { stageOpacity };
export type V3 = [number, number, number];
/* copy windows: intro (h1), build caption, finale — never overlapping */
export const LB_STAGES = [[-1, 0.16], [0.24, 0.62], [0.7, 2]] as const;
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
/* bar i rises over its own window; bars start 0.08 apart from p = 0.1 */
export function barRise(p: number, i: number, n: number): number {
  void n;
  const a = 0.1 + i * 0.08;
  return ease(clamp((p - a) / 0.3));
}
export function swooshDraw(p: number): number {
  return ease(clamp((p - 0.42) / 0.26));
}
/* [progress, eye, look-at] — logo units: 1 unit = 100 logo px, origin at the base centre */
export const LB_KEYS: [number, V3, V3][] = [
  [0, [0.6, 3.2, 9.5], [0, 1.4, 0]],
  [0.35, [3.6, 2.4, 7.6], [0, 1.8, 0]],
  [0.7, [7.2, 3.0, 2.2], [0, 2.1, 0]],
  [1, [5.4, 2.6, -5.8], [0, 2.1, 0]],
];
```

- [ ] **Step 5: Run the tests.** → pass. Adjust nothing in the tests; if a timing assertion fails, fix the timing constants.

- [ ] **Step 6: Build the scene.** `logo-build-scene.ts`:
  - `export async function createLogoBuild(o: { canvas; host; lite: boolean; getTarget: () => number; onFrame: (p: number) => void; still?: number }): Promise<{ kick(): void; resize(): void; dispose(): void; stats(): { progress: number } } | null>`
  - Import three dynamically inside: `const THREE = await import("three")` and `RoomEnvironment` the same way. Wrap the build in the `try` from Global Constraints.
  - **Slab:** a 12×12 concrete box, with a procedural canvas texture (reuse the approach in `flythrough-scene.ts`: noise plus saw-cut joints).
  - **Bars:** for each `LOGO_BARS[i]`, the columns are galvanised C-studs at 16" o.c. across the bar width.
    - Mapping: logo px → units at `/100`, with x centred on 400 and y flipped.
    - Each stud is a `BoxGeometry(0.06, 1, 0.18)` instance, scaled to its top height, which is interpolated between `topL` and `topR` across the bar.
    - Top and bottom track are thin boxes.
    - Studs rise with `barRise(p, i, n)`: each stud's y-scale is `rise` and it is staggered within the bar by `0.15 × columnIndex / columns`.
    - Flaps rise with their parent bar.
    - Everything uses one `InstancedMesh` per bar, with a `MeshStandardMaterial` of `color 0xb9c7bf, metalness 0.85, roughness 0.38`. Green tint: the tops get `emissive 0x009933` at 0.35 once the bar is complete, so the finished mark reads green like the logo.
  - **Swoosh:** each `LOGO_SWOOSH` arc becomes a `TubeGeometry` along the tilted ellipse (64 segments, radius `width/200`). It is drawn with `geometry.setDrawRange(0, Math.floor(total × swooshDraw(p)))`. Material: `color 0x009933, emissive 0x00852c, emissiveIntensity 0.6`.
  - **Lighting:** RoomEnvironment PMREM, a key `DirectionalLight` casting soft shadows (off in lite), a warm fill of 0.2 or less, ACES tone mapping, and fog to `#051a0c`.
  - **Camera:** a Catmull-Rom spline through `LB_KEYS`, damped with `cur += (target-cur)*(1-exp(-dt*3.2))`. It renders only while unsettled (the homepage pattern).
  - **Dispose:** all geometries, materials, textures and PMREM, then `forceContextLoss()`.

- [ ] **Step 7: Build the component.** `LogoBuild.astro`: section `data-lb`, a track of 380vh (320vh small), a sticky 100svh stage under the header (the `margin-top: -hdr` rule), a canvas, a scrim, and three copy stages (`data-stage="0..2"`):
  - **0 (intro):**
    - eyebrow "About Nirvana"
    - the existing h1 "A commercial trade partner. Not a sales pitch."
    - lede "Commercial drywall and metal-stud framing for general contractors across Maryland."
    - actions: `Get in Touch` (btn-primary) and `See the Work`
  - **1:** mono "Built stud by stud", h2 "We build it the way we build yours — on layout, plumb, one stud at a time."
  - **2:** mono `{company.certification.label} · {company.certification.number}`, h2 "The Nirvana Way — Excellence Without Compromise."
  - **Script:** the FlythroughHero pattern:
    - the probe with `loseContext`, `isStatic`, `goStatic()`
    - `paint(p)` uses `stageOpacity`; for stage 0, only its links get `inert`
    - the dynamic `import("./logo-build-scene")`
    - `astro:before-swap` cleanup, and the `__nvLogo` dev handle
  - **Static layout:** the intro plus stage 2 in flow over a still frame (`still: 1` when reduced + WebGL); no WebGL → a `bg-green-950` panel with the logo image.

- [ ] **Step 8: `about.astro`.** `import LogoBuild from "../components/immersive/LogoBuild.astro";`, then replace the hero section with `<LogoBuild />`.

- [ ] **Step 9: Verify.**
  - `npm test && npm run build`.
  - Playwright at 1440 and 390, on `/about/` at p = 0, 0.3, 0.5, 0.75 and 0.98:
    - bars rise in order
    - the swoosh draws around the base
    - the finished mark reads as the logo from the finale angle
    - exactly one copy stage per frame

- [ ] **Step 10: Checkpoint.**

---

### Task 4: About service area — 3D Maryland map

**Files:**
- Create: `src/data/maryland-outline.ts`, `src/data/service-area.ts`, `tests/service-area.test.ts`
- Create: `src/components/immersive/MarylandMap.astro`, `src/components/immersive/maryland-scene.ts`
- Modify: `src/pages/about.astro`: the service-area `<aside>` (lines ~245–290) gets `<MarylandMap />` above its existing content. The city list uses `serviceArea` from the new data file.

**Interfaces:**
- Produces:
  - `maryland-outline.ts`: `export const MD_OUTLINE: [number, number][]` (lon, lat; a closed ring, simplified to ≤ 400 points)
  - `service-area.ts`:
    - `export interface City { name: string; lat: number; lon: number; hq?: boolean }`
    - `export const serviceArea: City[]`
    - `export const MD_BBOX: { minLon: number; maxLon: number; minLat: number; maxLat: number }`
    - `export function project(lon: number, lat: number): [number, number]` (map units: x east, z south, equirectangular with cos(lat) correction, centred on the bbox)

- [ ] **Step 1: Failing test** in `tests/service-area.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { serviceArea, MD_BBOX, project } from "../src/data/service-area.ts";
import { MD_OUTLINE } from "../src/data/maryland-outline.ts";

const ABOUT_CITIES = ["Baltimore","Annapolis","Towson","Owings Mills","Bel Air","Forest Hill","Aberdeen","Glen Burnie","Dundalk","Middle River","Gaithersburg","Nottingham"];

test("every About city has coordinates inside Maryland's bbox; Nottingham is HQ", () => {
  assert.deepEqual(serviceArea.map((c) => c.name), ABOUT_CITIES);
  for (const c of serviceArea) {
    assert.ok(c.lon > MD_BBOX.minLon && c.lon < MD_BBOX.maxLon, c.name);
    assert.ok(c.lat > MD_BBOX.minLat && c.lat < MD_BBOX.maxLat, c.name);
  }
  assert.deepEqual(serviceArea.filter((c) => c.hq).map((c) => c.name), ["Nottingham"]);
});

test("outline is a real, closed Maryland ring inside the bbox", () => {
  assert.ok(MD_OUTLINE.length >= 60 && MD_OUTLINE.length <= 400, String(MD_OUTLINE.length));
  const [a, b] = [MD_OUTLINE[0], MD_OUTLINE[MD_OUTLINE.length - 1]];
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05);
  for (const [lon, lat] of MD_OUTLINE) {
    assert.ok(lon >= MD_BBOX.minLon && lon <= MD_BBOX.maxLon && lat >= MD_BBOX.minLat && lat <= MD_BBOX.maxLat);
  }
});

test("projection keeps geography: Gaithersburg west of Baltimore, Annapolis south of Towson", () => {
  assert.ok(project(-77.2014, 39.1434)[0] < project(-76.6122, 39.2904)[0]);
  assert.ok(project(-76.4922, 38.9784)[1] > project(-76.6019, 39.4015)[1]);
});
```

- [ ] **Step 2: Run it.** → FAIL (modules missing).

- [ ] **Step 3: Get the outline.**
  - Fetch the public-domain US-states GeoJSON (`https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json`) with `curl` into the scratchpad.
  - Extract the Maryland feature's **largest** polygon ring (the mainland including the Eastern Shore). Simplify it with Douglas–Peucker at a tolerance that lands between 150 and 350 points, rounding to 4 decimals.
  - Write it as a TS literal into `src/data/maryland-outline.ts`, with a header comment naming the source and the simplification.
  - If the fetch fails, **stop and report**: the outline must be real geography, never invented.

- [ ] **Step 4: `service-area.ts`.**

```ts
/* Cities the About page lists, with real coordinates. Nottingham is HQ. */
export interface City { name: string; lat: number; lon: number; hq?: boolean }
export const serviceArea: City[] = [
  { name: "Baltimore", lat: 39.2904, lon: -76.6122 },
  { name: "Annapolis", lat: 38.9784, lon: -76.4922 },
  { name: "Towson", lat: 39.4015, lon: -76.6019 },
  { name: "Owings Mills", lat: 39.4196, lon: -76.7803 },
  { name: "Bel Air", lat: 39.5359, lon: -76.3483 },
  { name: "Forest Hill", lat: 39.5809, lon: -76.3897 },
  { name: "Aberdeen", lat: 39.5096, lon: -76.1641 },
  { name: "Glen Burnie", lat: 39.1626, lon: -76.6247 },
  { name: "Dundalk", lat: 39.2507, lon: -76.5205 },
  { name: "Middle River", lat: 39.3343, lon: -76.4394 },
  { name: "Gaithersburg", lat: 39.1434, lon: -77.2014 },
  { name: "Nottingham", lat: 39.3923, lon: -76.4886, hq: true },
];
export const MD_BBOX = { minLon: -79.49, maxLon: -75.04, minLat: 37.88, maxLat: 39.73 };
const midLat = (MD_BBOX.minLat + MD_BBOX.maxLat) / 2;
const k = Math.cos((midLat * Math.PI) / 180);
/* map units ≈ degrees × 4; x east, z south */
export function project(lon: number, lat: number): [number, number] {
  const cx = (MD_BBOX.minLon + MD_BBOX.maxLon) / 2;
  const cy = (MD_BBOX.minLat + MD_BBOX.maxLat) / 2;
  return [(lon - cx) * k * 4, -(lat - cy) * 4];
}
```

  In `about.astro`, replace the local `cities` array with `serviceArea.map((c) => c.name)`, so the list and the map share one source.

- [ ] **Step 5: Run the tests.** → pass.

- [ ] **Step 6: Build the scene.** `maryland-scene.ts`:
  - `export async function createMap(o: { canvas; host; lite: boolean; getTarget: () => number; still?: number; onPins: (screen: { x: number; y: number; visible: boolean }[]) => void }): Promise<{ kick(): void; resize(): void; lift(i: number | null): void; dispose(): void } | null>`
  - **The state:** `THREE.Shape` from `MD_OUTLINE.map(project)`, then `ExtrudeGeometry({ depth: 0.12, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 })`. It's rotated flat and uses `MeshStandardMaterial({ color: 0x0b3a1c, roughness: 0.7 })`, with a green edge `LineSegments` from `EdgesGeometry` (`0x009933`).
  - **Tilt-in:** progress (the section's scroll-through, 0→1) drives the rotation from flat (x = −90°) to the display tilt (−62°), plus a slow azimuth drift (±6°).
  - **Pins:** a `CylinderGeometry` needle with a sphere head per city. Each needle rises staggered by index, the order sorted by distance from Nottingham. The HQ pin is orange (`0xff6600`) with an expanding ring pulse (a scaled `RingGeometry` whose opacity loops, running only while on screen and at most 20 s after the last input). Others are green `0x009933`.
  - **`lift(i)`:** raises pin *i* by 0.25 and brightens it.
  - **Projection:** `onPins` projects pin heads to screen for HTML labels (the HQ label is always shown; the others show on lift).

- [ ] **Step 7: Build the component.** `MarylandMap.astro`:
  - a 4:3 box (`aspect-ratio: 4 / 3`, rounded, `bg-green-950`) with the canvas and an HQ label ("Nottingham · HQ")
  - scroll progress from the box's own rect entering → leaving the viewport
  - an IntersectionObserver that starts and stops the loop
  - a `goStatic` that hides the canvas and shows a static fallback card with the text "Headquartered in Nottingham, MD · serving the Greater Baltimore region" on `bg-green-950` (no new image assets)
  - **List coupling:** `about.astro` gives each city `<li>` `tabindex="0" data-city={i}`. The component listens for `pointerenter`/`focus` → `lift(i)` and `pointerleave`/`blur` → `lift(null)`. This is mouse/focus only; the touch no-op is Review Focus 2.
  - Dispose on swap; probe with `loseContext`; try-wrapped build.

- [ ] **Step 8: Verify.**
  - `npm test && npm run build`.
  - Playwright:
    - scroll the service-area section into view at 1440 and 390 → the state is tilted in, 12 pins are up, and HQ is orange and pulsing
    - hover "Annapolis" in the list → its pin lifts (screenshot)
    - tap a city on the 390px touch context → nothing breaks and there are no console errors

- [ ] **Step 9: Checkpoint.**

---

### Task 5: Contact hero — the plan extrudes into 3D

**Files:**
- Create: `src/data/a101-walls.ts`, `tests/a101-walls.test.ts`
- Create: `src/components/immersive/PlanExtrude.astro`, `src/components/immersive/plan-extrude-scene.ts`
- Modify: `src/pages/contact.astro`: the hero (lines ~17–48) becomes `<PlanExtrude />`, and the form's wrapping element gets `id="contact-form"`.

**Interfaces:**
- Produces:
  - `a101-walls.ts`: `export const PLAN_PX = { w: 1246, h: 526 } as const` and `export const A101_WALLS: [number, number, number, number, number][]` (x1, y1, x2, y2, thickness in drawing px)
  - `export function wallRise(p: number, i: number, n: number): number`, in the same file as a pure helper, staggered left to right

- [ ] **Step 1: Failing test** in `tests/a101-walls.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { A101_WALLS, PLAN_PX, wallRise } from "../src/data/a101-walls.ts";

test("walls are real segments inside the drawing", () => {
  assert.ok(A101_WALLS.length >= 12, String(A101_WALLS.length));
  for (const [x1, y1, x2, y2, t] of A101_WALLS) {
    for (const [x, y] of [[x1, y1], [x2, y2]]) assert.ok(x >= 0 && x <= PLAN_PX.w && y >= 0 && y <= PLAN_PX.h);
    assert.ok(Math.hypot(x2 - x1, y2 - y1) > 4);
    assert.ok(t >= 2 && t <= 14);
  }
});

test("every wall is fully up by the end and flat at the start", () => {
  const n = A101_WALLS.length;
  for (let i = 0; i < n; i++) { assert.equal(wallRise(0, i, n), 0); assert.equal(wallRise(1, i, n), 1); }
});
```

- [ ] **Step 2: Run it.** → FAIL.

- [ ] **Step 3: Trace the walls.**
  - Open `public/images/projects/plan-a101.webp` (1246×526) in the Read tool, and render a copy with a 50px coordinate grid via PIL into the scratchpad.
  - Record every drawn wall as `[x1, y1, x2, y2, t]`:
    - the exterior walls
    - the room partitions of Health Rm 014, Closet 015, Restroom 016, Nurse Office 017, Closet 018, Classroom 019 and Classroom 020
    - the angled north-east corner (as two or three straight segments)
  - Doors are gaps; do not bridge them.
  - Verify by drawing the segments in red over the plan image and viewing it. Iterate until every segment lies on a printed wall line.
  - `wallRise(p, i, n)`: `ease(clamp((p - 0.05 - 0.45 * (x-centre of wall i / PLAN_PX.w)) / 0.35))`, with `ease` = cubic out.

- [ ] **Step 4: Run the tests.** → pass.

- [ ] **Step 5: Build the scene.** `plan-extrude-scene.ts`:
  - `export async function createPlan(o: { canvas; host; lite: boolean; getTarget: () => number; still?: number }): Promise<{ kick(): void; resize(): void; dispose(): void; stats(): { progress: number; walls: number } } | null>`
  - **Floor:** a plane of `(PLAN_PX.w/100) × (PLAN_PX.h/100)` units, textured with `plan-a101-1246.webp` (or the widest width in the manifest). Its colours are graded to blueprint by a tiny shader or material: the paper becomes `#0d2616` and the ink green-white.
  - **Walls:** one `InstancedMesh` of boxes. Each wall's position, length and angle come from its segment; its height is `2.7 × wallRise`. Material: gypsum white `0xe9ece8`, roughness 0.85. The tops get a thin orange edge line for the "just framed" read.
  - **Camera:** from plan view (top-down, `[0, 9, 0.01]` → `[0, 0, 0]`) to a 3/4 view (`[-5.5, 4.2, 6.2]` → `[0.4, 0.6, 0]`), eased, as p goes from 0 to 0.7, then holds.
  - **Lighting:** hemisphere + one soft shadow-casting directional light (off in lite) + a RoomEnvironment PMREM.
  - **Render:** only while unsettled. Try-wrapped. Dispose with `forceContextLoss`.

- [ ] **Step 6: Build the component.** `PlanExtrude.astro`:
  - a track of 220vh (180vh small), and a sticky 100svh stage under the header
  - a skip link "Skip to the form" → `#contact-form` (Review Focus 1)
  - two copy stages: the intro (the existing h1 "Start a project. Get a callback." plus its lede), and the finale "Let's build yours." with a `Send a Message ↓` link to `#contact-form` and the phone
  - the FlythroughHero script pattern (h1 links-only `inert`, `goStatic`, `loseContext` probe, dispose on swap, `__nvPlan` dev handle)
  - **Static:** the intro in flow over the flat plan image.

- [ ] **Step 7: `contact.astro`.** Replace the hero with `<PlanExtrude />`. Add `id="contact-form"` to the form section's wrapper. The form markup and script are unchanged.

- [ ] **Step 8: Verify.**
  - `npm test && npm run build`.
  - Playwright on `/contact/` at p = 0, 0.35, 0.7 and 1, at 1440 and 390:
    - flat plan at 0, walls rising, full 3D model by 0.7
    - walls sit on the printed lines (check the screenshot overlap at 0.35)
  - Press Tab from the top: the skip link goes to the form.
  - Fill and submit the form in demo mode: the success animation plays (the existing behaviour).

- [ ] **Step 9: Checkpoint.**

---

### Task 6: Guard, full verification, docs

**Files:**
- Modify: `scripts/verify-3d-bundles.mjs`: `for (const page of ["index.html","projects/index.html","about/index.html","services/index.html","contact/index.html"])` with the eager/three checks, and the "must not reference an immersive chunk" loop dropped (every page is now immersive).
- Modify: `CLAUDE.md`.

- [ ] **Step 1:** Update the guard. Run `npm run build && npm run verify:3d`: all five pages pass with eager ≤ 70 KB gz. `BUDGET_KB=1` → exit 1.

- [ ] **Step 2:** For each of `/about/`, `/services/` and `/contact/`, test three failure modes (Playwright, the same harness as the homepage checks):
  - **reduced motion:** static layout, no tall track, h1 present
  - **no WebGL** (`getContext` → null): static, 0 `inert`
  - **forced mid-build failure** (throw on the first `createShader` after the renderer exists): static, 0 live contexts, the console warning logged

- [ ] **Step 3:** Run a ClientRouter loop on `npm run preview` (:4400): `/` → `/about/` → `/services/` → `/contact/` → `/projects/` → `/about/` → `/`.
  - Expected: each 3D page has 1 canvas and `data-ready`; zero console errors or warnings (Review Focus 5).

- [ ] **Step 4:** Update `CLAUDE.md`:
  - Decision #9 (2026-09-28): the About, Services and Contact 3D centrepieces and the depth layer.
  - The page table rows.
  - The `immersive/` list plus the new data files and `lib/depth.ts`.
  - Motion-table rows for `data-depth-in`, `data-depth-stagger`, `data-flip` and `data-glow`.
  - A gotcha: flip counters replace `data-count` on the same element, and `data-reveal` and `data-depth-in` never share a node.
  - The health check: `npm test` count.

- [ ] **Step 5:** Final regression: `npm test && npm run build && npm run verify:3d && node scripts/verify-srcsets.mjs`. Checkpoint.
