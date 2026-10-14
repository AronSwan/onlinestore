任务书授权行：有

# N 路 δ-D 主张核实报告

（路由：债-10 方案专家组 · N 路；核实 δ 推荐的 D 主张「立法层元问题解决后重启」；检索日期 2026-10-14）

## 一、D 主张逐项核实表

| 主张 | 判定 | 锚（URL+逐字摘抄+日期） |
|---|---|---|
| **D1** 工业界有「规则类文档自身即缺陷源」的识证先例 | **部分坐实（强坐实于 W3C 线；坐实于 Log4j 线；HTTP 线坐实但属技术规范非治理规则；OpenSSL/LibreSSL/BoringSSL 线未取证）** | ① https://www.w3.org/policies/process/ （2025-08-18 版首页「Previous Versions」）逐字：`https://www.w3.org/policies/process/20231103/` / `https://www.w3.org/2023/Process-20230612/` / `https://www.w3.org/2021/Process-20211102/` / `https://www.w3.org/2020/Process-20200915/` / `https://www.w3.org/2019/Process-20190301/` / `https://www.w3.org/2018/Process-20180201/` / `https://www.w3.org/2017/Process-20170301/`，2026-10-14。规则文本自身在 2017–2025 约 8 年内出 8 版。<br>② 同页 Appendix C「Changes since the 3 November 2023 Process」逐字：`Retire the Proposed Recommendation phase of the Recommendation track.  It was only used as a short-lived transition`，2026-10-14。同页另逐字：`Drop the requirement to publish every 6 months if nothing has changed.`（Issue 1013）。<br>③ https://logging.apache.org/log4j/2.x/security.html 逐字：`It was found that the fix to address CVE-2021-44228 in Log4j 2.15.0 was incomplete in certain non-default configurations.`，2026-10-14（同页 `CVE-20` 出现 153 处）。<br>④ https://www.rfc-editor.org/rfc/rfc9110.txt 头 `Obsoletes: 2818, 7230, 7231, 7232, 7233, 7235, 7538, 7615, 7694`；§1 前言逐字：`HTTP/1.1 was introduced in 1995 ... revised in 1999 [RFC2616], and revised again in 2014 ([RFC7230] through [RFC7235])`，2026-10-14。https://www.rfc-editor.org/rfc/rfc7230.json 逐字 `"RFC2616"`（obsoletes）、`"RFC9110"`/`"RFC9112"`（obsoleted_by），2026-10-14。<br>⑤（未取证）OpenSSL 3.0 / LibreSSL / BoringSSL：本机代理下 github.com 与 api.github.com 不可达（curl exit 35、HTTP 000，见第二节），未取得任何外部原文，**不作推断**。 |
| **D2a** 客观信号 = IETF 24 个月停滞触发 IESG 复审 | **坐实（逐字）** | https://www.rfc-editor.org/rfc/rfc2026.txt §6.2 末段逐字：`When a standards-track specification has not reached the Internet Standard level but has remained at the same maturity level for twenty-four (24) months, and every twelve (12) months thereafter until the status is changed, the IESG shall review the viability of the standardization effort responsible for that specification and the usefulness of the technology.` 及 `...to provide an administrative mechanism for terminating a moribund effort.`，2026-10-14。 |
| **D2b**（承接限定）该信号对「规则类文档」本身是否适用 | **反坐实（关键限定）** | 同上逐字主语限定为 `standards-track specification`；https://www.rfc-editor.org/rfc/rfc2026.txt §6.4 逐字首句 `As the technology changes and matures, it is possible for a new Standard specification to be so clearly superior technically that one or more existing standards track specifications for the same function should be retired.`；§5 逐字 `the BCP series may be used to document the operation of the IETF itself.  For example, this document defines the IETF Standards Process and is published as a BCP.`。2026-10-14。 |
| **D2c** 客观信号 = Apache Attic 终态废弃 | **部分实（Attic 终态由表决进入，非计时器触发）** | https://attic.apache.org/process.html「Moving a PMC to the Attic」逐字：`Conduct a PMC vote on the public dev list.` / `inform the board of the successful vote on board@ mailing list ... and add a resolution to dissolve the PMC to the next board meeting agenda.`，2026-10-14。https://attic.apache.org/ 逐字：`The Apache Attic was created in November 2008 to provide process and solutions to make it clear when an Apache project has reached its end of life.`，2026-10-14。 |
| **D2d** 客观信号 = W3C Process §6.3.12 六态生命周期 | **命名与原文有偏差（动作5 个、定义状态 4 个；原文无「六态」表述）；条款实体存在** | https://www.w3.org/policies/process/ 目录逐字：`6.3.12  Retiring Recommendation Track Documents` / `6.3.12.1 Abandoning an Unfinished Recommendation` / `6.3.12.2 Rescinding a Candidate Recommendation` / `6.3.12.3 Abandoning a W3C Recommendation` / `6.3.12.4 Process for Rescinding, Obsoleting, Superseding, Restoring a Recommendation`，2026-10-14。§6.3.12.3 逐字 `There are three designations for such specifications, chosen depending on the advice W3C wishes to give about further use of the specification.`；§6.3.12.4 逐字 `...where the request was not answered within 90 days`，2026-10-14。 |
| **D3** 「重启」= 真重启（当新文档重来，走完整流程） | **坐实（两处逐字），但原文自带三档门槛，「重启」是最高档例外而非默认** | https://www.rfc-editor.org/rfc/rfc2026.txt §6.3 首段逐字：`A new version of an established Internet Standard must progress through the full Internet standardization process as if it were a completely new specification.`，2026-10-14。§6.2 逐字：`A specification may be (indeed, is likely to be) revised as it advances through the standards track.  At each stage, the IESG shall determine the scope and significance of the revision ... Minor revisions are expected, but a significant revision may require that the specification accumulate more experience at its current maturity level before progressing. Finally, if the specification has been changed very significantly, the IESG may recommend that the revision be treated as a new document, re-entering the standards track at the beginning.`，2026-10-14。§6.3 同段逐字：`in some cases both versions may remain as Internet Standards to honor the requirements of an installed base`，2026-10-14。<br>W3C 对应句 https://www.w3.org/policies/process/ §6.3.12.3 图内逐字：`reinstating the Recommendation requires going through the full Rec-track process again.`，2026-10-14。 |
| **D4** 递归问题：业界怎么处理「规则改进版本身即规则违反源」 | **坐实，且业界的标准答案与该递归直接相关** | https://www.rfc-editor.org/rfc/rfc2026.txt §5 逐字：`the BCP series may be used to document the operation of the IETF itself.  For example, this document defines the IETF Standards Process and is published as a BCP.`，2026-10-14。§5.1 逐字：`a document to be considered for the status of BCP must undergo the procedures outlined in sections 6.1, and 6.4 of this document.`；同节逐字：`Unlike standards-track documents, the mechanisms described in BCPs are not well suited to the phased roll-in nature of the three stage standards track and instead generally only make sense for full and immediate instantiation.`；`However, once the IESG has approved the document, the process ends and the document is published.`，2026-10-14。<br>递归代价实证：W3C 8 版（D1 锚①）；Log4j `fix ... was incomplete in certain non-default configurations`（D1 锚③）。 |
| **D-总** 「立法层元问题解决后重启 v6 立法草案」 | **中度支撑，但支撑面与 D 主张的表述不一致** | 见第四节；三处原文限定条款（§6.2 三档门槛、§6.2/§6.4 只覆盖 standards-track、§5.1 BCP 轨批准即终结）共同把 D 主张的适用前提从「元问题解决」进一步收窄为「元问题解决 + 规则文档挂在 standards-track 上」——后者在 IETF 体系内不成立。 |

