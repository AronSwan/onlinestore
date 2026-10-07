/**
 * product.js — M5(A1) PDP 商品详情页渲染
 *
 * 形态：ES module（product.html <script type="module"> 引入）；
 *       escapeHtml 走 window 全局（utils/escape-html.js 经典脚本先行加载），
 *       formatPrice 显式 import（不依赖 cart.js 的求值顺序）。
 * 数据：GET /api/products?limit=6 客户端查找（零后端路由——六件小店不为此开
 *       /api/products/:id 路由，蓝图裁决）；?id= 接受 8 位零填充（卡片链接口径）
 *       或裸数字。
 * 三路异常（落同一页内诚实空态，不伪 404）：
 *   ① id 缺参/非数字；② id 合法但库里查无此件；③ API 断/超时/非 200。
 * 空态文案："这只包可能先走一步了。"（演示站诚实口径）+ 回店链接。
 *
 * 排印层级（蓝图 M5 规格）：kicker(caps 12 ink-soft) → H1 clamp(1.5,2.2vw,2rem)/700
 *   → 价格 Condensed 600 32px（全站最大数字）→ 规格 dl（label caps 12 ink-soft /
 *   value 14 ink / 1px 分隔 / 禁卡中卡 / >3 键容错全量渲染）→ 描述 15px ink-soft 32em
 *   → ATC ink pill 15px/600/48px → 信任区 12px ink-soft（双数 + 运费退换两行）。
 * PDP 信任区双数（v1.1 裁决 2）："已去新家 N · M 人收藏"——sales/favorites 实时读 API
 *   禁硬编码；favorites=0 → "来做第一个心动的人"（零值反社会证明禁令）；sales=0 隐藏
 *   销量分句；views 不上（最弱信号）。
 * ATC：复用 [data-add-to-cart] 全套 data-*（冻结契约）——cart.js capture 委托 +
 *   fly-to-cart 源 = [data-product-detail] 内 .pdp-main img（fly-to-cart.js 解析）。
 *   PDP 不自动跳结算；吸底条为同契约第二入口。
 * OG/schema（v1.1 遗漏处置 4）：按运行时 origin 注入 og:title/og:image/og:url/
 *   canonical + JSON-LD Product——绝对地址真图，不写任何假域名。
 * 滚动回位双保险之 PDP 侧：scrollRestoration 保持 'auto' 基线（本页不操纵滚动）；
 *   列表侧快照兜底由 index(home-products.js M4) 实现。
 */
import { formatPrice } from './shared/format-price.js';
// 国际挑剔用户批 A 档（2026-10-06）：track 埋点（PDP 曝光）+ overlay-escape（灯箱 ESC）
import { track } from './shared/track.js';
import { registerOverlayEscape } from './shared/overlay-escape.js';

