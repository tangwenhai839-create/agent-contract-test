# Security Policy

## Supported versions

Security fixes are provided for the latest released minor version until the project reaches 1.0. After 1.0, the current and previous minor releases will be supported.

## Reporting a vulnerability

Use GitHub private vulnerability reporting when available. Do not open a public issue containing an exploit, credential, private transcript, or sensitive repository content.

Include:

- affected version and platform;
- minimal reproduction using synthetic data;
- expected security boundary;
- observed behavior and impact; and
- any suggested mitigation.

## Threat boundaries

The `verify` command reads files and can execute explicit `command` assertions from a trusted contract.

The `run` command executes the exact user-supplied `--command`. Its temporary workspace reduces accidental modifications to the source checkout, but does not isolate processes, credentials, the network, or the rest of the filesystem. Use containers or ephemeral CI workers for untrusted code or agents.

Contracts are executable policy. Review contract changes with the same care as workflow files and build scripts.

## Secrets

Never include secrets in contracts, prompts, fixtures, reports, issues, or tests. The project does not need model API keys for deterministic verification.
