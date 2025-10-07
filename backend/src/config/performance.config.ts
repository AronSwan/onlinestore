// 用途：性能优化配置，针对持续1.5k并发访问优化
// 用途：配置系统性能相关参数，包括HTTP连接、数据库连接池、限流、缓存、压缩、集群和监控等
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 更新：AI助手
// 时间：2025-06-17 12:40:00

import { registerAs } from '@nestjs/config';

export default registerAs('performance', () => ({
  // HTTP服务器优化
  http: {
    // 最大并发连接数
    maxConnections: 10000,
    // 连接超时时间（毫秒）
    timeout: 30000,
    // 请求头大小限制（字节）
    maxHeaderSize: 16384,
    // 请求体大小限制（字节）
    maxBodySize: 10485760, // 10MB
  },

  // 数据库连接池优化 - 调整为支持持续1.5k并发
  database: {
    // 连接池大小
    poolSize: parseInt(process.env.DB_POOL_SIZE || '300') || 300, // 增加到300以支持持续1.5k并发需求
    // 连接超时时间（毫秒）
    connectionTimeout: 60000,
    // 获取连接超时时间（毫秒）
    acquireTimeout: 60000,
    // 空闲连接超时时间（毫秒）
    idleTimeout: 300000,
    // 最大使用时间（毫秒）
    maxLifetime: 1800000,
  },

  // Redis连接池优化 - 调整为支持持续1.5k并发
  redis: {
    // 连接池大小
    poolSize: parseInt(process.env.REDIS_POOL_SIZE || '150') || 150, // 增加到150以支持持续1.5k并发需求
    // 连接超时时间（毫秒）
    connectTimeout: 10000,
    // 命令超时时间（毫秒）
    commandTimeout: 5000,
    // 空闲连接超时时间（毫秒）
    idleTimeout: 300000,
    // 最大重试次数
    maxRetriesPerRequest: 3,
  },

  // 限流配置 - 调整为支持1.5k并发
  rateLimit: {
    // 全局限流（请求/秒）
    global: {
      ttl: 60, // 时间窗口（秒）
      limit: parseInt(process.env.THROTTLER_GLOBAL_LIMIT || '10000') || 10000, // 最大请求数 - 提高至10000以支持1.5k并发，符合README_PERFORMANCE.md和README_DISTRIBUTED.md要求
    },
    // API限流
    api: {
      ttl: 60,
      limit: parseInt(process.env.THROTTLER_API_LIMIT || '5000') || 5000, // 提高至5000，符合README_PERFORMANCE.md和README_DISTRIBUTED.md要求
    },
    // 认证接口限流
    auth: {
      ttl: 60, // 时间窗口（秒）
      limit: parseInt(process.env.THROTTLER_AUTH_LIMIT || '1500') || 1500, // 提高至1500以支持持续1.5k并发需求
    },
  },

  // 缓存配置
  cache: {
    // 默认缓存时间（秒）
    defaultTtl: 3600,
    // 最大缓存项数
    maxItems: 10000,
    // 缓存压缩阈值（字节）
    compressThreshold: 1024,
    // 细化各类缓存TTL，集中管理
    ttl: {
      detail: 300, // 产品详情TTL：5分钟
      popular: 600, // 热门榜TTL：10分钟
      list: 30, // 列表页TTL：30秒
    },
  },

  // 压缩配置
  compression: {
    // 启用压缩
    enabled: true,
    // 压缩级别（1-9）
    level: 6,
    // 压缩阈值（字节）
    threshold: 1024,
    // 压缩类型
    types: ['application/json', 'text/html', 'text/css', 'text/javascript'],
  },

  // 集群配置 - 优化以支持持续1.5k并发
  cluster: {
    // 启用集群模式 - 非Docker环境也启用
    enabled: true, // 修改为始终启用，不依赖Docker
    // 工作进程数（增加以支持持续1.5k并发）
    workers: parseInt(process.env.CLUSTER_WORKERS || '6') || 6, // 增加到6个工作进程以支持持续1.5k并发需求
    // 进程重启策略
    restart: {
      // 最大重启次数
      maxRestarts: 10,
      // 重启时间窗口（秒）
      window: 3600,
    },
    // 粘性连接（用于WebSocket）
    sticky: (process.env.CLUSTER_STICKY || 'false') === 'true',
  },

  // 监控配置
  monitoring: {
    // 启用性能监控
    enabled: true,
    // 监控间隔（秒）
    interval: 30,
    // 指标保留时间（小时）
    retention: 24,
    // 告警阈值
    alerts: {
      // CPU使用率阈值（%）
      cpu: 80,
      // 内存使用率阈值（%）
      memory: 85,
      // 响应时间阈值（毫秒）
      responseTime: 1000,
      // 错误率阈值（%）
      errorRate: 5,
      // 活动连接上限
      activeConnectionsMax: 8000,
      // Redis连接池耗尽阈值（占比%）
      redisPoolExhausted: 90,
      // 事件循环延迟（毫秒）
      eventLoopLagMs: 200,
    },
  },

  // 日志配置
  logging: {
    // 日志级别
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    // 启用结构化日志
    structured: true,
    // 日志文件配置
    file: {
      // 启用文件日志
      enabled: process.env.NODE_ENV === 'production',
      // 日志文件路径
      path: './logs',
      // 最大文件大小（MB）
      maxSize: 100,
      // 保留文件数
      maxFiles: 10,
    },
  },
}));
