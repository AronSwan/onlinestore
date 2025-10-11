// 用途：Redis缓存配置测试脚本
// 依赖文件：../dist/app.module.js, ../dist/cache/cache.module.js, ../dist/redis/redis.module.js
// 作者：后端开发团队
// 时间：2025-09-28 19:10:00

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');

async function testCacheConfiguration() {
  console.log('🚀 开始测试Redis缓存配置...');

  try {
    // 创建应用实例
    const app = await NestFactory.createApplicationContext(AppModule);

    // 获取Redis健康检查服务
    const redisHealthService = app.get('RedisHealthService');

    console.log('📊 检查Redis连接健康状态...');
    const healthResult = await redisHealthService.checkHealth();
    console.log('✅ Redis健康状态:', healthResult);

    if (healthResult.status === 'healthy') {
      console.log('🎯 Redis连接正常，延迟:', healthResult.latency + 'ms');

      // 测试缓存操作
      console.log('🧪 测试缓存操作...');
      const cacheTestResult = await redisHealthService.testCacheOperation();

      if (cacheTestResult) {
        console.log('✅ 缓存操作测试通过');
      } else {
        console.log('❌ 缓存操作测试失败');
      }

      // 获取Redis信息
      console.log('📈 获取Redis服务器信息...');
      const redisInfo = await redisHealthService.getRedisInfo();

      if (redisInfo) {
        console.log('📋 Redis服务器信息:');
        console.log('  版本:', redisInfo.version || '未知');
        console.log('  连接客户端数:', redisInfo.connected_clients || '未知');
        console.log('  内存使用:', redisInfo.used_memory || '未知');
        console.log('  运行时间:', redisInfo.uptime || '未知', '秒');
      } else {
        console.log('❌ 无法获取Redis服务器信息');
      }
    } else {
      console.log('❌ Redis连接异常:', healthResult.error);
    }

    // 关闭应用
    await app.close();
    console.log('🏁 测试完成');
  } catch (error) {
    console.error('💥 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testCacheConfiguration();
}

module.exports = { testCacheConfiguration };
