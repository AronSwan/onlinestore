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
 *   3. 搜索钮全站化（大师会诊批一·IA+交互双席共中，2026-10-06）：toggleSearch
 *      逻辑自 index（home-page.js 原 21-73 行）迁入本模块；#searchBar 搜索条
 *      组件全站渲染——index 复用页内既有静态块（冻结契约不动），其余页在
 *      header 后插入同构 searchBar。增强搜索组件懒初始化：首次展开时才动态
 *      import ./product-search/enhanced-search-component.js、init 并注入两张
 *      product-search CSS（非 index 页不为搜索付首屏 JS/CSS 成本）。
 *
 * 形态（质量纲领·先进条）：ES module（页面经 <script type="module" 引入），
 *   模板字面量构建 DOM（不用字符串 '+' 拼接）。模块在文档解析完成后按
 *   文档序执行——先于页尾各 defer 模块（navigation-icons/cart 等）的
 *   DOMContentLoaded 绑定，契约时序不变。
 *   挂载：页面在头部原位放 <template data-site-header data-page="..."/>
 *   占位（template 惰性且不参与渲染，vite 捆绑后仍在 DOM），模块将其原位
 *   替换为 header；#searchBar 紧跟 header（index 原静态序），移动菜单插到
 *   searchBar 之后——DOM 顺序与原静态拷贝逐字一致。
 *   降级：JS 关闭时由页面 <noscript> 内的静态头部兜底（见各页 HTML）。
 *
 * SEO 取舍：头部经 JS 注入（演示站可接受）；各页 hero/关键文案在 <main>，
 *   不在头部，不受影响。冻结契约 id（siteHeader/mobileMenu/mobileMenuBtn/
 *   searchBtn/searchBar/cart-badge）与类（site-tools/site-burger 等）逐字保留。
 */
import { registerOverlayEscape } from './shared/overlay-escape.js';
// 国际挑剔用户批 A 档 7：SearchSubmitted 埋点（增强搜索组件 search 事件）
import { track } from './shared/track.js';

/** 主导航项（C11 裁决：假门收敛——女士/男士/配饰 → 手袋（锚点）/品牌故事（锚点）/订单） */
const NAV_ITEMS = [
  { label: '手袋', href: 'index.html#featured-collections' },
  { label: '品牌故事', href: 'index.html#brand-story' },
  { label: '订单', href: 'orders.html' },
];

/** 移动菜单项（C11 裁决：补"首页"；锚点项与主导航同源） */
const MOBILE_ITEMS = [
  { label: '首页', href: 'index.html' },
  { label: '手袋', href: 'index.html#featured-collections' },
  { label: '品牌故事', href: 'index.html#brand-story' },
  { label: '订单', href: 'orders.html' },
  { label: '登录 / 注册', href: 'login.html' },
];

/** 页级差异矩阵（逐字对齐归一前四页各自的静态拷贝）。
    批一(1) 搜索钮全站化：searchBtn 五页统一挂 aria-expanded/aria-controls
    （搜索条每页渲染，按钮不再有"死钮页"）；批二(11) PDP 增 product 项
    （navCurrent/mobileCurrent=手袋——面包屑"手袋/品名"与主导航互证）。 */
const SEARCH_BTN = { label: '打开搜索', expanded: true, controls: 'searchBar' };

