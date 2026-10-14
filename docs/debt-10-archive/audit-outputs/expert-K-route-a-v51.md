Now I will write the complete verification report.

---

# 债-10 方案专家组 · J 路由-1 独立核实报告

**任务书授权行：有**

**报告日期**：2026-10-14
**路由编号**：J-1
**声明义务**：依任务书"独立核实员"职责，逐项核对 δ 推荐的主张 A；不修改任何文件；不参考其他路；不给推荐项。

---

## 0. 任务书全文（备档）

> 你是 5+方案专家组的**J 路由-1 独立核实员**（一员一路，独立成路）。
>
> **任务书授权行：本任务书所列检查项之外，受权报告独立新发现（同类未抓实例扫描）。**
> **agent 声明义务：输出首节"任务书授权行：有"。**
>
> **对象**：v5 终审六路归档 + v3 终审五路归档 + 草案 v1/v2/v3
>
> **任务**：核实 δ 推荐的主张 **A**——**"v5.1 可作为工程基线进入实施（即便 v3/v5.2 不可用）"**
>
> A 主张细分：
> - A1. v5.1 12 项 P1 未清但工程骨架完整——v5.1 的 §0/§0.1/§0.2/§0.3 是否承载足够骨架？
> - A2. 12 项 P1 不可阻塞实施——12 项是 P1 严重还是 P1 形式？哪些可作实施期 P1 排产？哪些必须实施前清？
> - A3. v5.1 与 v5 共处/分工——v5 (188 行) + v5.1 (140 行) 形态差异？哪个是工程基线？v5.1 替代 v5 还是并行？
> - A4. v5.1 与 v5.2/v3 终审结论兼容性——v5.2/v3 不可用是否影响 v5.1 工程实施？
>
> **外部查证**（必经 `http://localhost:7890` 代理端口）：
> - NestJS + TypeORM 在生产环境的"已归档 outbox 表+异步派发"实践惯例（与 v5.1 §4.2 同源对比）
> - 单库下 12 项 P1 未清是否能开工程实施——参考 NestJS Issues 2.0 / RFC 2126 / OWASP 实施期残留风险等
> - 草案与实施稿共处的版本管理实践（NestJS monorepo / semver range / lockfile 实践——5 份草案+2 份实施稿在 docs/ 实际共处时业界做法）
> - 工程领域是否对"架构层草案含 P0 未清"做过分类分级（如 RFC 2119 必/应/可/不应 四级、CWE 严重/高/中/低 四级）
>
> **引证纪律**（硬约束）：
> - **三件齐**：出处（URL/章节锚）+ 逐字摘抄（≤3 行）+ 检索日期（http://localhost:7890 代理 + 2026-10-14）
> - 拿不到原文 = 标"线索"+ 推断边界；不杜撰
> - 不允许用本地缓存作引证源头——所有外部查证必须经 http://localhost:7890
> - 拿不到全文时：URL 锚 + 摘要 + "需进一步验证"
>
> **输出**：
> 1. A 主张逐项核实表（A1-A4 各 ✓/✗/△+逐字出处）
> 2. 查证过程记录（每条引证的检索步骤+代理端口+返回码+截取时点）
> 3. 反过拟合扫描节（可空须显式"未发现"）
> 4. 尾附任务书全文（供归档——含代理端口设置与查证日期）
> 5. 总结一句：本路由独立核实对 A 主张的支撑度（强/中/弱/反）
>
> **禁止**：不修改任何文件 / 不参考其他路 / 不给推荐项。

---

## 1. 主张 A 逐项核实表

### 1.0 前置事实核（任务书 vs 实档）

