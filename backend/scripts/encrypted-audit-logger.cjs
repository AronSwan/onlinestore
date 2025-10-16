#!/usr/bin/env node

/**
 * 加密审计日志系统 - 提供安全的审计日志存储
 * 实现日志加密、完整性验证和安全管理
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const EventEmitter = require('events');

// 加密配置
const EncryptionConfig = {
  algorithm: 'aes-256-cbc',
  keyDerivation: {
    algorithm: 'pbkdf2',
    digest: 'sha256',
    iterations: 10000,
    keyLength: 32,
    saltLength: 16
  },
  integrity: {
    algorithm: 'sha256',
    hmacKeyLength: 32
  },
  compression: {
    level: 6,
    threshold: 1024
  },
  rotation: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    checkInterval: 60000 // 1分钟
  }
};

class EncryptedAuditLogger extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      ...EncryptionConfig,
      ...options,
      logDir: options.logDir || path.join(process.cwd(), '.audit-logs'),
      encryptionKey: options.encryptionKey || this.generateEncryptionKey(),
      enableCompression: options.enableCompression !== false,
      enableIntegrityCheck: options.enableIntegrityCheck !== false,
      ...options.rotation
    };
    
    this.currentLogFile = null;
    this.currentLogSize = 0;
    this.logFiles = [];
    this.writeBuffer = [];
    this.isWriting = false;
    this.rotationTimer = null;
    
    // 生成完整性检查密钥
    this.hmacKey = this.deriveHmacKey();
    
    // 初始化日志目录
    this.initializeLogDirectory();
    
    // 启动日志轮转检查
    this.startRotationCheck();
    
    // 统计信息
    this.stats = {
      totalLogs: 0,
      encryptedLogs: 0,
      compressedLogs: 0,
      rotatedFiles: 0,
      integrityChecks: 0,
      integrityFailures: 0
    };
  }
  
  /**
   * 初始化日志目录
   */
  initializeLogDirectory() {
    try {
      if (!fs.existsSync(this.options.logDir)) {
        fs.mkdirSync(this.options.logDir, { recursive: true, mode: 0o700 });
      }
      
      // 扫描现有日志文件
      this.scanExistingLogFiles();
      
      // 创建新的日志文件
      this.createNewLogFile();
      
    } catch (error) {
      throw new Error(`Failed to initialize log directory: ${error.message}`);
    }
  }
  
  /**
   * 扫描现有日志文件
   */
  scanExistingLogFiles() {
    try {
      const files = fs.readdirSync(this.options.logDir)
        .filter(file => file.endsWith('.audit'))
        .sort()
        .map(file => ({
          name: file,
          path: path.join(this.options.logDir, file),
          size: fs.statSync(path.join(this.options.logDir, file)).size,
          created: fs.statSync(path.join(this.options.logDir, file)).birthtime
        }));
      
      this.logFiles = files;
      
      // 限制日志文件数量
      if (this.logFiles.length > this.options.maxFiles) {
        const excessFiles = this.logFiles.splice(0, this.logFiles.length - this.options.maxFiles);
        excessFiles.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (error) {
            this.emit('error', new Error(`Failed to delete old log file ${file.name}: ${error.message}`));
          }
        });
      }
      
    } catch (error) {
      this.emit('error', new Error(`Failed to scan existing log files: ${error.message}`));
    }
  }
  
  /**
   * 创建新的日志文件
   */
  createNewLogFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `audit-${timestamp}-${process.pid}.audit`;
    this.currentLogFile = path.join(this.options.logDir, fileName);
    this.currentLogSize = 0;
    
    // 写入文件头
    const header = this.createFileHeader();
    fs.writeFileSync(this.currentLogFile, header, 'utf8');
    this.currentLogSize = Buffer.byteLength(header, 'utf8');
    
    this.logFiles.push({
      name: fileName,
      path: this.currentLogFile,
      size: this.currentLogSize,
      created: new Date()
    });
    
    this.emit('log-file-created', { fileName: this.currentLogFile });
  }
  
  /**
   * 创建文件头
   */
  createFileHeader() {
    const header = {
      version: '1.0',
      created: new Date().toISOString(),
      pid: process.pid,
      hostname: require('os').hostname(),
      encryption: {
        algorithm: this.options.algorithm,
        keyDerivation: this.options.keyDerivation.algorithm
      },
      compression: {
        enabled: this.options.enableCompression,
        level: this.options.compression.level
      },
      integrity: {
        enabled: this.options.enableIntegrityCheck,
        algorithm: this.options.integrity.algorithm
      }
    };
    
    return JSON.stringify(header) + '\n';
  }
  
  /**
   * 生成加密密钥
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32);
  }
  
  /**
   * 推导HMAC密钥
   */
  deriveHmacKey() {
    return crypto.pbkdf2Sync(
      this.options.encryptionKey,
      'audit-hmac-key',
      this.options.keyDerivation.iterations,
      this.options.integrity.hmacKeyLength,
      this.options.keyDerivation.digest || 'sha256'
    );
  }
  
  /**
   * 记录审计日志
   */
  async logAuditEvent(event) {
    try {
      // 标准化事件对象
      const auditEvent = this.standardizeEvent(event);
      
      // 序列化事件
      const serializedEvent = JSON.stringify(auditEvent);
      
      // 压缩（如果需要）
      let eventData = serializedEvent;
      let isCompressed = false;
      
      if (this.options.enableCompression && 
          Buffer.byteLength(serializedEvent, 'utf8') > this.options.compression.threshold) {
        try {
          eventData = zlib.gzipSync(serializedEvent, { level: this.options.compression.level });
          isCompressed = true;
          this.stats.compressedLogs++;
        } catch (compressionError) {
          // 压缩失败，使用原始数据
          this.emit('warning', `Compression failed: ${compressionError.message}`);
        }
      }
      
      // 加密数据
      const encryptedData = this.encryptData(eventData);
      
      // 创建日志条目
      const logEntry = {
        timestamp: auditEvent.timestamp,
        encrypted: true,
        compressed: isCompressed,
        data: encryptedData,
        integrity: this.options.enableIntegrityCheck ? this.calculateIntegrity(encryptedData) : null
      };
      
      // 写入日志
      await this.writeLogEntry(logEntry);
      
      this.stats.totalLogs++;
      this.stats.encryptedLogs++;
      
      this.emit('audit-log', { event: auditEvent, encrypted: true });
      
    } catch (error) {
      this.emit('error', new Error(`Failed to log audit event: ${error.message}`));
      throw error;
    }
  }
  
  /**
   * 标准化事件对象
   */
  standardizeEvent(event) {
    const now = new Date().toISOString();
    
    return {
      timestamp: event.timestamp || now,
      level: event.level || 'INFO',
      category: event.category || 'GENERAL',
      action: event.action || 'UNKNOWN',
      userId: event.userId || null,
      sessionId: event.sessionId || null,
      source: event.source || 'test-runner',
      details: event.details || {},
      metadata: {
        pid: process.pid,
        hostname: require('os').hostname(),
        platform: process.platform,
        nodeVersion: process.version,
        ...event.metadata
      }
    };
  }
  
  /**
   * 加密数据
   */
  encryptData(data) {
    try {
      // 生成随机盐值
      const salt = crypto.randomBytes(this.options.keyDerivation.saltLength);
      
      // 生成随机IV
      const iv = crypto.randomBytes(16);
      
      // 推导加密密钥
      const key = crypto.pbkdf2Sync(
        this.options.encryptionKey,
        salt,
        this.options.keyDerivation.iterations,
        32,
        this.options.keyDerivation.digest || 'sha256'
      );
      
      // 创建加密器 - 使用 GCM 模式以获得更好的安全性
      const cipher = crypto.createCipheriv(this.options.algorithm.replace('cbc', 'gcm'), key, iv);
      
      // 设置附加认证数据（AAD）
      const aad = Buffer.from(JSON.stringify({
        timestamp: Date.now(),
        algorithm: this.options.algorithm,
        keyDerivation: this.options.keyDerivation.algorithm
      }));
      cipher.setAAD(aad);
      
      // 加密数据
      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // 获取认证标签
      const authTag = cipher.getAuthTag();
      
      // 组合加密结果
      const encryptedData = {
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        aad: aad.toString('base64'),
        data: encrypted.toString('base64'),
        iterations: this.options.keyDerivation.iterations,
        algorithm: this.options.algorithm.replace('cbc', 'gcm')
      };
      
      return encryptedData;
    } catch (error) {
      // 如果GCM模式失败，回退到CBC模式
      this.emit('warning', `GCM encryption failed, falling back to CBC: ${error.message}`);
      return this.encryptDataCBC(data);
    }
  }
  
  /**
   * 使用CBC模式加密数据（回退方法）
   */
  encryptDataCBC(data) {
    // 生成随机盐值
    const salt = crypto.randomBytes(this.options.keyDerivation.saltLength);
    
    // 生成随机IV
    const iv = crypto.randomBytes(16);
    
    // 推导加密密钥
    const key = crypto.pbkdf2Sync(
      this.options.encryptionKey,
      salt,
      this.options.keyDerivation.iterations,
      32,
      this.options.keyDerivation.digest || 'sha256'
    );
    
    // 创建加密器
    const cipher = crypto.createCipheriv(this.options.algorithm, key, iv);
    
    // 加密数据
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // 组合加密结果
    const encryptedData = {
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      data: encrypted.toString('base64'),
      iterations: this.options.keyDerivation.iterations,
      algorithm: this.options.algorithm
    };
    
    return encryptedData;
  }
  
  /**
   * 解密数据
   */
  decryptData(encryptedDataBuffer) {
    try {
      let encryptedData;
      if (Buffer.isBuffer(encryptedDataBuffer)) {
        encryptedData = JSON.parse(encryptedDataBuffer.toString('utf8'));
      } else if (typeof encryptedDataBuffer === 'string') {
        encryptedData = JSON.parse(encryptedDataBuffer);
      } else if (encryptedDataBuffer && typeof encryptedDataBuffer === 'object') {
        encryptedData = encryptedDataBuffer;
      } else {
        throw new Error('Invalid encrypted data format');
      }
      
      // 根据算法选择解密方法
      if (encryptedData.algorithm && encryptedData.algorithm.includes('gcm')) {
        return this.decryptDataGCM(encryptedData);
      } else {
        return this.decryptDataCBC(encryptedData);
      }
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
  
  /**
   * 使用GCM模式解密数据
   */
  decryptDataGCM(encryptedData) {
    try {
      // 重新推导密钥
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const key = crypto.pbkdf2Sync(
        this.options.encryptionKey,
        salt,
        encryptedData.iterations,
        32,
        this.options.keyDerivation.digest || 'sha256'
      );
      
      // 解密数据
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const encrypted = Buffer.from(encryptedData.data, 'base64');
      
      // 创建解密器
      const decipher = crypto.createDecipheriv(encryptedData.algorithm, key, iv);
      
      // 设置认证标签
      if (encryptedData.authTag) {
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
      }
      
      // 设置附加认证数据（AAD）
      if (encryptedData.aad) {
        decipher.setAAD(Buffer.from(encryptedData.aad, 'base64'));
      }
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted;
    } catch (error) {
      throw new Error(`GCM decryption failed: ${error.message}`);
    }
  }
  
  /**
   * 使用CBC模式解密数据（回退方法）
   */
  decryptDataCBC(encryptedData) {
    try {
      // 重新推导密钥
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const key = crypto.pbkdf2Sync(
        this.options.encryptionKey,
        salt,
        encryptedData.iterations,
        32,
        this.options.keyDerivation.digest || 'sha256'
      );
      
      // 解密数据
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const encrypted = Buffer.from(encryptedData.data, 'base64');
      
      // 创建解密器
      const algorithm = encryptedData.algorithm || this.options.algorithm;
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      
      // CBC 模式不使用认证标签
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted;
    } catch (error) {
      throw new Error(`CBC decryption failed: ${error.message}`);
    }
  }
  
  /**
   * 计算完整性校验值
   */
  calculateIntegrity(data) {
    const hmac = crypto.createHmac(this.options.integrity.algorithm, this.hmacKey);
    const payload = Buffer.isBuffer(data)
      ? data
      : Buffer.from(typeof data === 'string' ? data : JSON.stringify(data), 'utf8');
    hmac.update(payload);
    return hmac.digest('hex');
  }
  
  /**
   * 验证完整性
   */
  verifyIntegrity(data, expectedIntegrity) {
    if (!this.options.enableIntegrityCheck || !expectedIntegrity) {
      return true;
    }
    
    const actualIntegrity = this.calculateIntegrity(data);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(actualIntegrity, 'hex'),
      Buffer.from(expectedIntegrity, 'hex')
    );
    
    this.stats.integrityChecks++;
    
    if (!isValid) {
      this.stats.integrityFailures++;
      this.emit('integrity-failure', { expected: expectedIntegrity, actual: actualIntegrity });
    }
    
    return isValid;
  }
  
  /**
   * 写入日志条目
   */
  async writeLogEntry(logEntry) {
    return new Promise((resolve, reject) => {
      this.writeBuffer.push({ logEntry, resolve, reject });
      
      if (!this.isWriting) {
        this.processWriteBuffer();
      }
    });
  }
  
  /**
   * 处理写入缓冲区
   */
  async processWriteBuffer() {
    if (this.isWriting || this.writeBuffer.length === 0) {
      return;
    }
    
    this.isWriting = true;
    
    try {
      const { logEntry, resolve, reject } = this.writeBuffer.shift();
      
      // 序列化日志条目
      const serializedEntry = JSON.stringify(logEntry) + '\n';
      const entryBuffer = Buffer.from(serializedEntry, 'utf8');
      
      // 检查是否需要轮转
      if (this.currentLogSize + entryBuffer.length > this.options.maxFileSize) {
        await this.rotateLogFile();
      }
      
      // 写入文件
      fs.appendFileSync(this.currentLogFile, entryBuffer);
      this.currentLogSize += entryBuffer.length;
      
      // 更新文件大小信息
      const fileInfo = this.logFiles.find(f => f.path === this.currentLogFile);
      if (fileInfo) {
        fileInfo.size = this.currentLogSize;
      }
      
      resolve();
      
    } catch (error) {
      reject(error);
    } finally {
      this.isWriting = false;
      
      // 继续处理缓冲区
      if (this.writeBuffer.length > 0) {
        setImmediate(() => this.processWriteBuffer());
      }
    }
  }
  
  /**
   * 轮转日志文件
   */
  async rotateLogFile() {
    try {
      this.emit('log-rotation', { oldFile: this.currentLogFile });
      
      // 创建新文件
      this.createNewLogFile();
      
      // 清理旧文件
      await this.cleanupOldLogFiles();
      
      this.stats.rotatedFiles++;
      
    } catch (error) {
      this.emit('error', new Error(`Log rotation failed: ${error.message}`));
    }
  }
  
  /**
   * 清理旧日志文件
   */
  async cleanupOldLogFiles() {
    if (this.logFiles.length <= this.options.maxFiles) {
      return;
    }
    
    // 按创建时间排序
    this.logFiles.sort((a, b) => b.created - a.created);
    
    // 删除超出限制的文件
    const excessFiles = this.logFiles.splice(this.options.maxFiles);
    
    for (const file of excessFiles) {
      try {
        fs.unlinkSync(file.path);
        this.emit('log-file-deleted', { fileName: file.name });
      } catch (error) {
        this.emit('error', new Error(`Failed to delete old log file ${file.name}: ${error.message}`));
      }
    }
  }
  
  /**
   * 启动轮转检查
   */
  startRotationCheck() {
    this.rotationTimer = setInterval(() => {
      if (this.currentLogSize > this.options.maxFileSize * 0.9) {
        this.rotateLogFile();
      }
    }, this.options.checkInterval);
  }
  
  /**
   * 停止轮转检查
   */
  stopRotationCheck() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
  
  /**
   * 读取审计日志
   */
  async readAuditLogs(filePath, options = {}) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // 跳过文件头
      const header = JSON.parse(lines[0]);
      const logLines = lines.slice(1);
      
      const logs = [];
      
      for (const line of logLines) {
        try {
          const logEntry = JSON.parse(line);
          
          // 验证完整性
          if (logEntry.integrity && !this.verifyIntegrity(logEntry.data, logEntry.integrity)) {
            this.emit('integrity-failure', { filePath, line });
            continue;
          }
          
          // 解密数据
          const decryptedData = this.decryptData(logEntry.data);
          
          // 解压缩（如果需要）
          let eventData = decryptedData;
          if (logEntry.compressed) {
            eventData = zlib.gunzipSync(decryptedData);
          }
          
          const event = JSON.parse(eventData.toString('utf8'));
          logs.push(event);
          
        } catch (error) {
          this.emit('error', new Error(`Failed to parse log entry: ${error.message}`));
        }
      }
      
      return logs;
      
    } catch (error) {
      throw new Error(`Failed to read audit logs: ${error.message}`);
    }
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      currentLogFile: this.currentLogFile,
      currentLogSize: this.currentLogSize,
      totalLogFiles: this.logFiles.length,
      config: {
        maxFileSize: this.options.maxFileSize,
        maxFiles: this.options.maxFiles,
        encryptionEnabled: true,
        compressionEnabled: this.options.enableCompression,
        integrityCheckEnabled: this.options.enableIntegrityCheck
      }
    };
  }
  
  /**
   * 销毁审计日志器
   */
  async destroy() {
    this.stopRotationCheck();
    
    // 处理剩余的写入缓冲区
    while (this.writeBuffer.length > 0) {
      await new Promise(resolve => {
        setTimeout(resolve, 100);
      });
    }
    
    this.removeAllListeners();
  }
}

module.exports = {
  EncryptedAuditLogger,
  EncryptionConfig
};