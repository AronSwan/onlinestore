#!/usr/bin/env node

// 用途：测试监控脚本
// 功能：实时监控测试执行状态和覆盖率数据
// 作者：后端开发团队
// 时间：2025-10-04

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestMonitor {
  constructor() {
    this.backendDir = path.resolve(__dirname, '..');
    this.coverageFile = path.join(this.backendDir, 'coverage', 'coverage-final.json');
    this.logFile = path.join(this.backendDir, 'test-monitor.log');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    
    // 写入日志文件
    fs.appendFileSync(this.logFile, logMessage);
  }

  runTest() {
    try {
      this.log('🚀 开始运行测试...');
      
      const command = 'node scripts/test-runner.cjs --coverage';
      const output = execSync(command, {
        encoding: 'utf8',
        cwd: this.backendDir,
        stdio: 'pipe'
      });

      this.log('✅ 测试执行完成');
      return { success: true, output };
    } catch (error) {
      this.log(`❌ 测试执行失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  analyzeCoverage() {
    if (!fs.existsSync(this.coverageFile)) {
      this.log('⚠️ 未找到覆盖率报告文件');
      return null;
    }

    try {
      const coverageData = JSON.parse(fs.readFileSync(this.coverageFile, 'utf8'));
      const summary = {
        totalLines: 0,
        coveredLines: 0,
        totalFunctions: 0,
        coveredFunctions: 0,
        totalBranches: 0,
        coveredBranches: 0,
        totalStatements: 0,
        coveredStatements: 0,
        files: Object.keys(coverageData).length
      };

      Object.values(coverageData).forEach(file => {
        if (file.s) {
          summary.totalLines += file.s.l;
          summary.coveredLines += file.s.l - (file.s.h || 0) - (file.s.u || 0);
        }
        if (file.f) {
          summary.totalFunctions += Object.keys(file.f).length;
          summary.coveredFunctions += Object.values(file.f).filter(f => f.l > 0).length;
        }
        if (file.b) {
          summary.totalBranches += Object.keys(file.b).length;
          summary.coveredBranches += Object.values(file.b).filter(b => b.l > 0).length;
        }
        if (file.stmts) {
          summary.totalStatements += Object.keys(file.stmts).length;
          summary.coveredStatements += Object.values(file.stmts).filter(s => s.l > 0).length;
        }
      });

      const percentages = {
        lines: summary.totalLines > 0 ? (summary.coveredLines / summary.totalLines * 100).toFixed(2) : 0,
        functions: summary.totalFunctions > 0 ? (summary.coveredFunctions / summary.totalFunctions * 100).toFixed(2) : 0,
        branches: summary.totalBranches > 0 ? (summary.coveredBranches / summary.totalBranches * 100).toFixed(2) : 0,
        statements: summary.totalStatements > 0 ? (summary.coveredStatements / summary.totalStatements * 100).toFixed(2) : 0
      };

      return {
        summary,
        percentages,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.log(`❌ 覆盖率分析失败: ${error.message}`);
      return null;
    }
  }

  generateReport(coverageData) {
    if (!coverageData) {
      this.log('⚠️ 无法生成覆盖率报告 - 无有效数据');
      return;
    }

    const { summary, percentages } = coverageData;
    
    this.log('\n📊 覆盖率报告');
    this.log('='.repeat(50));
    this.log(`📁 文件数量: ${summary.files}`);
    this.log(`📏 行覆盖率: ${percentages.lines}% (${summary.coveredLines}/${summary.totalLines})`);
    this.log(`⚙️  函数覆盖率: ${percentages.functions}% (${summary.coveredFunctions}/${summary.totalFunctions})`);
    this.log(`🔀 分支覆盖率: ${percentages.branches}% (${summary.coveredBranches}/${summary.totalBranches})`);
    this.log(`📝 语句覆盖率: ${percentages.statements}% (${summary.coveredStatements}/${summary.totalStatements})`);
    this.log('='.repeat(50));

    // 检查是否达到目标
    const target = 80;
    const overall = parseFloat(percentages.statements);
    
    if (overall >= target) {
      this.log(`🎉 恭喜！整体覆盖率 (${overall}%) 已达到目标 (${target}%)`);
    } else {
      this.log(`⚠️ 整体覆盖率 (${overall}%) 低于目标 (${target}%)，需要改进`);
    }

    // 分析关键模块
    this.analyzeKeyModules(coverageData);
  }

  analyzeKeyModules(coverageData) {
    const keyModules = [
      'src/auth/auth.service.ts',
      'src/auth/auth.controller.ts',
      'src/users/users.service.ts',
      'src/users/users.controller.ts',
      'src/products/products.service.ts',
      'src/products/products.controller.ts',
      'src/orders/orders.service.ts',
      'src/orders/orders.controller.ts'
    ];

    this.log('\n🔍 关键模块分析');
    this.log('-'.repeat(50));

    keyModules.forEach(module => {
      const fileData = coverageData[module];
      if (fileData && file.s) {
        const totalLines = fileData.s.l;
        const uncoveredLines = (fileData.s.h || 0) + (fileData.s.u || 0);
        const coverage = totalLines > 0 ? ((totalLines - uncoveredLines) / totalLines * 100).toFixed(2) : 0;
        
        const status = coverage >= 80 ? '✅' : coverage >= 60 ? '⚠️' : '❌';
        this.log(`${status} ${module}: ${coverage}% (${totalLines - uncoveredLines}/${totalLines})`);
      } else {
        this.log(`❌ ${module}: 无覆盖率数据`);
      }
    });
  }

  checkCoverageThresholds() {
    const coverageData = this.analyzeCoverage();
    if (!coverageData) return false;

    const { percentages } = coverageData;
    const thresholds = {
      lines: 75,
      functions: 75,
      branches: 75,
      statements: 75
    };

    let allPassed = true;

    Object.entries(thresholds).forEach(([type, threshold]) => {
      const current = parseFloat(percentages[type]);
      if (current < threshold) {
        this.log(`❌ ${type} 覆盖率 ${current}% 低于阈值 ${threshold}%`);
        allPassed = false;
      } else {
        this.log(`✅ ${type} 覆盖率 ${current}% 达到阈值 ${threshold}%`);
      }
    });

    return allPassed;
  }

  run() {
    this.log('🧪 开始测试监控...');

    // 运行测试
    const testResult = this.runTest();
    
    // 分析覆盖率
    const coverageData = this.analyzeCoverage();
    
    // 生成报告
    this.generateReport(coverageData);
    
    // 检查阈值
    const thresholdsMet = this.checkCoverageThresholds();
    
    // 输出总结
    this.log('\n📋 监控总结');
    this.log('='.repeat(50));
    this.log(`测试执行: ${testResult.success ? '✅ 成功' : '❌ 失败'}`);
    this.log(`覆盖率检查: ${thresholdsMet ? '✅ 达标' : '❌ 未达标'}`);
    this.log(`监控时间: ${new Date().toISOString()}`);
    this.log('='.repeat(50));

    return {
      testSuccess: testResult.success,
      thresholdsMet,
      coverageData
    };
  }

  // 定时运行监控
  startMonitoring(intervalMinutes = 60) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    this.log(`🔄 启动定时监控，间隔: ${intervalMinutes} 分钟`);
    
    // 立即运行一次
    this.run();
    
    // 设置定时器
    setInterval(() => {
      this.log('\n⏰ 执行定时监控...');
      this.run();
    }, intervalMs);
  }
}

// 命令行接口
if (require.main === module) {
  const monitor = new TestMonitor();
  
  const args = process.argv.slice(2);
  const interval = parseInt(args[0]) || 60;
  
  if (args.includes('--once')) {
    // 只运行一次
    monitor.run();
  } else if (args.includes('--help')) {
    console.log(`
测试监控脚本用法:

node scripts/test-monitor.js [选项]

选项:
  --once          只运行一次监控
  --help          显示帮助信息
  [分钟数]        设置监控间隔时间 (默认60分钟)

示例:
  node scripts/test-monitor.js              # 每60分钟监控一次
  node scripts/test-monitor.js 30           # 每30分钟监控一次
  node scripts/test-monitor.js --once       # 只运行一次
    `);
  } else {
    // 启动定时监控
    monitor.startMonitoring(interval);
  }
}

module.exports = TestMonitor;
