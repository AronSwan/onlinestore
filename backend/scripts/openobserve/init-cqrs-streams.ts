#!/usr/bin/env ts-node

// 用途：初始化CQRS相关的OpenObserve流
// 作者：后端开发团队
// 时间：2025-10-09

import fetch from 'node-fetch';
import { EnvironmentAdapter } from '../../src/config/environment-adapter';

/**
 * 创建 OpenObserve 流
 */
async function createStream(name: string, type: 'logs' | 'metrics' | 'traces'): Promise<void> {
  const { baseUrl, organization, token } = EnvironmentAdapter.getOpenObserve();
  const url = `${baseUrl}/api/${organization}/streams`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      name, 
      stream_type: type,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    // 如果是流已存在，忽略错误
    if (response.status === 409 && errorText.includes('already exists')) {
      console.log(`✓ Stream ${name} (${type}) already exists`);
      return;
    }
    
    throw new Error(`Failed to create stream ${name} (${type}): ${response.status} ${errorText}`);
  }
  
  console.log(`✓ Created stream ${name} (${type})`);
}

/**
 * 初始化 CQRS 流
 */
async function initCQRSStreams(): Promise<void> {
  const { baseUrl, organization, token } = EnvironmentAdapter.getOpenObserve();
  
  if (!baseUrl || !organization || !token) {
    throw new Error('Missing required environment variables: OPENOBSERVE_URL, OPENOBSERVE_ORGANIZATION, OPENOBSERVE_TOKEN');
  }

  console.log('Initializing CQRS streams...');
  
  const streams = [
    { name: 'cqrs-commands', type: 'logs' as const },
    { name: 'cqrs-queries', type: 'logs' as const },
    { name: 'cqrs-events', type: 'logs' as const },
    { name: 'cqrs-metrics', type: 'metrics' as const },
    { name: 'traces', type: 'traces' as const },
  ];

  for (const { name, type } of streams) {
    try {
      await createStream(name, type);
    } catch (error) {
      console.error(`Failed to initialize stream ${name}:`, error);
      process.exit(1);
    }
  }

  console.log('✓ CQRS streams initialized successfully');
}

/**
 * 创建告警规则
 */
async function createAlertRules(): Promise<void> {
  const { baseUrl, organization, token } = EnvironmentAdapter.getOpenObserve();
  const url = `${baseUrl}/api/${organization}/alerts`;
  
  const alerts = [
    {
      name: 'CQRS Command Error Rate',
      condition: 'avg_over_time(rate(cqrs_command_total{status="error"}[5m])) > 0.01',
      severity: 'critical',
      message: 'CQRS command error rate is above 1%',
      duration: '5m',
    },
    {
      name: 'CQRS Command P95 Latency',
      condition: 'histogram_quantile(0.95, rate(cqrs_command_duration_ms_bucket[10m])) > 500',
      severity: 'high',
      message: 'CQRS command P95 latency is above 500ms',
      duration: '10m',
    },
    {
      name: 'CQRS Query P95 Latency',
      condition: 'histogram_quantile(0.95, rate(cqrs_query_duration_ms_bucket[10m])) > 300',
      severity: 'high',
      message: 'CQRS query P95 latency is above 300ms',
      duration: '10m',
    },
    {
      name: 'CQRS Query Cache Hit Rate',
      condition: 'sum(rate(cqrs_query_total{cache_hit="true"}[15m])) / sum(rate(cqrs_query_total[15m])) < 0.5',
      severity: 'medium',
      message: 'CQRS query cache hit rate is below 50%',
      duration: '15m',
    },
    {
      name: 'CQRS Event DLQ',
      condition: 'increase(cqrs_event_dlq_total[1m]) > 0',
      severity: 'critical',
      message: 'CQRS events in dead letter queue',
      duration: '1m',
    },
  ];

  for (const alert of alerts) {
    try {
      const response = await fetch(`${url}/rules`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // 如果是规则已存在，忽略错误
        if (response.status === 409 && errorText.includes('already exists')) {
          console.log(`✓ Alert rule ${alert.name} already exists`);
          continue;
        }
        
        throw new Error(`Failed to create alert rule ${alert.name}: ${response.status} ${errorText}`);
      }
      
      console.log(`✓ Created alert rule: ${alert.name}`);
    } catch (error) {
      console.error(`Failed to create alert rule ${alert.name}:`, error);
      // 不退出进程，继续创建其他规则
    }
  }

  console.log('✓ Alert rules created successfully');
}

