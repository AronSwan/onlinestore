# F3 · Tailwind 本地构建切换手册（F4 摘 CDN 执行日的操作序）

> 2026-10-04 · 构建链筹备席落盘。前置阅读：docs/modernization-discussion.md v1.1 §1.2/§1.3 的 F3/F4 行。
> **本文档落盘时点：构建链已备好、验证通过，但四页 HTML 一行未动——页面仍在用 CDN。**
> 执行本文档的前提：F1（清幽灵变量）与 F2（断点/令牌对齐）已完成清债。

## 0. 本次（筹备期）已落盘的东西

| 文件 | 状态 | 内容 |
|---|---|---|
| `tailwind.config.js` | 新建 | content 四页+js/、safelist（出处清单见附录 A）、theme 零漂移区+tokens 桥接、darkMode:'media'（全站零 dark: 类） |
| `postcss.config.js` | 改写 | postcss-import → tailwindcss（指令探测版）→ preset-env → autoprefixer → cssnano，顺序注释在文件头 |
| `vite.config.js` | 修改 | rollupOptions.input 从 index 单页扩为四页 MPA（main/login/orders/profile）；dev proxy /api→3777 未动；outDir 仍为 dist |
| `package.json` | +3 devDeps | tailwindcss ^3.4.19（**刻意 v3 不 v4**：CDN 是 v3 行为，零漂移第一）、postcss-import ^17、autoprefixer ^10 |
| `package-lock.json` | 随装更新 | — |

Dry-run 证据（2026-10-04，产物已删未提交）：`npx vite build --outDir %TEMP%\f3-dryrun\dist` 四页全部产出（index 37.6KB / orders 26KB / login 24.6KB / profile，✓ built in 28.58s）；Tailwind CLI 用同 config 生成 CSS 抽查：`.text-4xl` ✓（HTML 静态类）、`.text-\[var\(--candy-blush-ink\)\]` ✓（任意值类）、`.text-orange-600` ✓（**仅存在于 login-utils.js:582 变量插值，证明 safelist 生效**）、`.z-\[9999\]` ✓、preflight（`*,::before,::after` box-sizing）✓、`.text-primary{color:var(--brand-black)}` 与 CDN 内联 config 输出逐字一致 ✓。

## 1. 切换日操作序（按序执行，每步可独立 commit/回滚）

### 步骤 0：前置自检（5 分钟）
```bash
git status                          # 工作区干净，F1/F2 已合入
npx vite build                      # 四页全绿（本手册筹备期已验证基线）
grep -rn "dark:" index.html orders.html login.html profile.html js/   # 应零命中
grep -n "brand-gold\|brand-black\|brand-red" css/tokens.css           # 坑 1 依赖检查
```

### 步骤 1：新建构建入口 CSS（css/tailwind.css）
```css
@tailwind base;        /* 见坑 2：CDN 默认注入 preflight，跳过 base = 视觉漂移 */
@tailwind components;
@tailwind utilities;

@layer utilities {     /* CDN 页 <style type="text/tailwindcss"> 的三个自定义类的家 */
  .content-auto { content-visibility: auto; }
  .text-shadow { text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1); }
  .transition-custom { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
}
```
> 用量出处：content-auto（index/orders 各 1 处）、text-shadow（index 2 / orders 2）、
> transition-custom（index 1 / orders 1）。**不搬进 config 的 plugins**——保持与 CDN 源码同形，便于 diff。
> 不要在此文件 `@import './tokens.css'`：四页 HTML 已 `<link>` tokens.css，重复引入改变层叠顺序。

### 步骤 2：逐页替换（一页一 commit，顺序 index → orders → login → profile）
每页做三件事，**位置保持原样**（原 CDN `<script>` 在所有 `<link>` 之后，新的 `<link>` 也放同一行位，层叠顺序不变）：
1. 删 `<script src="https://cdn.tailwindcss.com"></script>`；
2. 删内联 `tailwind.config = {...}` 的 `<script>` 块（index.html:78-95 / orders.html:67-83；**login.html 无内联 config，只有裸 CDN script**）；
3. 删 `<style type="text/tailwindcss">` 整块（index/orders 各 1 块；类已迁入步骤 1 的入口 CSS）；
4. 原位替换为 `<link rel="stylesheet" href="/assets/css/tailwind-*.css">`（vite build 产物，哈希名）。
   - 若走构建产物：`npx vite build` 后从 dist/assets/css/ 取 tailwind css 文件名填入；
   - login 页同时做 CSP 收紧（见步骤 3）。

