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

Astro 6 (static) · Tailwind CSS v4 (`@tailwindcss/vite`, NO CDN) · React 19
islands · GSAP + ScrollTrigger · Lenis smooth scroll · sharp (image pipeline) ·
TypeScript.

```bash
npm install              # deps
npm run fetch-images     # re-pulls + grades the 13 source photos from the live WP site
npm run dev              # http://localhost:4321  (or 4322 if 4321 is in use)
npm run build            # static output → ./dist
npm run preview          # preview the production build
```

Vite is pinned to `^7` via `package.json` → `overrides` (Astro 6 doesn't
work with the Vite 8 npm pulls). Don't remove that.

## The 5 pages

| Route | File | What it does |
|---|---|---|
| `/` | `src/pages/index.astro` | Hero (parallax + word stagger), 3 sector bento cards (3D tilt), "Nirvana Difference" dark band (count-up stats), CTA |
| `/about/` | `src/pages/about.astro` | Hero, "Who we are" 2-col, stat counters, "Nirvana Way" dark band, certification plaque, service area + cities, **Team placeholder** (4 cards w/ engineering icon), CTA |
| `/services/` | `src/pages/services.astro` | Hero, 3 expertise cards, 6 sector pillars (from `services.ts`), asymmetric 3-step process, 11-item scope grid, client logos, **sidebar contact-info card** (NOT a form — that's only on /contact/) |
| `/projects/` | `src/pages/projects.astro` | Hero, category filter buttons, project grid with real photos + JS filter, CTA |
| `/contact/` | `src/pages/contact.astro` | Hero, sidebar info cards + Cert card, full quote form (honeypot + validation + animated success), `FORM_ENDPOINT` swap point at the top of the page |

## Where things live

```
src/
  layouts/BaseLayout.astro     shell, SEO, ClientRouter, Header, Footer, motion init
  components/
    Header.astro                FROSTED-GLASS nav (backdrop-filter), logo image, click-to-call on desktop, burger on mobile
    Footer.astro                4-col brand/services/quick-links/contact, logo on dark bg
    SEO.astro                   (untouched from initial commit)
    scroll/                     PARKED cinematic-scroll components (Phase A/B/C, not currently rendered)
      ScrollProgressBar.tsx
      SectionIndex.tsx
      CursorLabel.tsx
      Preloader.tsx
      HorizontalProjects.tsx
      ServicesDeck.tsx
      ApproachReveal.tsx
      StatCounter.tsx
      ScopeMagnify.tsx
      CTAMarquee.tsx
  lib/motion.ts                 Lenis + GSAP backbone + declarative hooks (see below)
  data/
    company.ts                  contact, address, cert, nav, figures
    services.ts                 6 sectors + 11-item scopeOfWork
    projects.ts                 10 projects (5 with real photos)
  pages/index about services projects contact 404 .astro
  styles/global.css             Tailwind import + @theme tokens + utilities

public/
  logo.png logo.webp logo@2x.webp     resized from /Users/mingmalama/Downloads/PNG - Copy.png
  images/
    hero/landing.{webp,avif,-960.webp}  user's photo from earlier (currently unused — see Decision history)
    projects/                            13 jobsite/project photos in webp + AVIF, sized to 2000/800/3840
    textures/                            7 texture variants (used by parked StructureScene.tsx)
  fonts/                                  self-hosted Clash/Switzer/JetBrains Mono (NOT currently used — see Fonts below)
  favicon.svg  robots.txt
scripts/fetch-images.mjs                 npm run fetch-images entry; processes /public/images/projects/*
```

## Design system (current — light Material-style)

### Color tokens (defined in `src/styles/global.css` `@theme`)

| Token | Hex | Use |
|---|---|---|
| `--color-surface-container-lowest` | `#ffffff` | cards, top of light surfaces |
| `--color-surface` | `#f8f9ff` | page background |
| `--color-surface-container-low` | `#eff4ff` | section bg (alternating) |
| `--color-surface-container-high` | `#dce9ff` | elevated surface |
| `--color-surface-container-highest` | `#d3e4fe` | deepest light surface |
| `--color-outline-variant` | `#bfc9c3` | hairline borders |
| `--color-on-background` | `#0b1c30` | dark sections + primary text on light |
| `--color-on-surface-variant` | `#404944` | secondary text on light |
| `--color-primary` | `#003527` | deep forest green — brand primary (CTAs, headings) |
| `--color-primary-container` | `#064e3b` | darker green panel |
| `--color-secondary` | `#9d4300` | burnt orange — active nav underline, accent links |
| `--color-secondary-container` | `#fd761a` | vivid orange — primary CTA buttons |

**Brand rule of thumb:** forest green = primary brand, vivid orange = action /
hover / accent. Stay light + Material-clean. Avoid pure black backgrounds —
the dark sections use `--color-on-background: #0b1c30` (deep navy).

### Spacing tokens

`--spacing-{xs,sm,base,md,lg,gutter,xl,xxl,container-max}` = 4 / 8 / 8 / 16 /
24 / 24 / 32 / 64 / 1280 px. Used as `p-lg`, `gap-gutter`, `py-xxl`,
`max-w-container-max`, etc.

### Typography

- **Display + button**: `Space Grotesk` (Google Fonts, weights 400/500/600/700) — modern, characterful grotesque
- **Body + label**: `Inter` (Google Fonts, weights 400/500/600/700) — neutral, readable
- **Icons**: Material Symbols Outlined (Google Fonts)
- **Self-hosted Clash Display / Switzer / JetBrains Mono in `/public/fonts/`** — NOT currently used by the live site. They were the original cinematic-blueprint typography. Kept on disk in case the cinematic-scroll variant is ever revived.

### Type scale

`--text-{headline-xl,headline-lg,headline-lg-mobile,headline-md,body-lg,body-md,body-sm,label-bold,button}`
each with explicit size, line-height, weight, and (for headlines) letter-spacing.

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

All effects degrade fully under `prefers-reduced-motion: reduce` (counter
values jump straight to final, parallax/tilt/magnetic/words all skip).

## Header / nav

**Frosted-glass `backdrop-filter` nav** in `src/components/Header.astro`. The
nav literally tints itself by picking up + blurring whatever section is
scrolled behind it. Background: `rgba(255,255,255,0.65)` + `backdrop-filter:
blur(24px) saturate(180%)`. Falls back to opaque `rgba(255,255,255,0.92)` on
browsers without backdrop-filter support.

Three tuning knobs in the `.frost-nav` rule:
- `0.65` — white tint intensity (lower = more color from behind shows through)
- `blur(24px)` — frost softness
- `saturate(180%)` — vibrancy of the color it picks up

Logo: `/public/logo.png` (+ `logo.webp` + `logo@2x.webp`). Resized from the
user's original 5209×5076 PNG to 800px max width.

## Voice & copy guidelines

- **Conversational, not transactional**: "Get in Touch", "Talk to Us", "Send a
  Message" — never "Request a Quote", "Get an Estimate", "Schedule a
  Consultation". The header has no CTA pill at all — just a click-to-call
  phone number on desktop, burger on mobile.
- **Flowing sentences, not bullet-style fragments**: "We coordinate with the
  GC, work to the drawings, and finish ready for inspection so every plate is
  plumb…" (not "Plates plumb. Studs on layout. Drywall clean.")
- **Subject + verb + reason**: every body sentence starts with "We" or "Our
  team" / "Our frames" and ends with the outcome.
- **Real services + real projects only**: no Apex Plaza Frankfurt nonsense.
  See `src/data/services.ts` and `src/data/projects.ts`.
- **Brand tagline**: "Built to the line."
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

If user wants the cinematic experience back, the parked components in
`src/components/scroll/` can be re-imported on a per-page basis. The motion
backbone in `src/lib/motion.ts` already supports both styles.

## Open items / todo

1. **Contact form endpoint** — `FORM_ENDPOINT` at top of `src/pages/contact.astro`
   is `""`. Form runs in demo mode (shows the animated success state without
   delivering). Drop in a Formspree form ID
   (`https://formspree.io/f/<id>`) or deploy to Netlify and add
   `data-netlify="true"` to the form element to start receiving submissions.
2. **5 projects without photos** — ALDI, 7-Eleven, Chipotle, Mill Station,
   DaVita render as `apartment`-icon placeholder cards in the projects grid.
   When real photos arrive, drop them in `public/images/projects/<slug>.webp`
   (2000×1333 cinematic 3:2 + an `<slug>-800.webp` half-size) and set
   `photo: "<slug>"` in `src/data/projects.ts`.
3. **Real team photos + names** — Team section on About uses 4 placeholder
   members ("Team Member" + role) with the `engineering` Material icon as
   avatar. Drop portraits in `/public/images/team/<slug>.webp` (800×800
   square) and edit the `team` array near the top of `src/pages/about.astro`.
4. **Hero image source caps at 2000 px** — the photo on the WP origin
   (`processed-34898ABA…jpeg`) is 2000×1126. We Lanczos3-upscale to 3840px
   for retina/4K displays + add unsharp mask, but it isn't *true* 4K detail.
   For truly native 4K, either provide a higher-res original or generate a
   new AI hero. See the AI prompt brief in the chat history if needed.
5. **Deployment** — not yet hosted. Recommended target is Netlify (free
   static hosting + Netlify Forms in one). User has to bring the
   `nirvanaconstruction.net` domain.

## Gotchas / things to know

- **Tailwind v4 spacing-token collision**: defining `--spacing-{xs,sm,md,lg,xl}`
  in `@theme` accidentally overrides `max-w-{xs,sm,md,lg,xl}` to those tiny
  values (e.g. `max-w-md` = 16 px instead of 28 rem). Workaround: use
  **bracket syntax** for all paragraph max-widths: `max-w-[28rem]`,
  `max-w-[32rem]`, `max-w-[36rem]`. `--container-*` tokens were also added to
  global.css to nominally restore the defaults, but the spacing-named
  utilities still take precedence — bracket syntax is the durable fix.
- **`text-secondary-fixed` (and other Material *-fixed tokens) render
  unexpectedly** on dark backgrounds. Use bracket syntax `text-[#fd761a]`
  for the bright orange eyebrow/label color on `.bg-on-background` sections.
- **`text-on-surface-variant` is DARK** (`#404944`) — it's the Material
  "text on light surface" token. Don't use it on dark backgrounds — use
  `text-white/80` or `text-surface-variant` (`#d3e4fe`) instead.
- **The site uses scroll-driven reveals (`[data-reveal]` → `.is-in`)**. When
  taking full-page screenshots from a headless browser, off-screen elements
  haven't been revealed yet — force-add `.is-in` + `.active` and set
  `loading="eager"` on imgs before screenshotting.
- **`prefers-reduced-motion` is fully handled** — Lenis, parallax, tilt,
  magnetic buttons, word stagger, and counter scrubs all degrade. Don't add
  new motion without a guard.
- **Lenis + GSAP ScrollTrigger are bridged** in `motion.ts` via
  `lenis.on("scroll", ScrollTrigger.update)` + `gsap.ticker.add(tick)`. Do
  NOT touch the tick handler or scroll-triggered animations will desync.
- **The image pipeline is non-destructive**: sharp does a light cinematic
  grade (saturation 0.88, contrast 1.06). If you want photos punchier, edit
  `grade()` in `scripts/fetch-images.mjs` and re-run `npm run fetch-images`.
- **Hero image variants**: `jobsite-08.webp` (2000×1333), `-800.webp`,
  `-3840.webp` (Lanczos3-upscaled retina variant), and `jobsite-08.avif`.
  The `<picture>` element on `/` requests AVIF first, falls back through the
  WebP srcset.
- **Backdrop-filter on the nav** requires Safari/Chrome/Edge/modern Firefox.
  Older browsers fall back to a near-opaque white nav (handled via
  `@supports` in `Header.astro`).
- **The site is in a folder with a space in the path**
  (`Niravana Construction`). Quote paths in shell commands.

## Quick health check

```bash
cd "Niravana Construction"
npm run build && echo "build OK"
# expects: 6 page(s) built · sitemap-index.xml emitted · no errors
```

In the dev server, the site should:
- Pass `prefers-reduced-motion: reduce` (DevTools → Rendering panel) without
  breaking layout
- Render Space Grotesk on headlines + Inter on body (check with DevTools
  → Computed styles)
- Show the frosted-glass nav tinting to match each section as you scroll
- Animate headlines word-by-word on hero entries
- 3D-tilt the sector cards on cursor hover (desktop only)
- Magnetize the orange primary buttons toward the cursor when within 120 px
