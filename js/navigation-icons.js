/**
 * 导航栏图标交互功能
 * 处理用户图标、购物车图标、心愿单图标等的点击事件
 */
// 作者：AI助手
// 时间：2025-09-25 16:30:00
// 用途：处理导航栏中各种图标的点击事件，包括用户登录/注册、购物车、心愿单等功能
// 依赖文件：auth.js (用于用户登录状态检查), cart.js (用于购物车功能), wishlist.js (用于心愿单功能)

// 批一(5)(6)(7) 大师会诊（2026-10-06）：私货 toast 改调 shared/toast.js；
// 用户菜单外点关闭选择器改 .site-user-btn（选择器腐烂第二次同根）；
// ESC 关闭走 overlay-escape 全站分发器（与购物袋/移动菜单/搜索条/订单弹窗同一位分发者）
import { showToast } from './shared/toast.js';
import { registerOverlayEscape } from './shared/overlay-escape.js';

// 国际挑剔用户批 A 档 18（console 纪律）：初始化 log 收 localStorage.debug 开关——
// 默认静默，localStorage.setItem('debug','1') 才出诊断
const debugLog = (() => { try { return localStorage.getItem('debug') ? console.log.bind(console) : () => {}; } catch (e) { return () => {}; } })();

class NavigationIconManager {
  constructor() {
    this.init();
  }

  init() {
    debugLog('NavigationIconManager: 初始化中...');
    this.bindUserIconClick();
    this.bindCartIconClick();
    this.bindWishlistIconClick();
    // 搜索按钮/移动端菜单不再在此绑定：index.html 内联脚本已有更完整的
    // 独占绑定（含 aria-expanded、ESC 关闭、焦点管理），此处再绑一次
    // 会导致同一点击触发两次 toggle（开关互相抵消，表现为"点不动"）

    // 批一(6)(7) 大师会诊：外点关闭监听改"init 一次常驻"（原挂两处——创建菜单时
    // 挂、隐藏时卸，第二次展开走 toggle 分支不再重挂，菜单就再也点不开了门外）；
    // ESC 关闭走 overlay-escape 全站分发器（注册一次常驻判开合）
    document.addEventListener('click', this.handleOutsideClick.bind(this));
    registerOverlayEscape('user-menu', () => {
      const menu = document.getElementById('user-menu');
      if (menu && !menu.classList.contains('hidden')) {
        this.hideUserMenu();
        return true;
      }
      return false;
    });
    debugLog('NavigationIconManager: 初始化完成');
  }

