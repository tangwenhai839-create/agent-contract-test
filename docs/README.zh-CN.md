# Agent Contract Test 中文说明

Agent Contract Test 是面向 Codex、Claude Code、Copilot、Gemini、Cursor 等AI编程代理的确定性契约测试工具。

它不判断AI“说得像不像正确答案”，而是检查真实结果：

- 修改的文件是否在允许范围内；
- 是否碰触密钥、生产配置等禁止路径；
- 改动文件数量是否超出任务范围；
- 必须生成的代码、测试和文档是否存在；
- 文件是否包含必须或禁止的内容；
- 测试、检查和构建命令是否真正通过。

## 快速使用

```bash
npx agent-contract-test init
npx agent-contract-test validate agent-contract.json
npx agent-contract-test verify agent-contract.json --root .
```

契约使用JSON格式，适合人工审阅、版本管理和GitHub Actions持续检查。

## 运行代理实验

```bash
npx actest run agent-contract.json \
  --root examples/basic/fixture \
  --command "你的代理命令" \
  --allow-exec
```

工具会复制一个临时工作区再执行命令，普通文件改动不会污染原项目。但这不是操作系统级安全沙箱；不可信命令应在容器或临时机器中运行。

## 项目方向

我们的目标不是绑定某一家模型，而是建立一套不同AI编程代理都能使用的公开行为契约和验证格式。后续将加入结果报告、代理适配器、容器隔离、重复运行可靠性和签名证据包。
