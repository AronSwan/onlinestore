# REICH 第四轮整改 · 施工蓝图 v1.0（规划席原稿）

> 本文为专家组规划席产出的完整施工蓝图（v1.1 终审定案为其增量修订——两处分歧终裁+香港挂位+遗漏处置；模块划分/依赖/验收/风险以本文为准）
> 输入：docs/round4-review-reports.md（六席汇编）+ docs/buyers-verdict.md + docs/quality-charter.md

## 〇、六项未决裁决（施工不再讨论；v1.1 修订处以 ※ 标注）

① 对比度：佛伦萨数字胜出（v1.1 补：分析席复现三家，米兰 gamma 编码错误，ink-soft 6.00 已过 AA 调深否决；三新值 #B93A54/#8A6508/#146B57 采纳，tokens.css:23 假注释必修）
② fly-to-cart：`clamp(240ms, d/1.6px/ms, 400ms)`，`--dur-flight: 0.4s`（v1.1 补：脉冲从 onfinish 解耦为 itemAdded 即刻触发）
③ PDP 版式：7:5 图左 sticky/价格 32px/米兰层级序（价格紧邻规格）
④ B7 与 A1：双轨并行（v1.1 补：先"一图入模"尖峰再批六张；PDP 视觉签收在 B7 落地后）
⑤ cart.js：不拆批，M2→M3 同席串行（先结构后行为）
⑥ 社会证明：featured 卡双数（v1.1 终裁为分位置合璧：featured 双数/普通卡无/PDP 双数/零值态/实时禁硬编码/views 不上）

## 一、模块划分（M0-M8）

### M0 基础层（一切前置，0.5d）
令牌三新色+档位注释+formatPrice（js/shared/format-price.js 新建：整数直出 ¥299 非整两位）+--dur-flight+orders 焦点环统一 blush-ink。文件：tokens.css/js/shared/format-price.js/orders.css。~70 LOC。出口：tokens 合入+formatPrice 单测绿+build 抽查 blush-ink=#B93A54+**假注释修正**+**ink-faint 全仓点位判定表**（v1.1 遗漏处置 3）。

### M1 图片批处理（离线轨，1.0d）
scripts/reprocess-product-images.mjs（sharp）：统一棚向暖米/纯白系（product-2/5 暗调违宪）；旗舰 ≤120KB 或 WebP q82（product-2 134KB/product-5 168KB 超标）；原图备份 originals/（dist 排除）；dry-run 先行。产物 12 文件+CREDITS 追记。**v1.1：先一图入模尖峰**。出口：KB 对照表+三灯光归一+**LCP 复测**。

### M2 购物袋面板重构（cart.js 第一刀，2.0d）
C5 勾选砍除+列序 [缩略 72px][名称两行][价格行][步进器][×]+qty>1 单行"¥259 × 2 = ¥518"（Condensed 600 15px）+h3"购物袋"+两步内联清空确认（3s 还原不用 confirm）+底部左"共 N 件 · ¥518"（productQuantity 求和）右结算独占+B5 三处 toFixed→formatPrice+B6 信任行"含运费 · 30 天可退"（链 returns.html）+C28 qty=1 单价一次+C24 消解（16px 落真实类名）。文件：cart.js（−120/+180）/cart.css（−150/+120）。出口：验收 7 条（含冻结契约五 API 实测+旧 localStorage selected 字段兼容）。

### M3 加购反馈系统（cart.js 第二刀，2.0d）
B1 全部：fly-to-cart（js/shared/fly-to-cart.js 新：克隆 .card-fig img 64×85/FLIP getBoundingClientRect/WAAPI 三帧弧线中点外抬 36px/scale 1→0.25/尾 30% 透明/同钮 cancel 跨钮并行/clamp(240,d/1.6,400)）+toast 双选（js/shared/toast.js 新：≥5s+hover 暂停/"去结算"=打开面板/"继续逛"文字钮；落点脉冲后 120ms）+**合并路径补发 itemAdded{merged:true}**（罗马 P1-1 生死线）+**脉冲解耦 itemAdded 即刻**（v1.1）+cart.js:591 去 showCart() 自动开+统一反馈语系（B9/C6 复用同组件）。**v1.1 竞态补**：clone z-index 低于 --z-toast；toast 队列最多 2 条旧的让位。出口：同款二次加购 toast 实测/reduced-motion 跳飞只脉冲/步进器不触发加购 toast。

### M4 首页卡片面（home-products.js+bento.css 一次开膛，2.0d）
A1 入口：双锚不包卡（figure 绝对定位拉伸链接 aria-label=品名+h3 内联链接，href=product.html?id={id8}）+bag 钮补 stopPropagation+**心形拆雷**（删 data-add-to-cart/sku/name/price/pic 五件只留 data-product-id——罗马 P1-2 唯一窗口）+冻结契约头注改写+B7-CSS 半（桌面 cell-fig clamp(240px,46%,300px)/移动 <639 竖版图上文下全宽/featured-fig clamp(380px,52%,480px) ≥50%）+社会证明行（featured 双数/N 人的心头好 · M 只已去新家/0 值隐藏→v1.1 改"来做第一个心动的人"）+品质行（cell：材质·工艺 ink-soft 12px 禁 faint）+B12（btn-bag 15px/100% blush-soft 实底/新 blush-ink 字）+C6 心形 16px 实心化+hero accent 真波浪或 blush-ink 整体化+"两色可选"文案（v1.1 香港挂位）。出口：六卡可点入+bag/心形连点互不误触×3+图宽实测+build 视觉 diff。

