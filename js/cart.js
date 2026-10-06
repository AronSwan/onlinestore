/**
 * 统一购物车模块 - 最大化功能整合
 *
 * 整合功能：
 * 1. CartManager - 购物车状态管理（保留现有功能）
 * 2. CartUI - 购物车界面组件（新增）
 * 3. 购物车图标管理（保留现有功能）
 * 4. 后端同步功能（增强）
 *
 * 确保不影响现有购物车按钮图标功能
 *
 * ── 冻结契约（蓝图 M2/M3 施工前置，违反即 P1）───────────────────────
 * ① [data-add-to-cart] 文档级点击委托（bindEvents）；
 * ② getProductDataFromElement 的 .reich-product-card 卡上下文兜底；
 * ③ showCart() 公开入口（navigation-icons.js 购物袋图标调用）；
 * ④ pulseCartBadge()（remove/void offsetWidth/add 重触发脉冲）；
 * ⑤ 徽章选择器组 '.cart-badge, .cart-count, #cart-badge, #cart-count,
 *    .site-cart-badge'（updateCartBadge 与 pulseCartBadge 同组）。
 *
 * M2(2026-10-05 蓝图 v1.1)：C5 勾选模型砍除（getSelectedTotalPrice/
 *   setItemSelected/clearSelectedItems 及 selectionChanged/selectedItemsCleared
 *   事件一并删除——收口 grep 确认调用方全在本文件）；列序改
 *   [缩略 72px][名称两行+价格行][步进器][×]；qty>1 单行算术
 *   "¥259 × 2 = ¥518"；两步内联清空（3s 还原）；底部"共 N 件 · ¥518"+
 *   结算独占 + B6 信任行；B5 三处 toFixed(2) → formatPrice；
 *   C28 qty=1 单价只显一次；C24 随勾选砍除消解。
 *   过渡态：itemAdded 只脉冲不自动开面板（M3 接手 toast 反馈）。
 */

// M0(B5)：价格格式统一（整数直出/非整两位），替换本文件原三处 toFixed(2)
import { formatPrice } from './shared/format-price.js';
// M3(B1)：加购反馈系统——飞行克隆 + 统一 toast（规格见两文件头注）
import { flyToCart, resolveFlightSource } from './shared/fly-to-cart.js';
import { showCartToast, showToast, dismissAllToasts } from './shared/toast.js';
// 批一(7) 大师会诊：ESC 关闭走全站分发器（购物袋浮层注册回调）
import { registerOverlayEscape } from './shared/overlay-escape.js';
// 国际挑剔用户批 A 档 7/8（2026-10-06）：埋点（AddToCart/CartOpened/CheckoutClicked/
// CheckoutIntercepted）——结算拦截从死胡同 toast 升级为 waitlist 邮箱捕获模态
import { track } from './shared/track.js';
// A4（流程体验官终版裁决·纽约案）：本模块会被 site-header 在未静态挂经典
// <script src="utils/escape-html.js"> 的四页动态 import——渲染层转义的全局
// 依赖在此显式兜底（该文件经典/module 双语境通用，见其头注；已挂页面幂等）
import './utils/escape-html.js';

/**
 * 购物车管理器类 - 增强版
 */
class CartManager {
  constructor() {
    // 保留现有初始化逻辑
    this.cart = this.loadCartSync();
    this.productIdManager = window.globalProductIdManager || new (window.ProductIdManager || class {})();
    
    // 新增功能：事件监听器
    this.listeners = new Set();
    this.syncInProgress = false;
    this.debounceTimers = new Map();
    this.debounceDelay = 500;
    
    // 绑定事件
    this.bindEvents();
    
    // 异步初始化
    this.initAsync();
  }
  
  // 保留现有方法
  loadCartSync() {
    /* ⑥审续修(2026-10-06·X2 F1)：损坏 JSON 裸 parse 会抛穿构造器——整模块死亡
       （徽章死/加购委托永不绑定）。损坏按空袋自愈，清掉坏数据防反复抛。
       终验收口(同日·X1/X2)：错型 JSON（"abc"/null/{}——parse 合法但非数组）
       同入口致死；合法数组混异族项（跨标签覆写/旧版残留）→徽章 NaN+僵尸行
       UI 不可删——非数组按空袋，异族项逐件滤除（本地数据部分打捞优于整袋 nuked）。 */
    try {
      const cartData = localStorage.getItem('reich_cart');
      const parsed = cartData ? JSON.parse(cartData) : [];
      if (!Array.isArray(parsed)) {
        try { localStorage.removeItem('reich_cart'); } catch (e2) { /* 隐私模式 */ }
        return [];
      }
      /* 求真务实轮(2026-10-07·务实席实锤)：字符串型数量（"3"，遗留/手工数据）的
         合法件曾被 filter 整件丢弃——UI 隐身但存储残留，下次袋变更后被永久清除。
         先归一化再过滤：救得回的不丢，救不回的（NaN）才拒。浅拷贝防原地改。 */
      return parsed
        .map(it => {
          if (!it || typeof it !== 'object' || !('productSkuId' in it)) return it;
          const q = Number(it.productQuantity);
          return Number.isFinite(q) ? Object.assign({}, it, { productQuantity: q }) : it;
        })
        .filter(it => it && typeof it === 'object' &&
          'productSkuId' in it && typeof it.productQuantity === 'number');
    } catch (e) {
      try { localStorage.removeItem('reich_cart'); } catch (e2) { /* 隐私模式 */ }
      return [];
    }
  }
  
  async initAsync() {
    this.cart = await this.loadCart();
    await this.initCartUI();
  }
  
