import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initializeBaseline } from "../src/git.js";
import { verifyContract } from "../src/verify.js";
import { toSarif } from "../src/sarif.js";

const contract = {
  version: 1,
  name: "test-contract",
  task: { prompt: "Create a safe feature" },
  boundaries: { allow: ["src/**"], deny: ["**/*.pem"], maxChangedFiles: 2 },
  assertions: [
    { type: "file_exists", path: "src/feature.js" },
    { type: "file_contains", path: "src/feature.js", pattern: "export" }
  ]
};

test("verify passes an in-scope change", async () => {
  const root = await workspace();
  await fs.writeFile(path.join(root, "src", "feature.js"), "export const ready = true;\n");
  const result = await verifyContract(contract, { root });
  assert.equal(result.ok, true);
  assert.deepEqual(result.changedFiles, ["src/feature.js"]);
  await fs.rm(root, { recursive: true, force: true });
});

test("verify rejects denied and out-of-scope changes", async () => {
  const root = await workspace();
  await fs.writeFile(path.join(root, "secret.pem"), "not-a-real-key\n");
  const result = await verifyContract(contract, { root });
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((item) => item.rule === "denied-path"));
  assert.ok(result.findings.some((item) => item.rule === "outside-allowed-paths"));
  const sarif = toSarif(result, "0.2.0");
  assert.equal(sarif.version, "2.1.0");
  assert.equal(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri, "secret.pem");
  await fs.rm(root, { recursive: true, force: true });
});

async function workspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "actest-workspace-"));
  await fs.mkdir(path.join(root, "src"));
  await fs.writeFile(path.join(root, "src", ".gitkeep"), "");
  await initializeBaseline(root);
  return root;
}
