/**
 * Enhanced Click Effects - 美化方框点击效果
 * 提供涟漪效果、磁性效果和其他交互增强
 */

class ClickEffects {
  constructor() {
    this.init();
  }

  init() {
    this.addRippleEffect();
    this.addMagneticEffect();
    this.addSoundEffects();
    this.addTouchFeedback();
    this.addKeyboardSupport();
  }

  /**
     * 添加涟漪效果到指定元素
     */
  addRippleEffect() {
    const rippleElements = document.querySelectorAll('.ripple-effect, .btn-enhanced, .add-to-cart-enhanced');

    rippleElements.forEach(element => {
      element.addEventListener('click', (e) => {
        this.createRipple(e, element);
      });
    });
  }

  /**
     * 创建涟漪动画 - 使用统一的AnimationUtils
     */
  createRipple(event, element) {
    // 使用统一的AnimationUtils创建涟漪效果
    if (window.AnimationUtils) {
      window.AnimationUtils.createRipple(event, element, {
        color: 'rgba(255, 255, 255, 0.6)',
        duration: 600
      });
    } else {
      // 降级处理：如果AnimationUtils不可用，使用简化版本
      console.warn('AnimationUtils not available, using fallback ripple effect');
      this.createFallbackRipple(event, element);
    }
  }

