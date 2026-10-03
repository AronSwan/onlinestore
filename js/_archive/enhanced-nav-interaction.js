/**
 * 增强版导航栏交互效果管理器
 * 功能：提供点击波纹效果、增强的悬停反馈和状态管理
 * 更新时间: 2025-09-18
 * 来源: AI assistant - 优化用户交互体验
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：提供增强版导航栏交互效果，包括波纹效果、悬停反馈和状态管理
// 依赖文件：navigation-state-manager.js（通过window.navStateManager使用）, enhanced-navigation-state-manager.js（通过window.enhancedNavStateManager使用）

class EnhancedNavigationInteraction {
  // 修复状态管理问题
  #validateState(state) {
    return ['active', 'inactive', 'hover'].includes(state);
  }
    constructor(options = {}) {
        this.options = {
            navSelector: '.navbar-luxury .nav-link-luxury',
            rippleClass: 'ripple',
            activeClass: 'active',
            hoverClass: 'hover-enhanced',
            animationDuration: 300,
            rippleDuration: 600,
            enableRipple: true,
            enableGlow: true,
            enableScale: true,
            lazyLoad: true,  // 新增懒加载配置
            passiveEvents: true,  // 新增被动事件配置
            ...options,
        };
        
        this.navLinks = [];
        this.isInitialized = false;
        this.rippleTimeouts = new Map();
        this.hoverTimeouts = new Map();
        
        this.init();
    }
    
    /**
     * 初始化增强导航交互
     */
    async init() {
        if (this.isInitialized) return;
        
        // 初始化性能优化CSS
        this.addPerformanceCSS();
        
        // 设置Intersection Observer
        if (this.options.lazyLoad) {
            await this.setupLazyLoad();
        } else {
            this.navLinks = document.querySelectorAll(this.options.navSelector);
        }
        
        if (this.navLinks.length === 0) {
            console.warn('未找到导航链接元素，增强交互效果未应用');
            return;
        }
        
        this.bindEvents();
        this.setupAccessibility();
        this.isInitialized = true;
        
        console.log(`增强导航交互已初始化，处理了 ${this.navLinks.length} 个导航链接`);
    }
    
    /**
     * 绑定事件监听器
     */
    bindEvents() {
        const passive = this.options.passiveEvents;
        const optsPassive = passive ? { passive: true } : false;
        
        this.navLinks.forEach(link => {
            // 使用优化后的事件绑定
            const events = [
                { name: 'mouseenter', handler: this.handleMouseEnter, options: false },
                { name: 'mouseleave', handler: this.handleMouseLeave, options: false },
                { name: 'mousedown', handler: this.handleMouseDown, options: optsPassive },
                { name: 'mouseup', handler: this.handleMouseUp, options: optsPassive },
                { name: 'click', handler: this.handleClick, options: false },
                { name: 'touchstart', handler: this.handleTouchStart, options: { passive: true } },
                { name: 'touchend', handler: this.handleTouchEnd, options: { passive: true } },
            ];
            
            events.forEach(({name, handler, options}) => {
                link.addEventListener(name, handler.bind(this), options);
            });
            
            // 键盘事件
            link.addEventListener('keydown', (e) => this.handleKeyDown(e));
            link.addEventListener('focus', (e) => this.handleFocus(e));
            link.addEventListener('blur', (e) => this.handleBlur(e));
        });
        
        // 全局事件
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        window.addEventListener('beforeunload', () => this.cleanup());
    }
    
    /**
     * 设置可访问性
     */
    setupAccessibility() {
        this.navLinks.forEach(link => {
            // 确保正确的角色和标签
            if (!link.hasAttribute('role')) {
                link.setAttribute('role', 'button');
            }
            
            // 添加ARIA标签
            if (!link.hasAttribute('aria-label') && link.textContent) {
                link.setAttribute('aria-label', `导航到 ${link.textContent.trim()}`);
            }
            
            // 确保键盘可访问
            if (!link.hasAttribute('tabindex')) {
                link.setAttribute('tabindex', '0');
            }
        });
    }
    
    /**
     * 性能优化CSS注入
     */
    addPerformanceCSS() {
        if (typeof document === 'undefined') return;
        const styleId = 'enhanced-nav-performance-css';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
${this.options.navSelector} {
  will-change: transform, box-shadow;
  contain: layout style paint;
  transform: translateZ(0);
}
${this.options.navSelector}.${this.options.hoverClass}, ${this.options.navSelector}.${this.options.activeClass} {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.nav-ripple {
  will-change: transform, opacity;
}
`;
        document.head.appendChild(style);
    }
    
    /**
     * 懒加载导航元素与事件绑定
     */
    async setupLazyLoad() {
        if (typeof document === 'undefined') {
            this.navLinks = [];
            return;
        }
        const navbar = document.querySelector('.navbar-luxury');
        if (!navbar) {
            this.navLinks = document.querySelectorAll(this.options.navSelector);
            return;
        }
        await new Promise(resolve => {
            const observer = new IntersectionObserver((entries, obs) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        this.navLinks = navbar.querySelectorAll('.nav-link-luxury');
                        obs.disconnect();
                        resolve();
                        break;
                    }
                }
            }, { root: null, threshold: 0.05 });
            observer.observe(navbar);
            // 兜底：一段时间后仍未进入视口，则直接初始化
            setTimeout(() => {
                if (!this.navLinks || this.navLinks.length === 0) {
                    this.navLinks = document.querySelectorAll(this.options.navSelector);
                    resolve();
                }
            }, 1500);
        });
    }
    
    /**
     * 处理鼠标进入事件
     */
    handleMouseEnter(event) {
        const link = event.currentTarget;
        
        // 清除之前的悬停超时
        clearTimeout(this.hoverTimeouts.get(link));
        
        // 延迟添加悬停效果，避免快速移动时的闪烁
        const timeout = setTimeout(() => {
            this.addHoverEffect(link);
        }, 50);
        
        this.hoverTimeouts.set(link, timeout);
    }
    
    /**
     * 处理鼠标离开事件
     */
    handleMouseLeave(event) {
        const link = event.currentTarget;
        
        // 清除悬停超时
        clearTimeout(this.hoverTimeouts.get(link));
        this.hoverTimeouts.delete(link);
        
        // 移除悬停效果
        this.removeHoverEffect(link);
    }
    
    /**
     * 处理鼠标按下事件
     */
    handleMouseDown(event) {
        const link = event.currentTarget;
        
        // 添加按下效果
        link.style.transform = 'translateY(-1px) scale(0.98)';
        link.style.transition = 'all 0.1s ease';
    }
    
    /**
     * 处理鼠标释放事件
     */
    handleMouseUp(event) {
        const link = event.currentTarget;
        
        // 恢复原始变换
        setTimeout(() => {
            link.style.transform = '';
            link.style.transition = '';
        }, 100);
    }
    
    /**
     * 处理点击事件
     */
    handleClick(event) {
        const link = event.currentTarget;
        
        // 添加点击效果（修复事件坐标获取）
        this.addClickEffect(link, event);
        
        // 更新活动状态
        this.updateActiveState(link);
        
        // 触发自定义事件
        this.triggerCustomEvent('navLinkClick', {
            link: link,
            text: link.textContent.trim(),
            href: link.getAttribute('href'),
        });
    }
    
    /**
     * 处理触摸开始事件
     */
    handleTouchStart(event) {
        const link = event.currentTarget;
        this.addHoverEffect(link);
    }
    
    /**
     * 处理触摸结束事件
     */
    handleTouchEnd(event) {
        const link = event.currentTarget;
        
        // 延迟移除悬停效果，提供更好的触摸反馈
        setTimeout(() => {
            this.removeHoverEffect(link);
        }, 200);
    }
    
    /**
     * 处理键盘事件
     */
    handleKeyDown(event) {
        const link = event.currentTarget;
        
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.handleClick(event);
                break;
            case 'Escape':
                this.removeHoverEffect(link);
                link.blur();
                break;
        }
    }
    
    /**
     * 处理焦点事件
     */
    handleFocus(event) {
        const link = event.currentTarget;
        this.addHoverEffect(link);
    }
    
    /**
     * 处理失焦事件
     */
    handleBlur(event) {
        const link = event.currentTarget;
        this.removeHoverEffect(link);
    }
    
    /**
     * 添加悬停效果（使用状态机管理）
     */
    async addHoverEffect(link) {
        // 确保状态一致性
        if (!this.#validateState('hover')) return;
        
        if (window.navStateManager && typeof window.navStateManager.setHoverState === 'function') {
            await window.navStateManager.setHoverState(link);
        } else if (window.enhancedNavStateManager && typeof window.enhancedNavStateManager.setHoverState === 'function') {
            await window.enhancedNavStateManager.setHoverState(link);
        } else {
            // 降级处理 - 确保同一时间只有一个悬停状态
            this.navLinks.forEach(otherLink => {
                if (otherLink !== link) {
                    otherLink.classList.remove(this.options.hoverClass);
                    otherLink.style.transform = '';
                }
            });
            
            if (!link.classList.contains(this.options.activeClass)) {
                link.classList.add(this.options.hoverClass);
                if (this.options.enableScale) {
                    link.style.transform = 'translateY(-2px) scale(1.02)';
                }
            }
        }
    }
    
    /**
     * 移除悬停效果
     */
    removeHoverEffect(link) {
        link.classList.remove(this.options.hoverClass);
        
        // 恢复原始变换
        if (this.options.enableScale && !link.classList.contains(this.options.activeClass)) {
            link.style.transform = '';
        }
    }
    
    /**
     * 添加点击效果
     */
    addClickEffect(link, evt) {
        if (!this.options.enableRipple) return;
        
        // 创建波纹效果
        const ripple = document.createElement('span');
        ripple.className = 'nav-ripple';
        
        const rect = link.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        let x, y;
        
        if (evt && typeof evt.clientX === 'number' && typeof evt.clientY === 'number') {
            x = evt.clientX - rect.left - size / 2;
            y = evt.clientY - rect.top - size / 2;
        } else if (evt && evt.touches && evt.touches[0]) {
            x = evt.touches[0].clientX - rect.left - size / 2;
            y = evt.touches[0].clientY - rect.top - size / 2;
        } else {
            // 无事件坐标时，居中显示波纹
            x = rect.width / 2 - size / 2;
            y = rect.height / 2 - size / 2;
        }
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: radial-gradient(circle, rgba(212, 175, 55, 0.6) 0%, transparent 70%);
            border-radius: 50%;
            transform: scale(0);
            animation: navRipple 0.6s ease-out;
            pointer-events: none;
            z-index: 1;
        `;
        
        link.style.position = 'relative';
        link.style.overflow = 'hidden';
        link.appendChild(ripple);
        
        // 清理波纹元素
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }
    
    /**
     * 更新活动状态 - 统一管理，确保同一时间只有一个激活状态
     */
    updateActiveState(clickedLink) {
        // 确保状态一致性
        if (!this.#validateState('active')) return;
        
        // 移除所有链接的活动状态和悬停状态（使用配置的类名，而不是硬编码）
        this.navLinks.forEach(link => {
            link.classList.remove(this.options.activeClass, this.options.hoverClass);
            link.removeAttribute('aria-current');
            // 清理样式
            link.style.transform = '';
            link.style.boxShadow = '';
            
            // 确保状态机同步
            if (window.navStateManager) {
                if (typeof window.navStateManager.clearHoverState === 'function') {
                    window.navStateManager.clearHoverState(link);
                }
                if (typeof window.navStateManager.clearActiveState === 'function') {
                    window.navStateManager.clearActiveState(link);
                }
            } else if (window.enhancedNavStateManager && typeof window.enhancedNavStateManager.setState === 'function') {
                window.enhancedNavStateManager.setState(link, 'inactive');
            }
        });
        
        // 设置新的活动链接（使用配置的类名）
        clickedLink.classList.add(this.options.activeClass);
        clickedLink.setAttribute('aria-current', 'page');
        
        // 同步状态机
        if (window.navStateManager && typeof window.navStateManager.setActiveState === 'function') {
            window.navStateManager.setActiveState(clickedLink);
        } else if (window.enhancedNavStateManager && typeof window.enhancedNavStateManager.setState === 'function') {
            window.enhancedNavStateManager.setState(clickedLink, 'active');
        }
        
        // 添加活动状态的视觉反馈
        this.addActiveEffect(clickedLink);
    }
    
    /**
     * 添加活动状态效果 - 统一管理激活效果
     */
    addActiveEffect(link) {
        // 添加临时的强烈效果
        link.style.transform = 'translateY(-2px) scale(1.05)';
        link.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.4)';
        
        // 恢复到正常的活动状态，保持统一管理
        setTimeout(() => {
            link.style.transform = 'translateY(-2px) scale(1.02)';
            link.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.3)';
        }, 200);
    }
    
    /**
     * 处理页面可见性变化
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // 页面隐藏时清理状态
            this.cleanup();
        } else {
            // 页面显示时重新初始化
            setTimeout(() => this.init(), 100);
        }
    }
    
    /**
     * 触发自定义事件（使用重构后的事件系统）
     */
    triggerCustomEvent(eventName, detail) {
        if (window.navigationEventSystem) {
            return window.navigationEventSystem.emit(eventName, detail);
        }
        
        // 降级处理
        const event = new CustomEvent(eventName, {
            detail: detail,
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(event);
        return Promise.resolve(true);
    }
    
    /**
     * 清理资源 - 统一状态清理
     */
    cleanup() {
        // 清除所有超时
        this.rippleTimeouts.forEach(timeout => clearTimeout(timeout));
        this.hoverTimeouts.forEach(timeout => clearTimeout(timeout));
        
        this.rippleTimeouts.clear();
        this.hoverTimeouts.clear();
        
        // 移除所有临时样式和状态类
        this.navLinks.forEach(link => {
            link.classList.remove(this.options.hoverClass, this.options.activeClass);
            link.style.transform = '';
            link.style.transition = '';
            link.style.boxShadow = '';
            link.removeAttribute('aria-current');
            
            // 移除波纹元素
            const ripples = link.querySelectorAll('.nav-ripple');
            ripples.forEach(ripple => ripple.remove());
        });
    }
    
    /**
     * 销毁实例
     */
    destroy() {
        this.cleanup();
        this.isInitialized = false;
        
        // 移除事件监听器
        this.navLinks.forEach(link => {
            const events = ['mouseenter', 'mouseleave', 'mousedown', 'mouseup', 'click', 
                           'touchstart', 'touchend', 'keydown', 'focus', 'blur'];
            events.forEach(event => {
                link.removeEventListener(event, this[`handle${event.charAt(0).toUpperCase() + event.slice(1)}`]);
            });
        });
        
        console.log('增强导航交互已销毁');
    }
}

/**
 * 添加CSS动画
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：为导航链接添加CSS动画效果，包括波纹和悬停动画
// 依赖文件：无
function addStyleToDocument() {
    if (typeof document === 'undefined') return;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes navRipple {
            0% {
                transform: scale(0);
                opacity: 1;
            }
            100% {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .nav-link-luxury.hover-enhanced {
            position: relative;
            overflow: hidden;
        }
        
        .nav-link-luxury.hover-enhanced::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent);
            transition: left 0.6s ease;
        }
        
        .nav-link-luxury.hover-enhanced:hover::before {
            left: 100%;
        }
    `;
    document.head.appendChild(style);
}

// 浏览器环境初始化
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：在浏览器环境中初始化导航交互功能，包括样式添加和状态管理器集成
// 依赖文件：无
function initInBrowser() {
    if (typeof document === 'undefined') return;
    
    const start = async () => {
        // 添加样式
        addStyleToDocument();

        // 尝试等待全局状态管理器就绪，但不要阻塞初始化
        const waitForStateManager = () => new Promise(resolve => {
            let tries = 0;
            const maxTries = 20;
            const tick = () => {
                if (window.navStateManager || window.enhancedNavStateManager) return resolve();
                if (++tries >= maxTries) return resolve();
                setTimeout(tick, 100);
            };
            tick();
        });

        // 立即初始化交互管理器（不依赖状态管理器存在）
        if (typeof window !== 'undefined') {
            window.enhancedNavInteraction = new EnhancedNavigationInteraction();
        }

        // 等待状态管理器（可选），主要用于事件日志等非关键功能
        await waitForStateManager();

        // 集成事件系统（如果存在）
        if (window.navigationEventSystem) {
            window.navigationEventSystem.on('navStateChange', (e) => {
                console.log('导航状态变化:', e.detail);
            });
        }
    };
    
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    }
}

// 浏览器环境初始化
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：检查是否在浏览器环境中，如果是则调用初始化函数
// 依赖文件：无
if (typeof document !== 'undefined') {
    initInBrowser();
}

// 导出类供其他模块使用
class EnhancedNavigationStateManager {
  constructor() {
    this.states = new Map();
    this.state = {
      initialized: false,
      elements: new Map(),
    };
    this.initialized = false;
  }

  init() {
    try {
      // 确保导航元素存在
      const navLinks = document.querySelectorAll('.navbar-luxury .nav-link-luxury');
      if (navLinks.length === 0) {
        throw new Error('未找到导航链接元素');
      }

      // 初始化状态
      navLinks.forEach(link => {
        this.states.set(link, 'inactive');
        this.state.elements.set(link, {
          classList: Array.from(link.classList),
          dataState: link.getAttribute('data-state'),
        });
      });

      console.log('EnhancedNavigationStateManager initialized with', navLinks.length, 'elements');
      this.state.initialized = true;
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('状态管理器初始化失败:', error);
      return false;
    }
  }

  setState(element, state) {
    if (!this.initialized) return false;
    this.states.set(element, state);
    return true;
  }

  getState(element) {
    return this.states.get(element);
  }

  validateStateConsistency(element) {
    if (!this.initialized) return false;
    const state = this.getState(element);
    const classState = element.classList.contains('active') ? 'active' : 
                      element.classList.contains('hover') ? 'hover' : 'inactive';
    return state === classState;
  }
}

// 导出状态管理器
export { EnhancedNavigationInteraction, EnhancedNavigationStateManager };

// 全局注册
if (typeof window !== 'undefined') {
  window.EnhancedNavigationStateManager = EnhancedNavigationStateManager;
  window.enhancedNavStateManager = new EnhancedNavigationStateManager();
}