# CLAUDE.md — context for continuing this project

A short brief so a future Claude Code session (or a teammate) can pick this up
without rereading every file.

---

## What this is

The new marketing website for **Nirvana Construction Inc.** — a commercial
drywall and metal-stud framing **subcontractor** in the Greater Baltimore
region (Nottingham, MD). Replaces the half-finished WordPress site at
<https://nirvanaconstruction.net>.

The site is a 5-page Astro static build with React islands for interactive
motion, a Material-Design-inspired token palette (Google Stitch handoff
re-implemented in Tailwind v4), and Lenis + GSAP-driven scroll motion layered
on top via a declarative data-attribute system.

## Stack & commands

Astro 6 (static) · Tailwind CSS v4 (`@tailwindcss/vite`, NO CDN) · GSAP +
ScrollTrigger · Lenis smooth scroll · sharp (image pipeline) · TypeScript.

**No web fonts and no icon font are fetched from Google.** All three typefaces
are self-hosted from `/public/fonts`, and the 17 icons are inline SVG via
`src/components/Icon.astro`.

React 19 / three.js are still in `package.json` but **no rendered page imports
them** — they exist only for the parked components in `src/components/scroll/`.
The build still emits an orphaned `dist/_astro/client.*.js` (~189 KB) that no
HTML references, so visitors never download it.

```bash
npm install              # deps
npm run fetch-images                      # processes assets/source-photos (skips done work)
npm run fetch-images -- --force           # re-process the LOCAL set
npm run fetch-images -- --manifest-only   # rebuild src/data/image-manifest.json only
# ⚠ NEVER pass --refetch-remote (see Gotchas: the WP origin is degraded)
npm run dev              # http://localhost:4321  (or 4322 if 4321 is in use)
npm run build            # static output → ./dist
npm run preview          # preview the production build
```

Vite is pinned to `^7` via `package.json` → `overrides` (Astro 6 doesn't
work with the Vite 8 npm pulls). Don't remove that.

## The 5 pages

