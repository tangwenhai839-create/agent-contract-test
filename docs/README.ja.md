# Agent Contract Test

[English](../README.md) | [简体中文](README.zh-CN.md) | 日本語

**AI コーディングエージェント向けの決定論的コントラクトテスト。**

Codex、Claude Code、Copilot、Gemini、Cursor などのコーディングエージェントは確率的に動作します。しかし、リポジトリのルールまで確率的であるべきではありません。

Agent Contract Test は、エージェント実行後に観測できる結果を検証します。

- どのファイルが変更されたか
- 保護されたパスに触れていないか
- 変更が許可された範囲を超えていないか
- 必要なファイルや内容が存在するか
- 禁止された内容が追加されていないか
- 決定論的なテスト、lint、ビルドコマンドが成功するか

別のモデルに回答を採点させる仕組みではありません。同じワークスペースとコントラクトからは、同じ判定が得られます。

## このプロジェクトが必要な理由

多くのコーディングエージェント評価は、ベンチマークを解けたかどうかを測ります。一方、実際のリポジトリのメンテナーが知りたいのは、より単純なことです。

> この変更は、私が与えた権限の範囲内に収まり、動作を示す再現可能な証拠があるか？

Agent Contract Test は、その権限を小さくレビュー可能な JSON ファイルとして表現し、ローカル環境または CI で実行できるようにします。

## クイックスタート

Node.js 20 以降と Git が必要です。

```bash
npm install --save-dev agent-contract-test
npx actest init
npx actest validate agent-contract.json
npx actest verify agent-contract.json --root .
```

## コントラクト例

```json
{
  "$schema": "./node_modules/agent-contract-test/schema/agent-contract.schema.json",
  "version": 1,
  "name": "safe-login-fix",
  "task": { "prompt": "ログイン処理の競合を修正し、関連テストを更新する。" },
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

## コマンド

### `init`

既存ファイルを上書きせず、初期版の `agent-contract.json` を作成します。

### `validate`

コントラクトの構造を検査し、修正可能なエラーを報告します。

### `verify`

現在の Git ワークスペースを検査します。デフォルトでは、ステージ済み、未ステージ、名前変更、削除、未追跡の各ファイルを読み取ります。

```bash
actest verify agent-contract.json --root .
actest verify agent-contract.json --root . --base origin/main
actest verify agent-contract.json --root . --json
```

### `run`

fixture またはリポジトリを一時ワークスペースにコピーし、Git ベースラインを作成します。標準入力と `AGENT_CONTRACT_PROMPT` でタスクプロンプトを渡して指定のエージェントコマンドを実行し、最終的な変更を検証します。

```bash
actest run agent-contract.json \
  --root examples/basic/fixture \
  --command "node agent.js" \
  --allow-exec \
  --keep-workspace
```

`run` は指定されたコマンドを実行するため、`--allow-exec` の明示が必要です。一時ワークスペースは通常のファイル変更から元のチェックアウトを保護しますが、**OS またはネットワークのサンドボックスではありません**。信頼できないコマンドには、コンテナまたは一時的なランナーを使用してください。

Codex、Claude Code、Gemini CLI 向けの組み込みアダプターも利用できます。

```bash
actest run agent-contract.json --adapter codex --allow-exec
actest run agent-contract.json --adapter claude --allow-exec
actest run agent-contract.json --adapter gemini --allow-exec
```

選択した公式 CLI は、事前にインストールして認証を完了する必要があります。呼び出し方法とセキュリティ境界は、[アダプター互換性ガイド](adapters.md)を参照してください。

### レポート

デフォルト出力は人間が読みやすい形式です。`--format json` または互換オプション `--json` で JSON を生成できます。SARIF 2.1.0 レポートは GitHub Code Scanning と連携できます。

```bash
actest verify agent-contract.json --format sarif --output results/agent-contract.sarif
```

詳細は[セキュリティレポートガイド](security-reports.md)を参照してください。

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
      - uses: tangwenhai839-create/agent-contract-test@v0.2
        with:
          contract: agent-contract.json
          base: origin/${{ github.base_ref }}
```

失敗したルールを GitHub Code Scanning に公開する場合は、`upload-sarif: true` を追加し、`security-events: write` 権限を付与してください。

## コントラクトが検証する内容

| コントラクト機能 | 意味 |
| --- | --- |
| `boundaries.allow` | 変更された各ファイルが少なくとも 1 つの許可 glob に一致すること |
| `boundaries.deny` | 変更されたファイルが禁止 glob に一致しないこと |
| `maxChangedFiles` | 1 タスクが変更できるファイル数を制限すること |
| `file_exists` | 必要な証拠または実装ファイルが存在すること |
| `file_not_exists` | 禁止された成果物が存在しないこと |
| `file_contains` | ファイルに指定テキストが含まれること |
| `file_not_contains` | ファイルに禁止テキストが含まれないこと |
| `command` | 検証コマンドがタイムアウト前に正常終了すること |

## 設計原則

1. **プロバイダー中立：** コントラクトは結果を記述し、特定ベンダーのプロンプト形式には依存しません。
2. **決定論的な最低保証：** 将来モデル採点を追加しても、厳格な境界は機械的に判定します。
3. **ローカル優先：** テレメトリ、アカウント、ホスト型サービスは不要です。
4. **明確な失敗：** 無効なコントラクトや失敗したコマンドは非ゼロの終了コードを返します。
5. **人間による権限管理：** エージェントがタスクを受け取る前に、人がコントラクトをレビューできます。

## 実エージェントによる証拠

[experiments ディレクトリ](../experiments/)では、固定した公開リビジョンに対する再現可能な実行結果を公開します。最初の記録では Codex CLI 0.148.0 を公開 Issue #3 に使用しました。変更は許可された 2 つのテストファイルに限定され、すべてのコントラクト検証と独立した 7/7 のテスト再実行に成功しました。今後は成功・失敗の両方を、モデル採点なしで記録します。

## ロードマップ

- v0.2：Codex、Claude Code、Gemini CLI の組み込みアダプターと SARIF/Code Scanning 出力。
- v0.3：より豊富なコンテンツマッチャー、再利用可能なコントラクト断片、Markdown/JUnit レポート。
- v0.4：Docker/Dev Container による分離とリソース予算。
- v0.5：反復実行の信頼性マトリクスとプロバイダー比較レポート。
- v1.0：安定したコントラクトスキーマ、署名付き証拠バンドル、公開互換性スイート。

詳細は [ROADMAP.md](../ROADMAP.md) を参照してください。

## セキュリティとプライバシー

Agent Contract Test はテレメトリを収集しません。利用者の CI がアップロードしない限り、コントラクトとレポートはローカルに残ります。プロンプトやコントラクトに秘密情報を含めないでください。サードパーティのエージェントコマンドを実行する前に、[SECURITY.md](../SECURITY.md) を確認してください。

## コントリビューション

バグ報告、コントラクト fixture、プラットフォームテスト、ドキュメント、アダプターへの貢献を歓迎します。[CONTRIBUTING.md](../CONTRIBUTING.md) と [GOVERNANCE.md](../GOVERNANCE.md) を参照してください。

## ライセンス

Apache License 2.0。
