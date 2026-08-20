#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { initContract, loadContract } from "./contract.js";
import { runContract } from "./runner.js";
import { verifyContract } from "./verify.js";

const VERSION = "0.1.0";

function printHelp() {
  console.log(`Agent Contract Test ${VERSION}

Deterministic contract tests for AI coding agents.

Usage:
  actest init [directory]
  actest validate [contract]
  actest verify [contract] [--root directory] [--base git-ref] [--json]
  actest run [contract] --command "agent command" [--root directory] --allow-exec [--json]

Commands:
  init      Create a starter agent-contract.json
  validate  Validate a contract without changing files
  verify    Check the current workspace against a contract
  run       Copy the workspace, run an agent command, then verify the result

The run command executes a user-supplied command. It requires --allow-exec and
uses a temporary workspace, but it is not an operating-system security sandbox.
`);
}

function parseArgs(args) {
  const positional = [];
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    if (["json", "allow-exec", "keep-workspace"].includes(key)) {
      options[key] = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    options[key] = value;
    index += 1;
  }
  return { positional, options };
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.contract}`);
  console.log(`Checked ${result.changedFiles.length} changed file(s); ${result.findings.length} finding(s).`);
  for (const finding of result.findings) {
    console.log(`- [${finding.severity.toUpperCase()}] ${finding.rule}: ${finding.message}`);
  }
  if (result.workspace) console.log(`Workspace: ${result.workspace}`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || ["help", "--help", "-h"].includes(command)) {
    printHelp();
    return;
  }
  if (["--version", "-v", "version"].includes(command)) {
    console.log(VERSION);
    return;
  }

  const { positional, options } = parseArgs(rest);
  if (command === "init") {
    const output = await initContract(path.resolve(positional[0] ?? "."));
    console.log(`Created ${output}`);
    return;
  }

  const contractPath = path.resolve(positional[0] ?? "agent-contract.json");
  if (command === "validate") {
    const contract = await loadContract(contractPath);
    const result = { ok: true, contract: contract.name, path: contractPath, version: contract.version };
    console.log(options.json ? JSON.stringify(result, null, 2) : `VALID ${contract.name} (${contractPath})`);
    return;
  }

  if (command === "verify") {
    const contract = await loadContract(contractPath);
    const result = await verifyContract(contract, {
      root: path.resolve(options.root ?? "."),
      base: options.base
    });
    printResult(result, options.json);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  if (command === "run") {
    if (!options.command) throw new Error("run requires --command");
    if (!options["allow-exec"]) throw new Error("run requires --allow-exec because it executes a user-supplied command");
    const contract = await loadContract(contractPath);
    const result = await runContract(contract, {
      root: path.resolve(options.root ?? "."),
      command: options.command,
      keepWorkspace: options["keep-workspace"]
    });
    printResult(result, options.json);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`ERROR ${error.message}`);
  process.exitCode = 2;
});
