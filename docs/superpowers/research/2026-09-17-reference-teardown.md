> **Note (2026-09-28):** the A101 floor plan referenced below was a client document sent by mistake. It has been removed from the site, the pipeline and the repository; `/contact/` now uses a plan drawn for the site (`src/data/plan-walls.ts`) and the corridor starts on the first photograph. Mentions below are historical.

# Reference teardown — 2026-09-17

Measured with Playwright at 1440x900. Screenshots in `.playwright-mcp/ref/`.

## Nirvana logo — measured hex (from public/logo.png + logo@2x.webp)

| Swatch | Hex | rgb | Share of logo px | Sat |
|---|---|---|---|---|
| Green | **#009933** | 0,153,51 | 54–64% | 100% |
| Orange | **#FF6600** | 255,102,0 | 21–23% | 100% |

Both are fully saturated "web-safe" values (#093 / #F60).
Current site tokens differ sharply: `--color-primary: #003527` (far darker,
desaturated) and `--color-secondary-container: #fd761a` (lighter, pinker).
Client note: "Match the logo color more (use color detector and use the same
Hex code if possible)".

## Client notes (photo of printed brief)

- Tagline: **THE NIRVANA WAY — Excellence Without Compromise.**
- Pictures + logos: arriving next week (so: swappable slots needed)
- Color/theme: match logo hex; references HBA.com, Magma.build, "yak website" —
  wants "more modern"
- Wording: reword most copy, model on **HDL Construction**
- Remove the leadership/team page for now
- Add a **running strip of GCs we have worked with** (like HDL)
- Add a **running strip of all our certifications** (like HDL)

## HDL Construction — hdlconstruction.com  ← DIRECT COMPETITOR

Commercial drywall & metal framing, Essex MD, since 1995. Same market as Nirvana.
This is the wording + structure model the client named.

- Palette: white base, ink `#1E2A38`, muted `#6B7A8D`, brand navy `#1E3F73`,
  mid `#2B5EA7`, light `#5A90D0`, pale `#8BADD4`. Surface `#F5F6F8`.
- Type: **Instrument Sans** + **IBM Plex Mono** (labels/numbers) + Libre Franklin.
  Small, practical scale: 16/400 body, 13/500, 12/400,
  `10px/400/1.5px/uppercase`, `9px/400/2px/uppercase` for micro-labels.
- Page height only **4,927px**. No h1 (weakness).
- Hero: navy band w/ faint blueprint grid, logo left, positioning paragraph right,
  CTAs **"REQUEST A BID"** (filled) + "View Our Work" (outline). Below: 3-up photo
  strip w/ tiny uppercase captions (METAL FRAMING / ACOUSTICAL CEILINGS).
- Stat row: `1995 YEAR FOUNDED · 50+ CREW MEMBERS · MD/VA/PA SERVICE REGION · 10+ GC PARTNERS`
- Numbered services: `01 Metal Framing · 02 Drywall · 03 Acoustical Ceilings · 04 Rough Carpentry`
- Sector chips: Healthcare, Retail, Multi-Family, Industrial, Religious, Office,
  Education, Government
- Selected Work = mosaic (1 tall left + 2x2 right), eyebrow label + project name
- **"GENERAL CONTRACTORS WE WORK WITH"** — navy band, mono uppercase wide-tracked
  label, GC logos in white rounded chips. STATIC grid, 6 + 2 wrap. Named GCs:
  Whiting-Turner, Mackenzie, Southway Builders, Chesapeake Contracting,
  Lewis Contractors, Centennial, MCN Build, TMI.
  (Client wants this as a *running* marquee = an upgrade on HDL.)
- Credibility chips: LEED Accredited · Safety Record · Family Owned · Full Service
- Large Careers section w/ 4 open positions + requirements
- Voice sample: "HDL Construction is a specialty subcontractor serving Maryland,
  Virginia, and Pennsylvania since 1995. We partner with the region's leading
  general contractors on commercial projects of all sizes."
- Nice line: "Our finished surfaces are among the most visible elements on any project."

## Magma.build — NOT a construction firm; an AI infrastructure startup (Webflow)

- Palette: near-black navy `#060819`, white type, accents `#E4A649` gold and
  `#EB7457` coral. Surfaces = white at 6–8% alpha. Radii 8px + 1200px pills.
