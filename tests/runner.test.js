import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareExecution, runContract } from "../src/runner.js";
import { adapterProcess, listAdapters, resolveExecutable } from "../src/adapters.js";

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

  const result = await runContract(contract, { root, command: "node fake-agent.cjs", keepWorkspace: false });

  assert.equal(result.ok, true);
  assert.deepEqual(result.changedFiles, ["src/result.js"]);
  assert.deepEqual(result.findings, []);
  assert.equal(result.execution.exitCode, 0);
  await assert.rejects(() => fs.access(path.join(root, "src", "result.js")), { code: "ENOENT" });
});

test("codex adapter transports the prompt through stdin and env", async () => {
  const root = fileURLToPath(new URL("fixtures/adapter-conformance", import.meta.url));
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "actest-adapter-"));
  const bin = path.join(temporaryRoot, "bin");
  await fs.mkdir(bin);
  await fs.writeFile(
    path.join(bin, "fake-codex.cjs"),
    `const fs = require("node:fs");
const path = require("node:path");

let stdin = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  stdin += chunk;
});
process.stdin.on("end", () => {
  if (!process.env.AGENT_CONTRACT_PROMPT) {
    throw new Error("AGENT_CONTRACT_PROMPT was not provided");
  }
  if (stdin !== process.env.AGENT_CONTRACT_PROMPT) {
    throw new Error("stdin prompt did not match AGENT_CONTRACT_PROMPT");
  }
  fs.mkdirSync("src", { recursive: true });
  fs.writeFileSync(path.join("src", "result.js"), \`export const taskPrompt = \${JSON.stringify(stdin)};\\n\`);
});
`
  );
  await fs.writeFile(
    path.join(bin, "codex"),
    `#!/usr/bin/env node
require(require("node:path").join(__dirname, "fake-codex.cjs"));
`
  );
  await fs.chmod(path.join(bin, "codex"), 0o755);
  await fs.writeFile(path.join(bin, "codex.cmd"), "@echo off\r\nnode \"%~dp0\\fake-codex.cjs\"\r\n");

  const oldPath = process.env.PATH;
  process.env.PATH = [bin, oldPath].filter(Boolean).join(path.delimiter);
  try {
    const prompt = "Create the built-in adapter conformance result";
    const contract = {
      version: 1,
      name: "built-in-adapter-conformance",
      task: { prompt },
      boundaries: { allow: ["src/result.js"], maxChangedFiles: 1 },
      assertions: [
        { type: "file_exists", path: "src/result.js" },
        { type: "file_contains", path: "src/result.js", pattern: prompt }
      ]
    };

    const result = await runContract(contract, { root, adapter: "codex", keepWorkspace: false });

    assert.equal(result.ok, true);
    assert.deepEqual(result.changedFiles, ["src/result.js"]);
    assert.deepEqual(result.findings, []);
    assert.equal(result.execution.exitCode, 0);
  } finally {
    process.env.PATH = oldPath;
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("windows adapter resolution uses command shims from PATH", async () => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "actest-path-"));
  const bin = path.join(temporaryRoot, "bin");
  await fs.mkdir(bin);
  await fs.writeFile(path.join(bin, "codex.cmd"), "@echo off\r\n");

  try {
    assert.equal(
      resolveExecutable("codex", { Path: bin, PATHEXT: ".EXE;.CMD" }, "win32"),
      path.join(bin, "codex.cmd")
    );
    assert.equal(resolveExecutable("codex", { PATH: bin }, "linux"), "codex");
    assert.equal(resolveExecutable("codex.cmd", { Path: bin }, "win32"), "codex.cmd");
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("windows command shims execute through cmd", () => {
  const execution = prepareExecution(
    {
      executable: "C:\\Tools\\codex.cmd",
      args: ["exec", "--sandbox", "workspace-write", "--ephemeral", "-"]
    },
    "C:\\repo",
    "Fix it",
    { ComSpec: "C:\\Windows\\System32\\cmd.exe" },
    "win32"
  );

  assert.equal(execution.command, "C:\\Windows\\System32\\cmd.exe");
  assert.deepEqual(execution.args.slice(0, 3), ["/d", "/s", "/c"]);
  assert.equal(execution.args[3], "C:\\Tools\\codex.cmd exec --sandbox workspace-write --ephemeral -");
  assert.equal(execution.options.shell, false);
  assert.equal(execution.options.windowsVerbatimArguments, true);
  assert.equal(execution.options.env.AGENT_CONTRACT_PROMPT, "Fix it");
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