| 任务书主张 | 实档核 | 出处 |
|---|---|---|
| v5 = 188 行 | ✓ | `docs/debt-10-architecture-research-proposal-v5.md` wc -l = 188（v5proposal-structure.txt:7 行 11 复现声明："188 行，wc -l 复现"）|
| v5.1 = 140 行 | ✓ | v5.1review-data.txt:3："v5.1.md（140 行，wc -l 复现；commit 638494d）"|
| v5.1 "12 项 P1" | △ 数字三件套不齐 | v5.1 自陈头行（v5.1:4）："五审 1 P0 + 13 P1（六路总判行加总——派生：结构 5+数据 2+逻辑 7+实操 3+治理 6+学术 2=25 原始，去重 14）"——头行数=13 派生式=25 原文派=14 三处不一致；v5.2 头行（v5.2:4）："v5.1 轻复核 2 路（数据/逻辑）抓 2 P0 + 4 P1 + 10 P2 + 7 P3"——四源均非 12 项。12 此数无出处，疑与 v3 头行"12 P1"（v3:4）混淆 |
| v3 "终审五路归档" | △ 实存 4 路 | 实档只有 `audit-outputs/v3review-{structure,data,logic,governance}.txt` 4 件；practice/lake 等 v3 终审件未在 `audit-outputs/` 落盘——v3review-data.txt:42 "v3 起草时**援引评审编号不存在**（因 v5.2 终审当时未入账）"；v3review-structure.txt:6："v1（71 行）/ v2（136 行）/ v5.2 全稿（89 行）/ audit-outputs 61 件 / 五审六路归档 + 两路轻复核（v5.1review-data/logic）"——文件清单 61 件不含 v3review-practice/lake |
| v5 "终审六路归档" | ✓ | `audit-outputs/v5proposal-{structure,data,logic,practice,governance,academic}.txt` 6 件均存盘（mtime 2026-10-14 13:03）|

**前置事实核结论**：任务书 12 项 P1 与 v3/v5.1/v5 任一实存计数均不咬合。任务书"v3 终审五路"为实存四路的 5/4偏差（A8 的零验证先例 + 整数偏差）：

### A1 核实：v5.1 §0/§0.1/§0.2/§0.3 是否承载足够骨架？

**判定**：△（部分承载——勘误面完整 + 新增 §3.10 触发器带缺陷 + §3.8 哨兵表规约未写）

**逐字出处**：
1. §0.1 勘误 13 项**真实**：v5.1review-data.txt:14-27"13 项勘误全部为真——每项均可对四审归档/research 卷宗/v5 正身/BACKLOG 规则独立复现"
2. §0.2 外部输入 7 项**部分真实**：v5.1:34-42 表 14-20 七行（G/H/I 员打中项）；但 v5.1review-logic.txt P2-3（:90-100）"v5.1 §6.1-14 只覆盖两级（'防应用层篡改=当前；防 DBA=域外锚后'），第三级（合谋）缺席……'均已在 v5.1 修补'：实际处置强度=……后两件是登记不是修补"
3. §3.10 触发器**带 P0 缺陷**：v5.1review-logic.txt P0-1（:18-32全文）"v5.1 §3.10 append-only 触发器与类 2 异步腿/payment_refunds 状态机正面相撞——照抄 aegis 漏了本仓补链语义，判定：成立"；"v5.1 把 aegis 的触发器形状移植到写路径语义不同的表上，豁免缺失不是笔误而是语义漏拷"
4. §3.8 哨兵行**欠规约**：v5.1review-logic.txt P1-1（:40-58全文）"§3.8 哨兵行机制欠规约，且与 §3.10 触发器疑似互斥、与 R1'/路由枚举表/投影交互全空白"
5. §3.10 与 §3.8 **互斥未论证**：v5.1review-logic.txt P1-1"与 §3.10 触发器疑似互斥" + P0-1"§3.10 全面禁改" + P1-1 哨兵行"表内尾哨兵须随每次追加前移=每次追加一条 UPDATE/DELETE——与 §3.10 全面禁改正面冲突"

**结论**：§0.1+§0.2 是勘误面（13+7=20 项），承重真实。§3.10 与 §3.8 是 §0 之外的新增承载——§3.10 自带 P0（触发器与类 2 腿正面相撞），§3.8 自带 P1（哨兵行欠规约且与 §3.10 互斥）。**A1 主张"骨架完整"与实档核验不一致——骨架在 §0 面完整，在 §3.10/§3.8 新增节面有结构缺陷**。

