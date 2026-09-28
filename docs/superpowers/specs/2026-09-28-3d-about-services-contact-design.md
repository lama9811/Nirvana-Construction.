> **Note (2026-09-28):** the A101 floor plan referenced below was a client document sent by mistake. It has been removed from the site, the pipeline and the repository; `/contact/` now uses a plan drawn for the site (`src/data/plan-walls.ts`) and the corridor starts on the first photograph. Mentions below are historical.

# 3D About, Services and Contact

**Date:** 2026-09-28
**Status:** Design approved in conversation ("Yes, build all three"); written spec awaiting review.
**Builds on:** `2026-09-27-immersive-3d-home-and-projects-design.md` (same rules, same patterns).

---

## 1. Intent

The user loves the homepage fly-through and the projects corridor. About, Services and
Contact now feel "pretty basic" by comparison. They want these pages to be "very modern
3D animation", in the same world as `/` and `/projects/`.

**Success:** every page on the site has a 3D centrepiece that explains something real
about Nirvana (not decoration), and the rest of each page moves with depth instead of
flat fades. Speed, accessibility and fallbacks stay at the level `/` and `/projects/`
already meet.

**Out of scope:** copy rewrites (Pass 2), the contact form backend (`FORM_ENDPOINT`), and
new data. Every word already on these pages stays unless a section is replaced below.

---

## 2. Page designs

### 2.1 Services: "The exploded wall"

- **Hero.** The Concept C prototype (`lab/c-xray`, verified in the four-way bake-off),
  ported like B and D were: `XrayWall.astro` + `xray-scene.ts` + `xray-textures.ts`, moved
  into `src/components/immersive/`.
- **Scroll sequence.** A finished Level 5 wall fills the screen with the page h1. An x-ray
  scan follows, then the wall explodes into 9 labelled layers (EIFS finish, EIFS board,
  sheathing, insulation, 6" studs at 16" o.c., 2x6 blocking, 5/8" Type X board, Level 5
  finish, ACT grid). It holds, reassembles, and ends on the CTA. Callout text comes from
  `trades[]`.
- **h1:** keeps the current Services h1, "Commercial framing & drywall, end to end." The
  prototype's homepage tagline is removed.
- **Rest of the page:** the trades 01–06 detail sections, sectors, process, scope grid,
  client logos and contact card all stay, with the shared motion from §3.
- **Timing:** the stage windows move into a pure `xray-timeline.ts` with the same
  `stageOpacity` rule and tests as the homepage (never two stages visible at once).

### 2.2 About: "Built from the ground up"

- **Hero, a new three.js scene (`logo-build-scene.ts`).** The Nirvana logo mark is
  rebuilt in 3D, in galvanised steel on a concrete slab. As the visitor scrolls:
  1. The four building bars rise **stud by stud**. Each bar is a stack of C-studs at its
     real relative height, taken from the logo proportions.
  2. The **swoosh** sweeps around the base as a green ribbon (a tube along an elliptical
     arc), drawn in like a chalk line snapping.
  3. The camera orbits 120°. The About h1 and intro sit on the left.
  4. The scene ends on "Excellence Without Compromise" beside the finished mark.
- **Service area section: a 3D Maryland map (`maryland-scene.ts`).**
  - An extruded Maryland outline (a simplified polygon stored in
    `src/data/maryland-outline.ts`) tilts in from flat as the section enters.
  - A pin rises at each city the page already lists, from real lat/lon in
    `src/data/service-area.ts`. Nottingham HQ pulses orange.
  - Hovering or focusing a city in the existing HTML list lifts its pin.
  - The HTML city list stays as the accessible and crawlable content.
- **Rest of the page:** "Who we are", counters, the Nirvana Way band and the
  certification plaque stay, with the shared motion from §3. Counters become flip digits.

### 2.3 Contact: "From the drawings"

- **Hero, a new three.js scene (`plan-extrude-scene.ts`).**
  - The A101 floor plan (`plan-a101`) lies flat as a textured slab.
  - On load, and then scrubbed by a short scroll, its walls **extrude up out of the
    drawing's own wall lines** while the camera tilts from plan view to a 3/4 view. The
    walls are a hand-traced list of segments in drawing pixels
    (`src/data/a101-walls.ts`), so they sit exactly on the printed lines.
  - The copy ends on "Let's build yours", with the contact h1 kept.
