/**
 * F3 · Tailwind 本地构建配置（docs/modernization-discussion.md v1.1 §1.3 F3 行）
 *
 * 设计原则：**类行为零漂移第一**。
 * 本配置以三页 CDN（cdn.tailwindcss.com，Play CDN v3 行为）为基准：
 * - 「零漂移区」的 colors.primary/secondary/accent/dark 与 fontFamily.sans/serif
 *   逐字对齐 index.html:79 / orders.html:67 的内联 tailwind.config（含 var() 引用原文）。
 * - 其余 theme.extend 键全部是**新增键**，不覆盖 Tailwind 默认档位的任何现有名
 *   （覆盖 rounded-md/text-md 等默认档 = 改变存量页面已渲染类 = 漂移，禁止）。
 * - 依赖 tokens.css（css/tokens.css 为唯一令牌源）；下方桥接的变量名均在其中真实存在。
 *   兼容名（--brand-black/--brand-gold/--brand-red）仅出现在零漂移区——那是 CDN 页面
 *   现行行为的原文，F1 若删除这些兼容映射，须同步替换（见 docs/f3-build-switch-plan.md 坑 1）。
 *
 * 注意：本配置落盘 ≠ 切换。页面仍在用 CDN；切换日操作序见
 * docs/f3-build-switch-plan.md（等 F1/F2 清债完成后执行）。
 */

