import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { initializeBaseline } from "./git.js";
import { verifyContract } from "./verify.js";

export async function runContract(contract, options) {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-contract-test-"));
  const workspace = path.join(temporaryRoot, "workspace");
  await fs.cp(options.root, workspace, {
    recursive: true,
    filter: (source) => ![".git", "node_modules", ".agent-contract-runs"].includes(path.basename(source))
  });
  await initializeBaseline(workspace);

  const execution = await execute(options.command, workspace, contract.task.prompt, contract.task.timeoutMs ?? 600000);
  const result = await verifyContract(contract, { root: workspace });
  result.execution = execution;
  if (execution.exitCode !== 0) {
    result.findings.unshift({ rule: "agent-command", severity: "error", message: `Agent command exited ${execution.exitCode}` });
    result.ok = false;
  }

  if (options.keepWorkspace) {
    result.workspace = workspace;
  } else {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
  return result;
}

function execute(command, cwd, prompt, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      windowsHide: true,
      env: { ...process.env, AGENT_CONTRACT_PROMPT: prompt },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.stdin.end(prompt);
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stdout: stdout.slice(-4000), stderr: stderr.slice(-4000) });
    });
  });
}
