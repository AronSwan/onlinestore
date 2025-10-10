#!/usr/bin/env node

// 用途：并行测试执行器
// 依赖文件：test-runner-enhanced.cjs
// 作者：后端开发团队
// 时间：2025-10-09
// 版本：v1.0

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

class ParallelTestExecutor {
  constructor(options = {}) {
    this.maxWorkers = options.maxWorkers || Math.max(1, Math.floor(os.cpus().length * 0.75));
    this.timeout = options.timeout || 300000; // 5分钟
    this.verbose = options.verbose || false;
    this.results = [];
    this.runningWorkers = 0;
    this.completedWorkers = 0;
  }

  /**
   * 执行并行测试
   * @param {Array} testTasks - 测试任务数组
   * @returns {Promise<Array>} 测试结果数组
   */
  async executeTests(testTasks) {
    if (testTasks.length === 0) {
      return [];
    }

    console.log(`🔄 启动并行测试执行器，最大工作进程数: ${this.maxWorkers}`);
    console.log(`📋 待执行测试任务: ${testTasks.length} 个`);

    return new Promise((resolve, reject) => {
      this.results = new Array(testTasks.length).fill(null);
      this.runningWorkers = 0;
      this.completedWorkers = 0;

      // 启动初始工作进程
      const initialBatch = Math.min(this.maxWorkers, testTasks.length);
      for (let i = 0; i < initialBatch; i++) {
        this.executeTask(testTasks[i], i, testTasks, resolve, reject);
      }
    });
  }

  /**
   * 执行单个测试任务
   * @param {Object} task - 测试任务
   * @param {number} index - 任务索引
   * @param {Array} allTasks - 所有任务
   * @param {Function} resolve - Promise resolve 函数
   * @param {Function} reject - Promise reject 函数
   */
  executeTask(task, index, allTasks, resolve, reject) {
    this.runningWorkers++;
    
    if (this.verbose) {
      console.log(`🚀 启动测试任务 [${index + 1}/${allTasks.length}]: ${task.description}`);
    }

    const startTime = Date.now();
    const child = spawn('node', [task.script, ...task.args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'test',
        PARALLEL_TEST_ID: index.toString(),
        PARALLEL_TEST_TYPE: task.type
      }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      
      if (this.verbose) {
        process.stdout.write(`[Task ${index + 1}] ${output}`);
      }
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      
      if (this.verbose) {
        process.stderr.write(`[Task ${index + 1}] ${output}`);
      }
    });

    const timeoutId = setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
        this.handleTaskComplete({
          index,
          task,
          success: false,
          error: 'Test timeout',
          duration: this.timeout,
          stdout,
          stderr,
          fromCache: false
        }, allTasks, resolve, reject);
      }
    }, this.timeout);

    child.on('close', (code, signal) => {
      clearTimeout(timeoutId);
      
      const duration = Date.now() - startTime;
      
      this.handleTaskComplete({
        index,
        task,
        success: code === 0,
        exitCode: code,
        signal,
        duration,
        stdout,
        stderr,
        fromCache: false
      }, allTasks, resolve, reject);
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      
      const duration = Date.now() - startTime;
      
      this.handleTaskComplete({
        index,
        task,
        success: false,
        error: error.message,
        duration,
        stdout,
        stderr,
        fromCache: false
      }, allTasks, resolve, reject);
    });
  }

  /**
   * 处理任务完成
   * @param {Object} result - 任务结果
   * @param {Array} allTasks - 所有任务
   * @param {Function} resolve - Promise resolve 函数
   * @param {Function} reject - Promise reject 函数
   */
  handleTaskComplete(result, allTasks, resolve, reject) {
    this.runningWorkers--;
    this.completedWorkers++;
    
    // 确保结果对象存在
    if (!result) {
      result = {
        index: this.completedWorkers - 1,
        task: allTasks[this.completedWorkers - 1],
        success: false,
        duration: 0,
        error: 'Unknown error'
      };
    }
    
    this.results[result.index] = result;

    console.log(`✅ 测试任务完成 [${result.index + 1}/${allTasks.length}]: ${result.task.description} (${(result.duration / 1000).toFixed(2)}s)`);

    // 启动下一个任务
    const nextIndex = this.completedWorkers;
    if (nextIndex < allTasks.length) {
      this.executeTask(allTasks[nextIndex], nextIndex, allTasks, resolve, reject);
    }

    // 检查是否所有任务都已完成
    if (this.completedWorkers === allTasks.length) {
      console.log(`🎉 所有测试任务完成！总耗时: ${this.getTotalDuration().toFixed(2)}秒`);
      resolve(this.results);
    }
  }

  /**
   * 获取总耗时
   * @returns {number} 总耗时（毫秒）
   */
  getTotalDuration() {
    return Math.max(...this.results.filter(r => r).map(r => r.duration));
  }

  /**
   * 获取成功任务数量
   * @returns {number} 成功任务数量
   */
  getSuccessCount() {
    return this.results.filter(r => r && r.success).length;
  }

  /**
   * 获取失败任务数量
   * @returns {number} 失败任务数量
   */
  getFailureCount() {
    return this.results.filter(r => r && !r.success).length;
  }

  /**
   * 生成测试报告
   * @returns {Object} 测试报告
   */
  generateReport() {
    const successCount = this.getSuccessCount();
    const failureCount = this.getFailureCount();
    const totalDuration = this.getTotalDuration();

    return {
      summary: {
        total: this.results.length,
        success: successCount,
        failure: failureCount,
        successRate: ((successCount / this.results.length) * 100).toFixed(2) + '%',
        totalDuration: (totalDuration / 1000).toFixed(2) + 's'
      },
      tasks: this.results,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * 生成优化建议
   * @returns {Array} 优化建议数组
   */
  generateRecommendations() {
    const recommendations = [];
    const failureCount = this.getFailureCount();
    const totalDuration = this.getTotalDuration();
    const avgDuration = this.results.filter(r => r).reduce((sum, r) => sum + r.duration, 0) / this.results.length;

    if (failureCount > 0) {
      recommendations.push(`发现 ${failureCount} 个失败的测试，建议优先修复`);
    }

    if (totalDuration > 60000) { // 超过1分钟
      recommendations.push('测试总耗时较长，建议优化测试用例或增加并行度');
    }

    if (avgDuration > 10000) { // 平均超过10秒
      recommendations.push('部分测试用例耗时较长，建议优化测试逻辑');
    }

    if (this.maxWorkers < os.cpus().length) {
      recommendations.push('可以增加最大工作进程数以提升测试效率');
    }

    return recommendations;
  }
}

module.exports = ParallelTestExecutor;