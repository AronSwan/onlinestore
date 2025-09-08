/**
 * 重构模块初始化脚本
 * 负责加载和初始化重构后的模块，确保向后兼容性
 *
 * @author AI Assistant - 基于SOLID原则重构
 * @version 1.0.0
 * @created 2025-01-15
 */

(function () {
  'use strict';

  // 模块加载状态跟踪
  const moduleStatus = {
    notificationSystem: false,
    utilityFunctions: false,
    htmlSanitizer: false,
    idGenerator: false
  };

  /**
     * 动态加载脚本文件
     * @param {string} src - 脚本文件路径
     * @param {Function} callback - 加载完成回调
     */
  function _loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    script.onload = function () {
      console.log(`✓ 模块加载成功: ${src}`);
      if (callback) { callback(); }
    };

    script.onerror = function () {
      console.warn(`✗ 模块加载失败: ${src}`);
      if (callback) { callback(new Error(`Failed to load ${src}`)); }
    };

    document.head.appendChild(script);
  }

  /**
     * 初始化通知系统
     */
  function initNotificationSystem() {
    if (window.NotificationSystem) {
      window.notificationSystem = new window.NotificationSystem();
      moduleStatus.notificationSystem = true;
      console.log('✓ NotificationSystem 初始化完成');
    } else {
      console.warn('✗ NotificationSystem 类未找到');
    }
  }

  /**
     * 初始化工具函数
     */
  function initUtilityFunctions() {
    if (window.UtilityFunctions) {
      window.utilityFunctions = new window.UtilityFunctions();
      moduleStatus.utilityFunctions = true;
      console.log('✓ UtilityFunctions 初始化完成');
    } else {
      console.warn('✗ UtilityFunctions 类未找到');
    }
  }

  /**
     * 初始化HTML清理器
     */
  function initHTMLSanitizer() {
    if (window.HTMLSanitizer) {
      window.htmlSanitizer = new window.HTMLSanitizer();
      moduleStatus.htmlSanitizer = true;
      console.log('✓ HTMLSanitizer 初始化完成');
    } else {
      console.warn('✗ HTMLSanitizer 类未找到');
    }
  }

  /**
     * 初始化ID生成器
     */
  function initIDGenerator() {
    if (window.IDGenerator) {
      window.idGenerator = new window.IDGenerator();
      moduleStatus.idGenerator = true;
      console.log('✓ IDGenerator 初始化完成');
    } else {
      console.warn('✗ IDGenerator 类未找到');
    }
  }

  /**
     * 注册模块到依赖注入容器
     */
  function registerToDIContainer() {
    if (window.diContainer) {
      // 注册新的服务实例
      if (window.notificationSystem) {
        window.diContainer.register('notificationSystem', () => window.notificationSystem, { singleton: true });
      }

      if (window.utilityFunctions) {
        window.diContainer.register('utilityFunctions', () => window.utilityFunctions, { singleton: true });
      }

      if (window.htmlSanitizer) {
        window.diContainer.register('htmlSanitizer', () => window.htmlSanitizer, { singleton: true });
      }

      if (window.idGenerator) {
        window.diContainer.register('idGenerator', () => window.idGenerator, { singleton: true });
      }

      console.log('✓ 重构模块已注册到依赖注入容器');
    } else {
      console.warn('✗ 依赖注入容器未找到');
    }
  }

  /**
     * 检查所有模块加载状态
     */
  function checkModuleStatus() {
    const loadedModules = Object.keys(moduleStatus).filter(key => moduleStatus[key]);
    const totalModules = Object.keys(moduleStatus).length;

    console.log(`模块加载状态: ${loadedModules.length}/${totalModules} 个模块已加载`);
    console.log('已加载模块:', loadedModules);

    const failedModules = Object.keys(moduleStatus).filter(key => !moduleStatus[key]);
    if (failedModules.length > 0) {
      console.warn('未加载模块:', failedModules);
    }

    return loadedModules.length === totalModules;
  }

  /**
     * 主初始化函数
     */
  function initRefactoredModules() {
    console.log('开始初始化重构模块...');

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initRefactoredModules);
      return;
    }

    // 初始化各个模块
    setTimeout(() => {
      initNotificationSystem();
      initUtilityFunctions();
      initHTMLSanitizer();
      initIDGenerator();

      // 注册到依赖注入容器
      registerToDIContainer();

      // 检查加载状态
      const allLoaded = checkModuleStatus();

      if (allLoaded) {
        console.log('✓ 所有重构模块初始化完成');

        // 触发自定义事件，通知其他模块
        const event = new CustomEvent('refactoredModulesReady', {
          detail: {
            moduleStatus,
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(event);
      } else {
        console.warn('⚠ 部分重构模块初始化失败');
      }
    }, 100); // 短暂延迟确保其他脚本已加载
  }

  // 导出初始化函数
  window.initRefactoredModules = initRefactoredModules;

  // 自动初始化
  initRefactoredModules();

})();
