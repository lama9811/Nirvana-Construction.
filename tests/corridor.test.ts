import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import manifest from "../src/data/image-manifest.json" with { type: "json" };
import { projects } from "../src/data/projects.ts";
import { corridorStations } from "../src/data/corridor.ts";
import {
  resolveStations, textureFor, honestPanelWidth, stationProgress,
  activeStation, CORRIDOR_PHASES, trackVh,
} from "../src/lib/corridor.ts";

const CLIENT_PHOTOS = [
  "aldi", "autozone", "burlington", "chipotle", "f45-exterior",
  "f45-interior", "first-watch", "first-watch-interior", "five-below",
  "flagship-carwash-2", "golf-galaxy-day", "golf-galaxy-night", "johns-hopkins",
  "grocery-outlet", "oreilly", "panda-express",
];
const M = manifest as Record<string, { webp: number[]; display: number | null; aspect: number | null }>;
const resolved = resolveStations(corridorStations, projects, M, 1600);
const allSlugs = resolved.flatMap((s) => s.panels.map((p) => p.slug));

test("15 stations, 18 panels", () => {
  assert.equal(resolved.length, 15);
  assert.equal(allSlugs.length, 18);
});

test("every client photograph appears exactly once", () => {
  for (const s of CLIENT_PHOTOS) assert.equal(allSlugs.filter((x) => x === s).length, 1, s);
});

test("JCC and the blurry WP images are excluded", () => {
  for (const s of ["jcc", "flagship-carwash", "golf-galaxy", "jobsite-01", "jobsite-07"]) {
    assert.ok(!allSlugs.includes(s), s);
  }
});

test("every panel URL is a file that exists on disk", () => {
  for (const st of resolved) for (const p of st.panels) {
    assert.ok(existsSync(`public${p.url}`), p.url);
  }
  for (const st of resolveStations(corridorStations, projects, M, 800)) for (const p of st.panels) {
    assert.ok(existsSync(`public${p.url}`), p.url);
    assert.ok(p.px <= 800, `${p.url} ${p.px}`);
  }
});

test("names/meta come from projects.ts; every stop is a real project", () => {
  assert.ok(resolved.every((s) => s.project !== null));
  assert.equal(resolved[0].name, "ALDI");
  const gg = resolved.find((s) => s.project === "golf-galaxy-towson")!;
  assert.equal(gg.name, "Golf Galaxy");
  assert.equal(gg.panels.length, 2);
  const fw = resolved.find((s) => s.project === "first-watch")!;
  assert.ok(!fw.meta.includes("undefined"));
});

test("unknown slugs throw at build time", () => {
  assert.throws(() => resolveStations([{ project: "nope", photos: ["aldi"] }], projects, M, 1600));
  assert.throws(() => resolveStations([{ project: null, photos: ["missing-photo"] }], projects, M, 1600));
});

test("textureFor picks the widest file ≤ maxPx, never above", () => {
  assert.deepEqual(textureFor("f45-exterior", M["f45-exterior"], 1600), { url: "/images/projects/f45-exterior-1600.webp", px: 1600 });
  assert.deepEqual(textureFor("f45-exterior", M["f45-exterior"], 800), { url: "/images/projects/f45-exterior-800.webp", px: 800 });
  assert.deepEqual(textureFor("oreilly", M["oreilly"], 1600), { url: "/images/projects/oreilly-259.webp", px: 259 });
});

test("honestPanelWidth: capped by resolution, never above max", () => {
  assert.equal(honestPanelWidth(259, 3.4, 0.01), 259 * 1.25 * 0.01);
  assert.equal(honestPanelWidth(1600, 3.4, 0.01), 3.4);
});

test("stations are spread evenly across the travel range", () => {
  const { travelStart, travelEnd } = CORRIDOR_PHASES;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const p = stationProgress(i, n);
    assert.ok(p > travelStart && p < travelEnd);
    assert.equal(activeStation(p, n), i);
  }
  assert.equal(activeStation(travelStart - 0.01, n), -1);
  assert.equal(activeStation(travelEnd + 0.01, n), -1);
});

test("phases are ascending", () => {
  const v = Object.values(CORRIDOR_PHASES);
  for (let i = 1; i < v.length; i++) assert.ok(v[i] > v[i - 1]);
});

test("track length scales with station count", () => {
  assert.equal(trackVh(16, false), 240 + 16 * 55);
  assert.equal(trackVh(16, true), 200 + 16 * 45);
});