### 步骤 3：login.html CSP 收紧（摘 CDN 的直接红利）
login.html:11 现行 CSP：
```
default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;
```
改为（删 cdn.tailwindcss.com 域授权；'unsafe-inline' 暂留——内联 tailwind.config 没了但仍有其他内联 script/style，收尽是 F4 头部归一的事）：
```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;
```

### 步骤 4：profile 页（可选，F4 正戏）
profile 完全不用 Tailwind，本次不链入口 CSS。纳入体系留给 F4（头部归一时统一处理）。

### 步骤 5：回归清单（每页跑完）
- [ ] Playwright 双端（desktop+mobile viewport）截图 diff：**目标零像素差**（F5/F6 若已落地则用新基线）
- [ ] console 零错误（重点：无 `tailwind is not defined`——内联 config 删干净、无残留 `tailwind.config` 引用）
- [ ] 交互回归（动态类实战，见附录 A）：
  - [ ] login：登录/注册 tab 切换（text-primary/border-b-2 激活态）、密码强度条五色（bg-red-500→bg-gray-200）、表单校验红框（border-red-500）
  - [ ] index：搜索框聚焦环（focus:ring-[var(--gold-standard)]）、搜索建议浮层（z-10 hidden 切换）、心愿单模态（z-[9999]）
  - [ ] orders：订单详情开/关（hidden）、toast 三色（bg-green/red/blue-500）、分页隐藏
  - [ ] 全站：导航用户菜单（navigation-icons.js:77 动态创建的 w-48 菜单）、购物车浮层（visible）
- [ ] Network 面板：cdn.tailwindcss.com 零请求；本地 css 200
- [ ] `grep -rn "cdn.tailwindcss.com" *.html` 零命中（含 dns-prefetch/preconnect 两行 hints，一并删）

## 2. 本次筹备期踩到的坑（切换日前必读）

1. **内联 config 的颜色引用链在 F1 的枪口上**：零漂移区逐字镜像了 CDN 内联 config——`primary:var(--brand-black)`、`secondary:var(--brand-gold)`、`accent:var(--brand-red)`。这三个是 tokens.css 的**兼容映射**（→ink/ink/candy-blush-ink，现存于 tokens.css:143 一带）。F1 若删除兼容映射，CDN 页当场变色、本地构建同样断链。**等值替换预案**（tailwind.config.js 同步改）：
   `primary:'var(--ink)'`、`secondary:'var(--ink)'`、`accent:'var(--candy-blush-ink)'`。
   切换日步骤 0 的 grep 就是在查这条。
