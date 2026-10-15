# 总口径表（最小 demo，对应 RC4 修复落点）v2（α-1 修：PRAGMA 净对照 2→4；BACKLOG 行数 696→实时口径化）

日期：2026-10-15｜席：核查组 10 员 + α 批修｜用途：RC4 加测"机械口径闸"可行性的 demo 输入

| 口径名 | 数值 | 复现命令 | 适用范围 | 排除用法 |
|---|---|---|---|---|
| 全矩阵场景行 | 42 | `py -3.14 -c "import json; print(len(json.load(open('plan_a_matrix_result.json'))))"` | plan-a §3 / SQL 头注 | 不得用于冒烟计数 |
| 全矩阵格子数 | 294 | 42 × 7 | plan-a §2 / plan-a 行 285 | — |
| 冒烟场景格 | 15 | `grep -c "^\s*run(" backend/scripts/domain-events-firewall-verify.py` | verify.py docstring | 不得用"场景"以外的字（"项"许可） |
| 冒烟总项数 | 18 | `py -3.14 backend/scripts/domain-events-firewall-verify.py` 末行 `18/18` | 冒烟结果行 | 不得替换为"18 场景" |
| PRAGMA 净对照 | 4 | 18 - 15 + 1 = 4 非场景（PRAGMA ON/OFF 两格 + 一致性 1 格 + 文本比对 1 格，详见源码） | 复盘 | — |
| 接线批首刀场景 | 12 | BACKLOG:670 "12 场景"（盲审驳后失格） | 历史账行 | 已被驳回，不得复用 |
| 12 不变列集 | 现 10 | SQL:78 / :15 "H 集 12→10 列" | SQL 修订注 | 不得写"12 不变列" |
| "掺水 25%" 口径 | 3/12 窄 / 7/12 宽 | gang-a:199 + verify-wu W2:51 复现 | 出口任何 % 数字必带"窄"/"宽" | 不得裸用 |
| "已落仓" 三义 | 落盘（文件在）/ 库落（迁移 m=1）/ 上线（写入路径） | gang-c J10 三级分解 | 任何挂账/卷宗行 | 必带子位 |
| BACKLOG 行数实时 | 703 | `wc -l docs/BACKLOG.md` | 自引 | 不得做快照 |
| plan-a 行数实时 | 295 | `wc -l plan-a-firewall-final.md` | 自引 | 不得做快照 |
| plan-b 行数实时 | 232 | `wc -l plan-b-tidb-model.md` | 自引 | 不得做快照 |
| v6.1 行数实时 | 211 | `wc -l docs/debt-10-architecture-research-proposal-v6.1.md` | charter:7 | 不得做快照 |
| charter 行数实时 | 232 | `wc -l docs/debt-10-v6-project-charter-draft.md` | charter:7 自引 | 不得做快照 |
| evidence 件数 | 14 | `ls -1 docs/debt-10-archive/audit-outputs/evidence | wc -l` | BACKLOG:694 反例为 8 | 必带 ls 实测 |
| "全绿" 语义 | 绿分子=判别格集合 | blind-YB B8-3 负对照格不入 | 任何"X/X 全绿" | 不得含 PRAGMA OFF 洞计绿 |

复现命令总表（与本表同测时点 2026-10-15 py -3.14 + wc -l）：
- 上述数值全部从本仓工作树 2026-10-15 实测派生，非手数。
- 5-6（六数并存，盲-YB B8-2）= 此表中"全矩阵场景行 / 全矩阵格子 / 冒烟场景格 / 冒烟总项数 / PRAGMA 净对照 / 接线批首刀"6 条均为独立口径，无统一定义即失实。
- 5-13（掺水 25%，verify-wu W2）= 此表"掺水 25% 口径"明示窄/宽双值即不出失格。

---

## 词义闸表（γ-bifrost 步骤 3 v4 + α-6 修——多词拆行）

