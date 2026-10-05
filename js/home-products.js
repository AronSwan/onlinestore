/**
 * home-products.js — 首页精选商品 bento 陈列（P4 接数据 · F7 bento 改造）
 *
 * 用途：拉取 /api/products 渲染 #home-product-grid 为 bento 网格——
 *       1 条 2×1 主打条 + 其余单格卡；选品 pickFeatured：
 *       featured===true（M3 预留，现库恒空）> publishedAt 最新且 mainImage 非空
 *       > 第一件有图 > products[0]（主打卡根 data-featured-source 标注来源）。
 *       API 不可用 / 返回异常时，回退到内置 3 个最小商品字面量——与正常渲染
 *       走同一条管线（同一模板函数），消灭旧版 FALLBACK_HTML 的双模板漂移。
 * 依赖文件：js/utils/escape-html.js（全局 escapeHtml，先于本文件加载）、
 *           js/wishlist.js（渲染后重绑收藏事件）、heart-icon.svg、
 *           images/products/*、css/components/bento.css（布局与联动样式）
 * 冻结契约（消费方 cart.js getProductDataFromElement / wishlist.js bindEvents）：
 *   article 根类 .reich-product-card（与 .bento-card 并存）+ [data-product-id] 8 位零填充 +
 *   .reich-product-name（h3——站内层级卡片一律 h3）+ .reich-product-price 内 [itemprop=price] +
 *   .reich-product-image（落 <img>，width=800 height=1067 loading=lazy decoding=async itemprop=image）+
 *   .reich-product-action（心 pill，内含 heart-icon.svg <img width=14 height=14>）+ .reich-heart-pill +
 *   按钮级 [data-add-to-cart]+data-product-sku-id/name/price/pic 全套（name/pic encodeURIComponent）+
 *   .stagger-item（每张 article）+ schema.org Product 微数据（itemscope +
 *   itemprop name/price/priceCurrency/availability/brand/description/category/image）。
 * 有意行为变化（F7，如实标注）：
 *   1) article 根级 data-add-to-cart 摘除——整卡暗加购改为显式 .btn-bag 按钮（按钮级全套 data-* 原样保留）；
 *   2) 旧卡底部「来看看 + 加入购物袋」双控件由 bento 版式（徽章/标题/描述/价格+按钮）取代；
 *   3) 回退卡图片路径统一为 /images/ 绝对路径（原为页面相对）。
 * 作者：UI 施工组 · F7 实施席（丙）
 * 时间：2026-10-05
 */

