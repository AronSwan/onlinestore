#!/usr/bin/env node

/**
 * 配置热重载组件 - 实现配置文件的动态加载和更新
 * 支持配置验证、回滚和通知机制
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// 配置热重载配置
const ConfigHotReloadConfig = {
  // 监控配置
  watch: {
    enabled: true,
    debounceTime: 1000, // 防抖时间，避免频繁触发
    ignoreInitial: true, // 是否忽略初始加载
    persistent: true // 进程保持时是否持续监控
  },
  
  // 验证配置
  validation: {
    enabled: true,
    strict: true, // 严格模式，验证失败时拒绝加载
    schema: null, // JSON Schema 验证
    customValidators: [] // 自定义验证函数数组
  },
  
  // 备份配置
  backup: {
    enabled: true,
    maxBackups: 5, // 最大备份数量
    directory: '.config-backups', // 备份目录
    filename: 'config-backup-{timestamp}.json' // 备份文件名模板
  },
  
  // 回滚配置
  rollback: {
    enabled: true,
    autoRollback: true, // 验证失败时自动回滚
    rollbackOnError: true // 加载错误时自动回滚
  },
  
  // 通知配置
  notifications: {
    enabled: true,
    onSuccess: true, // 成功时通知
    onFailure: true, // 失败时通知
    onValidationError: true // 验证失败时通知
  }
};

class ConfigHotReloader extends EventEmitter {
  constructor(configPath, options = {}) {
    super();
    
    this.configPath = path.resolve(configPath);
    this.options = {
      ...ConfigHotReloadConfig,
      ...options
    };
    
    // 状态管理
    this.isWatching = false;
    this.watchers = new Map();
    this.debounceTimers = new Map();
    this.currentConfig = null;
    this.previousConfig = null;
    this.loadHistory = [];
    
    // 初始化
    this.initialize();
  }
  
  /**
   * 初始化热重载器
   */
  async initialize() {
    try {
      // 创建备份目录
      if (this.options.backup.enabled) {
        this.ensureBackupDirectory();
      }
      
      // 加载初始配置
      await this.loadConfig();
      
      // 开始监控
      if (this.options.watch.enabled) {
        this.startWatching();
      }
      
      this.emit('initialized', { config: this.currentConfig });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * 确保备份目录存在
   */
  ensureBackupDirectory() {
    const backupDir = path.resolve(this.options.backup.directory);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  }
  
  /**
   * 加载配置
   */
  async loadConfig() {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`配置文件不存在: ${this.configPath}`);
      }
      
      // 读取文件内容
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      
      // 解析配置
      let newConfig;
      try {
        newConfig = JSON.parse(configContent);
      } catch (parseError) {
        throw new Error(`配置文件解析失败: ${parseError.message}`);
      }
      
      // 验证配置
      if (this.options.validation.enabled) {
        await this.validateConfig(newConfig);
      }
      
      // 保存当前配置为前一个配置
      this.previousConfig = this.currentConfig;
      
      // 更新当前配置
      this.currentConfig = newConfig;
      
      // 添加到加载历史
      this.addToLoadHistory({
        timestamp: Date.now(),
        config: newConfig,
        source: 'file-load'
      });
      
      // 发出成功事件
      this.emit('config-loaded', {
        config: newConfig,
        previousConfig: this.previousConfig,
        source: 'file-load'
      });
      
      // 发送通知
      if (this.options.notifications.onSuccess) {
        this.notify('success', '配置加载成功');
      }
      
      return newConfig;
    } catch (error) {
      // 发出错误事件
      this.emit('config-load-error', error);
      
      // 发送通知
      if (this.options.notifications.onFailure) {
        this.notify('error', `配置加载失败: ${error.message}`);
      }
      
      // 自动回滚
      if (this.options.rollback.autoRollback && this.previousConfig) {
        await this.rollbackConfig('自动回滚：配置加载失败');
      }
      
      throw error;
    }
  }
  
  /**
   * 验证配置
   */
  async validateConfig(config) {
    // 自定义验证器
    for (const validator of this.options.validation.customValidators) {
      try {
        const result = await validator(config);
        if (result !== true) {
          throw new Error(`自定义验证失败: ${result}`);
        }
      } catch (error) {
        throw new Error(`配置验证失败: ${error.message}`);
      }
    }
    
    // JSON Schema 验证
    if (this.options.validation.schema) {
      try {
        // 这里可以使用 ajv 或其他 JSON Schema 验证库
        // 为了简化，这里只是示例
        const isValid = this.validateWithSchema(config, this.options.validation.schema);
        if (!isValid) {
          throw new Error('JSON Schema 验证失败');
        }
      } catch (error) {
        throw new Error(`Schema 验证失败: ${error.message}`);
      }
    }
    
    return true;
  }
  
  /**
   * 使用 Schema 验证配置（简化版）
   */
  validateWithSchema(config, schema) {
    // 这里应该使用完整的 JSON Schema 验证库
    // 为了简化，这里只做基本检查
    if (schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in config)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * 添加到加载历史
   */
  addToLoadHistory(entry) {
    this.loadHistory.push(entry);
    
    // 限制历史记录大小
    if (this.loadHistory.length > 100) {
      this.loadHistory.shift();
    }
  }
  
  /**
   * 开始监控配置文件
   */
  startWatching() {
    if (this.isWatching) {
      return;
    }
    
    try {
      // 确保文件存在
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`配置文件不存在: ${this.configPath}`);
      }
      
      // 创建文件监控器
      const watcher = fs.watch(this.configPath, (eventType, filename) => {
        if (eventType === 'change') {
          this.handleFileChange();
        }
      });
      
      this.watchers.set('main', watcher);
      this.isWatching = true;
      
      // 处理监控器错误
      watcher.on('error', (error) => {
        this.emit('watcher-error', error);
      });
      
      this.emit('watching-started');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * 停止监控配置文件
   */
  stopWatching() {
    if (!this.isWatching) {
      return;
    }
    
    // 清理所有监控器
    for (const [name, watcher] of this.watchers) {
      try {
        watcher.close();
      } catch (error) {
        this.emit('warning', `关闭监控器 ${name} 时出错: ${error.message}`);
      }
    }
    
    this.watchers.clear();
    this.isWatching = false;
    
    // 清理防抖定时器
    for (const [name, timer] of this.debounceTimers) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    this.emit('watching-stopped');
  }
  
  /**
   * 处理文件变化
   */
  handleFileChange() {
    // 防抖处理，避免频繁触发
    if (this.debounceTimers.has('main')) {
      clearTimeout(this.debounceTimers.get('main'));
    }
    
    const timer = setTimeout(async () => {
      try {
        this.emit('config-changing');
        
        // 创建备份
        if (this.options.backup.enabled && this.currentConfig) {
          await this.createBackup();
        }
        
        // 重新加载配置
        await this.loadConfig();
        
        this.emit('config-changed', {
          config: this.currentConfig,
          previousConfig: this.previousConfig
        });
      } catch (error) {
        this.emit('config-change-error', error);
      }
    }, this.options.watch.debounceTime);
    
    this.debounceTimers.set('main', timer);
  }
  
  /**
   * 创建配置备份
   */
  async createBackup() {
    if (!this.options.backup.enabled) {
      return;
    }
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = this.options.backup.filename
        .replace('{timestamp}', timestamp)
        .replace('{date}', new Date().toISOString().split('T')[0]);
      
      const backupPath = path.resolve(this.options.backup.directory, filename);
      
      // 写入备份文件
      fs.writeFileSync(backupPath, JSON.stringify(this.currentConfig, null, 2));
      
      // 清理旧备份
      await this.cleanupOldBackups();
      
      this.emit('backup-created', { path: backupPath, timestamp });
    } catch (error) {
      this.emit('backup-error', error);
    }
  }
  
  /**
   * 清理旧备份
   */
  async cleanupOldBackups() {
    try {
      const backupDir = path.resolve(this.options.backup.directory);
      const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('config-backup-'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          mtime: fs.statSync(path.join(backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      // 如果备份数量超过限制，删除最旧的备份
      if (files.length > this.options.backup.maxBackups) {
        const filesToDelete = files.slice(this.options.backup.maxBackups);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          this.emit('backup-deleted', { path: file.path });
        }
      }
    } catch (error) {
      this.emit('backup-cleanup-error', error);
    }
  }
  
  /**
   * 回滚配置
   */
  async rollbackConfig(reason = '手动回滚') {
    if (!this.options.rollback.enabled) {
      throw new Error('回滚功能未启用');
    }
    
    if (!this.previousConfig) {
      throw new Error('没有可回滚的配置');
    }
    
    try {
      // 保存当前配置
      const currentConfig = this.currentConfig;
      
      // 恢复到前一个配置
      this.currentConfig = this.previousConfig;
      this.previousConfig = currentConfig;
      
      // 添加到加载历史
      this.addToLoadHistory({
        timestamp: Date.now(),
        config: this.currentConfig,
        source: 'rollback',
        reason
      });
      
      // 发出回滚事件
      this.emit('config-rolled-back', {
        config: this.currentConfig,
        previousConfig: this.previousConfig,
        reason
      });
      
      // 发送通知
      if (this.options.notifications.onFailure) {
        this.notify('warning', `配置已回滚: ${reason}`);
      }
      
      return this.currentConfig;
    } catch (error) {
      this.emit('rollback-error', error);
      throw error;
    }
  }
  
  /**
   * 手动更新配置
   */
  async updateConfig(newConfig, source = 'manual') {
    try {
      // 验证配置
      if (this.options.validation.enabled) {
        await this.validateConfig(newConfig);
      }
      
      // 保存当前配置为前一个配置
      this.previousConfig = this.currentConfig;
      
      // 更新当前配置
      this.currentConfig = newConfig;
      
      // 添加到加载历史
      this.addToLoadHistory({
        timestamp: Date.now(),
        config: newConfig,
        source
      });
      
      // 写入文件
      fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2));
      
      // 发出更新事件
      this.emit('config-updated', {
        config: newConfig,
        previousConfig: this.previousConfig,
        source
      });
      
      // 发送通知
      if (this.options.notifications.onSuccess) {
        this.notify('success', '配置更新成功');
      }
      
      return newConfig;
    } catch (error) {
      // 发出错误事件
      this.emit('config-update-error', error);
      
      // 发送通知
      if (this.options.notifications.onFailure) {
        this.notify('error', `配置更新失败: ${error.message}`);
      }
      
      // 自动回滚
      if (this.options.rollback.rollbackOnError && this.previousConfig) {
        await this.rollbackConfig('自动回滚：配置更新失败');
      }
      
      throw error;
    }
  }
  
  /**
   * 获取当前配置
   */
  getConfig() {
    return this.currentConfig;
  }
  
  /**
   * 获取配置历史
   */
  getHistory(limit = 10) {
    return this.loadHistory.slice(-limit);
  }
  
  /**
   * 发送通知
   */
  notify(type, message) {
    if (!this.options.notifications.enabled) {
      return;
    }
    
    this.emit('notification', {
      type,
      message,
      timestamp: new Date().toISOString()
    });
    
    // 这里可以添加其他通知方式，如邮件、Slack等
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
  
  /**
   * 添加自定义验证器
   */
  addValidator(validator) {
    if (typeof validator !== 'function') {
      throw new Error('验证器必须是函数');
    }
    
    this.options.validation.customValidators.push(validator);
  }
  
  /**
   * 移除自定义验证器
   */
  removeValidator(validator) {
    const index = this.options.validation.customValidators.indexOf(validator);
    if (index !== -1) {
      this.options.validation.customValidators.splice(index, 1);
    }
  }
  
  /**
   * 销毁热重载器
   */
  destroy() {
    this.stopWatching();
    this.removeAllListeners();
    this.currentConfig = null;
    this.previousConfig = null;
    this.loadHistory = [];
  }
}

module.exports = {
  ConfigHotReloader,
  ConfigHotReloadConfig
};