#!/usr/bin/env ts-node

// 用途：测试CQRS与OpenObserve的集成
// 作者：后端开发团队
// 时间：2025-10-09

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import { EnvironmentAdapter } from '../../src/config/environment-adapter';

interface TestData {
  timestamp: string;
  level: string;
  service: string;
  source: string;
  bus: string;
  type: string;
  status: string;
  duration_ms: number;
  traceId: string;
  spanId: string;
  id?: string;
  cacheKey?: string;
  cacheHit?: boolean;
  stale?: boolean;
  subscriber?: string;
  handler?: string;
  [key: string]: any; // 允许其他属性
}

/**
 * 发送测试数据
 */
async function sendTestData(stream: string, data: any[]): Promise<void> {
  const { baseUrl, organization, token } = EnvironmentAdapter.getOpenObserve();
  const url = `${baseUrl}/api/${organization}/${stream}/_json`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send test data to ${stream}: ${response.status} ${errorText}`);
  }
  
  console.log(`✓ Sent test data to ${stream}`);
}

/**
 * 测试日志采集
 */
async function testLogIngestion(): Promise<void> {
  console.log('Testing log ingestion...');
  
  const now = new Date();
  const testCommands: TestData[] = [];
  const testQueries: TestData[] = [];
  const testEvents: TestData[] = [];
  
  // 生成测试数据
  for (let i = 0; i < 50; i++) {
    const baseData = {
      timestamp: new Date(now.getTime() + i * 1000).toISOString(),
      level: i % 10 === 0 ? 'ERROR' : 'INFO',
      service: 'backend',
      source: 'apiserver',
      env: 'test',
      version: '1.0.0',
      traceId: `trace-${i}`,
      spanId: `span-${i}`,
    };
    
    // 命令测试数据
    testCommands.push({
      ...baseData,
      bus: 'command',
      type: `CreateOrder${i % 5}`,
      id: `cmd-${i}`,
      status: i % 10 === 0 ? 'error' : 'success',
      duration_ms: 100 + Math.random() * 400, // 100-500ms
      handler: `CreateOrderHandler`,
    });
    
    // 查询测试数据
    testQueries.push({
      ...baseData,
      bus: 'query',
      type: `GetOrder${i % 3}`,
      status: 'success',
      cacheKey: `order-${i}`,
      cacheHit: i % 3 === 0,
      stale: false,
      duration_ms: 50 + Math.random() * 250, // 50-300ms
      handler: `GetOrderHandler`,
    });
    
    // 事件测试数据
    testEvents.push({
      ...baseData,
      bus: 'event',
      type: `OrderCreated${i % 2}`,
      status: 'published',
      subscriber: `OrderEventHandler`,
      duration_ms: 30 + Math.random() * 120, // 30-150ms
    });
  }
  
  // 发送测试数据
  await sendTestData('cqrs-commands', testCommands);
  await sendTestData('cqrs-queries', testQueries);
  await sendTestData('cqrs-events', testEvents);
  
  console.log('✓ Log ingestion test completed');
}

/**
 * 测试指标采集
 */
async function testMetricIngestion(): Promise<void> {
  console.log('Testing metric ingestion...');
  
  const now = new Date();
  const testMetrics: any[] = [];
  
  // 生成测试指标数据
  for (let i = 0; i < 100; i++) {
    testMetrics.push({
      timestamp: new Date(now.getTime() + i * 1000).toISOString(),
      level: 'INFO',
      service: 'backend',
      source: 'metrics',
      env: 'test',
      version: '1.0.0',
      metric_name: i % 20 === 0 ? 'cqrs_command_duration_ms' : 
                    i % 20 === 1 ? 'cqrs_query_duration_ms' : 
                    i % 20 === 2 ? 'cqrs_command_total' : 
                    i % 20 === 3 ? 'cqrs_query_total' : 
                    'cqrs_event_published_total',
      metric_value: Math.random() * 1000,
      type: i % 20 === 0 ? `CreateOrder${i % 5}` : 
            i % 20 === 1 ? `GetOrder${i % 3}` : 
            i % 20 === 2 ? `CreateOrder${i % 5}` : 
            i % 20 === 3 ? `GetOrder${i % 3}` : 
            `OrderCreated${i % 2}`,
      status: i % 10 === 0 ? 'error' : 'success',
      cache_hit: i % 3 === 0,
      handler: i % 10 === 0 ? `CreateOrderHandler` : 
              i % 10 === 1 ? `GetOrderHandler` : 
              'OrderEventHandler',
    });
  }
  
  // 发送测试指标
  await sendTestData('cqrs-metrics', testMetrics);
  
  console.log('✓ Metric ingestion test completed');
}

/**
 * 测试分布式追踪
 */
async function testTracingIngestion(): Promise<void> {
  console.log('Testing tracing ingestion...');
  
  const now = new Date();
  const testTraces: any[] = [];
  
  // 生成测试追踪数据
  for (let i = 0; i < 20; i++) {
    testTraces.push({
      timestamp: new Date(now.getTime() + i * 1000).toISOString(),
      level: 'INFO',
      service: 'backend',
      source: 'tracing',
      env: 'test',
      version: '1.0.0',
      traceId: `trace-${i}`,
      spanId: `span-${i}`,
      parentSpanId: i > 0 ? `span-${i - 1}` : undefined,
      operationName: i % 3 === 0 ? `CreateOrder` : i % 3 === 1 ? `GetOrder` : `OrderCreated`,
      serviceName: 'backend',
      kind: 'SPAN_KIND_INTERNAL',
      duration_ms: 100 + Math.random() * 200,
      status: 'ok',
      attributes: {
        'command.id': i % 3 === 0 ? `cmd-${i}` : undefined,
        'query.cache_key': i % 3 === 1 ? `order-${i}` : undefined,
        'event.id': i % 3 === 2 ? `event-${i}` : undefined,
      },
    });
  }
  
  // 发送测试追踪数据
  await sendTestData('traces', testTraces);
  
  console.log('✓ Tracing ingestion test completed');
}

/**
 * 查询测试数据
 */
async function queryTestData(): Promise<void> {
  console.log('Querying test data...');
  
  // 等待数据被处理
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const { baseUrl, organization, token } = EnvironmentAdapter.getOpenObserve();
  
  // 查询命令日志
  try {
    const commandQuery = encodeURIComponent(`
      SELECT type, status, avg(duration_ms) as avg_duration
      FROM "cqrs-commands"
      WHERE timestamp >= NOW() - INTERVAL 1 HOUR
      GROUP BY type, status
      ORDER BY avg_duration DESC
      LIMIT 10
    `);
    
    const commandUrl = `${baseUrl}/api/${organization}/_search?type=SQL&sql=${commandQuery}`;
    
    const commandResponse = await fetch(commandUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (commandResponse.ok) {
      const commandResult = await commandResponse.json();
      console.log('✓ Command logs query result:', commandResult.hits?.slice(0, 5));
    } else {
      console.warn('Failed to query command logs');
    }
  } catch (error) {
    console.warn('Error querying command logs:', error);
  }
  
  // 查询指标
  try {
    const metricQuery = encodeURIComponent(`
      SELECT metric_name, type, avg(metric_value) as avg_value
      FROM "cqrs-metrics"
      WHERE timestamp >= NOW() - INTERVAL 1 HOUR
        AND metric_name LIKE '%duration_ms%'
      GROUP BY metric_name, type
      ORDER BY avg_value DESC
      LIMIT 10
    `);
    
    const metricUrl = `${baseUrl}/api/${organization}/_search?type=SQL&sql=${metricQuery}`;
    
    const metricResponse = await fetch(metricUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (metricResponse.ok) {
      const metricResult = await metricResponse.json();
      console.log('✓ Metrics query result:', metricResult.hits?.slice(0, 5));
    } else {
      console.warn('Failed to query metrics');
    }
  } catch (error) {
    console.warn('Error querying metrics:', error);
  }
  
  console.log('✓ Query test completed');
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const { baseUrl, organization, token } = EnvironmentAdapter.getOpenObserve();
  
  if (!baseUrl || !organization || !token) {
    throw new Error('Missing required environment variables: OPENOBSERVE_URL, OPENOBSERVE_ORGANIZATION, OPENOBSERVE_TOKEN');
  }
  
  console.log('Starting CQRS OpenObserve integration test...');
  const startTime = performance.now();
  
  try {
    await testLogIngestion();
    await testMetricIngestion();
    await testTracingIngestion();
    await queryTestData();
    
    const duration = performance.now() - startTime;
    console.log(`✓ CQRS OpenObserve integration test completed in ${duration.toFixed(2)}ms`);
  } catch (error) {
    console.error('✗ CQRS OpenObserve integration test failed:', error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}