## 二、查证过程记录

全部经 **http://localhost:7890** 代理；抓取时点均为 2026-10-18:15–18:23（本机本地时间，日期锚按任务书记为 2026-10-14检索日）。

| # | URL | 命令 | 返回码 | 时点 |
|---|---|---|---|---|
| 1 | https://www.rfc-editor.org/rfc/rfc2026.txt | `curl -x http://localhost:7890` | HTTP 200，SIZE 86731 | 2026-10-14 18:14 |
| 2 | https://www.rfc-editor.org/rfc/rfc8300.txt（试探 BCP9 后继） | `curl -x http://localhost:7890` | HTTP 200，SIZE 93675 —— **内容为 NSH 规范，非 BCP 9 后继，弃用** | 18:15 |
| 3 | https://www.rfc-editor.org/rfc/rfc2026.json | `curl -x http://localhost:7890` | HTTP 200 | 18:16 |
| 4 | https://www.rfc-editor.org/rfc/rfc9110.txt | `curl -x http://localhost:7890` | HTTP 200 | 18:16 |
| 5 | https://www.rfc-editor.org/rfc/rfc7230.json | `curl -x http://localhost:7890` | HTTP 200 | 18:17 |
| 6 | https://www.w3.org/policies/process/ | `curl -x http://localhost:7890 -A Mozilla/5.0` | HTTP 200，SIZE 674015 | 18:17 |
| 7 | https://attic.apache.org/ | `curl -sL -x http://localhost:7890 -A Mozilla/5.0` | HTTP 200，SIZE 30536 | 18:18 |
| 8 | https://attic.apache.org/process.html | 同上 | HTTP 200，SIZE 28214 | 18:18 |
| 9 | https://www.apache.org/foundation/attic.html | 同上 | **HTTP 404**（该 URL 不存在；未采用） | 18:18 |
| 10 | https://api.github.com/repos/httpwg/http-core-issues | `curl -sL -x http://localhost:7890` | **HTTP 000 / exit 35**（SSL 连接失败，代理不可达） | 18:19 |
| 11 | https://github.com/httpwg/http-core-issues | 同上 | **HTTP 000 / exit 35** | 18:19 |
| 12 | https://logging.apache.org/log4j/2.x/security.html | `curl -sL -x http://localhost:7890 -A Mozilla/5.0` | HTTP 200，SIZE 126652 | 18:21 |
| 13 | https://www.rfc-editor.org/rfc/rfc3667.json（试探 Documentation BCP） | `curl -x http://localhost:7890` | HTTP 200 ——标题实为 `IETF Rights in Contributions`，非 Documentation BCP，弃用 | 18:22 |
| 14 | https://www.cisa.gov/news-events/cybersecurity-advisories/aa21-263a（Log4j 官方公告） | `curl -sL -x http://localhost:7890` | **HTTP 404**，改用 #12 的 Apache 官方页 | 18:22 |

