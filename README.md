# Nirvana Construction — Website

A new website for **Nirvana Construction Inc.** — a commercial drywall &
metal-stud framing subcontractor serving the Greater Baltimore region.

The concept is "Inside the Structure": the homepage hero is a procedural
metal-stud framing scene (Three.js / R3F) with the company's real project
photos mapped onto floating panels inside it. Smooth scroll, scroll-triggered
reveals, GSAP motion, and animated page transitions throughout.

Light, editorial palette: warm cream (#F5F1E7) page, near-black text, brand
emerald green (#0E9C46) for labels and accents, construction orange (#E85427)
for actions.

## Stack

- **Astro 6** (static, with React islands)
- **Tailwind CSS v4**
- **Three.js / @react-three/fiber / drei / postprocessing** — the 3D scene
- **GSAP + ScrollTrigger** — scroll motion
- **Lenis** — smooth inertia scrolling
- **sharp** — build-time image processing
- **TypeScript** throughout

## Local development

```bash
npm install               # install dependencies
npm run fetch-images      # one-time: pull + cinematically grade the real photos
npm run dev               # start dev server at http://localhost:4321
```

## Production

```bash
npm run build             # static build → ./dist
npm run preview           # serve the built site locally
```

Deploy `./dist` to any static host (Netlify, Vercel, Cloudflare Pages, S3, GitHub
Pages, etc.).

## Project layout

```
public/
  fonts/        self-hosted Clash Display, Switzer, JetBrains Mono
  images/       processed project + texture photos
  favicon.svg  robots.txt  logo.png

src/
  layouts/BaseLayout.astro         shell, SEO, ClientRouter, Header, Footer, GrainOverlay
  lib/
    motion.ts       Lenis + GSAP/ScrollTrigger, reduced-motion guard
    quality.ts      device-capability tiering for the 3D
  components/
    Logo Header Footer SEO Hero HeroMotif ServiceCard
    ProjectCard StatBand CTASection Reveal GrainOverlay
    three/
      StructureScene.tsx     homepage R3F "Inside the Structure" scene
      scene-config.ts        geometry layout, panel placements
  data/
    company.ts services.ts projects.ts
  pages/
    index.astro about.astro services.astro projects.astro contact.astro 404.astro
  styles/global.css          Tailwind + design tokens + base
scripts/
  fetch-images.mjs           downloads + processes the 14 real site images
```

## Design system

Tokens live in `src/styles/global.css` under `@theme`:

- **Ink** `#f5f1e7` — warm cream page background
- **Graphite** `#ece6d4` — elevated cream surface (cards, alt sections)
- **Bone** `#1a1f1b` — near-black primary text, faint green tint
- **Ash / Concrete** — `#5a625a` / `#8b9088` (secondary / tertiary)
- **Emerald** `#0e9c46` — brand primary (labels, eyebrows, dots, indicators)
- **Flare** `#e85427` — action / CTA (buttons, hover lines, primary emphasis)
- **Fonts** — Clash Display (display), Switzer (body), JetBrains Mono (annotations)

The semantic tokens kept their names (`--color-ink` etc.) when the site flipped
to light, so changing the *values* in `src/styles/global.css` flips the whole
site without touching component CSS.

## Open items

- **Contact form delivery endpoint** — wire up in
  `src/pages/contact.astro` (the `FORM_ENDPOINT` constant). Either:
  - drop in a **Formspree** form ID (`https://formspree.io/f/<id>`), or
  - deploy to **Netlify** and add `data-netlify="true"` to enable Netlify Forms.
  Until then the form runs in *demo* mode and shows the success state without
  delivering anything.
- **Real project photos** for the 5 projects that currently have no photo
  (ALDI · 7-Eleven · Chipotle · Mill Station · DaVita) — they render as styled
  type cards until photos are dropped into `public/images/projects/`.

## Credits

Built around the existing brand. The full project plan lives at
`~/.claude/plans/ok-so-we-are-graceful-eagle.md`.