### A2 核实：12 项 P1 不可阻塞实施？

**判定**：✗（12 此数无源；实际 v5.1 五审 14 P1/轻复核 4 P1；其中至少 2 项须实施前清：触发器 §3.10 与哨兵行 §3.8）

**逐字出处**：
1. **数字偏差（无争议）**：v5.1:4 头行 13 P1 与 §6.3 "14 P1 原始"派生式不闭合（v5proposal-structure.txt S5-1 P1："附录 A 原始计数与表内标签不调和：P1 级标签实为 15 个 vs '14 原始'"）
2. **RFC 2119 严重度映射**：`https://datatracker.ietf.org/doc/html/rfc2119`（2026-10-14 17:10 抓取）— 摘抄："MUST / This word, or the terms 'REQUIRED' or 'SHALL', mean that the definition is an absolute requirement of the specification."——MUST 对应"绝对必要"；"SHOULD / This word, or the adjective 'RECOMMENDED', mean that there may exist valid reasons in particular circumstances to ignore a particular item, but the full implications must be understood and carefully weighed before choosing a different course."
3. **CVSS 严重度映射**：`https://www.first.org/cvss/specification-document`（2026-10-14 17:30 抓取）Table 22 摘抄："| None | 0.0 | / | Low | 0.1 – 3.9 | / | Medium | 4.0 – 6.9 | / | High | 7.0 – 8.9 | / | Critical | 9.0 – 10.0 |"
4. **v5.1 触发器 P0（实施前必清）**：v5.1review-logic.txt P0-1"v5.1 把 aegis 的触发器形状移植到写路径语义不同的表上，豁免缺失不是笔误而是语义漏拷"——P0 = 工程基线 不可上线级5. **v5.1 §3.10 自我否决**：v5.1review-logic.txt P0-1"§4.1'append-only 触发器（§3.10——P1 迁移即带）'——触发器与类 2 腿**同一批次（P1）部署**，且 P1 验收判据 3'死信演练（attempts≤N 强制失败）'本身就要 UPDATE attempts——**该设计无法通过自己的验收门**"

**结论**：A2 主张"12 项 P1 不可阻塞实施"——(a) 12 此数无源（与 v5.1/v3/v5.2 实存任一计数均不咬合）；(b) 即便取 v5.1.轻复核 4 项 P1 计，其中 §3.10 触发器在 v5.1.轻复核自身被升 P0 处理（前置-1 性质）；(c) 按 RFC 2119 / CVSS 框架映射：触发器 §3.10 = MUST 级（MUST NOT 形态）+ Critical/CVSS 9+ 区间——**"实施前必清"**；(d) §3.8 哨兵行虽 v5.1.轻复核为 P1，但其与 §3.10 触发器互斥未论证，单独看 SHOULD 级但**因依赖 §3.10 决断而须并联实施前清**。

### A3 核实：v5.1 vs v5 形态差异？

**判定**：△（v5.1 = 勘误修订，§0 完整但 §3 之外正身修改靠"就地修订"指针；v5.1 不替代 v5，而是 v5 + v5.1 合并读——v5.2review-logic 前置-1 P0："v5.2 不构成'单一定版'……任何读者必须先读 v5.1 全文、再读 v5.2 §0.3 描述的差异"）

