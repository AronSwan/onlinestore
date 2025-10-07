/**
 * MeiliSearch 测试设置脚本
 * 
 * 此脚本用于测试和验证 MeiliSearch 服务的集成情况
 * 包括连接测试、索引操作、搜索功能等
 */

const axios = require('axios');
const { createLogger, format, transports } = require('winston');

// 配置日志
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'meilisearch-test.log' })
  ]
});

// MeiliSearch 配置
const MEILISEARCH_CONFIG = {
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || 'masterKey',
  indexName: 'products'
};

// 测试数据
const TEST_PRODUCTS = [
  {
    id: '1',
    name: 'iPhone 15 Pro',
    description: '最新款苹果手机，配备A17 Pro芯片',
    price: 7999,
    originalPrice: 8999,
    category: '手机',
    categoryId: 1,
    tags: ['苹果', '智能手机', '5G'],
    stock: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'MacBook Pro 14"',
    description: '专业级笔记本电脑，M3芯片',
    price: 14999,
    originalPrice: 16999,
    category: '笔记本',
    categoryId: 2,
    tags: ['苹果', '笔记本', 'M3'],
    stock: 50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'AirPods Pro',
    description: '主动降噪无线耳机',
    price: 1899,
    originalPrice: 2199,
    category: '耳机',
    categoryId: 3,
    tags: ['苹果', '耳机', '降噪'],
    stock: 200,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

class MeiliSearchTest {
  constructor() {
    this.baseUrl = MEILISEARCH_CONFIG.host;
    this.apiKey = MEILISEARCH_CONFIG.apiKey;
    this.indexName = MEILISEARCH_CONFIG.indexName;
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 检查 MeiliSearch 服务健康状态
   */
  async checkHealth() {
    try {
      logger.info('检查 MeiliSearch 服务健康状态...');
      const response = await axios.get(`${this.baseUrl}/health`);
      
      if (response.data.status === 'available') {
        logger.info('✅ MeiliSearch 服务运行正常');
        return true;
      } else {
        logger.error('❌ MeiliSearch 服务状态异常');
        return false;
      }
    } catch (error) {
      logger.error('❌ 无法连接到 MeiliSearch 服务:', error.message);
      return false;
    }
  }

  /**
   * 创建或清空索引
   */
  async setupIndex() {
    try {
      logger.info('设置测试索引...');
      
      // 删除现有索引（如果存在）
      try {
        await axios.delete(`${this.baseUrl}/indexes/${this.indexName}`, { headers: this.headers });
        logger.info('已删除现有索引');
      } catch (error) {
        // 索引不存在，忽略错误
        logger.info('索引不存在，将创建新索引');
      }

      // 创建新索引
      await axios.post(`${this.baseUrl}/indexes`, {
        uid: this.indexName,
        primaryKey: 'id'
      }, { headers: this.headers });
      
      logger.info('✅ 索引创建成功');

      // 配置索引设置
      await this.configureIndexSettings();
      
      return true;
    } catch (error) {
      logger.error('❌ 索引设置失败:', error.message);
      return false;
    }
  }

  /**
   * 配置索引设置
   */
  async configureIndexSettings() {
    try {
      logger.info('配置索引设置...');

      // 等待索引完全创建
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 设置可搜索属性
      await axios.put(
        `${this.baseUrl}/indexes/${this.indexName}/settings/searchable-attributes`,
        ['name', 'description', 'tags', 'category'],
        { headers: this.headers }
      );

      // 设置可过滤属性
      await axios.put(
        `${this.baseUrl}/indexes/${this.indexName}/settings/filterable-attributes`,
        ['categoryId', 'price', 'tags', 'stock', 'isActive'],
        { headers: this.headers }
      );

      // 设置可排序属性
      await axios.put(
        `${this.baseUrl}/indexes/${this.indexName}/settings/sortable-attributes`,
        ['price', 'createdAt', 'updatedAt'],
        { headers: this.headers }
      );

      // 等待设置生效
      await new Promise(resolve => setTimeout(resolve, 2000));

      logger.info('✅ 索引设置配置完成');
    } catch (error) {
      logger.error('❌ 索引设置配置失败:', error.message);
      throw error;
    }
  }

  /**
   * 索引测试数据
   */
  async indexTestData() {
    try {
      logger.info('索引测试数据...');
      
      const documents = TEST_PRODUCTS.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        category: product.category,
        categoryId: product.categoryId,
        tags: product.tags,
        stock: product.stock,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }));

      await axios.post(
        `${this.baseUrl}/indexes/${this.indexName}/documents`,
        documents,
        { headers: this.headers }
      );

      logger.info(`✅ 成功索引 ${documents.length} 个产品`);
      return true;
    } catch (error) {
      logger.error('❌ 数据索引失败:', error.message);
      return false;
    }
  }

  /**
   * 测试基本搜索功能
   */
  async testBasicSearch() {
    try {
      logger.info('测试基本搜索功能...');
      
      const response = await axios.post(
        `${this.baseUrl}/indexes/${this.indexName}/search`,
        {
          q: 'iPhone',
          limit: 10
        },
        { headers: this.headers }
      );

      const results = response.data.hits;
      logger.info(`✅ 搜索完成，找到 ${results.length} 个结果`);
      
      results.forEach(hit => {
        logger.info(`- ${hit.name}: ${hit.description}`);
      });

      return true;
    } catch (error) {
      logger.error('❌ 搜索测试失败:', error.message);
      return false;
    }
  }

  /**
   * 测试过滤搜索
   */
  async testFilteredSearch() {
    try {
      logger.info('测试过滤搜索功能...');
      
      // 测试按分类过滤
      const categoryFilter = await axios.post(
        `${this.baseUrl}/indexes/${this.indexName}/search`,
        {
          q: '',
          filter: `categoryId = 1`,
          limit: 10
        },
        { headers: this.headers }
      );

      logger.info(`✅ 分类过滤结果: ${categoryFilter.data.hits.length} 个产品`);

      // 测试价格范围过滤
      const priceFilter = await axios.post(
        `${this.baseUrl}/indexes/${this.indexName}/search`,
        {
          q: '',
          filter: `price >= 1000 AND price <= 10000`,
          limit: 10
        },
        { headers: this.headers }
      );

      logger.info(`✅ 价格过滤结果: ${priceFilter.data.hits.length} 个产品`);

      return true;
    } catch (error) {
      logger.error('❌ 过滤搜索测试失败:', error.message);
      return false;
    }
  }

  /**
   * 测试排序功能
   */
  async testSorting() {
    try {
      logger.info('测试排序功能...');
      
      // 按价格升序
      const priceAsc = await axios.post(
        `${this.baseUrl}/indexes/${this.indexName}/search`,
        {
          q: '',
          sort: ['price:asc'],
          limit: 10
        },
        { headers: this.headers }
      );

      logger.info(`✅ 价格升序结果: ${priceAsc.data.hits.length} 个产品`);
      logger.info(`最低价格: ${priceAsc.data.hits[0]?.price}`);
      logger.info(`最高价格: ${priceAsc.data.hits[priceAsc.data.hits.length - 1]?.price}`);

      // 按价格降序
      const priceDesc = await axios.post(
        `${this.baseUrl}/indexes/${this.indexName}/search`,
        {
          q: '',
          sort: ['price:desc'],
          limit: 10
        },
        { headers: this.headers }
      );

      logger.info(`✅ 价格降序结果: ${priceDesc.data.hits.length} 个产品`);
      logger.info(`最高价格: ${priceDesc.data.hits[0]?.price}`);
      logger.info(`最低价格: ${priceDesc.data.hits[priceDesc.data.hits.length - 1]?.price}`);

      return true;
    } catch (error) {
      logger.error('❌ 排序测试失败:', error.message);
      return false;
    }
  }

  /**
   * 测试分页功能
   */
  async testPagination() {
    try {
      logger.info('测试分页功能...');
      
      // 第一页
      const page1 = await axios.post(
        `${this.baseUrl}/indexes/${this.indexName}/search`,
        {
          q: '',
          limit: 2,
          offset: 0
        },
        { headers: this.headers }
      );

      logger.info(`✅ 第一页结果: ${page1.data.hits.length} 个产品`);
      page1.data.hits.forEach(hit => {
        logger.info(`- ${hit.name}`);
      });

      // 第二页
      const page2 = await axios.post(
        `${this.baseUrl}/indexes/${this.indexName}/search`,
        {
          q: '',
          limit: 2,
          offset: 2
        },
        { headers: this.headers }
      );

      logger.info(`✅ 第二页结果: ${page2.data.hits.length} 个产品`);
      page2.data.hits.forEach(hit => {
        logger.info(`- ${hit.name}`);
      });

      return true;
    } catch (error) {
      logger.error('❌ 分页测试失败:', error.message);
      return false;
    }
  }

  /**
   * 测试文档删除
   */
  async testDocumentDeletion() {
    try {
      logger.info('测试文档删除功能...');
      
      // 先确认文档存在
      const beforeDelete = await axios.post(
        `${this.baseUrl}/indexes/${this.indexName}/search`,
        {
          q: '',
          filter: 'id = 1'
        },
        { headers: this.headers }
      );

      if (beforeDelete.data.hits.length === 0) {
        logger.warn('⚠️  要删除的文档不存在，跳过删除测试');
        return true;
      }

      // 删除一个文档
      await axios.delete(
        `${this.baseUrl}/indexes/${this.indexName}/documents/1`,
        { headers: this.headers }
      );

      logger.info('✅ 文档删除成功');

      // 等待一小段时间让索引更新
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证删除 - 使用更精确的查询
      const verify = await axios.post(
        `${this.baseUrl}/indexes/${this.indexName}/search`,
        {
          q: 'iPhone',  // 使用具体的搜索词
          filter: 'id = 1',
          limit: 1
        },
        { headers: this.headers }
      );

      if (verify.data.hits.length === 0) {
        logger.info('✅ 删除验证成功');
        return true;
      } else {
        logger.error('❌ 删除验证失败，文档仍然存在');
        logger.error('找到的文档:', JSON.stringify(verify.data.hits[0], null, 2));
        return false;
      }
    } catch (error) {
      logger.error('❌ 文档删除测试失败:', error.message);
      return false;
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    logger.info('🚀 开始 MeiliSearch 集成测试...');
    
    const tests = [
      { name: '健康检查', fn: () => this.checkHealth() },
      { name: '索引设置', fn: () => this.setupIndex() },
      { name: '数据索引', fn: () => this.indexTestData() },
      { name: '基本搜索', fn: () => this.testBasicSearch() },
      { name: '过滤搜索', fn: () => this.testFilteredSearch() },
      { name: '排序功能', fn: () => this.testSorting() },
      { name: '分页功能', fn: () => this.testPagination() },
      { name: '文档删除', fn: () => this.testDocumentDeletion() }
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
      try {
        logger.info(`\n📋 运行测试: ${test.name}`);
        const result = await test.fn();
        
        if (result) {
          passedTests++;
          logger.info(`✅ ${test.name} 通过`);
        } else {
          logger.error(`❌ ${test.name} 失败`);
        }
      } catch (error) {
        logger.error(`❌ ${test.name} 异常:`, error.message);
      }
    }

    logger.info(`\n📊 测试完成: ${passedTests}/${totalTests} 通过`);
    
    if (passedTests === totalTests) {
      logger.info('🎉 所有测试通过！MeiliSearch 集成成功');
      return true;
    } else {
      logger.error('⚠️  部分测试失败，请检查配置');
      return false;
    }
  }
}

// 主函数
async function main() {
  const tester = new MeiliSearchTest();
  
  try {
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    logger.error('测试执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = MeiliSearchTest;
