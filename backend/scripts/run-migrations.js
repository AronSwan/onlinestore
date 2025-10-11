// 简单的迁移执行脚本：使用已编译的数据源运行TypeORM迁移
// 运行方式：node scripts/run-migrations.js

const path = require('path');

async function run() {
  try {
    const dsPath = path.resolve(__dirname, '../dist/src/database/data-source.js');
    const appDataSource = require(dsPath).default || require(dsPath).AppDataSource;

    if (!appDataSource) {
      throw new Error('无法加载数据源：未找到导出的 AppDataSource');
    }

    console.log('🔌 初始化数据库连接...');
    await appDataSource.initialize();
    console.log('✅ 数据库连接成功，开始运行迁移...');
    const results = await appDataSource.runMigrations();
    console.log(
      '✅ 迁移完成：',
      results.map(r => r.name),
    );
    await appDataSource.destroy();
    console.log('🔚 已关闭数据库连接');
  } catch (err) {
    console.error('❌ 迁移执行失败：', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
