import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function changedFiles(root, base) {
  if (base) {
    const { stdout } = await git(root, ["diff", "--name-only", "--diff-filter=ACMRDTUXB", `${base}...HEAD`]);
    return lines(stdout);
  }
  const { stdout } = await git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const statusLines = stdout.split(/\r?\n/).filter((line) => line.length >= 3);
  return [...new Set(statusLines.map(parseStatusPath).filter(Boolean))].sort();
}

export async function initializeBaseline(root) {
  await git(root, ["init", "--quiet"]);
  await git(root, ["config", "user.email", "agent-contract-test@localhost"]);
  await git(root, ["config", "user.name", "Agent Contract Test"]);
  await git(root, ["add", "--all"]);
  await git(root, ["commit", "--quiet", "-m", "contract baseline", "--no-gpg-sign"]);
}

async function git(root, args) {
  try {
    return await execFileAsync("git", args, { cwd: root, windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`Git command failed in ${root}: ${error.stderr || error.message}`);
  }
}

function lines(value) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function parseStatusPath(line) {
  const raw = line.slice(3);
  const renamed = raw.includes(" -> ") ? raw.split(" -> ").at(-1) : raw;
  return renamed.replace(/^"|"$/g, "").replaceAll("\\", "/");
}
