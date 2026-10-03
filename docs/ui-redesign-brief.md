# Reich UI 升级 · 设计任务书 v3（终版·评审合议后）

> v2 经业界评审组（设计总监席）+ 实施组（可行性预审席）合议修订。总监判 v2"需重大修订后再施工"（一票否决项：字体管线）；预审席对真实代码逐项预演抓出 6 处施工修订。本版已全部吸收。
> 核心公式不变：**可爱放内容层（文案/徽章/摄影/限额 emoji），UI 骨架保纪律（白底/黑 ink/单点 pill/无回弹）**。

---

## 一、视觉规格（v2 修订版）

### 1.1 配色

```css
--bg-base: #FFFFFF;
--ink: #1A202C;              /* 墨蓝黑 */
/* 糖果一主两备 + 深色文本档（对比度合规） */
--candy-blush-soft: #F9E2EC;  --candy-blush: #FF6B81;   --candy-blush-ink: #D14D67;  /* 主 */
--candy-sun-soft:   #FFF3D6;  --candy-sun:   #FFD166;   /* 备：仅营销区块，禁做白底文本 */
--candy-mint-soft:  #E4F6F0;  --candy-mint:  #7BD5C0;   --candy-mint-ink: #1F8A70;  /* 备 */
--gold / --gold-standard / --gold-rich / --gold-dark / --gold-pale: 全弃用
--brand-red: 全站仅一类元素（售罄标）或不用；价格永远 ink 色
```

**纪律**：淡彩块每页 ≤2 处；饱和档只做徽章描边/焦点环/hover 互换；焦点环用 `*-ink` 档（≥3:1）；文本用 `*-ink` 档（≥4.5:1）。糖果三支降为一主（blush）两备（sun/mint 仅营销区块）——3-8 个商品的体量配三支色相会变杂货铺。

### 1.2 字体（一票否决项修订）

| 用途 | 方案 | 要点 |
|---|---|---|
| 拉丁 display/正文 | **Barlow 系 woff2 自托管**（`fonts/` 目录 + `fonts/fonts.css`，latin subset 全家约 120KB，无需再子集化） | **不走 Google Fonts CDN**（login 页 CSP 拦截外链 + 大陆网络不可靠——G1 事故会重演） |
| 中文 | 系统栈：`'PingFang SC','HarmonyOS Sans SC','Microsoft YaHei',sans-serif` | Windows 优先写雅黑；**不托管中文字体** |
| 数字/价格 | `--font-numeric: 'Barlow Condensed','Barlow',sans-serif` | 混排收益最大场景 |
| 全大写小标签 | 仅英文标签用 `letter-spacing .4-.8px`（对中文无效，中文标签别做全大写） | |
| 顽皮点缀 | **砍掉手写体规格**（Windows 无预装手写中文；自托管 ZCOOL +0.5h 不值） | Signature Moment 用 CSS 实现（见 1.6） |

**中英混排调平**（P0 验收门禁）：display 行高按 CJK 调；数字锁 Barlow Condensed；Windows 雅黑实机验证 2.5rem 混排标题行盒不跳。**加载顺序**：`preload woff2(700) → fonts.css → tokens → main.css → 组件`，preload 带 `crossorigin`。

### 1.3 圆角（三档）

`--radius-sm: 4px`（徽章）/ `--radius-md: 12px`（小卡）/ `--radius-pill: 999px`（全部主 CTA）。禁 blob / >16px 大圆角卡 / 圆角嵌套。

### 1.4 动效（七招弹药，全部 ease-in-out 零 overshoot）

1. 跑马灯公告条（"本季心头好 ♥ 横向滚过"——KS/Glossier 在用，动而不跳）；
2. 导航 hover 下划线 0→100% 划出（宽度过渡）；
3. 列表 stagger 入场：12px 上滑+淡入，30-50ms/项，≤6 项，仅首次；
4. pill CTA 卡片底部滑出；
5. 黑白/淡彩→饱和色彩互换；
6. 徽章 hover rotateY 180° 翻面（0.4s）；
7. 加购成功：袋图标 scale 1→1.15→1 单次脉冲（0.3s）。

**商品卡 hover**：~~淡换第二图~~（图库找不到同包同光第二张，砍）→ **单图 1.03 缩放 + pill 浮出**。

### 1.5 密度与文案

- 每屏顽皮触点 ≤1；全页 emoji ≤2（仅营销标题）；商品卡徽章 ≤2（1 状态+1 玩笑）；
- **文案以 voice sheet 为准**（P8 交付）：3 个定调形容词 + 5 句示例 + 禁用词表；双关放标题层，CTA 动词保持简单；
- **三态可爱规格**：空购物袋（"袋子还空着哦"）、搜索无结果、骨架屏——空态是全站性价比最高的一处可爱。

### 1.6 Signature Moment（全站唯一记忆点）

Hero 大标题中一个字用 **candy 色 + CSS 手绘感下划线**（`text-decoration: underline wavy` 或伪元素波浪线，纯 CSS 零字体依赖）——如"总有一只先背"的"背"字。全站仅此一处，红线保护。

