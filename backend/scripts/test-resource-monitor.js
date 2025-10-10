#!/usr/bin/env node

/**
 * 测试资源监控模块
 * 用于监控测试过程中的系统资源使用情况
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

class ResourceMonitor {
  constructor(options = {}) {
    this.options = {
      interval: options.interval || 10000, // 监控间隔（毫秒）- 增加间隔减少负载
      maxMemoryUsage: options.maxMemoryUsage || 0.85, // 最大内存使用率 - 降低阈值
      maxCpuUsage: options.maxCpuUsage || 0.75, // 最大CPU使用率 - 降低阈值
      logFile: options.logFile || path.resolve(__dirname, 'resource-monitor.log'),
      ...options
    };
    
    this.monitoring = false;
    this.intervalId = null;
    this.startTime = null;
    this.metrics = {
      memory: [],
      cpu: [],
      load: []
    };
    
    this.setupSignalHandlers();
  }
  
  // 设置信号处理器
  setupSignalHandlers() {
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      this.stop();
      process.exit(0);
    });
  }
  
  // 获取当前系统资源使用情况
  getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = usedMem / totalMem;
    
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const loadRatio = loadAvg[0] / cpuCount;
    
    // 获取进程内存使用
    const processMemory = process.memoryUsage();
    const processMemoryMB = {
      rss: Math.round(processMemory.rss / 1024 / 1024),
      heapTotal: Math.round(processMemory.heapTotal / 1024 / 1024),
      heapUsed: Math.round(processMemory.heapUsed / 1024 / 1024),
      external: Math.round(processMemory.external / 1024 / 1024)
    };
    
    return {
      timestamp: Date.now(),
      memory: {
        total: Math.round(totalMem / 1024 / 1024),
        used: Math.round(usedMem / 1024 / 1024),
        free: Math.round(freeMem / 1024 / 1024),
        usage: memoryUsage
      },
      cpu: {
        count: cpuCount,
        load: loadAvg,
        loadRatio: loadRatio
      },
      process: processMemoryMB,
      uptime: os.uptime()
    };
  }
  
  // 检查资源是否超限
  checkResourceLimits(metrics) {
    const warnings = [];
    
    if (metrics.memory.usage > this.options.maxMemoryUsage) {
      warnings.push(`内存使用率过高: ${(metrics.memory.usage * 100).toFixed(1)}%`);
    }
    
    if (metrics.cpu.loadRatio > this.options.maxCpuUsage) {
      warnings.push(`CPU负载过高: ${(metrics.cpu.loadRatio * 100).toFixed(1)}%`);
    }
    
    if (metrics.process.heapUsed > 500) { // 500MB限制
      warnings.push(`进程堆内存使用过高: ${metrics.process.heapUsed}MB`);
    }
    
    return warnings;
  }
  
  // 记录指标
  logMetrics(metrics, warnings = []) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      metrics: metrics,
      warnings: warnings
    };
    
    this.metrics.memory.push(metrics.memory.usage);
    this.metrics.cpu.push(metrics.cpu.loadRatio);
    this.metrics.load.push(metrics.cpu.load[0]);
    
    // 写入日志文件
    try {
      fs.appendFileSync(this.options.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.warn('无法写入资源监控日志:', error.message);
    }
    
    return logEntry;
  }
  
  // 开始监控
  start() {
    if (this.monitoring) {
      console.warn('资源监控已经在运行中');
      return;
    }
    
    this.monitoring = true;
    this.startTime = Date.now();
    
    console.log(`🔍 开始资源监控 (间隔: ${this.options.interval}ms)`);
    
    this.intervalId = setInterval(() => {
      try {
        const metrics = this.getSystemMetrics();
        const warnings = this.checkResourceLimits(metrics);
        const logEntry = this.logMetrics(metrics, warnings);
        
        if (warnings.length > 0) {
          console.warn('⚠️ 资源警告:', warnings.join(', '));
        }
        
      } catch (error) {
        console.error('资源监控错误:', error.message);
      }
    }, this.options.interval);
    
    // 初始记录
    const initialMetrics = this.getSystemMetrics();
    this.logMetrics(initialMetrics);
  }
  
  // 停止监控
  stop() {
    if (!this.monitoring) {
      return;
    }
    
    this.monitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    const duration = Date.now() - this.startTime;
    console.log(`🔍 资源监控已停止 (运行时长: ${(duration / 1000).toFixed(1)}秒)`);
    
    // 生成总结报告
    this.generateSummaryReport(duration);
  }
  
  // 生成总结报告
  generateSummaryReport(duration) {
    const summary = {
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: duration,
      metrics: {
        memory: {
          avg: this.calculateAverage(this.metrics.memory),
          max: Math.max(...this.metrics.memory),
          min: Math.min(...this.metrics.memory)
        },
        cpu: {
          avg: this.calculateAverage(this.metrics.cpu),
          max: Math.max(...this.metrics.cpu),
          min: Math.min(...this.metrics.cpu)
        },
        load: {
          avg: this.calculateAverage(this.metrics.load),
          max: Math.max(...this.metrics.load),
          min: Math.min(...this.metrics.load)
        }
      }
    };
    
    const summaryPath = path.resolve(__dirname, 'resource-monitor-summary.json');
    
    try {
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`📊 资源监控总结报告已保存: ${summaryPath}`);
    } catch (error) {
      console.warn('无法保存资源监控总结报告:', error.message);
    }
    
    return summary;
  }
  
  // 计算平均值
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  
  // 获取统计信息
  getStats() {
    if (this.metrics.memory.length === 0) {
      return null;
    }
    
    return {
      memoryUsage: {
        average: this.calculateAverage(this.metrics.memory),
        maximum: Math.max(...this.metrics.memory),
        minimum: Math.min(...this.metrics.memory)
      },
      cpuLoad: {
        average: this.calculateAverage(this.metrics.cpu),
        maximum: Math.max(...this.metrics.cpu),
        minimum: Math.min(...this.metrics.cpu)
      },
      systemLoad: {
        average: this.calculateAverage(this.metrics.load),
        maximum: Math.max(...this.metrics.load),
        minimum: Math.min(...this.metrics.load)
      }
    };
  }
}

// 导出单例实例
let instance = null;

function createResourceMonitor(options) {
  if (!instance) {
    instance = new ResourceMonitor(options);
  }
  return instance;
}

// 命令行使用
if (require.main === module) {
  const monitor = createResourceMonitor({
    interval: 2000,
    maxMemoryUsage: 0.85,
    maxCpuUsage: 0.75
  });
  
  monitor.start();
  
  // 运行10分钟后自动停止
  setTimeout(() => {
    monitor.stop();
    process.exit(0);
  }, 10 * 60 * 1000);
}

module.exports = {
  ResourceMonitor,
  createResourceMonitor
};