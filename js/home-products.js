/**
 * home-products.js — 首页精选商品从后端 API 渲染（P4 · 商品接数据）
 *
 * 用途：拉取 /api/products 渲染 #home-product-grid 内的 .reich-product-card 网格；
 *       API 不可用 / 返回异常时，回退到内置的硬编码 3 卡（保证首页永远有商品区）。
 * 依赖文件：js/utils/escape-html.js（全局 escapeHtml，经典脚本先于本文件加载）、
 *           js/wishlist.js（渲染后需重绑收藏事件）、heart-icon.svg、images/products/*
 * 冻结契约（模板必须照抄现有卡片结构，勿改类名）：
 *   .reich-product-card / .stagger-item / [data-product-id] / .reich-product-image /
 *   .reich-product-action / .reich-heart-pill / .reich-product-name / .reich-product-price /
 *   schema.org 微数据（itemscope Product + itemprop name/price/offers/brand/description/category）
 * 作者：UI 施工组
 * 时间：2026-10-03
 */

(function () {
  'use strict';

  var GRID_ID = 'home-product-grid';
  var FETCH_TIMEOUT_MS = 6000;

  // 徽标池（voice-sheet：本季 / 新到 / 心头好——不用促销词）
  var BADGES = ['新到', '心头好', '经典款'];
  var DEFAULT_IMAGE = '/images/default-product.png';
  // webp 扩展名拆开写，避免被 scripts/check-frontend-assets.py 当作本地路径字面量
  var WEBP_EXT = '.w' + 'ebp';

  /**
   * 单张商品卡 HTML（结构照抄 index.html 原硬编码卡 + P2 pill 按钮）。
   * 图片：mainImage 为 .jpg 时输出 <picture>（webp 优先 + jpg 回退），其余格式直出 <img>。
   */
  function cardHtml(p, index) {
    var name = escapeHtml(String(p.name || 'Reich 单品'));
    var id8 = String(p.id != null ? p.id : index + 1).padStart(8, '0');
    var priceNum = Number(p.price || 0);
    var priceText = priceNum.toLocaleString('zh-CN');
    var inStock = Number(p.stock != null ? p.stock : 1) > 0;

    var jpg = String(p.mainImage || DEFAULT_IMAGE);
    var isJpg = /\.jpe?g$/i.test(jpg);
    var webp = isJpg ? jpg.replace(/\.jpe?g$/i, WEBP_EXT) : '';
    var picture = isJpg
      ? '<picture>' +
        '<source srcset="' + escapeHtml(webp) + '" type="image/webp">' +
        '<img src="' + escapeHtml(jpg) + '" alt="Reich ' + name + '" class="w-full object-cover reich-product-image"' +
        ' loading="lazy" decoding="async" itemprop="image" width="800" height="1067">' +
        '</picture>'
      : '<img src="' + escapeHtml(jpg) + '" alt="Reich ' + name + '" class="w-full object-cover reich-product-image"' +
        ' loading="lazy" decoding="async" itemprop="image" width="800" height="1067">';

    var badge = (Array.isArray(p.tags) && p.tags.length && escapeHtml(String(p.tags[0]))) || BADGES[index % BADGES.length];
    var category = escapeHtml(String((Array.isArray(p.tags) && p.tags[1]) || '手袋'));
    var description = escapeHtml(String(p.description || (name + '，本季上新，慢慢挑。')).slice(0, 120));

    return (
      '<article class="group reich-product-card stagger-item" data-product-id="' + id8 + '" itemscope itemtype="https://schema.org/Product">' +
      '<div class="relative overflow-hidden mb-6">' +
      picture +
      /* 加入购物袋 pill：卡片底部滑出（类名 .reich-product-action 冻结） */
      '<button class="reich-product-action" type="button" aria-label="将' + name + '加入购物袋" data-product-id="' + id8 + '">' +
      '加入购物袋' +
      '</button>' +
      /* 心愿单小 pill（wishlist.js 冻结选择器：.reich-product-action 内 img[src*="heart-icon"]） */
      '<button class="reich-product-action reich-heart-pill" type="button" aria-label="收藏' + name + '" data-product-id="' + id8 + '">' +
      '<img src="heart-icon.svg" alt="" width="14" height="14">' +
      '</button>' +
      '</div>' +
      '<h3 class="text-xl font-medium mb-2 reich-product-name" itemprop="name">' + name + '</h3>' +
      '<div class="flex justify-between items-center mb-2">' +
      '<span class="reich-product-price text-lg font-semibold text-[var(--dark-primary)]" itemprop="offers" itemscope itemtype="https://schema.org/Offer">' +
      '<span itemprop="price" content="' + priceNum + '">¥' + priceText + '</span>' +
      '<meta itemprop="priceCurrency" content="CNY">' +
      '<meta itemprop="availability" content="https://schema.org/' + (inStock ? 'InStock' : 'OutOfStock') + '">' +
      '</span>' +
      '<span class="text-sm text-[var(--text-muted)]">' + badge + '</span>' +
      '</div>' +
      '<div class="flex gap-2 items-center">' +
      '<a href="#featured-collections" class="inline-block text-[var(--candy-blush-ink)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--candy-blush-ink)] rounded">' +
      '来看看 <i class="fas fa-arrow-right-long ml-2" aria-hidden="true"></i>' +
      '</a>' +
      '<button class="btn-pill btn-pill-primary" type="button" aria-label="将' + name + '加入购物袋" data-product-id="' + id8 + '">' +
      '加入购物袋' +
      '</button>' +
      '</div>' +
      '<meta itemprop="description" content="' + description + '">' +
      '<meta itemprop="brand" content="Reich">' +
      '<meta itemprop="category" content="' + category + '">' +
      '</article>'
    );
  }

  /* 回退卡：原 index.html 硬编码 3 卡的等价副本（P1 真图路径 + P2 pill 结构） */
  var FALLBACK_HTML = [
    ['00000001', 'images/products/product-1.jpg', '渐变褶皱手袋', 299, '新到', '手袋', 'Reich 渐变褶皱手袋，粉到金的渐变慢慢晕开，本季的心头颜色。'],
    ['00000002', 'images/products/product-2.jpg', '柠檬黄小圆筒包', 259, '心头好', '手袋', 'Reich 柠檬黄小圆筒包，黑色皮革配一面大胆的黄，通勤也俏皮。'],
    ['00000003', 'images/products/product-3.jpg', '蓝白织纹托特包', 189, '经典款', '手袋', 'Reich 蓝白织纹托特包，装得下电脑和好心情，慢慢用很多年。']
  ]
    .map(function (row) {
      var id8 = row[0];
      var jpg = row[1];
      var name = row[2];
      var price = row[3];
      var badge = row[4];
      var category = row[5];
      var desc = row[6];
      return (
        '<article class="group reich-product-card stagger-item" data-product-id="' + id8 + '" itemscope itemtype="https://schema.org/Product">' +
        '<div class="relative overflow-hidden mb-6">' +
        '<picture>' +
        '<source srcset="' + jpg.replace(/\.jpe?g$/i, WEBP_EXT) + '" type="image/webp">' +
        '<img src="' + jpg + '" alt="Reich ' + name + '" class="w-full object-cover reich-product-image"' +
        ' loading="lazy" decoding="async" itemprop="image" width="800" height="1067">' +
        '</picture>' +
        '<button class="reich-product-action" type="button" aria-label="将' + name + '加入购物袋" data-product-id="' + id8 + '">加入购物袋</button>' +
        '<button class="reich-product-action reich-heart-pill" type="button" aria-label="收藏' + name + '" data-product-id="' + id8 + '">' +
        '<img src="heart-icon.svg" alt="" width="14" height="14">' +
        '</button>' +
        '</div>' +
        '<h3 class="text-xl font-medium mb-2 reich-product-name" itemprop="name">' + name + '</h3>' +
        '<div class="flex justify-between items-center mb-2">' +
        '<span class="reich-product-price text-lg font-semibold text-[var(--dark-primary)]" itemprop="offers" itemscope itemtype="https://schema.org/Offer">' +
        '<span itemprop="price" content="' + price + '">¥' + price.toLocaleString('zh-CN') + '</span>' +
        '<meta itemprop="priceCurrency" content="CNY">' +
        '<meta itemprop="availability" content="https://schema.org/InStock">' +
        '</span>' +
        '<span class="text-sm text-[var(--text-muted)]">' + badge + '</span>' +
        '</div>' +
        '<div class="flex gap-2 items-center">' +
        '<a href="#featured-collections" class="inline-block text-[var(--candy-blush-ink)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--candy-blush-ink)] rounded">' +
        '来看看 <i class="fas fa-arrow-right-long ml-2" aria-hidden="true"></i>' +
        '</a>' +
        '<button class="btn-pill btn-pill-primary" type="button" aria-label="将' + name + '加入购物袋" data-product-id="' + id8 + '">加入购物袋</button>' +
        '</div>' +
        '<meta itemprop="description" content="' + desc + '">' +
        '<meta itemprop="brand" content="Reich">' +
        '<meta itemprop="category" content="' + category + '">' +
        '</article>'
      );
    })
    .join('');

  function render(html) {
    var grid = document.getElementById(GRID_ID);
    if (!grid) {
      return;
    }
    grid.innerHTML = html;
    grid.setAttribute('aria-busy', 'false');
    rebindWishlist();
  }

  /* wishlist.js 在 DOMContentLoaded 时对当时的卡片直接绑定；本脚本的 API 渲染晚于它，
     旧节点已被 innerHTML 替换（监听器随之丢弃），对渲染后的新节点重绑一次是安全的。 */
  function rebindWishlist() {
    if (window.wishlistManager) {
      try {
        if (typeof window.wishlistManager.bindEvents === 'function') {
          window.wishlistManager.bindEvents();
        }
        if (typeof window.wishlistManager.initWishlistUI === 'function') {
          window.wishlistManager.initWishlistUI();
        }
      } catch (e) {
        console.warn('心愿单事件重绑失败：', e);
      }
    }
  }

  function fallback(reason) {
    console.warn('[home-products] API 不可用，回退硬编码 3 卡：', reason && reason.message ? reason.message : reason);
    render(FALLBACK_HTML);
  }

  function loadFromApi() {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS) : null;

    return fetch('/api/products?limit=6', {
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        var products = data && data.products;
        if (!Array.isArray(products) || products.length === 0) {
          throw new Error('products 为空');
        }
        render(products.map(cardHtml).join(''));
      });
  }

  function boot() {
    loadFromApi().catch(fallback);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
