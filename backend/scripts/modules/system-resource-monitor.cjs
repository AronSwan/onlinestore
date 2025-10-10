const os = require('os');

/**
 * 系统资源监控器
 */
class SystemResourceMonitor {
  constructor() {
    this.metrics = [];
    this.isMonitoring = false;
    this.monitorInterval = null;
  }

  startMonitoring(intervalMs = 1000) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  collectMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metric = {
      timestamp: Date.now(),
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      system: {
        loadAverage: os.loadavg(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem()
      }
    };
    
    this.metrics.push(metric);
    
    // 保持最近1000个指标
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }

  getStats() {
    if (this.metrics.length === 0) return null;
    
    const memoryValues = this.metrics.map(m => m.memory.heapUsed);
    const cpuValues = this.metrics.map(m => m.cpu.user + m.cpu.system);
    
    return {
      memory: {
        min: Math.min(...memoryValues),
        max: Math.max(...memoryValues),
        avg: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
        current: memoryValues[memoryValues.length - 1]
      },
      cpu: {
        min: Math.min(...cpuValues),
        max: Math.max(...cpuValues),
        avg: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
        current: cpuValues[cpuValues.length - 1]
      },
      sampleCount: this.metrics.length
    };
  }

  checkResourceLimits() {
    const stats = this.getStats();
    if (!stats) return { memoryOk: true, cpuOk: true };
    
    const memoryLimitBytes = 1024 * 1024 * 1024; // 1GB
    const memoryOk = stats.memory.current < memoryLimitBytes;
    const cpuOk = true; // CPU检查较复杂，暂时跳过
    
    return { memoryOk, cpuOk, stats };
  }
}

module.exports = SystemResourceMonitor;