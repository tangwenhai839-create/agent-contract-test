# Agent Contract Test

**Deterministic contract tests for AI coding agents.**

Codex, Claude Code, Copilot, Gemini, Cursor, and other coding agents are probabilistic. Your repository rules should not be.

Agent Contract Test verifies the observable result of an agent run:

- which files changed;
- whether protected paths were touched;
- whether the change exceeded its allowed scope;
- whether required files and content exist;
- whether forbidden content was introduced; and
- whether deterministic test, lint, or build commands pass.

It does not ask another model to judge the answer. The same workspace and contract produce the same verdict.

## Why this project exists

Most coding-agent evaluations measure whether an agent solved a benchmark. Maintainers need a simpler question answered in every real repository:

> Did this change stay inside the authority I granted, and is there reproducible evidence that it works?

Agent Contract Test turns that authority into a small, reviewable JSON file that can run locally or in CI.

## Quick start

Requires Node.js 20 or newer and Git.

```bash
npx agent-contract-test init
npx agent-contract-test validate agent-contract.json
npx agent-contract-test verify agent-contract.json --root .
```

Use the shorter `actest` command after a global or local installation:

```bash
npm install --save-dev agent-contract-test
npx actest verify agent-contract.json --root .
```

## Contract example

```json
{
  "$schema": "./node_modules/agent-contract-test/schema/agent-contract.schema.json",
  "version": 1,
  "name": "safe-login-fix",
  "task": {
    "prompt": "Fix the login race and update focused tests."
  },
  "boundaries": {
    "allow": ["src/auth/**", "tests/auth/**", "CHANGELOG.md"],
    "deny": [".env", "**/*.pem", "**/*.key", "infra/production/**"],
    "maxChangedFiles": 12
  },
  "assertions": [
    { "type": "file_exists", "path": "tests/auth/session.test.js" },
    { "type": "file_not_contains", "path": "src/auth/session.js", "pattern": "TODO" },
    { "type": "command", "command": "npm test -- tests/auth", "timeoutMs": 120000 }
  ]
}
```

## Commands

### `init`

Creates a starter `agent-contract.json` without overwriting an existing file.

### `validate`

Checks contract structure and reports actionable errors.

### `verify`

Checks the current Git workspace. By default it reads staged, unstaged, renamed, deleted, and untracked files.

```bash
actest verify agent-contract.json --root .
actest verify agent-contract.json --root . --base origin/main
actest verify agent-contract.json --root . --json
```

### `run`

Copies a fixture or repository into a temporary workspace, creates a Git baseline, supplies the task prompt on standard input and in `AGENT_CONTRACT_PROMPT`, runs a user-provided agent command, and verifies the resulting change.

```bash
actest run agent-contract.json \
  --root examples/basic/fixture \
  --command "node agent.js" \
  --allow-exec \
  --keep-workspace
```

`run` requires `--allow-exec` because it executes the supplied command. The temporary workspace protects the source checkout from ordinary file edits, but it is **not an OS or network sandbox**. Use a container or ephemeral runner for untrusted commands.

## GitHub Action

```yaml
name: Agent contract
on: [pull_request]

permissions:
  contents: read

jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: tangwenhai839-create/agent-contract-test@v0.1.0
        with:
          contract: agent-contract.json
          base: origin/${{ github.base_ref }}
```

## What v0.1 verifies

| Contract feature | Meaning |
| --- | --- |
| `boundaries.allow` | Every changed file must match at least one allowed glob |
| `boundaries.deny` | No changed file may match a denied glob |
| `maxChangedFiles` | Caps the blast radius of a task |
| `file_exists` | Required evidence or implementation file exists |
| `file_not_exists` | Forbidden artifact does not exist |
| `file_contains` | File contains required deterministic text |
| `file_not_contains` | File does not contain forbidden deterministic text |
| `command` | A verification command exits successfully within its timeout |

## Design principles

1. **Provider-neutral:** contracts describe outcomes, not one vendor's prompt format.
2. **Deterministic floor:** model-based scoring can be added later, but hard boundaries stay mechanical.
3. **Local first:** no telemetry, account, or hosted service is required.
4. **Fail clearly:** invalid contracts and failed commands return non-zero exit codes.
5. **Human authority:** a contract is reviewable before an agent receives the task.

## Roadmap

- v0.2: SARIF output, richer content matchers, reusable contract fragments.
- v0.3: documented adapters for Codex, Claude Code, Gemini CLI, and GitHub Copilot CLI.
- v0.4: Docker/Dev Container isolation and resource budgets.
- v0.5: repeated-run reliability matrices and provider comparison reports.
- v1.0: stable contract schema, signed evidence bundles, and a public compatibility suite.

See [ROADMAP.md](ROADMAP.md) for milestones and contribution opportunities.

## Security and privacy

Agent Contract Test collects no telemetry. Contracts and reports remain local unless your own CI uploads them. Do not place secrets in prompts or contracts. See [SECURITY.md](SECURITY.md) before running third-party agent commands.

## Contributing

Bug reports, contract fixtures, platform testing, documentation, and adapter contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [GOVERNANCE.md](GOVERNANCE.md).

## License

Apache License 2.0.
