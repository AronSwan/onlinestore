/**
 * ⚠️ LEGACY 备用入口（不参与生产部署）。
 * 生产入口是 src/main.ts（package.json start:prod → dist/src/main.js），见 README。
 * 本文件仅用于购物车服务单独启动/联调，路由与主入口不一致，勿在此新增功能。
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CartModule } from './cart/cart.module';
import { CartItemEntity } from './cart/infrastructure/entities/cart-item.entity';

/**
 * 独立购物车应用模块 - 完全独立，无外部依赖
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get('DB_TYPE', 'sqlite') as
          | 'mysql'
          | 'postgres'
          | 'sqlite'
          | 'tidb';
        const baseConfig: any = {
          type: dbType === 'tidb' ? 'mysql' : dbType,
          database: configService.get('DB_DATABASE', './data/caddy_shopping.db'),
        };

        // 只有非SQLite数据库才需要连接参数
        if (dbType !== 'sqlite') {
          baseConfig.host = configService.get('DB_HOST', 'localhost');
          baseConfig.port = configService.get('DB_PORT', dbType === 'postgres' ? 5432 : 3306);
          baseConfig.username = configService.get('DB_USERNAME', 'root');
          baseConfig.password = configService.get('DB_PASSWORD', '123456');
        }

        return {
          ...baseConfig,
          entities: [CartItemEntity],
          synchronize: true,
          logging: false,
          charset: 'utf8mb4',
          timezone: '+08:00',
        };
      },
    }),
    CartModule,
  ],
})
class StandaloneCartApp {}

async function bootstrap() {
  console.log('🛒 启动独立购物车服务...');

  const app = await NestFactory.create(StandaloneCartApp);

  // 启用 CORS
  app.enableCors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

  // Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('购物车 API')
    .setDescription('基于 CongoMall 设计的购物车服务')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('购物车', '购物车管理接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`✅ 购物车服务启动成功！`);
  console.log(`📖 API 文档: http://localhost:${port}/api/docs`);
  console.log(`🛒 购物车 API: http://localhost:${port}/api/cart`);
  console.log(`🌐 前端地址: http://localhost:8080`);
}

bootstrap().catch(err => {
  console.error('❌ 服务启动失败:', err);
  process.exit(1);
});
