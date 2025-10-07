import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppMinimalModule } from './app-minimal.module';
import helmet from 'helmet';
import compression from 'compression';
import { ConfigurationValidator } from './config/configuration.validator';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

export async function bootstrap() {
  // 配置验证
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

  const app = await NestFactory.create(AppMinimalModule, {
    bufferLogs: true,
  });

  // 使用Winston日志
  try {
    const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
    app.useLogger(logger);
  } catch (error) {
    console.warn('Winston logger not available, using default logger');
  }

  // 全局异常过滤器
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 全局日志拦截器
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 安全中间件
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
    }),
  );
  app.use(compression());

  // CORS配置
  const corsOrigins = isProduction
    ? (process.env.CORS_ORIGINS || '').split(',').filter(Boolean)
    : true;

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API 前缀
  app.setGlobalPrefix('api');

  // Swagger 文档 - 生产环境保护
  if (!isProduction || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Caddy Style Shopping API (优化版)')
      .setDescription('展示安全加固、健康检查、日志结构化、RBAC权限等优化功能')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('health', '健康检查相关接口')
      .addTag('cart', '购物车相关接口')
      .addTag('auth', '认证和权限相关接口')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`📖 API 文档已启用: http://localhost:${process.env.PORT || 3000}/api/docs`);
  } else {
    console.log('📖 API 文档已在生产环境中禁用');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 优化版应用启动成功！端口: ${port}`);
  console.log(`🔗 健康检查: http://localhost:${port}/api/health`);
  console.log(`🛒 购物车 API: http://localhost:${port}/api/cart`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️  安全功能: 限流保护、安全头、CORS配置`);
  console.log(`📊 监控功能: 结构化日志、请求追踪、健康检查`);
}

// 如果直接运行此文件，则启动应用
if (require.main === module) {
  bootstrap().catch(err => {
    console.error('应用启动失败:', err);
    process.exit(1);
  });
}
