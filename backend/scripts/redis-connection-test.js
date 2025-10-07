// 用途：Redis连接测试脚本，验证Redis配置是否正确
// 依赖文件：unified-master.config.ts (通过环境变量使用)
// 作者：后端开发团队
// 时间：2025-06-17 12:05:00

const Redis = require('ioredis');

// 从环境变量获取Redis配置
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0,
    connectTimeout: 5000,
    commandTimeout: 3000
};

async function testRedisConnection() {
    console.log('🔍 开始测试Redis连接...');
    console.log('📊 配置信息:', JSON.stringify(redisConfig, null, 2));
    
    try {
        // 创建Redis客户端
        const redis = new Redis(redisConfig);
        
        console.log('🔄 正在连接Redis服务器...');
        
        // 测试连接
        await redis.ping();
        console.log('✅ Redis连接成功！');
        
        // 测试基本操作
        console.log('🧪 测试缓存操作...');
        
        // 设置测试数据
        await redis.set('test_key', 'Hello Redis!', 'EX', 60);
        console.log('✅ 设置缓存成功');
        
        // 获取测试数据
        const value = await redis.get('test_key');
        console.log('✅ 获取缓存成功:', value);
        
        // 删除测试数据
        await redis.del('test_key');
        console.log('✅ 删除缓存成功');
        
        // 获取Redis服务器信息
        const info = await redis.info('server');
        console.log('📊 Redis服务器信息:');
        console.log(info.split('\n').filter(line => line.includes('redis_version') || line.includes('uptime_in_seconds')));
        
        // 关闭连接
        await redis.quit();
        console.log('🔌 Redis连接已关闭');
        
        console.log('🎉 所有测试通过！Redis配置正确。');
        
    } catch (error) {
        console.error('❌ Redis连接测试失败:', error.message);
        console.error('💡 请检查以下配置:');
        console.error('   - Redis服务器是否运行');
        console.error('   - 主机地址是否正确');
        console.error('   - 端口是否开放');
        console.error('   - 密码是否正确');
        process.exit(1);
    }
}

// 运行测试
testRedisConnection().catch(console.error);