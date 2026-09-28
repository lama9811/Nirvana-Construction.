/* ============================================================
   Company facts + brand strings — single source of truth.
   ============================================================ */

export const company = {
  name: "Nirvana Construction",
  legalName: "Nirvana Construction Inc.",

  /* short form — used in page titles and meta, where the local search
     terms that matter are "commercial drywall" and "metal framing" */
  discipline: "Commercial Drywall & Metal-Stud Framing",

  /* the full self-performed scope, exactly as the logo states it */
  disciplineFull:
    "Drywall, Metal Framing, ACT, Insulation, Rough Carpentry and EIFS",

  /* brand slogan */
  slogan: "The Nirvana Way",
  sloganPayoff: "Excellence Without Compromise",
  tagline: "The Nirvana Way: Excellence Without Compromise.",

  /* contact */
  phone: "+1 (410) 650-9850",
  phoneHref: "tel:+14106509850",
  email: "Info@nirvanaconstruction.net",
  emailHref: "mailto:Info@nirvanaconstruction.net",

  address: {
    street: "9546 Belair Rd",
    city: "Nottingham",
    state: "MD",
    zip: "21236",
    full: "9546 Belair Rd, Nottingham, MD 21236",
  },
  geo: { lat: 39.3713, lng: -76.4761 },

  hours: "Mon to Fri · 8:00 AM to 4:00 PM",
  serviceArea: "Maryland & the Greater Baltimore region",

  /* credentials */
  certification: {
    label: "DBE / MBE / SBE Certified",
    number: "Cert. No. 22-204",
    full: "DBE / MBE / SBE Certified · Certification No. 22-204",
  },

  social: {
    facebook:
      "https://www.facebook.com/people/Nirvana-Construction/100075998231091/",
  },
} as const;

/* primary navigation */
export const nav: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about/" },
  { label: "Services", href: "/services/" },
  { label: "Projects", href: "/projects/" },
  { label: "Contact", href: "/contact/" },
];

/* ------------------------------------------------------------
   Certifications — feeds the running certification strip.
   Only verified credentials belong here. If further certifications
   exist (MDOT, SBR, LEED, OSHA, bonding capacity) add them and the
   strip picks them up automatically.
   ------------------------------------------------------------ */
export const certifications: { label: string; detail?: string }[] = [
  { label: "DBE Certified", detail: "Disadvantaged Business Enterprise" },
  { label: "MBE Certified", detail: "Minority Business Enterprise" },
  { label: "SBE Certified", detail: "Small Business Enterprise" },
  { label: "Cert. No. 22-204" },
];

/* ------------------------------------------------------------
   General contractors worked with — feeds the running GC strip.

   DELIBERATELY EMPTY. Naming a general contractor we have not worked
   for would be a misrepresentation, so the strip renders nothing until
   real names are supplied. Add entries as:
       { name: "Whiting-Turner" }
       { name: "Southway Builders", logo: "southway" }   // /images/gcs/<logo>.webp
   The section hides itself whenever this array is empty.
   ------------------------------------------------------------ */
export const generalContractors: { name: string; logo?: string }[] = [];

/* honest, verifiable headline figures — no invented numbers */
export const figures: { value: string; label: string }[] = [
  { value: "19", label: "Commercial projects delivered" },
  { value: "06", label: "Trades self-performed" },
  { value: "DBE", label: "MBE / SBE certified" },
  { value: "MD", label: "Greater Baltimore region" },
];