2. **preflight 不能跳**：Play CDN 默认注入 preflight（margin 归零、border-style:solid 等）。入口 CSS 只写 `@tailwind utilities` 会让所有页突然长出浏览器默认 margin——大面积"漂移"。必须 `@tailwind base`。而 base × 3,689 行 main.css 的层叠冲突就是施工图标注的 +1d 黑坑：冲突排期预留，症状是元素 margin/border 突变，逐条用浏览器 computed style 对比 CDN 版页面定位。
3. **幽灵变量被"忠实"编译**：`js/product-search/enhanced-search-component.js:122,130` 的 `text-[var(--gray-400)]`——F1 席 2026-10-04 已在 tokens.css 补 `--gray-400: var(--ink-faint)`（#9CA3AF），切换日将编译出真实的弱化灰而非"失效即继承"，与 CDN 期渲染相比是**恢复设计意图**（图标更淡了），回归时别误判为构建 bug。同类：`--gold-standard`（enhanced-search-component.js:110 在用）现存于 tokens.css:138，若 F1 后续清理它同理。
4. **safelist 不是给手写类用的**：JS 动态 toggle 的类里混着大量**手写 CSS 类**（fade-in/active/show/is-valid/ripple 等，附录 B）。Tailwind 对未知类名不生成规则、safelist 也无济于事——它们由 main.css/组件 CSS 提供，与摘不摘 CDN 无关。切换日别把它们误诊为"Tailwind 丢了类"。
5. **Vite 会把 `<style type="text/tailwindcss">` 抽成 CSS 走 PostCSS 管线**（html-proxy&inline-css）。接入 tailwind 插件后，这种块里的 `@layer utilities` 因无 `@tailwind` 指令直接炸构建（实测报错见 postcss.config.js 头注释）。已用「指令探测」包装解决：无 Tailwind 指令的 CSS 零介入。**副作用**：若未来某 CSS 只用 `@apply` 不写 `@tailwind`（如独立组件 css），指令探测会放行——`@apply` 在探测名单里，没问题；但**纯 `@layer` 写法不会触发** Tailwind，保持现状透传。切换日步骤 2 删掉 text/tailwindcss 块后，此包装退化为纯保险丝。
6. **darkMode 写法**：v3.4 里 `darkMode:false` 是废弃别名（构建打 warning，行为同 media）。已写 `'media'` + 全站 grep 证实零 `dark:` 类。若未来有人写 `dark:` 类会静默生成 media-query 变体——建议 CI 加 grep 门禁（config 注释里有现成命令）。
7. **vite 对非 module 的 `<script src>` 只警告不打包**：四页有大量无 `type="module"` 的 script（login.html:345-349、profile.html:17-18 等），vite build 会打 "can't be bundled without type=module" 警告并原样拷贝。这是**现状**（筹备期之前也如此），不是本次引入；路径是根相对的所以 dist 里能用。头部归一（F4）时顺手加 type="module" 即可消警。
8. **safelist 与 content 的双保险关系**：js/ 已在 content 里，扫描器本可扫到 classList.add("...") 的字面量；safelist 真正的战场是**变量插值拼类名**（login-utils.js:590 的 `${strengthColor}`、navigation-icons.js:246 的三元、orders.js:904 的 toast）与**未来重构挪走字面量**的静默丢失。清单见附录 A，新增动态类时同步补。
9. **postcss.config.js 改动后必须重启 dev server（实战已踩，2026-10-04）**：postcss 配置不在 vite HMR 范围。本次接入 tailwind 插件后，运行中的 5173 仍按旧配置执行，把 index.html 内联 `text/tailwindcss` 块抽成 html-proxy CSS 后插件无条件运行，**全站 500**（报错 `@layer utilities is used but no matching @tailwind utilities directive`）。指令探测包装写入磁盘也救不了运行中的进程——改 postcss/插件链配置后，`netstat -ano | grep :5173` 找 PID、taskkill、重启 vite，再验 curl 200。
10. **零合并代价（P1-3 层叠修复的实测账，双盲审 Y1/Y2 量测 2026-10-05，补记）**：a5a3bc8 的 manualChunks 把每个源 CSS 钉进独立 chunk（取消跨页共享合并）+ restoreStylesheetOrder 重排回源序，修掉 login 生产构建 +124px 层叠反转。代价两席独立实测同量级：**每页 CSS 请求 +3~9 个**（共享 chunk 拆散后各页各自全量链入）、**页面 CSS 传输量 gzip +9.8%（绝对值 +1.0-3.3KB/页）**。判定：可接受——换来的是层叠契约（源序）在产物中显式可读、单页 CSS 变更不再跨页联动；若未来要回收这部分，方向是按页生成"页内合并、页间独立"的 CSS 入口（保留源序拼接），不是回退共享 chunk。

## 3. 附录 A · safelist 出处清单（tailwind.config.js 同步维护）

> 行号为 2026-10-04 快照。「变量插值」标记 = 扫描器覆盖不了、safelist 唯一防线。