### 1.7 其他

- **暗色模式：v2 不做**（令牌预留 `-dark` 命名空间，一句话写死）；
- focus-visible 统一：2px + 2px offset，≥3:1；触达目标 44px。

---

## 二、施工清单 v3（顺序已按依赖修正）

| 序 | 任务 | 时长 | 关键施工注意（预审席锚点） |
|---|---|---|---|
| **P0 修地基** | 字体自托管+preload；令牌合并；幽灵清理；cart.css --primary 系落值 | **5h** | ①删 @import 六处（main.css:6/orders.css:6/buttons.css:6-7/login.css:6-7）**先于**删源文件（import 断链=整表作废）；②**删金两步走**：先替换 **约 214 处**引用（HTML 106+CSS 98+JS 6——含盲区文件 css/responsive/touch-optimization.css 19 处、mobile-navigation.css 6、enhanced-responsive.css 2、js/product-search/enhanced-search-component.js:110）再删定义（直接删=静默失效面）；**按角色分组替换**：text 档→*-ink（4.5:1）、bg 档→soft/主档、ring/border→主档，CSS 侧按 color:/background:/border-color: 上下文分组正则约 10 组覆盖 90%，剩 10-20 处人工复核；③删 main.js:36-77 注入样式块 **+ :27 的 config.underline.color**，**login.html 补 link nav-underline.css**（否则 login 下划线消失）；④cart.css `--primary` 系**实为 15 处**（503/511/516/43/253/264/282/303/363/491 等）+ `--background-primary` 面板幽灵——不落值则按钮底/形状/阴影全失效（白字浮遮罩上仍可读，但按钮铬不可见）；⑤JS 依赖类名冻结清单先行 |
| **P3 导航统一** | 四页一套 header：**复制 HTML + 新 site-header.css（纯 CSS+内联 SVG，零 Tailwind/FA 依赖）** | 2h | 迁移顺序 **login→profile→orders→index**（依赖最少先行）；index 的 #searchBtn/#searchBar/#enhanced-search-container id 不能改；orders 返回钮并入右 toolbar；**P3 后任何 header 改动必须四页同步**（复制方案无组件系统——header 是链接与图标大户，P5/P7' 各多付一次×4 成本） |
| **P2 拆促销感重演活泼** | 删金渐变/扫光/黑遮罩/悬浮金钮（锚点：main.css:184-197/135-139/444、luxury-components:22/64/196、login.css:55-62 等）；换 pill CTA+七招动效 | 1.5h | 悬浮爱心**保留类名 .reich-product-action + 文件名 heart-icon.svg**（wishlist.js 按子串匹配）；金色 CTA 可安全删 |
| **P1 换真图** | Unsplash 明亮彩色皮具；hero 源图 ≥2100px 宽（1200 裁 21:9 像素不够）；商品按 3:4 参数直下（`?w=800&h=1067&fit=crop`）；**hero 允许 CSS 色块场景方案**（色块取 candy soft 档与产品图底色呼应；og:image/twitter:image 仍需一张 1200×630 实图） | 1.5h | 本机实测：根目录 sharp 0.33.5 直接可用、**AVIF 编码实测通过**（WebP 为主/AVIF 可选）；Unsplash/Google Fonts 直连+代理均 200；hero 改 aspect-ratio 同步压文案区间 |
| **P4 商品接数据** | 首页卡从 `/api/products` 渲染；造种子；vite /api proxy；双 db 清理 | **3h** | 接口返回 `{products, total}` 包装结构（非裸数组）；alt 用 name 合成；前端兜底复制 orders.js mock 模式。**三件增补**：① vite.config.js 加 `server.proxy:{'/api':'http://localhost:3777'}`（否则 dev/Playwright 环境 /api 物理不可达——实测返回 HTML fallback，真数据断言永远走 mock）；② **种子做成 scripts/seed-products.sql 入库**（dev db 在 .gitignore——INSERT 只在本机存在，clone 后空站；SQL+图在 git，一条命令重建演示）；③ `git rm data/dev_caddy_shopping.db`（根目录追踪中的空库，误导插错库+db 出库史活化石） |
| **P5 死链清理** | 50 处死链收口 | 1h | 在 P3 后做（header 统一改链接前清=白干） |
| **P6 移动端收窄** | **index 过 390px + 其余三页不横溢**；profile 侧栏 768px 转横滑 tab（**纯 CSS**：`.profile-menu{display:flex;overflow-x:auto}`——v1"零响应式"诊断过时，断点已有） | 1h | |
| **P8a 定调**（**前置到 P2 前**） | 3 个定调形容词 + 禁用词表 + 5 句示例 | 0.5h | P2 写俏皮标题前调性必须已存在，否则 P8 定调后回头全改=文案二次施工 |
| **P8b 文案 deck** | 四页全量文案表 + 三态文案 | 0.5h | 收尾时交付 |
| **P7' 收尾（降格）** | ~~去 Tailwind CDN~~（升格为独立工作包**暂不做**——三页 90+ 处工具类是布局承重墙，1.5h 差一个数量级）→ 只做：去 Font Awesome 换内联 SVG + CSS-only 动效落参 | 1h | |