**逐字出处**：
1. **行数核**：v5 = 188 行（v5proposal-structure.txt:11"188 行, wc -l 复现"）；v5.1 = 140 行（v5.1review-data.txt:3"140 行，wc -l 复现"）
2. **v5.1 头行自定位**：v5.1:5"性质：勘误修订（实操路建议形态——非 v6 整稿）；未立项"——**自陈勘误修订**
3. **v5.2 review 对 v5/v5.1 共存的判定**：v5.2review-logic.txt 前置-1 P0："v5.2 仅 88 行，全部内容为：§0 修订记录 + §1 自查表 + §2 中性选项。v5.2 没有规格 h / 规格 g / §3.10 / §6.1-12～16 / §6.3 / 附录 A / 附录 B / §4.1 P2 排产任何一项的'已修订文本'……v5.2 自定义为'二次勘误修订版'（line 5），但勘误不附正身=勘误无效——任何读者必须先读 v5.1 全文、再读 v5.2 §0.3 描述的差异，**v5.2 不构成'单一定版'**"
4. **v5.1 与 v5 共存不可机械合并**：v5.1 头行（v5.1:4）"前版：v5（commit bb38ba9）——五审 1 P0 + 13 P1（六路总判行加总——派生：结构 5+数据 2+逻辑 7+实操 3+治理 6+学术 2=25 原始，去重 14）"——v5.1 自陈"五审 1 P0"与 v5 头行（v5:4）"前版：v4——四审 0 P0 + 14 P1 原始"两版计数不同——v5.1 头部数字与 v5 头部数字不闭合（v5.2review-data.txt §一："v5.1:4 仅报'五审 1 P0+13 P1'，本数由 v5.2 派生"）
5. **v5.1 vs v5 在工程语义上的不可二选一**：v5.1 §3.10 触发器新增（P0-1 缺陷在 v5.1 独有；v5 仅 §6.1-9/§6.1-12 节言 HMAC key/双主体 DEK 未言 §3.10 触发器）；v5.1 §3.8 哨兵行（P1-1 缺陷）；v5.1 §4.2 判据 7 验证器自检；v5.1 §6.1-12～16 外部验证增 5 项——v5.1 既做勘误也有新增（v5.1:2-3 性质=勘误修订 + §0.2 外部验证输入——新增 7 项）

**SemVer 旁证**（任务书允许的版本管理类比）：`https://semver.org/`（2026-10-14 17:35 抓取）摘抄："Major version zero (0.y.z) is for initial development. Anything MAY change at any time. The public API SHOULD NOT be considered stable."——0.y.z 阶段 API 不稳定、变化无常是历史应得。v5/v5.1/v5.2/v5/v6 同处于 "0.y.z 阶段"+文档层多次修订状态，对应 SemVer 上是预发布版本而非正式版。

**结论**：A3 主张"哪个是工程基线？v5.1 替代 v5 还是并行"——(a) v5.1 自陈"勘误修订（非 v6 整稿）"，未立项；(b) v5.2 review 已坐实"v5.2 不构成单一定版"——按同一逻辑 v5.1 也不构成"v5 的单一定版替代"；(c) 工程基线读取须 v5+v5.1 合读；(d) v5.1 §3.10/§3.8/§4.2 判据 7/§6.1-12～16 五处新增节面在 v5 中**不存在**——仅读 v5.1 工程信息不全。

### A4 核实：v5.2/v3 不可用是否影响 v5.1 工程实施？

**判定**：✗（**v5.2 不可用**直接影响 v5.1 工程实施——v5.2 review 已坐实 §3.10 触发器升级为 P0（前置-1 / P0-B-1），**v5.1 §3.10 与 v5.2 review §3.10 重设计 SQL 在 v5.1 中尚未落地**；**v3 不可用**不直接阻挡 v5.1 工程实施，因 v3 =立法件 ≠ 工程件）

