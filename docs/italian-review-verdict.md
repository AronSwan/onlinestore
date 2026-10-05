# 意大利三席美学审查 · 协调席裁决书

> 2026-10-05 · 米兰视觉总监/佛罗伦萨手工艺人/罗马陈列师三席报告合并裁决
> 原则：尊重品牌意志（糖果宪法/voice-sheet）；专家冲突按宪法与先例仲裁；功能 bug 级发现优先

## 一、功能 bug 级（四项，立即修）

| # | 来源 | 问题 | 裁决 |
|---|---|---|---|
| B1 | 罗马#1 | **购物车面板商品名 URL 编码乱码**（encodeURIComponent 进 data 属性，解码写在永不触发的兜底分支——"修错了房间"） | **采纳**：getProductDataFromElement 主路径 return 前统一 try{decodeURIComponent}catch{}；alt 同步；五轮工程盲审未中（只测计数不测文本） |
| B2 | 佛罗伦萨#1 | **login 焦点环整页断裂**（.form-input{outline:none}+remember-me 残留红色调试环） | **采纳**：删 outline:none 改 :focus-visible 用令牌环；删 323-331 调试块 |
| B3 | 罗马#6 | 面板"已选 1 件"计数说谎（按行数非件数） | **采纳**：selectedItems 改 productQuantity 求和 |
| B4 | 罗马#3 | 加购静默（主成交动作无反馈，收藏反而有 toast） | **采纳（改法取其自提的替代方案）**：加购后**购物车面板自动打开**（复用 showCart）——"面板即是确认"（拿起来放进臂弯的数字等价），toast 省；badge 重触发脉冲 |

## 二、三方/双席共中（最高置信，全部采纳）

