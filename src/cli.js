#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import fs from "node:fs/promises";
import { listAdapters } from "./adapters.js";
import { initContract, loadContract } from "./contract.js";
import { runContract } from "./runner.js";
import { verifyContract } from "./verify.js";
import { toSarif } from "./sarif.js";

const VERSION = "0.2.0";

function printHelp() {
  console.log(`Agent Contract Test ${VERSION}

Deterministic contract tests for AI coding agents.

Usage:
  actest init [directory]
  actest validate [contract]
  actest adapters [--json]
  actest verify [contract] [--root directory] [--base git-ref] [--format human|json|sarif] [--output file]
  actest run [contract] (--adapter codex|claude|gemini | --command "agent command") --allow-exec

Commands:
  init      Create a starter agent-contract.json
  validate  Validate a contract without changing files
  adapters  List built-in coding-agent adapters
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

function humanResult(result) {
  const lines = [`${result.ok ? "PASS" : "FAIL"} ${result.contract}`];
  lines.push(`Checked ${result.changedFiles.length} changed file(s); ${result.findings.length} finding(s).`);
  for (const finding of result.findings) {
    lines.push(`- [${finding.severity.toUpperCase()}] ${finding.rule}: ${finding.message}`);
  }
  if (result.workspace) lines.push(`Workspace: ${result.workspace}`);
  return `${lines.join("\n")}\n`;
}

async function printResult(result, options) {
  const format = options.json ? "json" : (options.format ?? "human");
  if (!["human", "json", "sarif"].includes(format)) throw new Error(`Unknown output format: ${format}`);
  const content = format === "human"
    ? humanResult(result)
    : `${JSON.stringify(format === "sarif" ? toSarif(result, VERSION) : result, null, 2)}\n`;
  if (options.output) {
    const output = path.resolve(options.output);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, content);
    if (format === "human") console.log(`Wrote report to ${output}`);
  } else {
    process.stdout.write(content);
  }
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
  if (command === "adapters") {
    const adapters = listAdapters();
    if (options.json) console.log(JSON.stringify(adapters, null, 2));
    else for (const adapter of adapters) console.log(`${adapter.id}\t${adapter.name}\t${adapter.documentation}`);
    return;
  }
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
    await printResult(result, options);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  if (command === "run") {
    if (!options.command && !options.adapter) throw new Error("run requires --adapter or --command");
    if (options.command && options.adapter) throw new Error("run accepts either --adapter or --command, not both");
    if (!options["allow-exec"]) throw new Error("run requires --allow-exec because it executes a user-supplied command");
    const contract = await loadContract(contractPath);
    const result = await runContract(contract, {
      root: path.resolve(options.root ?? "."),
      command: options.command,
      adapter: options.adapter,
      keepWorkspace: options["keep-workspace"]
    });
    await printResult(result, options);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`ERROR ${error.message}`);
  process.exitCode = 2;
});
