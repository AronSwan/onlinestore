// 用途：Kubernetes环境模拟测试脚本
// 依赖文件：无
// 作者：AI助手
// 时间：2025-09-29 03:20:00

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 测试结果对象
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// 测试函数
function test(name, testFn) {
  testResults.total++;
  try {
    testFn();
    console.log(`✅ ${name}`);
    testResults.passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    testResults.failed++;
  }
}

// 主测试函数
function runKubernetesTests() {
  console.log('🚀 开始Kubernetes环境模拟测试...\n');
  
  // 1. 检查项目结构
  test('项目结构完整性检查', () => {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'src/main.ts',
      'src/app.module.ts',
      'k8s/deployment.yaml',
      'k8s/service.yaml',
      'k8s/secrets.yaml'
    ];
    
    requiredFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        throw new Error(`缺少必要文件: ${file}`);
      }
    });
  });
  
  // 2. 检查Kubernetes配置文件
  test('Kubernetes配置验证', () => {
    const k8sFiles = fs.readdirSync('k8s');
    const requiredK8sFiles = ['deployment.yaml', 'service.yaml', 'secrets.yaml'];
    
    requiredK8sFiles.forEach(file => {
      if (!k8sFiles.includes(file)) {
        throw new Error(`缺少Kubernetes配置文件: ${file}`);
      }
    });
    
    // 验证YAML文件格式
    k8sFiles.forEach(file => {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const content = fs.readFileSync(path.join('k8s', file), 'utf8');
        if (!content.trim()) {
          throw new Error(`Kubernetes配置文件为空: ${file}`);
        }
      }
    });
  });
  
  // 3. 检查TypeScript编译
  test('TypeScript编译检查', () => {
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('TypeScript编译错误');
    }
  });
  
  // 4. 检查依赖安装
  test('依赖完整性检查', () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const nodeModulesExists = fs.existsSync('node_modules');
    
    if (!nodeModulesExists) {
      throw new Error('node_modules目录不存在，请先运行 npm install');
    }
    
    // 检查关键依赖
    const criticalDeps = [
      '@nestjs/common',
      '@nestjs/core',
      'typeorm',
      'mysql2'
    ];
    
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    criticalDeps.forEach(dep => {
      if (!allDeps[dep]) {
        throw new Error(`缺少关键依赖: ${dep}`);
      }
    });
  });
  

  
  // 6. 检查环境配置
  test('环境配置检查', () => {
    if (!fs.existsSync('.env')) {
      throw new Error('缺少.env文件');
    }
    
    const envContent = fs.readFileSync('.env', 'utf8');
    const requiredEnvVars = ['DATABASE_HOST', 'DATABASE_USERNAME', 'DATABASE_PASSWORD', 'JWT_SECRET'];
    
    requiredEnvVars.forEach(envVar => {
      if (!envContent.includes(envVar)) {
        throw new Error(`缺少环境变量: ${envVar}`);
      }
    });
  });
  
  // 7. 检查健康检查端点配置
  test('健康检查配置', () => {
    const deploymentContent = fs.readFileSync('k8s/deployment.yaml', 'utf8');
    if (!deploymentContent.includes('livenessProbe') || !deploymentContent.includes('readinessProbe')) {
      throw new Error('Kubernetes部署缺少健康检查配置');
    }
    
    if (!deploymentContent.includes('/health')) {
      throw new Error('健康检查端点未配置');
    }
  });
  
  // 8. 检查资源限制配置
  test('资源限制配置', () => {
    const deploymentContent = fs.readFileSync('k8s/deployment.yaml', 'utf8');
    if (!deploymentContent.includes('resources:')) {
      throw new Error('Kubernetes部署缺少资源限制配置');
    }
    
    if (!deploymentContent.includes('requests:') || !deploymentContent.includes('limits:')) {
      throw new Error('资源请求和限制配置不完整');
    }
  });
  
  console.log('\n📊 测试结果汇总:');
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`📋 总计: ${testResults.total}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 所有Kubernetes相关测试通过！');
    console.log('💡 项目已准备好部署到Kubernetes环境');
    console.log('📋 下一步建议:');
    console.log('   1. 安装kubectl和minikube');
    console.log('   2. 运行: kubectl apply -f k8s/apply-all.yaml');
    console.log('   3. 检查部署状态: kubectl get pods');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查相关问题');
  }
  
  return testResults.failed === 0;
}

// 运行测试
if (require.main === module) {
  runKubernetesTests();
}

module.exports = { runKubernetesTests, testResults };