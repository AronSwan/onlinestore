# REICH 现代化双方向讨论文档 v1.0

> 2026-10-04 · 四席合议（A 审美调研 / B 前端技术审计 / C 产品定义 / D 后端侦察）+ 协调席裁决
> 授权：用户令"layout 要有现代式审美，商品上架编辑下架要智能，多 agents 分工严肃讨论"；区块链问题另令并入
> 本文档为讨论稿，开工以用户拍板为准

---

## 〇、四席关键事实速览

| 席 | 最关键的三条事实 |
|---|---|
| A 审美调研 | ① 2025-26 现代感=大字体+平涂色块+bento 节奏，糖果调色盘本来就对，缺的是用法现代化 ② container queries/`:has()`/OKLCH/`color-mix()` 已 Baseline（~95% 浏览器），纯手写原生 CSS 可上 ③ Google Fonts 的 Barlow 只发静态实例，可变字体须从上游自托管 |
| B 前端审计 | ① **131 个幽灵 CSS 变量**（引用了 234 个变量名、131 个无定义，浏览器里静默失效）——"看着像在设计，实际靠默认值" ② index/orders 92-94% 是 Tailwind 布局类，CDN 运行时编译锁死 v3、无 tree-shaking、官方明示不推荐生产 ③ profile 页完全游离在 Tailwind 体系外，四页两套世界观 |
| C 产品定义 | ① 名实不符事故的病根是"手搓 SQL 入库、没有流程"，不是"没有 AI" ② 防线=事实卡（强制看图四选）+词表冲突比对+对图朗读三闸，全部纯规则零外部依赖 ③ T2 AI 只埋接口，本机无 key 时诚实标注"规则助手" |
| D 后端侦察 | ① **POST /api/products 当前必败**：categories 表空+categoryId 必填+DTO 必填 brand 但实体无列+DTO 缺 mainImage/tags ② **公开列表不过滤 isActive**，下架品照样漏给前台 ③ 审计模块是"鬼城"：实体/服务/迁移/表全齐，就是 app.module 没 import，audit_logs 0 行 |

---

## 一、方向一：Layout 现代式审美

### 1.1 设计裁决（A 席提出，协调席采纳）

**定调：糖果高级化（Editorial Candy）**——调色盘不动，动排版胆识和色彩用法；从"贴纸感的可爱"升级为"编辑感的可爱"。

三条核心动作（按优先级）：

1. **字体先行**：自托管 Barlow 可变字体（上游 `BarlowGX.ttf` 转 woff2，OFL 协议），hero 标题放大到 `clamp(3rem, 8vw, 7rem)`，字重 900 与正文 400 拉开阶梯。投入最小、现代感收益最大。
2. **色彩系统化**：tokens 改 OKLCH 定义，soft/ink/hover 档全部 `color-mix(in oklch, …)` 自动派生（新增糖果色时一行变量出全阶梯）；整区平涂色块+留白分区，删装饰性阴影。
3. **商品区破节奏**：均等 3 列改 bento（1 个 2×2 主打位+单格群），卡片用 container queries 自适应内部排版，`:has()` 整卡 hover 联动；品牌故事区加一处 `@supports` 包裹的 scroll-driven 渐显（Firefox 降级静态，零损失）。

**反趋势（明确不做）**：玻璃拟态、深色模式（糖果色系只在白底成立）、第二条跑马灯、scroll-jacking、3D/WebGL、入场动画全家桶（stagger 只留 hero）。

### 1.2 技术裁决（B 席提出，协调席采纳）

**路径 B 为主干（Tailwind 本地构建），A 的清理子集前置；明确不做组件化重构（路径 C）。**

- 为什么不只是纯手写现代 CSS（路径 A）：index/orders 的布局现实载体已经是 Tailwind（92-94%），CDN 运行时编译是能力天花板（无 v4/无 tree-shaking/100KB+ 编译器随页下载）兼性能债务；repo 里已有 vite+postcss 配置残留，引入成本被摊薄。
- 为什么清理必须前置：131 个幽灵变量不清，构建化只是把垃圾从"运行时静默失效"编译成"构建时静默失效"。
- 为什么不做 C：四页静态站、9,122 行 JS、80 个 id 契约+30 个类契约全部冻结，20-30 人日换不来用户可见差异。

