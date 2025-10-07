// 用途：产品搜索管理器测试脚本
// 依赖文件：js/product-search/index.js
// 作者：AI Assistant
// 时间：2025-09-30 16:45:00

/**
 * 产品搜索管理器测试脚本
 * 用于快速验证产品搜索管理器的基本功能是否正常工作
 */

console.log('开始测试产品搜索管理器...');

// 导入产品搜索管理器
import { ProductSearchManager, defaultProductSearchManager } from './js/product-search/index.js';

// 测试1: 验证ProductSearchManager类是否存在
console.log('测试1: 验证ProductSearchManager类是否存在');
if (typeof ProductSearchManager === 'function') {
    console.log('✓ ProductSearchManager类存在');
} else {
    console.error('✗ 错误: ProductSearchManager类不存在');
}

// 测试2: 验证defaultProductSearchManager实例是否存在
console.log('测试2: 验证defaultProductSearchManager实例是否存在');
if (defaultProductSearchManager) {
    console.log('✓ defaultProductSearchManager实例存在');
} else {
    console.error('✗ 错误: defaultProductSearchManager实例不存在');
}

// 测试3: 验证关键方法是否存在
console.log('测试3: 验证关键方法是否存在');
const requiredMethods = ['init', 'setDependencies', 'setContainers', 'setEventCallbacks', 'performSearch'];
const missingMethods = [];

requiredMethods.forEach(method => {
    if (typeof defaultProductSearchManager[method] !== 'function') {
        missingMethods.push(method);
    }
});

if (missingMethods.length === 0) {
    console.log('✓ 所有关键方法都存在');
} else {
    console.error(`✗ 错误: 缺少以下关键方法: ${missingMethods.join(', ')}`);
}

// 测试4: 测试初始化流程
console.log('测试4: 测试初始化流程');

// 创建测试容器
function createTestContainers() {
    const container = document.createElement('div');
    container.id = 'test-container';
    container.style.display = 'none';
    
    const searchInput = document.createElement('input');
    searchInput.id = 'test-search-input';
    searchInput.type = 'text';
    
    const productsContainer = document.createElement('div');
    productsContainer.id = 'test-products-container';
    
    container.appendChild(searchInput);
    container.appendChild(productsContainer);
    document.body.appendChild(container);
    
    return {
        searchInput,
        products: productsContainer
    };
}

// 创建测试容器
const testContainers = createTestContainers();

// 设置事件回调
const testCallbacks = {
    onInitComplete: function() {
        console.log('✓ 初始化完成事件被触发');
    },
    onError: function(error) {
        console.error('✗ 初始化错误:', error);
    }
};

// 尝试初始化
async function testInitialization() {
    try {
        // 设置容器
        defaultProductSearchManager.containers = testContainers;
        
        // 设置事件回调
        defaultProductSearchManager.eventCallbacks = testCallbacks;
        
        // 初始化
        const result = await defaultProductSearchManager.init();
        
        if (result && result.state && result.state.initialized) {
            console.log('✓ 产品搜索管理器初始化成功');
            
            // 测试5: 测试搜索功能
            console.log('测试5: 测试搜索功能');
            testSearch();
        } else {
            console.warn('⚠️ 产品搜索管理器初始化但状态不正常');
        }
    } catch (error) {
        console.error('✗ 产品搜索管理器初始化异常:', error);
    }
}

// 测试搜索功能
async function testSearch() {
    try {
        const searchResult = await defaultProductSearchManager.searchCore.performSearch('手机');
        
        if (searchResult && searchResult.success) {
            console.log(`✓ 搜索成功，找到 ${searchResult.results.length} 个结果`);
        } else {
            console.warn('⚠️ 搜索返回但结果不正常:', searchResult);
        }
    } catch (error) {
        console.error('✗ 搜索异常:', error);
    }
}

// 运行测试
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testInitialization);
} else {
    testInitialization();
}

// 导出测试函数供外部使用
export { testInitialization };