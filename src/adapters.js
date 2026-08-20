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
