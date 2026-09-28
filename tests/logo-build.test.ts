import { test } from "node:test";
import assert from "node:assert/strict";
import { LOGO_BARS, LOGO_SWOOSH } from "../src/data/logo-mark.ts";
import { LB_STAGES, LB_KEYS, barRise, swooshDraw } from "../src/components/immersive/logo-build-timeline.ts";
import { stageOpacity } from "../src/components/immersive/stage-fade.ts";

test("four bars, left to right, the third is tallest", () => {
  assert.equal(LOGO_BARS.length, 4);
  for (let i = 1; i < 4; i++) assert.ok(LOGO_BARS[i].x0 > LOGO_BARS[i - 1].x0);
  const h = LOGO_BARS.map((b) => b.bottom - Math.min(b.topL, b.topR));
  assert.equal(h.indexOf(Math.max(...h)), 2);
  assert.equal(LOGO_SWOOSH.length, 2);
});

test("bars rise in order and finish; swoosh draws after the bars start", () => {
  const n = LOGO_BARS.length;
  for (let i = 0; i < n; i++) {
    assert.equal(barRise(0, i, n), 0);
    assert.equal(barRise(1, i, n), 1);
    if (i) assert.ok(barRise(0.3, i, n) <= barRise(0.3, i - 1, n));
  }
  assert.equal(swooshDraw(0), 0);
  assert.equal(swooshDraw(1), 1);
});

test("never two copy stages at once; keys ascend 0 → 1", () => {
  for (let p = 0; p <= 1; p += 0.0005) {
    assert.ok(LB_STAGES.filter((w) => stageOpacity(p, w) > 0.01).length <= 1, `p=${p}`);
  }
  assert.equal(LB_KEYS[0][0], 0);
  assert.equal(LB_KEYS[LB_KEYS.length - 1][0], 1);
  for (let i = 1; i < LB_KEYS.length; i++) assert.ok(LB_KEYS[i][0] > LB_KEYS[i - 1][0]);
});
