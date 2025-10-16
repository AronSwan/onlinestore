#!/usr/bin/env node

/**
 * 智能调度器
 *
 * 功能：
 * 1. 实现智能调度算法 (PERF-3.3.4)
 * 2. 添加任务优先级管理
 * 3. 实现负载均衡
 * 4. 提供资源调度
 *
 * @author 架构师团队
 * @version 1.0.0
 * @since 2025-10-12
 */

const EventEmitter = require('events');
const os = require('os');

/**
 * 任务类
 */
class Task {
  constructor(id, executor, options = {}) {
    this.id = id;
    this.executor = executor;
    this.priority = options.priority || 0;
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 0;
    this.maxRetries = options.maxRetries || 3;
    this.dependencies = options.dependencies || [];
    this.resourceRequirements = options.resourceRequirements || {
      cpu: 1,
      memory: 128 * 1024 * 1024, // 128MB
    };

    this.status = 'pending';
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.error = null;
    this.result = null;
    this.attempts = 0;
  }

  /**
   * 启动任务
   */
  start() {
    this.status = 'running';
    this.startedAt = Date.now();
    this.attempts++;
  }

  /**
   * 完成任务
   */
  complete(result) {
    this.status = 'completed';
    this.completedAt = Date.now();
    this.result = result;
  }

  /**
   * 任务失败
   */
  fail(error) {
    this.status = 'failed';
    this.completedAt = Date.now();
    this.error = error;

    // 检查是否应该重试
    if (this.attempts < this.maxRetries) {
      this.status = 'pending';
      this.retries++;
    }
  }

  /**
   * 获取执行时间
   */
  getExecutionTime() {
    if (!this.startedAt) return 0;
    const endTime = this.completedAt || Date.now();
    return endTime - this.startedAt;
  }

  /**
   * 检查依赖是否满足
   */
  areDependenciesSatisfied(completedTasks) {
    return this.dependencies.every(dep => completedTasks.has(dep));
  }
}

/**
 * 资源管理器
 */
class ResourceManager {
  constructor() {
    this.totalResources = {
      cpu: os.cpus().length,
      memory: os.totalmem(),
    };

    this.usedResources = {
      cpu: 0,
      memory: 0,
    };

    this.allocations = new Map();
  }

  /**
   * 检查资源是否足够
   */
  hasEnoughResources(requirements) {
    return (
      this.usedResources.cpu + requirements.cpu <= this.totalResources.cpu &&
      this.usedResources.memory + requirements.memory <= this.totalResources.memory
    );
  }

  /**
   * 分配资源
   */
  allocateResources(taskId, requirements) {
    if (!this.hasEnoughResources(requirements)) {
      return false;
    }

    this.usedResources.cpu += requirements.cpu;
    this.usedResources.memory += requirements.memory;
    this.allocations.set(taskId, requirements);

    return true;
  }

  /**
   * 释放资源
   */
  releaseResources(taskId) {
    const requirements = this.allocations.get(taskId);
    if (!requirements) return false;

    this.usedResources.cpu -= requirements.cpu;
    this.usedResources.memory -= requirements.memory;
    this.allocations.delete(taskId);

    return true;
  }

  /**
   * 获取资源使用率
   */
  getResourceUtilization() {
    return {
      cpu: ((this.usedResources.cpu / this.totalResources.cpu) * 100).toFixed(2) + '%',
      memory: ((this.usedResources.memory / this.totalResources.memory) * 100).toFixed(2) + '%',
    };
  }
}

/**
 * 智能调度器类
 */
class SmartScheduler extends EventEmitter {
  constructor(options = {}) {
    super();

    // 默认配置
    this.config = {
      maxConcurrency: options.maxConcurrency || os.cpus().length,
      algorithm: options.algorithm || 'priority', // priority, round-robin, load-balanced
      enableResourceManagement: options.enableResourceManagement !== false,
      metricsInterval: options.metricsInterval || 5000,
      ...options,
    };

    // 任务队列
    this.pendingQueue = [];
    this.runningTasks = new Map();
    this.completedTasks = new Set();

    // 资源管理器
    this.resourceManager = new ResourceManager();

    // 性能指标
    this.metrics = {
      tasksSubmitted: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      throughput: 0, // 每秒完成的任务数
      resourceUtilization: this.resourceManager.getResourceUtilization(),
    };

    // 启动指标收集
    this.startMetricsCollection();
  }

  /**
   * 提交任务
   */
  submitTask(id, executor, options = {}) {
    const task = new Task(id, executor, options);
    this.pendingQueue.push(task);
    this.metrics.tasksSubmitted++;

    // 按优先级排序
    this.sortPendingQueue();

    // 尝试调度任务
    this.schedule();

    return task;
  }