### 1.3 方向一施工图（7 步，约 10-11 人日）

| # | 步骤 | 内容 | 估计 |
|---|---|---|---|
| F1 | 清幽灵变量与死代码 | 131 个幽灵 var() 逐一定义或替换；删 .backup 死文件、main.css 暗色死块、死类 font-primary/secondary | 1.5d |
| F2 | 断点/令牌对齐 | 22 种断点值收敛为 4-5 档令牌；z-index 建标度；tokens.css 映射层开始消肿 | 1d |
| F3 | Tailwind 本地构建 | 最小构建链（vite+postcss 已在仓），config 桥接 tokens.css，content 覆盖 4 HTML+js/，JS toggle 的工具类进 safelist | 2d |
| F4 | 摘 CDN+头部归一 | 三页摘 CDN、login CSP 收紧；头部四份拷贝+四份内联脚本归一（include 不可行则抽公共 JS 模块）；profile 页纳入体系 | 1.5d |
| F5 | 设计动作一：可变字体 | BarlowGX 自托管+@font-face；hero clamp(3rem,8vw,7rem)；全站字重阶梯 | 1d |
| F6 | 设计动作二：OKLCH 色彩 | tokens 改 OKLCH+color-mix 派生；整区平涂；删装饰阴影 | 1d |
| F7 | 设计动作三：bento+微交互 | 商品区 bento+container queries+`:has()` hover 联动；故事区 scroll-driven 渐进增强 | 1.5d |
| — | 回归贯穿 | 每步 Playwright 双端截图+console 零错；JS 冻结契约零改动为铁律 | 1.5d |

**铁律**：JS 冻结契约（80 个 id+30 个类+JS toggle 的 Tailwind 类）全程零改动；每步可独立 commit、可回滚。

---

## 二、方向二：商品上架/编辑/下架智能化

### 2.1 范围裁决（C 席提出，协调席采纳）

**做 T0 全部 + T1 九件；T2 只埋接口（rule-based provider + key 配置位），不接真实 AI。**

- T0 地基：admin 管理页 CRUD（独立静态页 admin.html，复用 JWT 登录）/ 图片上传 / 草稿发布状态（实体加 status 列）/ 精简操作日志
- T1 规则智能：语音表 lint 前后端双闸 / **事实卡+颜色包型词表冲突比对**（上午三个事故全能拦）/ 价格库存 sanity check / 库存归零自动下架 / 图片存在性校验（发布闸门 HEAD 请求）/ 对图朗读发布预览（强制勾选）/ 定时上架（复用实体已有 publishedAt）/ 批量上下架 / 规格键值编辑器
- T2 接口预埋：`ICopyAssistant`/`IVisionDescriptor`，本期 provider=rule-based，UI 诚实标注"规则助手，插 key 即升级"
- 名实相符三闸：事实卡强制看图四选（主色/包型/五金/场合）→ 词表冲突自动比对（异色词黄警、缺包型词红拦）→ 发布前对图朗读人工兜底

### 2.2 后端地基（D 席缺口清单，开工前置，约 2.5-3 人日）

| # | 修复项 | 阻塞度 | 工作量 |
|---|---|---|---|
| B1 | DTO 与实体对齐：CreateProductDto 去掉 brand 必填（实体无列）、补 mainImage/tags 字段 | 阻塞（POST 必败） | 小 |
| B2 | 分类种子：categories 表灌基础类目（手袋/斜挎包/手提包等）或 categoryId 改可空 | 阻塞 | 小 |
| B3 | 公开列表过滤 isActive（含 /:id 详情对下架品 404 或标记）；管理端加 includeInactive | 高（下架即失效） | 小 |
| B4 | AuditModule 接线（app.module import）——审计模块是鬼城，全套现成 | 高 | 小 |
| B5 | 图片上传端点（Multer，落盘 images/products/ 或 uploads/，校验类型大小，返路径） | 高 | 中 |
| B6 | DELETE 硬删改软删/仅上下架（order_items 孤儿引用风险） | 中 | 小 |
| B7 | tags 搜索 FIND_IN_SET（MySQL 方言）改 SQLite 兼容 | 中（未引爆的雷） | 小 |
| B8 | admin 前端接 /api/auth/refresh（JWT 15 分钟过期） | 中 | 小 |

