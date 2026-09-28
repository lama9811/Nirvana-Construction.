import { test } from "node:test";
import assert from "node:assert/strict";
import { serviceArea, MD_BBOX, project } from "../src/data/service-area.ts";
import { MD_OUTLINE } from "../src/data/maryland-outline.ts";

const ABOUT_CITIES = ["Baltimore","Annapolis","Towson","Owings Mills","Bel Air","Forest Hill","Aberdeen","Glen Burnie","Dundalk","Middle River","Gaithersburg","Nottingham"];

test("every About city has coordinates inside Maryland's bbox; Nottingham is HQ", () => {
  assert.deepEqual(serviceArea.map((c) => c.name), ABOUT_CITIES);
  for (const c of serviceArea) {
    assert.ok(c.lon > MD_BBOX.minLon && c.lon < MD_BBOX.maxLon, c.name);
    assert.ok(c.lat > MD_BBOX.minLat && c.lat < MD_BBOX.maxLat, c.name);
  }
  assert.deepEqual(serviceArea.filter((c) => c.hq).map((c) => c.name), ["Nottingham"]);
});

test("outline is a real, closed Maryland ring inside the bbox", () => {
  assert.ok(MD_OUTLINE.length >= 60 && MD_OUTLINE.length <= 400, String(MD_OUTLINE.length));
  const [a, b] = [MD_OUTLINE[0], MD_OUTLINE[MD_OUTLINE.length - 1]];
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05);
  for (const [lon, lat] of MD_OUTLINE) {
    assert.ok(lon >= MD_BBOX.minLon && lon <= MD_BBOX.maxLon && lat >= MD_BBOX.minLat && lat <= MD_BBOX.maxLat);
  }
});

test("projection keeps geography: Gaithersburg west of Baltimore, Annapolis south of Towson", () => {
  assert.ok(project(-77.2014, 39.1434)[0] < project(-76.6122, 39.2904)[0]);
  assert.ok(project(-76.4922, 38.9784)[1] > project(-76.6019, 39.4015)[1]);
});