**合计约 17-20h**（实施审计独立重估：P0 5h/P4 3h/终验 0.5-0.75h 为 v3 漏列项）。**施工序：P0→P3→P8a→P2→P1→P4→P5→P6→P8b→P7'→终验**（P4 依赖 P1 的图，P5 依赖 P3 的链接结构，P8a 前置消文案二次施工）。

**回滚安全网（开工硬前置）**：从 remediation/2026-10-02 建 `ui-redesign` 分支 + 打 tag `ui-v3-baseline` + **每 P 一个 commit**（符合本仓分批提交惯例，成本≈0，P3 做崩四页可整 P 回退）——UI 改动零测试覆盖，直推不可接受。

**验收门（DoD）**：
- P0 门禁：Windows 实机混排标题行盒不跳；body 有底色；结算按钮可见；grep **三族归零**（`var(--gold`+`var(--brand-gold`+`var(--primary)`，**范围含 *.js**——main.js:27 与 enhanced-search-component.js:110 是已知 JS 侧命中点，豁免 node_modules/dist/备份文件）；fonts/ 目录存在；
- 全程门：`check-frontend-assets.py` exit 0；后端测试不受 UI 改动影响（UI 改动零后端文件）；
- **施工前先跑 Playwright 基线并标记 ≥4 个陈旧 spec**（nav-button 三件套期望"腕表珠宝/香水/手袋"vs 现状"女士/男士/配饰"、basic-navigation 期望旧 title+旧 id——现状本来就红，不先处理则"测试绿"这道门物理不可通过）；
- 终验：4 页 × 3 断点（375/768/1280）× 5 元素（hero/卡/CTA/导航/footer）人工清单 + Playwright computed-style 断言（body 底色/font-family/radius）——**挂默认 playwright.config.cjs（vite dev 5173，四页实测可服务）；e2e.config.js 的 preview 路线是单入口构建（dist 仅 index.html），本工程不用**。

**施工前检查单（9 件）**：① tag ui-v3-baseline + 建 ui-redesign 分支；② git rm 根 data/dev_caddy_shopping.db；③ 跑基线三件套记录红名单；④ 陈旧 spec 处置落笔；⑤ vite /api proxy 加好并验证 /api/products 返 JSON；⑥ 冻结清单抄进仓库 docs/；⑦ fonts/ 目录+字体下载（代理已实测通）；⑧ P1/P4 接口契约（图片命名+mainImage 路径格式）；⑨ Windows 实机混排验收路径确认。

---

## 三、防廉价红线（v3 终版）

1. **糖果色不刷底**——淡彩块每页 ≤2 处，导航/卡片/按钮背景永远白/黑/淡彩；
2. **圆润只落单点**——pill 只给主 CTA；
3. **禁一切弹跳**——活泼=色彩互换+跑马灯+翻面+单次脉冲，不是物理弹簧；
4. **emoji 限额**——全页 ≤2 仅营销标题，禁进正文/表单/按钮；
5. **一致性铁律**（替代"摄影质感不可弃"）：全站产品图**同一背景色系/同一裁切 3:4/同一投影方向/同一后期曲线**——图库图+30 分钟批处理可兑现；hero 可用 CSS 色块场景方案；**没有一致性的糖果色=模板站**。

---

## 四、JS 依赖类名冻结清单（P0 前置，施工全程不得破坏）

| 类名/id | 消费方 | 约束 |
|---|---|---|
| `.cart-overlay` `.cart-panel` `.checkout-btn` `.clear-selected-btn` | cart.js CartUI 动态创建 | 类名不改 |
| `.reich-product-card` `[data-product-id]` `.reich-product-action` `.reich-product-name/-price/-image` | wishlist.js | 类名不改；action 内爱心**必须保留 `img[src*="heart-icon"]` 文件名匹配** |
| `#searchBtn` `#searchBar` `#enhanced-search-container` | index 搜索组件挂载 | id 不改 |
| `#mobileMenuBtn` `#mobileMenu` | 移动菜单 | id 不改 |
| `.nav-link-luxury` | **main.js 注入样式（P0 删）+ tests/nav-button-*.spec.js 三处 locator（陈旧待修）**；nav-underline.css 因四页无 .main-nav 是 100% 死代码 | P3 重写时可换，同步改 CSS+spec |

---

*v3.1（实施审计修订版）合议参与：v3 设计总监席 + 可行性预审席 → 实施审计事实核验席（12 条核验：9 一致/1 硬伤——金系 149→214 漏整个 css/responsive/ 与 1 个 JS 文件/2 处表述校准）+ 执行性终审席（8 项攻击：P4 三坑——vite 无 proxy 真数据断言物理不可达/种子须 SQL 入库/双 db 混乱、e2e preview 单入口陷阱、P8 顺序自缚、回滚裸奔）。依据：四页源码逐行实测、六站调研、执行环境实测（sharp/AVIF/Unsplash/代理）。存于 ZCodeProject/ui-redesign/。*