- Type: **PP Neue Montreal** (sans) + **Feature Deck Light** (high-contrast serif).
  Fluid sizes w/ proportional negative tracking: 127.44/400/-3.82px,
  96/300, 62/400/-1.86px, body 17.57/**300**.
- Stack: GSAP + ScrollTrigger + **Lenis** + Swiper (same backbone as Nirvana).
- Page height 6,552px. Only 3 images + 1 video — typography-driven.
- Hero: full-bleed dark photo, **serif display headline** ~127px, pill badge,
  right-aligned sans paragraph mixing weights, "Scroll to dig ↓",
  faint full-height vertical column rules overlaid.
- Numbered process in huge serif numerals (01/02/03), 2-col split.
- Accent color used ONLY on type (italic serif second line), never as a fill.
- **Running marquees**: "Know-How / Expertise / Business Logic" and
  "Engineering / Automation / AI Agents", each repeated — the marquee pattern
  the client's notes want.
- Text links: label + "→" over a hairline underline wider than the text.

## eladiodieste.com — architectural monograph (Uruguayan engineer)

- Palette: **pure black** `#000`, warm cream `#F1ECE8`, secondary `#EADFD2`,
  terracotta accent `#A55F2D` (the brick colour of the work itself).
- Single custom typeface, weights 400/500 only.
- Fluid type w/ proportional negative tracking: 288px/-21.6px (-7.5%),
  122.87/-4.3px, 52.66/-2.11px (-4%), 32.91/-1.32px, body 17.55.
- Page height 14,025px, 37 images, 1 canvas.
- Hero: full-bleed brick-vault photo; wordmark **split across corners** —
  "Eladio" top-left, "Dieste" bottom-right at 288px; a hairline horizontal rule
  through the middle carries the nav evenly distributed; "© 2026" micro bottom-left.
- Project list = **vertical timeline**: hairline spine, years as waypoints,
  images alternating left/right, desaturated until active then full colour.
- Uses "(Próximamente)" for unbuilt/coming — same trick as HBA's "IN PROGRESS".

## Cross-reference synthesis

All three modern references + HBA converge on:
1. One restrained neutral base; photography supplies the colour.
2. Fluid display type with **proportional negative tracking** (~-3% to -7.5%).
3. A mono or wide-tracked micro-label carrying all the facts.
4. Numbered sequences (01/02/03) for process and services.
5. Accent colour on TYPE, rarely as a large fill.
6. Visible hairline grid / column rules as structure.
7. GSAP + ScrollTrigger + Lenis (Nirvana already has this).
8. Marquee strips for logos / capability words.

## Supplied photo inventory (18 files, /Users/mingmalama/Desktop/My works/Website Photos)

USABLE LARGE (hero-capable):
- F45_Training 1.jpg       5623x3649  AR1.54  4.3MB  ← interior gym, TRUE 4K+
- First Watch.webp         2500x1875  AR1.33  734KB  ← aerial exterior
- Panda_express.jpeg       1600x1066  AR1.50  1.6MB  ← dusk exterior, beautiful
- Golf Galaxy.PNG          1548x1016  AR1.52  2.3MB  ← night/blue-hour, dramatic
- Milford Mill Grocery outlet.jpg 1536x2048 AR0.75 302KB ← PORTRAIT
- AutoZone.png             1200x820   AR1.46  1.5MB
- Chipotle.jpg             1024x561   AR1.83  108KB
- Johns Hopkins ... .jpg   1000x667   AR1.50  416KB  ← interior renovations, brick campus

TOO SMALL for large use (card/thumb only):
- Five Below.JPEG          808x540
- Aldi #174.webp           680x510
- Burlington.webp          680x383
- golf galaxy photo 1.jpeg 640x480
- F45-Training.jpg         640x426
- Flagship Carwash 2.webp  628x510
- First Watch 1.webp       382x510   (portrait interior)
- O'Reilly Auto Parts.png  360x173   ← unusable except as a logo chip

NOT A PROJECT PHOTO:
- A101- NVA.png            1246x526  ← architectural floor plan (classrooms,
  health rm, nurse office) w/ a blue circle annotation on a 3'-4 3/4" radius.
  Could be a beautiful background texture / "we work to the drawings" motif.
