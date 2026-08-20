import test from "node:test";
import assert from "node:assert/strict";
import { matchesGlob } from "../src/glob.js";

test("glob supports recursive and single-segment wildcards", () => {
  assert.equal(matchesGlob("src/core/index.js", "src/**"), true);
  assert.equal(matchesGlob("src/index.js", "src/*.js"), true);
  assert.equal(matchesGlob("src/core/index.js", "src/*.js"), false);
  assert.equal(matchesGlob("private.pem", "**/*.pem"), true);
  assert.equal(matchesGlob("keys/private.pem", "**/*.pem"), true);
});
