const RULES = {
  "agent-command": "The coding agent process must complete successfully.",
  "max-changed-files": "The number of changed files must stay within the contract limit.",
  "denied-path": "Changed files must not match a denied path.",
  "outside-allowed-paths": "Changed files must match an allowed path.",
  "file-exists": "A required file must exist.",
  "file-not-exists": "A forbidden file must not exist.",
  "file-contains": "A file must contain required text.",
  "file-not-contains": "A file must not contain forbidden text.",
  command: "A deterministic verification command must complete successfully."
};

export function toSarif(result, version) {
  const usedRules = [...new Set(result.findings.map((item) => item.rule))];
  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: {
        driver: {
          name: "Agent Contract Test",
          version,
          informationUri: "https://github.com/tangwenhai839-create/agent-contract-test",
          rules: usedRules.map((id) => ({
            id,
            name: id,
            shortDescription: { text: RULES[id] ?? "Agent contract finding." },
            defaultConfiguration: { level: "error" }
          }))
        }
      },
      results: result.findings.map((finding) => {
        const item = {
          ruleId: finding.rule,
          level: finding.severity === "warning" ? "warning" : finding.severity === "note" ? "note" : "error",
          message: { text: finding.message }
        };
        if (finding.file) {
          item.locations = [{
            physicalLocation: {
              artifactLocation: { uri: finding.file.replaceAll("\\", "/"), uriBaseId: "%SRCROOT%" }
            }
          }];
        }
        return item;
      })
    }]
  };
}
