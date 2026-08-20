import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runContract } from "../src/runner.js";

test("runner executes in a disposable copy and verifies the result", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "actest-runner-"));
  await fs.mkdir(path.join(root, "src"));
  await fs.writeFile(path.join(root, "agent.js"), "import fs from 'node:fs'; fs.writeFileSync('src/result.js', 'export const result = 42;\\n');\n");
  const contract = {
    version: 1,
    name: "runner-test",
    task: { prompt: "Write the result" },
    boundaries: { allow: ["src/**"] },
    assertions: [{ type: "file_contains", path: "src/result.js", pattern: "42" }]
  };
  const result = await runContract(contract, { root, command: "node agent.js", keepWorkspace: false });
  assert.equal(result.ok, true);
  await assert.rejects(() => fs.access(path.join(root, "src", "result.js")));
  await fs.rm(root, { recursive: true, force: true });
});
