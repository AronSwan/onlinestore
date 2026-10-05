# 四位大师会诊合并裁决书

> 2026-10-06 · 排版/栅格空间/交互状态/信息架构四席 · 协调席裁决
> 战役已收官（9/10），本会诊为加轮——施工面按"最小必要+最大杠杆"裁剪，P3 级多数记档不修

## 一、四席总览

| 席 | P1 | P2 | P3 | 最重发现 |
|---|---|---|---|---|
| 排版 | 7 | 8 | 5 | admin 字体孤岛（一行修）；PDP 名价倒挂；profile Arial 基线自首 |
| 栅格 | 4 | 5 | 5 | 三套容器制度轴线跳 80px；PDP 无 footer 悬崖；login 768 偏右 32px 实事故 |
| 交互 | 4 | 10 | 4 | 假模态焦点外泄；搜索死钮（与 IA 双席共中）；四种 toast 物种 |
| IA | 3 | 5 | 8 | 搜索 5/7 页死钮（双席共中）；回跳参数双重死；PDP 无收藏 |

**双席共中（最高置信）**：搜索死钮——IA+交互独立实锤同根因（toggleSearch 只绑 index）。

## 二、施工裁决（按文件域分五批，P1 全修+P2 精选）

### 批一：全站装置可信度（IA+交互共中域）
- **搜索钮全站化**：toggleSearch 逻辑移入 site-header.js（全站单一源已就位）——五页死钮变活钮；短期方案（跳 index 展开搜索）被否——site-header 本就是正确落点
- **心愿单回跳参数统一**：profile-manager 发 `login.html?returnUrl=/profile.html%23wishlist`（相对+锚编码）；全站参数名统一 returnUrl
- **PDP 补收藏心形**：ATC 旁同契约钮（wishlist.js 存储就绪）；PDP 加载 wishlist.js
- **假模态焦点三件套**：show()→closeBtn.focus()；Tab 圈禁（focusin 拦截）；hide()→还原 .site-cart-btn；遮罩后页面 inert
- **四种 toast 归一**：cart.js/orders.js/navigation-icons 三处私货 toast 改调 shared/toast.js；删黑硬切
- **登录菜单外点关不掉**：handleOutsideClick 选择器改 .site-user-btn（选择器腐烂第二次同根）；补 Escape
- **Escape 语义全站分发器**：购物袋/用户菜单/移动菜单/订单弹窗共用一套 ESC 关闭登记

### 批二：PDP 完善（IA+栅格+排版三席交汇）
- **PDP 接入 Tailwind 容器**（栅格 P1-1 精确修法）：1280 容器+16 内边距、轴线归 96；去 pl 32 叠边距——三套容器制度归一
- **PDP 补四栏 footer**（栅格 P1-2）：同 index/orders 款；底部 144→108 收尾档；信任行链接化对齐 cart 口径（IA P2-2）
- **PDP 名价倒挂修正**（排版 P1-6）：.pdp-name clamp 上限 2rem→1.75rem（28px 档）——名<价秩序双端成立
- **PDP 头部配置**（IA P2-1）：PAGE_CONFIG 增 product 项（navCurrent/mobileCurrent=手袋）；product.html data-page="product"——移动菜单不再错标"首页"
- **PDP 描述行宽**（排版 P2-2）：右栏 min-width 30rem 或注释改 433px 名实相符——取注释修正（不动布局）
- **PDP 信任区/社交行 tnum**：等宽数字补齐

### 批三：admin+profile 双孤岛接入（排版+栅格交汇）
- **admin.html 补 fonts.css+main.css 两行 link**（排版 P1-2，杠杆最大单笔）；body 15→16px；h1 800→700
- **profile 容器接入 1280 体系**（栅格 P2-6）：1200→1280、gap 30→32、sidebar 250→256、#f8f9fa/#333/8px 三遗留值换令牌
- **profile Arial 三段删**（排版 P1-7）：line-height normal/input/button Arial 全删，按钮并入 btn-pill；重拍基线（基线是快照不是宪法）
- **profile 侧栏补"我的订单"**（IA P2-3）：面包屑层级互证
- **admin crumb 400→600**；admin 活动按钮 Tailwind 蓝系换 ink 系（栅格备忘移交）