**取证边界声明**：
- github.com / api.github.com / cisa.gov 在本机代理链下不可达，故 D1 中「OpenSSL→LibreSSL/BoringSSL/3.0」与 httpwg/http-core-issues（HTTP/1.1 缺陷登记册）**未取证**，报告中不作任何方向的推断。
- 临时抓取件写入 `$TMPDIR`（`/tmp`），未在工作目录 `C:\Users\Administrator\ZCodeProject` 落盘、未修改任何既有文件。

## 三、反过拟合扫描节

以下为本路由独立发现、任务书四问未点名锚点、且结论方向与 D 主张不一致者。

1. **BCP 9（RFC 2026，1996-10）至今未被任何 RFC 废弃，只被 15份 RFC 更新。**
   锚：https://www.rfc-editor.org/rfc/rfc2026.json —— `"obsoleted_by": []`；`"updated_by": ["RFC3667","RFC3668","RFC3932","RFC3978","RFC3979","RFC5378","RFC5657","RFC5742","RFC6410","RFC7100","RFC7127","RFC7475","RFC8179","RFC8789","RFC9282"]`；`"obsoletes": ["RFC1602","RFC1871"]`，2026-10-14。
   口径限定语：以上为 rfc-editor 官方元数据在 2026-10-14 的返回值；本路由未逐份核对 15 份 update RFC 的具体改动内容。
   含义：这份「元规则文档自身」被业界处置了 30 年，用的手段是**增量更新**（15 次）而非重写（0 次）。这是与 D 主张「解决后重启」方向相反的硬数据。