- **Form:** unchanged in behaviour (honeypot, validation, animated success, FORM_ENDPOINT
  swap point). It gains depth: a card that tilts subtly with the cursor, and fields that
  lift on focus. No 3D inside the form. It must stay fast and usable.
- **Sidebar info cards:** tilt-in with the shared motion.

---

## 3. Shared 3D motion (all three pages)

A new declarative module, `src/lib/depth.ts`, runs on `astro:page-load` like
`motion.ts`. It does not modify `motion.ts`.

| Attribute | Effect |
|---|---|
| `data-depth-in` | The section or card enters with a perspective tilt-in (`rotateX(18deg) translateZ(-120px)` → rest, 900 ms expo-out), triggered once by an IntersectionObserver. Children with `data-depth-stagger` cascade 70 ms apart. |
| `data-flip="42" data-suffix="+"` | Odometer counter: each digit is a 3D drum that rolls to its value when it enters view. |
| `data-glow` | A cursor-following light (radial highlight) plus a gentle 3D tilt on hover, the same language as the nav pill. Mouse only. |

- **Reduced motion:** everything renders in its final state, with no transforms and no
  observers.
- **No JavaScript:** content is visible (the CSS start state applies only under
  `.js-depth` on `<html>`, which the module sets).

---

## 4. Rules (inherited, non-negotiable)

- three.js only through dynamic `import()`. `npm run verify:3d` is extended to
  `about/`, `services/` and `contact/`: no `three.module` in the eager graph, and eager JS
  of 70 KB gz or less on every page.
- Each scene is built inside `try`. A throw means dispose, `forceContextLoss`, and the
  static fallback. WebGL probes release their context. `astro:before-swap` disposes
  everything.
- Every fallback leaves nothing `inert` and nothing hidden: one `goStatic()` per
  component.
- **Heroes** slide under the transparent header (`margin-top: -hdr`, sticky `top: 0`,
  `100svh`), the same as `/` and `/projects/`. Static layouts stay in normal flow.
- **Small/touch screens:** DPR ≤ 1.5, reduced geometry, shorter tracks.
- **Reduced motion:** one composed still frame plus all the copy.
- **Idle:** loops stop when settled or off-screen. Any idle shimmer stops 20 s after the
  last input.
- The page h1 stays in the accessibility tree after it fades (only its links go inert).
  Faded stages are `inert`.
- **Contrast:** orange fills carry the dark `#0a1f14` label.
- **Voice:** conversational ("Let's build yours", "Get in Touch"), "We…" sentences.

**Scroll track lengths:**

| Page | Desktop | Small screens |
|---|---|---|
| Services | 520vh | 440vh |
| About | 380vh | 320vh |
| Contact | 220vh | 180vh |

Contact's is deliberately short, because the form must be reachable fast.

---

## 5. Testing / verification

1. `npm test`: new pure-module tests.
   - `xray-timeline` and `logo-build` timeline: never two stages visible at once;
     monotonic keys.
   - `a101-walls`: every segment lies inside the drawing bounds, has non-zero length, and
     there are at least 12 of them.
   - `service-area`: every city in the About list has coordinates inside Maryland's
     bounding box, and HQ is flagged.
   - `depth`: the digit list for flip counters (`"19+"` → drums `1`, `9` and suffix `+`).
2. `npm run build`, `npm run verify:3d` (now covering all five pages), and
   `node scripts/verify-srcsets.mjs`.
3. Playwright on the dev server at 1440×900 and 390×844.
   - Each hero at 4–6 scroll points: one text block per frame, readable copy, no clipping
     under the pill nav.
   - The Maryland map with pins, and its hover link to the list.
   - Contact: the walls sit on the drawing's lines, and the form submits in demo mode
     (existing success animation).
4. Reduced motion, no-WebGL and a forced mid-build failure on each page: static layout,
   0 `inert`, 0 live contexts after the failure.
5. A ClientRouter loop through all five pages on `npm run preview`: one canvas per 3D
   page, zero console errors.

---

## 6. Docs

Update `CLAUDE.md`:

- Decision history #9.
- The page table rows for About, Services and Contact.
- `immersive/` file list, `lib/depth.ts`, and the new data files.
- The `data-depth-in` / `data-flip` / `data-glow` rows in the motion table.
