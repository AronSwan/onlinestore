/**
 * F4 · index.html 页尾页内脚本（外联为 ES module）
 *
 * 为什么外联+模块化（存量缺陷处置，质量纲领·先进条）：
 * Vite dev 会改写 HTML 内联脚本里的动态 import('./js/product-search/...')
 * 并拼错路径，导致**整块内联脚本语法错误**（Unexpected token '/'）——
 * window.toggleSearch / 移动菜单 / 购物车绑定在 dev 下全部失效。
 * 外联为 type=module 后走 vite 的模块原生路径：dev 正确解析、build 正常
 * 打包进产物（dist 不再有动态 import 404 缺口）。
 *
 * 与原内联块的差异（仅两处，均为 F4 头部归一的搬运，行为不变）：
 *   - 移动菜单开合与 header 滚动阴影两段已迁入 js/site-header.js；
 *   - 动态 import 路径由页面相对 './js/product-search/...' 改为模块相对
 *     './product-search/...'（本文件在 js/ 目录下）。
 */

// 全局变量
let enhancedSearchComponent = null;

// 全局函数
window.toggleSearch = async function(show) {
    const searchBtn = document.getElementById('searchBtn');
    const searchBar = document.getElementById('searchBar');

    if (!searchBtn || !searchBar) {
        console.error('搜索按钮或搜索栏元素未找到');
        return;
    }

    const isHidden = searchBar.classList.contains('hidden');
    if (show === undefined) show = isHidden;

    if (show) {
        searchBar.classList.remove('hidden');
        searchBtn.setAttribute('aria-expanded', 'true');

        // 如果增强搜索组件已初始化，则显示热门搜索
        if (enhancedSearchComponent) {
            try {
                await enhancedSearchComponent.showPopularSearches();
            } catch (error) {
                console.error('显示热门搜索失败:', error);
            }
        }

        setTimeout(() => {
            // 尝试通过增强搜索组件获取搜索输入框
            let searchInputElement = null;
            if (enhancedSearchComponent && enhancedSearchComponent.elements && enhancedSearchComponent.elements.searchInput) {
                searchInputElement = enhancedSearchComponent.elements.searchInput;
            } else {
                // 如果通过组件获取失败，则尝试直接通过ID获取
                searchInputElement = document.getElementById('search-input');
            }

            if (searchInputElement) {
                searchInputElement.focus();
            }
        }, 100);
    } else {
        searchBar.classList.add('hidden');
        searchBtn.setAttribute('aria-expanded', 'false');

        // 如果增强搜索组件已初始化，则隐藏热门搜索
        if (enhancedSearchComponent) {
            try {
                enhancedSearchComponent.hidePopularSearches();
            } catch (error) {
                console.error('隐藏热门搜索失败:', error);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('searchBtn');
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('search-input');
    const enhancedSearchContainer = document.getElementById('enhanced-search-container');

    // 动态导入增强搜索组件（原页面相对 './js/product-search/...'；外联后本脚本在 js/ 下，
    // 改为脚本相对路径 './product-search/...'——dev 由浏览器原生解析，不经过 vite 内联改写）
    import('./product-search/enhanced-search-component.js').then(async module => {
        const EnhancedSearchComponent = module.EnhancedSearchComponent;

        try {
            // 创建增强搜索组件实例
            // API 失败时组件内部会自动回退到本地模拟数据（getMockSearchResults 等）
            enhancedSearchComponent = new EnhancedSearchComponent({
                containerId: 'enhanced-search-container',
                searchApiEndpoint: '/api/products/search',
                suggestionsApiEndpoint: '/api/products/suggestions',
                popularSearchesApiEndpoint: '/api/products/popular-searches',
                cacheTTL: 300000, // 5分钟缓存
                maxSuggestions: 8,
                maxPopularSearches: 10,
                maxSearchHistory: 5
            });

            // 初始化增强搜索组件（异步）
            await enhancedSearchComponent.init();

            // 监听搜索事件
            enhancedSearchComponent.on('search', (results) => {
                console.log('搜索结果:', results);
            });

            // 监听产品点击事件
            enhancedSearchComponent.on('productClick', (product) => {
                console.log('点击产品:', product);
                // 这里可以添加产品详情页面跳转逻辑
            });

            // 监听添加到购物车事件
            enhancedSearchComponent.on('addToCart', (product) => {
                console.log('添加到购物车:', product);
                // 这里可以添加购物车逻辑
                if (typeof updateCartCount === 'function') {
                    // 假设购物车中有5件商品
                    updateCartCount(5);
                }
            });

            // 监听添加到收藏夹事件
            enhancedSearchComponent.on('addToWishlist', (product) => {
                console.log('添加到收藏夹:', product);
                // 这里可以添加收藏夹逻辑
            });

            console.log('增强搜索组件初始化成功');
        } catch (error) {
            console.error('增强搜索组件初始化失败:', error);
        }
    }).catch(error => {
        console.error('加载增强搜索组件失败:', error);
    });

    searchBtn.addEventListener('click', () => window.toggleSearch());

    // ESC键关闭搜索
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && searchBar && !searchBar.classList.contains('hidden')) {
            window.toggleSearch(false);
        }
    });

    // 购物车数量更新（P3：新模板徽章为内联 style="display:none"，与 cart.js 的
    // style.display 管理方式对齐；旧 'hidden' class 切换对内联样式无效）
    function updateCartCount(count) {
        const cartBadge = document.getElementById('cart-badge');

        if (cartBadge) {
            if (count > 0) {
                cartBadge.textContent = count > 99 ? '99+' : count;
                cartBadge.style.display = 'flex';
            } else {
                cartBadge.style.display = 'none';
            }
        }
    }

    // 购物车/心愿单图标点击绑定（原由 navigation-icons.js 经 img 选择器绑定；
    // 新模板为内联 SVG 无 img，改在此直接绑定）
    const cartBtn = document.querySelector('.site-tools [data-cart-icon]');
    if (cartBtn) {
        cartBtn.addEventListener('click', function() {
            if (window.cartManager && typeof window.cartManager.showCart === 'function') {
                window.cartManager.showCart();
            } else {
                window.location.href = '/';
            }
        });
    }

    // 心愿单入口：B4 已闭环为 profile.html#wishlist 深链（site-header.js 渲染 href），
    // 此处不再拦截——⑤审工程维 P1：旧 bind 轮询的 showWishlistModal 已随 M6 孤儿模态删除，
    // 拦截后 1s 只能 fallback 原地重载（首页死链）。放行锚点即深链可达。

    // 全局变量存储Casdoor可用性状态
    let casdoorAvailable = false;
    let casdoorCheckCompleted = false;

    // 异步检测Casdoor可用性
    async function checkCasdoorAvailability() {
        // 求真修复(2026-10-04): fetch door.casdoor.com 跨域 CORS 拒绝 → console 红错
        // 改走后端同源探测(后端 GET /api/auth/casdoor/login 302→Casdoor, 存在即真)
        try {
            const response = await fetch('/api/auth/casdoor/login', {
                method: 'HEAD',
                redirect: 'manual'
            });
            casdoorAvailable = response.status >= 200 && response.status < 400;
        } catch (error) {
            console.log('Casdoor服务不可用:', error.message);
            casdoorAvailable = false;
        }

        // 存储Casdoor可用性状态
        sessionStorage.setItem('casdoorAvailable', casdoorAvailable.toString());
        casdoorCheckCompleted = true;

        console.log('Casdoor可用性检测完成:', casdoorAvailable);
    }

    // 设置用户资料按钮
    function setupUserProfileButton() {
        const userProfileBtn = document.getElementById('userProfileBtn');
        if (!userProfileBtn) return;

        // 设置用户资料按钮点击事件
        userProfileBtn.addEventListener('click', function(e) {
            e.preventDefault();

            // 实战检验修复(2026-10-04): 已登录用户点击交给
            // navigation-icons.js 的用户菜单(个人资料/订单/退出),
            // 仅未登录才跳登录页——此前无条件跳转, 登录用户点头像也去登录页
            const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true'
                || sessionStorage.getItem('userLoggedIn') === 'true';
            if (isLoggedIn) return;

            // 构建登录页面URL，包含Casdoor状态信息
            const loginUrl = new URL('login.html', window.location.origin);

            // 如果Casdoor检测已完成，使用检测结果；否则使用sessionStorage中的缓存值
            let casdoorStatus = 'unavailable';
            if (casdoorCheckCompleted) {
                casdoorStatus = casdoorAvailable ? 'available' : 'unavailable';
            } else {
                // 从sessionStorage获取之前的检测结果
                const cachedStatus = sessionStorage.getItem('casdoorAvailable');
                casdoorStatus = (cachedStatus === 'true') ? 'available' : 'unavailable';
            }

            loginUrl.searchParams.set('casdoor', casdoorStatus);

            // 跳转到登录页面（不传递returnUrl避免信息泄露）
            window.location.href = loginUrl.toString();
        });

        console.log('用户资料按钮设置完成');
    }

    // 初始化导航
    if (typeof setupNavigation === 'function') {
        setupNavigation();
    }

    // 初始化购物车数量
    updateCartCount(0);

    // 设置用户资料按钮（同步）
    setupUserProfileButton();

    // 异步检测Casdoor可用性（不阻塞页面加载）
    checkCasdoorAvailability();
});
