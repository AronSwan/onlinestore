/**
 * F4 · 统一站点头部单一模块（归一四页四份分叉拷贝 + 四份行为脚本）
 *
 * 职责：
 *   1. 渲染 <header class="site-header"> 与 <nav class="site-mobile-menu">
 *      （原四页 HTML 里的静态拷贝已分叉：orders 多 .site-tools-back 返回钮、
 *      各页 aria-current 位置不同、index 的 searchBtn 带 aria-expanded/
 *      aria-controls 且用户钮有 id=userProfileBtn——全部经 PAGE_CONFIG 参数化）。
 *   2. 头部行为脚本归一：移动菜单 .open 开合 + header 滚动 .scrolled 阴影
 *      （原 index/orders 页尾内联脚本 + login/profile 独立内联块，共四份）。
 *
 * 形态（质量纲领·先进条）：ES module（页面经 <script type="module" 引入），
 *   模板字面量构建 DOM（不用字符串 '+' 拼接）。模块在文档解析完成后按
 *   文档序执行——先于页尾各 defer 模块（navigation-icons/cart 等）的
 *   DOMContentLoaded 绑定，契约时序不变。
 *   挂载：页面在头部原位放 <template data-site-header data-page="..."/>
 *   占位（template 惰性且不参与渲染，vite 捆绑后仍在 DOM），模块将其原位
 *   替换为 header；移动菜单插到 #searchBar 之后（index 页 searchBar 位于
 *   header 与菜单之间），无 searchBar 的页紧跟 header——DOM 顺序与原静态
 *   拷贝逐字一致。
 *   降级：JS 关闭时由页面 <noscript> 内的静态头部兜底（见各页 HTML）。
 *
 * SEO 取舍：头部经 JS 注入（演示站可接受）；各页 hero/关键文案在 <main>，
 *   不在头部，不受影响。冻结契约 id（siteHeader/mobileMenu/mobileMenuBtn/
 *   searchBtn/cart-badge）与类（site-tools/site-burger 等）逐字保留。
 */

/** 页级差异矩阵（逐字对齐归一前四页各自的静态拷贝） */
const PAGE_CONFIG = {
  index: {
    navCurrent: '女士',            // 主导航 aria-current 所在项（null=无当前页）
    searchBtn: { label: '打开搜索', expanded: true, controls: 'searchBar' },
    user: { id: 'userProfileBtn', label: '用户登录', href: 'login.html', current: false },
    back: false,                   // orders 独有：返回个人中心钮
    mobileCurrent: null,           // 移动菜单 aria-current 所在项
  },
  orders: {
    navCurrent: null,
    searchBtn: { label: '搜索', expanded: false, controls: null },
    user: { id: null, label: '账户', href: 'login.html', current: false },
    back: true,
    mobileCurrent: '订单',
  },
  login: {
    navCurrent: null,
    searchBtn: { label: '搜索', expanded: false, controls: null },
    user: { id: null, label: '账户', href: 'login.html', current: true },
    back: false,
    mobileCurrent: '登录 / 注册',
  },
  profile: {
    navCurrent: null,
    searchBtn: { label: '搜索', expanded: false, controls: null },
    user: { id: null, label: '账户', href: 'profile.html', current: true },
    back: false,
    mobileCurrent: null,
  },
};

// 模块内 document.currentScript 为 null——页级参数从占位元素 data-page 读取。
// 占位用 <template>（而非 script）：vite build 会合并页面多个 module script 并
// 删除原标签，script 占位会随之消失；template 是普通 DOM 元素，捆绑后仍在。
const placeholder = document.querySelector('template[data-site-header]');
const cfg = PAGE_CONFIG[placeholder?.dataset.page] || PAGE_CONFIG.index;

const currentAttr = (isCurrent) => (isCurrent ? ' aria-current="page"' : '');

