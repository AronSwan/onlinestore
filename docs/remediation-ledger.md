# 整改台账（remediation-ledger）

规则：每批次一行记录（日期/批次/门禁结果/豁免与备注）。基线口径=当日实测，只升不降。

| 日期 | 批次 | 结果与备注 |
|---|---|---|
| 2026-10-02 | Day 0 建区合流 | worktree remediation/2026-10-02 建于 515fdc7；冻结补丁 apply 成功（22 文件+1 spec，+516/-247，spec sha256 abdf8a12 吻合）；排除 openapi.json/dependency-report。提交 88ad8f1。**基线：tsc 双配置 exit 0；单测 937/940**（3 失败=已知环境依赖：logging.module×2 + redis-health×1，Day 1 D6.6/D6.7 修复） |
| 2026-10-02 | Day 1 后端轨 (723e4de 前端 / 38cfc45 后端) | D3/D4/D6.6/D6.7 完成+现场修复：login Redis 失败计数加就绪守卫（根因：NODE_ENV 未设时走真实客户端，断连即 500——非 D3 未修好，是登录链路另一颗雷）；spec 守卫适配 2 处（status ready mock+reset 循环跳过非函数，行为保持）。**基线：937/940 → 949/949 全绿（+9 新用例+3 修复）**；tsc 双零；启动冒烟全矩阵通过（注册200→登录200→本人200→他人403→匿名401→错误密码401）——认证链路项目史上首次运行时全通 |
| 2026-10-02 | Day 2 双轨拆雷 (两提交) | S1-S7/P1-min/S6-min/F5/F7/F9/D1 全落。攻击矩阵实测：429 第6发触发/堆栈零泄漏(响应230B固定文案)/恶意Origin零反射/匿名写401×3/公开密钥值生产拒启(文案实测)。**基线 958/958(52 套件)+npm ci --dry-run exit 0**。守卫适配披露：无(直调式spec不受Guard影响)。现场裁决：notification 普通写与 search history 留BACKLOG分级；HEAD lock 原本内部不一致(webpack误剪)随D1修复 |
