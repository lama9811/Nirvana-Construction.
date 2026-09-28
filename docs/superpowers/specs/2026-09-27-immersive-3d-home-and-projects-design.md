> **Note (2026-09-28):** the A101 floor plan referenced below was a client document sent by mistake. It has been removed from the site, the pipeline and the repository; `/contact/` now uses a plan drawn for the site (`src/data/plan-walls.ts`) and the corridor starts on the first photograph. Mentions below are historical.

# Immersive 3D — Homepage fly-through + Projects corridor

**Date:** 2026-09-27
**Status:** Approved in conversation; awaiting written-spec review
**Supersedes (for `/` only):** the HeroCanvas hero and StudWall3D section from
decision #7 in `CLAUDE.md`.

---

## 1. Intent

The client wants the site to feel "very 3D, very cool — like someone with ten
years of frontend and animation experience built it", not a simple website.

Four throwaway prototypes were built and compared side by side
(A build-a-room, B fly-through, C x-ray wall, D abstract stud field). The user
chose:

- **B — "Fly through a finished building"** for the **homepage**.
- **D — the green stud-field corridor** repurposed as a **3D gallery of the real
  projects** on `/projects/`.
- **Every photograph in `~/Desktop/My works/Website Photos`** is to be used for
  the real projects.

**Success looks like:** a GC or property manager landing on `/` gets a
cinematic, architecture-grade first three seconds and understands the six
trades by the end of the scroll; on `/projects/` they walk past the actual work,
then can still scan and filter every project in a plain grid.

**Out of scope:** `/about/`, `/services/`, `/contact/`, `404` — unchanged.
Project detail pages (Pass 3) — still blocked on data. Copy Pass 2.

---

## 2. Source prototypes (read-only inputs)

Both live in the session scratchpad and are the starting code, not the spec:

| Prototype | Files |
|---|---|
| B | `lab/b-flythrough/src/components/immersive/FlythroughHero.astro` (864 lines), `flythrough-scene.ts` (1304 lines) |
| D | `lab/d-abstract/src/components/immersive/StudField.astro` (685 lines), `studfield-scene.ts` (763 lines) |

They were verified rendering in Chromium at 1440×900 (screenshots taken at
0 / 0.2 / 0.52 / 0.72 / 0.99 of the scroll). The scratchpad is temporary — the
files are copied into the project in step 1 of the plan.

---

## 3. Homepage (`/`) — port of Prototype B

### 3.1 What stays from the prototype

Dusk street → EIFS façade station → doors open and camera flies in → cut-away
wall (framing, blocking, insulation, board, Level 5) → ACT ceiling tiles drop
into the grid → green "Excellence without compromise" feature wall with sectors
and figures → finished lit room looking out to the street, with **Get in Touch**.
Real HTML h1 "The Nirvana Way — Excellence Without Compromise." Station rail on
the right (wide screens), orange progress hairline, credentials bar.

### 3.2 Fixes required before it ships

1. **No overlapping text between stations.** Observed at ~0.9: the sectors
   block and the finale block were both partly visible over each other.
   Replace the independent per-block `data-in`/`data-out` fades with a single
   active-station model: exactly one text block is visible at a time; the
   outgoing block is fully faded before the incoming block starts. Station
   timing lives in **one** place (the scene's `KEYS`/`ANCHORS` exported and
   consumed by the component), removing the duplicated hand-synced values the
   prototype's author flagged.
2. **Light budget.** The prototype uses ~15 dynamic lights. Cap at **8 on
   desktop, 3 on small/touch screens**; street lamps, bollards and downlights
   beyond the budget become emissive meshes + glow sprites (visually the same
   at this distance).
3. **Trades section removed from the homepage.** The six trades are now told
   inside the fly-through, so the existing "Six trades, one subcontractor"
   section in `index.astro` is deleted. The footer's trades column (driven by
   `trades[]`) remains, so the list is still one click from every page.
4. **Pinned labels** stay confined to their station window (already true) and
   gain `aria-hidden` when not active.

### 3.3 Files

- New `src/components/immersive/FlythroughHero.astro` and
  `src/components/immersive/flythrough-scene.ts` (ported, then fixed).
- `src/pages/index.astro`: hero section, `<StudWall3D />` and the trades section
  are replaced by `<FlythroughHero />`; everything else stays.
- `HeroCanvas.astro` and `StudWall3D.astro` become orphaned. **Keep them on disk**
  (the project already keeps parked components) and record them as orphaned in
  `CLAUDE.md`.

