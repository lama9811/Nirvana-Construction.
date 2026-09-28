> **Note (2026-09-28):** the A101 floor plan referenced below was a client document sent by mistake. It has been removed from the site, the pipeline and the repository; `/contact/` now uses a plan drawn for the site (`src/data/plan-walls.ts`) and the corridor starts on the first photograph. Mentions below are historical.

# Nirvana Construction — logo-derived brand rebuild

Date: 2026-09-17 · Status: approved, Pass 1 in progress

## Why

Client brief (photographed notes) asked for: tagline change, colour theme matched
to the logo hex, wording reworked toward HDL Construction's voice, leadership
page removed, and two "running" strips — GCs worked with, and certifications.
Separately the client supplied 17 project photographs and named four reference
sites (HBA.com, Magma.build, a "yak website", HDL Construction).

## Decisions taken

| Question | Decision |
|---|---|
| Direction | Keep the theme tied to the logo — light base, green + orange |
| Colour literalism | Exact logo hex as accents; derived darks for surfaces |
| Hero | Headline + credential bar over full-bleed interior photo |
| Project metadata | Photo + name + sector + location only; no invented GC/size/year |

## 1 · Colour system

Logo measured from `public/logo.png`: **#009933** (green, H140 S100% L30%, 54–64%
of logo pixels) and **#FF6600** (orange, H24 S100% L50%, 21–23%).

Scales keep the hue exact and place the literal logo hex at the 500 step.

| Token | Hex | Role | vs #FFF |
|---|---|---|---|
| green-50 | #F2F8F4 | tinted wash surface | 1.08 |
| green-100 | #DAF1E2 | chip / hairline tint | 1.19 |
| green-500 | **#009933** | exact logo — headings, rules, active | 3.75 (large only) |
| green-600 | #00852C | green text at body size | 4.78 ✓ |
| green-700 | #006622 | links, hover | 7.18 ✓ |
| green-900 | #052911 | dark section bands | 15.77 ✓ |
| green-950 | #051A0C | deepest band / footer | 18.11 ✓ |
| orange-500 | **#FF6600** | exact logo — primary CTA fill | needs dark label |
| orange-600 | #853500 | orange text on white | 8.38 ✓ |
| ink | #0A1F14 | body text, green-tinted near-black | 17.23 ✓ |

**Accessibility constraint discovered:** white-on-#FF6600 is 2.94:1 and fails WCAG
at all sizes (as does the current #fd761a + white button). ink-on-#FF6600 is
5.87:1 and passes. Therefore the primary CTA is orange fill with near-black label.
#009933 may only be used for large text; green text at body size uses green-600.

Dark bands derive from the logo hue (H140) instead of the arbitrary navy #0b1c30.
The ~60 unused Material tokens (`*-fixed`, `*-fixed-dim`, tertiary, error
containers) are removed, which also eliminates two documented gotchas.

## 2 · Typography

Current state loads 3 render-blocking Google requests (Space Grotesk, Inter,
Material Symbols ~200KB for 11 glyphs) **plus** 7 self-hosted woff2 (Clash,
Switzer, JetBrains Mono). `@layer base` sets h1–h4 to Clash Display and
`font-display` is used 20 times, so Clash is genuinely live — contradicting the
note in CLAUDE.md that the self-hosted faces are unused.

Target: self-host three families, zero Google Fonts requests.

- **Space Grotesk** — display + UI
- **Inter** — body
- **JetBrains Mono** — micro-labels and numerals (already on disk)
- Remove Clash Display and Switzer from CSS; inline the 11 icons as SVG

Fluid display scale with proportional negative tracking (the common move across
all four references):

```
display-xl  clamp(2.75rem, 7vw, 6rem)      -0.04em
display-lg  clamp(2rem, 4.5vw, 3.5rem)     -0.03em
display-md  clamp(1.5rem, 2.5vw, 2.25rem)  -0.02em
label-mono  11px / 1.5px tracking / uppercase
```

## 3 · Structure

- **Hero**: full-bleed `F45_Training 1.jpg` (5623×3649 — first true 4K asset),
  real `h1`, new tagline, `REQUEST A BID` + `See the Work →`, credential bar.
- **Two marquee bands**: `GENERAL CONTRACTORS WE WORK WITH`, `CERTIFICATIONS`.
  Running strips rather than HDL's static grid.
- **Services restructured into three tiers.** The logo advertises six trades —
  DRYWALL, METAL FRAMING, ACT, INSULATION, ROUGH CARPENTRY, EIFS — but the site
  leads with six *sectors* and `company.discipline` names only two trades. So
  four trades the logo advertises were being under-sold.
  1. Trades — the 6 from the logo, numbered 01–06
  2. Sectors — the existing 6 markets, as chips
  3. Scope of work — the existing 11-item grid
- **Removed**: team/leadership section on `/about/`.
- **Tagline**: "Built to the line." → "THE NIRVANA WAY — Excellence Without Compromise."

## 4 · Data + images

- `projects.ts` — wire photos for ALDI and Chipotle; add 9 new projects with
  name/sector/location/photo only.
- `fetch-images.mjs` — add per-source `widths`. This fixes a real latent bug:
  `index.astro:23` declares `jobsite-08.webp 2000w` and `-3840.webp 3840w`, but
  `processOne()` only emits 1600/800, so re-running the pipeline would overwrite
  the hero with a 1600px file still labelled 2000w and never regenerate -3840.
- The 8 low-resolution supplied photos are capped so they are never upscaled into
  a large slot. O'Reilly (360×173) is card-only.
- `A101- NVA.png` (floor plan) becomes a faint background motif, not a portfolio item.

## 5 · Phasing

1. **Pass 1** — design system, hero, image pipeline, marquees, trades, remove team.
2. **Pass 2** — rewrite copy across all 5 pages in HDL's voice.
3. **Pass 3** — project detail pages, once GC/size/year data exists.

## Open / blocked

- **GC names** for the marquee. Not inventable; band ships hidden until supplied.
- **Full certification list.** Only DBE / MBE / SBE + Cert. No. 22-204 known.
- Logos and further photography promised by the client "next week" — slots must
  stay swappable.
