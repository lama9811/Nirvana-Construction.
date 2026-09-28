/* ============================================================
   Projects — the commercial work delivered across Maryland.

   `photo` is a slug into /images/projects/ when a real photograph
   exists; null projects render as graded type cards.

   `location` is OPTIONAL on purpose. The nine projects added from
   client-supplied photography arrived without locations, and inventing
   them would put false facts on the site. The card simply omits the
   line until a real location is supplied.

   GC, square footage, year and scope are deliberately absent for the
   same reason — see Pass 3 in
   docs/superpowers/specs/2026-09-17-logo-brand-rebuild-design.md
   ============================================================ */

export type ProjectCategory =
  | "Retail"
  | "Hospitality"
  | "Medical"
  | "Education"
  | "Community"
  | "Commercial";

export interface Project {
  index: string;
  slug: string;
  name: string;
  /* omitted where the real location is not known */
  location?: string;
  category: ProjectCategory;
  descriptor: string;
  /* processed image slug in /images/projects/, or null */
  photo: string | null;
  /* surfaced on the homepage */
  featured?: boolean;
}

export const projects: Project[] = [
  {
    index: "01",
    slug: "aldi-annapolis",
    name: "ALDI",
    location: "Annapolis, MD",
    category: "Retail",
    descriptor:
      "Ground-up framing and drywall for a new-build grocery anchor.",
    photo: "aldi",
  },
  {
    index: "02",
    slug: "golf-galaxy-towson",
    name: "Golf Galaxy",
    location: "Towson, MD",
    category: "Retail",
    descriptor:
      "Big-box retail fit-out: framing and finishes for a sporting-goods flagship.",
    photo: "golf-galaxy-night",
    featured: true,
  },
  {
    index: "03",
    slug: "jcc-park-heights",
    name: "Jewish Community Center",
    location: "Park Heights, MD",
    category: "Community",
    descriptor:
      "Community-center interiors framed and finished for constant public use.",
    photo: "jcc",
  },
  {
    index: "04",
    slug: "hcps-forest-hill-annex",
    name: "HCPS Forest Hill Annex",
    location: "Forest Hill, MD",
    category: "Education",
    descriptor:
      "Metal-stud framing and drywall for a Harford County Public Schools annex.",
    photo: "hcps-forest-hill",
    featured: true,
  },
  {
    index: "05",
    slug: "chipotle-bel-air",
    name: "Chipotle Mexican Grill",
    location: "Bel Air, MD",
    category: "Retail",
    descriptor:
      "Quick-service restaurant build-out delivered to brand standard.",
    photo: "chipotle",
  },
  {
    index: "06",
    slug: "mace-medical-dundalk",
    name: "MACE Medical",
    location: "Dundalk, MD",
    category: "Medical",
    descriptor:
      "Healthcare-grade framing and finishes for a medical facility.",
    photo: "mace-medical",
    featured: true,
  },
  {
    index: "07",
    slug: "flagship-carwash",
    name: "Flagship Carwash",
    location: "Glen Burnie & Gaithersburg, MD",
    category: "Commercial",
    descriptor:
      "Commercial framing and drywall delivered across multi-site carwash builds.",
    /* the original WP image for this project was a brand logo on white,
       not a building — this is the client's own photograph of the site */
    photo: "flagship-carwash-2",
  },

  /* ---- added from client-supplied photography, 2026-09-17 ----
     Name, sector and photograph only. No location, GC, size or year
     has been asserted where it is not known. */
  {
    index: "08",
    slug: "f45-training",
    name: "F45 Training",
    category: "Commercial",
    descriptor:
      "Fitness-studio interior: framing, acoustical ceiling and finishes around an open training floor.",
    /* the interior photograph shows the actual trade work; the
       higher-resolution exterior of the same project carries the hero */
    photo: "f45-interior",
    featured: true,
  },
  {
    index: "09",
    slug: "johns-hopkins",
    name: "Johns Hopkins University",
    location: "Baltimore, MD",
    category: "Education",
    descriptor:
      "Interior renovations carried out across multiple campus buildings.",
    photo: "johns-hopkins",
    featured: true,
  },
  {
    index: "10",
    slug: "first-watch",
    name: "First Watch",
    category: "Retail",
    descriptor:
      "Daytime-restaurant build-out, framed and finished to brand standard.",
    photo: "first-watch",
    featured: true,
  },
  {
    index: "11",
    slug: "panda-express",
    name: "Panda Express",
    category: "Retail",
    descriptor:
      "Quick-service restaurant interior delivered to a national brand standard.",
    photo: "panda-express",
  },
  {
    index: "12",
    slug: "autozone",
    name: "AutoZone",
    category: "Retail",
    descriptor:
      "Commercial build-out for a national auto-parts retailer.",
    photo: "autozone",
  },
  {
    index: "13",
    slug: "burlington",
    name: "Burlington",
    category: "Retail",
    descriptor:
      "Big-box retail interior framed and finished across the sales floor.",
    photo: "burlington",
  },
  {
    index: "14",
    slug: "grocery-outlet",
    name: "Grocery Outlet",
    location: "Milford Mill, MD",
    category: "Retail",
    descriptor:
      "Grocery build-out: framing, ceilings and finishes through to opening.",
    photo: "grocery-outlet",
  },
  {
    index: "15",
    slug: "five-below",
    name: "Five Below",
    category: "Retail",
    descriptor:
      "Value-retail interior framed and finished for a fast store opening.",
    photo: "five-below",
  },
  {
    index: "16",
    slug: "oreilly-auto-parts",
    name: "O'Reilly Auto Parts",
    category: "Retail",
    descriptor:
      "Auto-parts retail interior, framed and finished to the drawings.",
    photo: "oreilly",
  },
];

/* unique categories present, for the projects filter */
export const projectCategories: ProjectCategory[] = [
  ...new Set(projects.map((p) => p.category)),
] as ProjectCategory[];

/* projects promoted to the homepage */
export const featuredProjects = projects.filter((p) => p.featured);

/* the atmospheric / jobsite photos (real, but not tied to one
   named project) — used for the 3D panels and section imagery */
export const jobsitePhotos: string[] = [
  "jobsite-01",
  "jobsite-02",
  "jobsite-03",
  "jobsite-04",
  "jobsite-05",
  "jobsite-06",
  "jobsite-07",
  "jobsite-08",
];