---

## 4. Projects page (`/projects/`) — D's corridor as a 3D gallery

### 4.1 Experience

1. **Intro.** The green stud field with the orange laser level, as in D, carrying
   the projects page's own h1 and intro (not the homepage tagline).
2. **The drawing.** The first panel is the **A101 floor plan** (`plan-a101`,
   2.37:1, `grade: none`) presented as "From the drawings" — the corridor walks
   from plan to built work.
3. **Corridor.** The field forms the two stud walls and the camera travels down
   them past **19 photo panels** (list in 4.2), alternating left and right,
   each with an HTML label: project name + mono metadata (index · category ·
   location, location omitted when unknown — same rule as the cards).
   Projects with two photographs show them as a **pair** on the same station.
   Hover: full colour + slight zoom. Click: smooth-scrolls to that project's
   card in the grid below and briefly highlights it.
4. **Finale.** D's "every stud snaps plumb" moment, with a line such as
   "Every one of them plumb." and a **Browse all projects ↓** cue into the grid.
5. **Grid.** The existing filterable grid, filter buttons and CTA stay below,
   unchanged in behaviour. It remains the crawlable, accessible list of all 19
   projects, including the three without photos.

A **"Skip to the list"** link sits at the top of the corridor for keyboard and
impatient users.

### 4.2 Panels — every photograph from `Website Photos`

All 17 files in `~/Desktop/My works/Website Photos` were verified byte-identical
to `assets/source-photos/` and are already processed into
`public/images/projects/`. **No new image processing is required.**

| # | Project | Panel image(s) (manifest slug) | Source width |
|---|---|---|---|
| 0 | *(drawing)* | `plan-a101` | 1246 |
| 1 | ALDI | `aldi` | 680 |
| 2 | Golf Galaxy | `golf-galaxy-night` + `golf-galaxy-day` (pair) | 1524 / 640 |
| 3 | HCPS Forest Hill Annex | `hcps-forest-hill` (old-site photo) | 1600 |
| 4 | Chipotle | `chipotle` | 841 |
| 5 | MACE Medical | `mace-medical` (old-site photo) | 1600 |
| 6 | Flagship Carwash | `flagship-carwash-2` | 628 |
| 7 | F45 Training | `f45-exterior` + `f45-interior` (pair) | 1600+ / 639 |
| 8 | Johns Hopkins | `johns-hopkins` | 1000 |
| 9 | First Watch | `first-watch` + `first-watch-interior` (pair) | 1600+ / 382 |
| 10 | Panda Express | `panda-express` | 1599 |
| 11 | AutoZone | `autozone` | 1200 |
| 12 | Burlington | `burlington` | 574 |
| 13 | Grocery Outlet | `grocery-outlet` | 1536 |
| 14 | Five Below | `five-below` | 808 |
| 15 | O'Reilly Auto Parts | `oreilly` | 259 |

That is 16 stations and **19 photo panels** (the drawing, 12 singles and 3
pairs): all 17 client photographs, plus HCPS and MACE from the old site.

**Excluded from the corridor:** JCC (a blurry upscale, ~30 KB/MP — it stays in
the grid only), and 7-Eleven, Mill Station and DaVita (no photo; placeholder
cards in the grid).

**Card photo change:** the Golf Galaxy grid card switches from the old-site
`golf-galaxy` image to the client's `golf-galaxy-night`.

### 4.3 Resolution-honest panel sizing

Several sources are small (O'Reilly 259px, First Watch interior 382px,
Burlington 574px). A panel's on-screen size is capped so that its texture is
never displayed above ~1.25 texels per CSS pixel at the closest point the
camera passes it. Low-resolution panels are therefore physically smaller in the
corridor rather than upscaled into blur — the same "never upscale" rule as the
image pipeline. Each panel loads the widest webp ≤ 1600px from the manifest
(≤ 800px on small/touch screens).

### 4.4 Data

New `src/data/corridor.ts` — an explicit, ordered, curated list of stations:

```ts
export interface CorridorStation {
  project: string | null;   // Project.slug, or null for the drawing
  photos: string[];         // 1 or 2 manifest slugs
  label?: string;           // override, e.g. "From the drawings"
}
```

It holds data only. Names, categories and locations are looked up from
`projects.ts` by slug so they cannot drift. A build-time check throws if a
station references an unknown project slug or a slug missing from
`image-manifest.json`.

### 4.5 Files

