# 整改台账（remediation-ledger）

规则：每批次一行记录（日期/批次/门禁结果/豁免与备注）。基线口径=当日实测，只升不降。

| 日期 | 批次 | 结果与备注 |
|---|---|---|
| 2026-10-02 | Day 0 建区合流 | worktree remediation/2026-10-02 建于 515fdc7；冻结补丁 apply 成功（22 文件+1 spec，+516/-247，spec sha256 abdf8a12 吻合）；排除 openapi.json/dependency-report。提交 88ad8f1。**基线：tsc 双配置 exit 0；单测 937/940**（3 失败=已知环境依赖：logging.module×2 + redis-health×1，Day 1 D6.6/D6.7 修复） |
