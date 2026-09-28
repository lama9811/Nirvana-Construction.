import { test } from "node:test";
import assert from "node:assert/strict";
import { flipParts } from "../src/lib/depth.ts";

test("digits become drums, everything else is static", () => {
  assert.deepEqual(flipParts("19+"), [
    { kind: "digit", value: 1 }, { kind: "digit", value: 9 }, { kind: "static", text: "+" },
  ]);
  assert.deepEqual(flipParts("DBE"), [{ kind: "static", text: "DBE" }]);
  assert.deepEqual(flipParts("06"), [{ kind: "digit", value: 0 }, { kind: "digit", value: 6 }]);
  assert.deepEqual(flipParts(""), []);
});
