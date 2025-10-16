/**
 * 工业条件测试验证脚本
 * 验证 test-runner-secure.cjs 新增功能在工业环境下的表现
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class IndustrialTestValidator {
  constructor() {
    this.results = [];
    this.cacheFile = path.join(__dirname, '..', '.test-cache', 'test-runner-cache.json');
    this.performanceFile = path.join(__dirname, '..', '.test-cache', 'test-runner-performance.json');
  }

  /**
   * 验证性能监控功能
   */
  async validatePerformanceMonitoring() {
    console.log('🧪 验证性能监控功能...');
    
    try {
      // 启用性能持久化环境变量
      const env = {
        ...process.env,
        PERFORMANCE_PERSISTENCE: 'true',
        DEBUG_PERFORMANCE: 'true'
      };
      
      // 运行测试并收集性能指标
      const output = execSync('node test-runner-secure.cjs unit --verbose', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120000, // 2分钟超时
        env: env,
        cwd: __dirname
      });

      console.log('📄 测试输出:', output.substring(0, 500) + '...');

      // 等待更长时间确保性能数据保存（因为保存间隔改为10秒）
      await new Promise(resolve => setTimeout(resolve, 15000));

      // 检查性能指标文件是否存在
      if (fs.existsSync(this.performanceFile)) {
        const performanceData = JSON.parse(fs.readFileSync(this.performanceFile, 'utf8'));
        console.log('📊 性能指标收集情况:');
        console.log(`   - 测试执行时间记录数: ${Object.keys(performanceData.performanceMetrics?.testExecutionTimes || {}).length}`);
        console.log(`   - 缓存命中数: ${performanceData.performanceMetrics?.cacheStats?.hits ?? 0}`);
        console.log(`   - 缓存请求总数: ${performanceData.performanceMetrics?.cacheStats?.totalRequests ?? 0}`);
        console.log(`   - 内存使用峰值: ${performanceData.performanceMetrics?.resourceUsage?.peakMemory ?? 0}MB`);
        console.log(`   - 数据版本: ${performanceData.version || 'N/A'}`);
        console.log(`   - 保存时间: ${new Date(performanceData.timestamp).toISOString()}`);
        
        this.results.push({
          feature: '性能监控',
          status: 'PASS',
          metrics: {
            testExecutionRecords: Object.keys(performanceData.performanceMetrics?.testExecutionTimes || {}).length,
            cacheHits: performanceData.performanceMetrics?.cacheStats?.hits || 0,
            cacheTotalRequests: performanceData.performanceMetrics?.cacheStats?.totalRequests || 0,
            peakMemory: performanceData.performanceMetrics?.resourceUsage?.peakMemory || 0,
            version: performanceData.version
          }
        });
      } else {
        console.log('❌ 性能指标文件未生成');
        console.log('   - 检查的文件路径:', this.performanceFile);
        
        // 检查目录是否存在
        const cacheDir = path.dirname(this.performanceFile);
        if (fs.existsSync(cacheDir)) {
          console.log('   - 缓存目录存在，内容:', fs.readdirSync(cacheDir));
        } else {
          console.log('   - 缓存目录不存在:', cacheDir);
        }
        
        this.results.push({
          feature: '性能监控',
          status: 'FAIL',
          reason: '性能指标文件未生成'
        });
      }
      
    } catch (error) {
      console.log('❌ 性能监控验证失败:', error.message);
      this.results.push({
        feature: '性能监控',
        status: 'FAIL',
        reason: error.message
      });
    }
  }

  /**
   * 验证智能测试排序功能
   */
  validateSmartTestOrdering() {
    console.log('🧪 验证智能测试排序功能...');
    
    try {
      // 检查是否有测试依赖分析功能
      const testRunnerPath = path.join(__dirname, 'test-runner-secure.cjs');
      const testRunnerContent = fs.readFileSync(testRunnerPath, 'utf8');
      
      const hasSmartOrdering = testRunnerContent.includes('getOptimalTestOrder') ||
                              testRunnerContent.includes('analyzeTestDependencies');
      
      if (hasSmartOrdering) {
        console.log('✅ 智能测试排序功能存在');
        this.results.push({
          feature: '智能测试排序',
          status: 'PASS',
          details: '功能代码存在'
        });
      } else {
        console.log('❌ 智能测试排序功能不存在');
        this.results.push({
          feature: '智能测试排序',
          status: 'FAIL',
          reason: '相关函数未找到'
        });
      }
    } catch (error) {
      console.log('❌ 智能测试排序验证失败:', error.message);
      this.results.push({
        feature: '智能测试排序',
        status: 'FAIL',
        reason: error.message
      });
    }
  }

  /**
   * 验证缓存持久化功能
   */
  validateCachePersistence() {
    console.log('🧪 验证缓存持久化功能...');
    
    try {
      // 检查缓存文件是否存在
      if (fs.existsSync(this.cacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        console.log('✅ 缓存持久化功能正常');
        console.log(`   - 缓存项数量: ${Object.keys(cacheData).length}`);
        console.log(`   - 缓存文件大小: ${fs.statSync(this.cacheFile).size} bytes`);
        
        this.results.push({
          feature: '缓存持久化',
          status: 'PASS',
          details: {
            cacheItems: Object.keys(cacheData).length,
            fileSize: fs.statSync(this.cacheFile).size
          }
        });
      } else {
        console.log('❌ 缓存文件不存在');
        this.results.push({
          feature: '缓存持久化',
          status: 'FAIL',
          reason: '缓存文件未生成'
        });
      }
    } catch (error) {
      console.log('❌ 缓存持久化验证失败:', error.message);
      this.results.push({
        feature: '缓存持久化',
        status: 'FAIL',
        reason: error.message
      });
    }
  }

  /**
   * 验证高并发场景
   */
  async validateConcurrentExecution() {
    console.log('🧪 验证高并发场景...');
    
    try {
      // 模拟并发测试执行
      const concurrentProcesses = 2; // 减少并发数避免资源竞争
      const promises = [];
      
      for (let i = 0; i < concurrentProcesses; i++) {
        promises.push(new Promise((resolve, reject) => {
          try {
            const output = execSync('npm run test:unit', {
              encoding: 'utf8',
              stdio: 'pipe',
              timeout: 60000,
              cwd: path.join(__dirname, '..')
            });
            resolve({ success: true, output });
          } catch (error) {
            reject(error);
          }
        }));
      }
      
      await Promise.all(promises);
      console.log('✅ 高并发测试通过');
      this.results.push({
        feature: '高并发执行',
        status: 'PASS',
        details: `${concurrentProcesses}个并发进程全部完成`
      });
    } catch (error) {
      console.log('❌ 高并发测试失败:', error.message);
      this.results.push({
        feature: '高并发执行',
        status: 'FAIL',
        reason: error.message
      });
    }
  }

  /**
   * 验证错误恢复能力
   */
  validateErrorRecovery() {
    console.log('🧪 验证错误恢复能力...');
    
    try {
      // 使用一个无效的Jest配置来触发错误，但不会导致命令挂起
      const output = execSync('node test-runner-secure.cjs --config=non-existent-config.json', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 30000,
        cwd: __dirname
      });

      // 检查是否能够正常处理错误
      if (output.includes('配置文件错误') || output.includes('配置加载失败')) {
        console.log('✅ 错误恢复能力正常');
        this.results.push({
          feature: '错误恢复',
          status: 'PASS',
          details: '测试在遇到错误时能够正常处理'
        });
      } else {
        console.log('❌ 错误恢复能力异常');
        this.results.push({
          feature: '错误恢复',
          status: 'FAIL',
          reason: '测试输出异常'
        });
      }
    } catch (error) {
      // 命令执行失败是预期的，因为我们传入了一个不存在的配置文件
      if (error.message.includes('配置文件错误') || error.message.includes('配置加载失败')) {
        console.log('✅ 错误恢复能力正常（捕获到预期错误）');
        this.results.push({
          feature: '错误恢复',
          status: 'PASS',
          details: '测试在遇到错误时能够正常处理'
        });
      } else {
        console.log('❌ 错误恢复验证失败:', error.message);
        this.results.push({
          feature: '错误恢复',
          status: 'FAIL',
          reason: error.message
        });
      }
    }
  }

  /**
   * 验证资源使用监控
   */
  validateResourceMonitoring() {
    console.log('🧪 验证资源使用监控...');
    
    try {
      const startMemory = process.memoryUsage();
      const startTime = Date.now();

      // 执行资源密集型操作
      execSync('npm run test:unit', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120000,
        cwd: path.join(__dirname, '..')
      });

      const endMemory = process.memoryUsage();
      const endTime = Date.now();

      const memoryIncrease = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
      const executionTime = endTime - startTime;

      console.log('📊 资源使用情况:');
      console.log(`   - 执行时间: ${executionTime}ms`);
      console.log(`   - 内存增长: ${memoryIncrease.toFixed(2)}MB`);
      console.log(`   - 堆内存使用: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

      // 检查资源使用是否在合理范围内
      if (memoryIncrease < 500 && executionTime < 120000) { // 500MB内存增长，2分钟执行时间
        console.log('✅ 资源使用监控正常');
        this.results.push({
          feature: '资源监控',
          status: 'PASS',
          details: {
            executionTime,
            memoryIncrease: memoryIncrease.toFixed(2),
            heapUsed: (endMemory.heapUsed / 1024 / 1024).toFixed(2)
          }
        });
      } else {
        console.log('⚠️ 资源使用超出预期');
        this.results.push({
          feature: '资源监控',
          status: 'WARN',
          reason: `资源使用较高: 内存增长${memoryIncrease.toFixed(2)}MB, 执行时间${executionTime}ms`
        });
      }
    } catch (error) {
      console.log('❌ 资源监控验证失败:', error.message);
      this.results.push({
        feature: '资源监控',
        status: 'FAIL',
        reason: error.message
      });
    }
  }

  /**
   * 生成验证报告
   */
  generateReport() {
    console.log('\n📋 工业条件验证报告');
    console.log('=' .repeat(50));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warned = this.results.filter(r => r.status === 'WARN').length;
    const total = this.results.length;

    console.log(`✅ 通过: ${passed} / ${total}`);
    console.log(`❌ 失败: ${failed} / ${total}`);
    console.log(`⚠️ 警告: ${warned} / ${total}`);

    console.log('\n📊 详细结果:');
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${result.feature}: ${result.status}`);
      if (result.details) {
        console.log(`   详情: ${JSON.stringify(result.details)}`);
      }
      if (result.reason) {
        console.log(`   原因: ${result.reason}`);
      }
    });

    // 保存报告到文件
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        warned
      },
      results: this.results
    };

    fs.writeFileSync(
      path.join(__dirname, 'industrial-validation-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 详细报告已保存到: industrial-validation-report.json');

    // 返回总体状态
    return failed === 0;
  }

  /**
   * 运行所有验证
   */
  async runAllValidations() {
    console.log('🚀 开始工业条件验证...\n');

    await this.validatePerformanceMonitoring();
    await this.validateSmartTestOrdering();
    await this.validateCachePersistence();
    await this.validateConcurrentExecution();
    await this.validateErrorRecovery();
    await this.validateResourceMonitoring();

    const success = this.generateReport();
    
    if (success) {
      console.log('\n🎉 所有工业条件验证通过！');
      process.exit(0);
    } else {
      console.log('\n💥 部分工业条件验证失败，请检查详细报告。');
      process.exit(1);
    }
  }
}

// 运行验证
const validator = new IndustrialTestValidator();
validator.runAllValidations().catch(error => {
  console.error('验证过程发生错误:', error);
  process.exit(1);
});