  async loadCart() {
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true' || sessionStorage.getItem('userLoggedIn') === 'true';
    
    if (isLoggedIn) {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        // 求真修复(2026-10-04): /api/cart 根路由不存在(只有 /api/cart/items/:customerUserId)
      // → 404 轮询每页一次 console 警告。本地优先模式下不再请求根路由。
      const response = await fetch('/api/cart/items/' + (this.getUserId() || 'guest'), {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (response.ok) {
          /* 本地优先修复(2026-10-06·⑥审 X2 P1)：两个后端（NestJS 分页 DTO / mock
             {items,total,message}）均无 cart 键，旧写 data.cart||[] 恒得 [] ——
             登录态每次页面加载把本地袋覆写为空。reich_cart 始终是真相源：
             服务端仅在返回合法非空数组且本地为空时才允许补水，其余一律保本地。 */
          const serverCart = Array.isArray(data.cart) ? data.cart : null;
          let localCart = [];
          try { localCart = JSON.parse(localStorage.getItem('reich_cart') || '[]'); } catch (e) { /* 损坏按空袋 */ }
          // 形状守卫：全项带本地族字段才采用——首项制会让混合数组半生吞（徽章 NaN）；
          // 算术字段同验（有 sku 无 qty 的变异 DTO 也致 NaN，终验 X1 补枪）
          const shapeOk = serverCart && serverCart.length > 0 &&
            serverCart.every(it => it && typeof it === 'object' &&
              'productSkuId' in it && typeof it.productQuantity === 'number');
          if (shapeOk && localCart.length === 0) {
            localStorage.setItem('reich_cart', JSON.stringify(serverCart));
            return serverCart;
          }
          return localCart;
        }
      } catch (error) {
        console.error('加载购物车数据出错:', error);
      }
    }

    // 兜底（游客/非 ok/网络异常）：同 loadCartSync 的损坏自愈口径
    return this.loadCartSync();
  }

  // 增强的UI初始化方法
  async initCartUI() {
    // 保留现有购物车图标更新功能
    const total = this.getTotalItems();
    const countEls = document.querySelectorAll('.cart-count, #cart-badge, #cart-count');
    if (countEls && countEls.length) {
      countEls.forEach(el => {
        el.textContent = total;
        el.classList.add('updated');
        setTimeout(() => el.classList.remove('updated'), 400);
      });
    }

    // 更新SVG图标中的数字显示
    await this.updateSvgCartIcons(total);
    
    // 用户视觉审查修复(2026-10-03): 加购后如果页面有购物车图标(即任何页面
    // 都可能有购物车交互), 也懒建 CartUI——否则徽章永远不亮
    if (!this.cartUI && document.querySelector('[data-cart-icon], .site-cart-btn, .cart-button')) {
      this.cartUI = new CartUI(this);
    }
  }

  // 新增：判断是否需要初始化CartUI
  shouldInitCartUI() {
    return document.querySelector('.cart-overlay') || 
           document.querySelector('[data-cart-ui="true"]') ||
           window.location.pathname.includes('cart');
  }

  // 保留现有方法：添加商品到购物车
  async addToCart(productData) {
    try {
      const {
        productId,
        productSkuId,
        productName,
        productBrand,
        productPrice,
        productQuantity = 1,
        productPic,
        productAttribute = '{}'
      } = productData;

      // 参数验证
      if (!productId || !productSkuId || !productName || !productPrice) {
        throw new Error('商品信息不完整');
      }

      // 检查是否已存在
      const existingItem = this.cart.find(item => item.productSkuId === productSkuId);
      if (existingItem) {
        // 合并数量
        const newQuantity = existingItem.productQuantity + productQuantity;
        if (newQuantity > 999) {
          throw new Error('单个商品数量不能超过999');
        }
        const updated = await this.updateItemQuantity(productSkuId, newQuantity);
        // M3(罗马 P1-1 生死线)：合并路径补发带 merged 标记的 itemAdded——
        // 同款二次加购只走 quantityUpdated，反馈层只挂 itemAdded 会整体静默
        // （最高频场景零反馈）。merged 标记供文案区分"放进/又放进一只"
        this.notifyListeners('itemAdded', { item: updated, merged: true });
        // A 档 7：加购埋点（merged 场景同事件名，quantity 记净增量）
        track('AddToCart', {
          productId: String(productId), name: String(productName),
          price: parseFloat(productPrice) || 0, quantity: parseInt(productQuantity) || 1, merged: true
        });
        return updated;
      }

      // 检查购物车容量
      if (this.cart.length >= 500) {
        throw new Error('购物车最多添加500件商品');
      }

      // 构建新商品
      const newItem = {
        productId,
        productSkuId,
        productName,
        productBrand,
        productPrice: parseFloat(productPrice),
        productQuantity: parseInt(productQuantity),
        productPic,
        productAttribute,
        selected: true,
        addedAt: Date.now()
      };

      // 添加到购物车
      this.cart.push(newItem);

      // A5（东京 P1·流程体验官终版裁决 2026-10-06，修法按苏黎世精化版）：
      // 登录态乐观反馈——本地落袋/徽章刷新/监听器通知全部前移，服务端同步
      // 改后台静默（syncToServerBackground 不 await）。原序 await syncToServer
      // 把 47ms 级本地反馈拖到数百 ms（热态口径；冷态/大袋 698ms 属另一工况）。
      this.saveCart();
      await this.initCartUI();
      this.notifyListeners('itemAdded', { item: newItem });
      this.syncToServerBackground();

      // A 档 7：加购埋点（新袋路径）
      track('AddToCart', {
        productId: String(productId), name: String(productName),
        price: parseFloat(productPrice) || 0, quantity: parseInt(productQuantity) || 1
      });

      return newItem;
    } catch (error) {
      console.error('添加商品到购物车失败:', error);
      throw error;
    }
  }

  // 保留现有方法：更新商品数量
  async updateItemQuantity(productSkuId, quantity) {
    const item = this.cart.find(item => item.productSkuId === productSkuId);
    if (!item) {
      throw new Error('商品不存在于购物车中');
    }
    
    if (quantity <= 0) {
      return await this.removeItem(productSkuId);
    }
    
    if (quantity > 999) {
      throw new Error('单个商品数量不能超过999');
    }
    
    const oldQuantity = item.productQuantity;
    item.productQuantity = quantity;

    // A5 同病同修：改量路径同序——本地先落（save+UI+监听器），同步后台静默
    this.saveCart();
    await this.initCartUI();
    this.notifyListeners('quantityUpdated', { item, oldQuantity, newQuantity: quantity });
    this.syncToServerBackground();

    return item;
  }

  // 保留现有方法：移除商品
  async removeItem(productSkuId) {
    const itemIndex = this.cart.findIndex(item => item.productSkuId === productSkuId);
    if (itemIndex === -1) {
      throw new Error('商品不存在于购物车中');
    }
    
    const removedItem = this.cart.splice(itemIndex, 1)[0];

    // A5 同病同修：删除路径同序——本地先落，同步后台静默
    this.saveCart();
    await this.initCartUI();
    this.notifyListeners('itemRemoved', { item: removedItem });
    this.syncToServerBackground();

    return removedItem;
  }

  // 保留现有方法：获取总商品数量
  getTotalItems() {
    return this.cart.reduce((total, item) => total + item.productQuantity, 0);
  }

  // 保留现有方法：获取总价格
  getTotalPrice() {
    return this.cart.reduce((total, item) => total + (item.productPrice * item.productQuantity), 0);
  }

// M2（C5 砍除）：getSelectedTotalPrice / setItemSelected / clearSelectedItems
// 三个勾选域方法整体删除——收口 grep（2026-10-05）确认调用方全部位于本文件，
// 站内无外部消费方。旧 localStorage 数据中的 selected 字段从此无人读取：
// 兼容策略 = 读侧忽略（老袋子原样进新面板，件数/金额按全量计），写侧
// addToCart 仍写 selected:true（字段形状不变，本模块独立回退时旧代码可直接接管）。

  // 新增：公开打开购物车浮层的统一入口。外部（navigation-icons.js 的
  // 购物袋图标等）此前直调管理器上并不存在的弹窗方法导致恒跳首页——
  // 三层断裂之一。cartUI 是本实例属性但按页条件创建，这里按需懒建后委托。
  showCart() {
    if (!this.cartUI) {
      this.cartUI = new CartUI(this);
    }
    this.cartUI.show();
  }

  // 保留现有方法：保存购物车
  saveCart() {
    localStorage.setItem('reich_cart', JSON.stringify(this.cart));
  }

  // 保留现有方法：清空购物车
  async clearCart() {
    const removedItems = [...this.cart];
    this.cart = [];

    // A5 同病同修：清空路径同序——本地先落，同步后台静默
    this.saveCart();
    await this.initCartUI();
    this.notifyListeners('cartCleared', { removedItems });
    this.syncToServerBackground();
  }

  // 保留现有方法：同步到服务端
  // A5：返回值语义化（true=成功/无需同步/确定性失败；false=可重试的瞬时失败，
  // 供后台重试判定）——网络级失败仍留 console 痕迹；HTTP 非 2xx（本地优先模式下
  // /api/cart 根路由 404 属常态）按原口径静默，不污染 console（A 档 18 纪律）。
  // ⑥审修复(2026-10-06·X1/X2 共中)：4xx 是确定性失败（路由不存在/鉴权拒绝），
  // 重试必再败——只对网络异常与 5xx 返回 false 触发重试，404 不再死重试翻倍。
  async syncToServer() {
    // 审计标注(2026-10-03): 本方法调用的 GET/POST /api/cart 根路由在后端不存在(只有
    // /api/cart/items/:customerUserId 参数化路由)——服务端同步是静默降级的本地优先模式, 详见 README 已知限制
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true' || sessionStorage.getItem('userLoggedIn') === 'true';

    if (!isLoggedIn) {
      return true; // 未登录用户不同步到服务端
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cart: this.cart })
      });
      if (response.ok) return true;
      return response.status >= 500 ? false : true; // 5xx 瞬时可重试；4xx 确定失败不重试
    } catch (error) {
      console.error('同步购物车到服务端失败:', error);
      return false;
    }
  }

  /**
   * A5（流程体验官终版裁决）：后台静默同步——不阻塞调用方（乐观反馈已先行）；
   * 失败隔 1.2s 静默重试一次，仍败则止（本地优先模式既有口径：reich_cart
   * 始终是真相源，下次任意袋变更自然再试）
   */
  syncToServerBackground() {
    Promise.resolve(this.syncToServer()).then((ok) => {
      if (!ok) {
        setTimeout(() => { this.syncToServer(); }, 1200);
      }
    }).catch(() => { /* syncToServer 自吞网络错误，此处仅防御 */ });
  }

  // 保留现有方法：更新SVG购物车图标
  async updateSvgCartIcons(total) {
    const svgCountEls = document.querySelectorAll('svg .cart-count-text');
    if (svgCountEls && svgCountEls.length) {
      svgCountEls.forEach(el => {
        el.textContent = total;
      });
    }
  }

  // 新增：事件监听器管理
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('购物车事件监听器执行失败:', error);
      }
    });
  }

  // 求真修复(2026-10-04): /api/cart 轮询路径的用户 ID
  getUserId() {
    return localStorage.getItem('userId') || sessionStorage.getItem('userId') || '';
  }

  // 保留现有方法：绑定事件
  bindEvents() {
    // 冻结契约①：[data-add-to-cart] 文档级委托。
    // M3：capture 阶段监听——按钮级监听器（M4 的 btn-bag stopPropagation 隔离卡内
    // 双锚链接误触）发生在冒泡阶段，capture 先行保证加购委托永不被按钮隔离截断；
    // 事件语义不变，仍是"点击含 data-add-to-cart 的元素即加购"。
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-add-to-cart]');
      if (btn) {
        // M3(B1)：飞行源在点击现场解析（itemAdded 异步回来时 rect 已漂移）
        this.pendingFlyTrigger = btn;
        this.pendingFlySource = resolveFlightSource(btn);
        const productData = this.getProductDataFromElement(btn);
        if (productData) {
          // addToCart 内部已 console.error 带定位；此处吞掉 rejection 防
          // unhandledrejection 噪声（失败路径同样有清晰日志）
          this.addToCart(productData).catch(() => {});
        }
      }
    }, true);
  }

  // 保留现有方法：从元素获取商品数据
  getProductDataFromElement(element) {
    // 用户视觉审查修复(2026-10-03): 元素缺 data-* 时从最近商品卡上下文补全,
    // 否则 addToCart throw '商品信息不完整' → 加购死钮
    var productId = element.dataset.productId;
    var productSkuId = element.dataset.productSkuId;
    var productName = element.dataset.productName;
    var productPrice = element.dataset.productPrice;
    var productPic = element.dataset.productPic;
    if (!productSkuId || !productName || !productPrice) {
      var card = element.closest('.reich-product-card');
      if (card) {
        productSkuId = productSkuId || card.dataset.productId || '';
        productName = productName || (card.querySelector('.reich-product-name') || {}).textContent || '';
        productPrice = productPrice || (card.querySelector('.reich-product-price [itemprop=price], .reich-product-price') || {}).textContent || '';
        productPrice = parseFloat(String(productPrice).replace(/[^\d.]/g, '')) || 0;
        productPic = productPic || ((card.querySelector('.reich-product-image') || {}).src || '');
      }
    }
    // B1 修复(意大利审查裁决): home-products.js 将 name/pic 以 encodeURIComponent
    // 写入 data-*，旧解码只写在 data-* 缺失的兜底分支（永不触发的主路径乱码根因）。
    // 主路径与兜底路径统一在 return 前解码；decodeURIComponent 对未编码文本
    // （textContent 来源）原样透传，仅遇非法 % 序列时 throw，由 catch 保底。
    try { productName = decodeURIComponent(productName); } catch(e) {}
    try { productPic = decodeURIComponent(productPic); } catch(e) {}
    return {
      productId: productId,
      productSkuId: productSkuId,
      productName: productName,
      productBrand: 'Reich',
      productPrice: productPrice,
      productQuantity: parseInt(element.dataset.productQuantity) || 1,
      productPic: productPic,
      productAttribute: element.dataset.productAttribute || '{}'
    };
  }
}