| 类别 | 模式 | 必带子位（或禁配词） | 模式用法说明 |
|------|----|----|----|
| FORBID_PAIR | `18` | 不可邻现"场景" | 18 = 冒烟项数；与"场景"同现=口径表禁配 |
| FORBID_PAIR | `42` | 不可邻现"冒烟" | 42 = 矩阵行数；与"冒烟"同现=不可代冒烟计数 |
| FORBID_PAIR | `41` | 不可邻现"场景" | 41 = 无口径（plan-a 已纠 41→42） |
| FORBID_PAIR | `12 场景` | 不可邻现"冒烟" | 12 场景 = 接线批首刀失格（已驳回） |
| FORBID_PAIR | `10` | 不可邻现"不变列集" | 10 = H 集当前列数；不可代"12 不变列" |
| MUST_SUBTOKEN | `25%` | 必带"窄"或"宽" | 掺水比例口径（窄=3/12 / 宽=7/12）|
| MUST_SUBTOKEN | `已落仓` | 必带"落盘"或"库落"或"上线" | 三义分清（盲-c J10）|
| MUST_SUBTOKEN | `全绿` | 必带"判别格"或"绿分子" | fake-green 掩护词必带子位（盲-b B8-3 负对照格不入）|
| MUST_SUBTOKEN | `全清` | 必带"判别格"或"绿分子"或"mutation" | 同上扩展 |
| MUST_SUBTOKEN | `P11` | 必带"必红"或"必绿"或"杀分支" | 试金石引用必带可证伪子位 |
| AMBIG_TOKEN | `已修` | 必带"落盘"或"库落"或"上线"或"执行"或"入院"或"挂账"或"PRAGMA"或"自验" | "已修"术语必须带具体落点子位 |
| AMBIG_TOKEN | `已入法` | 必带"落盘"或"库落"或"上线"或"执行"或"入院"或"挂账"或"PRAGMA"或"自验" | "已入法"术语必须带具体落点子位 |
| AMBIG_TOKEN | `已落地` | 必带"落盘"或"库落"或"上线"或"执行"或"入院"或"挂账"或"PRAGMA"或"自验" | "已落地"术语必须带具体落点子位 |
| AMBIG_TOKEN | `已建立` | 必带"落盘"或"库落"或"上线"或"执行"或"入院"或"挂账"或"PRAGMA"或"自验" | "已建立"术语必须带具体落点子位 |
| AMBIG_TOKEN | `已生效` | 必带"落盘"或"库落"或"上线"或"执行"或"入院"或"挂账"或"PRAGMA"或"自验" | "已生效"术语必须带具体落点子位 |
| AMBIG_TOKEN | `已落实` | 必带"落盘"或"库落"或"上线"或"执行"或"入院"或"挂账"或"PRAGMA"或"自验" | "已落实"术语必须带具体落点子位 |
| AMBIG_TOKEN | `已入账` | 必带"落盘"或"库落"或"上线"或"执行"或"入院"或"挂账"或"PRAGMA"或"自验" | "已入账"术语必须带具体落点子位 |
| AMBIG_TOKEN | `已绑定` | 必带"落盘"或"库落"或"上线"或"执行"或"入院"或"挂账"或"PRAGMA"或"自验" | "已绑定"术语必须带具体落点子位 |
| AMBIG_TOKEN | `已写` | 必带"落盘"或"库落"或"上线"或"执行"或"入院"或"挂账"或"PRAGMA"或"自验" | "已写"术语必须带具体落点子位 |
| AMBIG_TOKEN | `全绿` | 必带"判别格"或"绿分子"或"kill-chart"或"mutation"或"实战"或"盲审席"或"测试" | 5 个"全 X"必须带判别证据子位 |
| AMBIG_TOKEN | `全过` | 必带"判别格"或"绿分子"或"kill-chart"或"mutation"或"实战"或"盲审席"或"测试" | 同上 |
| AMBIG_TOKEN | `全清` | 必带"判别格"或"绿分子"或"kill-chart"或"mutation"或"实战"或"盲审席"或"测试" | 同上 |
| AMBIG_TOKEN | `全蓝` | 必带"判别格"或"绿分子"或"kill-chart"或"mutation"或"实战"或"盲审席"或"测试" | 同上 |
| AMBIG_TOKEN | `全空` | 必带"判别格"或"绿分子"或"kill-chart"或"mutation"或"实战"或"盲审席"或"测试" | 同上 |
| AMBIG_TOKEN | `完成` | 必带"PRAGMA"或"K2 实战"或"mutation"或"盲审席"或"测试" | 3 个"完 X"必须带执行面 |
| AMBIG_TOKEN | `完工` | 必带"PRAGMA"或"K2 实战"或"mutation"或"盲审席"或"测试" | 同上 |
| AMBIG_TOKEN | `已毕` | 必带"PRAGMA"或"K2 实战"或"mutation"或"盲审席"或"测试" | 同上 |
| AMBIG_TOKEN | `假绿` | 必带"真拦"或"mutation"或"N5c"或"kill-pass" | 3 个"假绿"必须带对照证据 |
| AMBIG_TOKEN | `糊绿` | 必带"真拦"或"mutation"或"N5c"或"kill-pass" | 同上 |
| AMBIG_TOKEN | `凑数绿` | 必带"真拦"或"mutation"或"N5c"或"kill-pass" | 同上 |

α-6 v5 闸自校：复现命令"实时口径"行（BACKLOG 行数 / plan-a 行数 / plan-b 行数 / v6.1 行数 / charter 行数 / evidence 件数）—— caliber_guard 启动时跑 repro 命令 vs value，差>5% 报"源头漂移"finding 给人看。
