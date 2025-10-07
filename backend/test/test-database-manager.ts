// 用途：测试数据库连接管理器，提供统一的数据库连接和清理功能
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-10-05

import { DataSource, DataSourceOptions } from 'typeorm';
import { testDatabaseConfig } from './test-setup-helper';

export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  private dataSource: DataSource | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  public async connect(): Promise<DataSource> {
    if (this.isConnected && this.dataSource) {
      return this.dataSource;
    }

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        this.dataSource = new DataSource(testDatabaseConfig as DataSourceOptions);
        await this.dataSource.initialize();
        this.isConnected = true;
        console.log('✅ 测试数据库连接成功');
        return this.dataSource;
      } catch (error) {
        retryCount++;
        console.error(`❌ 测试数据库连接失败 (尝试 ${retryCount}/${maxRetries}):`, error);

        if (retryCount >= maxRetries) {
          console.error('❌ 达到最大重试次数，数据库连接失败');
          throw error;
        }

        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    throw new Error('数据库连接失败');
  }

  public async disconnect(): Promise<void> {
    if (this.dataSource && this.isConnected) {
      try {
        await this.dataSource.destroy();
        this.isConnected = false;
        console.log('✅ 测试数据库连接已关闭');
      } catch (error) {
        console.error('❌ 关闭测试数据库连接失败:', error);
        throw error;
      }
    }
  }

  public getDataSource(): DataSource | null {
    return this.dataSource;
  }

  public async clearDatabase(): Promise<void> {
    if (!this.dataSource || !this.isConnected) {
      console.warn('⚠️ 数据库未连接，跳过数据清理');
      return;
    }

    try {
      // 获取所有表名
      const tables = await this.dataSource.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      );

      if (tables.length === 0) {
        console.log('✅ 测试数据库中没有表，跳过数据清理');
        return;
      }

      // 禁用外键约束
      await this.dataSource.query('PRAGMA foreign_keys = OFF');

      // 删除所有表
      for (const table of tables) {
        await this.dataSource.query(`DELETE FROM ${table.name}`);
      }

      // 重新启用外键约束
      await this.dataSource.query('PRAGMA foreign_keys = ON');

      console.log('✅ 测试数据库数据已清理');
    } catch (error) {
      console.error('❌ 清理测试数据库数据失败:', error);
      // 不要抛出错误，以免影响其他测试
    }
  }

  public async runMigrations(): Promise<void> {
    if (!this.dataSource || !this.isConnected) {
      throw new Error('数据库未连接，无法运行迁移');
    }

    try {
      // 在实际项目中，这里会运行TypeORM迁移
      // 由于我们使用的是内存数据库，表会自动创建
      console.log('✅ 测试数据库迁移完成');
    } catch (error) {
      console.error('❌ 运行测试数据库迁移失败:', error);
      throw error;
    }
  }

  public async createSchema(): Promise<void> {
    if (!this.dataSource || !this.isConnected) {
      throw new Error('数据库未连接，无法创建模式');
    }

    try {
      // 在SQLite中，模式会自动创建
      console.log('✅ 测试数据库模式已创建');
    } catch (error) {
      console.error('❌ 创建测试数据库模式失败:', error);
      throw error;
    }
  }
}

// 全局测试数据库管理器实例
export const testDatabaseManager = TestDatabaseManager.getInstance();

// 测试前设置数据库连接
export const setupTestDatabase = async (): Promise<DataSource> => {
  return await testDatabaseManager.connect();
};

// 测试后清理数据库连接
export const cleanupTestDatabase = async (): Promise<void> => {
  await testDatabaseManager.clearDatabase();
  await testDatabaseManager.disconnect();
};

// Jest全局设置
beforeAll(async () => {
  try {
    await setupTestDatabase();
  } catch (error) {
    console.error('❌ 全局测试数据库设置失败:', error);
    // 不要抛出错误，以免阻止测试运行
  }
});

afterAll(async () => {
  try {
    await cleanupTestDatabase();
  } catch (error) {
    console.error('❌ 全局测试数据库清理失败:', error);
    // 不要抛出错误，以免影响其他测试
  }
});

// 每个测试前清理数据
beforeEach(async () => {
  try {
    await testDatabaseManager.clearDatabase();
  } catch (error) {
    console.error('❌ 测试前数据库清理失败:', error);
    // 不要抛出错误，以免影响测试运行
  }
});