- New `src/components/immersive/ProjectCorridor.astro` and
  `src/components/immersive/corridor-scene.ts`, ported from D and adapted: the
  panel source becomes `corridor.ts`, the pair layout and resolution-honest
  sizing are added, the homepage h1 and CTA are removed, and the click action
  scrolls to a card.
- New `src/data/corridor.ts`.
- `src/pages/projects.astro`: the current hero is replaced by
  `<ProjectCorridor />`, each card gets `id={p.slug}` as its scroll target, and
  the filter and grid are otherwise untouched.
- `src/data/projects.ts`: Golf Galaxy `photo` becomes `golf-galaxy-night`.

---

## 5. Shared requirements (both pages)

- **three.js stays dynamically imported.** Verify after build:
  `grep -c three.module dist/index.html` → 0 and
  `grep -c three.module dist/projects/index.html` → 0. `/about/`, `/services/`
  and `/contact/` must not reference any `immersive` chunk.
- **Scroll source:** each component reads progress from its own wrapper's
  `getBoundingClientRect()`. `src/lib/motion.ts` and its Lenis/GSAP `tick()`
  are **not modified**.
- **Header:** the sticky header height is measured at runtime and used as the
  sticky offset (see the CLAUDE.md gotcha).
- **Render only when needed:** damped progress, and no frames when settled,
  off-screen or the tab is hidden. D's idle shimmer is allowed only while the
  corridor is on screen.
- **Page transitions:** ClientRouter is in use. On `astro:before-swap`, dispose
  the renderer, geometries, materials, textures, PMREM targets, listeners and
  observers, and call `renderer.forceContextLoss()`. Navigating home → projects
  → home five times must not produce "Too many active WebGL contexts".
- **Reduced motion:** there is no tall scroll track; one composed still frame
  plus all the text in normal flow. The corridor's reduced-motion layout is a
  static grid of the station photos (then the normal project grid).
- **No WebGL, or three fails to load:** a static photo fallback (`f45-exterior`
  on `/`, the A101 drawing over the green field on `/projects/`) with the same
  copy.
- **Small/touch screens:** DPR ≤ 1.5, reduced geometry, lighting and instances
  (as in the prototypes). Track length: `/` ≤ 640vh desktop / 560vh small;
  `/projects/` scales with station count — 240vh + 55vh per station desktop,
  200vh + 45vh per station small — because 16 stations cannot fit in 560vh
  without rushing past each photograph.
- **Contrast rules** from CLAUDE.md hold: orange buttons carry the dark ink
  label.
- **Text on the scene** meets 4.5:1 against its local backdrop; add a scrim
  where needed. D's opening paragraph over the bars was hard to read.

### Performance budget

| Page | Eager JS (gz) | Lazy 3D (gz) | Idle cost |
|---|---|---|---|
| `/` | ≤ 70 KB | three (~188) + scene (≤ 25) | 0 frames when settled |
| `/projects/` | ≤ 70 KB | three (shared chunk) + scene (≤ 20) + panel textures | pauses off-screen |

---

## 6. Testing / verification

1. `npm run build` succeeds (6 pages, sitemap emitted).
2. The `three.module` greps in §5 return 0, and `node scripts/verify-srcsets.mjs`
   passes.
3. Screenshots on the dev server, 1440×900 and 390×844:
   - `/` at 0, 0.2, 0.52, 0.72, 0.85 and 0.99. Check that no two text blocks
     are visible at once, and that no stage is blown out or unreadable.
   - `/projects/` at the intro, the drawing, three mid-corridor points and the
     finale, then the grid. Check that every panel appears once, the pairs
     render together, and no panel looks upscaled.
4. Clicking a corridor panel scrolls to the matching card.
5. Reduced motion (Playwright `emulateMedia`) gives the static layouts, with no
   tall empty scroll.
6. With WebGL disabled (launch flag or `getContext` stub), the fallbacks render
   with the h1 and CTA.
7. The ClientRouter loop (home ↔ projects ×5) shows no WebGL-context warnings
   and no console errors other than dev-toolbar 504s.
8. Spot-check `/about/`, `/services/` and `/contact/`: visually unchanged.

---

## 7. Docs

Update `CLAUDE.md` once implemented:
- Decision history #8, recording the four-prototype bake-off and the choices
  (B for home, D as the projects corridor).
- Page table rows for `/` and `/projects/`.
- The orphaned-components list, which now includes `HeroCanvas` and
  `StudWall3D`.
- New gotchas: the station timing source of truth, the corridor panel rules,
  and the WebGL context disposal.
