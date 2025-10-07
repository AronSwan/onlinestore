/**
 * 导航栏图标交互功能
 * 处理用户图标、购物车图标、心愿单图标等的点击事件
 */
// 作者：AI助手
// 时间：2025-09-25 16:30:00
// 用途：处理导航栏中各种图标的点击事件，包括用户登录/注册、购物车、心愿单等功能
// 依赖文件：auth.js (用于用户登录状态检查), cart.js (用于购物车功能), wishlist.js (用于心愿单功能)

class NavigationIconManager {
  constructor() {
    this.init();
  }

  init() {
    console.log('NavigationIconManager: 初始化中...');
    this.bindUserIconClick();
    this.bindCartIconClick();
    this.bindWishlistIconClick();
    this.bindSearchIconClick();
    this.bindMobileMenuClick();
    console.log('NavigationIconManager: 初始化完成');
  }

  /**
   * 绑定用户图标点击事件
   */
  bindUserIconClick() {
    // 尝试多种可能的选择器来找到用户图标
    const userIcon = document.querySelector('button img[src="gucci-style-user-icon.svg"]') || 
                     document.querySelector('.user-icon img') ||
                     document.querySelector('[data-user-icon] img');
    
    if (userIcon) {
      console.log('NavigationIconManager: 找到用户图标，绑定点击事件');
      const userButton = userIcon.parentElement;
      userButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleUserIconClick();
      });
    } else {
      console.warn('NavigationIconManager: 未找到用户图标');
    }
  }

  /**
   * 处理用户图标点击事件
   */
  handleUserIconClick() {
    // 检查用户是否已登录
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true' || sessionStorage.getItem('userLoggedIn') === 'true';
    
    if (isLoggedIn) {
      // 用户已登录，显示用户菜单或跳转到用户中心
      this.showUserMenu();
    } else {
      // 用户未登录，跳转到登录页面
      window.location.href = '/login.html';
    }
  }

  /**
   * 显示用户菜单
   */
  showUserMenu() {
    // 检查是否已存在用户菜单
    let userMenu = document.getElementById('user-menu');
    
    if (!userMenu) {
      // 创建用户菜单
      userMenu = document.createElement('div');
      userMenu.id = 'user-menu';
      userMenu.className = 'absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50';
      userMenu.innerHTML = `
        <a href="/profile.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">个人资料</a>
        <a href="/orders.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">我的订单</a>
        <a href="/wishlist.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">我的收藏</a>
        <a href="/settings.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">设置</a>
        <hr class="my-1">
        <a href="#" id="logout-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">退出登录</a>
      `;
      
      // 添加到DOM
      const userIcon = document.querySelector('button img[src="gucci-style-user-icon.svg"]');
      if (userIcon) {
        const userButton = userIcon.parentElement;
        userButton.style.position = 'relative';
        userButton.appendChild(userMenu);
      }
      
      // 绑定退出登录按钮点击事件
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleLogout();
        });
      }
      
      // 点击其他地方关闭菜单
      document.addEventListener('click', this.handleOutsideClick.bind(this));
    } else {
      // 切换菜单显示状态
      userMenu.classList.toggle('hidden');
    }
  }

  /**
   * 处理退出登录
   */
  handleLogout() {
    // 清除本地存储的登录状态
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('userLoggedIn');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    
    // 隐藏用户菜单
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
      userMenu.remove();
    }
    
    // 显示退出成功消息
    this.showNotification('已成功退出登录');
    
    // 刷新页面
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  /**
   * 处理点击外部区域关闭菜单
   */
  handleOutsideClick(event) {
    const userIcon = document.querySelector('button img[src="gucci-style-user-icon.svg"]');
    const userMenu = document.getElementById('user-menu');
    
    if (userIcon && userMenu && !userIcon.contains(event.target) && !userMenu.contains(event.target)) {
      userMenu.classList.add('hidden');
      document.removeEventListener('click', this.handleOutsideClick.bind(this));
    }
  }

  /**
   * 绑定购物车图标点击事件
   */
  bindCartIconClick() {
    // 尝试多种可能的选择器来找到购物车图标
    const cartIcon = document.querySelector('button img[src="shopping-bag-icon.svg"]') || 
                     document.querySelector('.cart-icon img') ||
                     document.querySelector('[data-cart-icon] img') ||
                     document.querySelector('.cart-button img') ||
                     document.querySelector('.mobile-nav-btn[aria-label="购物袋"] img');
    
    if (cartIcon) {
      console.log('NavigationIconManager: 找到购物车图标，绑定点击事件');
      const cartButton = cartIcon.parentElement;
      cartButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleCartIconClick();
      });
    } else {
      console.warn('NavigationIconManager: 未找到购物车图标');
    }
  }

  /**
   * 处理购物车图标点击事件
   */
  handleCartIconClick() {
    // 如果已存在购物车管理器实例，则调用其方法
    if (window.cartManager && typeof window.cartManager.showCartModal === 'function') {
      window.cartManager.showCartModal();
    } else {
      // 否则跳转到购物车页面
      window.location.href = '/cart.html';
    }
  }

  /**
   * 绑定心愿单图标点击事件
   */
  bindWishlistIconClick() {
    // 尝试多种可能的选择器来找到心愿单图标
    const wishlistIcon = document.querySelector('button img[src="heart-icon.svg"]') || 
                         document.querySelector('.wishlist-icon img') ||
                         document.querySelector('[data-wishlist-icon] img') ||
                         document.querySelector('.action-btn img[alt*="心愿单"]') ||
                         document.querySelector('.action-btn img[alt*="收藏"]');
    
    if (wishlistIcon) {
      console.log('NavigationIconManager: 找到心愿单图标，绑定点击事件');
      const wishlistButton = wishlistIcon.parentElement;
      wishlistButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleWishlistIconClick();
      });
    } else {
      console.warn('NavigationIconManager: 未找到心愿单图标');
    }
  }

  /**
   * 处理心愿单图标点击事件
   */
  handleWishlistIconClick() {
    // 如果已存在心愿单管理器实例，则调用其方法
    if (window.wishlistManager && typeof window.wishlistManager.showWishlistModal === 'function') {
      window.wishlistManager.showWishlistModal();
    } else {
      // 如果wishlistManager尚未初始化，等待一段时间后再次尝试
      let attempts = 0;
      const maxAttempts = 10;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.wishlistManager && typeof window.wishlistManager.showWishlistModal === 'function') {
          clearInterval(checkInterval);
          window.wishlistManager.showWishlistModal();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          // 如果多次尝试后仍未初始化，跳转到心愿单页面
          window.location.href = '/wishlist.html';
        }
      }, 100);
    }
  }

  /**
   * 绑定搜索图标点击事件
   */
  bindSearchIconClick() {
    const searchBtn = document.getElementById('searchBtn');
    const searchBar = document.getElementById('searchBar');
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    
    if (searchBtn && searchBar) {
      searchBtn.addEventListener('click', () => {
        searchBar.classList.toggle('hidden');
        if (!searchBar.classList.contains('hidden')) {
          // 聚焦搜索输入框
          const searchInput = searchBar.querySelector('input[type="text"]');
          if (searchInput) {
            searchInput.focus();
          }
        }
      });
    }
    
    if (closeSearchBtn && searchBar) {
      closeSearchBtn.addEventListener('click', () => {
        searchBar.classList.add('hidden');
      });
    }
  }

  /**
   * 绑定移动端菜单点击事件
   */
  bindMobileMenuClick() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });
    }
  }

  /**
   * 显示通知消息
   */
  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-md shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// 页面加载完成后初始化导航图标管理器
document.addEventListener('DOMContentLoaded', () => {
  window.navigationIconManager = new NavigationIconManager();
  console.log('导航图标管理器已初始化');
});