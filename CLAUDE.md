# CLAUDE.md — context for continuing this project

A short brief so a future Claude Code session (or a teammate) can pick this up
without rereading every file. For deep detail: see `README.md`, the plan at
`~/.claude/plans/ok-so-we-are-graceful-eagle.md`, and the session memory at
`~/.claude/projects/-Users-mingmalama-Desktop-Websites-Works-Niravana-Construction/`.

---

## What this is

A brand-new website for **Nirvana Construction Inc.** — a commercial drywall &
metal-stud framing subcontractor in the Greater Baltimore region — replacing
the half-finished WordPress site at <https://nirvanaconstruction.net>.

Concept: **"Inside the Structure."** The homepage hero is a procedural
metal-stud framing scene built in Three.js / React Three Fiber, with the
company's real project photos mapped onto floating panels suspended inside it.
Mouse parallax + scroll dollies the camera deeper into the structure. Rich
GSAP/Lenis-driven scroll motion throughout, animated page transitions via
Astro's `ClientRouter`.

## Stack & commands

Astro 6 (static) · Tailwind CSS v4 · React 19 islands · three · @react-three/
fiber · @react-three/drei · @react-three/postprocessing · GSAP + ScrollTrigger ·
Lenis · sharp · TypeScript.

```bash
npm install              # deps
npm run fetch-images     # pulls + grades the 13 real photos from the live WP site
npm run dev              # http://localhost:4321
npm run build            # static output → ./dist
npm run preview          # preview the production build
```

Vite is pinned to `^7` via `package.json` → `overrides` (Astro 6 isn't happy
with the Vite 8 npm pulls by default). Don't remove that field.

## Where things live

```
src/
  layouts/BaseLayout.astro         shell, SEO, ClientRouter, Header, Footer, GrainOverlay
  lib/motion.ts                    Lenis + GSAP + reveal observer (re-inits on astro:page-load)
  lib/quality.ts                   device-capability tiering for the 3D
  components/
    Logo Header Footer SEO Hero HeroMotif Reveal GrainOverlay
    CTASection ServiceCard ProjectCard StatBand
    three/
      StructureScene.tsx           the homepage R3F scene
      scene-config.ts              geometry + panel placements
  data/company.ts services.ts projects.ts   all content
  pages/index about services projects contact 404.astro
  styles/global.css                Tailwind + @theme tokens + base
public/
  fonts/                           self-hosted Clash Display, Switzer, JetBrains Mono
  images/projects/  textures/      processed photos (run fetch-images to regenerate)
  favicon.svg  robots.txt  logo.png
scripts/fetch-images.mjs           downloads + sharp-grades the source photos
```

## Design system (current — **light theme**)

Tokens are in `src/styles/global.css` under `@theme`. Names kept stable through
the theme flip so component CSS doesn't change.

| Token | Value | Use |
|---|---|---|
| `--color-ink` | `#F5F1E7` | warm cream page background |
| `--color-graphite` | `#ECE6D4` | elevated surfaces |
| `--color-bone` | `#1A1F1B` | primary text (near-black, green-tinted) |
| `--color-ash` / `--color-concrete` | `#5A625A` / `#8B9088` | secondary / tertiary |
| `--color-emerald` | `#0E9C46` | brand — labels, eyebrows, dots, indicators |
| `--color-flare` | `#E85427` | action — CTAs, hover lines, primary emphasis |
| `--font-display` | Clash Display | huge cinematic headlines |
| `--font-body` | Switzer | body |
| `--font-mono` | JetBrains Mono | blueprint-style annotations / labels |

**Rule of thumb:** green = brand markers, orange = clickable / emphasis.

## Decision history (so you don't relitigate)

The same session iterated through three visual directions before landing here:
1. **Dark cinematic, ZOA-style** — built first.
2. **Brand colors swapped in** — emerald + orange on dark, real logo integrated as SVG.
3. **Light theme** — current. User said "didn't like how it's dark themed";
   flipped to warm cream with the same brand colors. 3D scene relit for light.

If the user pushes for darker again, the cleanest path is editing the token
values in `global.css` (the components don't care).

## Open items

1. **Contact form endpoint** — `FORM_ENDPOINT` is `""` in
   `src/pages/contact.astro`. The form runs in demo mode (shows the animated
   success state without delivering). Drop in a Formspree form ID
   (`https://formspree.io/f/<id>`) or deploy to Netlify and add
   `data-netlify="true"` to the form element to start receiving submissions.
2. **5 missing project photos** — ALDI, 7-Eleven, Chipotle, Mill Station, and
   DaVita render as styled type cards (no photo on the live WP site). When
   real photos arrive, drop them into `public/images/projects/<slug>.webp`
   (1600×1067 cinematic 3:2 + an `<slug>-800.webp` half-size) and an
   `<slug>.avif` if you want, then add the `photo: "<slug>"` mapping in
   `src/data/projects.ts`.
3. **Deployment** — not yet hosted. Recommended target is Netlify (free static
   hosting + Netlify Forms in one). The user has to bring the
   `nirvanaconstruction.net` domain.

## Gotchas / things to know

- The site uses **scroll-triggered reveals** (`[data-reveal]` → `.is-in`). When
  taking full-page screenshots from a headless browser, off-screen elements
  haven't been revealed yet — force-add `is-in` and set `loading="eager"` on
  imgs before screenshotting.
- `prefers-reduced-motion` is fully handled — Lenis, the 3D scene, reveals and
  CSS animations all degrade gracefully. Don't add new motion without a guard.
- The 3D scene only mounts on `/` via `<StructureScene client:visible />`.
  Inner pages use the **`HeroMotif.astro`** SVG (no WebGL) — one WebGL context
  for the whole site keeps perf clean.
- The image pipeline is **non-destructive**: sharp does a mild cinematic grade
  (desaturation + contrast + slight darken); the heavier "look" is layered on
  at runtime via the GrainOverlay component and (where used) WebGL
  post-processing. If you want the photos punchier on light, edit the `grade()`
  function in `scripts/fetch-images.mjs` and re-run `npm run fetch-images`.
- The site is in a folder with a **space in the path**
  (`Niravana Construction`). Quote paths in shell commands.
- The current working dir is **not a git repo** yet.

## Quick health check

```bash
npm run build && echo "build OK"
# expects: 6 page(s) built · sitemap-index.xml emitted · no errors
```
