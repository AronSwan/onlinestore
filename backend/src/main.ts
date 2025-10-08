import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { ConfigurationValidator } from './config/configuration.validator';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { FileUploadInterceptor } from './common/interceptors/file-upload.interceptor';
import { MetricsInterceptor } from './monitoring/metrics.interceptor';
import { MonitoringService } from './monitoring/monitoring.service';

export async function bootstrap() {
  // 配置验证（可通过环境变量跳过）
  const skipValidation = process.env.SKIP_CONFIG_VALIDATION === 'true';
  if (!skipValidation) {
    const configValidation = ConfigurationValidator.validateAll();
    if (!configValidation.isValid) {
      console.error('❌ 配置验证失败:');
      configValidation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    if (configValidation.warnings.length > 0) {
      console.warn('⚠️  配置警告:');
      configValidation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
  } else {
    console.warn('⚠️ 本地开发跳过配置验证（SKIP_CONFIG_VALIDATION=true）');
  }

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // 使用NestJS内置日志
  const logger = new Logger('Bootstrap');
  app.useLogger(logger);

  // 获取MonitoringService实例
  const monitoringService = app.get(MonitoringService);

  // 全局异常过滤器
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 全局日志拦截器
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 监控指标拦截器
  app.useGlobalInterceptors(new MetricsInterceptor(monitoringService));

  // 文件上传安全拦截器
  app.useGlobalInterceptors(new FileUploadInterceptor());

  // 安全中间件 - 生产环境配置
  const isProduction = process.env.NODE_ENV === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      hidePoweredBy: true,
      // 文件上传安全头
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(compression());

  // CORS 配置 - 根据环境调整
  const corsOrigins = isProduction
    ? (process.env.CORS_ORIGINS || '').split(',').filter(Boolean)
    : true;

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // 限制文件上传大小
    maxAge: 86400,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // 文件上传验证
      // validateCustomDecorators: true,
    }),
  );

  // API 前缀
  app.setGlobalPrefix('api');

  // Swagger 文档配置
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Caddy Style Shopping API')
      .setDescription(
        `
        ## 电商系统 API 文档
        
        ### 功能模块
        - **认证管理**: 用户注册、登录、JWT令牌管理
        - **用户管理**: 用户信息、权限管理、地址管理
        - **商品管理**: 商品CRUD、分类、库存管理
        - **购物车管理**: 购物车操作、商品选择、批量操作
        - **订单管理**: 订单创建、支付、状态跟踪
        - **支付管理**: 多种支付方式、支付回调处理
        - **系统管理**: 缓存管理、性能监控、健康检查
        
        ### 认证方式
        使用 JWT Bearer Token 进行认证，请在请求头中添加：
        \`Authorization: Bearer <your-token>\`
        
        ### 响应格式
        所有API响应都遵循统一格式：
        \`\`\`json
        {
          "code": 200,
          "message": "操作成功",
          "data": {},
          "timestamp": "2025-01-26T10:30:00Z",
          "requestId": "req_123456789"
        }
        \`\`\`
        
        ### 错误码说明
        - **1xxx**: 通用错误（参数错误、资源不存在等）
        - **2xxx**: 认证错误（未授权、令牌过期等）
        - **3xxx**: 业务错误（库存不足、订单状态错误等）
        - **5xxx**: 系统错误（服务器错误、数据库错误等）
      `,
      )
      .setVersion('1.0.0')
      .setContact('开发团队', 'https://github.com/your-org/caddy-style-shopping', 'dev@example.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:3000', '开发环境')
      .addServer('https://api-staging.example.com', '测试环境')
      .addServer('https://api.example.com', '生产环境')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', '🔐 认证管理')
      .addTag('users', '👤 用户管理')
      .addTag('products', '📦 商品管理')
      .addTag('cart', '🛒 购物车管理')
      .addTag('orders', '📋 订单管理')
      .addTag('payments', '💳 支付管理')
      .addTag('admin', '⚙️ 系统管理')
      .addTag('monitoring', '📊 监控管理')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      extraModels: [
        // 导入通用响应模型
        require('./common/dto/api-response.dto').ApiResponseDto,
        require('./common/dto/api-response.dto').ErrorResponseDto,
        require('./common/dto/api-response.dto').PaginatedResponseDto,
      ],
    });

    // 自定义Swagger UI配置
    const swaggerOptions = {
      swaggerOptions: {
        persistAuthorization: true, // 保持认证状态
        displayRequestDuration: true, // 显示请求耗时
        filter: true, // 启用搜索过滤
        showExtensions: true, // 显示扩展信息
        showCommonExtensions: true, // 显示通用扩展
        tryItOutEnabled: true, // 启用试用功能
        requestInterceptor: (req: any) => {
          // 请求拦截器，可以添加全局请求头
          req.headers['X-API-Version'] = '1.0';
          return req;
        },
      },
      customSiteTitle: 'Caddy Style Shopping API 文档',
      customfavIcon: '/favicon.ico',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #3b82f6 }
        .swagger-ui .scheme-container { background: #f8fafc; padding: 10px; border-radius: 4px; }
      `,
    };

    SwaggerModule.setup('api/docs', app, document, swaggerOptions);

    // 导出OpenAPI JSON
    const fs = require('fs');
    const path = require('path');
    const docsDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(docsDir, 'openapi.json'), JSON.stringify(document, null, 2));

    const port = process.env.PORT || 3000;
    logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
    logger.log(`📄 OpenAPI JSON exported to: docs/openapi.json`);
  } else {
    logger.log('Swagger documentation is disabled in production');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 应用启动成功！端口: ${port}`);
  logger.log(`🔗 健康检查: http://localhost:${port}/api/health`);
  logger.log(`🛒 购物车 API: http://localhost:${port}/api/cart`);
  logger.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
}

// 如果直接运行此文件，则启动应用
if (require.main === module) {
  bootstrap().catch(err => {
    console.error('应用启动失败:', err);
    process.exit(1);
  });
}
