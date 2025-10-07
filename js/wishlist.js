/**
 * 收藏功能实现
 * 管理用户的收藏商品列表
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：管理用户收藏商品功能，包括添加、移除和显示收藏列表
// 依赖文件：heart-icon.svg

class WishlistManager {
  constructor() {
    this.wishlist = JSON.parse(localStorage.getItem('reich_wishlist')) || [];
    this.initWishlistUI();
    this.bindEvents();
  }

  initWishlistUI() {
    // 更新收藏按钮状态
    document.querySelectorAll('.reich-product-card').forEach(card => {
      const productId = card.dataset.productId;
      if (productId && this.isInWishlist(productId)) {
        const heartIcon = card.querySelector('img[src*="heart-icon"]');
        if (heartIcon) {
          heartIcon.classList.add('active');
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
          btn.classList.remove('active');
        } else {
          this.addToWishlist({
            id: productId || Date.now().toString(),
            name: productCard.querySelector('.reich-product-name').textContent,
            price: productCard.querySelector('.reich-product-price').textContent,
            image: productCard.querySelector('.reich-product-image').src,
          });
          btn.classList.add('active');
        }
      });
    });

    // 爱心图标点击事件
    const wishlistButton = document.querySelector('.action-btn img[src*="heart-icon"]');
    if (wishlistButton) {
      wishlistButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.showWishlistModal();
      });
    }
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

  showWishlistToast(productName) {
    const toast = document.createElement('div');
    toast.className = 'wishlist-toast';
    toast.innerHTML = `
      <div class="wishlist-toast-content">
        <img src="heart-icon.svg" alt="收藏" width="16" height="16">
        ${productName} 已添加到收藏
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.remove(), 3000);
  }

  showWishlistModal() {
    // 创建心愿单模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto relative">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">我的收藏</h2>
          <button class="close-wishlist-modal text-gray-500 hover:text-gray-700 absolute top-4 right-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="wishlist-items">
          ${this.wishlist.length === 0 
            ? '<p class="text-gray-500 text-center py-4">您的收藏列表为空</p>'
            : this.wishlist.map(item => `
                <div class="flex items-center border-b border-gray-200 py-3">
                  <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded mr-4">
                  <div class="flex-1">
                    <h3 class="font-medium">${item.name}</h3>
                    <p class="text-gray-600">${item.price}</p>
                  </div>
                  <button class="remove-wishlist-item text-red-500 hover:text-red-700" data-id="${item.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              `).join('')
          }
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定关闭按钮点击事件
    const closeBtn = modal.querySelector('.close-wishlist-modal');
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    // 绑定移除收藏项点击事件
    const removeButtons = modal.querySelectorAll('.remove-wishlist-item');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const productId = btn.dataset.id;
        this.removeFromWishlist(productId);
        // 更新模态框内容
        modal.remove();
        this.showWishlistModal();
      });
    });
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // 阻止模态框内容区域的点击事件冒泡
    const modalContent = modal.querySelector('.bg-white');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }
}

// 初始化收藏管理器
document.addEventListener('DOMContentLoaded', () => {
  window.wishlistManager = new WishlistManager();
  console.log('心愿单管理器已初始化');
});