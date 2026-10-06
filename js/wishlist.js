/**
 * 收藏功能实现
 * 管理用户的收藏商品列表
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15（M6·2026-10-05 重构）
// 用途：管理用户收藏商品功能，包括添加、移除和显示收藏列表
// 依赖文件：heart-icon.svg / heart-icon-filled.svg（M6·C6 实心化变体）/ js/shared/toast.js（统一反馈组件）
//
// M6·B4 重构（2026-10-05）：
//   - 孤儿模态整段删除（原 98-168 行）——头部心形已改指 profile.html"我的心头好"
//     区块（site-header.js），收藏的"房间"从弹窗搬进个人中心（动作在原地、资产在房间）；
//   - 反馈语系统一：自建 wishlist-toast 退役，换 js/shared/toast.js（与加购/订阅同位置
//     同时长同进出动画，只换文案——M3 反馈语系规格）；
//   - 心形实心化反馈：在册态卡片心形 img 换 heart-icon-filled.svg（candy blush 实底）。

import { showToast } from './shared/toast.js';
// 国际挑剔用户批 A 档 7：心愿埋点（六点位之一）
import { track } from './shared/track.js';

const HEART_EMPTY = 'heart-icon.svg';
const HEART_FILLED = 'heart-icon-filled.svg';

// P1-14（大师批验收罚单·m4 契约红）：幂等护栏从 data-* 键改 WeakSet——
// dataset.wishlistBound 会在心形钮上泄漏第二个 data- 键，m4 spec
// "五件 data-* 全清，只留 productId" 契约复绿；WeakSet 语义与原护栏逐字等价
// （同钮二次 bindEvents 不叠加监听；home-products 重渲染的新节点不在集合内，照常绑定）
const boundButtons = new WeakSet();

class WishlistManager {
  constructor() {
    this.wishlist = JSON.parse(localStorage.getItem('reich_wishlist')) || [];
    this.initWishlistUI();
    this.bindEvents();
  }

  /** 在册态心形实心化（img src 切换——SVG 经 <img> 加载无法用 CSS 改内部填充） */
  setHeartState(heartImg, filled) {
    if (!heartImg) return;
    heartImg.classList.toggle('active', filled);
    heartImg.src = filled ? HEART_FILLED : HEART_EMPTY;
  }

  initWishlistUI() {
    // 批一(3) 大师会诊（2026-10-06）：绑定域从"卡片内心形"扩为全站 .reich-heart-pill
    // （PDP ATC 旁同契约钮，product.js 渲染）——在册态一律实心化
    document.querySelectorAll('button.reich-heart-pill').forEach(btn => {
      const productId = this.resolveProductId(btn);
      const heartIcon = btn.querySelector('img[src*="heart-icon"]');
      if (productId && heartIcon && this.isInWishlist(productId)) {
        this.setHeartState(heartIcon, true);
      }
    });
  }

  /** 心形钮的商品 id：钮自带 data-product-id 优先，否则回卡片上下文（冻结契约） */
  resolveProductId(btn) {
    const card = btn.closest('.reich-product-card');
    return btn.dataset.productId || (card && card.dataset.productId) || null;
  }

  bindEvents() {
    // 绑定收藏按钮点击事件（批一(3)：按钮级绑定覆盖卡片与 PDP 两处；
    // 原选择器 .reich-product-action img[src*="heart-icon"] 的绑定落点即本钮）
    document.querySelectorAll('button.reich-heart-pill').forEach(btn => {
      // 幂等护栏（P1-14：WeakSet 化，不泄漏 data-* 键）：同钮二次 bindEvents
      //（如 PDP 与重绑并存）不得叠加监听（add/remove 双触发互相抵消）
      if (boundButtons.has(btn)) return;
      boundButtons.add(btn);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = this.resolveProductId(btn);
        if (!productId) return;
        const heartImg = btn.querySelector('img[src*="heart-icon"]');

        if (this.isInWishlist(productId)) {
          this.removeFromWishlist(productId);
          this.setHeartState(heartImg, false);
        } else {
          const card = btn.closest('.reich-product-card');
          // 卡片上下文（index bento 卡）按 DOM 读品名/价格/图；PDP 钮自带
          // data-product-name/price/pic（product.js 渲染，存储形状一致）
          const product = card
            ? {
                name: card.querySelector('.reich-product-name').textContent,
                price: card.querySelector('.reich-product-price').textContent,
                image: card.querySelector('.reich-product-image').src
              }
            : {
                name: btn.dataset.productName || 'Reich 单品',
                price: btn.dataset.productPrice || '',
                image: btn.dataset.productPic || ''
              };
          this.addToWishlist(Object.assign({ id: productId }, product));
          this.setHeartState(heartImg, true);
        }
      });
    });
  }

  addToWishlist(product) {
    if (!this.isInWishlist(product.id)) {
      this.wishlist.push(product);
      this.saveWishlist();
      // A 档 7：心愿埋点
      track('Wishlisted', { id: String(product.id), name: String(product.name || '') });
      this.showWishlistToast(product.name);
    }
  }

  removeFromWishlist(productId) {
    // B11（东京 P2-5·流程体验官终版裁决）：取消收藏纯通知——分量轻于添加。
    // 无按钮已兑现；"时长短"要素与 toast 组件 5000ms 下限红线（罗马：移动端单手
    // 4s 不够，js/shared/toast.js:178 Math.max 强制）冲突——用户裁决 B（2026-10-06）：
    // 维持 5.2s 不破例，红线终局，"轻"由无按钮单要素承载。
    // "小本本"隐喻按术语锚同框纪律：主句+副句（心头好清单所在）同框出现
    const removed = this.wishlist.find(item => item.id === productId);
    this.wishlist = this.wishlist.filter(item => item.id !== productId);
    this.saveWishlist();
    if (removed) {
      showToast({
        message: `「${removed.name}」从小本本上划掉了。`,
        sub: '你的心头好清单在个人中心·我的心头好里，随时在看',
        confirmText: null,
        dismissText: null
      });
    }
  }

  isInWishlist(productId) {
    return this.wishlist.some(item => item.id === productId);
  }

  saveWishlist() {
    localStorage.setItem('reich_wishlist', JSON.stringify(this.wishlist));
  }

  /** M6·B4: 统一 toast 反馈（与加购/订阅同语系——同位置同时长同动画，只换文案）；
      文案过 voice-sheet 禁用词表（无促销/无感叹号） */
  showWishlistToast(productName) {
    showToast({
      message: `「${productName}」记在小本本上了。`,
      sub: '在个人中心·我的心头好里，随时能找到它',
      confirmText: '去看看',
      onConfirm: () => { window.location.href = 'profile.html#wishlist'; },
      dismissText: '继续逛',
    });
  }
}

// 初始化收藏管理器
document.addEventListener('DOMContentLoaded', () => {
  window.wishlistManager = new WishlistManager();
});

export { WishlistManager };
