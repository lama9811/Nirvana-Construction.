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
      "Storefronts, big-box fit-outs, and quick-service restaurants — finished flawless, opened on time.",
    detail:
      "Retail schedules don't move. We frame and finish shopping-center spaces, anchor stores, and brand-standard restaurants on fixed timelines, coordinating tightly with general contractors so the doors open on the date that was promised.",
  },
  {
    index: "02",
    slug: "hospitality",
    title: "Hospitality",
    blurb:
      "Hotels and guest-facing interiors where every wall is part of the experience.",
    detail:
      "In hospitality, the wall is the product. We deliver clean lines, proper sound separation between rooms, and finishes that hold up to constant traffic — the quiet, durable craft behind a great guest experience.",
  },
  {
    index: "03",
    slug: "medical",
    title: "Medical & Healthcare",
    blurb:
      "Clinics and medical offices framed to healthcare standards and built inspection-ready.",
    detail:
      "Healthcare work leaves no margin for error. We build infection-control framing, lead-lined and rated assemblies, and finishes that pass inspection the first time — for clinics, dialysis centers, and medical office build-outs.",
  },
  {
    index: "04",
    slug: "education",
    title: "Education",
    blurb:
      "Schools and institutional buildings framed for decades of hard daily use.",
    detail:
      "Institutional buildings are built to last and built to code. We deliver metal-stud framing and drywall for schools and public facilities — durable assemblies, fire-rated separations, and finishes ready for the next thirty years.",
  },
  {
    index: "05",
    slug: "office",
    title: "Office & Commercial",
    blurb:
      "Corporate offices, tenant fit-outs, and core-and-shell interiors, floor by floor.",
    detail:
      "From base-building core-and-shell to full tenant fit-outs, we frame and finish functional, code-compliant office interiors — coordinating with every trade to keep the build moving floor by floor.",
  },
  {
    index: "06",
    slug: "renovation",
    title: "Renovation & Remodeling",
    blurb:
      "Occupied-space remodels and adaptive reuse, phased around your operations.",
    detail:
      "Modernizing a commercial space while it stays open takes planning. We work in phases, after hours when needed, and around your operations — upgrading and remodeling interiors with minimal disruption to the business inside.",
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