  /**
     * 降级涟漪效果（当AnimationUtils不可用时）
     */
  createFallbackRipple(event, element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            pointer-events: none;
            z-index: 1000;
        `;

    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(ripple);

    // 使用简单的CSS transition
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(4)';
      ripple.style.opacity = '0';
      ripple.style.transition = 'transform 0.6s linear, opacity 0.6s linear';
    });

    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  /**
     * 添加磁性效果
     */
  addMagneticEffect() {
    const magneticElements = document.querySelectorAll('.magnetic-effect');

    magneticElements.forEach(element => {
      element.addEventListener('mousemove', (e) => {
        this.handleMagneticMove(e, element);
      });

      element.addEventListener('mouseleave', () => {
        this.resetMagneticEffect(element);
      });
    });
  }

  /**
     * 处理磁性效果的鼠标移动
     */
  handleMagneticMove(event, element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const strength = window.CONSTANTS?.ANIMATION?.CLICK_EFFECTS?.MAGNETIC_STRENGTH || 0.1;
    const deltaX = (event.clientX - centerX) * strength;
    const deltaY = (event.clientY - centerY) * strength;

    element.style.setProperty('--mouse-x', `${deltaX}px`);
    element.style.setProperty('--mouse-y', `${deltaY}px`);
  }

  /**
     * 重置磁性效果
     */
  resetMagneticEffect(element) {
    const duration = window.CONSTANTS?.ANIMATION?.DURATION?.MAGNETIC_RESET || 300;
    element.style.transition = `transform ${duration}ms ease`;
    element.style.setProperty('--mouse-x', '0px');
    element.style.setProperty('--mouse-y', '0px');

    setTimeout(() => {
      element.style.transition = '';
    }, duration);
  }

  /**
     * 添加音效反馈（可选）
     */
  addSoundEffects() {
    // 检查用户是否启用了音效
    const storageKey = window.CONSTANTS?.AUDIO?.STORAGE_KEYS?.SOUND_ENABLED || 'clickSoundEnabled';
    const soundEnabled = localStorage.getItem(storageKey) === 'true';

    if (!soundEnabled) {return;}

    const clickElements = document.querySelectorAll('.btn-enhanced, .add-to-cart-enhanced, .product-card-enhanced');

    clickElements.forEach(element => {
      element.addEventListener('click', () => {
        this.playClickSound();
      });
    });
  }

  /**
     * 检查Web Audio API支持
     */
  isWebAudioSupported() {
    return !!(window.AudioContext || window.webkitAudioContext ||
                 window.mozAudioContext || window.msAudioContext);
  }

  /**
     * 获取AudioContext实例
     */
  getAudioContext() {
    if (!this.isWebAudioSupported()) {
      return null;
    }

    try {
      const AudioContextClass = window.AudioContext ||
                                    window.webkitAudioContext ||
                                    window.mozAudioContext ||
                                    window.msAudioContext;
      return new AudioContextClass();
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'error',
          operation: '创建AudioContext',
          message: '无法创建AudioContext',
          error: error,
          context: { component: 'ClickEffects', fallback: 'Audio effects disabled' }
        });
      } else {
        console.warn('无法创建AudioContext:', error);
      }
      return null;
    }
  }

  /**
     * 播放点击音效
     */
  playClickSound() {
    // 检查Web Audio API支持
    if (!this.isWebAudioSupported()) {
      try {
        if (window.errorUtils) {
          window.errorUtils.handleError({
            type: 'info',
            operation: '音效播放',
            message: '浏览器不支持Web Audio API，跳过音效播放',
            context: { component: 'ClickEffects' }
          });
        } else {
          console.log('浏览器不支持Web Audio API，跳过音效播放');
        }
      } catch (error) {
        console.log('浏览器不支持Web Audio API，跳过音效播放');
      }
      return;
    }

    // 使用Web Audio API创建简单的点击音效
    try {
      const audioContext = this.getAudioContext();
      if (!audioContext) {
        try {
          if (window.errorUtils) {
            window.errorUtils.handleError({
              type: 'info',
              operation: '音效播放',
              message: '无法获取AudioContext，跳过音效播放',
              context: { component: 'ClickEffects' }
            });
          } else {
            console.log('无法获取AudioContext，跳过音效播放');
          }
        } catch (error) {
          console.log('无法获取AudioContext，跳过音效播放');
        }
        return;
      }

      // 检查AudioContext状态
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          this.createAndPlaySound(audioContext);
        }).catch(error => {
          if (window.errorUtils) {
            window.errorUtils.handleError({
              type: 'error',
              operation: '恢复AudioContext',
              message: '无法恢复AudioContext',
              error: error,
              context: { component: 'ClickEffects', fallback: 'Sound effect skipped' }
            });
          } else {
            console.warn('无法恢复AudioContext:', error);
          }
        });
      } else {
        this.createAndPlaySound(audioContext);
      }
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'error',
          operation: '音效播放',
          message: '音效播放失败',
          error: error,
          context: { component: 'ClickEffects', fallback: 'Sound effect skipped' }
        });
      } else {
        console.log('音效播放失败:', error);
      }
    }
  }

  /**
     * 创建并播放音效
     */
  createAndPlaySound(audioContext) {
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const audioConstants = window.CONSTANTS?.AUDIO?.SOUND_EFFECTS || {};
      const startFreq = audioConstants.CLICK_FREQUENCY || 800;
      const endFreq = audioConstants.CLICK_FREQUENCY_END || 400;
      const startGain = audioConstants.CLICK_GAIN || 0.1;
      const endGain = audioConstants.CLICK_GAIN_END || 0.01;
      const duration = audioConstants.CLICK_DURATION || 0.1;

      oscillator.frequency.setValueAtTime(startFreq, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioContext.currentTime + duration);

      gainNode.gain.setValueAtTime(startGain, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(endGain, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'error',
          operation: '创建音效',
          message: '创建音效失败',
          error: error,
          context: { component: 'ClickEffects', audioContextState: audioContext?.state }
        });
      } else {
        console.warn('创建音效失败:', error);
      }
    }
  }

  /**
     * 添加触摸反馈
     */
  addTouchFeedback() {
    const touchElements = document.querySelectorAll('.btn-enhanced, .add-to-cart-enhanced, .product-card-enhanced');

    touchElements.forEach(element => {
      element.addEventListener('touchstart', (e) => {
        this.handleTouchStart(e, element);
      });

      element.addEventListener('touchend', (e) => {
        this.handleTouchEnd(e, element);
      });
    });
  }

  /**
     * 处理触摸开始
     */
  handleTouchStart(event, element) {
    // 添加触摸反馈类
    element.classList.add('touch-active');

    // 触觉反馈（如果支持）
    if ('vibrate' in navigator) {
      const vibrationDuration = window.CONSTANTS?.ANIMATION?.CLICK_EFFECTS?.VIBRATION_DURATION || 10;
      navigator.vibrate(vibrationDuration); // 轻微震动
    }

    // 创建触摸涟漪效果
    if (event.touches && event.touches[0]) {
      this.createRipple({
        clientX: event.touches[0].clientX,
        clientY: event.touches[0].clientY
      }, element);
    }
  }

  /**
     * 处理触摸结束
     */
  handleTouchEnd(event, element) {
    // 延迟移除触摸反馈类，确保动画完成
    const delay = window.CONSTANTS?.ANIMATION?.CLICK_EFFECTS?.TOUCH_END_DELAY || 150;
    setTimeout(() => {
      element.classList.remove('touch-active');
    }, delay);
  }

  /**
     * 添加键盘支持
     */
  addKeyboardSupport() {
    const keyboardElements = document.querySelectorAll('.btn-enhanced, .add-to-cart-enhanced');

    keyboardElements.forEach(element => {
      element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleKeyboardActivation(element);
        }
      });
    });
  }

  /**
     * 处理键盘激活
     */
  handleKeyboardActivation(element) {
    // 添加键盘激活效果
    element.classList.add('keyboard-active');

    // 创建中心涟漪效果
    const rect = element.getBoundingClientRect();
    this.createRipple({
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    }, element);

    // 触发点击事件
    const delay = window.CONSTANTS?.ANIMATION?.CLICK_EFFECTS?.KEYBOARD_ACTIVATION_DELAY || 100;
    setTimeout(() => {
      element.click();
      element.classList.remove('keyboard-active');
    }, delay);
  }

  /**
     * 启用/禁用音效
     */
  toggleSoundEffects(enabled) {
    const storageKey = window.CONSTANTS?.AUDIO?.STORAGE_KEYS?.SOUND_ENABLED || 'clickSoundEnabled';
    localStorage.setItem(storageKey, enabled.toString());
    if (enabled) {
      this.addSoundEffects();
    }
  }

  /**
     * 动态添加效果到新元素
     */
  addEffectsToElement(element, effects = ['ripple', 'magnetic']) {
    if (effects.includes('ripple')) {
      element.classList.add('ripple-effect');
      element.addEventListener('click', (e) => {
        this.createRipple(e, element);
      });
    }

    if (effects.includes('magnetic')) {
      element.classList.add('magnetic-effect');
      element.addEventListener('mousemove', (e) => {
        this.handleMagneticMove(e, element);
      });
      element.addEventListener('mouseleave', () => {
        this.resetMagneticEffect(element);
      });
    }
  }

  /**
     * 移除所有效果
     */
  removeAllEffects() {
    const elements = document.querySelectorAll('.ripple-effect, .magnetic-effect, .btn-enhanced, .add-to-cart-enhanced, .product-card-enhanced');
    elements.forEach(element => {
      // 移除事件监听器需要保存引用，这里简单地移除类
      element.classList.remove('ripple-effect', 'magnetic-effect', 'btn-enhanced', 'add-to-cart-enhanced', 'product-card-enhanced');
    });
  }
}

// 添加涟漪动画的CSS
const rippleCSS = `
@keyframes ripple-animation {
    to {
        transform: scale(4);
        opacity: 0;
    }
}

.touch-active {
    transform: scale(0.95) !important;
    transition: transform 0.1s ease !important;
}

.keyboard-active {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
}
`;

// 注入CSS
if (!document.getElementById('click-effects-dynamic-css')) {
  const style = document.createElement('style');
  style.id = 'click-effects-dynamic-css';
  style.textContent = rippleCSS;
  document.head.appendChild(style);
}

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.clickEffects = new ClickEffects();
  });
} else {
  window.clickEffects = new ClickEffects();
}

// 导出类以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClickEffects;
}
