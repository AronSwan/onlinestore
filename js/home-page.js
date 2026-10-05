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
 * 与原内联块的差异：
 *   - 移动菜单开合与 header 滚动阴影两段已迁入 js/site-header.js；
 *   - 批一(1) 大师会诊（2026-10-06）搜索钮全站化：window.toggleSearch、
 *     增强搜索组件初始化、searchBtn 点击绑定与 ESC 关闭四段整体迁入
 *     js/site-header.js（全站单一源）——本文件不再是搜索的落脚点。
 */

document.addEventListener('DOMContentLoaded', function() {
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
