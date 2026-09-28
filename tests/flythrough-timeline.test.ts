import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KEYS, ANCHORS, STAGES, HOTSPOTS, STATIONS, stageOpacity,
} from "../src/components/immersive/flythrough-timeline.ts";

test("stage windows are ordered and do not overlap", () => {
  for (let i = 1; i < STAGES.length; i++) {
    assert.ok(STAGES[i][0] >= STAGES[i - 1][1], `stage ${i} opens before ${i - 1} closes`);
  }
});

test("never more than one stage visible at any progress", () => {
  for (let p = 0; p <= 1.0001; p += 0.0005) {
    const visible = STAGES.filter((w) => stageOpacity(p, w) > 0.01).length;
    assert.ok(visible <= 1, `p=${p.toFixed(4)} shows ${visible} stages`);
  }
});

test("every stage reaches full opacity", () => {
  for (const w of STAGES) {
    const a = Math.max(0, w[0]);
    const b = Math.min(1, w[1]);
    assert.equal(stageOpacity((a + b) / 2, w), 1);
  }
});

test("hero is fully visible at 0 and the finale at 1", () => {
  assert.equal(stageOpacity(0, STAGES[0]), 1);
  assert.equal(stageOpacity(1, STAGES[STAGES.length - 1]), 1);
});

test("camera keys run 0 → 1 in ascending order", () => {
  assert.equal(KEYS[0][0], 0);
  assert.equal(KEYS[KEYS.length - 1][0], 1);
  for (let i = 1; i < KEYS.length; i++) assert.ok(KEYS[i][0] > KEYS[i - 1][0]);
});

test("every hotspot has an anchor; rail stations ascend inside [0,1]", () => {
  for (const h of HOTSPOTS) assert.ok(h.id in ANCHORS, h.id);
  for (let i = 0; i < STATIONS.length; i++) {
    assert.ok(STATIONS[i].p >= 0 && STATIONS[i].p <= 1);
    if (i) assert.ok(STATIONS[i].p > STATIONS[i - 1].p);
  }
});
