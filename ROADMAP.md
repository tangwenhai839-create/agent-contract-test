# Roadmap

The roadmap is ordered by ecosystem usefulness, not by feature count.

## v0.1 — Deterministic foundation

- JSON contract and published schema.
- Allowed and denied path rules.
- File-count blast-radius limit.
- File and content assertions.
- Verification command assertions.
- Disposable-workspace runner.
- JSON output and composite GitHub Action.
- Cross-platform tests on Node.js 20, 22, and 24.

## v0.2 — CI evidence

- SARIF output for GitHub Code Scanning.
- Markdown job summaries and JUnit output.
- Regex and hash assertions.
- Contract inheritance and reusable fragments.
- Stable finding identifiers and suppressions with reasons.

## v0.3 — Provider adapters

- Codex CLI adapter.
- Claude Code adapter.
- Gemini CLI adapter.
- GitHub Copilot CLI adapter.
- Adapter conformance tests that use synthetic repositories.

Adapters must document authentication, non-interactive behavior, permission flags, network behavior, and cancellation semantics.

## v0.4 — Isolation and budgets

- Docker and Dev Container runners.
- Wall-clock, process, disk, and network policies.
- Read-only mounts for fixtures.
- Secret-canary tests and outbound-host allowlists.

## v0.5 — Reliability matrix

- Repeated runs with pass-rate and variance reports.
- Comparison across agent versions and instruction-file variants.
- Flake classification that separates agent variance from assertion instability.
- Public, reproducible compatibility fixtures.

## v1.0 — Stable ecosystem contract

- Stable schema and migration policy.
- Signed evidence bundles.
- Extension API for custom deterministic assertions.
- Governance for shared contract rules and adapter ownership.
- Public compatibility dashboard generated only from reproducible runs.
