import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { changedFiles } from "./git.js";
import { matchesAny } from "./glob.js";

export async function verifyContract(contract, options) {
  const root = path.resolve(options.root);
  const files = await changedFiles(root, options.base);
  const findings = [];
  const boundaries = contract.boundaries ?? {};

  if (Number.isInteger(boundaries.maxChangedFiles) && files.length > boundaries.maxChangedFiles) {
    findings.push(finding("max-changed-files", "error", `${files.length} files changed; limit is ${boundaries.maxChangedFiles}`));
  }
  for (const file of files) {
    if (boundaries.deny?.length && matchesAny(file, boundaries.deny)) {
      findings.push(finding("denied-path", "error", `${file} matches a denied path`, file));
    }
    if (boundaries.allow?.length && !matchesAny(file, boundaries.allow)) {
      findings.push(finding("outside-allowed-paths", "error", `${file} is outside allowed paths`, file));
    }
  }

  for (const assertion of contract.assertions) {
    const result = await evaluateAssertion(assertion, root);
    if (result) findings.push(result);
  }

  return {
    schemaVersion: 1,
    ok: findings.every((item) => item.severity !== "error"),
    contract: contract.name,
    root,
    changedFiles: files,
    findings
  };
}

async function evaluateAssertion(assertion, root) {
  if (assertion.type === "command") return runAssertionCommand(assertion, root);
  const target = safePath(root, assertion.path);
  const exists = await fs.access(target).then(() => true, () => false);
  if (assertion.type === "file_exists" && !exists) {
    return finding("file-exists", "error", `${assertion.path} does not exist`, assertion.path);
  }
  if (assertion.type === "file_not_exists" && exists) {
    return finding("file-not-exists", "error", `${assertion.path} exists but must not`, assertion.path);
  }
  if (!exists || !["file_contains", "file_not_contains"].includes(assertion.type)) return null;
  const content = await fs.readFile(target, "utf8");
  const matched = content.includes(assertion.pattern);
  if (assertion.type === "file_contains" && !matched) {
    return finding("file-contains", "error", `${assertion.path} does not contain the required text`, assertion.path);
  }
  if (assertion.type === "file_not_contains" && matched) {
    return finding("file-not-contains", "error", `${assertion.path} contains forbidden text`, assertion.path);
  }
  return null;
}

function runAssertionCommand(assertion, root) {
  const timeoutMs = assertion.timeoutMs ?? 120000;
  return new Promise((resolve) => {
    const child = spawn(assertion.command, { cwd: root, shell: true, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve(finding("command", "error", `${assertion.command} could not start: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0 ? null : finding("command", "error", `${assertion.command} exited ${code}: ${output.trim().slice(-500)}`));
    });
  });
}

function safePath(root, relative) {
  const target = path.resolve(root, relative);
  const prefix = `${root}${path.sep}`;
  if (target !== root && !target.startsWith(prefix)) throw new Error(`Assertion path escapes workspace: ${relative}`);
  return target;
}

function finding(rule, severity, message, file) {
  return { rule, severity, message, ...(file ? { file } : {}) };
}
