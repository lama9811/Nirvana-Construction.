/* ============================================================
   Company facts + brand strings — single source of truth.
   ============================================================ */

export const company = {
  name: "Nirvana Construction",
  legalName: "Nirvana Construction Inc.",
  discipline: "Commercial Drywall & Metal-Stud Framing",
  tagline: "Built to the line.",

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

  hours: "Mon – Fri · 8:00 AM – 4:00 PM",
  serviceArea: "Maryland & the Greater Baltimore region",

  /* credentials */
  certification: {
    label: "DBE / MBE / SBE Certified",
    number: "Cert. No. 22-204",
    full: "DBE / MBE / SBE Certified — Certification No. 22-204",
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

/* honest, verifiable headline figures — no invented numbers */
export const figures: { value: string; label: string }[] = [
  { value: "10", label: "Commercial projects delivered" },
  { value: "06", label: "Sectors served" },
  { value: "DBE", label: "MBE / SBE certified" },
  { value: "MD", label: "Greater Baltimore region" },
];
