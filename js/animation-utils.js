/**
 * Animation Utilities - 统一动画工具类
 * 消除项目中重复的动画逻辑，提供统一的动画接口
 */

class AnimationUtils {
  constructor() {
    this.animations = new Map();
    this.observers = new Map();
    this.init();
  }

  init() {
    this.createCommonAnimations();
    this.setupIntersectionObserver();
    this.addGlobalStyles();
  }

  /**
     * 创建通用动画定义
     */
  createCommonAnimations() {
    // 从constants.js获取动画配置
    const config = window.ANIMATION || {
      DURATION: { FAST: 150, NORMAL: 300, SLOW: 500 },
      EASING: { CUBIC_BEZIER: 'cubic-bezier(0.4, 0, 0.2, 1)' }
    };

    this.animations.set('fadeIn', {
      keyframes: [
        { opacity: 0, transform: 'translateY(20px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      options: {
        duration: config.DURATION.NORMAL,
        easing: config.EASING.CUBIC_BEZIER,
        fill: 'forwards'
      }
    });

    this.animations.set('fadeOut', {
      keyframes: [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-20px)' }
      ],
      options: {
        duration: config.DURATION.NORMAL,
        easing: config.EASING.CUBIC_BEZIER,
        fill: 'forwards'
      }
    });

    this.animations.set('slideInBounce', {
      keyframes: [
        { transform: 'translateX(120%) scale(0.8)', opacity: 0 },
        { transform: 'translateX(-10px) scale(1.02)', opacity: 0.8, offset: 0.6 },
        { transform: 'translateX(0) scale(1)', opacity: 1 }
      ],
      options: {
        duration: 600,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'forwards'
      }
    });

    this.animations.set('slideOutFade', {
      keyframes: [
        { transform: 'translateX(0) scale(1)', opacity: 1 },
        { transform: 'translateX(120%) scale(0.8)', opacity: 0 }
      ],
      options: {
        duration: config.DURATION.NORMAL,
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
        fill: 'forwards'
      }
    });

    this.animations.set('shake', {
      keyframes: [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-5px)', offset: 0.1 },
        { transform: 'translateX(5px)', offset: 0.2 },
        { transform: 'translateX(-5px)', offset: 0.3 },
        { transform: 'translateX(5px)', offset: 0.4 },
        { transform: 'translateX(-5px)', offset: 0.5 },
        { transform: 'translateX(5px)', offset: 0.6 },
        { transform: 'translateX(-5px)', offset: 0.7 },
        { transform: 'translateX(5px)', offset: 0.8 },
        { transform: 'translateX(-5px)', offset: 0.9 },
        { transform: 'translateX(0)' }
      ],
      options: {
        duration: config.DURATION.SLOW,
        easing: 'ease-in-out'
      }
    });

    this.animations.set('bounce', {
      keyframes: [
        { transform: 'translate3d(0, 0, 0)', offset: 0 },
        { transform: 'translate3d(0, 0, 0)', offset: 0.2 },
        { transform: 'translate3d(0, -8px, 0)', offset: 0.4 },
        { transform: 'translate3d(0, -8px, 0)', offset: 0.43 },
        { transform: 'translate3d(0, 0, 0)', offset: 0.53 },
        { transform: 'translate3d(0, -4px, 0)', offset: 0.7 },
        { transform: 'translate3d(0, 0, 0)', offset: 0.8 },
        { transform: 'translate3d(0, -2px, 0)', offset: 0.9 },
        { transform: 'translate3d(0, 0, 0)', offset: 1 }
      ],
      options: {
        duration: 1000,
        easing: 'ease-out'
      }
    });

