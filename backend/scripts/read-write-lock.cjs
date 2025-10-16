#!/usr/bin/env node

/**
 * 读写锁实现 - 提供更细粒度的并发控制
 * 支持多个读者同时访问，但写者独占访问
 */

const EventEmitter = require('events');

// 读写锁状态
const LockState = {
  UNLOCKED: 'UNLOCKED',
  READ_LOCKED: 'READ_LOCKED',
  WRITE_LOCKED: 'WRITE_LOCKED'
};

class ReadWriteLock extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      writeTimeout: options.writeTimeout || 30000,
      readTimeout: options.readTimeout || 10000,
      maxReaders: options.maxReaders || 100,
      fairMode: options.fairMode !== false,
      ...options
    };
    
    this.state = LockState.UNLOCKED;
    this.readers = new Set();
    this.writer = null;
    this.waitingReaders = [];
    this.waitingWriters = [];
    
    // 统计信息
    this.stats = {
      totalReadLocks: 0,
      totalWriteLocks: 0,
      readLockTimeouts: 0,
      writeLockTimeouts: 0,
      avgReadWaitTime: 0,
      avgWriteWaitTime: 0,
      maxConcurrentReaders: 0
    };
    
    this.waitTimes = {
      read: [],
      write: []
    };
  }
  
  /**
   * 获取读锁
   */
  async acquireReadLock(timeout = this.options.readTimeout) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const request = {
        resolve,
        reject,
        timestamp: startTime,
        timeout: setTimeout(() => {
          this.removeFromWaitingReaders(request);
          this.stats.readLockTimeouts++;
          reject(new Error(`Read lock timeout after ${timeout}ms`));
        }, timeout)
      };
      
      if (this.tryAcquireReadLock(request)) {
        clearTimeout(request.timeout);
        const waitTime = Date.now() - startTime;
        this.recordReadWaitTime(waitTime);
        resolve(this.createReadLockReleaseFunction(request));
      } else {
        this.waitingReaders.push(request);
      }
    });
  }
  
  /**
   * 尝试获取读锁（非阻塞）
   */
  tryAcquireReadLock(request) {
    // 如果当前没有写锁，且读者数量未达到上限
    if (this.state !== LockState.WRITE_LOCKED && 
        this.readers.size < this.options.maxReaders) {
      
      if (this.state === LockState.UNLOCKED) {
        this.state = LockState.READ_LOCKED;
      }
      
      this.readers.add(request);
      this.stats.totalReadLocks++;
      
      // 更新最大并发读者数
      if (this.readers.size > this.stats.maxConcurrentReaders) {
        this.stats.maxConcurrentReaders = this.readers.size;
      }
      
      this.emit('read-lock-acquired', {
        readerCount: this.readers.size,
        waitingReaders: this.waitingReaders.length
      });
      
      return true;
    }
    
    return false;
  }
  
  /**
   * 获取写锁
   */
  async acquireWriteLock(timeout = this.options.writeTimeout) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const request = {
        resolve,
        reject,
        timestamp: startTime,
        timeout: setTimeout(() => {
          this.removeFromWaitingWriters(request);
          this.stats.writeLockTimeouts++;
          reject(new Error(`Write lock timeout after ${timeout}ms`));
        }, timeout)
      };
      
      if (this.tryAcquireWriteLock(request)) {
        clearTimeout(request.timeout);
        const waitTime = Date.now() - startTime;
        this.recordWriteWaitTime(waitTime);
        resolve(this.createWriteLockReleaseFunction(request));
      } else {
        this.waitingWriters.push(request);
      }
    });
  }
  
  /**
   * 尝试获取写锁（非阻塞）
   */
  tryAcquireWriteLock(request) {
    // 只有在没有任何锁的情况下才能获取写锁
    if (this.state === LockState.UNLOCKED) {
      this.state = LockState.WRITE_LOCKED;
      this.writer = request;
      this.stats.totalWriteLocks++;
      
      this.emit('write-lock-acquired', {
        waitingWriters: this.waitingWriters.length,
        waitingReaders: this.waitingReaders.length
      });
      
      return true;
    }
    
    return false;
  }
  
  /**
   * 释放读锁
   */
  releaseReadLock(request) {
    if (!this.readers.has(request)) {
      throw new Error('Read lock not held by this request');
    }
    
    this.readers.delete(request);
    
    if (this.readers.size === 0 && this.state === LockState.READ_LOCKED) {
      this.state = LockState.UNLOCKED;
      this.processWaitingLocks();
    }
    
    this.emit('read-lock-released', {
      readerCount: this.readers.size,
      state: this.state
    });
  }
  
  /**
   * 释放写锁
   */
  releaseWriteLock(request) {
    if (this.writer !== request) {
      throw new Error('Write lock not held by this request');
    }
    
    this.writer = null;
    this.state = LockState.UNLOCKED;
    this.processWaitingLocks();
    
    this.emit('write-lock-released', {
      waitingWriters: this.waitingWriters.length,
      waitingReaders: this.waitingReaders.length
    });
  }
  
  /**
   * 处理等待的锁请求
   */
  processWaitingLocks() {
    // 公平模式下，按照先来后到的顺序处理
    if (this.options.fairMode) {
      // 检查是否有等待的写者
      if (this.waitingWriters.length > 0) {
        const writer = this.waitingWriters.shift();
        if (this.tryAcquireWriteLock(writer)) {
          clearTimeout(writer.timeout);
          const waitTime = Date.now() - writer.timestamp;
          this.recordWriteWaitTime(waitTime);
          writer.resolve(this.createWriteLockReleaseFunction(writer));
        }
        return;
      }
      
      // 处理等待的读者
      while (this.waitingReaders.length > 0 && 
             this.readers.size < this.options.maxReaders) {
        const reader = this.waitingReaders.shift();
        if (this.tryAcquireReadLock(reader)) {
          clearTimeout(reader.timeout);
          const waitTime = Date.now() - reader.timestamp;
          this.recordReadWaitTime(waitTime);
          reader.resolve(this.createReadLockReleaseFunction(reader));
        } else {
          break;
        }
      }
    } else {
      // 非公平模式，优先处理写者
      if (this.waitingWriters.length > 0) {
        const writer = this.waitingWriters.shift();
        if (this.tryAcquireWriteLock(writer)) {
          clearTimeout(writer.timeout);
          const waitTime = Date.now() - writer.timestamp;
          this.recordWriteWaitTime(waitTime);
          writer.resolve(this.createWriteLockReleaseFunction(writer));
        }
      } else {
        // 处理等待的读者
        while (this.waitingReaders.length > 0 && 
               this.readers.size < this.options.maxReaders) {
          const reader = this.waitingReaders.shift();
          if (this.tryAcquireReadLock(reader)) {
            clearTimeout(reader.timeout);
            const waitTime = Date.now() - reader.timestamp;
            this.recordReadWaitTime(waitTime);
            reader.resolve(this.createReadLockReleaseFunction(reader));
          } else {
            break;
          }
        }
      }
    }
  }
  
  /**
   * 创建读锁释放函数
   */
  createReadLockReleaseFunction(request) {
    return () => {
      this.releaseReadLock(request);
    };
  }
  
  /**
   * 创建写锁释放函数
   */
  createWriteLockReleaseFunction(request) {
    return () => {
      this.releaseWriteLock(request);
    };
  }
  
  /**
   * 从等待读者列表中移除请求
   */
  removeFromWaitingReaders(request) {
    const index = this.waitingReaders.indexOf(request);
    if (index !== -1) {
      this.waitingReaders.splice(index, 1);
    }
  }
  
  /**
   * 从等待写者列表中移除请求
   */
  removeFromWaitingWriters(request) {
    const index = this.waitingWriters.indexOf(request);
    if (index !== -1) {
      this.waitingWriters.splice(index, 1);
    }
  }
  
  /**
   * 记录读锁等待时间
   */
  recordReadWaitTime(waitTime) {
    this.waitTimes.read.push(waitTime);
    if (this.waitTimes.read.length > 100) {
      this.waitTimes.read.shift();
    }
    this.updateAvgWaitTime();
  }
  
  /**
   * 记录写锁等待时间
   */
  recordWriteWaitTime(waitTime) {
    this.waitTimes.write.push(waitTime);
    if (this.waitTimes.write.length > 100) {
      this.waitTimes.write.shift();
    }
    this.updateAvgWaitTime();
  }
  
  /**
   * 更新平均等待时间
   */
  updateAvgWaitTime() {
    if (this.waitTimes.read.length > 0) {
      this.stats.avgReadWaitTime = 
        this.waitTimes.read.reduce((sum, time) => sum + time, 0) / this.waitTimes.read.length;
    }
    
    if (this.waitTimes.write.length > 0) {
      this.stats.avgWriteWaitTime = 
        this.waitTimes.write.reduce((sum, time) => sum + time, 0) / this.waitTimes.write.length;
    }
  }
  
  /**
   * 获取锁状态
   */
  getState() {
    return {
      state: this.state,
      readerCount: this.readers.size,
      hasWriter: this.writer !== null,
      waitingReaders: this.waitingReaders.length,
      waitingWriters: this.waitingWriters.length,
      stats: { ...this.stats }
    };
  }
  
  /**
   * 强制释放所有锁（紧急情况使用）
   */
  forceRelease() {
    // 清理所有超时定时器
    [...this.waitingReaders, ...this.waitingWriters].forEach(request => {
      clearTimeout(request.timeout);
      request.reject(new Error('Lock force released'));
    });
    
    this.readers.clear();
    this.writer = null;
    this.waitingReaders = [];
    this.waitingWriters = [];
    this.state = LockState.UNLOCKED;
    
    this.emit('force-released');
  }
  
  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalReadLocks: 0,
      totalWriteLocks: 0,
      readLockTimeouts: 0,
      writeLockTimeouts: 0,
      avgReadWaitTime: 0,
      avgWriteWaitTime: 0,
      maxConcurrentReaders: 0
    };
    this.waitTimes.read = [];
    this.waitTimes.write = [];
    
    this.emit('stats-reset');
  }
}

module.exports = {
  ReadWriteLock,
  LockState
};