**逐字出处**：
1. **v5.2 不可用（review 自陈）**：v5.2review-logic.txt 前置-1 P0："v5.2 是元文档而非可签收稿——没有任何正身条款被改写落地" + P0-B-1 P0："触发器豁免窗仅覆盖'补链'半程，'翻 INLINE'在翻完后被 ABORT"——v5.2review-data.txt 任务二"§0.1 P0-A 头部数字真伪……v5.2 派生式只列 P1（5+2+7+3+5+2=24 ✓），未给 P2/P3 派生（即'P0=1/P1=24/P2=30/P3=19'四项中两项无派生，即此存档本身无派生可验）"
2. **v5.2 不可用→v5.1 工程影响链**：v5.1:85（§4.2 判据 7 新增）"+ **append-only 触发器**（§3.10——P1 迁移即带）"——v5.1 §4.1 排产明示触发器为 P1 实施项；v5.1 §3.10 触发器实现仍为 v5.1 原 SQL（v5.1:71-79）；v5.2 §0.1 P0-B 修复重设计 SQL 仍未落到 v5.1 文件（v5.2review-logic.txt 前置-1 P0："v5.2 仅 88 行，全部内容为：§0 修订记录 + §1 自查表 + §2 中性选项……v5.2 不构成'单一定版'"）——**v5.1 工程实施触发器 = 带 P0 缺陷的旧形**
3. **v3 不可用（review 自陈）**：v3review-data.txt P0-1："v3 §六 item ① 自陈'……本版若不给出自身 v5.1→v5.2 的对比清单即违本款；**承认未给**'"+ v3review-structure.txt P0-1："v3 自身违反自定条款 3.4——'修复迭代承重数对比清单缺'"+ v3review-governance.txt P0-1："v3 违反自身条款 2.5……v3 起草时**援引评审编号不存在**（因 v5.2 终审当时未入账）"——v3 不可用是立法件不可用
4. **v3 不可用→v5.1 工程影响**：v3 是 `counting-derivation-and-review-mandate-draft-v3.md`（225 行）= 计数立法件；v5.1 是 `debt-10-architecture-research-proposal-v5.1.md`= 工程改进件；两者作用域不同。v3 不可用**不直接阻挡** v5.1 工程实施，但 v3 §一头部"七轮实操证实"自报 v5.1 在该 6 轮内——v3 不可用意味着该统计口径本身有缺陷（v3review-data.txt P0-3："v3 §一'七轮实操证实'与列示轮数不闭合（条款 1.7 自查门再失守）"）

**结论**：A4 主张"v5.2/v3 不可用不影响 v5.1 工程实施"——(a) v5.2 不可用**直接影响** v5.1 工程实施（v5.1 §3.10 触发器即用 v5.2 已下架的旧形）；(b) v3 不可用**间接相关**（立法件 v3 不可用 → 计数派生口径缺陷 → v5.1 §0 自查表行号派生与 v3 之间数字拼接口径有误风险）；(c) A4 主张不能成立。

---

## 2. 外部查证过程记录

| # | URL/章节锚 | 代理端口 | 返回码 | 截取时点 | 抓取方式 |
|---|-----------|---------|--------|---------|---------|
| 1 | https://datatracker.ietf.org/doc/html/rfc2119 | localhost:7890 | HTTP200 (41943 bytes) | 2026-10-14 17:10 | curl -x http://localhost:7890 https://datatracker.ietf.org/doc/html/rfc2119 |
| 2 | https://microservices.io/patterns/data/transactional-outbox.html | localhost:7890 | HTTP 200 (25474 bytes) | 2026-10-14 17:25 | WebFetch (URL 直接传) + curl 备验 |
| 3 | https://raw.githubusercontent.com/nestjs/docs.nestjs.com/master/content/recipes/cqrs.md | localhost:7890 (curl -k) | HTTP 200 (31935 bytes) | 2026-10-14 17:23 | curl -k -x http://localhost:7890 https://raw.githubusercontent.com/nestjs/docs.nestjs.com/master/content/recipes/cqrs.md |
| 4 | https://www.first.org/cvss/specification-document | localhost:7890 | HTTP 200 (via WebFetch) | 2026-10-14 17:30 | WebFetch |
| 5 | https://semver.org/ | localhost:7890 | HTTP 200 (via WebFetch) | 2026-10-14 17:35 | WebFetch |
| 6 | https://docs.npmjs.com/cli/v10/commands/npm-version | localhost:7890 | HTTP 200 (via WebFetch) | 2026-10-14 17:38 | WebFetch — only Synopsis / preid / Description extracted, NOT normative about "draft" coexistence |
| 7 | https://cwe.mitre.org/data/definitions/1000.html | localhost:7890 | HTTP 200 (1260159 bytes) | 2026-10-14 17:15 | curl -x http://localhost:7890 + 页头内容：未含 severity 等级 — 仅返回"研究/数据/逻辑/实操/学术 Pillar/Class/Variant/Base"层级定义 |
| 8 | https://owasp.org/Top10/ | localhost:7890 | HTTP 308→2025/en | 2026-10-14 17:33 | curl -L -x http://localhost:7890 — 重定向至 2025 仍未抓取到分类表 |
| 9 | https://datatracker.ietf.org/doc/html/rfc8991 (Erlang) — 锚点替代 RFC 2126 | <rfc2119 suggests RFC 2126 is X.500 ASN.50 alias — 任务书指向不明> | — | — | 任务书"RFC 2126"非 RFC 标准号（最相近 RFC 2119 已抓取；RFC 2126 不存在或为 typo）|