| # | 来源 | 内容 |
|---|---|---|
| C1 | 米#5+佛#2 | **login 页全面换季**：2px→radius-md/sm 三档归位；300 细体→600；tab 去 uppercase；斜体 placeholder→正体 --ink-faint；提交钮并入 btn-pill 形制；0.4s→dur-fast；**金幽灵 rgba(212,175,55,×) 四处清除**（P0 删金的漏网字面量） |
| C2 | 米#6+佛#6 | **价格锁 Barlow Condensed**（--font-numeric 零消费、已付成本上车）：reich-product-price/cart-item-price/cart-total/orders 金额统一 font-family:var(--font-numeric) 600；字号 +1-2px 补偿窄身 |
| C3 | 佛#4+罗#10+米#8 | **CTA 层级归位**：结算钮 radius-pill+纯 ink 底+0.2s 色彩互换（删渐变/translateY/8px）；中文 pill 13px/600 起（11px 只留全英文大写标签）；hero 主 pill 13px/高≥48px/内边距 0.85rem 2.25rem |
| C4 | 米#9+佛#5 | **orders 状态色归籍**：五状态全部从令牌派生（pending→warning/processing→ink-soft/shipped→mint-ink/delivered→success/cancelled→error），细描边淡底 color-mix 式；卡头金渐变改纯白；hover 收敛 border-color blush；删 translateX |
| C5 | 米#10+佛#7 | 订阅带输入框 rounded-none→radius-md |
| C6 | 佛#3 | 排印事故：featured-name 38px 与区块 h2 36px 拉开一档（featured 收 2rem=32px） |
| C7 | 米#1 | **底色宪法落地**：index/orders body 的 cream-luxury 删除回落白（米色是旧世界遗物，品牌故事 band 从此有对比）；hero 渐变终点白 |
| C8 | 米#4 | header 与 container 错位 48px：水平 padding 调至与 container 会合（四页同步） |
| C9 | 米#3 | bento 首行小卡被拉伸（卡内 200px 空白）：align-items:start+cell-meta 改 margin-top:12px（或首行竖版，实施席选一并说明） |
| C10 | 米#7 | 徽章三色轮转归一：状态徽章统一 blush-soft 底；玩笑徽章（心头好）改 ink 描边白底；mint 退门面只留订阅带、sun 只留跑马灯（宪法"sun/mint 仅营销区块"的严格执行） |
| C11 | 罗#5 | **假门收敛**：主导航"女士/男士/配饰"→"手袋（锚点）/品牌故事（锚点）/订单"；移动菜单补"首页"；footer 客户服务四项按诚实原则处理 |
| C12 | 罗#4 | 回头官认脸：登录态头像 aria-label"我的账户"+candy blush 小圆点（一枚足矣） |
| C13 | 罗#7 | 清空选中降权：移面板头部文字链（hover blush-ink），底部结算独占 |
| C14 | 罗#8 | 注册理由文案（voice 定调原句采纳）："注册后：订单随时看，袋子换设备也不丢。（邮箱就干这个，不发别的。）" |
| C15 | 米#13 | 购物车数量徽章警示红→candy-blush 底白字（红只留售罄） |
| C16 | 米#11 | REICH 字标字距 0.18em/字重 600（header+footer 同治） |
| C17 | 米#12 | 品牌故事正文 max-width:30em（图列顺势 55%） |
| C18 | 米#14 | hero 汉字标题 tracking-tight 删除（负字距是拉丁规矩） |
| C19 | 佛#8 | login.css 全局 a{} 收窄为 .login-card a+动画可逆化 |
| C20 | 佛#11 | 表单聚焦三重奏：删 translateY；保 outline 删 shadow 双环 |
| C21 | 佛#12 | orders 过滤钮 pill 化 13px/600；50% 徽章→radius-sm 4px |
| C22 | 佛#9 | caps 微标签层字重统一 600 |
| C23 | 米#15(部分) | --space-section 令牌启用（三区块 padding-block）+订阅带×0.75 收一档；轴线统一（左轴）记 P3 下批 |
| C24 | 罗#13 | 面板勾选框给足 16px 可见样式与"已选 N 件"挂钩（半个 UI 不说半句话） |
| C25 | 罗#12 | login 占位文案："请输入有效的邮箱地址用于登录"→占位"邮箱"，help 移错误态 |
| C26 | 佛#13/14/15/17/18 | 小修五件：brand-story 图 8→12px；hero 副标 20px 归档（锁 18 或升 24）；login 残金 SVG 删；cart badge 10→11px；移动端 .btn-pill 补 (hover:none) min-height 44px |
| C27 | 佛#16 | buttons.css 死库存：文件头三行大注"已废弃勿引用"（保守处置，不物理删——等死代码清理批） |
| C28 | 罗#11 | 面板行信息冗余：Reich 行删除；qty=1 时单价一次（小计仅 qty>1） |

## 三、专家冲突仲裁（一件）

**孤儿卡（米兰#2"模板站破绽，推荐营销格收口" vs 设计席乙 M3 拍板①"留空是 bento 不对称美学"）**：
裁决：**维持设计席乙留空裁决**。理由：①先例在案（M3 任务书采纳的几何论证——跨 3 列横条图瘦成条、填充格违"商品区白底"宪法边界模糊）；②零成本零风险 vs 引入商品区内首个营销格的宪法边界争议；③罗马人也未列此为高转化项。米兰③"看看全部"营销格记入**下一期候选**（与详情页/品类页一起权衡）。

## 四、记档不修（下一期建议清单）

罗马陈列师下一期五项（详情页 quick view/心愿单落地页/组合陈列/真实结算流/搜索整合）+米兰轴线统一+米兰孤儿卡③——全部记入 docs/modernization-discussion.md 下一期候选节（收官时更新）。

## 五、实施与验收

- 实施席照本裁决 1+2 节清单施工（B1-B4 优先），纪律：每处改动能映射到裁决编号；冻结契约不动（除 B1 的解码属行为修复）；品牌宪法条款为上位法
- 完工后双盲审验收（审美维度+工程维度各一席）
