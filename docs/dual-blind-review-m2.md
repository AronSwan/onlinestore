# 里程碑二双盲审总报告

> 2026-10-05 · 双席独立审计（X 功能与安全 / Y 质量纲领）交叉比对 · 协调席裁定
> 制度依据：docs/quality-charter.md v1.1 双盲审制度（盲抽离/双席独立/协调席比对）
> 范围：git log 8b8ba4b..1515d84 两代码 commit + 活系统 HEAD=87839be

## 一、交叉比对结论

**双席共中（高置信，直接采纳）**：

| 发现 | 席X | 席Y | 裁定 |
|---|---|---|---|
| 构建产物 CSS 层叠反转 | P2-2（dist 中 entry 从末位移至第 2 link） | P1-1（login 生产构建 +124px 视觉回归，级叠假设破坏） | **P1**——取重：交付物带未披露视觉回归，验收只验 dev 未验 build 产物 |
| 商品数据服务端校验缺口 | P2-1（name=""/30000 字/price=0/stock=1.5/originalPrice<price 全 201 入库，sanity 全在前端） | P1-2（空名+齐事实卡可全链路发布） | **P1**——X 的覆盖面更广，按 X 口径修 |

**单席命中（协调席复验采纳）**：

| 发现 | 席 | 裁定依据 |
|---|---|---|
| returnUrl 控制字符走私开放重定向（`/\t//` `/LF//` `/CR//` 四族过白名单，浏览器实测真实跳转 example.com） | X P1-1 | 29 组逻辑+3 组浏览器实测，证据链完整——**击穿 1515d84 修复**（其 11 用例未含控制字符） | **P1** |
| 服务端复检闸可整体跳过（POST/PATCH 不带 specifications → 闸全跳，"限时抢购"实测 200 落库） | X P1-2 | 实测铁证 | **P1** |
| site-header 模块失败整头消失无兜底（CDN 时代无此失败面） | Y P2-1 | playwright 拦截实测 | P2 |
| text-secondary 同名双源（main.css 手写 vs Tailwind config）+"设计意图恢复"标签拔高（CDN 时代 login 实为继承灰） | Y P2-2 | 独立复核扎实；标签批评接受（漂移已披露、定性拔高） | P2 |
| "断点五档"打折（distinct 36→24 种，五档覆盖 65%，未挂账） | Y P2-3 | 实测数字 | P2（挂账+修正表述） |

**两席共漏检查**（对照原始任务书）：无重大项——OKLCH/幽灵变量/z-index/CDN 摘除/三闸 UI 链路两席各自验证通过。

## 二、数字交叉验证（双席独立测定互证）

- 产物 CSS：X 69,609B raw / Y 69,609B raw（哈希一致独立重建）✓
- CDN 脚本：Y 407,279B raw / 123,350B gzip 实测 ✓（commit 声称 407KB/124KB 属实）
- jest：X 三跑恒定 6 套件/46 例失败（全基础设施）；Y 同口径 ✓（44±2 抖动带内）
- 授权矩阵：X 401×5/403×5 ✓
- 上一轮单席审计结论复核：其"18/19 通过零 P0"中漏判的正是本次双席共中的两项 P1——**单席审计的盲区被双盲审制度兑现**

## 三、裁定

**里程碑二：附条件通过。** 4 个 P1 修复并复验后通过；P2 5 项（site-header 兜底/text-secondary 根治/断点挂账/上传零审计已有挂账/factCard 边界 P3 组）修复批一并处置或挂账。

## 四、P1 修复清单（修复席执行）

1. **returnUrl 控制字符**：解码值先剥 `[\t\n\r]` 再复检，或直接拒绝含任何控制字符（\x00-\x1F\x7F）的 returnUrl——取后者（白名单式拒绝，更严）。
2. **复检闸整体跳过**：①禁用词 lint（lintCopy）对所有 create/update 生效——禁用词检查不依赖事实卡，无理由跳过；②词表冲突复检（checkNameImage）改为"合并后有 factCard（存量或新任一）即生效"；③update 合并逻辑已有，补 create 无 factCard 时的 lint-only 路径。
3. **构建产物层叠反转**：让 dist 中 entry CSS 保持各页 CSS 之后（vite 配置/分 link 策略），或显式 @layer 化全部页级 CSS；修后**验收必须含 build 产物视觉 diff**（preview 服务对比 dev，新增到验收纪律——写进 quality-charter 完善条款）。
4. **服务端 sanity**：CreateProductDto name 加 @IsNotEmpty+@MaxLength(200)；price @Min(0.01)；stock @IsInt+@Min(0)；originalPrice 可选但若存在须 @ValidateIf(price<originalPrice 或空)——用 class-validator 组合；同步 UpdateProductDto。前端 gates sanityCheck 已有，服务端补齐即双闸。

## 五、制度复盘

- 双盲审战果：上一轮单席审计漏判 2 个 P1（均为双席共中级）；X 独立击穿协调席亲手修复的 returnUrl（11 用例不含控制字符）——**审计者与修复者分离的价值实证**。
- 盲抽离执行：两席任务书零实施声称，独立测定数字与 commit 声称的比对（全对上/打折项亦被独立抓出）由协调席完成。
- 待改进：P3 级零宽字符走私禁用词（"限␈时"入库）记入修复席清单随 2 号修。
