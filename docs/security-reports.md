# SARIF and GitHub Code Scanning

Generate a SARIF 2.1.0 report locally:

```bash
actest verify agent-contract.json --format sarif --output results/agent-contract.sarif
```

The report contains stable rule IDs and file locations for path and file assertions. Command failures are repository-level results without an artificial source location.

To upload findings from the GitHub Action:

```yaml
permissions:
  contents: read
  security-events: write

steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  - uses: tangwenhai839-create/agent-contract-test@v0.2.0
    with:
      contract: agent-contract.json
      base: origin/${{ github.base_ref }}
      upload-sarif: true
```

For private repositories, confirm that GitHub Code Security is available for the repository before enabling uploads. JSON and human reports remain available through the `format` and `output` Action inputs.
