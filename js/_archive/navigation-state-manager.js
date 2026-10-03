/**
 * 导航按钮状态管理优化 - 增强版
 * 实现两个核心改进：
 * 1. 状态管理器的事件系统
 * 2. 使用状态机模式进行更严格的状态控制
 * 
 * 创建时间: 2025-09-21
 * 来源: 基于navigation-state-manager.js的增强版本
 * 改进点: 添加事件系统和状态机模式，提供更严格的状态控制
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：管理导航按钮状态，包括悬停、点击和活动状态
// 依赖文件：无

// 导航状态机 - 实现严格的状态转换控制
class NavigationStateMachine {
    constructor() {
        // 定义所有可能的状态 - 使用统一的CSS类名
        this.states = {
            INACTIVE: 'inactive',
            HOVER: 'hover-state',
            ACTIVE: 'active-state',
        };

        // 定义合法的状态转换
        this.transitions = {
            [this.states.INACTIVE]: [this.states.HOVER, this.states.ACTIVE],
            [this.states.HOVER]: [this.states.INACTIVE, this.states.ACTIVE],
            [this.states.ACTIVE]: [this.states.INACTIVE],
        };

        // 当前状态映射（链接到状态的映射）
        this.linkStates = new Map();
    }

    /**
     * 检查状态转换是否合法
     */
    canTransition(from, to) {
        return this.transitions[from] && this.transitions[from].includes(to);
    }

    /**
     * 执行状态转换
     */
    transition(link, toState, force = false) {
        const fromState = this.linkStates.get(link) || this.states.INACTIVE;

        // 如果不是强制转换且转换不合法，则拒绝
        if (!force && !this.canTransition(fromState, toState)) {
            console.warn(`Invalid state transition from ${fromState} to ${toState} for link: ${link.textContent}`);
            return false;
        }

        // 执行状态转换
        this.linkStates.set(link, toState);

        // 触发状态转换事件
        this.emitStateTransition(link, fromState, toState);

        return true;
    }

    /**
     * 获取链接的当前状态
     */
    getState(link) {
        return this.linkStates.get(link) || this.states.INACTIVE;
    }

    /**
     * 重置所有链接状态
     */
    resetAll() {
        this.linkStates.clear();
        this.emitStateReset();
    }

    /**
     * 触发状态转换事件
     */
    emitStateTransition(link, fromState, toState) {
        const event = new CustomEvent('navStateTransition', {
            detail: {
                link: link,
                fromState: fromState,
                toState: toState,
                timestamp: new Date().toISOString(),
            },
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(event);
    }

    /**
     * 触发状态重置事件
     */
    emitStateReset() {
        const event = new CustomEvent('navStateReset', {
            detail: {
                timestamp: new Date().toISOString(),
            },
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(event);
    }
}

// 导航状态管理器 - 增强版（单例模式）
class NavigationStateManager {
    constructor() {
        if (NavigationStateManager.instance) {
            return NavigationStateManager.instance;
        }

        this.initialized = false;
        this.state = {
            activeLink: null,      // 当前活动链接（点击后）
            hoverLink: null,       // 当前悬停链接
            isTransitioning: false, // 是否正在过渡中
            lastInteraction: null,  // 最后交互类型: 'click' 或 'hover'
            eventListeners: new Map(), // 事件监听器映射
        };

        this.config = {
            transitionDuration: 200,  // 过渡动画时长
            hoverDelay: 100,         // 悬停延迟
            activeClass: 'active-state',   // 活动状态类 - 统一命名
            hoverClass: 'hover-state', // 悬停激活类 - 统一命名
            dataStateAttr: 'data-state', // 状态属性名
            pointerLeaveThrottle: 50, // 指针离开事件节流时间（毫秒）
        };

        // 初始化状态机
        this.stateMachine = new NavigationStateMachine();

        NavigationStateManager.instance = this;
    }

    /**
     * 初始化导航状态管理
     */
    init() {
        if (this.initialized) return;

        // 获取导航元素
        this.navbar = document.querySelector('.navbar-luxury');
        this.navLinks = document.querySelectorAll('.nav-link-luxury');

        if (!this.navbar || this.navLinks.length === 0) {
            console.warn('Navigation elements not found');
            return;
        }

        // 初始化节流函数
        this.throttledPointerLeave = this.throttle(this.throttledPointerLeaveInternal.bind(this), this.config.pointerLeaveThrottle);

        // 设置初始状态
        this.setupInitialState();

        // 绑定事件监听器
        this.bindEventListeners();

        // 初始化事件系统
        this.initEventSystem();

        this.initialized = true;
        console.log('NavigationStateManager initialized with event system and state machine');

        // 触发初始化完成事件
        this.emitEvent('navStateManagerInitialized', {
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 初始化事件系统
     */
    initEventSystem() {
        // 监听状态转换事件
        document.addEventListener('navStateTransition', (e) => {
            this.handleStateTransition(e.detail);
        });

        // 监听状态重置事件
        document.addEventListener('navStateReset', (e) => {
            this.handleStateReset(e.detail);
        });

        // 监听导航点击事件
        document.addEventListener('navigationClick', (e) => {
            this.handleNavigationClick(e.detail);
        });
    }

    /**
     * 处理状态转换事件 - 统一管理状态，确保同一时间只有一个激活状态
     */
    handleStateTransition(detail) {
        if (!detail || !detail.link) return;

        // 统一管理状态，确保同一时间只有一个激活状态
        if (detail.toState === this.stateMachine.states.ACTIVE) {
            // 如果有其他链接处于激活状态，先重置它们
            this.navLinks.forEach(link => {
                if (link && link !== detail.link && this.stateMachine.getState(link) === this.stateMachine.states.ACTIVE) {
                    this.stateMachine.transition(link, this.stateMachine.states.INACTIVE);
                    this.updateLinkState(link, {
                        class: this.config.activeClass,
                        dataState: 'inactive',
                        remove: true,
                    });
                }
            });
        }

        // 统一管理悬停状态，确保同一时间只有一个悬停状态
        if (detail.toState === this.stateMachine.states.HOVER) {
            this.navLinks.forEach(link => {
                if (link && link !== detail.link && this.stateMachine.getState(link) === this.stateMachine.states.HOVER) {
                    this.stateMachine.transition(link, this.stateMachine.states.INACTIVE);
                    this.updateLinkState(link, {
                        class: this.config.hoverClass,
                        dataState: 'inactive',
                        remove: true,
                    });
                }
            });
        }

        console.log(`State transition: ${detail.link.textContent} from ${detail.fromState} to ${detail.toState}`);

        // 触发状态变化事件
        this.emitEvent('navStateChange', {
            link: detail.link,
            fromState: detail.fromState,
            toState: detail.toState,
            timestamp: detail.timestamp,
        });
    }

    /**
     * 处理状态重置事件 - 统一管理状态
     */
    handleStateReset(detail) {
        console.log('State reset triggered - 统一管理状态');

        // 重置状态 - 统一管理状态
        this.state.activeLink = null;
        this.state.hoverLink = null;
        this.state.lastInteraction = null;
        this.state.isTransitioning = false;

        // 清除悬停延迟
        clearTimeout(this.hoverTimeout);

        // 触发状态重置完成事件
        this.emitEvent('navStateResetComplete', {
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 处理导航点击事件 - 统一管理状态
     */
    handleNavigationClick(detail) {
        console.log(`Navigation clicked: ${detail.text} (${detail.href})`);

        // 更新活动链接 - 统一管理状态
        this.state.activeLink = detail.link;
        this.state.lastInteraction = 'click';

        // 清除悬停状态 - 统一管理状态
        clearTimeout(this.hoverTimeout);
        this.state.hoverLink = null;

        // 触发导航点击处理事件
        this.emitEvent('navClickProcessed', {
            link: detail.link,
            href: detail.href,
            text: detail.text,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 设置初始状态 - 统一管理状态
     */
    setupInitialState() {
        // 查找初始活动链接 - 统一管理状态
        this.state.activeLink = document.querySelector('.nav-link-luxury.active');

        // 如果没有活动链接，默认设置为第一个 - 统一管理状态
        if (!this.state.activeLink && this.navLinks.length > 0) {
            this.state.activeLink = this.navLinks[0];
            this.setActiveState(this.state.activeLink);
        }

        // 确保所有链接状态一致 - 统一管理状态
        this.syncAllStates();

        // 触发初始状态设置完成事件
        this.emitEvent('navInitialStateSet', {
            activeLink: this.state.activeLink,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 绑定事件监听器 - 统一管理状态
     */
    bindEventListeners() {
        // 为每个导航链接绑定事件 - 统一管理状态
        this.navLinks.forEach(link => {
            // 使用pointer事件统一处理鼠标和触摸 - 统一管理状态
            link.addEventListener('pointerenter', (e) => this.handlePointerEnter(e));
            link.addEventListener('pointerleave', (e) => this.handlePointerLeave(e));

            // 点击事件 - 统一管理状态
            link.addEventListener('click', (e) => this.handleClick(e));
        });

        // 页面滚动事件 - 统一管理状态
        window.addEventListener('scroll', this.throttle(() => this.handleScroll(), 100), { passive: true });

        // 页面可见性变化事件 - 统一管理状态
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    /**
     * 处理指针进入事件 - 统一管理悬停状态
     */
    handlePointerEnter(e) {
        const link = e.currentTarget;
        if (!link) return;

        // 如果正在过渡中，忽略新事件
        if (this.state.isTransitioning) return;

        // 如果是活动链接，不设置悬停状态
        if (link === this.state.activeLink) return;

        // 清除所有其他链接的悬停状态 - 确保同一时间只有一个悬停状态
        if (this.state.hoverLink && this.state.hoverLink !== link) {
            this.clearHoverState(this.state.hoverLink);
        }

        // 设置悬停状态
        this.state.hoverLink = link;
        this.state.lastInteraction = 'hover';

        // 触发悬停开始事件
        this.emitEvent('navHoverStart', {
            link: link,
            timestamp: new Date().toISOString(),
        });

        // 延迟处理悬停，避免快速移动鼠标时的闪烁 - 统一管理悬停状态
        clearTimeout(this.hoverTimeout);
        this.hoverTimeout = setTimeout(() => {
            if (this.state.hoverLink === link) {
                // 设置新的悬停状态
                this.setHoverState(link);
            }
        }, 50); // 使用较短的延迟以提高响应性
    }

    /**
 * 处理指针离开事件 - 统一管理悬停状态
 */
    handlePointerLeave(e) {
        const link = e.currentTarget;
        if (!link) return;

        // 清除悬停延迟
        clearTimeout(this.hoverTimeout);

        // 如果是活动链接，不清除悬停状态
        if (link === this.state.activeLink) return;

        // 如果离开的是当前悬停的链接
        if (this.state.hoverLink === link) {
            // 使用节流函数优化性能，特别是在导航链接数量较多时
            this.throttledPointerLeave(link);
        }
    }

    /**
     * 节流化的指针离开处理函数 - 统一管理悬停状态
     */
    throttledPointerLeaveInternal(link) {
        this.state.hoverLink = null;

        // 触发悬停结束事件
        this.emitEvent('navHoverEnd', {
            link: link,
            timestamp: new Date().toISOString(),
        });

        // 立即清除悬停状态，不使用延迟
        this.clearHoverState(link);
    }

    /**
     * 处理点击事件 - 统一管理状态
     */
    handleClick(e) {
        const link = e.currentTarget;
        e.preventDefault();

        // 如果正在过渡中，忽略新事件
        if (this.state.isTransitioning) return;

        // 设置点击状态
        this.state.lastInteraction = 'click';

        // 清除悬停状态 - 统一管理状态
        clearTimeout(this.hoverTimeout);
        this.state.hoverLink = null;

        // 触发点击开始事件
        this.emitEvent('navClickStart', {
            link: link,
            timestamp: new Date().toISOString(),
        });

        // 设置新的活动链接 - 统一管理状态
        this.setActiveState(link);

        // 触发导航链接点击事件（可用于页面导航）
        this.triggerNavigationEvent(link);
    }

    /**
     * 处理滚动事件 - 统一管理状态
     */
    handleScroll() {
        // 节流处理，避免频繁触发 - 统一管理状态
        const now = Date.now();
        if (now - this.lastScrollTime < this.config.scrollThrottle) return;
        this.lastScrollTime = now;

        // 根据滚动位置更新激活状态 - 统一管理状态
        if (!this.state.hoverLink) {
            this.updateActiveByScroll();
        }
    }

    /**
     * 处理页面可见性变化 - 统一管理状态
     */
    handleVisibilityChange() {
        // 页面重新可见时，同步所有状态 - 统一管理状态
        if (!document.hidden) {
            this.syncAllStates();

            // 触发页面可见性变化事件
            this.emitEvent('navVisibilityChange', {
                visible: true,
                timestamp: new Date().toISOString(),
            });
        }
    }

    /**
     * 设置活动状态 - 统一管理激活状态
     */
    setActiveState(link) {
        if (!link) return;

        // 如果链接已经是活动状态，不需要重复设置
        if (this.state.activeLink === link) return;

        // 清除之前活动链接的状态 - 统一管理激活状态
        if (this.state.activeLink) {
            this.stateMachine.transition(this.state.activeLink, this.stateMachine.states.INACTIVE);
            // 确保清除所有状态类
            this.updateLinkState(this.state.activeLink, {
                class: this.config.activeClass,
                dataState: 'inactive',
                remove: true,
            });
            // 清除悬停状态
            this.updateLinkState(this.state.activeLink, {
                class: this.config.hoverClass,
                dataState: 'inactive',
                remove: true,
            });
        }

        // 状态转换 - 统一管理激活状态
        this.stateMachine.transition(link, this.stateMachine.states.ACTIVE);

        // 更新状态
        this.state.activeLink = link;

        // 原子操作更新链接状态 - 确保下划线动画同步
        this.updateLinkState(link, {
            class: this.config.activeClass,
            dataState: 'active',
        });

        // 同步其他链接状态 - 确保只有一个激活状态
        this.syncOtherLinksState(link);

        // 触发活动状态设置事件
        this.emitEvent('navActiveStateSet', {
            link: link,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 清除活动状态 - 统一管理状态
     */
    clearActiveState(link) {
        // 使用状态机进行状态转换 - 统一管理状态
        this.stateMachine.transition(link, this.stateMachine.states.INACTIVE);

        this.updateLinkState(link, {
            class: this.config.activeClass,
            dataState: 'inactive',
            remove: true,
        });
    }

    /**
     * 设置悬停状态 - 统一管理悬停状态
     */
    setHoverState(link) {
        if (!link) return;

        // 如果是活动链接，不设置悬停状态
        if (link === this.state.activeLink) return;

        // 清除之前的悬停状态 - 确保同一时间只有一个悬停状态
        if (this.state.hoverLink && this.state.hoverLink !== link) {
            this.clearHoverState(this.state.hoverLink);
        }

        // 使用状态机进行状态转换 - 统一管理悬停状态
        this.stateMachine.transition(link, this.stateMachine.states.HOVER);

        // 更新状态
        this.state.hoverLink = link;

        // 原子操作更新链接状态 - 确保下划线动画同步
        this.updateLinkState(link, {
            class: this.config.hoverClass,
            dataState: 'hover-active',
        });

        // 触发悬停状态设置事件
        this.emitEvent('navHoverStateSet', {
            link: link,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 清除悬停状态 - 统一管理状态
     */
    clearHoverState(link) {
        if (!link) return;

        // 如果是活动链接，不清除悬停状态
        if (link === this.state.activeLink) return;

        // 状态转换 - 统一管理状态
        this.stateMachine.transition(link, this.stateMachine.states.INACTIVE);

        // 更新状态
        if (this.state.hoverLink === link) {
            this.state.hoverLink = null;
        }

        // 原子操作更新链接状态 - 确保下划线动画同步
        this.updateLinkState(link, {
            class: this.config.hoverClass,
            dataState: 'inactive',
            remove: true,
        });

        // 触发悬停状态清除事件
        this.emitEvent('navHoverStateCleared', {
            link: link,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 原子操作更新链接状态 - 统一管理状态
     */
    updateLinkState(link, options) {
        if (!link || !link.classList) return;

        // 使用requestAnimationFrame确保DOM更新在下一帧执行 - 统一管理状态
        requestAnimationFrame(() => {
            // 保存当前状态用于验证
            const previousState = {
                classList: Array.from(link.classList),
                dataState: link.getAttribute(this.config.dataStateAttr),
            };

            // 更新CSS类 - 统一管理状态
            if (options.class) {
                if (options.remove) {
                    link.classList.remove(options.class);
                } else {
                    link.classList.add(options.class);
                }
            }

            // 更新data-state属性 - 统一管理状态
            if (options.dataState) {
                link.setAttribute(this.config.dataStateAttr, options.dataState);
            }

            // 强制重排以确保下划线动画同步触发
            // 这确保了浏览器会立即重新计算样式，使下划线动画同步
            void link.offsetWidth;

            // 验证状态一致性 - 统一管理状态
            this.validateStateConsistency(link);

            // 触发链接状态更新事件
            this.emitEvent('navLinkStateUpdated', {
                link: link,
                options: options,
                previousState: previousState,
                timestamp: new Date().toISOString(),
            });
        });
    }

    /**
     * 验证状态一致性 - 统一管理状态
     */
    validateStateConsistency(link) {
        // 如果没有提供特定链接，验证所有链接 - 统一管理状态
        if (!link) {
            let allConsistent = true;
            this.navLinks.forEach(navLink => {
                if (!this.validateStateConsistency(navLink)) {
                    allConsistent = false;
                }
            });
            return allConsistent;
        }

        // 验证特定链接 - 统一管理状态
        if (!link || !link.classList) {
            console.warn('Invalid link provided to validateStateConsistency');
            return false;
        }

        const classState = link.classList.contains(this.config.activeClass) ? 'active' :
            link.classList.contains(this.config.hoverClass) ? 'hover-active' : 'inactive';
        const dataState = link.getAttribute(this.config.dataStateAttr) || 'inactive';

        // 如果状态不一致，记录警告并修复 - 统一管理状态
        if (classState !== dataState) {
            console.warn(`State inconsistency detected for link: ${link.textContent}, class: ${classState}, data: ${dataState}`);

            // 修复状态 - 优先使用class状态 - 统一管理状态
            link.setAttribute(this.config.dataStateAttr, classState);

            // 记录异常 - 统一管理状态
            this.recordAnomaly({
                type: 'state_inconsistency',
                link: link.textContent,
                classState,
                dataState,
                timestamp: new Date().toISOString(),
            });

            // 触发状态不一致事件 - 统一管理状态
            this.emitEvent('navStateInconsistency', {
                link: link,
                classState,
                dataState,
                timestamp: new Date().toISOString(),
            });

            return false;
        }

        return true;
    }

    /**
     * 同步其他链接状态 - 统一管理状态
     */
    syncOtherLinksState(activeLink) {
        if (!activeLink || !this.navLinks) return;

        this.navLinks.forEach(link => {
            if (link && link !== activeLink) {
                // 确保其他链接没有活动状态 - 统一管理状态
                if (link.classList.contains(this.config.activeClass)) {
                    this.clearActiveState(link);
                }

                // 确保其他链接没有悬停状态 - 统一管理状态
                if (link.classList.contains(this.config.hoverClass)) {
                    this.clearHoverState(link);
                }

                // 确保data-state属性一致 - 统一管理状态
                const dataState = link.getAttribute(this.config.dataStateAttr);
                if (dataState === 'active' || dataState === 'hover-active') {
                    link.setAttribute(this.config.dataStateAttr, 'inactive');
                }
            }
        });
    }

    /**
     * 同步所有链接状态 - 统一管理状态
     */
    syncAllStates() {
        this.navLinks.forEach(link => {
            this.validateStateConsistency(link);
        });

        // 触发状态同步完成事件 - 统一管理状态
        this.emitEvent('navStateSyncComplete', {
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 根据滚动位置更新活动状态 - 统一管理状态
     */
    updateActiveByScroll() {
        // 这里可以实现基于滚动位置的活动状态更新 - 统一管理状态
        // 例如，根据当前显示的页面部分来设置对应的导航链接为活动状态
        // 这是一个预留的扩展点
    }

    /**
     * 触发导航事件 - 统一管理状态
     */
    triggerNavigationEvent(link) {
        // 创建自定义事件 - 统一管理状态
        const event = new CustomEvent('navigationClick', {
            detail: {
                link: link,
                href: link.getAttribute('href'),
                text: link.textContent,
            },
            bubbles: true,
            cancelable: true,
        });

        // 触发事件 - 统一管理状态
        link.dispatchEvent(event);
    }

    /**
     * 记录异常 - 统一管理状态
     */
    recordAnomaly(anomaly) {
        // 获取现有异常记录 - 统一管理状态
        const anomalies = JSON.parse(localStorage.getItem('navAnomalies') || '[]');

        // 添加新异常 - 统一管理状态
        anomalies.push(anomaly);

        // 保存到本地存储 - 统一管理状态
        localStorage.setItem('navAnomalies', JSON.stringify(anomalies));

        // 触发异常记录事件 - 统一管理状态
        this.emitEvent('navAnomalyRecorded', {
            anomaly: anomaly,
            timestamp: new Date().toISOString(),
        });

        // 如果异常数量过多，可以发送到服务器进行分析 - 统一管理状态
        if (anomalies.length > 10) {
            this.reportAnomalies(anomalies);
            localStorage.removeItem('navAnomalies');
        }
    }

    /**
     * 报告异常 - 统一管理状态
     */
    reportAnomalies(anomalies) {
        // 这里可以实现异常报告逻辑 - 统一管理状态
        // 例如，发送到分析服务器或日志服务
        console.log('Reporting navigation anomalies:', anomalies);

        // 触发异常报告事件 - 统一管理状态
        this.emitEvent('navAnomaliesReported', {
            anomalies: anomalies,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 重置状态 - 统一管理状态
     */
    resetState() {
        this.state.activeLink = null;
        this.state.hoverLink = null;
        this.state.isHovering = false;
        this.state.isScrolling = false;
        this.state.lastScrollTop = 0;
        this.state.scrollTimeout = null;
        this.state.eventListeners.clear();
        this.state.anomalies = [];
        this.state.anomalyCount = 0;
        this.state.lastAnomalyReport = 0;

        // 清除所有链接状态 - 统一管理状态
        this.navLinks.forEach(link => {
            link.classList.remove(this.config.activeClass, this.config.hoverClass);
            link.removeAttribute(this.config.dataStateAttr);
        });

        // 清除本地存储中的异常记录 - 统一管理状态
        localStorage.removeItem('navAnomalies');

        this.emitEvent('navigationStateReset', { timestamp: Date.now() });
    }

    /**
     * 发送事件 - 统一管理状态
     */
    emitEvent(eventName, detail) {
        const event = new CustomEvent(eventName, {
            detail: detail,
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(event);
    }

    /**
     * 获取异常记录 - 统一管理状态
     */
    getAnomalies() {
        return JSON.parse(localStorage.getItem('navAnomalies') || '[]');
    }

    /**
     * 获取状态信息 - 统一管理状态
     */
    getStateInfo() {
        const stateInfo = {
            initialized: this.initialized,
            activeLink: this.state.activeLink ? this.state.activeLink.textContent : null,
            hoverLink: this.state.hoverLink ? this.state.hoverLink.textContent : null,
            links: [],
        };

        this.navLinks.forEach(link => {
            const classState = link.classList.contains(this.config.activeClass) ? 'active' :
                link.classList.contains(this.config.hoverClass) ? 'hover-active' : 'inactive';
            const dataState = link.getAttribute(this.config.dataStateAttr) || 'inactive';

            stateInfo.links.push({
                text: link.textContent,
                classState,
                dataState,
                consistent: classState === dataState,
            });
        });

        return stateInfo;
    }

    /**
     * 添加事件监听器 - 统一管理状态
     */
    addEventListener(eventName, callback) {
        if (!this.state.eventListeners.has(eventName)) {
            this.state.eventListeners.set(eventName, new Set());
        }

        this.state.eventListeners.get(eventName).add(callback);
        document.addEventListener(eventName, callback);
    }

    /**
     * 移除事件监听器 - 统一管理状态
     */
    removeEventListener(eventName, callback) {
        if (this.state.eventListeners.has(eventName)) {
            this.state.eventListeners.get(eventName).delete(callback);
            document.removeEventListener(eventName, callback);
        }
    }



    /**
     * 节流函数 - 统一管理状态
     */
    throttle(func, wait) {
        let timeout;
        let previous = 0;

        return function executedFunction(...args) {
            const now = Date.now();
            const remaining = wait - (now - previous);

            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                previous = now;
                func.apply(this, args);
            } else if (!timeout) {
                timeout = setTimeout(() => {
                    previous = Date.now();
                    timeout = null;
                    func.apply(this, args);
                }, remaining);
            }
        };
    }
}

// 导航状态管理器实例
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：创建导航状态管理器实例并初始化
// 依赖文件：无

const navStateManager = new NavigationStateManager();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    navStateManager.init();
});

// 导出导航状态管理器（供其他模块使用）
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：将导航状态管理器导出到全局作用域
// 依赖文件：无

window.NavigationStateManager = NavigationStateManager;
window.navStateManager = navStateManager;
window.NavigationStateMachine = NavigationStateMachine;