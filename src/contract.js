import fs from "node:fs/promises";
import path from "node:path";

const ASSERTION_TYPES = new Set([
  "file_exists",
  "file_not_exists",
  "file_contains",
  "file_not_contains",
  "command"
]);

export async function loadContract(filePath) {
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read contract ${filePath}: ${error.message}`);
  }

  const errors = [];
  if (parsed.version !== 1) errors.push("version must be 1");
  if (!isText(parsed.name)) errors.push("name must be a non-empty string");
  if (!isText(parsed.task?.prompt)) errors.push("task.prompt must be a non-empty string");
  if (parsed.boundaries !== undefined && !isObject(parsed.boundaries)) errors.push("boundaries must be an object");
  for (const key of ["allow", "deny"]) {
    if (parsed.boundaries?.[key] !== undefined && !isStringArray(parsed.boundaries[key])) {
      errors.push(`boundaries.${key} must be an array of strings`);
    }
  }
  if (parsed.boundaries?.maxChangedFiles !== undefined &&
      (!Number.isInteger(parsed.boundaries.maxChangedFiles) || parsed.boundaries.maxChangedFiles < 0)) {
    errors.push("boundaries.maxChangedFiles must be a non-negative integer");
  }
  if (!Array.isArray(parsed.assertions)) errors.push("assertions must be an array");
  for (const [index, assertion] of (parsed.assertions ?? []).entries()) {
    if (!isObject(assertion) || !ASSERTION_TYPES.has(assertion.type)) {
      errors.push(`assertions[${index}].type is unsupported`);
      continue;
    }
    if (assertion.type.startsWith("file_") && !isText(assertion.path)) {
      errors.push(`assertions[${index}].path must be a non-empty string`);
    }
    if (["file_contains", "file_not_contains"].includes(assertion.type) && !isText(assertion.pattern)) {
      errors.push(`assertions[${index}].pattern must be a non-empty string`);
    }
    if (assertion.type === "command" && !isText(assertion.command)) {
      errors.push(`assertions[${index}].command must be a non-empty string`);
    }
  }
  if (errors.length > 0) throw new Error(`Invalid contract:\n- ${errors.join("\n- ")}`);
  return parsed;
}

export async function initContract(directory) {
  await fs.mkdir(directory, { recursive: true });
  const output = path.join(directory, "agent-contract.json");
  try {
    await fs.access(output);
    throw new Error(`${output} already exists`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const starter = {
    version: 1,
    name: "safe-feature-change",
    task: { prompt: "Implement the requested feature and update its tests." },
    boundaries: {
      allow: ["src/**", "tests/**", "README.md"],
      deny: [".env", "**/*.pem", "**/*.key"],
      maxChangedFiles: 12
    },
    assertions: [
      { type: "file_exists", path: "README.md" },
      { type: "command", command: "npm test", timeoutMs: 120000 }
    ]
  };
  await fs.writeFile(output, `${JSON.stringify(starter, null, 2)}\n`, { flag: "wx" });
  return output;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
