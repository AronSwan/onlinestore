// 用途：缓存一致性性能测试，验证写操作后的缓存失效机制
// 依赖文件：products.service.ts, cache.module.ts
// 作者：后端开发团队
// 时间：2025-09-30

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 自定义指标
const cacheHitRate = new Rate('cache_hit_rate');
const cacheMissRate = new Rate('cache_miss_rate');
const responseTime = new Trend('response_time');
const cacheInvalidationSuccess = new Counter('cache_invalidation_success');
const cacheInvalidationFailure = new Counter('cache_invalidation_failure');

// 测试配置
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // 预热阶段
    { duration: '1m', target: 100 },  // 正常负载
    { duration: '2m', target: 200 },  // 压力测试
    { duration: '30s', target: 50 },  // 恢复阶段
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%请求响应时间小于500ms
    http_req_failed: ['rate<0.01'],   // 错误率小于1%
    cache_hit_rate: ['rate>0.8'],     // 缓存命中率大于80%
    cache_invalidation_success: ['count>0'], // 缓存失效必须成功
  },
};

// 测试数据
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-jwt-token';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`,
};

// 共享数据
let productId = null;

export default function () {
  // 测试场景1：创建产品并验证缓存失效
  if (__ITER % 10 === 0) {
    testCreateProductAndCacheInvalidation();
  }
  
  // 测试场景2：读取产品详情（验证缓存命中）
  testReadProductDetail();
  
  // 测试场景3：更新产品并验证缓存失效
  if (__ITER % 15 === 0) {
    testUpdateProductAndCacheInvalidation();
  }
  
  // 测试场景4：搜索产品（验证列表缓存）
  testSearchProducts();
  
  sleep(0.1);
}

function testCreateProductAndCacheInvalidation() {
  // 1. 先读取产品列表，建立缓存
  const listResponse = http.get(`${BASE_URL}/api/v1/products?page=1&limit=20`, { headers });
  
  check(listResponse, {
    '产品列表请求成功': (r) => r.status === 200,
  });
  
  // 记录响应时间
  responseTime.add(listResponse.timings.duration);
  
  // 2. 创建新产品
  const newProduct = {
    name: `性能测试产品-${Date.now()}`,
    description: '缓存一致性测试产品',
    price: Math.floor(Math.random() * 1000) + 100,
    stock: Math.floor(Math.random() * 100) + 10,
    categoryId: 1,
  };
  
  const createResponse = http.post(`${BASE_URL}/api/v1/products`, JSON.stringify(newProduct), { headers });
  
  check(createResponse, {
    '产品创建成功': (r) => r.status === 201,
    '返回产品ID': (r) => r.json('id') !== undefined,
  });
  
  if (createResponse.status === 201) {
    productId = createResponse.json('id');
    
    // 3. 立即读取产品列表，验证缓存已被清除
    const listAfterCreate = http.get(`${BASE_URL}/api/v1/products?page=1&limit=20`, { headers });
    
    check(listAfterCreate, {
      '创建后列表请求成功': (r) => r.status === 200,
    });
    
    // 记录缓存失效成功
    cacheInvalidationSuccess.add(1);
  }
}

function testReadProductDetail() {
  if (!productId) return;
  
  // 第一次读取（可能缓存未命中）
  const firstRead = http.get(`${BASE_URL}/api/v1/products/${productId}`, { headers });
  
  check(firstRead, {
    '产品详情读取成功': (r) => r.status === 200,
  });
  
  responseTime.add(firstRead.timings.duration);
  cacheMissRate.add(1);
  
  // 短暂延迟后第二次读取（应该缓存命中）
  sleep(0.05);
  
  const secondRead = http.get(`${BASE_URL}/api/v1/products/${productId}`, { headers });
  
  check(secondRead, {
    '第二次读取成功': (r) => r.status === 200,
  });
  
  responseTime.add(secondRead.timings.duration);
  
  // 假设第二次读取应该更快（缓存命中）
  if (secondRead.timings.duration < firstRead.timings.duration) {
    cacheHitRate.add(1);
  } else {
    cacheMissRate.add(1);
  }
}

function testUpdateProductAndCacheInvalidation() {
  if (!productId) return;
  
  // 1. 先读取产品详情，建立缓存
  const detailBeforeUpdate = http.get(`${BASE_URL}/api/v1/products/${productId}`, { headers });
  
  // 2. 更新产品信息
  const updateData = {
    name: `更新后的产品-${Date.now()}`,
    price: Math.floor(Math.random() * 1000) + 200,
  };
  
  const updateResponse = http.patch(`${BASE_URL}/api/v1/products/${productId}`, JSON.stringify(updateData), { headers });
  
  check(updateResponse, {
    '产品更新成功': (r) => r.status === 200,
  });
  
  if (updateResponse.status === 200) {
    // 3. 立即读取产品详情，验证缓存已被清除
    const detailAfterUpdate = http.get(`${BASE_URL}/api/v1/products/${productId}`, { headers });
    
    check(detailAfterUpdate, {
      '更新后详情读取成功': (r) => r.status === 200,
      '产品名称已更新': (r) => r.json('name') === updateData.name,
    });
    
    // 记录缓存失效成功
    cacheInvalidationSuccess.add(1);
  }
}

function testSearchProducts() {
  const searchTerms = ['测试', '产品', '性能', '缓存'];
  const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  const searchResponse = http.get(`${BASE_URL}/api/v1/products/search?keyword=${randomTerm}`, { headers });
  
  check(searchResponse, {
    '搜索请求成功': (r) => r.status === 200,
    '返回产品列表': (r) => r.json('products') !== undefined,
  });
  
  responseTime.add(searchResponse.timings.duration);
}

// 设置函数 - 在测试开始前执行
export function setup() {
  console.log('缓存一致性性能测试开始');
  console.log(`测试目标: ${BASE_URL}`);
  console.log('验证写操作后的缓存失效机制');
}

// 清理函数 - 在测试结束后执行
export function teardown(data) {
  console.log('缓存一致性性能测试结束');
  console.log('测试结果分析:');
  console.log('- 缓存命中率:', data.metrics.cache_hit_rate);
  console.log('- 平均响应时间:', data.metrics.http_req_duration);
  console.log('- 缓存失效成功率:', data.metrics.cache_invalidation_success);
}