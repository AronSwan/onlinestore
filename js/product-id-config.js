/**
 * 产品ID编码规则配置示例
 * 展示如何使用产品ID管理器进行灵活的编码规则配置
 */

// 用途：产品ID编码规则配置示例，展示多种编码格式和自定义规则
// 依赖文件：product-id-manager.js (通过window.ProductIdManager使用)
// 作者：AI助手
// 时间：2025-09-24 23:15:00

// 配置示例1：纯数字格式（8位）
const numericConfig = {
  format: 'numeric',
  length: 8,
  prefix: '',
  suffix: '',
  allowCustom: true
};

// 配置示例2：字母数字格式（10位）
const alphanumericConfig = {
  format: 'alphanumeric',
  length: 10,
  prefix: 'PROD-',
  suffix: '',
  allowCustom: true
};

// 配置示例3：自定义格式（带产品类型）
const customConfig = {
  format: 'custom',
  length: 8,
  prefix: '',
  suffix: '',
  productTypes: {
    'clothing': 'CL',
    'electronics': 'EL',
    'accessories': 'AC',
    'home': 'HM',
    'sports': 'SP',
    'books': 'BK',
    'food': 'FD',
    'beauty': 'BT',
    'toys': 'TY',
    'other': 'OT'
  },
  allowCustom: true
};

// 配置示例4：企业级格式（带前缀和分隔符）
const enterpriseConfig = {
  format: 'numeric',
  length: 6,
  prefix: 'COMP',
  separator: '-',
  suffix: '',
  allowCustom: false,
  validation: {
    required: true,
    minLength: 10,
    maxLength: 15
  }
};

/**
 * 演示产品ID管理器的使用
 */
function demonstrateProductIdManager() {
  console.log('=== 产品ID编码规则演示 ===');
  
  // 创建不同配置的管理器实例
  const numericManager = new ProductIdManager(numericConfig);
  const alphanumericManager = new ProductIdManager(alphanumericConfig);
  const customManager = new ProductIdManager(customConfig);
  const enterpriseManager = new ProductIdManager(enterpriseConfig);
  
  // 演示生成产品ID
  console.log('\n1. 生成产品ID示例:');
  
  // 数字格式
  const numericId = numericManager.generate({ sequence: 1 });
  console.log(`数字格式: ${numericId}`);
  
  // 字母数字格式
  const alphanumericId = alphanumericManager.generate({ sequence: 123 });
  console.log(`字母数字格式: ${alphanumericId}`);
  
  // 自定义格式（带产品类型）
  const customId = customManager.generate({ type: 'electronics', sequence: 456 });
  console.log(`自定义格式（电子产品）: ${customId}`);
  
  // 企业格式
  const enterpriseId = enterpriseManager.generate({ sequence: 789 });
  console.log(`企业格式: ${enterpriseId}`);
  
  // 演示验证产品ID
  console.log('\n2. 验证产品ID示例:');
  
  const testIds = [
    '00000001',
    'PROD-A1B2C3D4E5',
    'EL000456',
    'COMP-000789',
    'invalid-id'
  ];
  
  testIds.forEach(id => {
    const isValid = numericManager.validate(id) || 
                   alphanumericManager.validate(id) || 
                   customManager.validate(id) || 
                   enterpriseManager.validate(id);
    console.log(`${id}: ${isValid ? '有效' : '无效'}`);
  });
  
  // 演示解析产品ID
  console.log('\n3. 解析产品ID示例:');
  
  const idsToParse = ['EL000456', 'COMP-000789'];
  idsToParse.forEach(id => {
    const result = customManager.parse(id) || enterpriseManager.parse(id);
    if (result.valid) {
      console.log(`${id}: 类型=${result.type}, 序列号=${result.sequence}`);
    } else {
      console.log(`${id}: ${result.error}`);
    }
  });
  
  // 演示动态配置更新
  console.log('\n4. 动态配置更新示例:');
  
  console.log('更新前配置:', numericManager.getConfig().format);
  numericManager.updateConfig({ format: 'alphanumeric', length: 12 });
  console.log('更新后配置:', numericManager.getConfig().format);
  
  const updatedId = numericManager.generate({ sequence: 999 });
  console.log(`更新后生成的ID: ${updatedId}`);
  
  // 重置配置
  numericManager.resetConfig();
  console.log('重置后配置:', numericManager.getConfig().format);
}