  /**
   * 绑定用户图标点击事件
   */
  bindUserIconClick() {
    // 尝试多种可能的选择器来找到用户图标
    // 求真修复(2026-10-04): P3 导航已改用内联 SVG <a class="site-user-btn">,
    // 旧 img 选择器全空 → 退化为直接跳 login.html
    // 权益批 B13（品牌 P3-1 他人商标痕迹清理）：原品牌前缀命名的图标文件已改名
    // 选择器同步（历史残留 img 结构本就恒空，改名只为仓库零他人商标词）
    const userIcon = document.querySelector('.site-user-btn') ||
                     document.querySelector('[data-user-btn]') ||
                     document.querySelector('.user-icon-btn') ||
                     document.querySelector('button img[src="user-icon.svg"]');
    
    if (userIcon) {
      debugLog('NavigationIconManager: 找到用户图标，绑定点击事件');
      // 实战检验修复(2026-10-04): .site-user-btn 本身就是 <a> 按钮,
      // 绑 parentElement(=.site-tools 四图标容器)会冒泡劫持搜索/购物车/心愿单点击
      const userButton = userIcon;
      userButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleUserIconClick();
      });
    }
    // A 档 18：else 恒 miss warn 删除——旧 img 结构选择器在 SVG 头部下永不命中，
    // 每页一条 warn 属纯噪声（绑定兜底由 home-page.js/orders.html 直绑 .site-user-btn 承担）
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
        <a href="/profile.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">个人中心</a><!-- P2-17（权益批）：术语表定名——"个人资料"退役 -->
        <a href="/orders.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">我的订单</a>
        <a href="/profile.html#preferences" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">设置</a>
        <hr class="my-1">
        <a href="#" id="logout-btn" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">退出登录</a>
      `;
      
      // 添加到DOM
      const userIcon = document.querySelector('.site-user-btn') ||
                       document.querySelector('button img[src="user-icon.svg"]'); // 权益批 B13：改名后选择器
      if (userIcon) {
        // 与 bindUserIconClick 同修: 菜单挂载到按钮自身而非四图标容器
        const userButton = userIcon;
        userButton.style.position = 'relative';
        // P1-16（大师批验收罚单·菜单几何）：菜单补 top:100%——原 className 只有
        // absolute+right-0 无 top，绝对定位回落到静态位（flex 容器内居中压住按钮
        // 自身），四项菜单越过视口顶不可点。父锚 relative + top:100% = 紧贴锚下沿
        userMenu.style.top = '100%';
        userButton.appendChild(userMenu);
      }

      // 绑定退出登录按钮点击事件
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          // P1-15（大师批验收罚单·退出 toast 不可达）：阻止冒泡到 .site-user-btn——
          // 原点击在 logout 处理器清空登录态后冒泡到父锚 click 处理器，
          // handleUserIconClick 读到"未登录"立即跳 /login.html，toast 从未可见
          e.stopPropagation();
          this.handleLogout();
        });
      }
      // P1-16 补尾（四项"含鼠标"可点）：菜单挂在内层 <a> 里，导航链接点击冒泡到
      // 父锚 .site-user-btn 的处理器时 preventDefault 会连带取消内层链接的默认
      // 导航（同一事件对象）——三枚导航链接 stopPropagation 放行默认行为
      userMenu.querySelectorAll('a[href]:not(#logout-btn)').forEach((link) => {
        link.addEventListener('click', (e) => e.stopPropagation());
      });
      // 批一(6): 外点关闭监听已在 init() 常驻挂载（此前"创建时挂/隐藏时卸"，
      // toggle 分支重开不再补挂——菜单第二次展开后外点永远关不掉）
    } else {
      // 切换菜单显示状态
      userMenu.classList.toggle('hidden');
    }
  }

  /** 批一(7): 统一收口——ESC 分发器回调与外点关闭共用同一隐藏路径 */
  hideUserMenu() {
    const userMenu = document.getElementById('user-menu');
    if (userMenu) userMenu.classList.add('hidden');
  }

  /**
   * 处理退出登录
   */
  handleLogout() {
    // 清除本地存储的登录状态（权益批 B11：补 userId 键——与登录写入的五键清单对齐）
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('userLoggedIn');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('userId');
    
    // 隐藏用户菜单
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
      userMenu.remove();
    }
    
    // 显示退出成功消息
    this.showNotification('已成功退出登录');

    // 刷新页面（P1-15：延时 1000→600ms——toast 先可见后离场；stopPropagation 已
    // 掐掉父锚的即时跳转，这里负责在 toast 可感知后收尾）
    setTimeout(() => {
      window.location.reload();
    }, 600);
  }

  /**
   * 处理点击外部区域关闭菜单
   * 批一(6) 大师会诊：选择器改 .site-user-btn——原选择器
   * 'button img[src="user-icon.svg"]' 是旧 img 结构的残骸
   * （选择器腐烂第二次同根：SVG 头部下恒 null），菜单外点永远关不掉。
   * 监听 init() 常驻，此处只判开合，不再卸载自身。
   */
  handleOutsideClick(event) {
    const userBtn = document.querySelector('.site-user-btn');
    const userMenu = document.getElementById('user-menu');

    if (userBtn && userMenu && !userMenu.classList.contains('hidden') &&
        !userBtn.contains(event.target) && !userMenu.contains(event.target)) {
      this.hideUserMenu();
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
      debugLog('NavigationIconManager: 找到购物车图标，绑定点击事件');
      const cartButton = cartIcon.parentElement;
      cartButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleCartIconClick();
      });
    }
    // A 档 18：else 恒 miss warn 删除——SVG 头部无 img，选择器永不命中（首页/订单/PDP
    // 的袋钮绑定由各页 data-cart-icon 直绑承担，此绑定域本就休眠）
  }

  /**
   * 处理购物车图标点击事件
   */
  handleCartIconClick() {
    // cart.js 暴露 window.cartManager（CartManager 实例），公开入口是
    // showCart()：内部按需创建 cartUI 并打开购物车浮层。
    // 此前误调管理器上并不存在的方法，条件恒为假，图标点击恒跳首页
    if (window.cartManager && typeof window.cartManager.showCart === 'function') {
      window.cartManager.showCart();
      return;
    }
    // 未加载 cart.js 的页面（如 login.html）：回首页查看购物车
    // （cart.html 页面不存在）
    window.location.href = '/';
  }

  /**
   * 绑定心愿单图标点击事件（⑤审 P2-4：B4 闭环后心愿单入口走 site-header.js 渲染的
   * profile.html#wishlist 深链，本方法与旧 showWishlistModal 同族休眠——选择器匹配旧 img
   * 结构在 SVG 头部下永不命中。整段退役，防止未来 DOM 变动意外复活死路径）
   */
  bindWishlistIconClick() {
    // 已退役（2026-10-05）：入口深链化，无绑定逻辑
  }

  /**
   * 处理心愿单图标点击事件（已退役，同 bindWishlistIconClick——深链化后无调用方）
   */
  handleWishlistIconClick() {
    // 已退役（2026-10-05）
  }

  /**
   * 显示通知消息（批一(5) toast 四物种归一，2026-10-06）：
   * 原绿/红双态顶右角硬切私货退役，改调 shared/toast.js 纯通知语态
   * （confirmText/dismissText 传 null）——同底/同进出/同位置，只保留文案。
   * type 形参保留仅为调用点兼容。
   */
  showNotification(message) {
    showToast({ message, confirmText: null, dismissText: null });
  }
}

// 页面加载完成后初始化导航图标管理器
document.addEventListener('DOMContentLoaded', () => {
  window.navigationIconManager = new NavigationIconManager();
  debugLog('导航图标管理器已初始化');
});