function renderHeader() {
  const s = cfg.searchBtn;
  const u = cfg.user;
  return `
<header class="site-header" id="siteHeader">
  <nav aria-label="主导航">
    <ul class="site-nav">
      <li><a href="index.html"${currentAttr(cfg.navCurrent === '女士')}>女士</a></li>
      <li><a href="index.html"${currentAttr(cfg.navCurrent === '男士')}>男士</a></li>
      <li><a href="index.html"${currentAttr(cfg.navCurrent === '配饰')}>配饰</a></li>
    </ul>
  </nav>

  <a href="index.html" class="site-brand">REICH</a>

  <div class="site-tools">
${cfg.back ? `        <!-- 返回个人中心（orders 页独有，原独立返回钮 P3 并入 toolbar） -->
        <a href="profile.html" class="site-tools-back" aria-label="返回个人中心">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
          <span>个人中心</span>
        </a>

` : ''}        <!-- 搜索 -->
        <button type="button" id="searchBtn" aria-label="${s.label}"${s.expanded ? ` aria-expanded="false" aria-controls="${s.controls}"` : ''}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        </button>

        <!-- 心愿单 -->
        <a href="index.html" aria-label="心愿单" class="site-wishlist-btn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.8-9.8-9.2C.6 8.8 2.5 5 6.1 5c2 0 3.4 1 4.4 2.5h3C14.5 6 15.9 5 17.9 5c3.6 0 5.5 3.8 3.9 6.8C19.5 16.2 12 21 12 21z" fill="none"/></svg>
        </a>

        <!-- 用户 -->
        <a href="${u.href}"${u.id ? ` id="${u.id}"` : ''} aria-label="${u.label}" class="site-user-btn"${currentAttr(u.current)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3.6-6 7-6s7 2 7 6"/></svg>
        </a>

        <!-- 购物车（cart.js 绑定 data-cart-icon） -->
        <button type="button" data-cart-icon="true" aria-label="购物车" class="site-cart-btn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1.5 12h-9L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
          <span class="site-cart-badge" id="cart-badge" style="display: none;">0</span>
        </button>

        <!-- 汉堡（移动端） -->
        <button type="button" class="site-burger" id="mobileMenuBtn" aria-label="菜单" aria-expanded="false" aria-controls="mobileMenu">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
  </div>
</header>`;
}

function renderMobileMenu() {
  return `
<nav class="site-mobile-menu" id="mobileMenu" aria-label="移动导航">
  <ul>
    <li><a href="index.html"${currentAttr(cfg.mobileCurrent === '女士')}>女士</a></li>
    <li><a href="index.html"${currentAttr(cfg.mobileCurrent === '男士')}>男士</a></li>
    <li><a href="index.html"${currentAttr(cfg.mobileCurrent === '配饰')}>配饰</a></li>
    <li><a href="orders.html"${currentAttr(cfg.mobileCurrent === '订单')}>订单</a></li>
    <li><a href="login.html"${currentAttr(cfg.mobileCurrent === '登录 / 注册')}>登录 / 注册</a></li>
  </ul>
</nav>`;
}

function mount() {
  if (!placeholder) return;

  const range = document.createRange();
  range.selectNode(placeholder);
  const headerFrag = range.createContextualFragment(renderHeader().trim());
  placeholder.replaceWith(headerFrag);

  const header = document.getElementById('siteHeader');
  // 移动菜单位置：index 页在 #searchBar 之后（原 DOM 序），其余页紧跟 header
  const searchBar = document.getElementById('searchBar');
  const anchor = searchBar && searchBar.previousElementSibling === header ? searchBar : header;
  const menuFrag = range.createContextualFragment(renderMobileMenu().trim());
  anchor.after(menuFrag);

  bindBehaviors(header);
}

/** 行为归一（原四页四份：mobileMenu 开合 + scrolled 阴影） */
function bindBehaviors(header) {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  if (header) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          header.classList.toggle('scrolled', window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
}

mount();