/**
 * 集成到购物车系统的示例
 */
function integrateWithCartSystem() {
  console.log('\n=== 与购物车系统集成示例 ===');
  
  // 使用全局产品ID管理器
  const productIdManager = window.globalProductIdManager;
  
  // 模拟从HTML元素获取产品信息
  const mockProductCard = {
    dataset: {
      productId: '00000001',
      productType: 'electronics'
    },
    querySelector: () => ({ 
      textContent: '示例产品',
      src: 'product.jpg'
    })
  };
  
  // 验证和处理产品ID
  const rawProductId = mockProductCard.dataset.productId;
  
  if (productIdManager.validate(rawProductId)) {
    console.log(`产品ID有效: ${rawProductId}`);
    
    // 解析产品ID信息
    const parsedInfo = productIdManager.parse(rawProductId);
    console.log('解析信息:', parsedInfo);
    
    // 创建购物车商品对象
    const cartItem = {
      id: rawProductId,
      name: '示例产品',
      price: '¥100',
      image: 'product.jpg',
      type: parsedInfo.type
    };
    
    console.log('购物车商品对象:', cartItem);
  } else {
    console.log(`产品ID无效: ${rawProductId}`);
    
    // 生成新的有效产品ID
    const newProductId = productIdManager.generate({
      type: mockProductCard.dataset.productType || 'other',
      sequence: Date.now()
    });
    
    console.log(`生成的新产品ID: ${newProductId}`);
  }
}

/**
 * 批量处理产品ID的示例
 */
function batchProcessProductIds() {
  console.log('\n=== 批量处理产品ID示例 ===');
  
  const productIdManager = window.globalProductIdManager;
  
  // 模拟产品数据
  const products = [
    { id: '00000001', name: '产品1', type: 'electronics' },
    { id: '00000002', name: '产品2', type: 'clothing' },
    { id: 'invalid-id', name: '产品3', type: 'home' },
    { id: '00000004', name: '产品4', type: 'sports' }
  ];
  
  // 批量验证和标准化产品ID
  const processedProducts = products.map(product => {
    if (productIdManager.validate(product.id)) {
      // ID有效，直接使用
      return product;
    } else {
      // ID无效，生成新的标准ID
      return {
        ...product,
        id: productIdManager.generate({
          type: product.type,
          sequence: Date.now() + Math.random() * 1000
        })
      };
    }
  });
  
  console.log('处理后的产品列表:', processedProducts);
  
  // 按产品类型分组
  const productsByType = processedProducts.reduce((groups, product) => {
    const parsed = productIdManager.parse(product.id);
    const type = parsed.valid ? parsed.type : 'unknown';
    
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(product);
    
    return groups;
  }, {});
  
  console.log('按类型分组的产品:', productsByType);
}

// 页面加载完成后执行演示
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // 确保产品ID管理器已加载
    if (typeof ProductIdManager !== 'undefined') {
      demonstrateProductIdManager();
      integrateWithCartSystem();
      batchProcessProductIds();
    }
  });
} else {
  // 直接执行演示
  if (typeof ProductIdManager !== 'undefined') {
    demonstrateProductIdManager();
    integrateWithCartSystem();
    batchProcessProductIds();
  }
}

// 导出配置供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    numericConfig,
    alphanumericConfig,
    customConfig,
    enterpriseConfig,
    demonstrateProductIdManager,
    integrateWithCartSystem,
    batchProcessProductIds
  };
} else {
  // 浏览器环境
  window.productIdConfigs = {
    numeric: numericConfig,
    alphanumeric: alphanumericConfig,
    custom: customConfig,
    enterprise: enterpriseConfig
  };
  
  window.productIdDemo = {
    demonstrate: demonstrateProductIdManager,
    integrate: integrateWithCartSystem,
    batchProcess: batchProcessProductIds
  };
}