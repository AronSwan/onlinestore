# 高级终端摘要（Advanced Terminal Summary）说明

目的：在 FAIL/UNKNOWN 或启用 --debug 时，提供更丰富、可审计的诊断信息，辅助快速定位与复现。

## 触发条件
- PASS：仅写入最小字段集（不含扩展）。
- FAIL 或 UNKNOWN：写入“优先扩展”字段。
- 启用 `--debug`：在 FAIL/UNKNOWN 基础上追加“调试扩展”字段。

## 字段分层

### 最小字段集（常规执行）
- command：实际执行的命令字符串
- exitCode：进程退出码（0 成功；非 0 失败；null 无退出码/被中断）
- durationMs：执行耗时（毫秒）
- verdict：判定结论（PASS / FAIL / UNKNOWN），超时形如 FAIL(timeout)
- expectedFailure：是否“预期失败”
- stdoutTail / stderrTail：输出尾部若干行
- env：关键环境变量快照（如 IDLE_TIMEOUT_MS、CMD_TIMEOUT_MS、NODE_ENV）
- context：执行上下文（cwd、os、node 版本）
- timestamp：ISO 时间戳

### 优先扩展（FAIL/UNKNOWN 时写入）
- reason：简短失败原因（例如 "timeout", "injection", "config-error"）
- tags：标签数组（例如 ["timeout","watchdog","integration"]）
- thresholds：判定阈值快照（idleTimeoutMs、cmdTimeoutMs、maxRetries）
- artifacts：关联产物路径（reportPath、summaryPath、logs[]）
- action：推荐动作（如 "fix"、"retry"、"rollback"）
- nextCommand：下一步可复制的命令
- expectedFailureReason：当 expectedFailure=true 时的明确理由

### 调试扩展（--debug 时追加）
- schemaVersion：摘要结构版本（如 "1.1"）
- scriptVersion：生成脚本版本（如 "security-test.cjs@1.2.0"）
- attempt：当前尝试次数（数字）
- retried：是否已自动重试（true/false）
- timeoutAtMs：触发超时的绝对时间点（相对启动的毫秒）
- idleSinceMs：距离最后输出的毫秒数（用于区分 IDLE 与 CMD 超时）
- git：{ branch, commit, dirty } 代码基线快照
- system：{ cpuModel, totalMemGB } 轻量环境信息
- usage：{ cpuPct, rssMB } 资源占用（仅 FAIL/UNKNOWN）
- checks[]：关键检查项结构化结果（[{ name, status, message }]）
- warnings[]：非致命告警集合
- remediationHints[]：系统级整改建议的编号/要点（与文档或工单模板对齐）

注意：
- 默认不写调试扩展。新增字段前提升 `schemaVersion`，保持解析兼容。
- 避免敏感信息泄露（路径/环境变量按白名单输出）。

## 示例

### FAIL(timeout) + --debug 示例
```json
{
  "schemaVersion": "1.1",
  "scriptVersion": "security-test.cjs@1.2.0",
  "command": "node backend/scripts/security/security-test.cjs --json --debug",
  "exitCode": 1,
  "durationMs": 2150,
  "verdict": "FAIL(timeout)",
  "timeoutType": "CMD_TIMEOUT",
  "expectedFailure": false,
  "reason": "timeout",
  "tags": ["timeout","watchdog","integration"],
  "stdoutTail": "... last stdout lines ...",
  "stderrTail": "",
  "errors": ["Command exceeded CMD_TIMEOUT at 2000ms"],
  "thresholds": {
    "idleTimeoutMs": 60000,
    "cmdTimeoutMs": 2000,
    "maxRetries": 0
  },
  "artifacts": {
    "reportPath": "backend/test-output/security-test-report.json",
    "summaryPath": "backend/test-output/2025-10-15T02-05-12.111Z-terminal-summary.json",
    "logs": ["backend/test-output/security.log"]
  },
  "action": "fix",
  "nextCommand": "pwsh -c \"$env:CMD_TIMEOUT_MS='4000'; node backend/scripts/security/security-test.cjs --json\"",
  "env": {
    "IDLE_TIMEOUT_MS": "60000",
    "CMD_TIMEOUT_MS": "2000",
    "NODE_ENV": "test"
  },
  "context": {
    "cwd": "D:\\onlinestore\\backend",
    "os": "Windows",
    "node": "v18.19.0"
  },
  "attempt": 1,
  "retried": false,
  "timeoutAtMs": 2005,
  "idleSinceMs": 480,
  "git": {
    "branch": "main",
    "commit": "a1b2c3d",
    "dirty": false
  },
  "system": {
    "cpuModel": "Intel(R) Xeon(R)",
    "totalMemGB": 64
  },
  "usage": {
    "cpuPct": 12.3,
    "rssMB": 180
  },
  "checks": [
    { "name": "watchdog", "status": "failed", "message": "CMD timeout triggered" }
  ],
  "warnings": [
    "Running as Administrator may impact isolation checks"
  ],
  "remediationHints": [
    "Increase cmdTimeoutMs for long-running integration tasks",
    "Reduce parallelism or disable persistent timers in test runner"
  ],
  "timestamp": "2025-10-15T02:05:12.111Z"
}
```

### PASS 示例（最小字段集）
```json
{
  "command": "node backend/scripts/security/security-test.cjs --json",
  "exitCode": 0,
  "durationMs": 3225,
  "verdict": "PASS",
  "expectedFailure": false,
  "stdoutTail": "=== 安全测试结果摘要 ===\n总测试数: 8\n通过: 8\n失败: 0",
  "stderrTail": "",
  "env": {
    "IDLE_TIMEOUT_MS": "60000",
    "CMD_TIMEOUT_MS": "60000",
    "NODE_ENV": "test"
  },
  "context": {
    "cwd": "D:\\onlinestore\\backend",
    "os": "Windows",
    "node": "v18.19.0"
  },
  "timestamp": "2025-10-15T02:06:00.000Z"
}
```

## 与脚本的关系
- security-test.cjs：在 FAIL/UNKNOWN 时写入“优先扩展”，`--debug` 时写入“调试扩展”。
- 打印策略：为减少噪声，“user/环境”类通用提示建议仅在失败或高危时显示。

## 提交与审计建议
- 将 summary 与 report 路径纳入 CI 产物，便于后续审计与回归。
- 在工单模板中引用 remediationHints 编号，形成闭环整改清单。