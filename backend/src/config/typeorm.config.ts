import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// 加载环境变量
config();

const dbType = (process.env.DB_TYPE || 'sqlite') as 'mysql' | 'postgres' | 'sqlite';

// 基础配置
const baseConfig: any = {
  type: dbType,
  database: process.env.DB_DATABASE || process.env.DATABASE_NAME || './data/caddy_shopping.db',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: [
    process.env.NODE_ENV === 'development'
      ? 'src/database/migrations/*.ts'
      : 'dist/src/database/migrations/*.js',
  ],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

// 根据数据库类型添加特定配置
if (dbType !== 'sqlite') {
  baseConfig.host = process.env.DB_HOST || process.env.DATABASE_HOST || '127.0.0.1';
  baseConfig.port = parseInt(process.env.DB_PORT || process.env.DATABASE_PORT || '4000', 10);
  baseConfig.username = process.env.DB_USERNAME || process.env.DATABASE_USERNAME || 'caddy_app';
  baseConfig.password =
    process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || 'your_secure_password_here';
  baseConfig.charset = process.env.DB_CHARSET || 'utf8mb4';
  baseConfig.timezone = process.env.DB_TIMEZONE || process.env.DEFAULT_TIMEZONE || '+08:00';
  baseConfig.ssl = false;
  baseConfig.extra = {
    connectionLimit: parseInt(
      process.env.DB_POOL_SIZE ||
        process.env.DB_MAX_CONNECTIONS ||
        process.env.DATABASE_CONNECTION_LIMIT ||
        '20',
      10,
    ),
    connectTimeout: parseInt(
      process.env.DB_CONNECTION_TIMEOUT || process.env.DATABASE_TIMEOUT || '30000',
      10,
    ),
    waitForConnections: true,
    idleTimeout: parseInt(
      process.env.DB_IDLE_TIMEOUT ||
        process.env.DB_IDLE_TIMEOUT_MILLIS ||
        process.env.DATABASE_IDLE_TIMEOUT ||
        '300000',
      10,
    ),
  };
} else {
  // SQLite特定配置
  baseConfig.extra = {
    busyTimeout: 30000,
  };
}

export default new DataSource(baseConfig);
