/**
 * 导航状态管理器 - 增强版
 * 实现状态机模式和事件系统，用于更严格的状态控制
 * 创建时间: 2025-09-21
 * 来源: 基于原有navigation-state-manager.js增强
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：提供增强版导航状态管理功能，包括状态机模式、事件系统和状态转换控制
// 依赖文件：navigation-constants.js, navigation-utils.js

import NavigationConstants from './navigation-constants';
import NavigationUtils from './navigation-utils';

// 导航状态机类 - 实现严格的状态转换
class EnhancedNavigationStateMachine {
    constructor(options = {}) {
        // 合并配置
        this.config = {
            ...NavigationConstants.DEFAULT_CONFIG,
            ...options,
        };
        
        // 使用统一的状态定义
        this.states = NavigationConstants.STATES;
        this.validTransitions = NavigationConstants.VALID_TRANSITIONS;

        // 存储所有导航按钮的当前状态
        this.buttonStates = new Map();
    }

    /**
     * 检查状态转换是否合法
     * @param {string} fromState - 源状态
     * @param {string} toState - 目标状态
     * @returns {boolean} - 转换是否合法
     */
    canTransition(fromState, toState) {
        if (!fromState || !this.validTransitions[fromState]) {
            console.warn(`Unknown source state: ${fromState}`);
            return false;
        }

        if (!toState || !this.validTransitions[fromState].includes(toState)) {
            console.warn(`Invalid target state: ${toState} from ${fromState}`);
            return false;
        }

        return true;
    }

    /**
     * 执行状态转换 - 统一管理，确保同一时间只有一个激活状态
     * @param {HTMLElement} button - 导航按钮元素
     * @param {string} newState - 新状态
     * @param {boolean} force - 是否强制转换，忽略转换规则
     * @returns {Promise<boolean>} - 转换是否成功
     */
    async transition(button, newState, force = false) {
        if (!button) {
            console.error('Button element is required for state transition');
            return false;
        }

        // 使用锁机制确保状态转换的原子性
        if (this._transitionLock) {
            // 如果已经有转换在进行中，将当前转换加入队列
            return new Promise((resolve) => {
                this._transitionQueue = this._transitionQueue || [];
                this._transitionQueue.push({ button, newState, force, resolve });
            });
        }

        this._transitionLock = true;

        try {
            // 将转换加入队列
            return await new Promise((resolve) => {
                requestAnimationFrame(async () => {
                    try {
                        const buttonId = this.getButtonId(button);
                        const currentState = this.buttonStates.get(buttonId) || this.states.INACTIVE;

                        // 如果状态相同且不是强制转换，则跳过
                        if (currentState === newState && !force) {
                            resolve(true);
                            return;
                        }

                        if (!force && !this.canTransition(currentState, newState)) {
                            console.warn(`Invalid state transition from ${currentState} to ${newState} for button ${buttonId}`);
                            resolve(false);
                            return;
                        }

                        // 如果是激活状态转换，先重置其他按钮的激活状态
                        if (newState === this.states.ACTIVE) {
                            await this.resetOtherButtons(button);
                        }

                        // 如果是悬停状态转换，确保同一时间只有一个悬停状态
                        if (newState === this.states.HOVER) {
                            await this.resetOtherHoverStates(button);
                        }

                        // 原子性状态更新
                        this.buttonStates.set(buttonId, newState);

                        // 触发状态转换事件
                        await new Promise(resolveEvent => {
                            requestAnimationFrame(() => {
                                this.emitStateChangeEvent(button, currentState, newState);
                                resolveEvent();
                            });
                        });

                        resolve(true);
                    } catch (error) {
                        console.error('Error during state transition:', error);
                        resolve(false);
                    }
                });
            });
        } finally {
            this._transitionLock = false;
            
            // 处理队列中的下一个转换请求
            if (this._transitionQueue && this._transitionQueue.length > 0) {
                const nextTransition = this._transitionQueue.shift();
                this.transition(nextTransition.button, nextTransition.newState, nextTransition.force)
                    .then(nextTransition.resolve);
            }
        }
    }

    /**
     * 获取按钮的当前状态
     * @param {HTMLElement} button - 导航按钮元素
     * @returns {string} - 当前状态
     */
    getState(button) {
        if (!button) {
            console.error('Button element is required to get state');
            return this.states.INACTIVE;
        }

        const buttonId = this.getButtonId(button);
        return this.buttonStates.get(buttonId) || this.states.INACTIVE;
    }

    /**
     * 重置所有按钮状态
     */
    resetAll() {
        this.buttonStates.clear();
        this.emitStateResetEvent();
    }

    /**
     * 重置其他按钮的激活状态
     * @param {HTMLElement} excludeButton - 要排除的按钮
     * @returns {Promise<void>}
     */
    async resetOtherButtons(excludeButton) {
        const excludeId = this.getButtonId(excludeButton);
        
        const promises = Array.from(this.buttonStates.entries())
            .filter(([buttonId, state]) => 
                buttonId !== excludeId && state === this.states.ACTIVE,
            )
            .map(async ([buttonId]) => {
                this.buttonStates.set(buttonId, this.states.INACTIVE);
                const button = this.findButtonById(buttonId);
                if (button) {
                    await new Promise(resolve => {
                        requestAnimationFrame(() => {
                            this.emitStateChangeEvent(button, this.states.ACTIVE, this.states.INACTIVE);
                            resolve();
                        });
                    });
                }
            });

        await Promise.all(promises);
    }

    /**
     * 重置其他按钮的悬停状态 - 统一管理悬停状态
     * @param {HTMLElement} excludeButton - 要排除的按钮
     * @returns {Promise<void>}
     */
    async resetOtherHoverStates(excludeButton) {
        const excludeId = this.getButtonId(excludeButton);
        const promises = [];

        for (const [buttonId, state] of this.buttonStates.entries()) {
            if (buttonId !== excludeId && state === this.states.HOVER) {
                this.buttonStates.set(buttonId, this.states.INACTIVE);
                const button = this.findButtonById(buttonId);
                if (button) {
                    promises.push(new Promise(resolve => {
                        requestAnimationFrame(() => {
                            this.emitStateChangeEvent(button, this.states.HOVER, this.states.INACTIVE);
                            resolve();
                        });
                    }));
                }
            }
        }

        await Promise.all(promises);
    }

    /**
     * 根据ID查找按钮元素
     * @param {string} buttonId - 按钮ID
     * @returns {HTMLElement|null} - 按钮元素
     */
    findButtonById(buttonId) {
        if (!buttonId) return null;
        
        const buttons = document.querySelectorAll(this.config.navSelector);
        return Array.from(buttons).find(
            button => this.getButtonId(button) === buttonId,
        ) || null;
    }

    /**
     * 获取按钮ID
     * @param {HTMLElement} button - 导航按钮元素
     * @returns {string} - 按钮ID
     */
    getButtonId(button) {
        return button.id || button.textContent.trim() || button.getAttribute('href') || 'unknown';
    }

    /**
     * 触发状态转换事件
     * @param {HTMLElement} button - 导航按钮元素
     * @param {string} fromState - 源状态
     * @param {string} toState - 目标状态
     */
    emitStateChangeEvent(button, fromState, toState) {
        const event = new CustomEvent('navStateChange', {
            detail: {
                button: button,
                buttonId: this.getButtonId(button),
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
    emitStateResetEvent() {
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

// 导航事件系统类
class NavigationEventSystem {
    constructor() {
        // 事件监听器存储
        this.eventListeners = new Map();

        // 事件队列
        this.eventQueue = [];

        // 是否正在处理事件
        this.isProcessing = false;
    }

    /**
     * 添加事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    addListener(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }

        this.eventListeners.get(eventName).add(callback);

        // 添加到DOM事件监听
        document.addEventListener(eventName, callback);
    }

    /**
     * 移除事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    removeListener(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).delete(callback);
            document.removeEventListener(eventName, callback);
        }
    }

    /**
     * 触发事件
     * @param {string} eventName - 事件名称
     * @param {Object} detail - 事件详情
     */
    emit(eventName, detail = {}) {
        const event = {
            name: eventName,
            detail: {
                ...detail,
                timestamp: new Date().toISOString(),
            },
        };

        // 添加到事件队列
        this.eventQueue.push(event);

        // 如果没有正在处理事件，开始处理
        if (!this.isProcessing) {
            this.processEventQueue();
        }
    }

    /**
     * 处理事件队列
     */
    async processEventQueue() {
        if (this.isProcessing || this.eventQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();

            try {
                // 创建自定义事件
                const customEvent = new CustomEvent(event.name, {
                    detail: event.detail,
                    bubbles: true,
                    cancelable: true,
                });

                // 触发DOM事件
                document.dispatchEvent(customEvent);

                // 调用注册的监听器
                if (this.eventListeners.has(event.name)) {
                    const listeners = this.eventListeners.get(event.name);
                    for (const listener of listeners) {
                        try {
                            listener(customEvent);
                        } catch (error) {
                            console.error(`Error in event listener for ${event.name}:`, error);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error processing event ${event.name}:`, error);
            }
        }

        this.isProcessing = false;
    }

    /**
     * 清除所有事件监听器
     */
    clearAllListeners() {
        for (const [eventName, listeners] of this.eventListeners.entries()) {
            for (const listener of listeners) {
                document.removeEventListener(eventName, listener);
            }
        }

        this.eventListeners.clear();
    }
}

// 导航状态管理器 - 增强版
class EnhancedNavigationStateManager {
    constructor(options = {}) {
        // 单例模式
        if (EnhancedNavigationStateManager.instance) {
            return EnhancedNavigationStateManager.instance;
        }

        EnhancedNavigationStateManager.instance = this;

        // 配置选项
        this.config = {
            navSelector: options.navSelector || '.main-nav .nav-link-luxury',
            activeClass: options.activeClass || 'active',
            hoverClass: options.hoverClass || 'hover-active',
            disabledClass: options.disabledClass || 'disabled',
            dataStateAttr: options.dataStateAttr || 'data-state',
            transitionDuration: options.transitionDuration || 300,
            debugMode: options.debugMode || false,
            pointerLeaveThrottle: 50, // 指针离开事件节流时间（毫秒）
        };

        // 状态机
        this.stateMachine = new EnhancedNavigationStateMachine();

        // 事件系统
        this.eventSystem = new NavigationEventSystem();

        // 内部状态
        this.state = {
            initialized: false,
            activeButton: null,
            hoverButton: null,
            isTransitioning: false,
            navigationHistory: [],
            lastInteractionTime: null,
        };

        // 导航按钮集合
        this.navButtons = new Set();

        // 初始化日志
        this.log('EnhancedNavigationStateManager initialized');
    }

    /**
 * 初始化导航状态管理器
 */
init() {
    if (this.state.initialized) {
        this.log('NavigationStateManager already initialized');
        return;
    }

    // 初始化状态处理标志
    this.isProcessingClick = false;
    this.isProcessingHover = false;
    
    // 初始化状态转换锁和队列
    this._transitionLock = false;
    this._transitionQueue = [];
    
    // 初始化点击队列
    this._clickQueue = [];
    this._isProcessingClickQueue = false;

    // 获取所有导航按钮
    this.findNavButtons();

    // 初始化节流函数
    this.throttledPointerLeave = this.throttle(this.handlePointerLeaveInternal.bind(this), this.config.pointerLeaveThrottle);

    // 设置事件系统
    this.setupEventSystem();

    // 设置初始状态
    this.setupInitialState();

    // 绑定事件监听器
    this.bindEventListeners();

    // 标记为已初始化
    this.state.initialized = true;

    // 触发初始化完成事件
    this.eventSystem.emit('navInitialized', {
        buttonCount: this.navButtons.size,
    });

    this.log('NavigationStateManager initialized successfully');
}

    /**
     * 查找所有导航按钮
     */
    findNavButtons() {
        const buttons = document.querySelectorAll(this.config.navSelector);
        buttons.forEach(button => {
            this.navButtons.add(button);

            // 初始化状态机中的按钮状态
            const isActive = button.classList.contains(this.config.activeClass);
            const initialState = isActive ?
                this.stateMachine.states.ACTIVE :
                this.stateMachine.states.INACTIVE;

            this.stateMachine.buttonStates.set(
                this.stateMachine.getButtonId(button),
                initialState,
            );

            // 设置data-state属性
            button.setAttribute(this.config.dataStateAttr, initialState);
        });

        this.log(`Found ${buttons.length} navigation buttons`);
    }

    /**
     * 设置事件系统
     */
    setupEventSystem() {
        // 添加内部事件监听器
        this.eventSystem.addListener('navStateChange', this.handleStateChange.bind(this));
        this.eventSystem.addListener('navButtonClick', this.handleButtonClick.bind(this));
        this.eventSystem.addListener('navButtonHover', this.handleButtonHover.bind(this));
        this.eventSystem.addListener('navStateReset', this.handleStateReset.bind(this));
    }

    /**
     * 设置初始状态
     */
    setupInitialState() {
        // 查找当前活动按钮
        const activeButton = Array.from(this.navButtons).find(button =>
            button.classList.contains(this.config.activeClass),
        );

        if (activeButton) {
            this.state.activeButton = activeButton;
            this.stateMachine.transition(activeButton, this.stateMachine.states.ACTIVE);

            // 添加到导航历史
            this.addToNavigationHistory(activeButton);
        }

        this.log('Initial state setup completed');
    }

    /**
     * 绑定事件监听器
     */
    bindEventListeners() {
        // 为每个导航按钮绑定事件
        this.navButtons.forEach(button => {
            // 鼠标进入事件
            button.addEventListener('mouseenter', (e) => {
                this.handlePointerEnter(e.target);
            });

            // 鼠标离开事件
            button.addEventListener('mouseleave', (e) => {
                this.handlePointerLeave(e.target);
            });

            // 点击事件
            button.addEventListener('click', (e) => {
                this.handleClick(e.target);
                e.preventDefault();
            });

            // 触摸事件（移动设备）
            button.addEventListener('touchstart', (e) => {
                this.handleTouchStart(e.target);
            }, { passive: true });
        });

        // 页面滚动事件
        window.addEventListener('scroll', this.throttle(() => {
            this.handleScroll();
        }, 100));

        // 页面可见性变化事件
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.syncAllStates();
            }
        });

        this.log('Event listeners bound successfully');
    }

    /**
     * 处理状态变化
     * @param {CustomEvent} event - 状态变化事件
     */
    handleStateChange(event) {
        const { button, fromState, toState } = event.detail;

        if (!button) return;

        // 更新按钮样式
        this.updateButtonStyle(button, fromState, toState);

        // 记录状态变化
        this.log(`State changed from ${fromState} to ${toState} for button ${this.stateMachine.getButtonId(button)}`);

        // 如果是活动状态变化，更新内部状态
        if (toState === this.stateMachine.states.ACTIVE) {
            this.state.activeButton = button;
            this.addToNavigationHistory(button);
        } else if (fromState === this.stateMachine.states.ACTIVE) {
            this.state.activeButton = null;
        }

        // 更新最后交互时间
        this.state.lastInteractionTime = Date.now();
    }

    /**
     * 处理按钮点击
     * @param {CustomEvent} event - 按钮点击事件
     */
    handleButtonClick(event) {
        const { button } = event.detail;

        if (!button) return;

        // 如果正在过渡中，忽略点击
        if (this.state.isTransitioning) {
            this.log('Ignoring click during transition');
            return;
        }

        // 设置过渡状态
        this.state.isTransitioning = true;

        // 清除之前的活动按钮状态
        if (this.state.activeButton && this.state.activeButton !== button) {
            this.stateMachine.transition(this.state.activeButton, this.stateMachine.states.INACTIVE);
        }

        // 设置新的活动按钮状态
        this.stateMachine.transition(button, this.stateMachine.states.ACTIVE);

        // 触发导航事件
        this.triggerNavigationEvent(button);

        // 过渡结束
        setTimeout(() => {
            this.state.isTransitioning = false;

            // 触发活动状态变更完成事件
            this.eventSystem.emit('navActiveStateChangeComplete', {
                activeButton: button,
            });
        }, this.config.transitionDuration);
    }

    /**
     * 处理按钮悬停
     * @param {CustomEvent} event - 按钮悬停事件
     */
    handleButtonHover(event) {
        const { button, isHovering } = event.detail;

        if (!button) return;

        // 如果是活动按钮，不处理悬停状态
        if (button === this.state.activeButton) return;

        if (isHovering) {
            this.stateMachine.transition(button, this.stateMachine.states.HOVER);
            this.state.hoverButton = button;
        } else {
            this.stateMachine.transition(button, this.stateMachine.states.INACTIVE);
            this.state.hoverButton = null;
        }
    }

    /**
     * 处理状态重置
     * @param {CustomEvent} event - 状态重置事件
     */
    handleStateReset(event) {
        this.log('State reset event received');

        // 重置内部状态
        this.state.hoverButton = null;

        // 重置所有非活动按钮的状态
        this.navButtons.forEach(button => {
            if (button !== this.state.activeButton) {
                this.stateMachine.transition(button, this.stateMachine.states.INACTIVE);
            }
        });

        // 同步所有状态
        this.syncAllStates();
    }

    /**
     * 处理鼠标进入
     * @param {HTMLElement} button - 导航按钮
     */
    handlePointerEnter(button) {
        if (!button || button.classList.contains(this.config.disabledClass)) return;

        // 防止重复处理
        if (this.isProcessingHover) {
            return;
        }

        this.isProcessingHover = true;

        // 使用防抖函数处理悬停
        this.throttle(() => {
            try {
                // 检查当前状态是否一致
                const currentState = this.stateMachine.getState(button);
                const classState = button.classList.contains(this.config.activeClass) ? this.stateMachine.states.ACTIVE :
                    button.classList.contains(this.config.hoverClass) ? this.stateMachine.states.HOVER :
                        button.classList.contains(this.config.disabledClass) ? this.stateMachine.states.DISABLED :
                            this.stateMachine.states.INACTIVE;

                // 如果状态不一致，先修复状态
                if (currentState !== classState) {
                    console.warn(`State inconsistency detected before hover: ${currentState} vs ${classState}`);
                    this.attemptStateRepair(button, classState);
                }

                // 如果按钮已经是活动状态，则不执行任何操作
                if (currentState === this.stateMachine.states.ACTIVE) {
                    this.isProcessingHover = false;
                    return;
                }

                // 设置新的悬停状态
                this.setHoverState(button);

                // 确保状态一致性
                this.syncAllStates();

                // 触发悬停事件
                this.eventSystem.emit('navButtonHover', {
                    button: button,
                    isHovering: true,
                    timestamp: new Date().toISOString(),
                });
            } catch (error) {
                console.error('Error handling pointer enter:', error);
                
                // 记录异常
                this.recordAnomaly({
                    type: 'hover_error',
                    button: button.textContent,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                });

                // 尝试恢复状态
                this.syncAllStates();
            } finally {
                // 重置处理标志
                setTimeout(() => {
                    this.isProcessingHover = false;
                }, this.config.transitionDuration + 50);
            }
        }, this.config.debounceDelay || 100)();
    }

    /**
     * 处理鼠标离开
     * @param {HTMLElement} button - 导航按钮
     */
    handlePointerLeave(button) {
        if (!button) return;

        // 防止重复处理
        if (this.isProcessingHover) {
            return;
        }

        this.isProcessingHover = true;

        // 使用防抖函数处理离开
        this.throttle(() => {
            try {
                // 检查当前状态是否一致
                const currentState = this.stateMachine.getState(button);
                const classState = button.classList.contains(this.config.activeClass) ? this.stateMachine.states.ACTIVE :
                    button.classList.contains(this.config.hoverClass) ? this.stateMachine.states.HOVER :
                        button.classList.contains(this.config.disabledClass) ? this.stateMachine.states.DISABLED :
                            this.stateMachine.states.INACTIVE;

                // 如果状态不一致，先修复状态
                if (currentState !== classState) {
                    console.warn(`State inconsistency detected before leave: ${currentState} vs ${classState}`);
                    this.attemptStateRepair(button, classState);
                }

                // 如果按钮是活动状态，则不执行任何操作
                if (currentState === this.stateMachine.states.ACTIVE) {
                    this.isProcessingHover = false;
                    return;
                }

                // 清除悬停状态
                this.clearHoverState();

                // 确保状态一致性
                this.syncAllStates();

                // 触发离开事件
                this.eventSystem.emit('navButtonHover', {
                    button: button,
                    isHovering: false,
                    timestamp: new Date().toISOString(),
                });
            } catch (error) {
                console.error('Error handling pointer leave:', error);
                
                // 记录异常
                this.recordAnomaly({
                    type: 'leave_error',
                    button: button.textContent,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                });

                // 尝试恢复状态
                this.syncAllStates();
            } finally {
                // 重置处理标志
                setTimeout(() => {
                    this.isProcessingHover = false;
                }, this.config.transitionDuration + 50);
            }
        }, this.config.debounceDelay || 100)();
    }

    /**
     * 处理鼠标离开的内部方法（节流化）
     * @param {HTMLElement} button - 导航按钮
     */
    handlePointerLeaveInternal(button) {
        this.eventSystem.emit('navButtonHover', {
            button: button,
            isHovering: false,
        });
    }

    /**
     * 处理点击事件
     * @param {Event} event - 点击事件
     */
    /**
     * 处理快速点击状态转换
     * @param {HTMLElement} button - 导航按钮
     * @returns {Promise<boolean>} - 转换是否成功
     */
    async handleRapidClickTransition(button) {
        if (!button) return false;
        
        // 使用锁机制确保原子性操作
        if (this._rapidClickLock) {
            return new Promise(resolve => {
                this._rapidClickQueue = this._rapidClickQueue || [];
                this._rapidClickQueue.push({ button, resolve });
            });
        }
        
        this._rapidClickLock = true;
        
        try {
            // 1. 检查状态一致性
            const isInconsistent = await this.detectAndFixRapidClickInconsistency(button);
            if (isInconsistent) {
                console.warn('Fixed state inconsistency before rapid click transition');
            }
            
            // 2. 获取当前状态快照
            const initialState = this.stateMachine.getState(button);
            
            // 3. 清除其他按钮的active状态 (原子操作)
            await this.resetOtherActiveButtons(button);
            
            // 4. 执行状态转换 (原子操作)
            const result = await this.stateMachine.transition(
                button, 
                this.stateMachine.states.ACTIVE,
            );
            
            // 5. 严格验证状态一致性
            const finalState = this.stateMachine.getState(button);
            if (finalState !== this.stateMachine.states.ACTIVE) {
                console.error(`State transition failed: expected ACTIVE but got ${finalState}`);
                await this.attemptStateRepair(button, initialState);
                return false;
            }
            
            // 6. 验证DOM状态一致性
            if (!this.validateStateConsistency(button)) {
                console.error('DOM state inconsistency detected after transition');
                await this.syncAllStates();
                return false;
            }
            
            return result;
        } finally {
            this._rapidClickLock = false;
            
            // 处理队列中的下一个请求
            if (this._rapidClickQueue?.length > 0) {
                const next = this._rapidClickQueue.shift();
                this.handleRapidClickTransition(next.button).then(next.resolve);
            }
        }
    }

    /**
     * 重置其他活动按钮状态 (原子操作)
     * @param {HTMLElement} excludeButton - 要排除的按钮
     * @returns {Promise<void>}
     */
    async resetOtherActiveButtons(excludeButton) {
        return new Promise((resolve) => {
            requestAnimationFrame(async () => {
                const excludeId = this.stateMachine.getButtonId(excludeButton);
                const activeButtons = [];
                
                // 1. 收集所有需要重置的按钮
                for (const [buttonId, state] of this.stateMachine.buttonStates.entries()) {
                    if (buttonId !== excludeId && state === this.stateMachine.states.ACTIVE) {
                        const button = this.stateMachine.findButtonById(buttonId);
                        if (button) {
                            activeButtons.push(button);
                        }
                    }
                }
                
                // 2. 原子性更新状态机
                for (const button of activeButtons) {
                    this.stateMachine.buttonStates.set(
                        this.stateMachine.getButtonId(button),
                        this.stateMachine.states.INACTIVE,
                    );
                }
                
                // 3. 批量更新DOM (单次重绘)
                await new Promise((domResolve) => {
                    requestAnimationFrame(() => {
                        for (const button of activeButtons) {
                            this.updateButtonStyle(
                                button, 
                                this.stateMachine.states.ACTIVE,
                                this.stateMachine.states.INACTIVE,
                            );
                        }
                        domResolve();
                    });
                });
                
                resolve();
            });
        });
    }

    /**
     * 增强版快速点击状态转换处理
     */
    async handleRapidClickTransition(button) {
        if (!button) return false;
        
        // 使用锁机制确保原子性操作
        if (this._rapidClickLock) {
            return new Promise(resolve => {
                this._rapidClickQueue = this._rapidClickQueue || [];
                this._rapidClickQueue.push({ button, resolve });
            });
        }
        
        this._rapidClickLock = true;
        
        try {
            // 1. 获取当前状态快照
            const initialState = this.stateMachine.getState(button);
            
            // 2. 检查并修复状态不一致
            const isInconsistent = await this.detectAndFixRapidClickInconsistency(button);
            if (isInconsistent) {
                console.warn('Fixed state inconsistency before rapid click transition');
            }
            
            // 3. 原子性清除其他按钮的active状态
            await this.resetOtherActiveButtons(button);
            
            // 4. 执行状态转换 (原子操作)
            const result = await this.stateMachine.transition(
                button, 
                this.stateMachine.states.ACTIVE,
            );
            
            // 5. 严格验证状态一致性
            const finalState = this.stateMachine.getState(button);
            if (finalState !== this.stateMachine.states.ACTIVE) {
                console.error(`State transition failed: expected ACTIVE but got ${finalState}`);
                await this.attemptStateRepair(button, initialState);
                return false;
            }
            
            // 6. 验证DOM状态一致性
            if (!this.validateStateConsistency(button)) {
                console.error('DOM state inconsistency detected after transition');
                await this.syncAllStates();
                return false;
            }
            
            return result;
        } finally {
            this._rapidClickLock = false;
            
            // 处理队列中的下一个请求
            if (this._rapidClickQueue?.length > 0) {
                const next = this._rapidClickQueue.shift();
                this.handleRapidClickTransition(next.button).then(next.resolve);
            }
        }
    }

    /**
     * 原子性重置其他活动按钮状态
     */
    async resetOtherActiveButtons(excludeButton) {
        return new Promise((resolve) => {
            requestAnimationFrame(async () => {
                const excludeId = this.stateMachine.getButtonId(excludeButton);
                const activeButtons = [];
                
                // 1. 收集所有需要重置的按钮
                for (const [buttonId, state] of this.stateMachine.buttonStates.entries()) {
                    if (buttonId !== excludeId && state === this.stateMachine.states.ACTIVE) {
                        const button = this.stateMachine.findButtonById(buttonId);
                        if (button) {
                            activeButtons.push(button);
                        }
                    }
                }
                
                // 2. 原子性更新状态机
                for (const button of activeButtons) {
                    this.stateMachine.buttonStates.set(
                        this.stateMachine.getButtonId(button),
                        this.stateMachine.states.INACTIVE,
                    );
                }
                
                // 3. 批量更新DOM (单次重绘)
                await new Promise((domResolve) => {
                    requestAnimationFrame(() => {
                        for (const button of activeButtons) {
                            this.updateButtonStyle(
                                button, 
                                this.stateMachine.states.ACTIVE,
                                this.stateMachine.states.INACTIVE,
                            );
                        }
                        domResolve();
                    });
                });
                
                resolve();
            });
        });
    }

    /**
     * 严格状态一致性验证
     */
    validateStateConsistency(button) {
        // 获取三种状态表示
        const classState = button.classList.contains(this.config.activeClass) ? 'active-state' :
            button.classList.contains(this.config.hoverClass) ? 'hover-state' :
                button.classList.contains(this.config.disabledClass) ? 'disabled' : 'inactive';
        
        const dataState = button.getAttribute(this.config.dataStateAttr) || 'inactive';
        const machineState = this.stateMachine.getState(button);
        
        // 检查三种状态是否完全一致
        if (classState !== dataState || classState !== machineState) {
            console.error(`State inconsistency detected: 
                class=${classState}, data=${dataState}, machine=${machineState}`);
            
            // 自动修复策略：优先使用状态机状态
            const targetState = machineState || classState || dataState;
            
            // 批量修复状态
            requestAnimationFrame(() => {
                // 更新DOM状态
                if (classState !== targetState) {
                    this.updateButtonStyle(button, classState, targetState);
                }
                
                // 更新data属性
                if (dataState !== targetState) {
                    button.setAttribute(this.config.dataStateAttr, targetState);
                }
            });
            
            return false;
        }
        
        return true;
    }

    handleClick(event) {
        const button = event.currentTarget || event.target;
        if (!button || button.classList.contains(this.config.disabledClass)) return;

        // 使用增强版快速点击处理方法
        this.handleRapidClickTransition(button).then(success => {
            if (success) {
                this.triggerNavigationEvent(button);
                this.addToNavigationHistory(button);
            }
        });
    }
    
    /**
     * 处理点击队列
     */
    async processClickQueue() {
        if (this.isProcessingClick || this._clickQueue.length === 0) {
            return;
        }
        
        this.isProcessingClick = true;
        
        try {
            const button = this._clickQueue.shift();
            
            // 使用requestAnimationFrame确保DOM更新同步
            await new Promise(resolve => {
                requestAnimationFrame(async () => {
                    try {
                        // 检查当前状态是否一致
                        const currentState = this.stateMachine.getState(button);
                        const classState = button.classList.contains(this.config.activeClass) ? this.stateMachine.states.ACTIVE :
                            button.classList.contains(this.config.hoverClass) ? this.stateMachine.states.HOVER :
                                button.classList.contains(this.config.disabledClass) ? this.stateMachine.states.DISABLED :
                                    this.stateMachine.states.INACTIVE;

                        // 如果状态不一致，先修复状态
                        if (currentState !== classState) {
                            console.warn(`State inconsistency detected before click: ${currentState} vs ${classState}`);
                            await this.attemptStateRepair(button, classState);
                        }

                        // 如果按钮已经是活动状态，则不执行任何操作
                        if (currentState === this.stateMachine.states.ACTIVE) {
                            resolve();
                            return;
                        }

                        // 清除所有悬停状态
                        await this.clearHoverState();

                        // 设置新的活动状态
                        await this.setActiveState(button);

                        // 确保状态一致性
                        await this.syncAllStates();

                        // 触发点击事件
                        this.eventSystem.emit('navClick', {
                            button: button,
                            state: this.stateMachine.states.ACTIVE,
                            timestamp: new Date().toISOString(),
                        });
                        
                        resolve();
                    } catch (error) {
                        console.error('Error handling click:', error);
                        
                        // 记录异常
                        this.recordAnomaly({
                            type: 'click_error',
                            button: button.textContent,
                            error: error.message,
                            timestamp: new Date().toISOString(),
                        });

                        // 尝试恢复状态
                        await this.syncAllStates();
                        resolve();
                    }
                });
            });
        } finally {
            // 重置处理标志
            setTimeout(() => {
                this.isProcessingClick = false;
                
                // 处理队列中的下一个点击
                if (this._clickQueue.length > 0) {
                    this.processClickQueue();
                }
            }, this.config.transitionDuration + 50);
        }
    }

    /**
     * 设置活动状态
     * @param {HTMLElement} button - 导航按钮
     * @returns {Promise<void>}
     */
    async setActiveState(button) {
        if (!button) return;

        // 清除所有活动状态
        await this.clearActiveState();

        // 设置新的活动状态
        await this.stateMachine.transition(button, this.stateMachine.states.ACTIVE);
        
        // 使用requestAnimationFrame确保DOM更新同步
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                this.updateButtonStyle(button, this.stateMachine.states.INACTIVE, this.stateMachine.states.ACTIVE);
                this.state.activeButton = button;
                
                // 验证状态一致性
                this.validateStateConsistency(button);
                
                resolve();
            });
        });

        // 触发状态变化事件
        this.eventSystem.emit('navStateChange', {
            button: button,
            fromState: this.stateMachine.states.INACTIVE,
            toState: this.stateMachine.states.ACTIVE,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 清除活动状态
     * @returns {Promise<void>}
     */
    async clearActiveState() {
        if (this.state.activeButton) {
            const activeButton = this.state.activeButton;
            
            // 使用状态机进行转换
            await this.stateMachine.transition(activeButton, this.stateMachine.states.INACTIVE);
            
            // 使用requestAnimationFrame确保DOM更新同步
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    this.updateButtonStyle(activeButton, this.stateMachine.states.ACTIVE, this.stateMachine.states.INACTIVE);
                    this.state.activeButton = null;
                    resolve();
                });
            });
        }
    }

    /**
     * 设置悬停状态
     * @param {HTMLElement} button - 导航按钮
     */
    setHoverState(button) {
        if (!button || button === this.state.activeButton) return;

        // 清除所有悬停状态
        this.clearHoverState();

        // 设置新的悬停状态
        this.stateMachine.transition(button, this.stateMachine.states.HOVER);
        this.updateButtonStyle(button, this.stateMachine.states.INACTIVE, this.stateMachine.states.HOVER);
        this.state.hoverButton = button;

        // 触发状态变化事件
        this.eventSystem.emit('navStateChange', {
            button: button,
            fromState: this.stateMachine.states.INACTIVE,
            toState: this.stateMachine.states.HOVER,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 清除悬停状态
     */
    clearHoverState() {
        if (this.state.hoverButton) {
            this.stateMachine.transition(this.state.hoverButton, this.stateMachine.states.INACTIVE);
            this.updateButtonStyle(this.state.hoverButton, this.stateMachine.states.HOVER, this.stateMachine.states.INACTIVE);
            this.state.hoverButton = null;
        }
    }

    /**
     * 处理触摸开始
     * @param {HTMLElement} button - 导航按钮
     */
    handleTouchStart(button) {
        // 在移动设备上，触摸可以视为悬停
        this.handlePointerEnter(button);

        // 设置超时清除悬停状态
        setTimeout(() => {
            this.handlePointerLeave(button);
        }, 1000);
    }

    /**
     * 处理滚动
     */
    handleScroll() {
        // 可以根据滚动位置更新活动状态
        // 这是一个预留的扩展点
        this.updateActiveByScroll();
    }

    /**
     * 更新按钮样式
     * @param {HTMLElement} button - 导航按钮
     * @param {string} fromState - 源状态
     * @param {string} toState - 目标状态
     */
    updateButtonStyle(button, fromState, toState) {
        if (!button || !button.classList) {
            console.warn('Invalid button provided to updateButtonStyle');
            return;
        }
        
        // 原子性更新DOM
        const updateDOM = () => {
            // 移除源状态样式
            switch (fromState) {
                case this.stateMachine.states.ACTIVE:
                    button.classList.remove(this.config.activeClass);
                    break;
                case this.stateMachine.states.HOVER:
                    button.classList.remove(this.config.hoverClass);
                    break;
                case this.stateMachine.states.DISABLED:
                    button.classList.remove(this.config.disabledClass);
                    break;
            }

            // 添加目标状态样式
            switch (toState) {
                case this.stateMachine.states.ACTIVE:
                    button.classList.add(this.config.activeClass);
                    break;
                case this.stateMachine.states.HOVER:
                    button.classList.add(this.config.hoverClass);
                    break;
                case this.stateMachine.states.DISABLED:
                    button.classList.add(this.config.disabledClass);
                    break;
            }

            // 更新data-state属性
            button.setAttribute(this.config.dataStateAttr, toState);
        };

        // 使用requestAnimationFrame确保DOM更新在下一帧执行
        if (window.requestAnimationFrame) {
            requestAnimationFrame(() => {
                updateDOM();
                // 验证状态一致性
                this.validateStateConsistency(button);
            });
        } else {
            // 降级处理
            updateDOM();
            // 验证状态一致性
            this.validateStateConsistency(button);
        }
    }

    /**
     * 严格验证状态一致性
     * @param {HTMLElement} button - 导航按钮（可选，如果不提供则验证所有按钮）
     * @returns {boolean} - 状态是否一致
     */
    validateStateConsistency(button) {
        // 如果没有提供按钮，验证所有按钮
        if (!button) {
            let allConsistent = true;
            this.navButtons.forEach(btn => {
                if (!this.validateStateConsistency(btn)) {
                    allConsistent = false;
                }
            });
            return allConsistent;
        }

        if (!button || !button.classList) {
            console.warn('Invalid button provided to validateStateConsistency');
            return false;
        }

        // 获取三种状态表示
        const classState = button.classList.contains(this.config.activeClass) ? this.stateMachine.states.ACTIVE :
            button.classList.contains(this.config.hoverClass) ? this.stateMachine.states.HOVER :
                button.classList.contains(this.config.disabledClass) ? this.stateMachine.states.DISABLED :
                    this.stateMachine.states.INACTIVE;

        const dataState = button.getAttribute(this.config.dataStateAttr) || this.stateMachine.states.INACTIVE;
        const machineState = this.stateMachine.getState(button);

        // 检查三种状态是否完全一致
        if (classState !== dataState || classState !== machineState || dataState !== machineState) {
            console.error(`State inconsistency detected for button: ${button.textContent}, 
                class: ${classState}, data: ${dataState}, machine: ${machineState}`);

            // 自动修复策略：优先使用状态机状态
            const targetState = machineState || classState || dataState;
            
            // 批量修复状态
            requestAnimationFrame(() => {
                // 更新DOM状态
                if (classState !== targetState) {
                    this.updateButtonStyle(button, classState, targetState);
                }
                
                // 更新data属性
                if (dataState !== targetState) {
                    button.setAttribute(this.config.dataStateAttr, targetState);
                }
                
                // 记录异常
                this.recordAnomaly({
                    type: 'strict_state_inconsistency',
                    button: button.textContent,
                    classState,
                    dataState,
                    machineState,
                    resolvedState: targetState,
                    timestamp: new Date().toISOString(),
                });

                // 触发严格状态不一致事件
                this.eventSystem.emit('navStrictStateInconsistency', {
                    button: button,
                    classState,
                    dataState,
                    machineState,
                    resolvedState: targetState,
                    timestamp: new Date().toISOString(),
                });
            });

            return false;
        }

        return true;
    }

    /**
     * 尝试修复状态不一致问题
     * @param {HTMLElement} button - 导航按钮
     * @param {string} targetState - 目标状态
     * @returns {Promise<void>}
     */
    async attemptStateRepair(button, targetState) {
        if (!button || !targetState) return;

        // 确保状态机中的状态与DOM状态一致
        const currentState = this.stateMachine.getState(button);
        if (currentState !== targetState) {
            await this.stateMachine.transition(button, targetState, true); // 强制转换
        }

        // 使用requestAnimationFrame确保DOM更新同步
        await new Promise(resolve => {
            requestAnimationFrame(async () => {
                // 确保内部状态与DOM状态一致
                if (targetState === this.stateMachine.states.ACTIVE && this.state.activeButton !== button) {
                    // 如果有其他活动按钮，先清除其状态
                    if (this.state.activeButton && this.state.activeButton !== button) {
                        await this.stateMachine.transition(this.state.activeButton, this.stateMachine.states.INACTIVE, true);
                        this.updateButtonStyle(this.state.activeButton, this.stateMachine.states.ACTIVE, this.stateMachine.states.INACTIVE);
                    }
                    this.state.activeButton = button;
                } else if (targetState === this.stateMachine.states.HOVER && this.state.hoverButton !== button) {
                    // 如果有其他悬停按钮，先清除其状态
                    if (this.state.hoverButton && this.state.hoverButton !== button) {
                        await this.stateMachine.transition(this.state.hoverButton, this.stateMachine.states.INACTIVE, true);
                        this.updateButtonStyle(this.state.hoverButton, this.stateMachine.states.HOVER, this.stateMachine.states.INACTIVE);
                    }
                    this.state.hoverButton = button;
                }

                // 确保没有多个活动或悬停按钮
                await this.ensureSingleActiveState();
                
                resolve();
            });
        });
    }

    /**
     * 确保只有一个活动状态和一个悬停状态
     * @returns {Promise<void>}
     */
    async ensureSingleActiveState() {
        // 使用requestAnimationFrame确保DOM更新同步
        return new Promise(resolve => {
            requestAnimationFrame(async () => {
                // 检查活动按钮
                const activeButtons = Array.from(this.navButtons).filter(btn => 
                    btn.classList.contains(this.config.activeClass),
                );

                if (activeButtons.length > 1) {
                    console.warn(`Multiple active buttons detected: ${activeButtons.map(btn => btn.textContent).join(', ')}`);
                    
                    // 保留第一个活动按钮，清除其他按钮的活动状态
                    const primaryActive = activeButtons[0];
                    this.state.activeButton = primaryActive;
                    
                    const promises = [];
                    for (let i = 1; i < activeButtons.length; i++) {
                        const btn = activeButtons[i];
                        promises.push(this.stateMachine.transition(btn, this.stateMachine.states.INACTIVE, true));
                        this.updateButtonStyle(btn, this.stateMachine.states.ACTIVE, this.stateMachine.states.INACTIVE);
                    }
                    
                    await Promise.all(promises);
                }

                // 检查悬停按钮
                const hoverButtons = Array.from(this.navButtons).filter(btn => 
                    btn.classList.contains(this.config.hoverClass),
                );

                if (hoverButtons.length > 1) {
                    console.warn(`Multiple hover buttons detected: ${hoverButtons.map(btn => btn.textContent).join(', ')}`);
                    
                    // 保留第一个悬停按钮，清除其他按钮的悬停状态
                    const primaryHover = hoverButtons[0];
                    this.state.hoverButton = primaryHover;
                    
                    const promises = [];
                    for (let i = 1; i < hoverButtons.length; i++) {
                        const btn = hoverButtons[i];
                        promises.push(this.stateMachine.transition(btn, this.stateMachine.states.INACTIVE, true));
                        this.updateButtonStyle(btn, this.stateMachine.states.HOVER, this.stateMachine.states.INACTIVE);
                    }
                    
                    await Promise.all(promises);
                }
                
                resolve();
            });
        });
    }

    /**
     * 同步所有状态
     * @returns {Promise<boolean>} - 是否所有状态都一致
     */
    async syncAllStates() {
        let allConsistent = true;

        // 首先确保只有一个活动状态和一个悬停状态
        await this.ensureSingleActiveState();

        // 使用requestAnimationFrame确保DOM更新同步
        return new Promise(resolve => {
            requestAnimationFrame(async () => {
                // 验证所有按钮的状态一致性
                for (const button of this.navButtons) {
                    if (!this.validateStateConsistency(button)) {
                        allConsistent = false;
                        
                        // 尝试修复不一致的状态
                        const classState = button.classList.contains(this.config.activeClass) ? this.stateMachine.states.ACTIVE :
                            button.classList.contains(this.config.hoverClass) ? this.stateMachine.states.HOVER :
                                button.classList.contains(this.config.disabledClass) ? this.stateMachine.states.DISABLED :
                                    this.stateMachine.states.INACTIVE;
                        
                        await this.attemptStateRepair(button, classState);
                    }
                }

                // 触发状态同步完成事件
                this.eventSystem.emit('navStateSyncComplete', {
                    consistent: allConsistent,
                    timestamp: new Date().toISOString(),
                });
                
                resolve(allConsistent);
            });
        });
    }
    
    /**
     * 检测并处理快速点击状态不一致问题
     * @param {HTMLElement} button - 导航按钮
     * @returns {Promise<boolean>} - 是否检测到并修复了状态不一致
     */
    async detectAndFixRapidClickInconsistency(button) {
        if (!button) return false;
        
        // 检查状态一致性
        const classState = button.classList.contains(this.config.activeClass) ? this.stateMachine.states.ACTIVE :
            button.classList.contains(this.config.hoverClass) ? this.stateMachine.states.HOVER :
                button.classList.contains(this.config.disabledClass) ? this.stateMachine.states.DISABLED :
                    this.stateMachine.states.INACTIVE;
                    
        const dataState = button.getAttribute(this.config.dataStateAttr) || this.stateMachine.states.INACTIVE;
        const machineState = this.stateMachine.getState(button);
        
        // 检查三种状态是否一致
        if (classState !== dataState || classState !== machineState || dataState !== machineState) {
            console.warn(`State inconsistency detected during rapid click switching: class=${classState}, data=${dataState}, machine=${machineState}`);
            
            // 记录异常
            this.recordAnomaly({
                type: 'rapid_click_inconsistency',
                button: button.textContent,
                classState,
                dataState,
                machineState,
                timestamp: new Date().toISOString(),
            });
            
            // 修复状态 - 优先使用class状态
            await this.attemptStateRepair(button, classState);
            
            return true;
        }
        
        return false;
    }

    /**
     * 根据滚动位置更新活动状态
     */
    updateActiveByScroll() {
        // 这里可以实现基于滚动位置的活动状态更新
        // 例如，根据当前显示的页面部分来设置对应的导航按钮为活动状态
        // 这是一个预留的扩展点
    }

    /**
     * 触发导航事件
     * @param {HTMLElement} button - 导航按钮
     */
    triggerNavigationEvent(button) {
        // 创建自定义事件
        const event = new CustomEvent('navigationClick', {
            detail: {
                button: button,
                href: button.getAttribute('href'),
                text: button.textContent,
            },
            bubbles: true,
            cancelable: true,
        });

        // 触发事件
        button.dispatchEvent(event);
    }

    /**
     * 添加到导航历史
     * @param {HTMLElement} button - 导航按钮
     */
    addToNavigationHistory(button) {
        const historyItem = {
            buttonId: this.stateMachine.getButtonId(button),
            text: button.textContent,
            href: button.getAttribute('href'),
            timestamp: new Date().toISOString(),
        };

        this.state.navigationHistory.push(historyItem);

        // 限制历史记录长度
        if (this.state.navigationHistory.length > 10) {
            this.state.navigationHistory.shift();
        }

        // 触发历史更新事件
        this.eventSystem.emit('navHistoryUpdated', {
            history: this.state.navigationHistory,
            currentItem: historyItem,
        });
    }

    /**
     * 记录异常
     * @param {Object} anomaly - 异常信息
     */
    recordAnomaly(anomaly) {
        // 获取现有异常记录
        const anomalies = JSON.parse(localStorage.getItem('navAnomalies') || '[]');

        // 添加新异常
        anomalies.push(anomaly);

        // 保存到本地存储
        localStorage.setItem('navAnomalies', JSON.stringify(anomalies));

        // 触发异常记录事件
        this.eventSystem.emit('navAnomalyRecorded', {
            anomaly: anomaly,
        });

        // 如果异常数量过多，可以发送到服务器进行分析
        if (anomalies.length > 10) {
            this.reportAnomalies(anomalies);
            localStorage.removeItem('navAnomalies');
        }
    }

    /**
     * 报告异常
     * @param {Array} anomalies - 异常数组
     */
    reportAnomalies(anomalies) {
        // 这里可以实现异常报告逻辑
        // 例如，发送到分析服务器或日志服务
        console.log('Reporting navigation anomalies:', anomalies);

        // 触发异常报告事件
        this.eventSystem.emit('navAnomaliesReported', {
            anomalies: anomalies,
        });
    }

    /**
     * 重置所有状态
     * @param {boolean} force - 是否强制重置
     * @returns {boolean} - 重置是否成功
     */
    resetAllStates(force = false) {
        try {
            // 如果不是强制重置，检查当前状态是否需要重置
            if (!force) {
                const activeButtons = Array.from(this.navButtons).filter(btn => 
                    btn.classList.contains(this.config.activeClass),
                );
                const hoverButtons = Array.from(this.navButtons).filter(btn => 
                    btn.classList.contains(this.config.hoverClass),
                );
                
                // 如果只有一个活动按钮且没有悬停按钮，则不需要重置
                if (activeButtons.length <= 1 && hoverButtons.length === 0) {
                    return true;
                }
            }

            // 清除所有活动状态
            this.navButtons.forEach(button => {
                if (button.classList.contains(this.config.activeClass)) {
                    this.stateMachine.transition(button, this.stateMachine.states.INACTIVE);
                    this.updateButtonStyle(button, this.stateMachine.states.ACTIVE, this.stateMachine.states.INACTIVE);
                }
                if (button.classList.contains(this.config.hoverClass)) {
                    this.stateMachine.transition(button, this.stateMachine.states.INACTIVE);
                    this.updateButtonStyle(button, this.stateMachine.states.HOVER, this.stateMachine.states.INACTIVE);
                }
            });

            // 重置内部状态
            this.state.activeButton = null;
            this.state.hoverButton = null;

            // 触发状态重置事件
            this.eventSystem.emit('navStateReset', {
                timestamp: new Date().toISOString(),
            });

            return true;
        } catch (error) {
            console.error('Error resetting all states:', error);
            return false;
        }
    }

    /**
     * 获取异常记录
     * @returns {Array} - 异常记录数组
     */
    getAnomalies() {
        return JSON.parse(localStorage.getItem('navAnomalies') || '[]');
    }

    /**
     * 获取状态信息
     * @returns {Object} - 状态信息对象
     */
    getStateInfo() {
        const stateInfo = {
            initialized: this.state.initialized,
            activeButton: this.state.activeButton ? this.state.activeButton.textContent : null,
            hoverButton: this.state.hoverButton ? this.state.hoverButton.textContent : null,
            isTransitioning: this.state.isTransitioning,
            lastInteractionTime: this.state.lastInteractionTime,
            buttons: [],
        };

        this.navButtons.forEach(button => {
            const classState = button.classList.contains(this.config.activeClass) ? this.stateMachine.states.ACTIVE :
                button.classList.contains(this.config.hoverClass) ? this.stateMachine.states.HOVER :
                    button.classList.contains(this.config.disabledClass) ? this.stateMachine.states.DISABLED :
                        this.stateMachine.states.INACTIVE;

            const dataState = button.getAttribute(this.config.dataStateAttr) || this.stateMachine.states.INACTIVE;

            stateInfo.buttons.push({
                id: this.stateMachine.getButtonId(button),
                text: button.textContent,
                classState,
                dataState,
                consistent: classState === dataState,
            });
        });

        return stateInfo;
    }

    /**
     * 添加事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    addEventListener(eventName, callback) {
        this.eventSystem.addListener(eventName, callback);
    }

    /**
     * 移除事件监听器
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    removeEventListener(eventName, callback) {
        this.eventSystem.removeListener(eventName, callback);
    }

    /**
     * 禁用按钮
     * @param {HTMLElement} button - 导航按钮
     */
    disableButton(button) {
        if (!button || !this.navButtons.has(button)) {
            console.warn('Invalid button provided to disableButton');
            return;
        }

        this.stateMachine.transition(button, this.stateMachine.states.DISABLED);
    }

    /**
     * 启用按钮
     * @param {HTMLElement} button - 导航按钮
     */
    enableButton(button) {
        if (!button || !this.navButtons.has(button)) {
            console.warn('Invalid button provided to enableButton');
            return;
        }

        const currentState = this.stateMachine.getState(button);
        if (currentState === this.stateMachine.states.DISABLED) {
            this.stateMachine.transition(button, this.stateMachine.states.INACTIVE);
        }
    }

    // 使用工具类中的节流函数
    throttle = NavigationUtils.throttle;

    /**
     * 日志函数
     * @param {string} message - 日志消息
     */
    log(message) {
        if (this.config.debugMode) {
            console.log(`[EnhancedNavigationStateManager] ${message}`);
        }
    }
}

// 导航状态管理器实例
const enhancedNavStateManager = new EnhancedNavigationStateManager({
    debugMode: true,
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    enhancedNavStateManager.init();
});

// 导出导航状态管理器（供其他模块使用）
window.EnhancedNavigationStateManager = EnhancedNavigationStateManager;
window.enhancedNavStateManager = enhancedNavStateManager;
window.EnhancedNavigationStateMachine = EnhancedNavigationStateMachine;
window.NavigationEventSystem = NavigationEventSystem;