| Route | File | What it does |
|---|---|---|
| `/` | `src/pages/index.astro` | **`FlythroughHero`** — immersive 3D dusk fly-through (street → EIFS façade → through the doors → cut-away wall: framing/blocking/insulation/board → ACT ceiling → sectors feature wall → finished room + Get in Touch), **GC marquee (hidden until data exists)**, "Nirvana Difference" dark band: the three points as glass cards, the lede lighting word by word, and **the wall** (2026-09-28): three site boards with real thickness hung on a CSS stud frame with a laser line, (the orange 19+ block was removed at the client's request), the whole assembly a `data-stack` that turns with scroll and leans to the cursor; then the **certifications marquee**. (The closing CTA band was removed at the client's request, 2026-09-28.) The separate six-trade section was removed — the trades are told inside the fly-through. |
| `/about/` | `src/pages/about.astro` | **`LogoBuild`** — the Nirvana mark built in 3D from steel studs (chalk layout → studs bar by bar → green cladding → swoosh ring), "Who we are" 2-col, **flip-digit** stat counters, "Nirvana Way" dark band, certification plaque, service area with a **3D Maryland map** (`MarylandMap`: real outline, a pin per listed city, Nottingham HQ pulsing; hovering/focusing a city in the list lifts its pin), CTA. **The team/leadership section was removed** per client brief. |
| `/services/` | `src/pages/services.astro` | **`XrayWall`** — the exploded wall (finished Level 5 face → x-ray → 9 labelled layers covering the 6 trades → reassembled), then four motion sections in `src/components/services/`: **`TradeDeck`** (pinned, scroll-scrubbed 3D coverflow of the six trades; chips / arrows jump to a trade; maths in `lib/card-deck.ts`), **`SectorDrift`** (two rows of sector cards drifting opposite ways on a tilted 3D plane, pause on hover), **`ProcessPath`** (a line draws with scroll and each phase card swings up in 3D as it is reached), **`ScopeDrum`** (the 11 scope items rolling on a 3D drum, centre row lit; maths in `lib/drum.ts`), then the certification band. No numbering anywhere (the client finds it "looks very AI"). |
| `/projects/` | `src/pages/projects.astro` | **`ProjectCorridor`** — a jobsite corridor walked past **15 stations / 18 photographs** (`src/data/corridor.ts`). Rebuilt 2026-09-28 (the client: "a green background and rods sticking up"): it opens at eye level on a concrete slab with the studs delivered in piles along each wall; a wave runs down the corridor standing them up on the chalk layout; then the acoustical ceiling grid with lit troffers comes on and 4 ft wallboard and batts hang on the bays a few strides ahead of the camera as it walks (`corridor-scene.ts`: FLOOR / CEIL / SHEET shaders). Clicking a photo scrolls to its card. Then category filter, **19-project** grid (cards carry `id={slug}`, `data-rise`, flip out/in on filter, a dark blueprint panel for projects without a photo), CTA |
| `/contact/` | `src/pages/contact.astro` | **`PlanExtrude`** — a floor plan drawn for the site (`src/data/plan-walls.ts`; the client's A101 drawing was sent by mistake and removed everywhere, 2026-09-28) printed as a blueprint whose walls rise out of their printed lines ("Let's build yours."), sidebar info cards as rising slabs (`data-rise` + `.ct-slab`; the green certification card was removed at the client's request, 2026-09-28), full quote form on a slab that stands up as it arrives, fields rolling up in a wave, fields lift on focus, no cursor tilt; on send the form turns over and the reply is on its back, `FORM_ENDPOINT` swap point at the top of the page. The site "Skip to" link here targets `#contact-form`. |

### Three content tiers (do not conflate them)

`src/data/services.ts` exports three distinct things:

1. **`trades`** — the six trades self-performed, **taken from the logo**:
   Drywall · Metal Framing · Acoustical Ceilings (ACT) · Insulation ·
   Rough Carpentry · EIFS. Four of these were missing from the site before
   2026-09-17 even though the logo advertises them.
2. **`services`** — the six commercial *sectors* (markets) served.
3. **`scopeOfWork`** — the 11-item detailed capability grid.

## Where things live

```
src/
  layouts/BaseLayout.astro     shell, SEO, ClientRouter, Header, Footer, motion
                               init, font preloads (NO Google Fonts)
  components/
    Header.astro                frosted-glass nav, logo, click-to-call
    Footer.astro                4-col; services column is driven by trades[]
    Icon.astro                  NEW - 17 inline-SVG icons, em-sized, currentColor
    Marquee.astro               NEW - running strip; renders nothing when empty
    ProjectImage.astro          NEW - <picture> with srcset from the manifest
    immersive/                  LIVE 3D (vanilla three.js, dynamic import only)
      FlythroughHero.astro        homepage hero: copy, overlays, scroll loop
      flythrough-scene.ts         its three.js scene (light budget: ≤8 / ≤3 lite)
      flythrough-timeline.ts      PURE: camera keys, anchors, stage windows — the
                                  ONE source of homepage timing (unit-tested)
      ProjectCorridor.astro       /projects/ hero: copy, labels, loop, fallbacks
      corridor-scene.ts           its three.js scene (instanced stud field)
      XrayWall.astro              /services/ hero (+ xray-scene.ts, xray-textures.ts)
      xray-timeline.ts            PURE: its copy windows + HUD chapters
      LogoBuild.astro             /about/ hero (+ logo-build-scene.ts)
      logo-build-timeline.ts      PURE: stages, bar rise, swoosh, camera keys
      MarylandMap.astro           /about/ service-area map (+ maryland-scene.ts)
      PlanExtrude.astro           /contact/ hero (+ plan-extrude-scene.ts)
      stage-fade.ts               PURE: the one fade rule every component uses
    HeroCanvas.astro            ORPHANED (was the homepage hero until 2026-09-27)
    StudWall3D.astro            ORPHANED (was the homepage 3D wall)
    SEO.astro                   (untouched)
    HeroMotif.astro             used by 404.astro only
    CTASection / Logo / ProjectCard / ServiceCard / StatBand / GrainOverlay /
    Reveal                      ORPHANED - not referenced by any page
    scroll/                     PARKED cinematic components (not rendered)
  lib/
    motion.ts                   Lenis + GSAP backbone + declarative hooks
    depth.ts                    depth layer: data-depth-in / data-flip / data-glow
    images.ts                   NEW - srcsetFor / dimensions / isLowRes
    corridor.ts                 PURE corridor logic: resolveStations,
                                honestPanelWidth, stationProgress, phases
  data/
    company.ts                  contact, address, cert, nav, figures,
                                + certifications[] and generalContractors[] (EMPTY)
    services.ts                 trades[] (6, from the logo) + services[] (6 sectors)
                                + scopeOfWork[] (11)
    projects.ts                 19 projects; `location` is OPTIONAL
    corridor.ts                 15 curated corridor stations (data only)
    logo-mark.ts                the logo's bars/flaps/swoosh, measured from logo.png
    maryland-outline.ts         real MD outline (299 pts, public boundary data)
    service-area.ts             the About cities with lat/lon; project()
    plan-walls.ts               a generic fit-out plan drawn for the site (no client drawing)
    image-manifest.json         GENERATED - real widths of every processed image
  pages/  index about services projects contact 404 .astro
  styles/global.css             Tailwind import + @theme tokens + utilities

assets/source-photos/           NEW - the 17 client originals (pipeline input)

public/
  logo.png logo.webp logo@2x.webp
  fonts/                        space-grotesk-*, inter-*, JetBrainsMono-*,
                                plus unused Clash/Switzer (no longer declared)
  images/
    projects/                   processed display images, webp + avif per width
    textures/                   texture variants (parked components)
  favicon.svg  robots.txt
scripts/fetch-images.mjs        pipeline; also writes src/data/image-manifest.json
scripts/verify-3d-bundles.mjs   post-build guard: no eager three, JS budget
tests/                          node --test unit tests (Node 24 runs .ts natively)
docs/superpowers/               design spec + reference teardown
```

## Design system (current — light Material-style)

### Color tokens (defined in `src/styles/global.css` `@theme`)

**The palette is derived from the logo itself.** Measured from
`public/logo.png`: **#009933** green (hue 140, 54–64% of logo pixels) and
**#FF6600** orange (hue 24, 21–23%). Both hues are held exactly and the literal
logo hex sits at the `500` step of each scale.

| Token | Hex | Use | Contrast on white |
|---|---|---|---|
| `green-50` | `#f2f8f4` | tinted wash surface | — |
| `green-100` | `#daf1e2` | chip / hairline tint | — |
| `green-500` | **`#009933`** | logo green — rules, active, large type | 3.75:1 (large only) |
| `green-600` | `#00852c` | green at body text size | 4.78:1 ✓ |
| `green-700` | `#006622` | links, hover, `--color-primary` | 7.18:1 ✓ |
| `green-900` | `#052911` | dark section bands, `--color-on-background` | 15.77:1 ✓ |
| `green-950` | `#051a0c` | deepest band | 18.11:1 ✓ |
| `orange-500` | **`#ff6600`** | logo orange — CTA fill, accents | needs a DARK label |
| `orange-600` | `#853500` | orange at text size, `--color-secondary` | 8.38:1 ✓ |
| `ink` | `#0a1f14` | body text (green-tinted near-black) | 17.23:1 ✓ |
| `hairline` | `#c7d6cc` | 1px rules and borders | — |

The Material-style semantic names (`--color-primary`, `--color-surface`,
`--color-on-background`, `--color-secondary-container`, …) are **kept and
re-pointed** at the values above, which is how the whole site moved onto the
logo palette without editing every template. The unused Material tokens
(tertiary, error, most `*-fixed` variants) were deleted; `primary-fixed`,
`secondary-fixed`, `on-primary-fixed` and `on-secondary-fixed` were kept
because they are genuinely referenced.

**Brand rule of thumb:** green is the primary brand, orange is action. Dark
bands use `green-900`/`green-950` — derived from the logo hue, not a navy.

### Spacing tokens

`--spacing-{xs,sm,base,md,lg,gutter,xl,xxl,container-max}` = 4 / 8 / 8 / 16 /
24 / 24 / 32 / 64 / 1280 px. Used as `p-lg`, `gap-gutter`, `py-xxl`,
`max-w-container-max`, etc.

### Typography

All self-hosted from `/public/fonts`. **Zero Google Fonts requests.**

- **Display + UI**: `Space Grotesk` — weights 500 / 600 / 700
- **Body**: `Inter` — weights 400 / 500 / 600
- **Micro-labels + numerals**: `JetBrains Mono` 400 — this is what carries the
  metadata eyebrows (`.label-mono`, `.label-mono-light`, `.label`)
- **Icons**: inline SVG, `src/components/Icon.astro` (17 glyphs). The Material
  Symbols variable font is gone — it was a ~200 KB render-blocking request
  serving 17 glyphs.
- `Clash Display` / `Switzer` remain on disk but are **no longer declared** in
  CSS. Re-add the `@font-face` rules to revive the cinematic variant.

Only `space-grotesk-700`, `inter-400` and `JetBrainsMono-Regular` are
`<link rel="preload">`-ed in `BaseLayout.astro`.

### Type scale

A new **fluid display tier** was added with proportional negative tracking —
the one move shared by every modern reference studied (HBA, Magma, Dieste):

```
text-display-xl   clamp(2.75rem, 7vw, 6rem)      700  -0.04em
text-display-lg   clamp(2rem, 4.5vw, 3.5rem)     700  -0.03em
text-display-md   clamp(1.5rem, 2.5vw, 2.25rem)  600  -0.02em
text-label-mono   11px  /  0.14em  /  uppercase
```

There is a deliberate gap between `display-md` and `headline-md`: metadata is
tiny, body is comfortable, display is large, and nothing in between competes.

The older Stitch scale (`--text-{headline-xl,headline-lg,headline-lg-mobile,headline-md,body-lg,body-md,body-sm,label-bold,button}`)
is retained so the existing pages keep working.

## Motion system (`src/lib/motion.ts`)

Single declarative module. Initialised on every `astro:page-load`, torn down
on `astro:before-swap`. Lenis smooth scroll is bridged with GSAP ScrollTrigger
(do NOT touch the `tick()` handler or you'll desync them).

**Data attributes any page can use:**

| Attribute | Effect |
|---|---|
| `data-reveal` | Single-fire fade-up when element scrolls into viewport (also accepts `.reveal` class) |
| `data-parallax="0.25"` | Element translates Y as you scroll (range = ±speed × 50%) |
| `data-count="10" data-suffix="+"` | Number scrubs up `0 → 10` as element enters viewport; non-numeric values typewriter-reveal |
| `data-tilt` | 3D mouse-tilt with perspective on hover (disabled on touch + reduced-motion) |
| `data-magnetic` | Button tugs toward cursor in ~120px radius |
| `data-words [data-delay="0.1"]` | Wraps each word in a span and staggers them rising on first paint (used on hero h1s) |
| `data-depth-in` (+ `data-depth-stagger`) | **depth.ts** — perspective tilt-in on first view; with stagger, the children cascade 70 ms apart. Tab focus inside forces it visible. |
| `data-flip="19+"` | **depth.ts** — odometer: digits roll on drums, non-digits sit still; a visually-hidden copy is what screen readers get. Replaces `data-count` on the same element. |
| `data-fan` | **depth.ts** — with `data-depth-in data-depth-stagger`: on ≥768px the cards wait stacked on the middle one, then deal out into their columns (About "Nirvana way"). |
| `data-stack` + children `data-z style="--z:N"` | **depth.ts** — a layered 3D group that turns as it scrolls by (`drum.ts` `stackTilt`) and leans toward the cursor; nested columns need `.stack-3d`. Homepage "Nirvana Difference" photos, About "Who we are" photos. |
| `data-rise` / `data-rise="top"` | **depth.ts** — lies back into depth below mid-screen and stands up flat as it arrives (`drum.ts` `risePose`); grid siblings lag by column so a row rolls up as a wave. `top` judges by the element's top (for tall elements). Sets `--rise-*` per frame; never combine with `data-depth-in` on the same node. |
| `data-scrub` | **depth.ts** — text-only block whose words light in reading order as it scrolls up (`drum.ts` `scrubLit`). About "Who we are". |
| `data-glow` / `data-glow="light"` | **depth.ts** — cursor light + gentle 3D tilt, mouse only; `light` = faint green for white cards. Never on the contact form. |

All effects degrade fully under `prefers-reduced-motion: reduce` (counter
values jump straight to final, parallax/tilt/magnetic/words all skip).

## Header / nav

**Floating capsule nav** (`src/components/Header.astro`, 2026-09-27, modelled
on a reference video the user supplied). A dark gunmetal pill floats inside a
**transparent, click-through sticky header**: chrome rim (masked gradient
ring), cursor-following spotlight (mouse only), **no logo in the pill** (a
logo badge was tried and removed at the user's request, 2026-09-28 — the
brand now lives on the homepage's 3D building sign, painted from
`public/logo.png`), links whose label **rolls up** on hover with a dash under the hovered / current
page (orange = current), and a round click-to-call button (the "Let's talk"
pill was removed at the client's request). The capsule tightens after 40px of scroll. Mobile: the
pill shrinks to a round burger docked right → dark rounded panel with
numbered links.

- **The header box keeps its height: 5rem mobile / 5.5rem desktop.** Both 3D
  heroes slide up under it by exactly that (`margin-top: calc(var(--hdr) * -1)`,
  sticky `top: 0`, `100svh`) so the pill floats over the 3D; their static /
  reduced-motion layouts stay in normal flow. Other pages show the page
  background behind the pill.
- The old frosted-glass bar (`.frost-nav`) is gone.
- Header listeners are torn down on `astro:before-swap` (the header is swapped
  on every ClientRouter navigation).

## Voice & copy guidelines

- **Conversational, not transactional**: "Get in Touch", "Talk to Us", "Let's
  talk", "Send a Message" — never "Request a Quote", "Get an Estimate",
  "Schedule a Consultation". The header has **no CTA pill** (a "Let's talk ↗"
  pill was added 2026-09-27 and removed 2026-09-28 at the client's request);
  just the links (Contact among them) and a round click-to-call button on
  ≥1024px.
- **Flowing sentences, not bullet-style fragments**: "We coordinate with the
  GC, work to the drawings, and finish ready for inspection so every plate is
  plumb…" (not "Plates plumb. Studs on layout. Drywall clean.")
- **Subject + verb + reason**: every body sentence starts with "We" or "Our
  team" / "Our frames" and ends with the outcome.
- **Real services + real projects only**: no Apex Plaza Frankfurt nonsense.
  See `src/data/services.ts` and `src/data/projects.ts`.
- **Brand tagline**: "The Nirvana Way — Excellence Without Compromise."
  (`company.slogan` + `company.sloganPayoff` + combined `company.tagline`.)
  The retired tagline was "Built to the line." — it survives only in the parked
  `src/components/scroll/Preloader.tsx`, which is not rendered.
- **Cert string**: `DBE / MBE / SBE Certified · Cert. No. 22-204`.

## Decision history (so you don't relitigate)

This session iterated through several visual directions:

1. **Cinematic blueprint** (initial commit) — warm cream + emerald + flare
   orange, Clash Display + Switzer + JetBrains Mono, three.js procedural
   metal-stud StructureScene on hero. **Rejected by user** — too static, then
   too over-the-top, then "ugly" once a different attempt was tried.
2. **Jack 3D Creator template port** — dark Kanit theme. Built, then user
   said "scratch it" — rolled back to cream + landing photo.
3. **Phase A/B/C cinematic scroll** — preloader, horizontal-pin projects,
   services deck, approach reveal, scope magnify, CTA marquee, custom cursor,
   section-index chip, scroll progress hairline. Built fully. Components
   parked in `src/components/scroll/` — NOT currently rendered, but easily
   revivable.
4. **Google Stitch handoff (CURRENT)** — Material-style Tailwind v4 tokens,
   Montserrat + Inter (later swapped for Space Grotesk + Inter), white
   surfaces with green/orange accents, no scroll-pinning. User confirmed "I
   like this one."
5. **Motion + 3D layer on top of Stitch (CURRENT)** — re-added Lenis smooth
   scroll + the declarative motion system above, sprinkled `data-parallax`,
   `data-tilt`, `data-magnetic`, `data-words`, `data-count`, `data-reveal`
   across all 5 pages. Frosted-glass nav added last.

6. **Logo-derived brand rebuild (CURRENT, 2026-09-17)** — client brief
   (photographed notes) drove: tagline -> "The Nirvana Way — Excellence Without
   Compromise", palette re-derived from the **logo hex** (#009933 / #FF6600),
   wording to be reworded toward **HDL Construction**, leadership section
   removed, and two running strips (GCs, certifications). The client named four
   references: HBA.com, Magma.build, a "yak website", HDL Construction.
   `hdlconstruction.com` is a **direct competitor** — commercial drywall and
   metal framing in Essex MD — and is the closest structural model.
   Also: six trades surfaced from the logo, 9 new projects added from supplied
   photography (19 total), fonts self-hosted, Material Symbols replaced with
   inline SVG, and the image pipeline rebuilt around a generated manifest.
   Teardown: `docs/superpowers/research/2026-09-17-reference-teardown.md`
   Spec: `docs/superpowers/specs/2026-09-17-logo-brand-rebuild-design.md`

7. **Reference-faithful hero + purposeful 3D (2026-09-18 — SUPERSEDED on `/` by #8)** — the
   client pushed back that nothing resembled the reference sites and asked
   for "3D graphics or the 3D hero effect" from them.

   **Finding: eladiodieste.com's hero is NOT 3D.** Inspected live: one 2D
   canvas (a WebGL context request returns null), DPR-2 backing store,
   `absolute inset-0` over the hero, painting warm brick photography. It does
   not animate when idle, repaints on scroll, and returns to the same pixels
   when scrolled back to 0 — i.e. a scroll-scrubbed photo sequence with a
   slow dolly, drawn to canvas for sub-pixel smoothness. Its frames are
   `bg.webp` / `inf-1..4.webp` at 2000px. Magma.build has no canvas at all.

   So the admired effect was a cinematic canvas treatment, not geometry.
   Implemented as `HeroCanvas.astro`, plus Dieste's split giant wordmark
   anchored to opposite corners and a hairline rule carrying the real h1.

   Real 3D was then put where it communicates something a photograph
   cannot: `StudWall3D.astro`, a metal-stud wall that assembles itself as
   you scroll — track, studs at 16" o.c., insulation, board, Level 5 finish.
   `StructureScene.tsx` (the rejected R3F scene) was deliberately NOT
   revived: it is decorative and it drags in React.

8. **Four-prototype bake-off → immersive 3D (CURRENT, 2026-09-27)** — the
   user asked for a site that is "very 3D, very cool, like 10 years of
   frontend + animation experience". Four throwaway prototypes were built in
   parallel and compared side by side: A build-a-room trade by trade,
   B fly-through a finished building, C x-ray / exploded wall, D abstract
   stud field. **The user chose B for the homepage and D as a 3D gallery of
   the real projects.** All 17 client photographs (`~/Desktop/My works/Website
   Photos`, byte-identical to `assets/source-photos/`) appear in the corridor.
   Spec: `docs/superpowers/specs/2026-09-27-immersive-3d-home-and-projects-design.md`
   Plan: `docs/superpowers/plans/2026-09-27-immersive-3d-home-and-projects.md`

9. **3D About / Services / Contact (CURRENT, 2026-09-28)** — the user loved
   `/` and `/projects/` and found the other pages "pretty basic". Services
   got Concept C (the exploded wall) from the bake-off; About got the logo
   built from steel studs plus a real 3D Maryland map; Contact got a floor
   plan extruding into 3D. A shared depth layer (`lib/depth.ts`) adds tilt-ins,
   flip counters and cursor glow to the content sections.
   Spec: `docs/superpowers/specs/2026-09-28-3d-about-services-contact-design.md`
   Plan: `docs/superpowers/plans/2026-09-28-3d-about-services-contact.md`
   **Then (same day), at the user's request, those three heroes stopped being
   scroll-driven and became background videos:** each 3D scene plays on its
   own via `immersive/loop-clock.ts` (ping-pong: play, hold, reverse, hold —
   no jump cut) behind a static headline, one viewport tall, no scroll track.
   The homepage fly-through and the projects corridor stay scroll-driven.

If user wants the cinematic experience back, the parked components in
`src/components/scroll/` can be re-imported on a per-page basis. The motion
backbone in `src/lib/motion.ts` already supports both styles.

## Open items / todo

1. **GC names for the marquee — BLOCKING.** `generalContractors` in
   `src/data/company.ts` is **deliberately an empty array**, and the whole
   homepage band is conditional on it, so nothing renders. Naming a GC the
   company has not worked for would be a misrepresentation. Add
   `{ name: "…" }` entries and the band appears by itself.
2. **Full certification list.** `certifications` holds only DBE / MBE / SBE and
   Cert. No. 22-204. The brief asked for "all our certifications". Four items is
   a short marquee loop, so `index.astro` currently feeds the list twice; remove
   that doubling once there are six or more real entries.
3. **Contact form endpoint** — `FORM_ENDPOINT` at the top of
   `src/pages/contact.astro` is still `""` (demo mode). Drop in a Formspree ID
   or add `data-netlify="true"` on deploy.
4. **Every project has a photo** — 7-Eleven, Mill Station and DaVita were
   REMOVED 2026-09-28 by the owner (show only projects with client-supplied
   photos). Old note, kept for how to add one: they rendered as
   `apartment`-icon placeholder cards. Drop a file in `assets/source-photos/`,
   add it to `LOCAL` in `scripts/fetch-images.mjs`, run the pipeline, then set
   `photo` in `src/data/projects.ts`.
5. **Locations unknown for 7 of the new projects** — `location` is now
   **optional** on `Project` and the card omits the line rather than printing a
   guess. AutoZone, Burlington, F45, First Watch, Five Below, O'Reilly and
   Panda Express need real locations.
6. **Three committed images are blurry upscales** and cannot be regenerated
   (see Gotchas). Measured KB-per-megapixel: `jcc` 30, `flagship-carwash` 22,
   `jobsite-01` 32, `jobsite-07` 49 — against ~150 for genuine detail. Still
   used on `/projects/`; replace when real photography arrives.
7. **Copy rewrite (Pass 2)** — the client asked for most wording to be reworded
   toward HDL Construction's voice. Only the new hero, trades and marquee copy
   is written that way so far; `/about/`, `/services/`, `/projects/` and
   `/contact/` still carry the older copy.
8. **Project detail pages (Pass 3)** — `/projects/` cards say "View Details" but
   link nowhere. Needs GC / size / year / scope data first.
9. **Deployment** — not yet hosted. Netlify recommended. Bring the
   `nirvanaconstruction.net` domain.
10. **Logos + more photography** promised by the client "next week" — keep the
    image slots swappable.

## Gotchas / things to know

- **⚠ NEVER run `npm run fetch-images -- --refetch-remote`.** The old WordPress
  origin has been **downgraded at source** and now serves far smaller files than
  the versions committed here — `flagship-carwash` comes back 225×225 and
  `jcc` 348×263, against the 1600px originals in git. The committed copies in
  `public/images/projects` are now the only good versions. If they ever get
  overwritten: `git checkout -- public/images/`. The remote group is skipped by
  default for exactly this reason.
- **White text on the logo orange FAILS WCAG.** `#FF6600` against white is
  **2.94:1** at every size. Orange fills must carry the dark ink label
  (`text-on-secondary-container` = `#0a1f14`, 5.87:1). This applies to
  `.btn-primary`, the skip-link, the orange stat tile and any
  `hover:bg-secondary-container`. Conversely `bg-primary` (`#006622`) is dark
  and **keeps a white label** (7.18:1) — do not "fix" that one to ink.
- **`#009933` is large-text-only** on white (3.75:1). For green at body size use
  `green-600`; for links use `green-700`.
- **srcsets are generated, never hand-written.** `src/data/image-manifest.json`
  is produced by the pipeline by measuring the files actually on disk, and
  `src/lib/images.ts` + `src/components/ProjectImage.astro` build every srcset
  from it. This exists because the old hero advertised `jobsite-08.webp 2000w`
  for a file the pipeline only ever wrote at 1600px. After adding images run
  `npm run fetch-images -- --manifest-only`.
- **The pipeline never upscales.** A 3:2 crop is bounded by the source *height*
  as well as its width, so a 360×173 source honestly maxes out at 259px wide,
  not 360. Output lines print `[source WxH → honest max Npx]` when clamped.
- **The two F45 photographs are counter-intuitively named at source.**
  `F45_Training 1.jpg` (5623px) is the **exterior**; `F45-Training.jpg` (640px)
  is the **interior**. They are stored under slugs matching what they show.
- **Tailwind v4 spacing-token collision**: defining `--spacing-{xs,sm,md,lg,xl}`
  in `@theme` overrides `max-w-{xs,sm,md,lg,xl}` to those tiny values. Use
  **bracket syntax** for all paragraph max-widths: `max-w-[28rem]`,
  `max-w-[32rem]`, `max-w-[36rem]`. The `--container-*` tokens in global.css are
  nominal only — bracket syntax is the durable fix.
- **`text-on-surface-variant` is DARK** (`#3f5247`). Don't use it on dark
  bands — use `text-white/80` or `text-surface-variant` (`#daf1e2`).
- **The site uses scroll-driven reveals (`[data-reveal]` → `.is-in`)**. When
  screenshotting from a headless browser, force-add `.is-in` + `.active` and set
  `loading="eager"` on imgs first, or everything below the fold is invisible.
- **A marquee must not merely be slowed under `prefers-reduced-motion`.** The
  global reduced-motion rule sets `animation-duration: 0.001ms !important`,
  which would snap the track to `translateX(-100%)` and look broken. global.css
  therefore sets `animation-name: none !important` and resets the transform.
- **Adding to a marquee**: `Marquee.astro` renders the track twice and
  aria-hides the duplicate, so items are announced once. It returns nothing at
  all for an empty list — but wrap the surrounding `<section>` in the same
  condition too, or you get an empty bordered band.
- **`prefers-reduced-motion` is fully handled** — Lenis, parallax, tilt,
  magnetic buttons, word stagger, counters and the marquees all degrade.
- **Lenis + GSAP ScrollTrigger are bridged** in `motion.ts` via
  `lenis.on("scroll", ScrollTrigger.update)` + `gsap.ticker.add(tick)`. Do NOT
  touch the tick handler. The `.lenis.lenis-smooth` / `.lenis-stopped` rules in
  global.css `@layer base` are **required** — Lenis breaks without them.
- **Image grades are per-source.** `grade: "cinematic"` keeps the old look for
  the WP jobsite set; `grade: "natural"` (saturation 0.96) is used for the
  client photographs, whose brand colour is the subject and which sit on a light
  page.
- **Most `src/components/*.astro` are orphaned.** Only `SEO`, `Header`,
  `Footer`, `Icon`, `Marquee`, `ProjectImage` and `immersive/*` are reachable
  from the five pages (`HeroMotif` is used by `404.astro` only). `CTASection`,
  `Logo`, `ProjectCard`, `ServiceCard`, `StatBand`, `GrainOverlay`, `Reveal`,
  `HeroCanvas`, `StudWall3D` and all of `scroll/` are unreferenced — they still compile, so the legacy cinematic
  colour tokens are kept pointed at the new palette rather than deleted.
- **three.js is DYNAMICALLY imported and must stay that way.** Both
  immersive heroes reach their scene module via `import("./…-scene")`, so the
  ~188KB gz `three.module.*.js` chunk loads right after first paint on `/`
  and `/projects/` only (it is the hero now, so it is not deferred to
  scroll). Eager JS is ~59KB gz on both. `npm run verify:3d` fails the build
  output if three enters the eager graph, eager JS exceeds 70KB gz, or
  About/Services/Contact reference an immersive chunk.
- **Homepage timing lives ONLY in `flythrough-timeline.ts`.** Stage copy
  fades happen INSIDE each `[in, out]` window (`stageOpacity`), and windows
  must not overlap — `npm test` asserts no two stages are ever visible at
  once (the prototype's outside-the-window fades overlapped in 236 frames).
  Faded stages are `inert` so Tab never lands on invisible buttons.
- **The corridor is curated in `src/data/corridor.ts`.** `npm test` fails if
  a client photograph is missing or duplicated, JCC (blurry) sneaks in, a
  slug is unknown, or any panel URL (1600px and 800px sets) is not a file
  on disk. Adding a project photo = add it to the pipeline, then a station.
- **Corridor photographs carry `renderOrder = 2`.** They write no depth, so
  anything transparent drawn after them that sits behind them on the wall
  (the wallboard/batts InstancedMesh) would paint straight over the photo.
  Keep the photographs the last thing drawn.
- **Corridor stud piles are per column.** `pileOf(zi, side)` seeds one PRNG
  per stud column so the stacked segments of a stud lie end to end; `aMeta.w`
  carries the segment level to the shader.
- **Corridor panels are resolution-honest** (`honestPanelWidth`, ≤1.25 CSS
  px/texel at 7 units): O'Reilly (259px) is deliberately a smaller panel.
- **Corridor camera travel is LINEAR** between `travelStart`/`travelEnd` so
  station i is abreast exactly at `stationProgress(i, n)` — the same function
  that names the big active-station title. Don't put an ease on that segment.
- **Both scenes call `renderer.forceContextLoss()` on `astro:before-swap`.**
  Verified: 10 ClientRouter swaps, one canvas, zero warnings (prod build).
- **The "Commercial Sectors We Frame" cards are PARKED** in
  `src/components/parked/SectorCards.astro` (removed from the homepage at the
  user's request, 2026-09-27). Restore by importing it into `index.astro`.
- **`optimizeDeps.include` for three in `astro.config.mjs` is required.**
  Without it the dev server discovers three mid-visit, answers the dynamic
  import with 504 "Outdated Optimize Dep", and both 3D heroes fall back to
  their static photo — it looks like the 3D is "missing". Dev-only.
- **Background-video heroes (About / Services / Contact) run on a clock that
  only advances while the hero is on screen and the tab is visible**, so the
  scene settles and stops rendering otherwise. Headless Chrome renders WebGL
  in software and can't screenshot a continuously playing hero; test them
  with Playwright's `page.clock.install()` + `clock.runFor(ms)`.
- **Services loop stays inside the dark part of the sequence** (p 0.16–0.70),
  so its light headline always reads; the 3D carries no labels in loop mode
  (the trade details are the page body right below).
- **The Maryland MBE seal** (client-supplied, `assets/source-photos/mbe-maryland-seal.png`)
  is served from `public/images/certifications/mbe-maryland.{webp,png}` at its
  native 258×271 via `src/components/CertSeal.astro` (`badge` = white disc for
  dark cards, since its ring lettering is dark). Used on the About certification section and the Services
  certification band (the Contact card was removed 2026-09-28). Never
  upscale it; ask the client for a vector/larger file if it must be bigger.
- **Every page is now a 3D page.** `npm run verify:3d` checks all five for
  eager three.js and the 70 KB gz budget (all sit at 57–59 KB).
- **`data-reveal` and `data-depth-in` never go on the same node**, and a
  `data-flip` counter replaces `data-count` rather than sitting beside it.
- **In-page `#links`** are jumped by Astro's ClientRouter, not Lenis; the global
  `[id] { scroll-margin-top: 6.5rem }` keeps targets clear of the nav pill.
  (Lenis `anchors` was tried and reverted: it scrolls without cancelling the
  native jump.)
- **The Maryland outline is real data** (glynnbird/usstatesgeojson, simplified).
  Never hand-edit it into invented geography.
- **Dev-only noise:** after `package.json` edits the Vite dev server restarts
  and re-optimises deps → forced reloads, dev-toolbar 504s and a harmless
  "Multiple instances of Three.js" warning. Test transitions on
  `npm run preview`, where there is exactly one three chunk.
- **Screenshot recipe for the 3D pages:** Lenis interrupts a single
  `scrollTo`, so scroll to `track.top + travel × p` repeatedly (~6× at
  700ms) and wait ~2s for the damping to settle. `window.__nvFly` /
  `window.__nvCorridor` (dev only) expose `stats()` → lights/panels/progress.
- **Adding a new npm dependency requires clearing the Vite cache in dev**,
  or the dev server serves `504 (Outdated Optimize Dep)` for it:
  `rm -rf node_modules/.vite .astro` and restart. This also produces harmless
  504s for Astro's own dev-toolbar chunks; those never appear in a build.
- **Both immersive heroes read scroll from their own `getBoundingClientRect`**
  rather than GSAP ScrollTrigger, so they do not contend with the Lenis
  bridge in `lib/motion.ts`. The homepage renders only while moving (plus a
  30fps "breathing" sway for 20s after input); the corridor pauses when
  off-screen or the tab is hidden.
- **A sticky header consumes real layout height.** The header is `sticky` and in
  normal flow, so a `min-h-screen` hero overflows the viewport by exactly the
  header's height and buries whatever sits at the hero's bottom. The hero
  uses `min-h-[calc(100svh-5.5rem)]` for this reason.
- **Wallboard geometry: a 10ft wall takes 4x10 sheets in ONE row.** Tiling two
  rows of 4x8 (an earlier attempt) left a misaligned band across the top.
- **Do not raise the warm fill light in StudWall3D above ~0.2.** Higher and it
  tints the galvanised steel brown and the studs stop reading as metal.
- **The site is in a folder with a space in the path**
  (`Niravana Construction`). Quote paths in shell commands.

## Quick health check

```bash
cd "Niravana Construction"
npm test                      # 28 unit tests: timelines, corridor, map, walls, depth
npm run build && echo "build OK"
# expects: 6 page(s) built - sitemap-index.xml emitted - no errors
npm run verify:3d             # no eager three, eager JS ≤ 70KB gz
```

After ANY image change, verify no srcset lies about its width — this is the
exact bug class the generated manifest exists to prevent:

```bash
npm run fetch-images -- --manifest-only && npm run build
node scripts/verify-srcsets.mjs
```

In the dev server, the site should:

- Pass `prefers-reduced-motion: reduce` (DevTools -> Rendering) without
  breaking layout, and the marquees should **stop**, not jump to their end
- Render Space Grotesk on headlines and Inter on body, with **zero** requests
  to fonts.googleapis.com or fonts.gstatic.com
- Show the frosted-glass nav tinting to match each section as you scroll
- Animate the hero headline word-by-word
- 3D-tilt the sector cards on hover (desktop only)
- Show the orange REQUEST A BID button with a **dark** label, never white
- Show the certifications strip running the **full width** of the dark band
- Show **no** GC band at all — it is empty by design until names are supplied
