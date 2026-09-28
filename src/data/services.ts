/* ============================================================
   Services — three tiers, deliberately separated:

     trades       the six trades we self-perform. This list is
                  authoritative: it is what the company logo itself
                  states, and four of the six were previously absent
                  from the site.
     services     the six commercial sectors we build for (markets)
     scopeOfWork  the detailed capability grid applied across both
   ============================================================ */

export interface Trade {
  index: string;
  slug: string;
  title: string;
  /* short line for cards */
  blurb: string;
  /* fuller paragraph */
  detail: string;
  icon: string;
}

/* the self-performed trades, in the order the logo lists them */
export const trades: Trade[] = [
  {
    index: "01",
    slug: "drywall",
    title: "Drywall",
    blurb: "Board hung and finished, from rock through Level 5.",
    detail:
      "We hang and finish drywall from the first sheet of rock through a Level 5 finish, and because the finished wall is the surface everyone sees, we treat it as the part of the job that gets judged.",
    icon: "grid_view",
  },
  {
    index: "02",
    slug: "metal-framing",
    title: "Metal Framing",
    blurb: "Light- and heavy-gauge stud framing, on layout and plumb.",
    detail:
      "We lay out and set light- and heavy-gauge metal studs for interior partitions, rated assemblies, shaft walls and bearing conditions, working to the drawings so every plate lands on layout and every wall comes up plumb.",
    icon: "architecture",
  },
  {
    index: "03",
    slug: "acoustical-ceilings",
    title: "Acoustical Ceilings",
    blurb: "Suspended grid, tile and specialty acoustic treatments.",
    detail:
      "We install suspended ceiling grid, acoustical tile and sound-absorption treatments, setting the grid level and tight to the reflected ceiling plan so lights, diffusers and sprinkler heads land where the drawings put them.",
    icon: "apartment",
  },
  {
    index: "04",
    slug: "insulation",
    title: "Insulation",
    blurb: "Thermal, acoustic and rated cavity insulation.",
    detail:
      "We install thermal and acoustic insulation in wall cavities, ceilings and rated assemblies, packing it properly so the assembly performs the way it was specified rather than merely looking right once it is closed up.",
    icon: "shield",
  },
  {
    index: "05",
    slug: "rough-carpentry",
    title: "Rough Carpentry",
    blurb: "Blocking, backing and wood framing, the work behind the walls.",
    detail:
      "We handle blocking, backing, wood framing and miscellaneous carpentry, the work nobody sees but everything else fastens to, and we set it before it turns into somebody's change order.",
    icon: "construction",
  },
  {
    index: "06",
    slug: "eifs",
    title: "EIFS",
    blurb: "Exterior insulation and finish systems, detailed to shed water.",
    detail:
      "We install exterior insulation and finish systems with the flashings, joints and terminations detailed to shed water, because an EIFS wall fails at its details long before it fails in its field.",
    icon: "format_paint",
  },
];

export interface Service {
  index: string;
  slug: string;
  title: string;
  /* short line for cards */
  blurb: string;
  /* fuller paragraph for the services page */
  detail: string;
}

export const services: Service[] = [
  {
    index: "01",
    slug: "retail",
    title: "Retail & Restaurant",
    blurb:
      "Storefronts, big-box fit-outs and quick-service restaurants, opened on schedule.",
    detail:
      "Storefronts, big-box fit-outs, and brand-standard restaurants delivered on tight schedules, with clean finishes and doors opening on the date that was promised.",
  },
  {
    index: "02",
    slug: "hospitality",
    title: "Hospitality",
    blurb:
      "Hotel and guest-facing interiors where every wall is part of the experience.",
    detail:
      "Hotel and guest-room interiors with clean lines, proper sound separation, and finishes that hold up to constant traffic.",
  },
  {
    index: "03",
    slug: "medical",
    title: "Medical & Healthcare",
    blurb:
      "Clinics and medical offices framed to healthcare standards and built inspection-ready.",
    detail:
      "Infection-control framing, lead-lined and rated assemblies, and finishes that pass inspection the first time, for clinics, dialysis centers and medical offices.",
  },
  {
    index: "04",
    slug: "education",
    title: "Education",
    blurb:
      "Schools and institutional buildings framed for decades of hard daily use.",
    detail:
      "Metal-stud framing and drywall for schools and public facilities, with durable assemblies and fire-rated separations built to last.",
  },
  {
    index: "05",
    slug: "office",
    title: "Office & Commercial",
    blurb:
      "Corporate offices, tenant fit-outs, and core-and-shell interiors, floor by floor.",
    detail:
      "Core-and-shell builds and full tenant fit-outs, delivering functional, code-compliant office interiors that are coordinated floor by floor.",
  },
  {
    index: "06",
    slug: "renovation",
    title: "Renovation & Remodeling",
    blurb:
      "Occupied-space remodels and adaptive reuse, phased around your operations.",
    detail:
      "Occupied-space remodels and adaptive reuse, worked in phases and after hours when needed, with minimal disruption to the business inside.",
  },
];

/* the trade capabilities applied across every sector above */
export const scopeOfWork: string[] = [
  "Metal stud framing",
  "Wood framing",
  "Drywall hang & finish",
  "Insulation",
  "Acoustical ceilings",
  "Fireproofing & caulking",
  "Waterproofing",
  "Rough carpentry",
  "FRP & wall coverings",
  "EIFS",
  "Painting",
];
