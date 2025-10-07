/**
 * 优化版导航栏交互效果
 * 改进点：
 * 1. 单例样式管理
 * 2. 统一状态控制
 * 3. 事件委托优化性能
 * 4. 可配置选项
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：提供导航栏交互效果，包括悬停、点击、触摸和滚动响应
// 依赖文件：navigation-state-manager.js（通过window.navStateManager使用）

function setupNavigation() {
  // 配置选项
  const config = {
    transitionDuration: 300,
    activeClass: 'active',
    hoverClass: 'hover-active',
    scrollOffset: 100,
    scrollThrottle: 100,
    underline: {
      delay: 300,      // 下划线延迟调整为300ms
      duration: 300,   // 下划线动画时长(ms) 
      color: 'var(--gold-standard)',
    },
  };

  // 职责分离最小修复：如果存在导航状态管理器，则由其唯一负责状态（class/data-state）更新
  // Source: js/navigation-state-manager.js — AI minimal refactor on 2025-09-21 21:40:11 Asia/Shanghai
  const hasNavManager = typeof window !== 'undefined' && window.navStateManager;

  // 单例样式
  const NAV_STYLE_ID = 'nav-transition-style';
  if (!document.getElementById(NAV_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = NAV_STYLE_ID;
    style.textContent = `
            .nav-link-luxury {
                transition: all ${config.transitionDuration}ms ease;
                position: relative;
                display: inline-block;
            }
            .nav-link-luxury.${config.activeClass} {
                color: var(--gold-standard);
            }
            .nav-link-luxury.${config.hoverClass} {
                color: var(--gold-standard);
                opacity: 0.8;
            }
            .nav-link-luxury::after {
                content: '';
                position: absolute;
                left: 0;
                bottom: -4px;
                height: 2px;
                width: 0;
                background: ${config.underline.color};
                transition: 
                    width ${config.underline.duration}ms cubic-bezier(0.25, 1, 0.5, 1),
                    opacity ${config.underline.duration}ms ease;
                opacity: 0;
                z-index: 10;
                transform-origin: left center;
                will-change: width, opacity;
            }
            .nav-link-luxury.${config.hoverClass}::after,
            .nav-link-luxury.${config.activeClass}::after {
                width: 100%;
                opacity: 1;
                transition-delay: 0ms; /* 确保下划线动画同步显示 */
            }
        `;
    document.head.appendChild(style);
  }

  // 状态管理 - 统一管理导航状态
  const state = {
    activeLink: null,
    hoverLink: null,
    lastInteraction: null,
    sections: [],
    hoverTimeout: null,
    underlineTimeout: null,
    lastScrollPosition: 0,
    isStateManaged: false, // 标记是否由状态管理器统一管理
  };

  // 缓存DOM
  const navContainer = document.querySelector('.main-nav');
  const navLinks = [...document.querySelectorAll('.nav-link-luxury')];
  const navbar = document.querySelector('.navbar-luxury');

  // 工具函数
  const throttle = (fn, delay) => {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall < delay) return;
      lastCall = now;
      return fn(...args);
    };
  };

  // 事件处理（职责分离：存在 navStateManager 时委托给其方法，不直接改动 class）
  const handleClick = (e) => {
    const link = e.target.closest('.nav-link-luxury');
    if (!link) return;
    
    // 始终委托给状态管理器处理点击事件
    if (hasNavManager && window.navStateManager && typeof window.navStateManager.handleClick === 'function') {
      window.navStateManager.handleClick({ currentTarget: link, preventDefault: () => e.preventDefault() });
      return;
    }

    e.preventDefault();
    
    // 如果没有状态管理器，使用基本的状态管理逻辑
    // 清除所有状态 - 统一管理状态
    navLinks.forEach(l => {
      l.classList.remove(config.activeClass, config.hoverClass);
      l.setAttribute('data-state', 'inactive');
    });

    // 设置当前激活状态
    link.classList.add(config.activeClass);
    link.setAttribute('data-state', 'active');
    state.activeLink = link;
    state.hoverLink = null;
    state.lastInteraction = 'click';

    // 平滑滚动
    const targetId = link.getAttribute('href')?.substring(1);
    if (targetId) {
      const target = document.getElementById(targetId);
      if (target) {
        window.scrollTo({
          top: target.offsetTop - config.scrollOffset,
          behavior: 'smooth',
        });
      }
    }
  };

  const handleHover = (e) => {
    const link = e.target.closest('.nav-link-luxury');
    if (!link) return;

    // 始终委托给状态管理器处理悬停事件
    if (hasNavManager && window.navStateManager && typeof window.navStateManager.handleMouseEnter === 'function') {
      window.navStateManager.handleMouseEnter({ currentTarget: link });
      return;
    }

    // 如果没有状态管理器，使用基本的状态管理逻辑
    // 清除所有延迟
    clearTimeout(state.hoverTimeout);
    clearTimeout(state.underlineTimeout);
    state.hoverTimeout = null;
    state.underlineTimeout = null;

    // 设置悬停状态 - 统一管理，同一时间只有一个悬停状态
    navLinks.forEach(l => {
      l.classList.remove(config.hoverClass);
      if (l !== state.activeLink) {
        l.setAttribute('data-state', 'inactive');
      }
    });
    
    link.classList.add(config.hoverClass);
    link.setAttribute('data-state', 'hover-active');
    state.hoverLink = link;
    state.lastInteraction = 'hover';
  };

  const handleHoverEnd = (e) => {
    const link = e.target.closest('.nav-link-luxury');
    if (!link) return;

    // 委托给状态管理器处理悬停结束事件
    if (hasNavManager && window.navStateManager && typeof window.navStateManager.handleMouseLeave === 'function') {
      window.navStateManager.handleMouseLeave({ currentTarget: link });
      return;
    }

    // 如果没有状态管理器，使用基本的状态管理逻辑
    // 立即恢复状态，不使用延迟 - 统一管理状态
    navLinks.forEach(l => {
      if (l !== state.activeLink) {
        l.classList.remove(config.hoverClass);
        l.setAttribute('data-state', 'inactive');
      }
    });
    
    state.hoverLink = null;
    state.lastInteraction = state.activeLink ? 'click' : null;
    updateActiveByScroll();
  };

  const handleTouchStart = (e) => {
    const link = e.target.closest('.nav-link-luxury');
    if (!link) return;

    if (hasNavManager && window.navStateManager && typeof window.navStateManager.handleTouchStart === 'function') {
      window.navStateManager.handleTouchStart({ currentTarget: link });
      return;
    }

    // 触摸开始时的处理逻辑
    link.classList.add(config.hoverClass);
    link.setAttribute('data-state', 'touch-active');
  };

  const handleTouchEnd = (e) => {
    const link = e.target.closest('.nav-link-luxury');
    if (!link) return;

    if (hasNavManager && window.navStateManager && typeof window.navStateManager.handleTouchEnd === 'function') {
      window.navStateManager.handleTouchEnd({ currentTarget: link });
      return;
    }

    // 触摸结束时的处理逻辑
    setTimeout(() => {
      link.classList.remove(config.hoverClass);
      if (link !== state.activeLink) {
        link.setAttribute('data-state', 'inactive');
      }
    }, 150);
  };

  // 滚动处理 - 使用节流优化性能
  const updateActiveByScroll = throttle(() => {
    const scrollPosition = window.pageYOffset;
    state.lastScrollPosition = scrollPosition;

    // 如果没有状态管理器，使用基本的滚动检测逻辑
    if (hasNavManager) return;

    let currentSection = null;
    let minDistance = Infinity;

    state.sections.forEach(section => {
      const distance = Math.abs(section.top - scrollPosition);
      if (distance < minDistance) {
        minDistance = distance;
        currentSection = section;
      }
    });

    if (currentSection && currentSection.link !== state.activeLink) {
      navLinks.forEach(l => {
        l.classList.remove(config.activeClass);
        if (l !== state.hoverLink) {
          l.setAttribute('data-state', 'inactive');
        }
      });

      currentSection.link.classList.add(config.activeClass);
      currentSection.link.setAttribute('data-state', 'active');
      state.activeLink = currentSection.link;
    }
  }, config.scrollThrottle);

  // 初始化函数
  const init = () => {
    if (!navContainer || navLinks.length === 0) {
      console.warn('导航元素未找到，导航功能初始化失败');
      return;
    }

    // 初始化sections数组
    state.sections = navLinks.map(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        try {
          const target = document.querySelector(href);
          return {
            link,
            top: target ? target.offsetTop : 0,
          };
        } catch (error) {
          console.warn('Invalid selector for href:', href, error);
          return null;
        }
      }
      return null;
    }).filter(Boolean);

    // 事件委托 - 优化性能
    navContainer.addEventListener('click', handleClick);
    navContainer.addEventListener('mouseenter', handleHover, true);
    navContainer.addEventListener('mouseleave', handleHoverEnd, true);
    navContainer.addEventListener('touchstart', handleTouchStart, true);
    navContainer.addEventListener('touchend', handleTouchEnd, true);

    // 滚动监听
    window.addEventListener('scroll', updateActiveByScroll);

    // 初始化激活状态
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const targetLink = navLinks.find(link => link.getAttribute('href') === hash);
      if (targetLink) {
        targetLink.classList.add(config.activeClass);
        targetLink.setAttribute('data-state', 'active');
        state.activeLink = targetLink;
      }
    }

    // 如果没有激活的链接，默认激活第一个
    if (!state.activeLink && navLinks.length > 0) {
      navLinks[0].classList.add(config.activeClass);
      navLinks[0].setAttribute('data-state', 'active');
      state.activeLink = navLinks[0];
    }

    // 触发导航初始化完成事件
    const event = new CustomEvent('navigationInitialized', {
      detail: { navLinks, config },
    });
    document.dispatchEvent(event);

    console.log('导航交互功能初始化完成');
  };

  // 清理函数
  const destroy = () => {
    navContainer.removeEventListener('click', handleClick);
    navContainer.removeEventListener('mouseenter', handleHover, true);
    navContainer.removeEventListener('mouseleave', handleHoverEnd, true);
    navContainer.removeEventListener('touchstart', handleTouchStart, true);
    navContainer.removeEventListener('touchend', handleTouchEnd, true);
    window.removeEventListener('scroll', updateActiveByScroll);

    // 移除样式
    const style = document.getElementById(NAV_STYLE_ID);
    if (style) {
      style.remove();
    }

    // 清除所有状态
    navLinks.forEach(link => {
      link.classList.remove(config.activeClass, config.hoverClass);
      link.removeAttribute('data-state');
    });
  };

  // 公开API
  return {
    init,
    destroy,
    config,
    getState: () => ({ ...state }),
    setActive: (link) => {
      if (typeof link === 'string') {
        link = navLinks.find(l => l.getAttribute('href') === link || l.textContent === link);
      }
      if (link && navLinks.includes(link)) {
        navLinks.forEach(l => {
          l.classList.remove(config.activeClass);
          if (l !== state.hoverLink) {
            l.setAttribute('data-state', 'inactive');
          }
        });
        link.classList.add(config.activeClass);
        link.setAttribute('data-state', 'active');
        state.activeLink = link;
      }
    },
  };
}

// 初始化导航
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：初始化导航功能
// 依赖文件：无

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupNavigation().init();
  });
} else {
  setupNavigation().init();
}

// 页面卸载时清理触摸优化
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：页面卸载时清理触摸优化
// 依赖文件：无

window.addEventListener('beforeunload', () => {
    if (typeof cleanupTouchOptimization === 'function') {
        cleanupTouchOptimization();
    }
});