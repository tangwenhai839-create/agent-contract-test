import fs from "node:fs";
import path from "node:path";

const ADAPTERS = {
  codex: {
    name: "Codex CLI",
    executable: "codex",
    args: ["exec", "--sandbox", "workspace-write", "--ephemeral", "-"],
    prompt: "stdin",
    documentation: "https://developers.openai.com/codex/cli/reference"
  },
  claude: {
    name: "Claude Code",
    executable: "claude",
    args: ["-p", "--permission-mode", "acceptEdits", "--output-format", "text"],
    prompt: "argument",
    documentation: "https://code.claude.com/docs/en/cli-usage"
  },
  gemini: {
    name: "Gemini CLI",
    executable: "gemini",
    args: ["--approval-mode", "auto_edit", "--output-format", "text", "--prompt"],
    prompt: "argument",
    documentation: "https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/cli-reference.md"
  }
};

export function listAdapters() {
  return Object.entries(ADAPTERS).map(([id, adapter]) => ({ id, ...adapter }));
}

export function adapterProcess(id, prompt) {
  const adapter = ADAPTERS[id];
  if (!adapter) throw new Error(`Unknown adapter: ${id}. Choose codex, claude, or gemini.`);
  return {
    executable: adapter.executable,
    args: adapter.prompt === "argument" ? [...adapter.args, prompt] : [...adapter.args],
    stdin: adapter.prompt === "stdin" ? prompt : "",
    adapter: id
  };
}

export function resolveExecutable(executable, env = process.env, platform = process.platform) {
  if (platform !== "win32" || path.win32.basename(executable) !== executable || path.win32.extname(executable)) {
    return executable;
  }

  const envPath = pathValue(env);
  if (!envPath) return executable;

  const extensions = (env.PATHEXT || ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .map((extension) => extension.trim())
    .filter(Boolean);
  const seen = new Set();

  for (const directory of envPath.split(";").filter(Boolean)) {
    for (const extension of extensions) {
      const normalized = extension.startsWith(".") ? extension : `.${extension}`;
      for (const suffix of [normalized, normalized.toLowerCase(), normalized.toUpperCase()]) {
        const filename = `${executable}${suffix}`;
        const candidate = path.join(directory, filename);
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        if (fs.existsSync(candidate)) return path.join(directory, actualDirectoryEntry(directory, filename));
      }
    }
  }

  return executable;
}

function actualDirectoryEntry(directory, filename) {
  try {
    const exact = fs.readdirSync(directory).find((entry) => entry === filename);
    if (exact) return exact;
    const lowerFilename = filename.toLowerCase();
    const insensitive = fs.readdirSync(directory).find((entry) => entry.toLowerCase() === lowerFilename);
    return insensitive ?? filename;
  } catch {
    return filename;
  }
}

function pathValue(env) {
  if (env.PATH) return env.PATH;
  const entry = Object.entries(env).find(([key]) => key.toUpperCase() === "PATH");
  return entry?.[1] ?? "";
}