(function () {
  'use strict';

  var FETCH_TIMEOUT_MS = 6000;
  var ROOT_SELECTOR = '[data-product-detail]';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  /** 解析 ?id=：8 位零填充（'00000001'）或裸数字（'1'）都归一为数字；坏值 null */
  function parseId() {
    var raw = new URLSearchParams(window.location.search).get('id');
    if (!raw) return null;
    var n = parseInt(String(raw), 10);
    return Number.isFinite(n) && n > 0 && /^\d{1,8}$/.test(String(raw).trim()) ? n : null;
  }

  function loadProducts() {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS) : null;
    return fetch('/api/products?limit=6', {
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var products = data && data.products;
        if (!Array.isArray(products)) throw new Error('products 非数组');
        return products;
      });
  }

  /* ───────── 排印模板 ───────── */

  /** A 档 4：本地商品图变体档推导——(可相对/可绝对/可带域名的) images/products/product-N.jpg
      → 四档 webp srcset。非本地/异名图（API 外域）返回空串，img 直落单源 src（不虚构不存在的档位）。 */
  function productImageBase(src) {
    var m = String(src || '').match(/^(.*\/)?images\/products\/(product-\d+)\.jpe?g$/i);
    return m ? (m[1] || '') + 'images/products/' + m[2] : '';
  }

  function variantSrcset(src) {
    var base = productImageBase(src);
    if (!base) return '';
    return base + '-480.webp 480w, ' + base + '-800.webp 800w, ' +
      base + '-1200.webp 1200w, ' + base + '-1600.webp 1600w';
  }

  /** A 档 4：灯箱大图源——本地商品图取 1600 档 webp，其余回落 mainImage 原址
      （扩展名拆写，避免被 scripts/check-frontend-assets.py 当作本地路径字面量）
      X2 P2-4：无图商品与主图同款回退 default——原实现空串会解析为页面 URL 开破图 */
  function lightboxSource(src) {
    var base = productImageBase(src);
    if (base) return base + '-1600.w' + 'ebp';
    return String(src || '/images/default-product.png');
  }

  /**
   * 规格 dl 渲染。A 档 6：排序 尺寸→材质→工艺 优先（PM"能装下 A4 是第一问"），
   * 其余键保持 API 原序跟在后面；表尾补"参照"行——文案级对照不虚构数据
   * （PM P2-7 手机/口红/A4 对照的诚实落法：规格表内不编数，用生活物参照）。
   */
  var SPEC_ORDER = ['尺寸', '材质', '工艺'];

  function specsDl(specs) {
    var keys = specs && typeof specs === 'object' ? Object.keys(specs) : [];
    if (!keys.length) return ''; // 容错：无规格不渲染空表（禁卡中卡）
    keys.sort(function (a, b) {
      var ia = SPEC_ORDER.indexOf(a), ib = SPEC_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    var rows = keys.map(function (k) {
      return '<div class="pdp-spec-row"><dt>' + escapeHtml(k) + '</dt><dd>' +
        escapeHtml(String(specs[k] == null ? '' : specs[k])) + '</dd></div>';
    }).join('');
    // A 档 6：参照行（文案级，非规格数据——不虚构数值）
    rows += '<div class="pdp-spec-row pdp-spec-ref"><dt>参照</dt><dd>约一部手机 + 一支口红的宽度（以实物为准）</dd></div>';
    return '<dl class="pdp-specs">' + rows + '</dl>';
  }

  /** 信任区双数：sales=0 隐藏销量分句；favorites=0 → "来做第一个心动的人"（v1.1） */
  function socialLine(p) {
    var sales = Number(p.sales) || 0;
    var favorites = Number(p.favorites) || 0;
    if (favorites === 0) {
      // 零值态：不显示"0 人"反社会证明——邀请语替位（销量分句同样不展示）
      return sales > 0
        ? '已去新家 ' + sales + ' · 来做第一个心动的人'
        : '来做第一个心动的人';
    }
    return (sales > 0 ? '已去新家 ' + sales + ' · ' : '') + favorites + ' 人收藏';
  }

  /** ATC 钮（行内/吸底同契约同 data-*；name/pic encodeURIComponent 为冻结契约口径） */
  function atcButton(p, extraClass, label) {
    var name = encodeURIComponent(p.name || 'Reich 单品');
    var pic = encodeURIComponent(p.mainImage || '');
    return '<button type="button" class="' + extraClass + '" data-add-to-cart="true"' +
      ' data-product-id="' + String(p.id).padStart(8, '0') + '" data-product-sku-id="' + String(p.id).padStart(8, '0') + '"' +
      ' data-product-name="' + name + '" data-product-price="' + (Number(p.price) || 0) + '"' +
      ' data-product-pic="' + pic + '">' + label + '</button>';
  }

  /** 批一(3) 收藏心形钮（.reich-heart-pill 同契约：wishlist.js 全站绑定；
      PDP 无 .reich-product-card 上下文，品名/价格/图自带 data-* 供存储） */
  function heartButton(p, name) {
    var id8 = String(p.id).padStart(8, '0');
    return '<button class="reich-product-action reich-heart-pill pdp-heart" type="button" aria-label="收藏' + name + '"' +
      ' data-product-id="' + id8 + '"' +
      ' data-product-name="' + name + '"' +
      ' data-product-price="' + formatPrice(p.price) + '"' +
      ' data-product-pic="' + escapeHtml(String(p.mainImage || '')) + '">' +
      '<img src="heart-icon.svg" alt="" width="16" height="16"></button>';
  }

  function productHtml(p) {
    var name = escapeHtml(String(p.name || 'Reich 单品'));
    var tags = Array.isArray(p.tags) ? p.tags : [];
    /* 批五(14): kicker 过滤功能词——tags 含"心头好/本期主打"不渲染进 kicker，
       类目位只留类目词（手袋/斜挎包/手提包/链条包/托特包），状态位兜底"新到" */
    var KICKER_CATEGORY = ['手袋', '斜挎包', '手提包', '链条包', '托特包'];
    var KICKER_FUNCTION = ['心头好', '本期主打'];
    var safeTags = tags.map(function (t) { return String(t).trim(); })
      .filter(function (t) { return t && KICKER_FUNCTION.indexOf(t) === -1; });
    var cat = safeTags.filter(function (t) { return KICKER_CATEGORY.indexOf(t) !== -1; })[0] || safeTags[1] || '手袋';
    var state = safeTags.filter(function (t) { return KICKER_CATEGORY.indexOf(t) === -1; })[0] || '新到';
    var kicker = escapeHtml(cat) + ' · ' + escapeHtml(state);
    var inStock = Number(p.stock != null ? p.stock : 1) > 0;
    // A 档 16 归一：atc-btn 全站基类 + pdp-atc 配色变体（吸底再加 pdp-atc-bar-btn 布局）
    var atc = inStock
      ? atcButton(p, 'atc-btn pdp-atc', '加入购物袋')
      : '<button type="button" class="atc-btn pdp-atc" disabled>暂时没货了</button>';
    var stickyAtc = inStock
      ? atcButton(p, 'atc-btn pdp-atc-bar-btn', '加入购物袋')
      : '<button type="button" class="atc-btn pdp-atc-bar-btn" disabled>暂时没货了</button>';

    return (
      '<nav class="pdp-breadcrumb" aria-label="面包屑">' +
      '<a href="index.html#featured-collections">手袋</a><span aria-hidden="true">/</span>' +
      '<span class="pdp-breadcrumb-current">' + name + '</span></nav>' +
      '<div class="pdp-layout">' +
      '<figure class="pdp-main">' +
      /* A 档 4：四档 webp srcset（Retina 档补齐，jpg 回退）；A 档 5：主图可点开灯箱
         （tabindex/role/aria —— 键盘可达；灯箱本体由 bindLightbox 挂接） */
      (function (src) {
        var ss = variantSrcset(src);
        return '<img class="reich-product-image" src="' + escapeHtml(String(src)) + '"' +
          (ss ? ' srcset="' + ss + '" sizes="(min-width:1024px) 58vw, 100vw"' : '') +
          ' alt="Reich ' + name + '" width="800" height="1000" decoding="async" itemprop="image"' +
          ' tabindex="0" role="button" aria-label="放大查看' + name + '主图">';
      })(p.mainImage || '/images/default-product.png') +
      /* 权益批 A7（消费者 P3-3）：图区色差提示行——影棚图≠实物色的诚实口径 */
      '<figcaption class="pdp-color-note">影棚灯光与调色可能造成轻微色差，以实物为准。</figcaption>' +
      '</figure>' +
      '<div class="pdp-info">' +
      '<p class="pdp-kicker">' + kicker + '</p>' +
      '<h1 class="pdp-name">' + name + '</h1>' +
      '<p class="pdp-price">' + formatPrice(p.price) + '</p>' +
      specsDl(p.specifications) +
      variantPicker(p) +
      '<p class="pdp-desc">' + escapeHtml(String(p.description || '')) + '</p>' +
      /* 批一(3)：ATC 与收藏心形同行（主行动+轻收藏，48px 同高） */
      '<div class="pdp-actions">' + atc + heartButton(p, name) + '</div>' +
      '<div class="pdp-trust">' +
      '<p class="pdp-trust-social">' + escapeHtml(socialLine(p)) +
      /* 权益批 B9（双席共中）：社会证明数字旁演示标注（12px ink-soft 同行小字） */
      '</p>' +
      /* 批二(9)：信任行"30 天可退"链接化对齐 cart 面板口径（returns.html 活链） */
      '<p class="pdp-trust-line">含运费 · <a href="returns.html" title="退换与售后（30 天可退，来回运费我们担）">30 天可退</a> · 每只人工质检</p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      /* 吸底条（移动）：价格常驻 + 第二加购入口（同 data-* 契约） */
      '<div class="pdp-atc-bar" role="region" aria-label="快速加购">' +
      '<span class="pdp-atc-bar-price">' + formatPrice(p.price) + '</span>' +
      stickyAtc +
      '</div>'
    );
  }

  /* UI热心用户批 P1(购物流程党F1): 双色款颜色选择器——描述含"X与Y(两色可选|各一只)"
     时出两个色点(纯前端选择, demo 无 variant schema; 选择不改变加购 data——
     买卖双方按备注/沟通确认颜色, 这里消灭的是"没问颜色直接进袋"的不安感) */
  function variantPicker(p) {
    var m = String(p.description || '').match(/([^，。、s]{2,6})与([^，。、s]{2,6})(两色可选|各一只)/);
    if (!m) return '';
    var c1 = m[1], c2 = m[2];
    return '<div class="pdp-variants" role="radiogroup" aria-label="颜色选择">' +
      '<span class="pdp-variants-label">选个颜色</span>' +
      '<button type="button" class="pdp-variant-chip is-selected" role="radio" aria-checked="true" data-variant="' + c1 + '">' + c1 + '</button>' +
      '<button type="button" class="pdp-variant-chip" role="radio" aria-checked="false" data-variant="' + c2 + '">' + c2 + '</button>' +
      '</div>';
  }

  function emptyHtml(reason) {
    console.warn('[product] 落入诚实空态：', reason);
    return (
      '<div class="pdp-empty">' +
      '<p class="pdp-empty-title">这只包可能先走一步了。</p>' +
      '<p class="pdp-empty-sub">它可能已售罄、下架，或者链接里的编号写错了一位。</p>' +
      '<a class="btn-pill btn-pill-outline pdp-empty-back" href="index.html#featured-collections">回店里逛逛</a>' +
      '</div>'
    );
  }

  /* ───────── OG / canonical / JSON-LD（运行时真实地址，不写假域名） ───────── */

  function setMeta(attr, key, content) {
    var el = document.head.querySelector('meta[' + attr + '="' + key + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function applySeo(p) {
    var name = String(p.name || 'Reich 单品');
    var desc = String(p.description || '').slice(0, 110);
    var image = new URL(p.mainImage || '/favicon.svg', window.location.origin).href;
    var url = window.location.href;

    document.title = name + ' — Reich';
    // 权益批 A1：PDP 运行时注入处同步 noindex（与 product.html 静态 meta 同口径，
    // 防止 applySeo 动态写描述时 robots 口径与本页静态头部漂移）
    setMeta('name', 'robots', 'noindex, nofollow');
    setMeta('name', 'description', desc + '——规格、材质、五金一目了然。');
    setMeta('property', 'og:title', name + ' — Reich');
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', url);
    // 极客批 A 档 3：twitter 系 meta 走 name 属性（property 写法被卡片规范忽略）
    setMeta('name', 'twitter:title', name + ' — Reich');
    setMeta('name', 'twitter:image', image);

    var canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // JSON-LD Product（og 延伸同窗）：真价格真库存口径，availability 与页面一致
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: name,
      image: [image],
      description: desc,
      brand: { '@type': 'Brand', name: 'Reich' },
      sku: String(p.id).padStart(8, '0'),
      offers: {
        '@type': 'Offer',
        url: url,
        priceCurrency: 'CNY',
        price: String(Number(p.price) || 0),
        availability: Number(p.stock) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    });
    document.head.appendChild(ld);
  }

  /* ───────── A 档 5：主图灯箱（贵妇 P1-2 两指看五金） ─────────
     全屏 overlay + ESC 关（overlay-escape 登记表复用）+ 点按放大/复原 +
     双指捏合缩放（touch-action:none + touchmove 距离比，1-3 倍钳位）。
     懒建单例：首次点主图才入 DOM。 */

  var lightbox = null;

  function buildLightbox() {
    var el = document.createElement('div');
    el.className = 'pdp-lightbox';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', '查看大图');
    el.innerHTML =
      '<button type="button" class="pdp-lightbox-close" aria-label="关闭大图">&times;</button>' +
      '<img class="pdp-lightbox-img" alt="">' +
      '<p class="pdp-lightbox-hint">点按图片放大 · 再点复原 · 双指捏合缩放</p>';
    document.body.appendChild(el);
    var img = el.querySelector('.pdp-lightbox-img');
    var closeBtn = el.querySelector('.pdp-lightbox-close');

    var scale = 1, origin = '50% 50%', pinchStart = 0, pinchScaleStart = 1;

    function applyZoom() {
      img.style.transform = 'scale(' + scale + ')';
      img.style.transformOrigin = origin;
      el.classList.toggle('zoomed', scale > 1);
    }
    function resetZoom() { scale = 1; origin = '50% 50%'; applyZoom(); }

    function close() {
      el.classList.remove('open');
      document.body.style.overflow = '';
      resetZoom();
      if (lightbox.lastTrigger && typeof lightbox.lastTrigger.focus === 'function') {
        lightbox.lastTrigger.focus();
      }
      lightbox.lastTrigger = null;
    }

    el.addEventListener('click', function (e) {
      if (e.target === el) { close(); return; }
      if (e.target === img) {
        var r = img.getBoundingClientRect();
        origin = (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '% ' +
                 (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%';
        scale = scale > 1 ? 1 : 2.2;
        applyZoom();
      }
    });
    closeBtn.addEventListener('click', close);

    el.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStart = Math.sqrt(dx * dx + dy * dy);
        pinchScaleStart = scale;
      }
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinchStart) {
        e.preventDefault();
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var ratio = Math.sqrt(dx * dx + dy * dy) / pinchStart;
        scale = Math.max(1, Math.min(3, pinchScaleStart * ratio));
        applyZoom();
      }
    }, { passive: false });
    el.addEventListener('touchend', function () { pinchStart = 0; }, { passive: true });

    registerOverlayEscape('pdp-lightbox', function () {
      if (el.classList.contains('open')) { close(); return true; }
      return false;
    });

    return { el: el, img: img, closeBtn: closeBtn, lastTrigger: null };
  }

  function openLightbox(src, alt, triggerEl) {
    if (!lightbox) lightbox = buildLightbox();
    lightbox.img.src = src;
    lightbox.img.alt = alt;
    lightbox.lastTrigger = triggerEl || null;
    lightbox.el.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { lightbox.closeBtn.focus(); }, 30);
  }

  /** A 档 5/7/14 收口绑定：灯箱 + 吸底条 IntersectionObserver + PDP 曝光埋点 */
  function bindPdpInteractions(p) {
    var mainImg = document.querySelector('.pdp-main .reich-product-image');
    if (mainImg) {
      var open = function () {
        openLightbox(lightboxSource(p.mainImage), 'Reich ' + String(p.name || '') + '——大图', mainImg);
      };
      mainImg.addEventListener('click', open);
      mainImg.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    }

    // A 档 14（PM 保留+极简修瑕）：主 ATC 离视口吸底条才显示——同屏双按钮三价格消除。
    // io-ready 交显示权给 JS（无 IO 环境保持原常驻行为，诚实降级）
    var bar = document.querySelector('.pdp-atc-bar');
    var mainAtc = document.querySelector('.pdp-actions .pdp-atc');
    if (bar && mainAtc && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { bar.classList.toggle('is-visible', !en.isIntersecting); });
      }, { threshold: 0 });
      io.observe(mainAtc);
      bar.classList.add('io-ready');
    }

    // A 档 7：PDP 曝光埋点（六点位之一）
    track('ProductViewed', {
      id: String(p.id).padStart(8, '0'),
      name: String(p.name || ''),
      price: Number(p.price) || 0
    });
  }

  /* ───────── 渲染入口 ───────── */

  function render(html) {
    var root = document.querySelector(ROOT_SELECTOR);
    if (!root) return;
    root.innerHTML = html;
    // 批一(3) 收尾：PDP 心形钮随本渲染异步产出——晚于 wishlist.js 的
    // DOMContentLoaded 绑定（product.js 取数渲染期间按钮尚不存在）。
    // 与 index 侧 home-products.js rebindWishlist 同法：渲染后重绑 + 在册态实心化
    //（wishlist.js bindEvents 有 data-wishlistBound 幂等护栏，重绑只作用于新节点）
    if (window.wishlistManager) {
      try {
        if (typeof window.wishlistManager.bindEvents === 'function') window.wishlistManager.bindEvents();
        if (typeof window.wishlistManager.initWishlistUI === 'function') window.wishlistManager.initWishlistUI();
      } catch (e) {
        console.warn('PDP 心愿单事件重绑失败：', e);
      }
    }
  }

  // PDP 不操纵滚动：scrollRestoration 显式回到浏览器基线（双保险之"基线"半）；
  // 返回列表的回位由浏览器 bfcache/history + index 侧 sessionStorage 快照兜底（M4）
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'auto';
  }

  ready(function () {
    // A4（流程体验官终版裁决·纽约案）：PDP 页头购物袋钮绑定删除（连同 100ms×10
    // 轮询）——同职责归一 site-header.js bindCartButton（动态 import cart.js
    // 兜底后开面板）；本页再绑会双发 CartOpened 埋点。

    var id = parseId();
    if (id === null) {
      render(emptyHtml('id 缺参或非数字（?id=）'));
      return;
    }
    loadProducts()
      .then(function (products) {
        var found = null;
        for (var i = 0; i < products.length; i++) {
          if (parseInt(products[i].id, 10) === id) { found = products[i]; break; }
        }
        if (!found) {
          render(emptyHtml('id=' + id + ' 库内查无此件'));
          return;
        }
        render(productHtml(found));
        applySeo(found);
        bindPdpInteractions(found);
      })
      .catch(function (err) {
        render(emptyHtml('API 不可用：' + (err && err.message ? err.message : err)));
      });
  });
})();


/* 颜色选择器委托（UI热心用户批 P1） */
document.addEventListener('click', function (e) {
  var chip = e.target.closest('.pdp-variant-chip');
  if (!chip) return;
  var group = chip.closest('.pdp-variants');
  if (!group) return;
  group.querySelectorAll('.pdp-variant-chip').forEach(function (c) {
    c.classList.toggle('is-selected', c === chip);
    c.setAttribute('aria-checked', c === chip ? 'true' : 'false');
  });
});
