/**
 * 分析平台综合部署脚本
 * 一键部署分布式追踪、用户行为分析、高级查询、性能优化和安全管理功能
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AnalyticsPlatformDeployment {
  constructor() {
    this.config = {
      openobserveUrl: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
      organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
      token: process.env.OPENOBSERVE_TOKEN || '',
      enableDistributedTracing: process.env.ENABLE_DISTRIBUTED_TRACING !== 'false',
      enableUserBehaviorAnalytics: process.env.ENABLE_USER_BEHAVIOR_ANALYTICS !== 'false',
      enableAdvancedQuery: process.env.ENABLE_ADVANCED_QUERY !== 'false',
      enablePerformanceOptimization: process.env.ENABLE_PERFORMANCE_OPTIMIZATION !== 'false',
      enableSecurityManagement: process.env.ENABLE_SECURITY_MANAGEMENT !== 'false',
      enableTesting: process.env.ENABLE_TESTING !== 'false'
    };
    
    this.deploymentResults = {
      distributedTracing: { status: 'pending', details: null },
      userBehaviorAnalytics: { status: 'pending', details: null },
      advancedQuery: { status: 'pending', details: null },
      performanceOptimization: { status: 'pending', details: null },
      securityManagement: { status: 'pending', details: null },
      testing: { status: 'pending', details: null }
    };
  }

  /**
   * 执行完整的分析平台部署
   */
  async deploy() {
    console.log('🚀 开始部署分析平台...');
    console.log('=====================================');
    
    const startTime = Date.now();
    
    try {
      // 1. 验证OpenObserve连接
      await this.verifyOpenObserveConnection();
      
      // 2. 部署分布式追踪
      if (this.config.enableDistributedTracing) {
        await this.deployDistributedTracing();
      }
      
      // 3. 部署用户行为分析
      if (this.config.enableUserBehaviorAnalytics) {
        await this.deployUserBehaviorAnalytics();
      }
      
      // 4. 部署高级查询
      if (this.config.enableAdvancedQuery) {
        await this.deployAdvancedQuery();
      }
      
      // 5. 部署性能优化
      if (this.config.enablePerformanceOptimization) {
        await this.deployPerformanceOptimization();
      }
      
      // 6. 部署安全管理
      if (this.config.enableSecurityManagement) {
        await this.deploySecurityManagement();
      }
      
      // 7. 运行测试
      if (this.config.enableTesting) {
        await this.runTests();
      }
      
      // 8. 生成部署报告
      await this.generateDeploymentReport();
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ 分析平台部署完成，耗时: ${duration.toFixed(2)}秒`);
      this.printDeploymentSummary();
      
    } catch (error) {
      console.error('❌ 分析平台部署失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证OpenObserve连接
   */
  async verifyOpenObserveConnection() {
    console.log('\n📡 验证OpenObserve连接...');
    
    try {
      const response = await axios.get(`${this.config.openobserveUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ OpenObserve连接正常');
      } else {
        throw new Error(`OpenObserve健康检查失败: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`无法连接到OpenObserve: ${error.message}`);
    }
  }

  /**
   * 部署分布式追踪
   */
  async deployDistributedTracing() {
    console.log('\n🔍 部署分布式追踪...');
    
    try {
      const DistributedTracingSetup = require('./setup-distributed-tracing');
      const setup = new DistributedTracingSetup();
      await setup.setup();
      
      this.deploymentResults.distributedTracing = {
        status: 'success',
        details: '分布式追踪部署成功'
      };
      
      console.log('✅ 分布式追踪部署完成');
    } catch (error) {
      this.deploymentResults.distributedTracing = {
        status: 'failed',
        details: error.message
      };
      
      console.error('❌ 分布式追踪部署失败:', error.message);
    }
  }

  /**
   * 部署用户行为分析
   */
  async deployUserBehaviorAnalytics() {
    console.log('\n📊 部署用户行为分析...');
    
    try {
      const UserBehaviorAnalyticsSetup = require('./setup-user-behavior-analytics');
      const setup = new UserBehaviorAnalyticsSetup();
      await setup.setup();
      
      this.deploymentResults.userBehaviorAnalytics = {
        status: 'success',
        details: '用户行为分析部署成功'
      };
      
      console.log('✅ 用户行为分析部署完成');
    } catch (error) {
      this.deploymentResults.userBehaviorAnalytics = {
        status: 'failed',
        details: error.message
      };
      
      console.error('❌ 用户行为分析部署失败:', error.message);
    }
  }

  /**
   * 部署高级查询
   */
  async deployAdvancedQuery() {
    console.log('\n🔍 部署高级查询...');
    
    try {
      const AdvancedQueryAnalyticsSetup = require('./setup-advanced-query-analytics');
      const setup = new AdvancedQueryAnalyticsSetup();
      await setup.setup();
      
      this.deploymentResults.advancedQuery = {
        status: 'success',
        details: '高级查询部署成功'
      };
      
      console.log('✅ 高级查询部署完成');
    } catch (error) {
      this.deploymentResults.advancedQuery = {
        status: 'failed',
        details: error.message
      };
      
      console.error('❌ 高级查询部署失败:', error.message);
    }
  }

  /**
   * 部署性能优化
   */
  async deployPerformanceOptimization() {
    console.log('\n⚡ 部署性能优化...');
    
    try {
      const PerformanceOptimizationSetup = require('./setup-performance-optimization');
      const setup = new PerformanceOptimizationSetup();
      await setup.setup();
      
      this.deploymentResults.performanceOptimization = {
        status: 'success',
        details: '性能优化部署成功'
      };
      
      console.log('✅ 性能优化部署完成');
    } catch (error) {
      this.deploymentResults.performanceOptimization = {
        status: 'failed',
        details: error.message
      };
      
      console.error('❌ 性能优化部署失败:', error.message);
    }
  }

  /**
   * 部署安全管理
   */
  async deploySecurityManagement() {
    console.log('\n🔒 部署安全管理...');
    
    try {
      const SecurityManagementSetup = require('./setup-security-management');
      const setup = new SecurityManagementSetup();
      await setup.setup();
      
      this.deploymentResults.securityManagement = {
        status: 'success',
        details: '安全管理部署成功'
      };
      
      console.log('✅ 安全管理部署完成');
    } catch (error) {
      this.deploymentResults.securityManagement = {
        status: 'failed',
        details: error.message
      };
      
      console.error('❌ 安全管理部署失败:', error.message);
    }
  }

  /**
   * 运行测试
   */
  async runTests() {
    console.log('\n🧪 运行测试...');
    
    try {
      const testResults = {};
      
      // 运行分布式追踪测试
      if (this.config.enableDistributedTracing && this.deploymentResults.distributedTracing.status === 'success') {
        try {
          const DistributedTracingTest = require('./test-distributed-tracing');
          const test = new DistributedTracingTest();
          await test.runTests();
          testResults.distributedTracing = { status: 'success', passed: test.testResults.passed, failed: test.testResults.failed };
        } catch (error) {
          testResults.distributedTracing = { status: 'failed', error: error.message };
        }
      }
      
      // 运行用户行为分析测试
      if (this.config.enableUserBehaviorAnalytics && this.deploymentResults.userBehaviorAnalytics.status === 'success') {
        try {
          const UserBehaviorAnalyticsTest = require('./test-user-behavior-analytics');
          const test = new UserBehaviorAnalyticsTest();
          await test.runTests();
          testResults.userBehaviorAnalytics = { status: 'success', passed: test.testResults.passed, failed: test.testResults.failed };
        } catch (error) {
          testResults.userBehaviorAnalytics = { status: 'failed', error: error.message };
        }
      }
      
      // 运行高级查询测试
      if (this.config.enableAdvancedQuery && this.deploymentResults.advancedQuery.status === 'success') {
        try {
          const AdvancedQueryAnalyticsTest = require('./test-advanced-query-analytics');
          const test = new AdvancedQueryAnalyticsTest();
          await test.runTests();
          testResults.advancedQuery = { status: 'success', passed: test.testResults.passed, failed: test.testResults.failed };
        } catch (error) {
          testResults.advancedQuery = { status: 'failed', error: error.message };
        }
      }
      
      // 运行性能优化测试
      if (this.config.enablePerformanceOptimization && this.deploymentResults.performanceOptimization.status === 'success') {
        try {
          const PerformanceOptimizationTest = require('./test-performance-optimization');
          const test = new PerformanceOptimizationTest();
          await test.runTests();
          testResults.performanceOptimization = { status: 'success', passed: test.testResults.passed, failed: test.testResults.failed };
        } catch (error) {
          testResults.performanceOptimization = { status: 'failed', error: error.message };
        }
      }
      
      // 运行安全管理测试
      if (this.config.enableSecurityManagement && this.deploymentResults.securityManagement.status === 'success') {
        try {
          const SecurityManagementTest = require('./test-security-management');
          const test = new SecurityManagementTest();
          await test.runTests();
          testResults.securityManagement = { status: 'success', passed: test.testResults.passed, failed: test.testResults.failed };
        } catch (error) {
          testResults.securityManagement = { status: 'failed', error: error.message };
        }
      }
      
      this.deploymentResults.testing = {
        status: 'success',
        details: testResults
      };
      
      console.log('✅ 测试运行完成');
    } catch (error) {
      this.deploymentResults.testing = {
        status: 'failed',
        details: error.message
      };
      
      console.error('❌ 测试运行失败:', error.message);
    }
  }

  /**
   * 生成部署报告
   */
  async generateDeploymentReport() {
    console.log('\n📄 生成部署报告...');
    
    const report = {
      deploymentTime: new Date().toISOString(),
      openobserveUrl: this.config.openobserveUrl,
      organization: this.config.organization,
      components: this.deploymentResults,
      summary: this.generateDeploymentSummary()
    };
    
    // 创建报告目录
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // 保存报告
    const reportPath = path.join(reportsDir, `deployment-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // 生成Markdown报告
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(reportsDir, `deployment-report-${Date.now()}.md`);
    fs.writeFileSync(markdownPath, markdownReport);
    
    console.log(`✅ 部署报告已生成: ${reportPath}`);
    console.log(`✅ Markdown报告已生成: ${markdownPath}`);
  }

  /**
   * 生成部署摘要
   */
  generateDeploymentSummary() {
    const components = Object.keys(this.deploymentResults);
    const successful = components.filter(key => this.deploymentResults[key].status === 'success').length;
    const failed = components.filter(key => this.deploymentResults[key].status === 'failed').length;
    
    return {
      total: components.length,
      successful,
      failed,
      successRate: (successful / components.length * 100).toFixed(2)
    };
  }

  /**
   * 生成Markdown报告
   */
  generateMarkdownReport(report) {
    let markdown = `# 分析平台部署报告

## 部署信息

- **部署时间**: ${report.deploymentTime}
- **OpenObserve URL**: ${report.openobserveUrl}
- **组织**: ${report.organization}

## 部署摘要

- **总组件数**: ${report.summary.total}
- **成功部署**: ${report.summary.successful}
- **部署失败**: ${report.summary.failed}
- **成功率**: ${report.summary.successRate}%

## 组件部署状态

`;

    // 添加组件状态
    const componentNames = {
      distributedTracing: '分布式追踪',
      userBehaviorAnalytics: '用户行为分析',
      advancedQuery: '高级查询',
      performanceOptimization: '性能优化',
      securityManagement: '安全管理',
      testing: '测试'
    };

    for (const [key, value] of Object.entries(report.components)) {
      const status = value.status === 'success' ? '✅ 成功' : '❌ 失败';
      const componentName = componentNames[key] || key;
      
      markdown += `### ${componentName}

**状态**: ${status}

**详情**: ${value.details}

`;
      
      // 如果是测试结果，添加测试详情
      if (key === 'testing' && value.status === 'success' && typeof value.details === 'object') {
        markdown += `#### 测试结果

`;
        for (const [testKey, testValue] of Object.entries(value.details)) {
          const testComponentName = componentNames[testKey] || testKey;
          const testStatus = testValue.status === 'success' ? '✅ 成功' : '❌ 失败';
          
          markdown += `- **${testComponentName}**: ${testStatus}`;
          
          if (testValue.status === 'success') {
            markdown += ` (通过: ${testValue.passed}, 失败: ${testValue.failed})`;
          } else {
            markdown += ` (错误: ${testValue.error})`;
          }
          
          markdown += `\n`;
        }
        markdown += `\n`;
      }
    }

    // 添加后续步骤
    markdown += `## 后续步骤

1. 访问OpenObserve查看仪表板: ${report.openobserveUrl}
2. 根据需要启动各个服务:
   - 分布式追踪: \`node scripts/start-tracing-service.js\`
   - 用户行为分析: \`node scripts/start-analytics-service.js\`
   - 高级查询: \`node scripts/start-query-service.js\`
   - 性能优化: \`node scripts/start-performance-service.js\`
   - 安全管理: \`node scripts/start-security-service.js\`
3. 运行系统调优: \`sudo bash scripts/system-tuning.sh\`
4. 运行安全检查: \`sudo bash scripts/security-check.sh\`

## 支持和文档

- 分布式追踪指南: \`docs/distributed-tracing-guide.md\`
- 用户行为分析指南: \`docs/user-behavior-analytics-guide.md\`
- 高级查询指南: \`docs/advanced-query-guide.md\`
- 性能优化指南: \`docs/performance-optimization-guide.md\`
- 安全管理指南: \`docs/security-management-guide.md\`

如有问题或建议，请联系技术支持团队。
`;

    return markdown;
  }

  /**
   * 打印部署摘要
   */
  printDeploymentSummary() {
    console.log('\n📋 部署摘要');
    console.log('=====================================');
    
    const summary = this.generateDeploymentSummary();
    console.log(`📊 总组件数: ${summary.total}`);
    console.log(`✅ 成功部署: ${summary.successful}`);
    console.log(`❌ 部署失败: ${summary.failed}`);
    console.log(`📈 成功率: ${summary.successRate}%`);
    
    console.log('\n📦 组件状态:');
    const componentNames = {
      distributedTracing: '分布式追踪',
      userBehaviorAnalytics: '用户行为分析',
      advancedQuery: '高级查询',
      performanceOptimization: '性能优化',
      securityManagement: '安全管理',
      testing: '测试'
    };
    
    for (const [key, value] of Object.entries(this.deploymentResults)) {
      const status = value.status === 'success' ? '✅' : '❌';
      const componentName = componentNames[key] || key;
      console.log(`  ${status} ${componentName}`);
    }
    
    console.log('\n🔗 访问链接:');
    console.log(`  OpenObserve: ${this.config.openobserveUrl}`);
    
    console.log('\n📖 文档链接:');
    console.log(`  分布式追踪指南: docs/distributed-tracing-guide.md`);
    console.log(`  用户行为分析指南: docs/user-behavior-analytics-guide.md`);
    console.log(`  高级查询指南: docs/advanced-query-guide.md`);
    console.log(`  性能优化指南: docs/performance-optimization-guide.md`);
    console.log(`  安全管理指南: docs/security-management-guide.md`);
    
    console.log('\n🚀 启动命令:');
    console.log(`  分布式追踪: node scripts/start-tracing-service.js`);
    console.log(`  用户行为分析: node scripts/start-analytics-service.js`);
    console.log(`  高级查询: node scripts/start-query-service.js`);
    console.log(`  性能优化: node scripts/start-performance-service.js`);
    console.log(`  安全管理: node scripts/start-security-service.js`);
    
    if (summary.failed > 0) {
      console.log('\n⚠️ 部分组件部署失败，请检查错误日志并重试');
    } else {
      console.log('\n🎉 所有组件部署成功！');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const deployment = new AnalyticsPlatformDeployment();
  
  // 处理命令行参数
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
分析平台部署脚本

用法: node scripts/deploy-analytics-platform.js [选项]

选项:
  --help, -h                显示帮助信息
  --openobserve-url <url>   OpenObserve服务地址 (默认: http://localhost:5080)
  --organization <name>     组织名称 (默认: default)
  --token <token>           认证令牌
  --enable-all              启用所有组件 (默认)
  --disable-tracing         禁用分布式追踪
  --disable-analytics       禁用用户行为分析
  --disable-query          禁用高级查询
  --disable-performance     禁用性能优化
  --disable-security        禁用安全管理
  --disable-testing         禁用测试

环境变量:
  OPENOBSERVE_URL           OpenObserve服务地址
  OPENOBSERVE_ORGANIZATION   组织名称
  OPENOBSERVE_TOKEN          认证令牌
  ENABLE_DISTRIBUTED_TRACING 启用分布式追踪 (默认: true)
  ENABLE_USER_BEHAVIOR_ANALYTICS 启用用户行为分析 (默认: true)
  ENABLE_ADVANCED_QUERY     启用高级查询 (默认: true)
  ENABLE_PERFORMANCE_OPTIMIZATION 启用性能优化 (默认: true)
  ENABLE_SECURITY_MANAGEMENT 启用安全管理 (默认: true)
  ENABLE_TESTING            启用测试 (默认: true)

示例:
  # 使用默认配置部署所有组件
  node scripts/deploy-analytics-platform.js

  # 指定OpenObserve地址和令牌
  node scripts/deploy-analytics-platform.js --openobserve-url http://localhost:5080 --token your-token

  # 只部署部分组件
  node scripts/deploy-analytics-platform.js --disable-performance --disable-security
`);
    process.exit(0);
  }
  
  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--openobserve-url' && i + 1 < args.length) {
      deployment.config.openobserveUrl = args[++i];
    } else if (arg === '--organization' && i + 1 < args.length) {
      deployment.config.organization = args[++i];
    } else if (arg === '--token' && i + 1 < args.length) {
      deployment.config.token = args[++i];
    } else if (arg === '--disable-tracing') {
      deployment.config.enableDistributedTracing = false;
    } else if (arg === '--disable-analytics') {
      deployment.config.enableUserBehaviorAnalytics = false;
    } else if (arg === '--disable-query') {
      deployment.config.enableAdvancedQuery = false;
    } else if (arg === '--disable-performance') {
      deployment.config.enablePerformanceOptimization = false;
    } else if (arg === '--disable-security') {
      deployment.config.enableSecurityManagement = false;
    } else if (arg === '--disable-testing') {
      deployment.config.enableTesting = false;
    }
  }
  
  // 开始部署
  deployment.deploy().catch(error => {
    console.error('部署失败:', error);
    process.exit(1);
  });
}

module.exports = AnalyticsPlatformDeployment;