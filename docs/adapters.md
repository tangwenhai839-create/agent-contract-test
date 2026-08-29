# Coding-agent adapters

Agent Contract Test runs each provider in a disposable Git-backed copy, then verifies the resulting files with the same provider-neutral contract.

```bash
actest run agent-contract.json --adapter codex --allow-exec
actest run agent-contract.json --adapter claude --allow-exec
actest run agent-contract.json --adapter gemini --allow-exec
```

The corresponding official CLI must already be installed and authenticated. Agent Contract Test does not receive, store, or forward API keys.

| Adapter | Non-interactive invocation | Edit permission | Prompt transport |
| --- | --- | --- | --- |
| Codex CLI | `codex exec` | `--sandbox workspace-write` | standard input |
| Claude Code | `claude -p` | `--permission-mode acceptEdits` | process argument |
| Gemini CLI | `gemini --prompt` | `--approval-mode auto_edit` | process argument |

The Codex adapter also uses `--ephemeral`, so the disposable evaluation session is not persisted. Claude Code and Gemini CLI receive the prompt as an argument because that is their documented non-interactive interface. Do not put secrets in contract prompts.

All adapters inherit the current process environment and provider configuration. Their network access, model selection, billing, and authentication remain controlled by their official CLI. The contract timeout terminates the top-level agent process; provider-spawned processes may require an external container or CI runner for stronger isolation.

Use `actest adapters` or `actest adapters --json` to inspect the installed adapter definitions. A custom command remains available for other providers:

```bash
actest run agent-contract.json --command "my-agent --non-interactive" --allow-exec
```

Adapter tests should stay provider-neutral when possible. The runner test suite
uses `tests/fixtures/adapter-conformance/fake-agent.js` as a synthetic adapter:
it reads `AGENT_CONTRACT_PROMPT`, writes only the allowed result file, and avoids
network calls, credentials, or real agent CLIs. New adapters can reuse the same
pattern to prove prompt transport and contract verification before exercising a
paid provider.