/**
 * 创建仪表板
 */
async function createDashboards(): Promise<void> {
  const { baseUrl, organization, token } = EnvironmentAdapter.getOpenObserve();
  const url = `${baseUrl}/api/${organization}/dashboards`;
  
  // 命令仪表板
  const commandDashboard = {
    name: 'CQRS Commands Dashboard',
    description: 'Monitoring dashboard for CQRS command processing',
    panels: [
      {
        title: 'Command Execution Trend',
        type: 'time-series',
        query: 'sum(rate(cqrs_command_total[5m])) by (type)',
        unit: 'reqps',
      },
      {
        title: 'Command Success Rate',
        type: 'stat',
        query: 'sum(rate(cqrs_command_total{status="success"}[5m])) / sum(rate(cqrs_command_total[5m]))',
        unit: 'percent',
      },
      {
        title: 'Command P95 Latency',
        type: 'time-series',
        query: 'histogram_quantile(0.95, rate(cqrs_command_duration_ms_bucket[10m])) by (type)',
        unit: 'ms',
      },
      {
        title: 'Command Error Rate',
        type: 'time-series',
        query: 'sum(rate(cqrs_command_total{status="error"}[5m])) / sum(rate(cqrs_command_total[5m]))',
        unit: 'percent',
      },
    ],
  };

  // 查询仪表板
  const queryDashboard = {
    name: 'CQRS Queries Dashboard',
    description: 'Monitoring dashboard for CQRS query processing',
    panels: [
      {
        title: 'Query Execution Trend',
        type: 'time-series',
        query: 'sum(rate(cqrs_query_total[5m])) by (type)',
        unit: 'reqps',
      },
      {
        title: 'Query Cache Hit Rate',
        type: 'time-series',
        query: 'sum(rate(cqrs_query_total{cache_hit="true"}[5m])) / sum(rate(cqrs_query_total[5m]))',
        unit: 'percent',
      },
      {
        title: 'Query P95 Latency',
        type: 'time-series',
        query: 'histogram_quantile(0.95, rate(cqrs_query_duration_ms_bucket[10m])) by (type)',
        unit: 'ms',
      },
    ],
  };

  // 事件仪表板
  const eventDashboard = {
    name: 'CQRS Events Dashboard',
    description: 'Monitoring dashboard for CQRS event processing',
    panels: [
      {
        title: 'Event Published Trend',
        type: 'time-series',
        query: 'sum(rate(cqrs_event_published_total[5m])) by (type)',
        unit: 'eps',
      },
      {
        title: 'Event Processing Time',
        type: 'time-series',
        query: 'histogram_quantile(0.95, rate(cqrs_event_handle_duration_ms_bucket[10m])) by (type)',
        unit: 'ms',
      },
      {
        title: 'Event DLQ Count',
        type: 'stat',
        query: 'sum(rate(cqrs_event_dlq_total[5m]))',
        unit: 'eps',
      },
    ],
  };

  for (const dashboard of [commandDashboard, queryDashboard, eventDashboard]) {
    try {
      const response = await fetch(`${url}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dashboard),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create dashboard ${dashboard.name}: ${response.status} ${errorText}`);
      }
      
      console.log(`✓ Created dashboard: ${dashboard.name}`);
    } catch (error) {
      console.error(`Failed to create dashboard ${dashboard.name}:`, error);
      // 不退出进程，继续创建其他仪表板
    }
  }

  console.log('✓ Dashboards created successfully');
}

// 主函数
async function main(): Promise<void> {
  try {
    await initCQRSStreams();
    await createAlertRules();
    await createDashboards();
    console.log('✓ CQRS OpenObserve setup completed successfully');
  } catch (error) {
    console.error('✗ Failed to setup CQRS OpenObserve:', error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}