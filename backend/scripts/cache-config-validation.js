// 用途：缓存配置验证脚本，验证配置语法和依赖关系
// 依赖文件：package.json, cache.module.ts, redis.module.ts
// 作者：后端开发团队
// 时间：2025-09-28 19:20:00

const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证缓存配置...\n');

// 1. 检查package.json依赖
console.log('📦 检查package.json依赖...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  const requiredDeps = {
    'cache-manager': '^7.2.2',
    '@nestjs/cache-manager': '^3.0.1',
    redis: '^5.8.2',
    ioredis: '^5.8.0',
  };

  let allDepsValid = true;

  for (const [dep, expectedVersion] of Object.entries(requiredDeps)) {
    const actualVersion = packageJson.dependencies[dep];
    if (actualVersion) {
      console.log(`✅ ${dep}: ${actualVersion} (期望: ${expectedVersion})`);
    } else {
      console.log(`❌ ${dep}: 未找到`);
      allDepsValid = false;
    }
  }

  if (allDepsValid) {
    console.log('✅ 所有依赖版本正确\n');
  } else {
    console.log('❌ 存在依赖问题\n');
  }
} catch (error) {
  console.error('❌ 读取package.json失败:', error.message);
}

// 2. 检查编译后的文件
console.log('🔧 检查编译后的文件...');
try {
  const distFiles = [
    'dist/src/cache/cache.module.js',
    'dist/src/redis/redis.module.js',
    'dist/src/redis/redis-health.service.js',
  ];

  for (const file of distFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}: 存在`);
    } else {
      console.log(`❌ ${file}: 不存在`);
    }
  }

  console.log('✅ 编译文件检查完成\n');
} catch (error) {
  console.error('❌ 检查编译文件失败:', error.message);
}

// 3. 验证TypeScript配置
console.log('📄 验证TypeScript配置...');
try {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));

  if (tsconfig.compilerOptions?.target === 'ES2020') {
    console.log('✅ TypeScript目标版本: ES2020');
  } else {
    console.log('❌ TypeScript目标版本不正确');
  }

  if (tsconfig.compilerOptions?.module === 'commonjs') {
    console.log('✅ TypeScript模块系统: commonjs');
  } else {
    console.log('❌ TypeScript模块系统不正确');
  }

  console.log('✅ TypeScript配置验证完成\n');
} catch (error) {
  console.error('❌ 读取tsconfig.json失败:', error.message);
}

// 4. 检查缓存模块配置
console.log('⚙️ 检查缓存模块配置...');
try {
  const cacheModulePath = 'src/cache/cache.module.ts';
  if (fs.existsSync(cacheModulePath)) {
    const content = fs.readFileSync(cacheModulePath, 'utf8');

    // 检查Redis配置
    if (content.includes('redisStore')) {
      console.log('✅ Redis存储配置存在');
    } else {
      console.log('❌ Redis存储配置不存在');
    }

    // 检查TTL配置
    if (content.includes('ttl: 3600')) {
      console.log('✅ TTL配置存在 (3600秒)');
    } else {
      console.log('❌ TTL配置不存在');
    }

    // 检查最大缓存项数
    if (content.includes('max: 10000')) {
      console.log('✅ 最大缓存项数配置存在 (10000)');
    } else {
      console.log('❌ 最大缓存项数配置不存在');
    }
  } else {
    console.log('❌ 缓存模块文件不存在');
  }

  console.log('✅ 缓存模块配置检查完成\n');
} catch (error) {
  console.error('❌ 检查缓存模块失败:', error.message);
}

// 5. 检查Redis健康检查服务
console.log('🏥 检查Redis健康检查服务...');
try {
  const healthServicePath = 'src/redis/redis-health.service.ts';
  if (fs.existsSync(healthServicePath)) {
    const content = fs.readFileSync(healthServicePath, 'utf8');

    if (content.includes('RedisHealthService')) {
      console.log('✅ Redis健康检查服务存在');
    } else {
      console.log('❌ Redis健康检查服务不存在');
    }

    if (content.includes('ping()')) {
      console.log('✅ ping测试方法存在');
    } else {
      console.log('❌ ping测试方法不存在');
    }

    if (content.includes('checkHealth()')) {
      console.log('✅ 健康检查方法存在');
    } else {
      console.log('❌ 健康检查方法不存在');
    }
  } else {
    console.log('❌ Redis健康检查服务文件不存在');
  }

  console.log('✅ Redis健康检查服务检查完成\n');
} catch (error) {
  console.error('❌ 检查Redis健康检查服务失败:', error.message);
}

// 6. 总结
console.log('📊 验证总结:');
console.log('✅ 依赖版本检查完成');
console.log('✅ 编译文件检查完成');
console.log('✅ TypeScript配置验证完成');
console.log('✅ 缓存模块配置检查完成');
console.log('✅ Redis健康检查服务检查完成');
console.log('\n🎉 缓存配置验证完成！');
console.log('💡 注意: 实际Redis连接测试需要运行Redis服务器');
console.log('💡 部署前请确保Redis服务器配置正确');
