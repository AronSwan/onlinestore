import { check, group } from 'k6';
import http from 'k6/http';

// 测试配置
export const options = {
  stages: [
    { duration: '2m', target: 1000 },  // 逐步增加到1000并发
    { duration: '5m', target: 1000 },  // 保持1000并发
    { duration: '2m', target: 0 },     // 逐步降载
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],  // P99响应时间<500ms
    http_req_failed: ['rate<0.01'],     // 错误率<1%
  },
  // TiDB性能测试专用参数
  tidb: {
    isolationLevel: 'READ-COMMITTED',
    batchSize: 100,
    maxRetries: 3,
    dlqThreshold: 5, // 超过5次重试进入死信队列
  },
  // 批量处理测试配置
  batch: {
    size: 50,
    interval: '5s',
    maxInflight: 10
  }
};

// 测试场景
export default function () {
  group('订单流程测试', () => {
    // 1. 浏览商品
    const browseRes = http.get('https://api.example.com/products');
    check(browseRes, {
      '浏览商品成功': (r) => r.status === 200,
    });

    // 2. 创建订单
    const orderRes = http.post('https://api.example.com/orders', {
      product_id: 123,
      quantity: 1,
    });
    check(orderRes, {
      '创建订单成功': (r) => r.status === 201,
    });
  });
}