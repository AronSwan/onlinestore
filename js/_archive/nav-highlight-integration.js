
/**
 * 导航栏按钮高亮和下划线动画集成脚本
 * 
 * 使用方法：
 * 1. 在HTML文件中引入优化后的CSS文件
 * 2. 在HTML文件中引入优化后的JS文件
 * 3. 调用初始化函数
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：提供导航栏高亮功能集成，支持版本切换、初始化和清理功能
// 依赖文件：无

// 检查是否已经加载了优化版本
function isOptimizedVersionLoaded() {
  return typeof window.initUnifiedNavHighlightOptimized === 'function';
}

// 检查是否已经加载了原始版本
function isOriginalVersionLoaded() {
  return typeof window.initUnifiedNavHighlight === 'function';
}

// 初始化导航高亮功能
function initNavigationHighlight(options = {}) {
  const defaultOptions = {
    useOptimizedVersion: true,
    enableDebugMode: false,
    autoCleanup: true,
  };
  
  const config = { ...defaultOptions, ...options };
  
  if (config.enableDebugMode) {
    console.log('初始化导航高亮功能，配置:', config);
  }
  
  // 清理现有的导航高亮功能
  if (config.autoCleanup) {
    cleanupNavigationHighlight();
  }
  
  // 根据配置选择版本
  if (config.useOptimizedVersion && isOptimizedVersionLoaded()) {
    if (config.enableDebugMode) {
      console.log('使用优化版本的导航高亮功能');
    }
    
    // 初始化优化版本
    const cleanup = window.initUnifiedNavHighlightOptimized();
    
    // 将清理函数保存到全局变量
    window.cleanupNavigationHighlight = cleanup;
    
    return {
      version: 'optimized',
      cleanup: cleanup,
    };
  } else if (isOriginalVersionLoaded()) {
    if (config.enableDebugMode) {
      console.log('使用原始版本的导航高亮功能');
    }
    
    // 初始化原始版本
    const cleanup = window.initUnifiedNavHighlight();
    
    // 将清理函数保存到全局变量
    window.cleanupUnifiedNavHighlight = cleanup;
    
    return {
      version: 'original',
      cleanup: cleanup,
    };
  } else {
    console.error('未找到可用的导航高亮功能');
    return null;
  }
}

// 清理导航高亮功能
function cleanupNavigationHighlight() {
  // 清理优化版本
  if (typeof window.cleanupUnifiedNavHighlightOptimized === 'function') {
    window.cleanupUnifiedNavHighlightOptimized();
    window.cleanupUnifiedNavHighlightOptimized = null;
  }
  
  // 清理原始版本
  if (typeof window.cleanupUnifiedNavHighlight === 'function') {
    window.cleanupUnifiedNavHighlight();
    window.cleanupUnifiedNavHighlight = null;
  }
  
  // 清理全局清理函数
  if (typeof window.cleanupNavigationHighlight === 'function') {
    window.cleanupNavigationHighlight();
    window.cleanupNavigationHighlight = null;
  }
}

// 切换导航高亮版本
function switchNavigationHighlightVersion(version) {
  if (version === 'optimized' && isOptimizedVersionLoaded()) {
    cleanupNavigationHighlight();
    return initNavigationHighlight({ useOptimizedVersion: true });
  } else if (version === 'original' && isOriginalVersionLoaded()) {
    cleanupNavigationHighlight();
    return initNavigationHighlight({ useOptimizedVersion: false });
  } else {
    console.error('无法切换到指定的版本:', version);
    return null;
  }
}

// 导出函数到全局作用域
window.initNavigationHighlight = initNavigationHighlight;
window.cleanupNavigationHighlight = cleanupNavigationHighlight;
window.switchNavigationHighlightVersion = switchNavigationHighlightVersion;
  