# Contributing

Thank you for improving reliable, reviewable AI-assisted development.

## Good first contributions

- Reproduce a bug with a minimal contract and fixture.
- Test the CLI on another operating system or Git version.
- Improve an error message or translation.
- Propose a deterministic assertion with real repository examples.
- Document a coding-agent CLI's non-interactive behavior and security boundaries.

## Development

```bash
npm install
npm run verify
```

The project intentionally has no runtime dependencies. Discuss new runtime dependencies before adding them.

## Pilot repositories

Maintainers who want to try Agent Contract Test can open a **Pilot repository** issue. Start with one real, low-risk agent task and report the CLI, operating system, contract, and result. Private source code and agent transcripts are not required.

## Pull requests

1. Open an issue for large behavioral or schema changes.
2. Keep a pull request focused on one problem.
3. Add or update tests for behavioral changes.
4. Update the schema and documentation together.
5. Do not include real credentials, private repositories, or confidential agent transcripts.

## Detection and assertion quality

Rules must be deterministic, documented, and accompanied by passing and failing fixtures. A rule that produces frequent ambiguous results should be informational or remain outside the stable core.

## Certificate of Origin

By contributing, you certify that you have the right to submit the work under the Apache License 2.0. Maintainers may require a `Signed-off-by` line for substantial contributions in a future release.
