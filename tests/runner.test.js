import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runContract } from "../src/runner.js";
import { adapterProcess, listAdapters } from "../src/adapters.js";

test("synthetic adapter receives the prompt and passes contract verification", async () => {
  const root = fileURLToPath(new URL("fixtures/adapter-conformance", import.meta.url));
  const prompt = "Create the cross-platform conformance result";
  const contract = {
    version: 1,
    name: "synthetic-adapter-conformance",
    task: { prompt },
    boundaries: { allow: ["src/result.js"], maxChangedFiles: 1 },
    assertions: [
      { type: "file_exists", path: "src/result.js" },
      { type: "file_contains", path: "src/result.js", pattern: prompt }
    ]
  };

  const result = await runContract(contract, { root, command: "node fake-agent.js", keepWorkspace: false });

  assert.equal(result.ok, true);
  assert.deepEqual(result.changedFiles, ["src/result.js"]);
  assert.deepEqual(result.findings, []);
  assert.equal(result.execution.exitCode, 0);
  await assert.rejects(() => fs.access(path.join(root, "src", "result.js")), { code: "ENOENT" });
});

test("built-in adapters use non-interactive edit modes", () => {
  assert.deepEqual(listAdapters().map((item) => item.id), ["codex", "claude", "gemini"]);
  assert.deepEqual(adapterProcess("codex", "Fix it"), {
    executable: "codex",
    args: ["exec", "--sandbox", "workspace-write", "--ephemeral", "-"],
    stdin: "Fix it",
    adapter: "codex"
  });
  assert.ok(adapterProcess("claude", "Fix it").args.includes("acceptEdits"));
  assert.equal(adapterProcess("gemini", "Fix it").args.at(-1), "Fix it");
  assert.throws(() => adapterProcess("unknown", "Fix it"), /Unknown adapter/);
});
