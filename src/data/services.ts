/* ============================================================
   Services — the six commercial sectors Nirvana builds for,
   plus the shared trade scope of work.
   ============================================================ */

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
      "Storefronts, big-box fit-outs, and quick-service restaurants — opened on schedule.",
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
      "Infection-control framing, lead-lined and rated assemblies, and finishes that pass inspection the first time — for clinics, dialysis centers, and medical offices.",
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