/**
 * 购物车UI组件类 - 新增功能
 */
class CartUI {
  constructor(cartManager) {
    this.cartManager = cartManager;
    this.isVisible = false;
    this.animationDuration = 300;
    // M2：两步清空确认的armed态与3s还原计时器
    this.clearArmed = false;
    this.clearTimer = null;

    this.init();
  }

  /**
   * 初始化购物车UI
   */
  init() {
    this.createCartHTML();
    this.bindEvents();
    this.bindCartManagerEvents();
    this.updateCartBadge();
  }

  /**
   * 创建购物车HTML结构
   * M2(蓝图 v1.1)：C5 勾选砍除后的新面板——头部 h3"购物袋"+两步清空文字链；
   * 列表行 [缩略 72px][名称两行+价格行][步进器][×]；底部"共 N 件 · ¥518" +
   * B6 信任行 + 结算 pill 独占一行
   */
  createCartHTML() {
    // 如果页面已有购物车浮层，则使用现有结构
    const existingOverlay = document.querySelector('.cart-overlay');
    if (existingOverlay) {
      this.elements = this.getExistingElements(existingOverlay);
      return;
    }

    // 创建新的购物车浮层
    const overlay = document.createElement('div');
    overlay.className = 'cart-overlay';
    overlay.innerHTML = `
      <div class="cart-panel" role="dialog" aria-modal="true" aria-label="购物袋">
        <div class="cart-header">
          <h3>购物袋</h3>
          <div class="cart-header-actions">
            <!-- C5(终裁)+C13: 勾选模型砍除后，"清空"升为整袋两步确认文字链 -->
            <button class="clear-bag-btn" disabled>清空袋子</button>
            <button class="cart-close-btn" aria-label="关闭购物袋">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="cart-body">
          <div class="cart-items-list"></div>
          <!-- A 档 14（PM P2-8）：空袋态升级——塞三卡缩略（fallback 数据现成：
               品名/价格/图与 home-products.js FALLBACK_PRODUCTS 同源）+去逛逛锚精选关抽屉 -->
          <div class="cart-empty">
            <p>袋子还空着哦——去看看新朋友？</p>
            <div class="cart-empty-picks" aria-label="或许你会喜欢">
              <a href="product.html?id=00000001" class="cart-empty-pick">
                <img src="/images/products/product-1.jpg" srcset="/images/products/product-1-160.webp 160w, /images/products/product-1-480.webp 480w" sizes="88px" alt="渐变褶皱手袋" loading="lazy" width="88" height="117">
                <span class="pick-name">渐变褶皱手袋</span>
                <span class="pick-price">¥299</span>
              </a>
              <a href="product.html?id=00000002" class="cart-empty-pick">
                <img src="/images/products/product-2.jpg" srcset="/images/products/product-2-160.webp 160w, /images/products/product-2-480.webp 480w" sizes="88px" alt="黑皮波士顿包" loading="lazy" width="88" height="117">
                <span class="pick-name">黑皮波士顿包</span>
                <span class="pick-price">¥259</span>
              </a>
              <a href="product.html?id=00000003" class="cart-empty-pick">
                <img src="/images/products/product-3.jpg" srcset="/images/products/product-3-160.webp 160w, /images/products/product-3-480.webp 480w" sizes="88px" alt="湖蓝锁扣手提包" loading="lazy" width="88" height="117">
                <span class="pick-name">湖蓝锁扣手提包</span>
                <span class="pick-price">¥189</span>
              </a>
            </div>
            <a href="index.html#featured-collections" class="continue-shopping-btn">去逛逛</a>
          </div>
        </div>

        <div class="cart-footer">
          <!-- C5(终裁)+B3: 计数继承件数求和语义（productQuantity），金额全量 -->
          <div class="cart-total-row">
            <span>共 <span class="total-count">0</span> 件 · <span class="total-price">¥0</span></span>
          </div>
          <!-- B6(罗马位置裁决): 信任行在总价行下方、结算钮上方——最后一眼犹豫的位置 -->
          <p class="cart-trust-line"><a href="returns.html" title="退换与售后（30 天可退，来回运费我们担）">含运费 · 30 天可退</a></p>
          <div class="cart-actions">
            <!-- B12（东京 P2-7·流程体验官终版裁决）："去结算"一词三义收敛——面板
                 按钮诚实化两行式（主行"结算暂未开放"/副行"留邮箱等开业"），与
                 waitlist 模态标题同批呼应；点击行为不变（拦截→waitlist 捕获邮箱） -->
            <button class="checkout-btn" disabled><span class="checkout-btn-main">结算暂未开放</span><span class="checkout-btn-sub">留邮箱等开业</span></button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.elements = this.getExistingElements(overlay);
  }

  /**
   * 获取现有元素引用
   */
  getExistingElements(overlay) {
    return {
      cartOverlay: overlay,
      cartPanel: overlay.querySelector('.cart-panel'),
      cartHeader: overlay.querySelector('.cart-header'),
      cartBody: overlay.querySelector('.cart-body'),
      cartFooter: overlay.querySelector('.cart-footer'),
      cartItemsList: overlay.querySelector('.cart-items-list'),
      totalCount: overlay.querySelector('.total-count'),
      totalPrice: overlay.querySelector('.total-price'),
      checkoutBtn: overlay.querySelector('.checkout-btn'),
      clearBagBtn: overlay.querySelector('.clear-bag-btn')
    };
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 关闭按钮事件
    if (this.elements.cartHeader) {
      this.elements.cartHeader.querySelector('.cart-close-btn').addEventListener('click', () => {
        this.hide();
      });
    }
    
    // 点击外部关闭
    if (this.elements.cartOverlay) {
      this.elements.cartOverlay.addEventListener('click', (e) => {
        if (e.target === this.elements.cartOverlay) {
          this.hide();
        }
      });
    }

    // A 档 14：空袋态"去逛逛"与三卡缩略点击 → 先关抽屉再走默认导航
    // （锚精选区直达；bfcache 回程不再悬着一层遮罩）
    if (this.elements.cartBody) {
      this.elements.cartBody.addEventListener('click', (e) => {
        const go = e.target.closest('.cart-empty a[href]');
        if (go) this.hide();
      });
    }
    
    // 批一(7) 大师会诊：ESC 关闭走 overlay-escape 全站分发器
    //（替代本文件原自挂的 document keydown——与用户菜单/移动菜单/订单弹窗同一位分发者）
    // A 档 8 补：waitlist 模态开在袋面板之上时，ESC 让给最上层（分发器按注册序，
    // cart-panel 先注册先被问——此处主动 defer：查 .waitlist-overlay.open 在开即放行）
    registerOverlayEscape('cart-panel', () => {
      if (this.isVisible) {
        if (document.querySelector('.waitlist-overlay.open')) return false;
        this.hide();
        return true;
      }
      return false;
    });

    // 批一(4) 假模态焦点三件套：
    //   ① focusin 拦截圈禁——面板打开时焦点逸出面板即拉回（浏览器自动聚焦/
    //      脚本 focus 的兜底）；② Tab 首尾循环（keydown 层，Shift+Tab 回尾钮）；
    //   ③ show/hide 的焦点进出（见两方法）。
    this.bindFocusTrap();

    // 去结算按钮：此前只管理 disabled 态、零点击绑定（纯装饰）。
    // 演示环境未开通结算/下单后端——国际挑剔用户批 A 档 8（PM 增长级）：
    // 漏斗意向峰值不再死胡同 toast，升级为 waitlist 邮箱捕获模态
    // （"结算还没开门"+邮箱+成功态；A/B 计数 CheckoutIntercepted 带 arm 字段，
    // 本期单臂 B 部署，arm 预留给下一期 A/B）
    if (this.elements.checkoutBtn) {
      this.elements.checkoutBtn.addEventListener('click', () => {
        track('CheckoutClicked', {
          count: this.cartManager.getTotalItems(),
          total: this.cartManager.getTotalPrice()
        });
        this.showCheckoutWaitlist();
      });
    }

    // M2(C5 终裁)：清空袋子两步内联确认——第一步亮"再点一次清空"（3s 还原），
    // 第二步才整袋清空；不用原生 confirm（合弹窗宪法），文案用品牌声音
    if (this.elements.clearBagBtn) {
      this.elements.clearBagBtn.addEventListener('click', async () => {
        if (this.cartManager.cart.length === 0) return;
        if (!this.clearArmed) {
          this.armClearBag();
          return;
        }
        this.disarmClearBag();
        try {
          await this.cartManager.clearCart();
        } catch (error) {
          console.error('清空购物袋失败:', error);
          this.showNotification('清空购物袋失败，请重试', 'error');
        }
      });
    }
  }

  /** 两步清空·第一步：亮确认态并起 3s 还原计时 */
  armClearBag() {
    if (!this.elements.clearBagBtn) return;
    this.clearArmed = true;
    this.elements.clearBagBtn.textContent = '再点一次清空';
    this.elements.clearBagBtn.classList.add('armed');
    this.elements.clearBagBtn.setAttribute('aria-label', '再点一次确认清空购物袋');
    clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => this.disarmClearBag(), 3000);
  }

  /** 两步清空·还原：文字/样式/计时器全部回到初始态 */
  disarmClearBag() {
    clearTimeout(this.clearTimer);
    this.clearTimer = null;
    this.clearArmed = false;
    if (!this.elements.clearBagBtn) return;
    this.elements.clearBagBtn.textContent = '清空袋子';
    this.elements.clearBagBtn.classList.remove('armed');
    this.elements.clearBagBtn.setAttribute('aria-label', '清空购物袋');
  }

  /**
   * 绑定购物车管理器事件
   */
  bindCartManagerEvents() {
    this.cartManager.addListener((event, data) => {
      switch (event) {
        case 'itemAdded': {
          // M3(B1 v1.1 终裁)：反馈三件套——
          // ① 数据刷新；② 徽章脉冲即刻（解耦于飞行 onfinish，反馈延迟归零）；
          // ③ 飞行克隆（源在点击现场解析）+ toast。B8 连击合并(2026-10-06)后
          // toast 走 500ms 合并窗+120ms 缓冲（单发到场 ≈620ms），原"m3 落点后
          // 120ms"口径仅徽章脉冲仍成立——行动语态 5.2s 时长未动。
          // 不自动开面板（M2 已去 showCart：抽屉留主动点击，四席裁决）
          this.updateCartDisplay();
          this.pulseCartBadge();
          const trigger = this.cartManager.pendingFlyTrigger;
          const source = this.cartManager.pendingFlySource;
          if (source) {
            flyToCart(source, { triggerEl: trigger });
          }
          const item = data && data.item;
          const merged = !!(data && data.merged);
          // B8（纽约 P2-5·流程体验官终版裁决）：同 SKU 连点 500ms 窗口合并成
          // 一条 toast（增量文案"已加入 N 件"）——窗内再击重置计时并累计件数；
          // 徽章每击即更新（计费层零丢帧，与连击/焦点两层表述的计费层同源）
          const sku = item ? item.productSkuId : '';
          const burstFlush = () => {
            const burst = this._toastBurst;
            this._toastBurst = null;
            if (!burst) return;
            window.setTimeout(() => {
              showCartToast({
                name: burst.name,
                merged: burst.merged,
                quantity: burst.quantity,
                burstCount: burst.count,
                onCheckout: () => this.cartManager.showCart(), // "去结算"=打开面板（罗马裁决）
              });
            }, 120);
          };
          if (sku && this._toastBurst && this._toastBurst.sku === sku) {
            this._toastBurst.count += 1;
            this._toastBurst.quantity = item.productQuantity;
            clearTimeout(this._toastBurst.timer);
            this._toastBurst.timer = window.setTimeout(burstFlush, 500);
          } else {
            // ⑥审移交批1②（Y1 实锤）：异 SKU 新窗时旧写只 clearTimeout 不
            // flush——前一只的 toast 整条被吞（180ms 间隔两只仅 1 条）。
            // 先冲刷旧窗（旧 toast 照常发出）再开新窗。120ms=burstFlush 同款出场
            // 缓冲（进队节流，与首窗一致）；两窗 toast 将共存叠放（各 ≥5.2s 存活、
            // 队列上限 2 最老让位——务实席实测三 SKU 连点峰值恒 2 不刷屏）。
            if (this._toastBurst) {
              clearTimeout(this._toastBurst.timer);
              const old = this._toastBurst;
              this._toastBurst = null;
              window.setTimeout(() => {
                showCartToast({
                  name: old.name,
                  merged: old.merged,
                  quantity: old.quantity,
                  burstCount: old.count,
                  onCheckout: () => this.cartManager.showCart(),
                });
              }, 120);
            }
            this._toastBurst = {
              sku,
              name: item ? item.productName : '',
              merged,
              count: 1,
              quantity: item ? item.productQuantity : 1,
              timer: 0
            };
            this._toastBurst.timer = window.setTimeout(burstFlush, 500);
          }
          break;
        }
        case 'itemRemoved': {
          // 步进器/移除只刷新数据——不触发加购 toast/fly（出口验收项）
          this.updateCartDisplay();
          this.disarmClearBag();
          // B6（苏黎世 P2-7·流程体验官终版裁决）：删除袋内品给回执——撤销钮 5s
          //（内存回插+徽章/面板同步）；两步清空（cartCleared）不在此列（其回执
          //是两步确认本身）
          const removed = data && data.item;
          if (removed) {
            showToast({
              message: `「${removed.productName}」从袋里拿出来了。`,
              confirmText: '撤销',
              onConfirm: () => this.restoreRemovedItem(removed),
              dismissText: null
            });
          }
          break;
        }
        case 'quantityUpdated':
        case 'cartCleared':
          this.updateCartDisplay();
          this.disarmClearBag();
          break;
      }
    });
  }

  /** B6：撤销删除——同件回插（addedAt 保序）+本地保存+徽章/面板刷新；同步后台静默 */
  restoreRemovedItem(item) {
    if (this.cartManager.cart.some((it) => it.productSkuId === item.productSkuId)) return;
    this.cartManager.cart.push(item);
    this.cartManager.cart.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
    this.cartManager.saveCart();
    this.cartManager.initCartUI();
    this.updateCartDisplay();
    this.cartManager.syncToServerBackground();
  }

  /**
   * B4(裁决): 购物车徽章单次脉冲重触发——remove 类 → 强制回流(void offsetWidth)
   * → 重新 add，第二次及以后的加购同样得到一次 0.3s 脉冲（cart.css @keyframes pulse）
   */
  pulseCartBadge() {
    document.querySelectorAll('.cart-badge, .cart-count, #cart-badge, #cart-count, .site-cart-badge').forEach(el => {
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    });
  }

  /**
   * 批一(4) 焦点圈禁双通道绑定（一次绑定，常驻判 isVisible）
   * A 档 8 补：waitlist 模态开在袋面板之上时（this.modalAbove），圈禁让位——
   * 焦点归模态表单，Tab 在模态内走（模态自带 ESC/关闭回收）
   */
  bindFocusTrap() {
    const panel = () => this.elements.cartPanel;
    const suppressed = () => !!this.modalAbove;

    // ① focusin 拦截：面板打开时，焦点落到面板外（含遮罩/页面残留）→ 拉回面板
    document.addEventListener('focusin', (e) => {
      if (!this.isVisible || suppressed()) return;
      const p = panel();
      if (p && !p.contains(e.target)) {
        const closeBtn = p.querySelector('.cart-close-btn');
        if (closeBtn) closeBtn.focus();
      }
    });

    // ② Tab 首尾循环：面板内第一个/最后一个可聚焦元素之间循环
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !this.isVisible || suppressed()) return;
      const p = panel();
      if (!p) return;
      const focusables = this.getPanelFocusables(p);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!p.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /** 面板内可聚焦元素（可见且非 disabled） */
  getPanelFocusables(panel) {
    if (!panel) return [];
    return Array.from(
      panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.disabled && el.offsetParent !== null);
  }

  /**
   * 显示购物车（A 档 7/13 补：开袋埋点 + 清场存活 toast——toast(600) 压袋面板(400)，
   * 不清场会盖住袋底结算钮）
   */
  show() {
    if (this.elements.cartOverlay) {
      // 打开前先按当前购物车状态渲染：浮层可能是刚懒创建的，
      // 不先渲染会误显示"购物车为空"
      this.updateCartDisplay();
      dismissAllToasts();
      track('CartOpened', {
        count: this.cartManager.getTotalItems(),
        total: this.cartManager.getTotalPrice()
      });
      // A6（流程体验官终版裁决·双席共中）：开袋锁底层滚动——与 waitlist 模态
      // 同法（body overflow hidden，锁住 scrollY）；overscroll-behavior:contain
      // 由 cart.css 挂 .cart-body（滚动链不外泄），show/hide 对称
      document.body.style.overflow = 'hidden';
      // 批一(4)：记忆焦点来处（hide 时还原），遮罩后 main 内容 inert（不可聚焦/不可交互）
      this.lastFocused = document.activeElement;
      this.setMainInert(true);
      this.elements.cartOverlay.style.display = 'block';
      setTimeout(() => {
        this.elements.cartOverlay.classList.add('visible');
        this.isVisible = true;
        // 批一(4)：打开即聚焦关闭钮——键盘用户第一站是"怎么离开"。
        // 时序修正（验收实锤）：.cart-overlay 是 visibility 0.3s 过渡——过渡启动
        // 前的同类任务/邻帧 focus() 均为无声 no-op（无 focusin、activeElement 不动，
        // 实测 t+35ms 仍失败、t+100ms 起稳定成功：离散可见性翻转落定+渲染树更新
        // 需要一两帧之外的余量）。取 150ms：早于人类键盘反应（≈200ms+），
        // 晚于可聚焦窗口；isVisible 已翻 false（快速关面板）则不抢焦点
        setTimeout(() => {
          if (!this.isVisible) return;
          const closeBtn = this.elements.cartPanel && this.elements.cartPanel.querySelector('.cart-close-btn');
          if (closeBtn) closeBtn.focus();
        }, 150);
      }, 10);
    }
  }

  /**
   * 隐藏购物车
   */
  hide() {
    if (this.elements.cartOverlay) {
      // isVisible 即刻置 false：焦点圈禁（focusin/Tab）与 ESC 分发都键控它，
      // 若等动画结束才置 false，下方"焦点还原触发钮"会被 focusin 拦截拉回面板
      this.isVisible = false;
      this.elements.cartOverlay.classList.remove('visible');
      // A6：对称解锁——waitlist 模态还开在上方时（modalAbove）滚动锁主权归模态
      //（其 close 负责最终还原），否则袋面板即最上层，由本行解锁
      if (!this.modalAbove) {
        document.body.style.overflow = '';
      }
      // 批一(4)：解除 main inert，焦点还原触发钮（.site-cart-btn 冻结类；
      // 无头部购物袋钮的极端场景回落记忆来处）
      this.setMainInert(false);
      const trigger = document.querySelector('.site-cart-btn');
      const restore = trigger || this.lastFocused;
      if (restore && typeof restore.focus === 'function') restore.focus();
      this.lastFocused = null;
      setTimeout(() => {
        this.elements.cartOverlay.style.display = 'none';
      }, this.animationDuration);
    }
  }

  /** 批一(4)：遮罩后 main 内容 inert（aria 无需另设——inert 本身从可访问树移除）。
      P2-19（权益批顺带）：inert 范围 main→main+header——Tab 圈禁此前已补位，
      此改补 SR 游标漏（头部导航在遮罩下仍可被读屏游标到达）；hide() 先解除
      inert 再还原焦点到头部触发钮，时序不变 */
  setMainInert(inert) {
    const targets = [document.querySelector('main'), document.getElementById('siteHeader')];
    targets.forEach((el) => {
      if (!el) return;
      if (inert) {
        el.setAttribute('inert', '');
      } else {
        el.removeAttribute('inert');
      }
    });
  }

  /**
   * 更新购物车显示
   */
  updateCartDisplay() {
    const cart = this.cartManager.cart;
    const isEmpty = cart.length === 0;
    
    // 更新空状态
    this.updateEmptyState(isEmpty);
    
    if (!isEmpty) {
      // 更新商品列表
      this.updateItemsList(cart);
      
      // 更新摘要
      this.updateCartSummary();
    }
    
    // 更新徽章
    this.updateCartBadge();
  }

  /**
   * 更新空状态显示
   */
  updateEmptyState(isEmpty) {
    const emptyElement = this.elements.cartBody.querySelector('.cart-empty');
    const itemsList = this.elements.cartItemsList;

    if (isEmpty) {
      if (emptyElement) emptyElement.style.display = 'flex';
      if (itemsList) itemsList.style.display = 'none';
      if (this.elements.cartFooter) this.elements.cartFooter.style.display = 'none';
      /* 国际批 A14+Y2 复核 P2-1：空袋态"清空袋子"隐藏（原仅 disabled 视觉仍在——
         对空袋显示清空动作是逻辑与视觉双噪音；非空态恢复显示） */
      if (this.elements.clearBagBtn) this.elements.clearBagBtn.style.display = 'none';
    } else {
      if (emptyElement) emptyElement.style.display = 'none';
      if (itemsList) itemsList.style.display = 'block';
      if (this.elements.cartFooter) this.elements.cartFooter.style.display = 'block';
      if (this.elements.clearBagBtn) this.elements.clearBagBtn.style.display = '';
    }
  }

  /**
   * 更新商品列表
   * M2(蓝图 v1.1)：C5 新列序 [缩略 72px][名称两行+价格行][步进器][×]；
   * B5 formatPrice 统一格式；C28 qty=1 单价只显一次、qty>1 单行算术
   * "¥259 × 2 = ¥518"（Condensed 600 15px 由 cart.css 锁）
   *
   * 批四(22) 步进器边界（大师会诊交互席）：+ 达 999 disabled + 行内提示
   * "一件最多带 999 只"（与 updateItemQuantity 999 上限同口径）；− 到 1 给
   * "再按即移除"轻提示（再按即走 removeItem）。
   * 批四(23) 增量更新：重渲后对"上一帧已在袋"的行挂 .is-old（cart.css
   * 去入场动画）——点 + 不再全列表重播 cartItemSlideIn。
   */
  updateItemsList(cart) {
    if (!this.elements.cartItemsList) return;
    const prevSkus = this._renderedSkus || new Set();

    // B9（纽约 P3-1·流程体验官终版裁决，焦点层——机制=innerHTML 重渲销毁旧钮）：
    // 重渲前记焦点若在列表内钮上（sku+aria-label 定位），重渲后按同位钮还焦，
    // 键盘连续 +/- 不丢焦（计费层零丢帧是另一层，两者各自断言）
    const activeEl = document.activeElement;
    let restoreFocus = null;
    if (activeEl && activeEl.tagName === 'BUTTON' && this.elements.cartItemsList.contains(activeEl)) {
      const row = activeEl.closest('.cart-item');
      if (row && row.dataset.skuId) {
        restoreFocus = { sku: row.dataset.skuId, label: activeEl.getAttribute('aria-label') || '' };
      }
    }

    // F7 渲染层转义：购物车数据来自 localStorage/后端同步，
    // 所有字符串字段插值统一包 escapeHtml()（js/utils/escape-html.js，
    // 由页面在 cart.js 之前加载）；数量/价格为数字，无需转义
    this.elements.cartItemsList.innerHTML = cart.map(item => {
      const unit = formatPrice(item.productPrice);
      const line = item.productQuantity > 1
        ? `${unit} × ${item.productQuantity} = ${formatPrice(item.productPrice * item.productQuantity)}`
        : unit;
      // 批四(22)：边界态——上限 disabled / 底限轻提示
      const atMax = item.productQuantity >= 999;
      const atMin = item.productQuantity <= 1;
      const qtyHint = atMax
        ? '一件最多带 999 只'
        : (atMin ? '再按即移除' : '');
      const oldCls = prevSkus.has(item.productSkuId) ? ' is-old' : '';
      return `
      <div class="cart-item${oldCls}" data-sku-id="${escapeHtml(item.productSkuId)}">
        <div class="item-image">
          <img src="${escapeHtml(item.productPic)}" alt="${escapeHtml(item.productName)}">
        </div>
        <div class="item-details">
          <h4 class="item-name">${escapeHtml(item.productName)}</h4>
          <p class="item-price-line">${line}</p>
        </div>
        <div class="item-quantity">
          <button onclick="cartManager.updateItemQuantity('${escapeHtml(item.productSkuId)}', ${item.productQuantity - 1})" aria-label="减少数量"${atMin ? ' title="再按即移除"' : ''}>−</button>
          <span>${item.productQuantity}</span>
          <button onclick="cartManager.updateItemQuantity('${escapeHtml(item.productSkuId)}', ${item.productQuantity + 1})" aria-label="增加数量"${atMax ? ' disabled title="一件最多带 999 只"' : ''}>+</button>
          ${qtyHint ? `<span class="qty-hint" role="status">${qtyHint}</span>` : ''}
        </div>
        <button class="item-remove" onclick="cartManager.removeItem('${escapeHtml(item.productSkuId)}')" aria-label="移除此单品">
          ×
        </button>
      </div>
    `;}).join('');

    this._renderedSkus = new Set(cart.map(item => item.productSkuId));

    // B9：重渲后还焦——按 data-sku-id + aria-label 找回同位钮（999 顶格 disabled
    // 时同位 + 钮不可焦，回落行内另一颗步进钮；都没有则不抢焦点）
    if (restoreFocus) {
      const list = this.elements.cartItemsList;
      const esc = (v) => (window.CSS && CSS.escape ? CSS.escape(v) : v);
      let btn = list.querySelector(
        `.cart-item[data-sku-id="${esc(restoreFocus.sku)}"] button[aria-label="${esc(restoreFocus.label)}"]`
      );
      if (!btn || btn.disabled) {
        btn = list.querySelector(`.cart-item[data-sku-id="${esc(restoreFocus.sku)}"] .item-quantity button:not([disabled])`);
      }
      if (btn && !btn.disabled) btn.focus();
    }
  }

  /**
   * 更新购物袋摘要
   * M2(C5 终裁)：无勾选域——件数=productQuantity 全量求和，金额=全量合计；
   * B5 formatPrice；结算/清空按钮只看"袋是否非空"
   */
  updateCartSummary() {
    const totalCount = this.cartManager.getTotalItems();
    const totalValue = this.cartManager.getTotalPrice();

    if (this.elements.totalCount) {
      this.elements.totalCount.textContent = totalCount;
    }

    if (this.elements.totalPrice) {
      this.elements.totalPrice.textContent = formatPrice(totalValue);
    }

    // 更新按钮状态
    const hasItems = totalCount > 0;
    if (this.elements.checkoutBtn) {
      this.elements.checkoutBtn.disabled = !hasItems;
    }
    if (this.elements.clearBagBtn) {
      this.elements.clearBagBtn.disabled = !hasItems;
      if (!hasItems) this.disarmClearBag();
    }
  }

  /**
   * 更新购物车徽章
   */
  updateCartBadge() {
    const total = this.cartManager.getTotalItems();
    const badgeEls = document.querySelectorAll('.cart-badge, .cart-count, #cart-badge, #cart-count, .site-cart-badge');
    
    badgeEls.forEach(el => {
      el.textContent = total;
      // B-5 修复(2026-10-03): .site-cart-badge 初始 display:none(CSS 控制),
      // JS 切换时按 flex 恢复(否则 display:block 覆盖 flex 布局)
      var display = total > 0 ? (el.classList.contains('site-cart-badge') ? 'flex' : 'block') : 'none';
      el.style.display = display;
    });
  }

  /**
   * 轻量提示（批一(5) 大师会诊 toast 四物种归一，2026-10-06）：
   * 原自写内联黑底硬切 toast（#1a1a1a 3s 消失）退役，改调 shared/toast.js
   * 纯通知语态（confirmText/dismissText 传 null）——同底/同圆角/同进出/同位置，
   * 只保留各自文案；停留时长归组件罗马下限（≥5s，hover 暂停）。
   * type 形参保留仅为两处调用点兼容（归一后无色分语义，文案自足）。
   */
  showNotification(message) {
    showToast({ message, confirmText: null, dismissText: null });
  }

  /**
   * A 档 8 · 结算拦截 waitlist 模态（PM 预立判据：提交率≥8% 保留）。
   * 懒建单例 overlay；邮箱校验（input type=email + 正则双保险）；
   * localStorage 'reich_waitlist' 追加 {email, t, arm}；
   * A/B 计数：track CheckoutIntercepted {arm}（本期单臂 B，arm 字段预留）；
   * 成功态"收到，开业第一个告诉你"。ESC 关闭走 overlay-escape 登记表。
   */
  showCheckoutWaitlist() {
    const WAITLIST_KEY = 'reich_waitlist';
    const ARM = 'B'; // 本期单臂 B 部署（A 档 8 裁决原文）

    if (!this.waitlistOverlay) {
      const overlay = document.createElement('div');
      overlay.className = 'waitlist-overlay';
      overlay.innerHTML = `
        <div class="waitlist-panel" role="dialog" aria-modal="true" aria-labelledby="waitlist-title">
          <button type="button" class="waitlist-close" aria-label="关闭">&times;</button>
          <!-- B12：模态标题与面板按钮主行同词（"结算暂未开放"）——同一语义不换说法 -->
          <h3 id="waitlist-title">结算暂未开放</h3>
          <p class="waitlist-sub">演示环境暂未开通下单。留个邮箱，开业第一个告诉你——不发别的。</p>
          <form class="waitlist-form" novalidate>
            <label for="waitlist-email" class="sr-only">您的电子邮箱</label>
            <input type="email" id="waitlist-email" name="email" placeholder="您的电子邮箱"
                   autocomplete="email" required>
            <button type="submit" class="waitlist-submit">开业叫我</button>
            <p class="waitlist-error" role="alert" aria-live="polite"></p>
          </form>
          <p class="waitlist-done hidden">收到，开业第一个告诉你。</p>
          <p class="waitlist-privacy">邮箱只存在你的浏览器里（本地 localStorage），清除站点数据即删。</p>
        </div>
      `;
      document.body.appendChild(overlay);

      const panel = overlay.querySelector('.waitlist-panel');
      const form = overlay.querySelector('.waitlist-form');
      const input = overlay.querySelector('#waitlist-email');
      const errEl = overlay.querySelector('.waitlist-error');
      const doneEl = overlay.querySelector('.waitlist-done');
      const closeBtn = overlay.querySelector('.waitlist-close');
      const self = this;

      const close = () => {
        overlay.classList.remove('open');
        // A6：模态关了，但袋面板若仍在其下开着（modalAbove 场景的常规收场），
        // 滚动锁交还袋面板；袋也关了才真正解锁
        document.body.style.overflow = self.isVisible ? 'hidden' : '';
        self.modalAbove = false; // A 档 8：袋面板焦点圈禁/ESC 恢复主权
        if (self.waitlistTrigger && typeof self.waitlistTrigger.focus === 'function') {
          self.waitlistTrigger.focus();
        }
        self.waitlistTrigger = null;
      };

      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

      registerOverlayEscape('checkout-waitlist', () => {
        if (overlay.classList.contains('open')) { close(); return true; }
        return false;
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = String(input.value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          errEl.textContent = '这个邮箱好像不太对，再看一眼？';
          input.focus();
          return;
        }
        try {
          const list = JSON.parse(localStorage.getItem(WAITLIST_KEY) || '[]');
          if (!Array.isArray(list) || list.some((x) => x && x.email === email)) {
            // 已在册：不重复入列，直接成功态（去重对用户无感）
          } else {
            list.push({ email, t: Date.now(), arm: ARM });
            localStorage.setItem(WAITLIST_KEY, JSON.stringify(list));
          }
        } catch (err) { /* 隐私模式：提交反馈照常给（本地不可存是已知限制） */ }
        track('WaitlistSubmitted', { arm: ARM });
        form.classList.add('hidden');
        doneEl.classList.remove('hidden');
      });

      this.waitlistOverlay = overlay;
      this.waitlistPanel = panel;
      this.waitlistInput = input;
      this.waitlistClose = close;
    }

    // 每次打开重置到表单态（上次成功态不粘滞）
    this.waitlistOverlay.querySelector('.waitlist-form').classList.remove('hidden');
    this.waitlistOverlay.querySelector('.waitlist-done').classList.add('hidden');
    this.waitlistOverlay.querySelector('.waitlist-error').textContent = '';
    this.waitlistOverlay.querySelector('#waitlist-email').value = '';

    this.waitlistTrigger = this.elements.checkoutBtn || null;
    this.modalAbove = true; // A 档 8：模态压袋面板之上——袋的圈禁/ESC 让位
    this.waitlistOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    // 曝光计数（A/B 桶：本期单臂 B）
    track('CheckoutIntercepted', { arm: ARM });
    setTimeout(() => this.waitlistInput && this.waitlistInput.focus(), 30);
  }
}

// 全局购物车管理器实例
let cartManager;

// 页面加载完成后初始化
// A4（流程体验官终版裁决·纽约案）：site-header 袋钮会在未静态加载本模块的
// 四页动态 import('./cart.js')——此时 DOMContentLoaded 早已打过，原监听器
// 永不触发（死钮复发）。readyState 守卫：文档仍在解析走事件（静态页原时序
// 不变：defer 模块执行时 readyState=interactive，事件随后照发），已完成则立即建。
function initCartModule() {
  cartManager = new CartManager();
  window.cartManager = cartManager;

  // 为现有购物车按钮添加点击事件
  const cartButtons = document.querySelectorAll('[data-cart-button]');
  cartButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (cartManager.cartUI) {
        cartManager.cartUI.show();
      }
    });
  });

  // A 档 18（console 纪律）：初始化 log 收 localStorage.debug 开关（默认静默）
  try {
    if (localStorage.getItem('debug')) console.log('统一购物车模块初始化完成');
  } catch (e) { /* 隐私模式静默 */ }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCartModule);
} else {
  initCartModule();
}