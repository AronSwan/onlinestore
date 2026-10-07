/**
 * mobile-tabbar.js — 移动端吸底标签栏（UI 热心用户批 P1·移动党，2026-10-07）
 * 7 页统一注入：首页/手袋/袋（打开购物袋+角标）/我的。
 * 桌面隐藏（CSS @media 控制）；袋角标复用 .cart-badge 类——cart.js 的
 * 徽章更新逻辑按类驱动，标签栏角标随主徽章同源点亮。
 */
(function injectMobileTabbar() {
  function mount() {
    if (document.querySelector('.mobile-tabbar')) return;
    var bar = document.createElement('nav');
    bar.className = 'mobile-tabbar';
    bar.setAttribute('aria-label', '主导航');
    var path = location.pathname.split('/').pop() || 'index.html';
    var tabs = [
      { href: 'index.html', label: '首页',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>' },
      { href: 'index.html#featured-collections', label: '手袋', /* UI 批修复循环: 与桌面导航同落地（裸 product.html 无 id 落售罄空态——三席共中） */
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>' },
      { href: '#bag', label: '袋', id: 'tabbar-cart',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
        extra: '<span class="cart-badge" style="position:absolute;top:0;right:16px;display:none"></span>' },
      { href: 'profile.html', label: '我的',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>' },
    ];
    bar.innerHTML = tabs.map(function (t) {
      var isCurrent = t.href === path || (t.href === 'index.html' && path === '');
      return '<a href="' + t.href + '"' +
        (t.id ? ' id="' + t.id + '" style="position:relative"' : '') +
        (isCurrent ? ' aria-current="page"' : '') + '>' + t.icon +
        (t.extra || '') + '<span>' + t.label + '</span></a>';
    }).join('');
    document.body.appendChild(bar);
    // UI 批修复循环（验收 X2 F5）: 冷载角标——cart.js 的初始 updateCartBadge 先于
    // tabbar 注入跑过，角标错过那次广播；注入后立即从 reich_cart 读数补点亮
    try {
      var cold = JSON.parse(localStorage.getItem('reich_cart') || '[]');
      var n = cold.reduce(function (s, it) { return s + (Number(it.productQuantity) || 0); }, 0);
      var badge = bar.querySelector('.cart-badge');
      if (badge && n > 0) { badge.textContent = String(n); badge.style.display = 'flex'; }
    } catch (e) { /* 损坏数据静默 */ }
    // 袋 tab：打开购物袋（复用全站袋管理器；无管理器时跳首页兜底）
    var cartTab = bar.querySelector('#tabbar-cart');
    if (cartTab) cartTab.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.cartManager && typeof window.cartManager.showCart === 'function') {
        window.cartManager.showCart();
      } else {
        location.href = 'index.html';
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
