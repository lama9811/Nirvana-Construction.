/* ============================================================
   The /projects/ 3D corridor — curated, ordered stations.
   Data only. Names, categories and locations are looked up from
   projects.ts by slug in src/lib/corridor.ts so they cannot drift.

   Rules (spec §4.2): every client photograph from
   ~/Desktop/My works/Website Photos appears exactly once; the
   blurry JCC upscale is excluded; projects with no photograph
   stay in the grid only. tests/corridor.test.ts enforces all three.
   ============================================================ */

export interface CorridorStation {
  /* Project.slug, or null for a non-project panel */
  project: string | null;
  /* 1 photo, or 2 shown as a pair on the same station */
  photos: string[];
  label?: string;
}

export const corridorStations: CorridorStation[] = [
  { project: "aldi-annapolis", photos: ["aldi"] },
  { project: "golf-galaxy-towson", photos: ["golf-galaxy-night", "golf-galaxy-day"] },
  { project: "hcps-forest-hill-annex", photos: ["hcps-forest-hill"] },
  { project: "chipotle-bel-air", photos: ["chipotle"] },
  { project: "mace-medical-dundalk", photos: ["mace-medical"] },
  { project: "flagship-carwash", photos: ["flagship-carwash-2"] },
  { project: "f45-training", photos: ["f45-exterior", "f45-interior"] },
  { project: "johns-hopkins", photos: ["johns-hopkins"] },
  { project: "first-watch", photos: ["first-watch", "first-watch-interior"] },
  { project: "panda-express", photos: ["panda-express"] },
  { project: "autozone", photos: ["autozone"] },
  { project: "burlington", photos: ["burlington"] },
  { project: "grocery-outlet", photos: ["grocery-outlet"] },
  { project: "five-below", photos: ["five-below"] },
  { project: "oreilly-auto-parts", photos: ["oreilly"] },
];
