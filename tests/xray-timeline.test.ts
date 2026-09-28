import { test } from "node:test";
import assert from "node:assert/strict";
import { XRAY_STAGES, XRAY_CHAPTERS } from "../src/components/immersive/xray-timeline.ts";
import { stageOpacity } from "../src/components/immersive/stage-fade.ts";

test("intro and outro never overlap and each reaches full opacity", () => {
  const { intro, outro } = XRAY_STAGES;
  assert.ok(outro[0] >= intro[1]);
  for (let p = 0; p <= 1; p += 0.0005) {
    assert.ok(!(stageOpacity(p, intro) > 0.01 && stageOpacity(p, outro) > 0.01), `p=${p}`);
  }
  assert.equal(stageOpacity(0, intro), 1);
  assert.equal(stageOpacity(1, outro), 1);
});

test("chapters ascend from 0 and stay inside [0,1]", () => {
  assert.equal(XRAY_CHAPTERS[0][0], 0);
  for (let i = 1; i < XRAY_CHAPTERS.length; i++) {
    assert.ok(XRAY_CHAPTERS[i][0] > XRAY_CHAPTERS[i - 1][0]);
    assert.ok(XRAY_CHAPTERS[i][0] <= 1);
  }
});