| 类 | 出处（文件:行） |
|---|---|
| `text-primary` / `border-b-2` / `border-primary` | js/auth.js:45,47,64,66 |
| `text-gray-500` | js/auth.js:46,48,65,67 |
| `opacity-0` | js/auth.js:572,575 |
| `border-red-500` | js/auth.js:342,362 |
| `text-red-500` `text-xs` `mt-1` | js/auth.js:346（className）|
| `fixed` `top-4` `left-1/2` `transform` `-translate-x-1/2` `bg-green-50` `text-green-700` `px-6` `py-3` `rounded-lg` `shadow-lg` `z-50` `flex` `items-center` | js/auth.js:558（className，成功提示条）|
| `hidden`（最高频动态类） | js/auth.js:51,52,70,71,568,574；js/login-utils.js:211,212,222,223,551,599；js/navigation-icons.js:108（toggle）；js/orders.js:280,289,480,484,549,725,853-881；js/product-search/enhanced-search-component.js:153,158 |
| `justify-between` | js/login-utils.js:66 |
| `ml-4` `text-white` `hover:text-gray-200` | js/login-utils.js:74 |
| `flex-1` `h-1` `rounded` | js/login-utils.js:555（密码强度条）|
| `text-red-600` `text-orange-600` `text-yellow-600` `text-green-600` | js/login-utils.js:578-589 **变量插值**（`${strengthColor}`）|
| `bg-red-500` `bg-orange-500` `bg-yellow-500` `bg-green-500` `bg-gray-200` | js/login-utils.js:558-567 |
| `inset-0` `bg-black` `bg-opacity-50` `justify-center` | js/email-verification.js:60,73,89；js/oauth-handler.js:103 |
| `z-[9999]` | js/wishlist.js:101（心愿单模态，任意值）|
| `absolute` `right-0` `mt-2` `w-48` `bg-white` `rounded-md` `py-1` | js/navigation-icons.js:77（用户菜单，动态创建）|
| `right-4` | js/navigation-icons.js:246 |
| `bg-green-500` `bg-red-500` | js/navigation-icons.js:247-248 **变量插值**（三元）|
| `top-24` `translate-x-full` `transition-transform` `duration-300` | js/orders.js:904（toast）|
| `bg-blue-500` | js/orders.js:912 |
| `visible` | js/cart.js:602,613（cart-overlay.visible 是 cart.css 手写规则，同名工具类兜底）|
| `relative` | js/product-search/enhanced-search-component.js:102 |
| `w-full` `py-3` `pl-12` `pr-4` `border` `rounded-none` `text-lg` `focus:outline-none` `focus:ring-2` `focus:ring-opacity-20` | enhanced-search-component.js:110 |
| `border-[var(--border-default)]` `focus:border-[var(--candy-blush-ink)]` `focus:ring-[var(--gold-standard)]` | enhanced-search-component.js:110（任意值）|
| `left-4` `top-1/2` `-translate-y-1/2` | enhanced-search-component.js:122,130 |
| `p-1` | enhanced-search-component.js:130 |
| `text-[var(--gray-400)]` | enhanced-search-component.js:122,130 ⚠ 幽灵变量（坑 3）|
| `hover:text-[var(--text-primary)]` | enhanced-search-component.js:130 |
| `top-full` `left-0` `right-0` `mt-1` `z-10` | enhanced-search-component.js:153,158 |
| `mt-4` | enhanced-search-component.js:163,168 |

## 4. 附录 B · 动态 toggle 中的手写 CSS 类（不进 safelist，与 Tailwind 无关）

| 类 | 出处 | 定义所在 |
|---|---|---|
| `fade-in` | js/auth.js:55,57,74,76,588 | 手写 CSS/动画 |
| `active` `hover` | js/navigation.js:65-128；js/main.js:71-298（activeClass/hoverClass 配置）；js/wishlist.js:24,40,48；js/orders.js:742-744；js/login-utils.js:209-223；js/login-enhanced.js:119-142 | 手写 CSS |
| `hover-active` | js/main.js:21（config.hoverClass）| 手写 CSS |
| `show` | js/login-utils.js:95,99；js/wishlist.js:94；js/touch-optimization.js:664,668 | 手写 CSS |
| `is-valid` `is-invalid` `is-hidden` | js/login-utils.js:190,194,415-440；js/login-enhanced.js:236,315-343 | login.css 等 |
| `updated` | js/cart.js:82,83 | cart.css |
| `btn-loading` `captcha-image` `notification notification-*` | js/login-utils.js:10,63,106,109 | login.css |
| `oauth-callback-loading` `oauth-spinner` `oauth-overlay` | js/login-utils.js:134,137；js/oauth-handler.js:103 | login.css |
| `touch-active` `touch-feedback` `touch-optimized` `mobile-device` `desktop-device` `ripple` `ripple-effect` `touch-gesture-hint` | js/touch-optimization.js 全文件 | touch-optimization.css |
| `site-cart-badge` `cart-overlay` `cart-toast-notification` | js/cart.js:468,735,748 | cart.css |
| `wishlist-toast` `strength-bar` `password-strength` `email-verification-notice` `valid-feedback` `error-message` `success-message` `product-card` 等组件类 | grep 见各文件 | 组件 CSS |

## 5. 验收口径（与 modernization-discussion.md §1.3 对齐）

- 摘 CDN 后四页渲染与 CDN 版**像素一致**（F5/F6/F7 已落地部分用各自新基线）
- console 零错、`tailwind` 全局零引用
- login CSP 不再授权 cdn.tailwindcss.com
- JS 冻结契约（80 id + 30 类 + 动态 Tailwind 类）零改动
- 每页独立 commit，可单页回滚
