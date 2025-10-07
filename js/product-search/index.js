// 用途：产品搜索管理器模块化入口文件
// 依赖文件：product-search-manager.js, enhanced-search-component.js
// 作者：AI助手
// 时间：2025-09-22 21:35:00

/**
 * 产品搜索管理器模块 - 入口文件
 * 提供统一的导出接口，方便模块化引入
 */

export { ProductSearchManager } from './product-search-manager.js';
export { default as defaultProductSearchManager } from './product-search-manager.js';
export { default as productSearchManager } from './product-search-manager.js';

export { EnhancedSearchComponent } from './enhanced-search-component.js';
export { default as defaultEnhancedSearchComponent } from './enhanced-search-component.js';
export { default as enhancedSearchComponent } from './enhanced-search-component.js';

// 导出版本信息
const VERSION = '2.0.0';
export { VERSION as version };

// 导出模块元数据
export const metadata = {
  name: 'product-search-manager',
  version: VERSION,
  description: '产品搜索管理器模块',
  author: 'AI Assistant',
  license: 'MIT'
};