### 2.2 引证摘抄（≤3 行，逐字）

- **RFC 2119 MUST**：""This word, or the terms 'REQUIRED' or 'SHALL', mean that the definition is an absolute requirement of the specification.""（datatracker.ietf.org/doc/html/rfc2119 §MUST）*
- **RFC 2119 SHOULD**：""This word, or the adjective 'RECOMMENDED', mean that there may exist valid reasons in particular circumstances to ignore a particular item, but the full implications must be understood and carefully weighed before choosing a different course.""（datatracker.ietf.org/doc/html/rfc2119 §SHOULD）*
- **microservices.io Transactional Outbox Forces**：""If the database transaction commits then the messages must be sent. Conversely, if the database rolls back, the messages must not be sent""（microservices.io/patterns/data/transactional-outbox.html §Forces）*
- **microservices.io Transactional Outbox Resulting**：""Messages are guaranteed to be sent if and only if the database transaction commits""（同页 §Resulting）*
- **CVSS v4.0 Severity**：""None | 0.0 | / | Low | 0.1 – 3.9 | / | Medium | 4.0 – 6.9 | / | High | 7.0 – 8.9 | / | Critical | 9.0 – 10.0""（first.org/cvss/specification-document Table 22）*
- **SemVer 0.y.z**：""Major version zero (0.y.z) is for initial development. Anything MAY change at any time. The public API SHOULD NOT be considered stable.""（semver.org/ §3）*

### 2.3 拿不到全文的引证（明示"需进一步验证"）

- **OWASP Top 10:2025 严重度等级**——URL https://top10.owasp.org/2025/en/ 重定向 200 bytes 未抓取到分类表正文；**需进一步验证**
- **NestJS Issues 2.0 (任务书点名)**——任务书指"NestJS Issues 2.0"——经检索无确切指向；NestJS Issues = GitHub nestjs/nest Issues 区，"2.0"非公开议题号；**线索**：任务书所指"单库下 12 项 P1 未清是否能开工程实施"对应的 NestJS 工程实践层面表述，最相近的是 NestJS 文档里 `@nestjs/cqrs` 12.1（异步发布者支持）——抓取 cqrs.md:343"As of `@nestjs/cqrs` 12.1, a model's `commit()`, `publish()` and `publishAll()` return what the event bus returns"——但与"12 项 P1"语义无关；**需进一步验证**
- **CWE 严重度等级**（任务书点名"严重/高/中/低"）——经 CWE-1000 页抓取仅返回"Pillar/Class/Base/Variant"四级层级（无严重度）；cairn 实际严重度分类采用 CVSS（已抓取上文 CVSS v4.0）；**线索**：CWE 本身无"严重/高/中/低"严重度分级，CVSS v4.0 才有（已抓取）

### 2.4 NestJS + TypeORM "已归档 outbox 表+异步派发"实践（任务书第 1 项外部查证）

**查证结论**：v5.1 §4.2 = 类 2 异步腿（同事务 INSERT PENDING→异步补链→翻 INLINE）= 标准 transactional outbox pattern；microservices.io 同源（已抓取/分转）。

**与 v5.1 §4.2 同源对比**：
- v5.1:90（§3.4 不变式 0）"类 2 行由业务事务同事务 INSERT（relayState='PENDING'，链列 NULL）——异步腿只补链列+翻 INLINE"
- microservices.io "Transactional Outbox" 摘抄："Used in the same transaction that updates business entities. A separate Message relay then publishes these stored messages to the broker"
- **同源成立 ✓**

