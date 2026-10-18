import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { adapterProcess, resolveExecutable } from "./adapters.js";
import { initializeBaseline } from "./git.js";
import { verifyContract } from "./verify.js";

export async function runContract(contract, options) {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-contract-test-"));
  const workspace = path.join(temporaryRoot, "workspace");
  let preserveWorkspace = false;
  try {
    await fs.cp(options.root, workspace, {
      recursive: true,
      filter: (source) => ![".git", "node_modules", ".agent-contract-runs", ".agent-contract-test"].includes(path.basename(source))
    });
    await initializeBaseline(workspace);

    const processSpec = options.adapter
      ? adapterProcess(options.adapter, contract.task.prompt)
      : { command: options.command, stdin: contract.task.prompt };
    const execution = await execute(processSpec, workspace, contract.task.prompt, contract.task.timeoutMs ?? 600000);
    const result = await verifyContract(contract, { root: workspace });
    result.execution = execution;
    if (execution.exitCode !== 0) {
      const message = execution.timedOut ? "Agent command timed out" : `Agent command exited ${execution.exitCode}`;
      result.findings.unshift({ rule: "agent-command", severity: "error", message });
      result.ok = false;
    }

    if (options.keepWorkspace) {
      preserveWorkspace = true;
      result.workspace = workspace;
    }
    return result;
  } finally {
    if (!preserveWorkspace) await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

function execute(processSpec, cwd, prompt, timeoutMs) {
  return new Promise((resolve, reject) => {
    const execution = prepareExecution(processSpec, cwd, prompt);
    const child = spawn(execution.command, execution.args, execution.options);
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const append = (current, chunk) => `${current}${chunk}`.slice(-4000);
    child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
    child.on("error", reject);
    child.stdin.end(processSpec.stdin ?? "");
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, timedOut, stdout, stderr });
    });
  });
}

export function prepareExecution(processSpec, cwd, prompt, env = process.env, platform = process.platform) {
  const options = {
    cwd,
    windowsHide: true,
    env: { ...env, AGENT_CONTRACT_PROMPT: prompt },
    stdio: ["pipe", "pipe", "pipe"]
  };

  if (processSpec.command) {
    return {
      command: processSpec.command,
      args: [],
      options: { ...options, shell: true }
    };
  }

  const executable = resolveExecutable(processSpec.executable, env, platform);
  const args = processSpec.args ?? [];
  if (platform === "win32" && isWindowsCommandScript(executable)) {
    return {
      command: env.ComSpec || env.COMSPEC || "cmd.exe",
      args: ["/d", "/s", "/c", [executable, ...args].map(quoteCmdArgument).join(" ")],
      options: { ...options, shell: false, windowsVerbatimArguments: true }
    };
  }

  return {
    command: executable,
    args,
    options: { ...options, shell: false }
  };
}

function isWindowsCommandScript(executable) {
  return [".cmd", ".bat"].includes(path.win32.extname(executable).toLowerCase());
}

function quoteCmdArgument(value) {
  const text = String(value);
  if (text === "") return "\"\"";
  if (!/[ \t"&()<>^|]/.test(text)) return text;
  return `"${text.replace(/(["^&|<>])/g, "^$1")}"`;
}
