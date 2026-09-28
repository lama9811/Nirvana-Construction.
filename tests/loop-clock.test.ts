import { test } from "node:test";
import assert from "node:assert/strict";
import { pingPong, cycleLength } from "../src/components/immersive/loop-clock.ts";

const L = { from: 0.2, to: 0.8, up: 8, holdHi: 3, down: 5, holdLo: 2 };

test("starts at `from`, reaches `to` after `up`, holds, returns, holds", () => {
  assert.equal(pingPong(0, L), 0.2);
  assert.ok(Math.abs(pingPong(8, L) - 0.8) < 1e-9);
  assert.ok(Math.abs(pingPong(9.5, L) - 0.8) < 1e-9); // holding high
  assert.ok(Math.abs(pingPong(16, L) - 0.2) < 1e-9); // back down
  assert.ok(Math.abs(pingPong(17, L) - 0.2) < 1e-9); // holding low
});

test("loops seamlessly: one full cycle later it is the same value", () => {
  const c = cycleLength(L);
  assert.equal(c, 18);
  for (const t of [0, 1.3, 7.9, 10, 14.2, 17.5]) {
    assert.ok(Math.abs(pingPong(t, L) - pingPong(t + c, L)) < 1e-9, `t=${t}`);
  }
});

test("never leaves [from, to] and never jumps", () => {
  let prev = pingPong(0, L);
  for (let t = 0; t < 40; t += 0.01) {
    const v = pingPong(t, L);
    assert.ok(v >= 0.2 - 1e-9 && v <= 0.8 + 1e-9);
    assert.ok(Math.abs(v - prev) < 0.01, `jump at t=${t}`);
    prev = v;
  }
});
