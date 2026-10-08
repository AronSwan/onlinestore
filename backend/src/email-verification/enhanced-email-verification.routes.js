/**
 * Enhanced Email Verification Routes - 增强的邮箱验证路由
 * 
 * 功能特性：
 * - 请求限流和安全中间件
 * - API版本控制
 * - 请求验证和错误处理
 * - 监控和日志记录
 * - 文档生成支持
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const EnhancedEmailVerificationController = require('./enhanced-email-verification.controller');
const OpenObserveService = require('./openobserve-service');

const router = express.Router();

// 初始化控制器和监控服务
const controller = new EnhancedEmailVerificationController();
const openObserveService = new OpenObserveService();

// 安全中间件
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS配置
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
}));

// 请求ID中间件
router.use((req, res, next) => {
  req.requestId = req.get('X-Request-ID') || require('uuid').v4();
  res.set('X-Request-ID', req.requestId);
  next();
});

// 限流配置
const createRateLimiter = (options) => rateLimit({
  windowMs: options.windowMs || 15 * 60 * 1000, // 15分钟
  max: options.max || 100, // 限制请求数
  message: {
    success: false,
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(options.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    const retryAfter = Math.ceil(res.get('Retry-After') || 60);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
      requestId: req.requestId,
    });
  },
});

// 应用不同级别的限流
const strictLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 50 }); // 严格限流
const normalLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }); // 普通限流
const relaxedLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 200 }); // 宽松限流

// 请求日志中间件
router.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // 记录请求日志
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
    
    // 发送到OpenObserve
    openObserveService.recordPerformanceMetrics({
      endpoint: `${req.method} ${req.path}`,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  });
  
  next();
});

// API版本中间件
router.use('/api/v1', (req, res, next) => {
  req.apiVersion = 'v1';
  res.set('API-Version', 'v1');
  next();
});

// API文档路由
router.get('/api/docs', (req, res) => {
  res.json({
    title: 'Email Verification API',
    version: '2.0.0',
    description: 'Enhanced email verification service with AfterShip email-verifier integration',
    baseUrl: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      verification: {
        'POST /api/v1/email/verify': 'Verify a single email address',
        'POST /api/v1/email/verify-batch': 'Verify multiple email addresses',
      },
      monitoring: {
        'GET /api/v1/email/health': 'Get service health status',
        'GET /api/v1/email/metrics': 'Get detailed service metrics',
        'GET /api/v1/email/config': 'Get service configuration',
      },
      cache: {
        'POST /api/v1/email/cache/clear': 'Clear cache',
      },
    },
    examples: {
      singleVerification: {
        method: 'POST',
        url: '/api/v1/email/verify',
        body: {
          email: 'user@example.com',
          options: {
            timeout: 10000,
            skipProxy: false,
          },
        },
      },
      batchVerification: {
        method: 'POST',
        url: '/api/v1/email/verify-batch',
        body: {
          emails: ['user1@example.com', 'user2@example.com'],
          options: {
            batchSize: 10,
            batchDelay: 100,
          },
        },
      },
    },
  });
});

// 验证单个邮箱 - 严格限流
router.post('/api/v1/email/verify', strictLimiter, async (req, res) => {
  try {
    await controller.verifyEmail(req, res);
  } catch (error) {
    console.error('Route error in verifyEmail:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.requestId,
    });
  }
});

// 批量验证邮箱 - 普通限流
router.post('/api/v1/email/verify-batch', normalLimiter, async (req, res) => {
  try {
    await controller.verifyEmailBatch(req, res);
  } catch (error) {
    console.error('Route error in verifyEmailBatch:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.requestId,
    });
  }
});

// 获取服务健康状态 - 宽松限流
router.get('/api/v1/email/health', relaxedLimiter, async (req, res) => {
  try {
    await controller.getHealth(req, res);
  } catch (error) {
    console.error('Route error in getHealth:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR',
      requestId: req.requestId,
    });
  }
});

// 获取详细指标 - 宽松限流
router.get('/api/v1/email/metrics', relaxedLimiter, async (req, res) => {
  try {
    await controller.getMetrics(req, res);
  } catch (error) {
    console.error('Route error in getMetrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      code: 'METRICS_ERROR',
      requestId: req.requestId,
    });
  }
});

// 获取配置 - 宽松限流
router.get('/api/v1/email/config', relaxedLimiter, async (req, res) => {
  try {
    await controller.getConfig(req, res);
  } catch (error) {
    console.error('Route error in getConfig:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration',
      code: 'CONFIG_ERROR',
      requestId: req.requestId,
    });
  }
});

// 清理缓存 - 严格限流
router.post('/api/v1/email/cache/clear', strictLimiter, async (req, res) => {
  try {
    await controller.clearCache(req, res);
  } catch (error) {
    console.error('Route error in clearCache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      code: 'CACHE_CLEAR_ERROR',
      requestId: req.requestId,
    });
  }
});

// 兼容旧版本API (v0)
router.post('/api/email/verify', normalLimiter, async (req, res) => {
  try {
    req.apiVersion = 'v0';
    await controller.verifyEmail(req, res);
  } catch (error) {
    console.error('Route error in verifyEmail (v0):', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

router.post('/api/email/verify-batch', normalLimiter, async (req, res) => {
  try {
    req.apiVersion = 'v0';
    await controller.verifyEmailBatch(req, res);
  } catch (error) {
    console.error('Route error in verifyEmailBatch (v0):', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

router.get('/api/email/health', relaxedLimiter, async (req, res) => {
  try {
    req.apiVersion = 'v0';
    await controller.getHealth(req, res);
  } catch (error) {
    console.error('Route error in getHealth (v0):', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR',
    });
  }
});

router.get('/api/email/config', relaxedLimiter, async (req, res) => {
  try {
    req.apiVersion = 'v0';
    await controller.getConfig(req, res);
  } catch (error) {
    console.error('Route error in getConfig (v0):', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration',
      code: 'CONFIG_ERROR',
    });
  }
});

router.post('/api/email/cache/clear', strictLimiter, async (req, res) => {
  try {
    req.apiVersion = 'v0';
    await controller.clearCache(req, res);
  } catch (error) {
    console.error('Route error in clearCache (v0):', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      code: 'CACHE_CLEAR_ERROR',
    });
  }
});

// OpenObserve状态检查端点
router.get('/api/v1/monitoring/openobserve', relaxedLimiter, async (req, res) => {
  try {
    const status = openObserveService.getStatus();
    res.json({
      success: true,
      data: status,
      requestId: req.requestId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get OpenObserve status',
      code: 'MONITORING_ERROR',
      requestId: req.requestId,
    });
  }
});

// 测试端点（仅开发环境）
if (process.env.NODE_ENV === 'development') {
  router.get('/api/v1/test/email-verifier', async (req, res) => {
    try {
      const testEmail = req.query.email || 'test@example.com';
      const result = await controller.verifierService.verifyEmail(testEmail);
      
      res.json({
        success: true,
        data: {
          testEmail,
          result,
          timestamp: new Date().toISOString(),
        },
        requestId: req.requestId,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'TEST_ERROR',
        requestId: req.requestId,
      });
    }
  });
}

// 根路径重定向到API文档
router.get('/', (req, res) => {
  res.redirect('/api/docs');
});

// 404处理
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    requestId: req.requestId,
  });
});

// 全局错误处理
router.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // 记录错误到OpenObserve
  openObserveService.recordVerificationError(
    req.body?.email || 'unknown',
    error,
    0,
    { endpoint: req.path, method: req.method, ip: req.ip }
  );
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId: req.requestId,
  });
});

// 优雅关闭处理
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  try {
    await controller.shutdown();
    await openObserveService.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  try {
    await controller.shutdown();
    await openObserveService.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

module.exports = {
  router,
  controller,
  openObserveService,
};