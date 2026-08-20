import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initContract, loadContract } from "../src/contract.js";

test("init creates a valid starter contract", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "actest-contract-"));
  const file = await initContract(root);
  const contract = await loadContract(file);
  assert.equal(contract.version, 1);
  assert.equal(contract.assertions.length, 2);
  await fs.rm(root, { recursive: true, force: true });
});

test("invalid contracts provide actionable errors", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "actest-invalid-"));
  const file = path.join(root, "bad.json");
  await fs.writeFile(file, JSON.stringify({ version: 2 }));
  await assert.rejects(() => loadContract(file), /version must be 1/);
  await fs.rm(root, { recursive: true, force: true });
});