const PAGE_CONFIG = {
  index: {
    navCurrent: null,              // 主导航 aria-current 所在项（null=无当前页）
    searchBtn: SEARCH_BTN,
    user: { id: 'userProfileBtn', label: '用户登录', href: 'login.html', current: false },
    back: false,                   // orders 独有：返回个人中心钮
    mobileCurrent: '首页',         // 移动菜单 aria-current 所在项
  },
  orders: {
    navCurrent: '订单',
    searchBtn: SEARCH_BTN,
    user: { id: null, label: '账户', href: 'login.html', current: false },
    back: true,
    mobileCurrent: '订单',
  },
  login: {
    navCurrent: null,
    searchBtn: SEARCH_BTN,
    user: { id: null, label: '账户', href: 'login.html', current: true },
    back: false,
    mobileCurrent: '登录 / 注册',
  },
  profile: {
    navCurrent: null,
    searchBtn: SEARCH_BTN,
    user: { id: null, label: '账户', href: 'profile.html', current: true },
    back: false,
    mobileCurrent: null,
  },
  // M7·B13: 退换政策静态页（静态成文，头部复用同一模块）
  returns: {
    navCurrent: null,
    searchBtn: SEARCH_BTN,
    user: { id: null, label: '账户', href: 'login.html', current: false },
    back: false,
    mobileCurrent: null,
  },
  // 批二(11) 大师会诊 IA P2-1：PDP 独立配置——主导航/移动菜单标"手袋"，
  // 移动菜单不再错标"首页"（原挂靠 index 配置）
  product: {
    navCurrent: '手袋',
    searchBtn: SEARCH_BTN,
    user: { id: null, label: '账户', href: 'login.html', current: false },
    back: false,
    mobileCurrent: '手袋',
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
  // C8(裁决): 头部内容收进与页面同规的 container（Tailwind .container+mx-auto+px-4），
  // 起点与主内容列逐像素会合（原 clamp(1rem,4vw,3rem) 与 container 差 48px@1440）
  const navItems = NAV_ITEMS.map(
    (item) => `      <li><a href="${item.href}"${currentAttr(cfg.navCurrent === item.label)}>${item.label}</a></li>`
  ).join('\n');
  return `
<header class="site-header" id="siteHeader">
  <div class="container mx-auto px-4 site-header-inner">
  <nav aria-label="主导航">
    <ul class="site-nav">
${navItems}
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

        <!-- 心愿单（M6·B4: href 首页→profile 页"我的心头好"区块——承诺-兑现闭环；C6(裁决): aria"心头好"） -->
        <a href="profile.html#wishlist" aria-label="心头好" class="site-wishlist-btn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.8-9.8-9.2C.6 8.8 2.5 5 6.1 5c2 0 3.4 1 4.4 2.5h3C14.5 6 15.9 5 17.9 5c3.6 0 5.5 3.8 3.9 6.8C19.5 16.2 12 21 12 21z" fill="none"/></svg>
        </a>

        <!-- 用户 -->
        <a href="${u.href}"${u.id ? ` id="${u.id}"` : ''} aria-label="${u.label}" class="site-user-btn"${currentAttr(u.current)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3.6-6 7-6s7 2 7 6"/></svg>
        </a>

        <!-- 购物袋（cart.js 绑定 data-cart-icon；批五(13): aria"购物车"→"购物袋"，术语表口径） -->
        <button type="button" data-cart-icon="true" aria-label="购物袋" class="site-cart-btn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1.5 12h-9L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
          <span class="site-cart-badge" id="cart-badge" style="display: none;">0</span>
        </button>

        <!-- 汉堡（移动端） -->
        <button type="button" class="site-burger" id="mobileMenuBtn" aria-label="菜单" aria-expanded="false" aria-controls="mobileMenu">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
  </div>
  </div>
</header>`;
}

function renderMobileMenu() {
  const items = MOBILE_ITEMS.map(
    (item) => `    <li><a href="${item.href}"${currentAttr(cfg.mobileCurrent === item.label)}>${item.label}</a></li>`
  ).join('\n');
  return `
<nav class="site-mobile-menu" id="mobileMenu" aria-label="移动导航">
  <ul>
${items}
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
  // 批一(1)：全站保证 #searchBar 紧跟 header（index 用页内既有静态块）
  ensureSearchBar(header);
  const searchBar = document.getElementById('searchBar');
  const menuFrag = range.createContextualFragment(renderMobileMenu().trim());
  // 移动菜单位置：searchBar 之后（与 index 原静态 DOM 序一致）
  (searchBar || header).after(menuFrag);

  bindBehaviors(header);
  bindSearch();
  markLoggedInUser(header);
}

/* ── 批一(1) 搜索钮全站化：搜索条渲染 + toggleSearch + 懒初始化 ── */

/** index.html 静态 searchBar 的同构拷贝（类名/结构逐字一致） */
function renderSearchBar() {
  return `
<div id="searchBar" class="hidden bg-white py-4 px-6 border-t border-[var(--border-default)]" role="search">
    <div class="container mx-auto">
        <!-- 增强搜索组件容器 -->
        <div id="enhanced-search-container"></div>
    </div>
</div>`;
}

function ensureSearchBar(header) {
  if (document.getElementById('searchBar')) return;
  if (!header) return;
  const range = document.createRange();
  const frag = range.createContextualFragment(renderSearchBar().trim());
  header.after(frag);
}

/** 增强搜索组件（懒初始化单例）与资源预取 */
let enhancedSearchComponent = null;
let searchComponentPromise = null;

function ensureSearchStyles() {
  // 非 index 页不静态链 product-search 两张 CSS——此处按需注入（幂等）
  ['css/product-search.css', 'css/product-search-enhanced.css'].forEach((href) => {
    if (document.querySelector(`link[href*="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  });
}

async function ensureSearchComponent() {
  if (enhancedSearchComponent) return enhancedSearchComponent;
  if (!searchComponentPromise) {
    ensureSearchStyles();
    searchComponentPromise = import('./product-search/enhanced-search-component.js')
      .then(async (module) => {
        const component = new module.EnhancedSearchComponent({
          containerId: 'enhanced-search-container',
          searchApiEndpoint: '/api/products/search',
          suggestionsApiEndpoint: '/api/products/suggestions',
          popularSearchesApiEndpoint: '/api/products/popular-searches',
          cacheTTL: 300000, // 5分钟缓存
          maxSuggestions: 8,
          maxPopularSearches: 10,
          maxSearchHistory: 5
        });
        await component.init();
        enhancedSearchComponent = component;
        // A 档 7：SearchSubmitted 埋点接线（六点位之一）。组件的 emit('search')
        // 无发射点（组件内仅 1200 行方法定义，performSearch 不调用），listener 路
        // 恒哑——改挂容器层双路（Enter 提交/搜索钮点击），值空不计；800ms 去重
        // 防 Enter 隐式提交与钮点击双计
        const container = document.getElementById('enhanced-search-container');
        if (container && !container.dataset.searchTrackBound) {
          container.dataset.searchTrackBound = '1';
          let lastSearchTrack = 0;
          container.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const q = e.target && e.target.value && e.target.value.trim();
            if (q) {
              if (Date.now() - lastSearchTrack < 800) return;
              lastSearchTrack = Date.now();
              track('SearchSubmitted', { query: q, via: 'enter' });
            }
          });
          container.addEventListener('click', (e) => {
            if (!e.target.closest('button')) return;
            const input = container.querySelector('input');
            const q = input && input.value && input.value.trim();
            if (q) {
              if (Date.now() - lastSearchTrack < 800) return;
              lastSearchTrack = Date.now();
              track('SearchSubmitted', { query: q, via: 'button' });
            }
          });
        }
        return component;
      })
      .catch((error) => {
        console.error('加载增强搜索组件失败:', error);
        searchComponentPromise = null; // 失败允许重试
        return null;
      });
  }
  return searchComponentPromise;
}