  /**
   * 批量提交任务
   */
  submitTasks(taskDefinitions) {
    const tasks = [];

    for (const def of taskDefinitions) {
      const task = this.submitTask(def.id, def.executor, def.options);
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * 排序待处理队列
   */
  sortPendingQueue() {
    if (this.config.algorithm === 'priority') {
      // 按优先级排序
      this.pendingQueue.sort((a, b) => b.priority - a.priority);
    } else if (this.config.algorithm === 'round-robin') {
      // 保持FIFO顺序
      this.pendingQueue.sort((a, b) => a.createdAt - b.createdAt);
    } else if (this.config.algorithm === 'load-balanced') {
      // 按资源需求排序
      this.pendingQueue.sort((a, b) => {
        const aScore =
          a.priority -
          a.resourceRequirements.cpu -
          a.resourceRequirements.memory / (1024 * 1024 * 1024);
        const bScore =
          b.priority -
          b.resourceRequirements.cpu -
          b.resourceRequirements.memory / (1024 * 1024 * 1024);
        return bScore - aScore;
      });
    }
  }

  /**
   * 调度任务
   */
  schedule() {
    // 检查是否还有空闲槽位
    while (this.runningTasks.size < this.config.maxConcurrency && this.pendingQueue.length > 0) {
      // 找到下一个可执行的任务
      const taskIndex = this.findNextRunnableTask();

      if (taskIndex === -1) {
        // 没有可运行的任务，等待
        break;
      }

      // 从队列中取出任务
      const task = this.pendingQueue.splice(taskIndex, 1)[0];

      // 检查资源是否足够
      if (this.config.enableResourceManagement) {
        if (!this.resourceManager.allocateResources(task.id, task.resourceRequirements)) {
          // 资源不足，将任务放回队列
          this.pendingQueue.unshift(task);
          break;
        }
      }

      // 执行任务
      this.executeTask(task);
    }
  }

  /**
   * 找到下一个可运行的任务
   */
  findNextRunnableTask() {
    for (let i = 0; i < this.pendingQueue.length; i++) {
      const task = this.pendingQueue[i];

      // 检查依赖是否满足
      if (!task.areDependenciesSatisfied(this.completedTasks)) {
        continue;
      }

      // 检查资源是否足够
      if (this.config.enableResourceManagement) {
        if (!this.resourceManager.hasEnoughResources(task.resourceRequirements)) {
          continue;
        }
      }

      return i;
    }

    return -1;
  }

  /**
   * 执行任务
   */
  async executeTask(task) {
    // 更新任务状态
    task.start();
    this.runningTasks.set(task.id, task);

    // 发出事件
    this.emit('taskStarted', task);

    try {
      // 设置超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), task.timeout);
      });

      // 执行任务
      const result = await Promise.race([task.executor(), timeoutPromise]);

      // 任务完成
      task.complete(result);
      this.metrics.tasksCompleted++;
      this.metrics.totalExecutionTime += task.getExecutionTime();

      // 发出事件
      this.emit('taskCompleted', task);
    } catch (error) {
      // 任务失败
      task.fail(error);

      if (task.status === 'failed') {
        this.metrics.tasksFailed++;
      }

      // 发出事件
      this.emit('taskFailed', task);
    } finally {
      // 释放资源
      if (this.config.enableResourceManagement) {
        this.resourceManager.releaseResources(task.id);
      }

      // 从运行任务中移除
      this.runningTasks.delete(task.id);

      // 如果任务完成，添加到完成集合
      if (task.status === 'completed') {
        this.completedTasks.add(task.id);
      }

      // 如果任务需要重试，重新加入队列
      if (task.status === 'pending') {
        this.pendingQueue.push(task);
        this.sortPendingQueue();
      }

      // 尝试调度更多任务
      this.schedule();
    }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      pending: this.pendingQueue.length,
      running: this.runningTasks.size,
      completed: this.completedTasks.size,
      total: this.metrics.tasksSubmitted,
    };
  }

  /**
   * 获取运行中的任务
   */
  getRunningTasks() {
    return Array.from(this.runningTasks.values());
  }

  /**
   * 获取已完成的任务
   */
  getCompletedTaskIds() {
    return Array.from(this.completedTasks);
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    // 检查是否在运行队列中
    if (this.runningTasks.has(taskId)) {
      // 运行中的任务无法取消，只能标记为取消
      const task = this.runningTasks.get(taskId);
      task.status = 'cancelled';

      // 发出事件
      this.emit('taskCancelled', task);

      return true;
    }

    // 检查是否在待处理队列中
    const index = this.pendingQueue.findIndex(task => task.id === taskId);
    if (index !== -1) {
      const task = this.pendingQueue.splice(index, 1)[0];
      task.status = 'cancelled';

      // 发出事件
      this.emit('taskCancelled', task);

      return true;
    }

    return false;
  }

  /**
   * 清空队列
   */
  clearQueue() {
    // 取消所有待处理任务
    for (const task of this.pendingQueue) {
      task.status = 'cancelled';
      this.emit('taskCancelled', task);
    }

    this.pendingQueue = [];
  }

  /**
   * 启动指标收集
   */
  startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
      this.emit('metricsUpdated', this.metrics);
    }, this.config.metricsInterval);
  }

  /**
   * 停止指标收集
   */
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * 更新指标
   */
  updateMetrics() {
    // 计算平均执行时间
    if (this.metrics.tasksCompleted > 0) {
      this.metrics.averageExecutionTime =
        this.metrics.totalExecutionTime / this.metrics.tasksCompleted;
    }

    // 计算吞吐量（每秒完成的任务数）
    const now = Date.now();
    if (this.lastMetricsTime) {
      const timeDiff = (now - this.lastMetricsTime) / 1000; // 转换为秒
      const tasksDiff = this.metrics.tasksCompleted - this.lastTasksCompleted;
      this.metrics.throughput = tasksDiff / timeDiff;
    }

    this.lastMetricsTime = now;
    this.lastTasksCompleted = this.metrics.tasksCompleted;

    // 更新资源利用率
    this.metrics.resourceUtilization = this.resourceManager.getResourceUtilization();
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueStatus: this.getQueueStatus(),
    };
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics = {
      tasksSubmitted: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      throughput: 0,
      resourceUtilization: this.resourceManager.getResourceUtilization(),
    };

    this.lastMetricsTime = null;
    this.lastTasksCompleted = 0;
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 停止指标收集
    this.stopMetricsCollection();

    // 清空队列
    this.clearQueue();

    // 等待所有运行中的任务完成
    const tasks = Array.from(this.runningTasks.values());
    if (tasks.length > 0) {
      console.log(`Waiting for ${tasks.length} running tasks to complete...`);

      // 监听任务完成事件
      const checkCompletion = () => {
        if (this.runningTasks.size === 0) {
          console.log('All tasks completed');
          this.emit('cleanupCompleted');
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };

      setTimeout(checkCompletion, 1000);
    } else {
      this.emit('cleanupCompleted');
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    const command = args[0];
    const options = {};

    if (command === 'test') {
      // 解析选项
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--max-concurrency=')) {
          options.maxConcurrency = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--algorithm=')) {
          options.algorithm = arg.split('=')[1];
        } else if (arg.startsWith('--tasks=')) {
          options.taskCount = parseInt(arg.split('=')[1]);
        }
      }

      // 创建调度器
      const scheduler = new SmartScheduler(options);

      // 监听事件
      scheduler.on('taskStarted', task => {
        console.log(`Task started: ${task.id}`);
      });

      scheduler.on('taskCompleted', task => {
        console.log(`Task completed: ${task.id} (${task.getExecutionTime()}ms)`);
      });

      scheduler.on('taskFailed', task => {
        console.log(`Task failed: ${task.id} - ${task.error.message}`);
      });

      scheduler.on('metricsUpdated', metrics => {
        console.log(
          `Metrics: ${metrics.running} running, ${metrics.pending} pending, ${metrics.throughput.toFixed(2)} tasks/sec`,
        );
      });

      // 模拟任务
      const taskCount = options.taskCount || 10;
      const tasks = [];

      for (let i = 0; i < taskCount; i++) {
        const taskId = `task-${i}`;

        tasks.push({
          id: taskId,
          executor: async () => {
            // 模拟工作
            const delay = Math.random() * 2000 + 500; // 500-2500ms
            await new Promise(resolve => setTimeout(resolve, delay));
            return { result: `${taskId} completed` };
          },
          options: {
            priority: Math.floor(Math.random() * 10), // 0-9
            timeout: 5000,
          },
        });
      }

      // 提交任务
      console.log(`Submitting ${taskCount} tasks...`);
      scheduler.submitTasks(tasks);

      // 等待所有任务完成
      await new Promise(resolve => {
        scheduler.on('cleanupCompleted', resolve);

        // 10秒后自动清理
        setTimeout(() => scheduler.cleanup(), 10000);
      });

      // 显示最终指标
      const finalMetrics = scheduler.getMetrics();
      console.log('\nFinal metrics:');
      console.log(`  Tasks submitted: ${finalMetrics.tasksSubmitted}`);
      console.log(`  Tasks completed: ${finalMetrics.tasksCompleted}`);
      console.log(`  Tasks failed: ${finalMetrics.tasksFailed}`);
      console.log(`  Average execution time: ${finalMetrics.averageExecutionTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${finalMetrics.throughput.toFixed(2)} tasks/sec`);
      console.log(
        `  Resource utilization: CPU ${finalMetrics.resourceUtilization.cpu}, Memory ${finalMetrics.resourceUtilization.memory}`,
      );
    } else {
      console.log('用法:');
      console.log('  node smart-scheduler.js test [选项]');
      console.log('');
      console.log('选项:');
      console.log('  --max-concurrency=<数量>  设置最大并发数');
      console.log('  --algorithm=<算法>      设置调度算法 (priority, round-robin, load-balanced)');
      console.log('  --tasks=<数量>         设置测试任务数量');
    }
  } catch (error) {
    console.error('智能调度器错误:', error.message);
    process.exit(1);
  }
}

// 导出类供测试使用
module.exports = {
  SmartScheduler,
  Task,
  ResourceManager,
};

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
