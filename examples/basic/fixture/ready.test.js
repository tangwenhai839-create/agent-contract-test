import test from "node:test";
import assert from "node:assert/strict";
import { ready } from "./src/ready.js";

test("feature is ready", () => {
  assert.equal(ready, true);
});
