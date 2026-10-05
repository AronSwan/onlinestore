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

const HEART_EMPTY = 'heart-icon.svg';
const HEART_FILLED = 'heart-icon-filled.svg';

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
    // 更新收藏按钮状态
    document.querySelectorAll('.reich-product-card').forEach(card => {
      const productId = card.dataset.productId;
      if (productId && this.isInWishlist(productId)) {
        const heartIcon = card.querySelector('img[src*="heart-icon"]');
        if (heartIcon) {
          this.setHeartState(heartIcon, true);
        }
      }
    });
  }

  bindEvents() {
    // 绑定收藏按钮点击事件
    document.querySelectorAll('.reich-product-action img[src*="heart-icon"]').forEach(btn => {
      btn.closest('.reich-product-action').addEventListener('click', (e) => {
        e.stopPropagation();
        const productCard = btn.closest('.reich-product-card');
        const productId = productCard.dataset.productId;

        if (this.isInWishlist(productId)) {
          this.removeFromWishlist(productId);
          this.setHeartState(btn, false);
        } else {
          this.addToWishlist({
            id: productId || Date.now().toString(),
            name: productCard.querySelector('.reich-product-name').textContent,
            price: productCard.querySelector('.reich-product-price').textContent,
            image: productCard.querySelector('.reich-product-image').src,
          });
          this.setHeartState(btn, true);
        }
      });
    });
  }

  addToWishlist(product) {
    if (!this.isInWishlist(product.id)) {
      this.wishlist.push(product);
      this.saveWishlist();
      this.showWishlistToast(product.name);
    }
  }

  removeFromWishlist(productId) {
    this.wishlist = this.wishlist.filter(item => item.id !== productId);
    this.saveWishlist();
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
