import { test } from "node:test";
import assert from "node:assert/strict";
import { drumPose, stackTilt, scrubLit, risePose } from "../src/lib/drum.ts";

test("the drum row at the centre of the screen sits flat and fully lit", () => {
  const p = drumPose(0);
  assert.equal(p.rx, 0);
  assert.equal(p.opacity, 1);
  assert.equal(p.scale, 1);
});

test("rows above the centre lean back, rows below lean forward, symmetrically", () => {
  for (const d of [0.25, 0.6, 1]) {
    assert.ok(drumPose(-d).rx > 0, "above: top edge away");
    assert.equal(drumPose(-d).rx, -drumPose(d).rx);
    assert.equal(drumPose(-d).opacity, drumPose(d).opacity);
  }
});

test("rows dim and shrink with distance and clamp beyond the screen edge", () => {
  assert.ok(drumPose(0.6).opacity < drumPose(0.2).opacity);
  assert.ok(drumPose(0.6).scale < drumPose(0.2).scale);
  assert.deepEqual(drumPose(3), drumPose(1.2));
  assert.ok(drumPose(1.2).opacity > 0, "never fully invisible: it is real content");
});

test("stackTilt turns the photo stack through its range as the band scrolls past", () => {
  assert.equal(stackTilt(0.5).ry, 0);
  assert.ok(stackTilt(0).ry < 0);
  assert.ok(stackTilt(1).ry > 0);
  assert.equal(stackTilt(-1).ry, stackTilt(0).ry);
  assert.equal(stackTilt(2).ry, stackTilt(1).ry);
});

test("scrubLit lights words in reading order as progress runs 0 → 1", () => {
  assert.equal(scrubLit(0, 0, 10), 0);
  assert.equal(scrubLit(1, 9, 10), 1);
  assert.ok(scrubLit(0.5, 2, 10) > scrubLit(0.5, 7, 10));
  for (const p of [0, 0.3, 0.8, 1]) {
    for (let i = 0; i < 10; i++) {
      const v = scrubLit(p, i, 10);
      assert.ok(v >= 0 && v <= 1);
    }
  }
});

test("risePose: anything at or above the rise line stands flat and fully shown", () => {
  for (const d of [-1, -0.3, 0, 0.2]) {
    const p = risePose(d);
    assert.equal(p.rx, 0);
    assert.equal(p.z, 0);
    assert.equal(p.y, 0);
    assert.equal(p.opacity, 1);
  }
});

test("risePose: below the line cards lie back, sink and dim — more the lower they are", () => {
  const a = risePose(0.6);
  const b = risePose(1.1);
  assert.ok(a.rx > 0 && b.rx > a.rx, "top edge leans away");
  assert.ok(a.z < 0 && b.z < a.z);
  assert.ok(b.opacity < a.opacity && b.opacity >= 0.45, "dimmed, never hidden");
  assert.deepEqual(risePose(5), risePose(1.1));
});