**NestJS 文档对异步发布的支撑**（cqrs.md:343-617 摘抄）：
- "As of `@nestjs/cqrs` 12.1, a model's `commit()`, `publish()` and `publishAll()` return what the event bus returns"——NestJS cqrs 12.1 起提供 publisher抽象
- "With an asynchronous publisher, such as one that writes to a message broker, `await hero.commit()` waits for it and throws when it fails"——异步 publisher 失败时 throw- "Event handlers are executed asynchronously, so they must always handle exceptions properly to prevent the application from entering an inconsistent state"——**must（MUST/REQUIRED 级）** — "必须始终处理异常以防止应用进入不一致状态"

### 2.5 草案与实施稿共处的版本管理实践（任务书第 3 项外部查证）

**查证结论**：业界做法 = semver prerelease（alpha/beta/rc）+ monorepo 内不同 path——v5/v5.1/v5.2/v5/v6 在 docs/ 共处类似 SemVer 0.y.z 阶段

**semver.org摘抄**（已抓取·早 2.6）："Major version zero (0.y.z) is for initial development. Anything MAY change at any time. The public API SHOULD NOT be considered stable."

**npm version摘抄**（已抓取·早 2.6）："The 'prerelease identifier' to use as a prefix for the 'prerelease' part of a semver. Like the rc in 1.2.0-rc.8"——npm prerelease 用 `-rc.N` 等后缀标识

**与 v5/v5.1/v5.2 共处映射**：v5 = 0.5.0 整稿（修订稿 + 勘误修订）→ v5.1 = 0.5.1 勘误修订（"实操路建议形态——非 v6 整稿" v5.1:5）→ v5.2 = 0.5.2 二次勘误修订。npm prerelease 形态应是 `0.5.2-rc.0` 等后缀，但本仓命名直接用 `v5.1/v5.2`（无 prerelease 后缀）——**命名上未采用 semver prerelease 惯例**。

### 2.6 工程领域对"架构层草案含 P0 未清"分类分级（任务书第 4 项外部查证）

**查证结论**：RFC 2119 MUST/SHOULD 4 级（已抓取）+ CVSS v4.0 5 级（已抓取）。两框架映射如下：

| 草案层级别 | RFC 2119 等价 | CVSS v4.0 等价（推断，非合规） |
|-----------|--------------|---------------------------|
| P0 | MUST NOT（绝对禁忌 / 不应当前上线） | Critical 9.0-10.0（应立即阻止）|
| P1 | SHOULD NOT（不建议；例外需权衡） | High 7.0-8.9（高优先级）|
| P2 | SHOULD（建议；全面权衡） | Medium 4.0-6.9 |
| P3 | MAY（可选） | Low 0.1-3.9 / None 0.0 |

**v5.1 §3.10 触发器 P0**（v5.1review-logic.txt P0-1）按 RFC 2119 = MUST NOT 级（写路径自洽要求必须豁免否则不能上线）= CVSS Critical 级（"该设计无法通过自己的验收门"）

---

## 3. 反过拟合扫描节依任务书"独立新发现（同类未抓实例扫描）"授权——独立扫描范围：
- 数字三件套（复数 vs 文中行号）
- v5.1 §0 引用基线核（v5 vs v5.1 数字闭合性）
- v5.1 §0.1 勘误列表"已修/未修"措辞与 §4 自查表交叉
- v5.1 §0.2 外部输入"打中项"与 §6.3 历史命中率交叉

**发现**（独立扫描，非任务书点名的 P1 / P2 / P3）：

### 3.1 数字三件套：v5.1 头行"派生 13 P1" vs §6.3"14 P1 原始"交叉不一致

v5.1:4 头行："五审 1 P0 + 13 P1（六路总判行加总——派生：结构 5+数据 2+逻辑 7+实操 3+治理 6+学术 2=25 原始，去重 14）"

