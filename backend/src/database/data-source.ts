// 用途：TypeORM数据源配置，用于迁移和CLI操作
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 10:45:00

import { DataSource } from 'typeorm';
import { createMasterConfiguration } from '../config/unified-master.config';
import { UserEntity } from '../users/infrastructure/persistence/typeorm/user.entity';
import { Product } from '../products/entities/product.entity';
import { ProductImage } from '../products/entities/product-image.entity';
import { Category } from '../products/entities/category.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { AddressEntity } from '../users/infrastructure/persistence/typeorm/address.entity';
import { CustomerProfileEntity } from '../users/infrastructure/persistence/typeorm/customer-profile.entity';

// Create configuration instance
const masterConfig = createMasterConfiguration();

const isDev = masterConfig.app.env === 'development';

const dbType = masterConfig.database.type as 'mysql' | 'postgres' | 'sqlite' | 'tidb';

export const AppDataSource = new DataSource({
  type: dbType === 'tidb' ? 'mysql' : dbType,
  ...(dbType !== 'sqlite' && {
    host: masterConfig.database.host,
    port: masterConfig.database.port || (dbType === 'postgres' ? 5432 : 3306),
    username: masterConfig.database.username,
    password: masterConfig.database.password,
  }),
  database: masterConfig.database.database,
  entities: [
    UserEntity,
    Product,
    ProductImage,
    Category,
    Order,
    OrderItem,
    AddressEntity,
    CustomerProfileEntity,
  ],
  migrations: [
    process.env.MIGRATION_SCOPE === 'schema'
      ? isDev
        ? 'src/database/migrations/2025100100000*.ts'
        : 'dist/src/database/migrations/2025100100000*.js'
      : isDev
        ? 'src/database/migrations/*.ts'
        : 'dist/src/database/migrations/*.js',
  ],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false, // 迁移模式下禁用自动同步
  logging: isDev,
  // SQL注入防护配置
  extra: {
    connectionLimit: masterConfig.database.poolSize,
    connectTimeout: masterConfig.database.connectionTimeout,
    waitForConnections: true,
    ssl: process.env.DB_SSL === 'true',
    supportBigNumbers: true,
    bigNumberStrings: false,
  },
});

export default AppDataSource;
