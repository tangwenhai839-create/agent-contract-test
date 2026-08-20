# Pilot repository program

We are looking for the first five external repositories to validate Agent Contract Test against real maintenance work.

## What a pilot involves

1. Choose one low-risk coding-agent task in a public or private repository.
2. Add a small `agent-contract.json` describing allowed files and deterministic evidence.
3. Run `npx actest verify` on the resulting change, or use one of the built-in agent adapters in a disposable workspace.
4. Share only the contract outcome, platform, agent CLI, and any usability problems. Private code and prompts can remain private.

## What pilot maintainers receive

- help designing the first contract;
- priority triage for reproducible compatibility problems;
- credit in release notes, with permission; and
- a direct path to propose fixtures, rules, translations, and adapters.

Open a **Pilot repository** issue using the repository template. A useful report includes the repository language, operating system, agent CLI/version, task category, and whether the contract caught a real boundary or verification failure.

The project will not submit unsolicited changes to third-party repositories. Adoption work starts only after a maintainer opts in.