/** toggleSearch：自 home-page.js 原 21-73 行迁入（行为逐字保留，组件改为懒初始化） */
window.toggleSearch = async function (show) {
  const searchBtn = document.getElementById('searchBtn');
  const searchBar = document.getElementById('searchBar');

  if (!searchBtn || !searchBar) {
    console.error('搜索按钮或搜索栏元素未找到');
    return;
  }

  const isHidden = searchBar.classList.contains('hidden');
  if (show === undefined) show = isHidden;

  if (show) {
    searchBar.classList.remove('hidden');
    searchBtn.setAttribute('aria-expanded', 'true');

    // 首次展开：初始化增强搜索组件（已初始化则直接展示热门搜索）
    if (!enhancedSearchComponent) {
      await ensureSearchComponent();
    }
    if (enhancedSearchComponent) {
      try {
        await enhancedSearchComponent.showPopularSearches();
      } catch (error) {
        console.error('显示热门搜索失败:', error);
      }
    }

    setTimeout(() => {
      // 尝试通过增强搜索组件获取搜索输入框
      let searchInputElement = null;
      if (enhancedSearchComponent && enhancedSearchComponent.elements && enhancedSearchComponent.elements.searchInput) {
        searchInputElement = enhancedSearchComponent.elements.searchInput;
      } else {
        // 如果通过组件获取失败，则尝试直接通过ID获取
        searchInputElement = document.getElementById('search-input');
      }

      if (searchInputElement) {
        searchInputElement.focus();
      }
    }, 100);
  } else {
    searchBar.classList.add('hidden');
    searchBtn.setAttribute('aria-expanded', 'false');

    // 如果增强搜索组件已初始化，则隐藏热门搜索
    if (enhancedSearchComponent) {
      try {
        enhancedSearchComponent.hidePopularSearches();
      } catch (error) {
        console.error('隐藏热门搜索失败:', error);
      }
    }
  }
};

function bindSearch() {
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => window.toggleSearch());
  }

  // ESC 关闭搜索条（批一(7)：走 overlay-escape 全站分发器）
  registerOverlayEscape('search-bar', () => {
    const searchBar = document.getElementById('searchBar');
    if (searchBar && !searchBar.classList.contains('hidden')) {
      window.toggleSearch(false);
      return true;
    }
    return false;
  });
}

/** C12(裁决): 回头官认脸——登录态下用户钮 aria-label 改"我的账户"，
    叠一枚 candy blush 小圆点（一枚足矣，样式见 site-header.css .site-user-dot） */
function markLoggedInUser(header) {
  const userBtn = header?.querySelector('.site-user-btn');
  const isLoggedIn =
    localStorage.getItem('userLoggedIn') === 'true' ||
    sessionStorage.getItem('userLoggedIn') === 'true';
  if (!userBtn || !isLoggedIn) return;
  userBtn.setAttribute('aria-label', '我的账户');
  const dot = document.createElement('span');
  dot.className = 'site-user-dot';
  dot.setAttribute('aria-hidden', 'true');
  userBtn.appendChild(dot);
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

    // 批一(7)：ESC 关闭移动菜单——走 overlay-escape 全站分发器
    registerOverlayEscape('mobile-menu', () => {
      if (!mobileMenu.classList.contains('open')) return false;
      mobileMenu.classList.remove('open');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
      return true;
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