### 2.3 区块链裁决（用户另令，协调席裁定）

**不做任何公链集成（代币/NFT/溯源/DID/智能合约全部是戏台，理由见会话记录）；采用区块链的"链"本体技术：哈希链防篡改操作台账。**

- 落点：B4 接线的现成 audit_logs 表，加 `prev_hash` 一列；每条商品写操作=内容+前条哈希 SHA-256 链接
- 配套：verify 脚本离线重算全链，一处被改全链报警（AWS QLDB / 证书透明度日志同款模式）
- 成本：B4 之上 +0.5-1 人日；零外部依赖、零 gas、零密钥管理
- 演示话术（诚实版）："商品操作台账密码学防篡改，随时可离线验证"——能当场跑，不是 PPT

### 2.4 方向二施工图（约 8-9 人日）

| # | 步骤 | 内容 | 估计 |
|---|---|---|---|
| M1 | 后端地基 B1-B4+B7 | DTO 对齐/分类种子/isActive 过滤/audit 接线/tags SQL 方言 | 1.5d |
| M2 | 上传+软删+刷新 | B5 上传端点/B6 软删/B8 refresh 对接 | 1d |
| M3 | T0 管理界面 | admin.html+admin.js：商品列表（含下架品灰显）/编辑页/行内快改库存价格/登录分流 | 2.5d |
| M4 | T1 校验闸门 | lint 双闸（voice-rules.json 机器可读化）/事实卡组件/词表冲突引擎/sanity check/图片存在性 | 2d |
| M5 | T1 自动化 | 库存归零自动下架 hook/定时上架 interval 扫描/批量上下架端点+勾选 UI | 1d |
| M6 | 哈希链台账 | prev_hash 列+链式写入+verify 脚本 | 0.5-1d |
| M7 | T2 接口 | ICopyAssistant 接口+rule-based provider+UI"规则助手"位 | 0.5d |
| — | 测试锁 | 新路由全部进授权测试；闸门逻辑单测；988 基线不回退 | 贯穿 |

---

## 三、总体排布与决策点

**双轨并行**：方向一（前端轨 F1-F7）与方向二（后端轨 M1-M7）无相互依赖，可并行开工；M3 管理界面是纯新增页面，不碰四页冻结面。

**合计约 19-20 人日**（agent 并行下日历时间远小于此）。建议里程碑：
1. **里程碑一（地基周）**：F1-F4 + M1-M2 —— 技术债清零+后端通路，无用户可见变化但一切现代化的前提
2. **里程碑二（可见周）**：F5-F7 + M3-M5 —— 编辑感审美落地+管理界面可用
3. **里程碑三（亮点周）**：M6-M7 —— 防篡改台账+智能助手接口

**协调席已裁决（用户可否决）**：
1. ✅ 采用 Editorial Candy 设计方向（调色盘不动，动排版与色彩用法）
2. ✅ 引入 Tailwind 本地构建（唯一工具链变更；CDN 摘除后 login CSP 可收紧）
3. ✅ 智能管理做 T0+T1、T2 只埋接口；AI 演示用规则助手+诚实标注
4. ✅ 区块链=哈希链台账一项，公链系全毙
5. ✅ 权限用现有 Role.ADMIN 体系+DB 里现有 admin 账号（id=12），不新建权限模型
6. ✅ 反过度设计清单（C 席 12 项）+反趋势清单（A 席 9 项）全部采纳为不做项

**挂账待议（不阻塞开工）**：商品详情页目前不存在（点击商品卡无落地页，28 条 SPA 死链同类）——bento 主打位需要"点开看详情"才有意义，是否本期补一个详情页，开工前定。