    this.animations.set('pulse', {
      keyframes: [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0.7, transform: 'scale(1.05)', offset: 0.5 },
        { opacity: 1, transform: 'scale(1)' }
      ],
      options: {
        duration: 2000,
        easing: 'ease-in-out',
        iterations: Infinity
      }
    });

    this.animations.set('spin', {
      keyframes: [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(360deg)' }
      ],
      options: {
        duration: 1000,
        easing: 'linear',
        iterations: Infinity
      }
    });

    this.animations.set('modalSlideIn', {
      keyframes: [
        { opacity: 0, transform: 'translateY(-50px) scale(0.9)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ],
      options: {
        duration: config.DURATION.NORMAL,
        easing: 'ease'
      }
    });

    this.animations.set('hoverLift', {
      keyframes: [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-8px) scale(1.02)' }
      ],
      options: {
        duration: config.DURATION.NORMAL,
        easing: config.EASING.CUBIC_BEZIER,
        fill: 'forwards'
      }
    });

    this.animations.set('hoverScale', {
      keyframes: [
        { transform: 'scale(1)' },
        { transform: 'scale(1.05)' }
      ],
      options: {
        duration: config.DURATION.NORMAL,
        easing: config.EASING.CUBIC_BEZIER,
        fill: 'forwards'
      }
    });
  }

  /**
     * 播放动画
     * @param {HTMLElement} element - 目标元素
     * @param {string} animationName - 动画名称
     * @param {Object} customOptions - 自定义选项
     * @returns {Animation} Web Animations API Animation对象
     */
  animate(element, animationName, customOptions = {}) {
    try {
      if (!element || !animationName) {
        throw new Error('Element and animation name are required');
      }

      const animationConfig = this.animations.get(animationName);
      if (!animationConfig) {
        throw new Error(`Animation '${animationName}' not found`);
      }

      const options = { ...animationConfig.options, ...customOptions };
      const animation = element.animate(animationConfig.keyframes, options);

      // 添加错误处理
      animation.addEventListener('cancel', () => {
        if (window.errorUtils) {
          window.errorUtils.handleError({
            type: 'animation',
            operation: 'animate',
            message: `Animation '${animationName}' was cancelled`,
            context: { element: element.tagName, animationName }
          });
        }
      });

      return animation;
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'animation',
          operation: 'animate',
          message: 'Failed to animate element',
          error,
          context: { element: element?.tagName, animationName }
        });
      } else {
        console.error('Animation error:', error);
      }
      return null;
    }
  }

  /**
     * 创建涟漪效果
     * @param {Event} event - 点击事件
     * @param {HTMLElement} element - 目标元素
     * @param {Object} options - 配置选项
     */
  createRipple(event, element, options = {}) {
    try {
      const {
        color = 'rgba(255, 255, 255, 0.6)',
        duration = 600,
        size = null
      } = options;

      const ripple = document.createElement('span');
      const rect = element.getBoundingClientRect();
      const rippleSize = size || Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - rippleSize / 2;
      const y = event.clientY - rect.top - rippleSize / 2;

      ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: ${color};
                transform: scale(0);
                left: ${x}px;
                top: ${y}px;
                width: ${rippleSize}px;
                height: ${rippleSize}px;
                pointer-events: none;
                z-index: 1000;
            `;

      // 确保元素有相对定位
      if (getComputedStyle(element).position === 'static') {
        element.style.position = 'relative';
      }

      element.appendChild(ripple);

      // 使用Web Animations API创建涟漪动画
      const animation = ripple.animate([
        { transform: 'scale(0)', opacity: 1 },
        { transform: 'scale(4)', opacity: 0 }
      ], {
        duration,
        easing: 'linear'
      });

      animation.addEventListener('finish', () => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      });

      return animation;
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'animation',
          operation: 'createRipple',
          message: 'Failed to create ripple effect',
          error,
          context: { element: element?.tagName }
        });
      } else {
        console.error('Ripple effect error:', error);
      }
      return null;
    }
  }

  /**
     * 添加悬停动画
     * @param {HTMLElement} element - 目标元素
     * @param {string} hoverAnimation - 悬停动画名称
     * @param {string} leaveAnimation - 离开动画名称
     */
  addHoverAnimation(element, hoverAnimation = 'hoverLift', leaveAnimation = null) {
    if (!element) {return;}

    let currentAnimation = null;

    const handleMouseEnter = () => {
      if (currentAnimation) {
        currentAnimation.cancel();
      }
      currentAnimation = this.animate(element, hoverAnimation);
    };

    const handleMouseLeave = () => {
      if (currentAnimation) {
        currentAnimation.cancel();
      }
      if (leaveAnimation) {
        currentAnimation = this.animate(element, leaveAnimation);
      } else {
        // 反向播放悬停动画
        const config = this.animations.get(hoverAnimation);
        if (config) {
          const reverseKeyframes = [...config.keyframes].reverse();
          currentAnimation = element.animate(reverseKeyframes, {
            ...config.options,
            fill: 'forwards'
          });
        }
      }
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    // 返回清理函数
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (currentAnimation) {
        currentAnimation.cancel();
      }
    };
  }

  /**
     * 设置交叉观察器用于滚动动画
     */
  setupIntersectionObserver() {
    if (!window.IntersectionObserver) {return;}

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const animationName = element.dataset.scrollAnimation || 'fadeIn';
          this.animate(element, animationName);
          observer.unobserve(element);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    this.observers.set('scroll', observer);
  }

  /**
     * 观察元素的滚动动画
     * @param {HTMLElement} element - 目标元素
     * @param {string} animationName - 动画名称
     */
  observeScrollAnimation(element, animationName = 'fadeIn') {
    const observer = this.observers.get('scroll');
    if (observer && element) {
      element.dataset.scrollAnimation = animationName;
      observer.observe(element);
    }
  }

  /**
     * 添加全局CSS样式
     */
  addGlobalStyles() {
    if (document.getElementById('animation-utils-styles')) {return;}

    const style = document.createElement('style');
    style.id = 'animation-utils-styles';
    style.textContent = `
            /* 动画工具类全局样式 */
            .animate-on-scroll {
                opacity: 0;
                transform: translateY(20px);
            }
            
            .animate-ripple {
                position: relative;
                overflow: hidden;
            }
            
            .animate-hover {
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* 减少动画的媒体查询 */
            @media (prefers-reduced-motion: reduce) {
                .animate-on-scroll,
                .animate-ripple,
                .animate-hover {
                    animation: none !important;
                    transition: none !important;
                }
            }
        `;

    document.head.appendChild(style);
  }

  /**
     * 批量初始化元素动画
     * @param {string} selector - 选择器
     * @param {string} animationType - 动画类型
     * @param {Object} options - 配置选项
     */
  initializeElements(selector, animationType = 'scroll', options = {}) {
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      switch (animationType) {
      case 'scroll':
        this.observeScrollAnimation(element, options.animation || 'fadeIn');
        break;
      case 'hover':
        this.addHoverAnimation(element, options.hoverAnimation, options.leaveAnimation);
        break;
      case 'ripple':
        element.addEventListener('click', (e) => {
          this.createRipple(e, element, options);
        });
        break;
      }
    });
  }

  /**
     * 清理所有观察器和动画
     */
  destroy() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
    this.animations.clear();

    const style = document.getElementById('animation-utils-styles');
    if (style) {
      style.remove();
    }
  }
}

// 创建全局实例
window.AnimationUtils = window.AnimationUtils || new AnimationUtils();

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationUtils;
}

// 自动初始化常见元素
document.addEventListener('DOMContentLoaded', () => {
  const animationUtils = window.AnimationUtils;

  // 初始化滚动动画
  animationUtils.initializeElements('.animate-on-scroll', 'scroll');

  // 初始化涟漪效果
  animationUtils.initializeElements('.animate-ripple', 'ripple');

  // 初始化悬停动画
  animationUtils.initializeElements('.animate-hover', 'hover');
});
