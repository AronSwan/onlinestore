#!/usr/bin/env node

/**
 * 内存监控器 - 用于监控和管理内存使用
 * 实现内存泄漏检测和自动清理机制
 */

const EventEmitter = require('events');
const os = require('os');

class MemoryMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxMemoryMB: options.maxMemoryMB || 512,
      cleanupThresholdMB: options.cleanupThresholdMB || 400,
      monitorInterval: options.monitorInterval || 5000,
      gcThresholdMB: options.gcThresholdMB || 300,
      alertThresholdMB: options.alertThresholdMB || 450,
      enableAutoCleanup: options.enableAutoCleanup !== false,
      enableGCTrigger: options.enableGCTrigger !== false,
      ...options
    };
    
    this.isMonitoring = false;
    this.monitorTimer = null;
    this.memoryHistory = [];
    this.maxHistorySize = 100;
    this.cleanupCallbacks = new Set();
    this.gcCallbacks = new Set();
    
    // 内存统计
    this.stats = {
      totalAllocations: 0,
      totalDeallocations: 0,
      peakMemoryUsage: 0,
      gcCount: 0,
      cleanupCount: 0,
      alertCount: 0
    };
    
    this.setupProcessHandlers();
  }
  
  /**
   * 开始内存监控
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return false;
    }
    
    this.isMonitoring = true;
    this.monitorTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.options.monitorInterval);
    
    this.emit('monitoring-started');
    return true;
  }
  
  /**
   * 停止内存监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return false;
    }
    
    this.isMonitoring = false;
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    
    this.emit('monitoring-stopped');
    return true;
  }
  
  /**
   * 检查内存使用情况
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const systemMem = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };
    
    const currentMemMB = memUsage.heapUsed / 1024 / 1024;
    const totalMemMB = memUsage.heapTotal / 1024 / 1024;
    const rssMemMB = memUsage.rss / 1024 / 1024;
    
    // 更新统计信息
    if (currentMemMB > this.stats.peakMemoryUsage) {
      this.stats.peakMemoryUsage = currentMemMB;
    }
    
    // 记录内存历史
    const memorySnapshot = {
      timestamp: Date.now(),
      heapUsed: currentMemMB,
      heapTotal: totalMemMB,
      rss: rssMemMB,
      external: memUsage.external / 1024 / 1024,
      arrayBuffers: memUsage.arrayBuffers / 1024 / 1024,
      systemMemory: {
        totalGB: systemMem.total / 1024 / 1024 / 1024,
        freeGB: systemMem.free / 1024 / 1024 / 1024,
        usedPercent: ((systemMem.used / systemMem.total) * 100)
      }
    };
    
    this.addMemorySnapshot(memorySnapshot);
    
    // 触发相应的处理逻辑
    this.handleMemoryThresholds(memorySnapshot);
    
    this.emit('memory-check', memorySnapshot);
  }
  
  /**
   * 添加内存快照到历史记录
   */
  addMemorySnapshot(snapshot) {
    // 防御性编程：确保 memoryHistory 存在且是数组
    if (!this.memoryHistory || !Array.isArray(this.memoryHistory)) {
      this.memoryHistory = [];
    }
    
    this.memoryHistory.push(snapshot);
    
    // 保持历史记录大小限制
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
  }
  
  /**
   * 处理内存阈值检查
   */
  handleMemoryThresholds(snapshot) {
    const currentMemMB = snapshot.heapUsed;
    
    // 检查是否需要触发GC
    if (this.options.enableGCTrigger && 
        currentMemMB >= this.options.gcThresholdMB && 
        global.gc) {
      this.triggerGarbageCollection();
    }
    
    // 检查是否需要清理
    if (this.options.enableAutoCleanup && 
        currentMemMB >= this.options.cleanupThresholdMB) {
      this.triggerCleanup();
    }
    
    // 检查是否需要发出警告
    if (currentMemMB >= this.options.alertThresholdMB) {
      this.triggerAlert(snapshot);
    }
    
    // 检查是否超过最大限制
    if (currentMemMB >= this.options.maxMemoryMB) {
      this.triggerEmergencyCleanup(snapshot);
    }
  }
  
  /**
   * 触发垃圾回收
   */
  triggerGarbageCollection() {
    try {
      if (global.gc) {
        const beforeGC = process.memoryUsage().heapUsed;
        global.gc();
        const afterGC = process.memoryUsage().heapUsed;
        
        this.stats.gcCount++;
        
        const freedMB = (beforeGC - afterGC) / 1024 / 1024;
        
        this.emit('gc-triggered', {
          freedMemoryMB: freedMB,
          beforeMB: beforeGC / 1024 / 1024,
          afterMB: afterGC / 1024 / 1024
        });
        
        // 执行GC回调
        for (const callback of this.gcCallbacks) {
          try {
            callback(freedMB);
          } catch (error) {
            this.emit('error', new Error(`GC callback error: ${error.message}`));
          }
        }
      }
    } catch (error) {
      this.emit('error', new Error(`GC trigger failed: ${error.message}`));
    }
  }
  
  /**
   * 触发清理操作
   */
  async triggerCleanup() {
    try {
      this.stats.cleanupCount++;
      
      const cleanupPromises = [];
      
      // 执行所有注册的清理回调
      for (const callback of this.cleanupCallbacks) {
        try {
          const result = callback();
          if (result && typeof result.then === 'function') {
            cleanupPromises.push(result);
          }
        } catch (error) {
          this.emit('error', new Error(`Cleanup callback error: ${error.message}`));
        }
      }
      
      // 等待所有异步清理完成
      if (cleanupPromises.length > 0) {
        await Promise.allSettled(cleanupPromises);
      }
      
      // 清理内存历史记录（保留最近的一半）
      if (this.memoryHistory.length > this.maxHistorySize / 2) {
        this.memoryHistory = this.memoryHistory.slice(-Math.floor(this.maxHistorySize / 2));
      }
      
      this.emit('cleanup-triggered');
      
    } catch (error) {
      this.emit('error', new Error(`Cleanup trigger failed: ${error.message}`));
    }
  }
  
  /**
   * 触发内存警告
   */
  triggerAlert(snapshot) {
    this.stats.alertCount++;
    
    const alertData = {
      currentMemoryMB: snapshot.heapUsed,
      thresholdMB: this.options.alertThresholdMB,
      maxMemoryMB: this.options.maxMemoryMB,
      systemMemory: snapshot.systemMemory,
      memoryTrend: this.analyzeMemoryTrend()
    };
    
    this.emit('memory-alert', alertData);
  }
  
  /**
   * 触发紧急清理
   */
  async triggerEmergencyCleanup(snapshot) {
    try {
      // 先触发常规清理
      await this.triggerCleanup();
      
      // 强制GC
      if (global.gc) {
        global.gc();
        global.gc(); // 执行两次确保彻底清理
      }
      
      // 清空大部分历史记录
      this.memoryHistory = this.memoryHistory.slice(-10);
      
      this.emit('emergency-cleanup', {
        triggeredAt: snapshot.timestamp,
        memoryMB: snapshot.heapUsed,
        maxMemoryMB: this.options.maxMemoryMB
      });
      
    } catch (error) {
      this.emit('error', new Error(`Emergency cleanup failed: ${error.message}`));
    }
  }
  
  /**
   * 分析内存使用趋势
   */
  analyzeMemoryTrend() {
    // 防御性编程：确保 memoryHistory 存在且是数组，并且有足够的数据
    if (!this.memoryHistory || !Array.isArray(this.memoryHistory) || this.memoryHistory.length < 2) {
      return { trend: 'insufficient-data', slope: 0, timeSpanSeconds: 0 };
    }
    
    const recentHistory = this.memoryHistory.slice(-10);
    
    // 确保所有快照都有必要的数据
    const validHistory = recentHistory.filter(snapshot =>
      snapshot &&
      typeof snapshot.timestamp === 'number' &&
      typeof snapshot.heapUsed === 'number'
    );
    
    if (validHistory.length < 2) {
      return { trend: 'insufficient-data', slope: 0, timeSpanSeconds: 0 };
    }
    
    const timeSpan = validHistory[validHistory.length - 1].timestamp - validHistory[0].timestamp;
    const memoryChange = validHistory[validHistory.length - 1].heapUsed - validHistory[0].heapUsed;
    
    const slope = timeSpan > 0 ? memoryChange / (timeSpan / 1000) : 0; // MB per second
    
    let trend = 'stable';
    if (slope > 1) {
      trend = 'increasing';
    } else if (slope < -1) {
      trend = 'decreasing';
    }
    
    return { trend, slope, timeSpanSeconds: timeSpan / 1000 };
  }
  
  /**
   * 注册清理回调
   */
  registerCleanupCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Cleanup callback must be a function');
    }
    
    this.cleanupCallbacks.add(callback);
    return () => this.cleanupCallbacks.delete(callback);
  }
  
  /**
   * 注册GC回调
   */
  registerGCCallback(callback) {
    if (typeof callback !== 'function') {
      throw new Error('GC callback must be a function');
    }
    
    this.gcCallbacks.add(callback);
    return () => this.gcCallbacks.delete(callback);
  }
  
  /**
   * 获取内存统计信息
   */
  getMemoryStats() {
    const current = process.memoryUsage();
    const trend = this.analyzeMemoryTrend();
    
    return {
      current: {
        heapUsedMB: current.heapUsed / 1024 / 1024,
        heapTotalMB: current.heapTotal / 1024 / 1024,
        rssMB: current.rss / 1024 / 1024,
        externalMB: current.external / 1024 / 1024
      },
      stats: { ...this.stats },
      trend,
      historySize: this.memoryHistory.length,
      isMonitoring: this.isMonitoring,
      thresholds: {
        gcThresholdMB: this.options.gcThresholdMB,
        cleanupThresholdMB: this.options.cleanupThresholdMB,
        alertThresholdMB: this.options.alertThresholdMB,
        maxMemoryMB: this.options.maxMemoryMB
      }
    };
  }
  
  /**
   * 获取内存历史记录
   */
  getMemoryHistory(limit = 50) {
    // 防御性编程：确保 memoryHistory 存在且是数组
    if (!this.memoryHistory || !Array.isArray(this.memoryHistory)) {
      return [];
    }
    return this.memoryHistory.slice(-limit);
  }
  
  /**
   * 设置进程处理器
   */
  setupProcessHandlers() {
    // 进程退出时停止监控
    process.on('exit', () => {
      this.stopMonitoring();
    });
    
    // 处理未捕获的异常 - 添加防御性编程
    process.on('uncaughtException', (error) => {
      // 安全地获取错误信息，避免在错误处理过程中再次出错
      let errorMessage = 'Unknown error';
      let errorStack = 'No stack trace';
      
      try {
        errorMessage = error && error.message ? String(error.message) : 'Unknown error';
        errorStack = error && error.stack ? String(error.stack) : 'No stack trace';
      } catch (safeError) {
        // 即使在获取错误信息时出错，也要确保不会抛出异常
        errorMessage = 'Error occurred while processing error message';
        errorStack = 'Cannot retrieve stack trace';
      }
      
      // 确保 this.emit 存在，避免在销毁后调用
      if (this && this.emit && typeof this.emit === 'function') {
        try {
          this.emit('error', new Error(`Uncaught exception in memory monitor: ${errorMessage}`));
        } catch (emitError) {
          // 如果 emit 失败，直接输出到控制台
          console.error('❌ 内存监控器未捕获异常 (emit failed):', errorMessage);
          console.error('❌ 错误堆栈:', errorStack);
        }
      } else {
        // 如果内存监控器实例已经不可用，直接输出错误
        console.error('❌ 内存监控器未捕获异常:', errorMessage);
        console.error('❌ 错误堆栈:', errorStack);
      }
    });
  }
  
  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalAllocations: 0,
      totalDeallocations: 0,
      peakMemoryUsage: 0,
      gcCount: 0,
      cleanupCount: 0,
      alertCount: 0
    };
    
    this.memoryHistory = [];
    this.emit('stats-reset');
  }
  
  /**
   * 销毁监控器
   */
  destroy() {
    this.stopMonitoring();
    this.cleanupCallbacks.clear();
    this.gcCallbacks.clear();
    this.memoryHistory = [];
    this.removeAllListeners();
  }
}

module.exports = MemoryMonitor;