### 批四：字号与排印纪律（排版 P1 剩余+精选 P2）
- **h1 典范 32px/700/lh1.25/无字距**五页归一（orders 36→32/login 去 2.56px 字距/returns 30→32/admin 28→32；index hero 升 h1 或每页保一个 h1——profile"个人中心"升 h1）
- **caps 层 600 补漏**：site-nav a 500→600/.site-tools-back 500→600/admin crumb 400→600
- **等宽数字铺满**：orders 单价/总计行/bento 卡价/A 卡价统一 font-variant-numeric: tabular-nums；"总计："行拆两 span（中文 0.75em 视觉对齐）
- **中文 pill 移动端 13px 底线**：orders.css:884 移动档 --text-xs→--text-small+横滑；login tab 12→13
- **html 根字体统一**：main.css html 补 font-family var(--font-body)（product/admin 两页 Times New Roman 兜底）
- **行宽三舒适区扩散**：ln≥2 正文块 →leading-relaxed（featured-desc/cell-desc/footer 导语三起手）
- **品牌故事分栏 fr 化**（栅格 P1-4）：45%_55% → minmax(0,45fr)_minmax(0,55fr)（gap 溢出自愈）；图片 clamp(480px,52vw,560px) 右轴闭合
- **login 768 偏右事故**（栅格 P1-3 实事故必修）：margin-inline:0 width:auto；三档 padding 落令牌删两处 ！important
- **中文标签去 uppercase**：nav/login 标签/PDP dt/admin th——拉丁 caps 保留 uppercase+tracking；中文微标签去 uppercase、tracking 收 0.02em
- **步进器触控 44px**：面板内 ±/×/关闭 (hover:none) 下扩 hit area
- **:active 按下态铺底**：结算/清空/步进/移除/关闭/头部工具/orders 操作钮统一 scale(0.98) 入组件基类
- **步进器 999/减到 0 边界**：+ 钮 disabled+行内提示"一件最多带 9 只"；− 到 1 给"再按即移除"轻提示
- **步进器增量更新**：innerHTML 重建改按 sku 增量（或既有项去动画类）——全列表重播入场动画消灭
- **orders 搜索无果独立空态**："没找到含'xxx'的订单"+清空按钮（不再指责用户记忆）
- **导航下划线 0.4→0.2s+scaleX**（性能+一致）
- **hero 文本配重**：object-position 上移 8%（或标题上提 64px）——右上无对偶修正（视觉走查后定）

### 批五：词汇表与死代码（IA 精选）
- **术语表十行入 voice-sheet 附录**：手袋（唯一品类词）/购物袋（图标 aria 同步改）/心头好（功能唯一名，商品 tags 过滤功能词）/个人中心（全站唯一）——一物一名
- **PDP kicker 过滤功能词**：tags 含"心头好"不渲染进 kicker（类目位只留类目词）
- **footer"退换政策"死文本→活链接**（同名词"退换与售后"）；删"敬请期待"行
- **_header-template.html 废弃**（词汇污染源：女士/男士/配饰+心愿单旧词）；navigation.js 死代码同批清
- **returns 回程 history.back()**；hero CTA"先随便逛逛"→"听听品牌故事"（词与目标对齐）
- **orders mock 日期+词汇**：全角冒号"总计："；profile title"购物网站"→品牌口径
- **login 副标"登录您的 Reich 账户"补空格**（中西混排）

## 三、记档不修（P3 级+工程席留案）

URL slug 化/最近看过/index h2 语义（升 h1 已修其半）/BC 500 未用/admin tags 表头/hero 副标 15.2 归档/PDP 名称链接 tabindex/1024 容器过渡档（需动 Tailwind config，下批）/orders 圆角 16→12（有争议记档）/returns 三轴线（h1 居中方案记档）/375 六连卡密度（4:5 移动图幅记档下批——涉品牌图幅比需用户裁决）/easing 家族清死库存（buttons.css 已标废弃；luxury-components 下批）/hero CTA 已改词则 object-position 并入。

## 四、验收标准（施工后走双盲审精简编制）

审美+工程各一席：搜索钮七页活体/焦点三件套键盘走查/toast 四物种归一验证/admin 字体加载/fonts.check/h1 五页一致性抽测/容器轴线三页族实测 96/名价秩序双端/触控 44 抽测/术语表 grep（心头好唯一性）/步进器边界态/全部 P1 逐条复核。
