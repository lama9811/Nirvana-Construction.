/* ============================================================
   Projects — the commercial work delivered across Maryland.
   `photo` is a slug into /images/projects/ when a real
   photograph exists; null projects render as graded type cards.
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
  location: string;
  category: ProjectCategory;
  descriptor: string;
  /* processed image slug in /images/projects/, or null */
  photo: string | null;
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
    photo: null,
  },
  {
    index: "02",
    slug: "golf-galaxy-towson",
    name: "Golf Galaxy",
    location: "Towson, MD",
    category: "Retail",
    descriptor:
      "Big-box retail fit-out — framing and finishes for a sporting-goods flagship.",
    photo: "golf-galaxy",
  },
  {
    index: "03",
    slug: "7-eleven-middle-river",
    name: "7-Eleven",
    location: "Middle River, MD",
    category: "Retail",
    descriptor:
      "Convenience-retail interior, framed and finished on a tight turnaround.",
    photo: null,
  },
  {
    index: "04",
    slug: "jcc-park-heights",
    name: "Jewish Community Center",
    location: "Park Heights, MD",
    category: "Community",
    descriptor:
      "Community-center interiors framed and finished for constant public use.",
    photo: "jcc",
  },
  {
    index: "05",
    slug: "hcps-forest-hill-annex",
    name: "HCPS Forest Hill Annex",
    location: "Forest Hill, MD",
    category: "Education",
    descriptor:
      "Metal-stud framing and drywall for a Harford County Public Schools annex.",
    photo: "hcps-forest-hill",
  },
  {
    index: "06",
    slug: "chipotle-bel-air",
    name: "Chipotle Mexican Grill",
    location: "Bel Air, MD",
    category: "Retail",
    descriptor:
      "Quick-service restaurant build-out delivered to brand standard.",
    photo: null,
  },
  {
    index: "07",
    slug: "mill-station-owings-mills",
    name: "Mill Station",
    location: "Owings Mills, MD",
    category: "Retail",
    descriptor:
      "Retail-center tenant spaces framed and finished across multiple units.",
    photo: null,
  },
  {
    index: "08",
    slug: "mace-medical-dundalk",
    name: "MACE Medical",
    location: "Dundalk, MD",
    category: "Medical",
    descriptor:
      "Healthcare-grade framing and finishes for a medical facility.",
    photo: "mace-medical",
  },
  {
    index: "09",
    slug: "flagship-carwash",
    name: "Flagship Carwash",
    location: "Glen Burnie & Gaithersburg, MD",
    category: "Commercial",
    descriptor:
      "Commercial framing and drywall delivered across multi-site carwash builds.",
    photo: "flagship-carwash",
  },
  {
    index: "10",
    slug: "davita-aberdeen",
    name: "DaVita",
    location: "Aberdeen, MD",
    category: "Medical",
    descriptor:
      "Dialysis-clinic interior built to healthcare infection-control standards.",
    photo: null,
  },
];

/* unique categories present, for the projects filter */
export const projectCategories: ProjectCategory[] = [
  ...new Set(projects.map((p) => p.category)),
] as ProjectCategory[];

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