/** @type {import('tailwindcss').Config} */
export default {
  // 站点不做暗色模式（§1.1 反趋势清单：糖果色系只在白底成立）。
  // v3.4 里 darkMode:false 是 media 的废弃别名（构建会打 warning），故显式写 media：
  // dark: 变体只在被使用时才生成——已 grep 四页+js/，全站零个 dark: 类，本项对输出零影响。
  // 防回归：若有人写 dark: 类，CI 里加 `grep -rn "dark:" index.html orders.html login.html profile.html js/` 门禁。
  darkMode: 'media',

  // content 只圈四页 + js/。js/ 必须进 content：三页的 JS 里有大量
  // className 赋值字符串（innerHTML 模板、模板字面量），CDN 时代靠运行时
  // MutationObserver 兜住，本地构建只能靠扫描源码文本。
  content: [
    './index.html',
    './login.html',
    './orders.html',
    './profile.html', // F4：profile 已纳入入口 CSS 管线（头部归一后与四页同链）
    './admin.html', // F3 纳入：admin 页为纯 CSS 内嵌（零 Tailwind 类），圈入扫描
    './returns.html', // M7·B13 退换政策页（skip-link/tailwind 工具类同四页口径）
    //   仅为统一 content 口径——贡献为空，防未来加类时静默丢失
    './product.html', // 批二(8) 2026-10-06 PDP 接入 tailwind-entry.css（大师会诊栅格 P1-1）
    //   ——仅补 content 扫描口径（该页与六页同源）；theme 零改动
    './privacy.html', // 权益批 A3：隐私政策页（skip-link/tailwind 工具类同 returns 页口径）
    './js/**/*.js',
  ],

  // safelist：JS 动态 toggle 的类。content 虽已含 js/（扫描器按源码全文取词，
  // classList.add("...") 的字符串字面量本可被扫到），但以下三类情况扫描器覆盖不了，
  // 故显式兜底：
  //   a) 模板字面量插值拼出的类名（如 `${strengthColor}`，类名本体在 switch/case 分支里）；
  //   b) 未来重构把字面量挪走/改名时的静默丢失（构建期无报错）；
  //   c) 任意值类含 `(` `[` 等字符时部分提取器的边界情况。
  // 每条注明出处（文件:行号，行号为 2026-10-04 快照）。非 Tailwind 的手写 CSS 类
  // （fade-in/active/is-valid 等）不进 safelist——Tailwind 对未知类名不生成任何规则，
  // 它们由 main.css/组件 CSS 提供，与 Tailwind 构建无关（清单见 switch-plan 附录 B）。
  safelist: [
    // ---- js/auth.js（login.html 加载）----
    'text-primary', // auth.js:45,47,64,66 classList.add/remove（登录/注册 tab 激活态）
    'border-b-2', // auth.js:45,47,64,66
    'border-primary', // auth.js:45,47,64,66
    'text-gray-500', // auth.js:46,48,65,67
    'opacity-0', // auth.js:572,575（提示条淡出）
    'border-red-500', // auth.js:342,362（表单校验红框）
    'text-red-500', 'text-xs', 'mt-1', // auth.js:346 className（错误提示）
    'fixed', 'top-4', 'left-1/2', 'transform', '-translate-x-1/2',
    'bg-green-50', 'text-green-700', 'px-6', 'py-3', 'rounded-lg',
    'shadow-lg', 'z-50', 'flex', 'items-center', // auth.js:558 className（成功提示条）
    'hidden', // auth.js:51,52,70,71,568,574 + login-utils.js:211,212,222,223,551,599
    //          + login-enhanced.js 间接 + navigation-icons.js:108 + orders.js:280,289,480,
    //          484,549,725,853-881 + enhanced-search-component.js:153,158（最高频动态类）

    // ---- js/login-utils.js ----
    'flex', 'items-center', 'justify-between', // :66 className
    'ml-4', 'text-white', 'hover:text-gray-200', // :74 className
    'flex-1', 'h-1', 'rounded', // :555 className（密码强度条）
    'text-xs', 'mt-1', // :590 className（强度文案）
    'text-red-600', 'text-orange-600', 'text-yellow-600', 'text-green-600', // :578-589
    //   ↑ 变量插值：strengthText.className = `text-xs mt-1 ${strengthColor}`，
    //     strengthColor 在 switch 分支赋值——扫描器看不到完整类名，safelist 主战场
    'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-gray-200', // :558-567

    // ---- js/email-verification.js :60,73,89 / js/oauth-handler.js :103 className ----
    'inset-0', 'bg-black', 'bg-opacity-50', 'justify-center', // （fixed/flex/items-center/z-50 已列）

    // ---- js/wishlist.js :101 className（心愿单模态）----
    'z-[9999]', // 任意值类：z-index 9999（fixed/inset-0/bg-black 等已列）

    // ---- js/navigation-icons.js ----
    'absolute', 'right-0', 'mt-2', 'w-48', 'bg-white', 'rounded-md', 'py-1', // :77 className（用户菜单）
    'top-4', 'right-4', 'px-6', // :246 className（通知条）
    'bg-green-500', 'bg-red-500', // :247-248 变量插值三元（success ? bg-green-500 : bg-red-500）

    // ---- js/orders.js ----
    'top-24', 'translate-x-full', 'transition-transform', 'duration-300', // :904 className（toast）
    'bg-blue-500', // :912（info toast；bg-green-500/bg-red-500/text-white 已列）

    // ---- js/cart.js ----
    'visible', // :602,613 classList.add/remove。cart-overlay.visible 是 cart.css 手写规则
    //   （display:flex），但 Tailwind 同名工具类（visibility:visible）一并兜底防歧义。

    // ---- js/product-search/enhanced-search-component.js ----
    'relative', // :102
    'w-full', 'py-3', 'pl-12', 'pr-4', 'border', 'rounded-none', 'text-lg', // :110
    'focus:outline-none', 'focus:ring-2', 'focus:ring-opacity-20', // :110
    'border-[var(--border-default)]', 'focus:border-[var(--candy-blush-ink)]',
    'focus:ring-[var(--gold-standard)]', // :110 任意值类（--gold-standard 现存于 tokens.css:138）
    'left-4', 'top-1/2', '-translate-y-1/2', // :122,130（搜索框图标/清除按钮）
    'right-4', 'p-1', // :130
    'text-[var(--gray-400)]', // :122,130 —— --gray-400 已由 F1 补定义（var(--ink-faint)），
    //   切换日将编译出真实弱化灰（恢复设计意图），非构建 bug，见 switch-plan 坑 3
    'hover:text-[var(--text-primary)]', // :130（--text-primary 真实存在）
    'top-full', 'left-0', 'right-0', 'mt-1', 'z-10', // :153,158（建议/历史浮层）
    'mt-4', // :163,168
  ],

  theme: {
    extend: {
      colors: {
        // ===== 零漂移区：与 index.html:79-95 / orders.html:67-83 内联 CDN config 逐字对齐 =====
        // class: text-primary/border-primary/secondary/accent/dark 等的生成结果与 CDN 完全一致。
        // ⚠ --brand-black/--brand-gold/--brand-red 是 tokens.css 兼容映射（→ink/ink/candy-blush-ink），
        //   F1 删除兼容映射时必须同步改这里，等值替换见 docs/f3-build-switch-plan.md 坑 1。
        primary: 'var(--brand-black)',
        secondary: 'var(--brand-gold)',
        accent: 'var(--brand-red)',
        dark: 'var(--ink)',

        // ===== tokens.css 桥接（全部新增键，存量页面零影响，供 F4+/新增样式使用）=====
        ink: {
          DEFAULT: 'var(--ink)', // #1A202C 墨蓝黑
          soft: 'var(--ink-soft)', // 辅助文字
          faint: 'var(--ink-faint)', // 弱化文字
        },
        candy: {
          blush: {
            DEFAULT: 'var(--candy-blush)', // 腮红粉主档
            soft: 'var(--candy-blush-soft)', // 淡档
            ink: 'var(--candy-blush-ink)', // 文本档 ≥4.5:1
          },
          sun: {
            DEFAULT: 'var(--candy-sun)', // 奶油黄主档（禁做白底文本）
            soft: 'var(--candy-sun-soft)', // 淡档（仅营销区块底）
          },
          mint: {
            DEFAULT: 'var(--candy-mint)', // 薄荷主档
            soft: 'var(--candy-mint-soft)', // 淡档
            ink: 'var(--candy-mint-ink)', // 文本档 ≥3:1
          },
        },
        paper: {
          DEFAULT: 'var(--bg-base)', // 页面白底
          soft: 'var(--bg-soft)', // 微暖底
        },
        line: {
          DEFAULT: 'var(--line)', // 1px 分隔线
          strong: 'var(--line-strong)',
        },
        state: {
          success: 'var(--success)',
          warning: 'var(--warning)',
          error: 'var(--error)',
          info: 'var(--info)',
        },
      },

      fontFamily: {
        // ===== 零漂移区：与内联 CDN config 逐字一致（sans/serif 是既有覆盖名）=====
        sans: ['var(--font-body)', 'Arial', 'sans-serif'],
        serif: ['var(--font-display)', 'serif'],

        // ===== tokens.css 桥接（新增键）=====
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        numeric: ['var(--font-numeric)'],
      },

      // 圆角桥接：只加新键。rounded-sm/md/lg/xl 等 Tailwind 默认档位（2/4/8/12px）
      // 被 index/orders 存量类使用，覆盖即漂移——绝不改。
      borderRadius: {
        card: 'var(--radius-md)', // 12px（设计宪法 bento 卡档）
        pill: 'var(--radius-pill)', // 999px（主 CTA）
      },

      // 阴影桥接：新键。shadow-sm/md/lg/xl 默认档同样不许覆盖。
      boxShadow: {
        soft: 'var(--shadow-sm)',
        card: 'var(--shadow-md)',
        lift: 'var(--shadow-lg)',
      },

      // 间距/字号/断点不桥接：tokens 的 --spacing-*/--text-*/断点收敛是 F2 的活，
      // 在 F2 定档前桥接只会造成第二套并存标度。
    },
  },

  // 切换日若需要 CDN 页里 <style type="text/tailwindcss"> 的三个自定义工具类
  // （.content-auto/.text-shadow/.transition-custom，index/orders 静态使用中），
  // 它们不归 config 管，由构建入口 CSS 的 @layer utilities 提供——见 switch-plan 步骤 2。
  plugins: [],
};