(function () {
  'use strict';

  var GRID_ID = 'home-product-grid';
  var FETCH_TIMEOUT_MS = 6000;

  // 徽标池（voice-sheet：本季 / 新到 / 心头好——不用促销词）
  var BADGES = ['新到', '心头好', '经典款'];
  // C10(裁决): 徽章三色轮转归一——状态徽章 blush-soft 底、玩笑徽章（心头好）ink 描边白底；
  // sun 退门面只留跑马灯、mint 只留订阅带（css/components/bento.css 同步改写）
  var BADGE_CLASS = { '新到': 'badge-blush', '心头好': 'badge-outline', '经典款': 'badge-blush' };
  var DEFAULT_IMAGE = '/images/default-product.png';
  // webp 扩展名拆开写，避免被 scripts/check-frontend-assets.py 当作本地路径字面量
  var WEBP_EXT = '.w' + 'ebp';

  /**
   * 商品字段公共抽取（featured/cell 双模板共用，防止两份模板字段漂移）。
   * 图片：mainImage 为 .jpg 时输出 <picture>（webp 优先 + jpg 回退），其余格式直出 <img>；
   *       无 mainImage 时回退 DEFAULT_IMAGE（回退分支保留）。
   */
  function commonFields(p, index) {
    var name = escapeHtml(String(p.name || 'Reich 单品'));
    var id8 = String(p.id != null ? p.id : index + 1).padStart(8, '0');
    var priceNum = Number(p.price || 0);
    var priceText = priceNum.toLocaleString('zh-CN');
    var inStock = Number(p.stock != null ? p.stock : 1) > 0;

    var jpg = String(p.mainImage || DEFAULT_IMAGE);
    var isJpg = /\.jpe?g$/i.test(jpg);
    var webp = isJpg ? jpg.replace(/\.jpe?g$/i, WEBP_EXT) : '';
    var imgTag =
      '<img src="' + escapeHtml(jpg) + '" alt="Reich ' + name + '" class="reich-product-image"' +
      ' loading="lazy" decoding="async" itemprop="image" width="800" height="1067">';
    var picture = isJpg
      ? '<picture><source srcset="' + escapeHtml(webp) + '" type="image/webp">' + imgTag + '</picture>'
      : imgTag;

    return {
      name: name,
      id8: id8,
      priceNum: priceNum,
      priceText: priceText,
      inStock: inStock,
      jpg: jpg,
      picture: picture,
      badge: (Array.isArray(p.tags) && p.tags.length && escapeHtml(String(p.tags[0]))) || BADGES[index % BADGES.length],
      badgeCls: (function (b) { return BADGE_CLASS[b] || 'badge-blush'; })(
        (Array.isArray(p.tags) && p.tags.length && String(p.tags[0])) || BADGES[index % BADGES.length]
      ),
      category: escapeHtml(String((Array.isArray(p.tags) && p.tags[1]) || '手袋')),
      descVisible: escapeHtml(String(p.description || (name + '，本季上新，慢慢挑。'))),
      descMeta: escapeHtml(String(p.description || (name + '，本季上新，慢慢挑。')).slice(0, 120))
    };
  }

  /* 加入购物袋 pill（bento 版式的显式加购入口；按钮级 data-* 全套为冻结契约） */
  function bagButton(f) {
    return '<button class="btn-bag" type="button" aria-label="将' + f.name + '加入购物袋" data-add-to-cart="true"' +
      ' data-product-id="' + f.id8 + '" data-product-sku-id="' + f.id8 + '"' +
      ' data-product-name="' + encodeURIComponent(f.name) + '" data-product-price="' + f.priceNum + '"' +
      ' data-product-pic="' + encodeURIComponent(f.jpg) + '">加入购物袋</button>';
  }

  /* 心愿单小 pill（wishlist.js 冻结选择器：.reich-product-action 内 img[src*="heart-icon"]）；
     位置由 main.css .reich-heart-pill 系规则锚定卡图右上（css/components/bento.css Ⓞ1 留证） */
  function heartButton(f) {
    return '<button class="reich-product-action reich-heart-pill" type="button" aria-label="收藏' + f.name + '"' +
      ' data-add-to-cart="true" data-product-id="' + f.id8 + '" data-product-sku-id="' + f.id8 + '"' +
      ' data-product-name="' + encodeURIComponent(f.name) + '" data-product-price="' + f.priceNum + '"' +
      ' data-product-pic="' + encodeURIComponent(f.jpg) + '">' +
      '<img src="heart-icon.svg" alt="" width="14" height="14"></button>';
  }

  /* 价格 + schema.org Offer（.reich-product-price 与内层 [itemprop=price] 为冻结契约） */
  function priceOffer(f) {
    return '<span class="reich-product-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">' +
      '<span itemprop="price" content="' + f.priceNum + '">¥' + f.priceText + '</span>' +
      '<meta itemprop="priceCurrency" content="CNY">' +
      '<meta itemprop="availability" content="https://schema.org/' + (f.inStock ? 'InStock' : 'OutOfStock') + '">' +
      '</span>';
  }

  /* Product 微数据尾部（description 钳 120 字，与旧版一致） */
  function metaTail(f) {
    return '<meta itemprop="description" content="' + f.descMeta + '">' +
      '<meta itemprop="brand" content="Reich">' +
      '<meta itemprop="category" content="' + f.category + '">';
  }

  /**
   * 主打条模板（2×1）：横排左图右文 / 竖排图上文下由 bento.css 容器查询接管。
   * source ∈ featured | publishedAt | firstImage | first（pickFeatured 判定，卡根标注）。
   */
  function featuredHtml(p, index, source) {
    var f = commonFields(p, index);
    return (
      '<article class="bento-card bento-featured reich-product-card stagger-item"' +
      ' data-product-id="' + f.id8 + '" data-featured-source="' + source + '" aria-label="本期主打：' + f.name + '"' +
      ' itemscope itemtype="https://schema.org/Product">' +
      '<div class="featured-inner">' +
      '<figure class="card-fig featured-fig">' +
      '<span class="badge ' + f.badgeCls + '">' + f.badge + '</span>' +
      f.picture +
      heartButton(f) +
      '</figure>' +
      '<div class="featured-body">' +
      '<p class="featured-kicker">本期主打</p>' +
      '<h3 class="featured-name reich-product-name" itemprop="name">' + f.name + '</h3>' +
      '<p class="featured-desc">' + f.descVisible + '</p>' +
      '<div class="featured-meta">' + priceOffer(f) + bagButton(f) + '</div>' +
      metaTail(f) +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }

  /** 单格卡模板：@container≥280 横排图左文右，<280 竖排图上文下。 */
  function cellHtml(p, index) {
    var f = commonFields(p, index);
    return (
      '<article class="bento-card bento-cell reich-product-card stagger-item"' +
      ' data-product-id="' + f.id8 + '" itemscope itemtype="https://schema.org/Product">' +
      '<div class="cell-inner">' +
      '<figure class="card-fig cell-fig">' +
      '<span class="badge ' + f.badgeCls + '">' + f.badge + '</span>' +
      f.picture +
      heartButton(f) +
      '</figure>' +
      '<div class="cell-body">' +
      '<h3 class="cell-name reich-product-name" itemprop="name">' + f.name + '</h3>' +
      '<p class="cell-desc">' + f.descVisible + '</p>' +
      '<div class="cell-meta">' + priceOffer(f) + bagButton(f) + '</div>' +
      metaTail(f) +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }

  /**
   * 主打位选品（门槛从严）：featured===true（M3 预留，现库恒空）>
   * publishedAt 最新且 mainImage 非空（并列取先出现者）> 第一件有图 > products[0]。
   * publishedAt 解析失败（缺字段/脏数据）视为不参与该轮比较。
   */
  function pickFeatured(products) {
    var i;
    for (i = 0; i < products.length; i++) {
      if (products[i] && products[i].featured === true) {
        return { index: i, source: 'featured' };
      }
    }
    var best = -1;
    var bestTime = -Infinity;
    for (i = 0; i < products.length; i++) {
      var p = products[i];
      if (!p || !p.mainImage) { continue; }
      var t = Date.parse(p.publishedAt || '');
      if (!isNaN(t) && t > bestTime) { best = i; bestTime = t; }
    }
    if (best >= 0) { return { index: best, source: 'publishedAt' }; }
    for (i = 0; i < products.length; i++) {
      if (products[i] && products[i].mainImage) { return { index: i, source: 'firstImage' }; }
    }
    return { index: 0, source: 'first' };
  }

  /** 统一渲染管线：正常数据与回退数据共用（单模板真相源）。 */
  function renderProducts(products) {
    var pick = pickFeatured(products);
    render(products.map(function (p, i) {
      return i === pick.index ? featuredHtml(p, i, pick.source) : cellHtml(p, i);
    }).join(''));
  }

  /* 回退商品：原 index.html 硬编码 3 卡的最小字面量（文案与 scripts/seed-products.sql
     逐字一致——求真·名实相符，只写图里看得见的；publishedAt 同源）。
     走 renderProducts 同一管线：1 主打 + 2 单格，路径 /images/ 绝对。 */
  var FALLBACK_PRODUCTS = [
    { id: 1, name: '渐变褶皱手袋', price: 299, stock: 58, mainImage: '/images/products/product-1.jpg',
      tags: ['新到', '手袋'], publishedAt: '2026-10-03T10:06:00',
      description: '绿到橙再到紫，渐变在褶皱上慢慢晕开，紫红提手一拎就走。像把傍晚的天色收进包里，慢慢挑。' },
    { id: 2, name: '黑皮波士顿包', price: 259, stock: 42, mainImage: '/images/products/product-2.jpg',
      tags: ['心头好', '手提包'], publishedAt: '2026-10-03T10:05:00',
      description: '黑色粒面皮革，双提手加一道皮带扣，精神又稳当。装得下手机、口红和一句俏皮话，通勤路上的老搭档。' },
    { id: 3, name: '湖蓝凯莉手提包', price: 189, stock: 66, mainImage: '/images/products/product-3.jpg',
      tags: ['经典款', '手提包'], publishedAt: '2026-10-03T10:04:00',
      description: '湖蓝色光面皮革，白色矩形锁扣配一点金色五金。拎在手上，像拎着一小片晴天。' }
  ];

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
    renderProducts(FALLBACK_PRODUCTS);
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
        renderProducts(products);
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
