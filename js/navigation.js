/**
 * 主导航功能
 * 提供桌面端导航交互和状态管理
 * 与移动端导航协同工作
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：管理主导航功能，包括桌面端导航交互和状态管理
// 依赖文件：无

class NavigationManager {
    constructor() {
        this.navButtons = document.querySelectorAll('.nav-button');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.activeButton = null;
        this.isInitialized = false;
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        this.bindEvents();
        this.setupKeyboardNavigation();
        this.isInitialized = true;
        
        console.log('主导航初始化完成');
    }

    bindEvents() {
        // 绑定导航按钮事件
        this.navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleButtonClick(button);
            });

            button.addEventListener('mouseenter', () => {
                this.handleButtonHover(button, true);
            });

            button.addEventListener('mouseleave', () => {
                this.handleButtonHover(button, false);
            });
        });

        // 绑定导航链接事件
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLinkClick(link);
            });
        });

        // 监听外部点击事件
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-container')) {
                this.resetAllButtons();
            }
        });
    }

    handleButtonClick(button) {
        const isActive = button.classList.contains('active');
        
        if (isActive) {
            // 如果已经是激活状态，则取消激活
            this.deactivateButton(button);
        } else {
            // 激活新按钮
            this.activateButton(button);
        }
    }

    handleButtonHover(button, isHovering) {
        if (button.classList.contains('active')) return;
        
        if (isHovering) {
            button.classList.add('hover');
        } else {
            button.classList.remove('hover');
        }
    }

    handleLinkClick(link) {
        // 移除所有活动状态
        this.resetAllButtons();
        
        // 添加活动状态到当前链接
        link.classList.add('active');
        
        // 触发自定义事件
        this.emitNavigationEvent(link);
        
        console.log(`导航到: ${link.textContent}`);
    }

    activateButton(button) {
        // 重置其他按钮
        this.resetAllButtons();
        
        // 激活当前按钮
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        this.activeButton = button;
        
        // 添加激活动画
        this.addActivationAnimation(button);
    }

    deactivateButton(button) {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
        
        if (this.activeButton === button) {
            this.activeButton = null;
        }
    }

    resetAllButtons() {
        this.navButtons.forEach(button => {
            button.classList.remove('active', 'hover');
            button.setAttribute('aria-pressed', 'false');
        });
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        this.activeButton = null;
    }

    addActivationAnimation(button) {
        // 添加波纹效果
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    setupKeyboardNavigation() {
        this.navButtons.forEach((button, index) => {
            button.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'ArrowRight':
                        e.preventDefault();
                        this.focusNextButton(index);
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.focusPreviousButton(index);
                        break;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.handleButtonClick(button);
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.resetAllButtons();
                        break;
                }
            });
        });
    }

    focusNextButton(currentIndex) {
        const nextIndex = (currentIndex + 1) % this.navButtons.length;
        this.navButtons[nextIndex].focus();
    }

    focusPreviousButton(currentIndex) {
        const prevIndex = (currentIndex - 1 + this.navButtons.length) % this.navButtons.length;
        this.navButtons[prevIndex].focus();
    }

    emitNavigationEvent(link) {
        const event = new CustomEvent('navigationChanged', {
            detail: {
                activeLink: link,
                linkText: link.textContent,
                href: link.href,
            },
        });
        
        document.dispatchEvent(event);
    }
}

// 全局导航管理器实例
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：创建全局导航管理器实例，供整个应用使用
// 依赖文件：无
let navigationManager = null;

/**
 * 设置导航功能 - 全局函数，供HTML调用
 * 确保同一时间只有一个导航按钮显示激活状态
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：设置导航功能，确保同一时间只有一个导航按钮显示激活状态
// 依赖文件：无
function setupNavigation() {
    if (!navigationManager) {
        navigationManager = new NavigationManager();
    }
    
    return navigationManager;
}

// 自动初始化（如果DOM已加载）
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：自动初始化导航功能，确保DOM加载完成后设置导航
// 依赖文件：无
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNavigation);
} else {
    // DOM已经加载完成
    setupNavigation();
}

// 导出给模块系统使用
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：将导航管理器和设置函数导出给模块系统使用
// 依赖文件：无
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NavigationManager, setupNavigation };
}