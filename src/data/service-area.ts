/* ============================================================
   Service area — the cities the About page lists, with real
   coordinates. One source for both the HTML list and the 3D map
   (MarylandMap). Nottingham is headquarters.
   ============================================================ */

export interface City {
  name: string;
  lat: number;
  lon: number;
  hq?: boolean;
}

export const serviceArea: City[] = [
  { name: "Baltimore", lat: 39.2904, lon: -76.6122 },
  { name: "Annapolis", lat: 38.9784, lon: -76.4922 },
  { name: "Towson", lat: 39.4015, lon: -76.6019 },
  { name: "Owings Mills", lat: 39.4196, lon: -76.7803 },
  { name: "Bel Air", lat: 39.5359, lon: -76.3483 },
  { name: "Forest Hill", lat: 39.5809, lon: -76.3897 },
  { name: "Aberdeen", lat: 39.5096, lon: -76.1641 },
  { name: "Glen Burnie", lat: 39.1626, lon: -76.6247 },
  { name: "Dundalk", lat: 39.2507, lon: -76.5205 },
  { name: "Middle River", lat: 39.3343, lon: -76.4394 },
  { name: "Gaithersburg", lat: 39.1434, lon: -77.2014 },
  { name: "Nottingham", lat: 39.3923, lon: -76.4886, hq: true },
];

export const MD_BBOX = { minLon: -79.49, maxLon: -75.04, minLat: 37.88, maxLat: 39.73 };

const midLat = (MD_BBOX.minLat + MD_BBOX.maxLat) / 2;
const k = Math.cos((midLat * Math.PI) / 180);

/* map units ≈ degrees × 4, equirectangular with a cos(lat) correction,
   centred on the bbox: x east, z south */
export function project(lon: number, lat: number): [number, number] {
  const cx = (MD_BBOX.minLon + MD_BBOX.maxLon) / 2;
  const cy = (MD_BBOX.minLat + MD_BBOX.maxLat) / 2;
  return [(lon - cx) * k * 4, -(lat - cy) * 4];
}
