# Real run: Codex adapter conformance fixture

This is a real, reproducible coding-agent run for [public issue #3](https://github.com/tangwenhai839-create/agent-contract-test/issues/3). It was not a mocked model response. Codex received the issue task in a disposable Git-backed copy, edited the copy, ran tests, and was then evaluated mechanically by Agent Contract Test.

## Result

**PASS** — the agent changed only the two allowed test paths, all assertions passed, and an independent full test rerun passed 7/7.

| Field | Recorded value |
| --- | --- |
| UTC date | 2026-08-20 |
| Repository | `tangwenhai839-create/agent-contract-test` |
| Baseline commit | `e7380d5bd6dc10370c16e18262253868647a48af` |
| Contract tool | Agent Contract Test 0.2.0 |
| Agent | Codex CLI 0.148.0 |
| Authentication | Existing ChatGPT login; credentials not recorded |
| Model | Account default; not pinned or reported by the captured output |
| Platform | Windows, Node.js 24.19.0, Git 2.53.0.windows.3 |
| Agent exit | 0; no timeout |
| Changed files | 2 of maximum 6 |
| Contract findings | 0 |
| Independent tests | 7 passed, 0 failed |
| Token usage reported by CLI | 385,547 input; 333,568 cached input; 3,755 output; 1,561 reasoning output |
| Cost | Not reported by ChatGPT-authenticated CLI |

The agent's JSONL stream showed at least one failed command during iteration before it corrected the implementation. Only the final candidate was scored. This is useful behavior to preserve in the record: the contract evaluates the observable result, not whether the agent solved the task on its first attempt.

## Contract boundary

- Allow: `tests/**`
- Deny: production source, workflows, environment files, PEM files, and keys
- Maximum changed files: 6
- Required evidence: the fake agent exists, reads `AGENT_CONTRACT_PROMPT`, is exercised from `tests/runner.test.js`, and the complete test suite exits successfully

See [agent-contract.json](agent-contract.json) for the exact prompt and assertions.

## Observed candidate

Codex added `tests/fixtures/adapter-conformance/fake-agent.js` and updated `tests/runner.test.js`. The fake agent reads the supplied prompt, writes one deterministic result file inside the disposable fixture, makes no network call, and uses no credential. The runner test verifies prompt delivery, changed-file scope, empty findings, successful execution, and isolation from the source fixture.

The exact candidate is preserved as [candidate.patch](candidate.patch). It is evidence from the temporary run and is not applied to the product source by this experiment.

## Verification

```bash
npm install
npx actest validate experiments/2026-08-20-codex-conformance/agent-contract.json
npx actest run experiments/2026-08-20-codex-conformance/agent-contract.json \
  --root . \
  --adapter codex \
  --allow-exec
```

The committed [result.json](result.json) is a sanitized summary. [result.sarif](result.sarif) is the SARIF 2.1.0 output; it contains no results because the contract passed.

## Limitations

- This is one run, not a reliability claim. Repeated runs are needed to estimate success rate and variance.
- The model was not pinned, so future runs using the same CLI may select a different account-default model.
- The run used the official CLI through a custom command path because the Windows desktop app executable was not directly callable from the test shell. The CLI invocation itself was `codex exec --sandbox workspace-write --ephemeral --json -`.
- The candidate was independently rerun on Windows only. The project CI remains responsible for Windows, macOS, and Linux coverage of committed code.