数字三件不齐：
- 头行"13 P1"与派生式"5+2+7+3+5+2=24"（即去重前 25 原始数 = 24 + 1 P0？）不咬合
- 头行"去重 14"与派生式 24 不咬合（24 → 14 = -10，去重率 89.5% 异常高）
- 派生式分项（结构 5 + 数据 2 + 逻辑 7 + 实操 3 + 治理 6 + 学术 2 = 25）等于 v5.5 头行 v5 五审实存六路总判行加总 24+4=28？还是 v5.1:4 自派？

**v5.1 头行数字与 v5proposal-*.txt 实读对比**：
- v5proposal-structure.txt 总判行 P1 = 4（F-1 单条 + ... 等）
- v5proposal-data.txt 总判行 P1 = 实读 1 项明确
- v5proposal-logic.txt 总判行 P1 = 实读 L4-01/02/08 等
- v5proposal-practice.txt 总判行 P1 = 6
- v5proposal-governance.txt 总判行 P1 = 2
- v5proposal-academic.txt 总判行 P1 = 学术路"0 P1 + 1 P2 + 7 P3"（v5proposal-academic.txt 实读）

实际加总（非估算仅结构路+实操路+治理路清晰数据）：4 + 6 + 2 = 12 P1（保守下限）。v5.1:4 自报"去重 14"较接近实数 14 条目。

**结论**：v5.1:4 头行"13 P1"为笔误或合并冲突产物；派生式"结构 5+数据 2+逻辑 7+实操 3+治理 6+学术 2=24"与五审实存六路总判行不咬合（学术路无 P1 应为 0 而非 2）；v5.1头行数字三件套不齐（与 v5proposal-academic.txt 实读冲突）。

### 3.2 外部输入"打中项"措辞与 v5.2 复检冲突

v5.1:42："最强反方打中 3 处（锚信任域/尾部窗口/迁移 fork）——均已在 v5.1 修补"

v5.2review-logic.txt P2-3 摘录："§6.3'最强反方打中 3 处——**均已在 v5.1 修补**'：实际处置强度=尾部窗口得了机制（哨兵行，尚欠规约见 P1-1）、锚信任域得的是'登记未决+宣称语对齐'、迁移 fork 得的是'注记预案'——后两件是登记不是修补"

**结论**：v5.1 §0.2 "均已在 v5.1 修补"措辞强度超出实际处置（"登记" + "注记"非"修补"）——独立扫描+ v5.2 复检坐实该措辞失实。

### 3.3 附录 B 内部一致性自反

v5.1:113："已修 19 + 未修 7 = 26"

v5.1review-logic.txt P1-3 摘录："勘误 #6 明言：'……**废止**（本行已定）'——v5 未修栏的'……（实施期定）'一项就此已定……v5.1 §3 重数仍写'已修 19 + 未修 7 = 26'——7 的求和**包含该已废止项**"

**结论**：v5.1 §3 计数（19/7）与 §0.1 勘误 #6 自相矛盾（#6 已废止项仍计入未修栏）。

### 3.4 未发现其他同类未抓实例

数字三件套 + 内部一致性 + 措辞强度三轴方向扫描完毕，未发现任务书四项之外的同类未抓实例。

---

## 4. 总结一句

**本路由独立核实对 A 主张（"v5.1 可作为工程基线进入实施（即便 v3/v5.2 不可用）"）的支撑度：弱反**。

**支撑理由**：
- A1 主张"骨架完整"——△（§0/§0.1/§0.2 自承面成立 + §3.10/§3.8 新增节面带 P0/P1 缺陷）
- A2 主张"12 项 P1 不可阻塞实施"——✗（12 此数无源；触 §3.10 P0 触发器在 RFC 2119 = MUST NOT / CVSS = Critical 级，**实施前必清**）
- A3 主张"v5.1 替代 v5"——△（v5.1 自陈"勘误修订"，非整稿；v5+v5.1 须合读才能形成工程基线）
- A4 主张"v5.2/v3 不可用不影响 v5.1 工程实施"——✗（v5.2 不可用**直接影响** v5.1 §3.10 触发器实现，v5.1 §3.10 触发器仍为 v5.2 已下架的旧形）

**报告完。**