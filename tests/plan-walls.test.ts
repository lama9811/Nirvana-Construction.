import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAN_WALLS, PLAN_PX, wallRise } from "../src/data/plan-walls.ts";

test("walls are real segments inside the sheet", () => {
  assert.ok(PLAN_WALLS.length >= 12, String(PLAN_WALLS.length));
  for (const [x1, y1, x2, y2, t] of PLAN_WALLS) {
    for (const [x, y] of [[x1, y1], [x2, y2]]) assert.ok(x >= 0 && x <= PLAN_PX.w && y >= 0 && y <= PLAN_PX.h);
    assert.ok(Math.hypot(x2 - x1, y2 - y1) > 4);
    assert.ok(t >= 2 && t <= 14);
  }
});

test("every wall is fully up by the end and flat at the start", () => {
  const n = PLAN_WALLS.length;
  for (let i = 0; i < n; i++) { assert.equal(wallRise(0, i, n), 0); assert.equal(wallRise(1, i, n), 1); }
});
