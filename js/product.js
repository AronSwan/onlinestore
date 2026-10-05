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

  function specsDl(specs) {
    var keys = specs && typeof specs === 'object' ? Object.keys(specs) : [];
    if (!keys.length) return ''; // 容错：无规格不渲染空表（禁卡中卡）
    var rows = keys.map(function (k) {
      return '<div class="pdp-spec-row"><dt>' + escapeHtml(k) + '</dt><dd>' +
        escapeHtml(String(specs[k] == null ? '' : specs[k])) + '</dd></div>';
    }).join('');
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
    var atc = inStock
      ? atcButton(p, 'btn-pill pdp-atc', '加入购物袋')
      : '<button type="button" class="btn-pill pdp-atc" disabled>暂时没货了</button>';
    var stickyAtc = inStock
      ? atcButton(p, 'btn-pill pdp-atc-bar-btn', '加入购物袋')
      : '<button type="button" class="btn-pill pdp-atc-bar-btn" disabled>暂时没货了</button>';

    return (
      '<nav class="pdp-breadcrumb" aria-label="面包屑">' +
      '<a href="index.html#featured-collections">手袋</a><span aria-hidden="true">/</span>' +
      '<span class="pdp-breadcrumb-current">' + name + '</span></nav>' +
      '<div class="pdp-layout">' +
      '<figure class="pdp-main">' +
      '<img class="reich-product-image" src="' + escapeHtml(String(p.mainImage || '/images/default-product.png')) + '"' +
      ' alt="Reich ' + name + '" width="800" height="1000" decoding="async" itemprop="image">' +
      '</figure>' +
      '<div class="pdp-info">' +
      '<p class="pdp-kicker">' + kicker + '</p>' +
      '<h1 class="pdp-name">' + name + '</h1>' +
      '<p class="pdp-price">' + formatPrice(p.price) + '</p>' +
      specsDl(p.specifications) +
      '<p class="pdp-desc">' + escapeHtml(String(p.description || '')) + '</p>' +
      /* 批一(3)：ATC 与收藏心形同行（主行动+轻收藏，48px 同高） */
      '<div class="pdp-actions">' + atc + heartButton(p, name) + '</div>' +
      '<div class="pdp-trust">' +
      '<p class="pdp-trust-social">' + escapeHtml(socialLine(p)) + '</p>' +
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
    setMeta('name', 'description', desc + '——规格、材质、五金一目了然。');
    setMeta('property', 'og:title', name + ' — Reich');
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', url);
    setMeta('property', 'twitter:title', name + ' — Reich');
    setMeta('property', 'twitter:image', image);

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
    // PDP 页头购物袋钮开面板（index 页此绑定在 home-page.js；PDP 自绑同语义——
    // cartManager 未就绪时轮询 100ms×10，超时回首页，与 navigation-icons 同策略）
    var cartBtn = document.querySelector('.site-tools [data-cart-icon], .site-cart-btn');
    if (cartBtn) {
      cartBtn.addEventListener('click', function () {
        if (window.cartManager && typeof window.cartManager.showCart === 'function') {
          window.cartManager.showCart();
          return;
        }
        var tries = 0;
        var t = setInterval(function () {
          tries++;
          if (window.cartManager && typeof window.cartManager.showCart === 'function') {
            clearInterval(t);
            window.cartManager.showCart();
          } else if (tries >= 10) {
            clearInterval(t);
          }
        }, 100);
      });
    }

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
      })
      .catch(function (err) {
        render(emptyHtml('API 不可用：' + (err && err.message ? err.message : err)));
      });
  });
})();