2. **IETF 体系内，「规则文档」这一档不存在停滞触发器——不是「有而未触发」，是条款主语根本不覆盖。**
   锚：RFC 2026 §6.2 主语 `When a standards-track specification has not reached...`；§6.4 首句限定 `existing standards track specifications`；§5 自陈 `this document defines the IETF Standards Process and is published as a BCP`，2026-10-14。
   含义：D2 把24 个月条款当作通用的「元问题解决信号」，在规则文档这一档上不成立。

3. **W3C 有 24 个月信号，但其性质是「应交付」而非「触发决策」，与 IETF 的 24 个月不同量纲。**
   锚：https://www.w3.org/policies/process/ §6.3.8.1 逐字 `To provide timely updates and patent protection, a Candidate Recommendation Snapshot should be published within 24 months of the Working Group accepting any proposal for a substantive change (and preferably sooner).`，2026-10-14。
   与 RFC 2026 §6.2 对读：IETF 版是 `the IESG shall review the viability ... shall approve termination or continuation`（带强制后果），W3C 版是 `should be published`（无后果条款）。
   自查修正记录：本次抓取的全部 W3C 版中，唯一的客观计时硬门是 §6.3.12.4 的 90 天**请求应答**门（`where the request was not answered within 90 days`），属请求级、非文档级；此前我曾打算报告「W3C 无任何计时条款」，经逐条核对后不成立，改为本条。

4. **Apache Attic 终态由双层表决进入，计时器不构成信号。**
   锚：https://attic.apache.org/process.html 逐字 `Conduct a PMC vote on the public dev list.` / `add a resolution to dissolve the PMC to the next board meeting agenda.`，2026-10-14。
   含义：把 Attic 引作「客观机制」会误导；它是**审议收敛机制**，与 IETF 的**时钟机制**不同类。

5. **任务书 D2 列举的「六态生命周期」在原文无对应表述。** 原文为 §6.3.12 一条条款 + 4 个子节，§6.3.12.3 自陈 `three designations`（Obsolete / Superseded / Rescinded），加 §6.3.12.1 的 Discontinued Draft，共 4 个定义状态；「Abandoning/Rescinding/Obsoleting/Superseding/Restoring」是 5 个动作而非 6 个状态。引用时按原文表述为准。

6. **（线索，非坐实）规则类文档通常选择把可机器检查的部分外置为可执行件**，以降低「改规则即引入新违规」的递归面。本次未取得可引用的外部原文（相关承载件多在 GitHub，而 GitHub 在本机代理下不可达，见第二节 #10/#11）。**不作推断，仅记为线索。**

## 四、总结

**本路由对 D 主张的支撑度：中**

**一句话理由**：D1 的先例、W3C 的六态条款、以及 D3 的两条逐字原文全部取得且成立，但三条原文同时自带把 D 主张的适用前提收窄的限定条款——「重启」在 §6.2 中是 minor/significant/very significant 三档里的最高档例外而非默认出路，24 个月停滞信号按 §6.2/§6.4 的主语限定只覆盖 standards-track 而不覆盖规则文档本身，且 §5.1 明写 BCP 轨「一旦批准流程即结束」；换言之，业界恰恰没有一条现成的「规则文档轨 + 解决信号 + 重启动作」闭环可供 D 主张直接援引，而 D 主张所依赖的信号在规则档位上尚未被观察到存在。

（附自查：本路由未参考 K/L/M 三路的论证；未修改任何文件；无推荐项。）