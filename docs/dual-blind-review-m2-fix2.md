# 二次修复批 b05c4f2 四席双盲审总报告

> 2026-10-05 · X1/X2（安全组）+ Y1/Y2（纲领组）· 协调席双重比对
> 前序：dual-blind-review-m2-fix.md（一次修复的裁定）

## 一、四席判定

| 席 | 判定 | 要点 |
|---|---|---|
| X1 | 不可原样过 | 104 组攻击；并发 TOCTOU 4/5 轮实锤；15 新隐形码位全落库 |
| X2 | 不可原样过 | 85+ 组；并发 TOCTOU **10/10 全中**；14 码位+西里尔同形字；修复方窗口可观测未声明 |
| Y1 | 可过带账 | jest/构建六断言精确吻合；**postgres 驱动可移植 P1**；Cf 族系统枚举 **160 码位** |
| Y2 | 可过 | R5 泛化性 9 变体检验成立；R3 判"半根因"（NFKC 原理+兜底打地鼠）；合并逻辑双份同构 |

## 二、双重比对与裁定

**四席共中（最高置信）**：Cf/隐形字符残余族——X1 15 码位/X2 14 码位/Y1 **160 码位系统枚举**/Y2 14+ 族含"任意可见分隔符拆词"（`托 特`/`限·时`，空格类无法枚举）。NFKC 轴是原理性归一（Y 组判定），但枚举兜底是打地鼠升级版，且修复方验证窗口已有落库证据未声明（X2，纪律违规）。**裁 P1**。

**X 组双实锤共中**：并发 TOCTOU——check-then-act 无事务，两个各自合法的单字段 PATCH 并发交错 DB 倒挂落库（X1 4/5、X2 10/10）。顺序面 18+17 组全拦。**裁 P1**。

**单席命中（协调席复验采纳）**：postgres 驱动可移植（Y1 P1——`typeof price==='number'` 在 PG decimal 列返回字符串，校验静默失效；docker-compose DB_TYPE=postgres，"dev 验证过部署形态未验"=纲领§4 同族盲区。读码证实，**采纳 P1**）。

**P2 共中/采纳**：视觉空名（X 组共中）/bagType 类型校验缺失（X 组共中）/null→500（X1+Y1）/specifications 合并双份同构（Y2——R2 所修病根的复发面）/lint 面不含 tags（X1——tags 渲染首页徽章可携禁用词）。

**组间分歧裁决**：X 组按"声称被击穿"判不可过、Y 组按"根因方向正确"判可过——**合并裁定：附条件通过**。修复方向五件全部正确（Y 组 R5 泛化性检验），但 3 P1+5 P2 须三次修复。

## 三、三次修复批清单

1. **P1 并发 TOCTOU**：update 路径改**单条条件 UPDATE**（`SET price=? WHERE id=? AND (original_price IS NULL OR original_price>=?)`，affected=0 即 409/400 重读复检）或事务内重读+既有 version 列乐观锁——取条件 UPDATE（无锁依赖，SQLite/PG 双兼容）
2. **P1 Cf 族**：NFKC 后剥 `\p{Cf}` Unicode 属性类（一条正则替代枚举）+ `\p{White_Space}` 全类折叠后比对；**已知限制显式声明**：可见分隔符拆词盲区（`托 特`）与跨书写系统同形字（西里尔 о/希腊 Β——需 confusable 映射表，挂账不引库）；word 报文可能完全脱离原文（报 BOSTON 原文 ＢＯＳＴＯＮ）
3. **P1 postgres 可移植**：价格守卫的 `typeof` 判断改 `Number()` 强转（或列 transformer），并补"两部署形态等值"单测（mock 字符串返回）
4. **P2 bagType/colorGroup 类型校验**：extractFactCard 对非字符串 400 形状错误
5. **P2 视觉空名**：name 校验链与 2 联动——normalize+剥 Cf 后 trim 非空
6. **P2 null→500**：DTO Transform 将标量 null 归一为 undefined（不进 update 集），fail-clean
7. **P2 双份同构**：提取 mergeSpecifications 共享 helper，controller 闸视图与 service 写路径单点引用
8. **P2 lint 面扩 tags**：tags 数组逐项过 lintCopy（命中即 400）
9. P3 顺带：@Matches 补 U+2028/2029；gate.spec 硬编码目录名改相对推导；三 findById 冗余收敛

## 四、环境事件与制度补条款

- **HEAD 游离事故**（已修复归位 master=b05c4f2）：某席 checkout 父提交做基线对照未归位，致两个 commit 落 detached HEAD。**v1.2 补条款**：盲审/审计席的原仓 git 操作限定只读（log/show/diff），基线对照一律在仓外副本做——本次 Y2 的仓外克隆做法即正确范式
- **并发席共用 DB 的清场互踩**（X1 范围清扫误删他席探针；商品 2 描述被覆写后 Y2 已自恢复）：**补条款**：每席只清自己创建的 id 清单，禁止范围清扫；种子数据只读
- X2 发现修复方验证窗口可观测走私未声明——"已知限制必须声明"条款再犯记 P2 纪律账