### M5 PDP 商品详情页（A1 主体，2.5d）
product.html/product.css/product.js 全新：桌面 7:5 图左 sticky/移动单列+吸底 ATC 48px/主图 4:5 不压/层级 kicker→H1 clamp(1.5,2.2vw,2rem)/700→**价格 32px Condensed 600 全站最大数字**→规格 dl 三行（label caps 12 ink-soft/value 14 ink/1px 分隔/禁卡中卡/>3 键容错）→描述 15px ink-soft 32em→ATC ink pill 15px/600/48px→信任行 12px ink-soft。数据：GET /api/products?limit=6 客户端查找（零后端路由）；三路异常（id 非法/缺参/API 断）落页内诚实空态"这只包可能先走一步了"+返回链接（不伪 404）。滚动回位：scrollRestoration auto 基线+sessionStorage stash 兜底（快照+scrollY）。ATC 复用 [data-add-to-cart] 全套（fly 源=PDP 主图）；PDP 不自动跳结算。print 样式表。**v1.1：og:image/Product schema 同步延伸（修 OG 假域名窗口）；PDP 信任区双数"已去新家 N · M 人收藏"实时取数**。出口：排印断言/回位双验/404 三路/禁忌核验/product.css ≤8KB gz。

### M6 头部与心愿单域（1.5d）
B4 心愿单闭环：site-header.js 心形 href→profile.html+profile 页"我的心头好"区块（localStorage 渲染可移除）+wishlist.js 孤儿模态删（98-168 行）+C6 aria"心头好"+B8 汉堡 280px 截断修+≥1024 桌面撤汉堡+菜单文案+订阅/收藏/移动菜单文案品牌声音（"记在小本本上了"等）+C12 圆点 offset 2px。出口：闭环走查（心形→profile→收藏在册可移除）+四页头部回归+反馈语系统一实测。

### M7 诚实与细节包（2.0d）
B2+B10 同刀：搜索卡复用 .reich-product-card 结构（escapeHtml/图名可点入 PDP）+五星删+0 评价"首批上架，来做第一个"；B3 1920 删除（index meta+品牌故事段+全站 grep 零命中）；B9 订阅处理器（preventDefault+校验+localStorage+统一 toast"收到，偶尔见。"+"每月一封"具体化）；B11 季节 2025→2026（index 8 处+orders 版权）；B12 login title 同步换词+注册占位去安检腔；B13 returns.html 静态成文（30 天可退/运费口径/演示注明）两入口（footer+信任行）。**v1.1 香港挂位：凯莉→"湖蓝锁扣手提包"改名链四处同步（seed/DB/fallback/搜索 mock）+新名过词表闸联测；搜索空态"没找到这只——它可能还在路上。"+推荐词两枚；orders mock 日期线对齐序号**。出口：搜索三态回归+grep 清单（1920/2025/★ 零命中）+returns 可达+改名全链一致。

### M8 视觉清扫包（1.5d）
C1 orders.css @supports 恒真金块+IE11 块同葬（**bento.css:41 真检测留勿伤**）；C2 暗色五处（orders:1190/login:613/cart:646/enhanced-responsive:225/visibility-optimization:126）+.dark-mode-visible 同清；C3 扫光删；orders hover translateY 残留；**金全家福四种记法扫描零命中**（#d4af37/212,175,55/184,148,31/rgba/渐变/映射名）；C7 细节（跑马灯字距/社媒死链换纯文本/OG 假域名摘除/密码政策放宽品牌化/Tab 首焦点 skip-link）；C4 兜底审计（ink-faint 正文清零核验+blush-ink ≤14px 禁用核验）。出口：金扫描零命中+暗色零残留+bento:41 在+skip-link 四页。

## 二、依赖图（硬依赖五条）
M0→一切改 CSS 模块；M2→M3（同文件先结构后行为）；M3→M5（PDP 反馈同语言）；M5→M4（卡片链接要有落点）；M5→M7（搜索卡点入 PDP）。M1 与代码零交集随时并行。**M1 完成是 M4/M5 视觉验收前置**。

## 三、施工编制（v1.1 定案：双席变体）
**A 席关键链**：M0→M2→M3→M5→M4；**B 席**：M1→M8→（等 A 席 M3 完）M6→M7。tokens.css M0 后冻结。每模块出口条件满足才进下一模块。

## 四、风险表（施工 checklist）
cart.js 冻结契约五 API（[data-add-to-cart] 委托/.reich-product-card 兜底/showCart from navigation-icons/pulseCartBadge/徽章选择器组）逐项实测；勾选砍除前 grep getSelectedTotalPrice 等调用方收口；图片 originals 备份+dry-run；心形拆雷后连点实测；WAAPI 只动 transform/opacity 合成层；site-header 四页回归；搜索重构不动检索逻辑；删除前逐块截图留证。
