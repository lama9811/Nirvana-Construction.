import { test } from "node:test";
import assert from "node:assert/strict";
import { deckPose, pinProgress, nearestIndex, progressForIndex } from "../src/lib/card-deck.ts";

test("pinProgress runs 0 → 1 across the pinned travel and clamps outside it", () => {
  assert.equal(pinProgress(0, 3000, 1000), 0);
  assert.equal(pinProgress(-1000, 3000, 1000), 0.5);
  assert.equal(pinProgress(-2000, 3000, 1000), 1);
  assert.equal(pinProgress(500, 3000, 1000), 0);
  assert.equal(pinProgress(-9000, 3000, 1000), 1);
  /* a track no taller than the viewport has no travel */
  assert.equal(pinProgress(-10, 800, 1000), 0);
});

test("the centre card sits flat, full size and on top", () => {
  const p = deckPose(0, false);
  assert.equal(p.x, 0);
  assert.equal(p.z, 0);
  assert.equal(p.ry, 0);
  assert.equal(p.scale, 1);
  assert.equal(p.opacity, 1);
  for (const d of [-2, -1, 1, 2]) assert.ok(deckPose(d, false).zIndex < p.zIndex);
});

test("cards either side mirror each other and turn toward the centre", () => {
  for (const d of [0.5, 1, 1.7, 2.4]) {
    const r = deckPose(d, false);
    const l = deckPose(-d, false);
    assert.equal(l.x, -r.x);
    assert.equal(l.ry, -r.ry);
    assert.equal(l.z, r.z);
    assert.ok(r.x > 0, "a later card sits to the right");
    assert.ok(r.ry < 0, "and turns its face back to the centre");
  }
});

test("cards recede and fade with distance, gone by three away", () => {
  assert.ok(deckPose(1, false).z < 0);
  assert.ok(deckPose(2, false).z < deckPose(1, false).z);
  assert.ok(deckPose(2, false).opacity < deckPose(1, false).opacity);
  assert.equal(deckPose(3, false).opacity, 0);
  assert.equal(deckPose(-4, false).opacity, 0);
});

test("compact (phones) spreads the deck wider so neighbours clear the centre card", () => {
  assert.ok(deckPose(1, true).x > deckPose(1, false).x);
});

test("index ↔ progress round-trips across the deck", () => {
  assert.equal(nearestIndex(0, 6), 0);
  assert.equal(nearestIndex(1, 6), 5);
  assert.equal(nearestIndex(0.49, 6), 2);
  assert.equal(nearestIndex(-1, 6), 0);
  for (let i = 0; i < 6; i++) assert.equal(nearestIndex(progressForIndex(i, 6), 6), i);
  assert.equal(progressForIndex(0, 1), 0);
});

test("the centre card and its first neighbours are fully opaque, so nothing ghosts through", () => {
  for (const d of [0, 0.5, 1, -1]) assert.equal(deckPose(d, false).opacity, 1);
});
