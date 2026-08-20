# Changelog

All notable changes are documented here.

## 0.2.0 — 2026-08-20

### Added

- Built-in non-interactive adapters for Codex CLI, Claude Code, and Gemini CLI.
- SARIF 2.1.0 reports with source locations and stable rule identifiers.
- Optional GitHub Code Scanning upload from the composite Action.
- npm trusted-publishing workflow and public-package metadata.
- Pilot-repository onboarding and compatibility reporting templates.

### Changed

- `run` now accepts either `--adapter` or the existing custom `--command`.
- Reporting uses `--format human|json|sarif` and optional `--output`; `--json` remains compatible.

## 0.1.0 — 2026-08-20

### Added

- Versioned JSON contract and schema.
- Deterministic path-boundary and blast-radius checks.
- File, content, and command assertions.
- Disposable-workspace command runner with explicit execution consent.
- Human-readable and JSON reports.
- Composite GitHub Action.
- English and Simplified Chinese documentation.
- Cross-platform automated test matrix.
