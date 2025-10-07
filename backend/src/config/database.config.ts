import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CartItemEntity } from '../cart/infrastructure/entities/cart-item.entity';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const dbType = (process.env.DB_TYPE || 'sqlite') as 'mysql' | 'postgres' | 'sqlite' | 'tidb';
  const baseConfig: any = {
    type: dbType === 'tidb' ? 'mysql' : dbType,
    database: process.env.DB_DATABASE || './data/caddy_shopping.db',
  };

  // 只有非SQLite数据库才需要连接参数
  if (dbType !== 'sqlite') {
    baseConfig.host = process.env.DB_HOST || 'localhost';
    baseConfig.port = parseInt(
      process.env.DB_PORT || (dbType === 'postgres' ? '5432' : '3306'),
      10,
    );
    baseConfig.username = process.env.DB_USERNAME || 'root';
    baseConfig.password = process.env.DB_PASSWORD || 'password';
  }

  return {
    ...baseConfig,
    entities: [
      CartItemEntity,
      // 其他实体...
    ],
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
    timezone: '+08:00',
    charset: 'utf8mb4',
    extra: {
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
    },
  };
});
