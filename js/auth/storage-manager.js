/**
 * 数据存储和持久化管理器
 * 负责用户数据的存储、检索、持久化和数据完整性保证
 */
class StorageManager {
  constructor(config = {}) {
    this.config = {
      // 存储配置
      enableLocalStorage: config.enableLocalStorage !== false,
      enableSessionStorage: config.enableSessionStorage !== false,
      enableIndexedDB: config.enableIndexedDB !== false,
      enableCloudSync: config.enableCloudSync || false,

      // 数据完整性配置
      enableDataValidation: config.enableDataValidation !== false,
      enableBackup: config.enableBackup !== false,
      enableEncryption: config.enableEncryption !== false,

      // 性能配置
      cacheSize: config.cacheSize || 100,
      syncInterval: config.syncInterval || 30000, // 30秒
      compressionEnabled: config.compressionEnabled || false,

      // 错误处理配置
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      fallbackStorage: config.fallbackStorage || 'memory',

      ...config
    };

    this.cache = new Map();
    this.pendingOperations = new Map();
    this.syncQueue = [];
    this.isInitialized = false;
    this.storageAvailable = {};
    this.encryptionKey = null;

    // 绑定方法
    this.init = this.init.bind(this);
    this.store = this.store.bind(this);
    this.retrieve = this.retrieve.bind(this);
    this.remove = this.remove.bind(this);
    this.clear = this.clear.bind(this);
    this.sync = this.sync.bind(this);
    this.backup = this.backup.bind(this);
    this.restore = this.restore.bind(this);
  }

  /**
     * 初始化存储管理器
     */
  async init() {
    try {
      console.log('StorageManager: 开始初始化...');

      // 检查存储可用性
      await this.checkStorageAvailability();

      // 初始化加密
      if (this.config.enableEncryption) {
        await this.initEncryption();
      }

      // 初始化IndexedDB
      if (this.config.enableIndexedDB && this.storageAvailable.indexedDB) {
        await this.initIndexedDB();
      }

      // 启动同步服务
      if (this.config.enableCloudSync) {
        this.startSyncService();
      }

      // 恢复缓存数据
      await this.loadCacheFromStorage();

      this.isInitialized = true;
      console.log('StorageManager: 初始化完成');

      return {
        success: true,
        storageAvailable: this.storageAvailable,
        config: this.config
      };
    } catch (error) {
      console.error('StorageManager: 初始化失败', error);
      throw new Error(`存储管理器初始化失败: ${error.message}`);
    }
  }

  /**
     * 检查存储可用性
     */
  async checkStorageAvailability() {
    // 检查localStorage
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.storageAvailable.localStorage = true;
    } catch (e) {
      this.storageAvailable.localStorage = false;
      console.warn('localStorage 不可用:', e.message);
    }

    // 检查sessionStorage
    try {
      const testKey = '__session_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      this.storageAvailable.sessionStorage = true;
    } catch (e) {
      this.storageAvailable.sessionStorage = false;
      console.warn('sessionStorage 不可用:', e.message);
    }

    // 检查IndexedDB
    try {
      this.storageAvailable.indexedDB = 'indexedDB' in window;
    } catch (e) {
      this.storageAvailable.indexedDB = false;
      console.warn('IndexedDB 不可用:', e.message);
    }
  }

  /**
     * 初始化加密
     */
  async initEncryption() {
    try {
      if (window.crypto && window.crypto.subtle) {
        // 生成或获取加密密钥
        const keyData = localStorage.getItem('__encryption_key__');
        if (keyData) {
          this.encryptionKey = await window.crypto.subtle.importKey(
            'raw',
            new Uint8Array(JSON.parse(keyData)),
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
          );
        } else {
          this.encryptionKey = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );

          // 导出并保存密钥
          const exportedKey = await window.crypto.subtle.exportKey('raw', this.encryptionKey);
          localStorage.setItem('__encryption_key__', JSON.stringify(Array.from(new Uint8Array(exportedKey))));
        }
        console.log('StorageManager: 加密初始化完成');
      } else {
        console.warn('StorageManager: Web Crypto API 不可用，禁用加密');
        this.config.enableEncryption = false;
      }
    } catch (error) {
      console.error('StorageManager: 加密初始化失败', error);
      this.config.enableEncryption = false;
    }
  }

  /**
     * 初始化IndexedDB
     */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AuthStorageDB', 1);

      request.onerror = () => {
        console.error('StorageManager: IndexedDB 打开失败');
        this.storageAvailable.indexedDB = false;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.indexedDB = request.result;
        console.log('StorageManager: IndexedDB 初始化完成');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建用户数据存储
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // 创建会话数据存储
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }

        // 创建备份数据存储
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'timestamp' });
        }
      };
    });
  }

  /**
     * 存储数据
     */
  async store(key, data, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      const storeOptions = {
        persistent: options.persistent !== false,
        encrypted: options.encrypted || this.config.enableEncryption,
        backup: options.backup !== false,
        validate: options.validate !== false,
        storageType: options.storageType || 'auto',
        ...options
      };

      // 数据验证
      if (storeOptions.validate && this.config.enableDataValidation) {
        await this.validateData(key, data);
      }

      // 数据加密
      let processedData = data;
      if (storeOptions.encrypted && this.encryptionKey) {
        processedData = await this.encryptData(data);
      }

      // 数据压缩
      if (this.config.compressionEnabled) {
        processedData = await this.compressData(processedData);
      }

      // 选择存储方式
      const storageType = this.selectStorageType(storeOptions.storageType, storeOptions.persistent);

      // 执行存储
      const result = await this.executeStore(key, processedData, storageType, storeOptions);

      // 更新缓存
      this.updateCache(key, data, storeOptions);

      // 创建备份
      if (storeOptions.backup && this.config.enableBackup) {
        await this.createBackup(key, data);
      }

      // 添加到同步队列
      if (this.config.enableCloudSync) {
        this.addToSyncQueue(key, data, 'store');
      }

      console.log(`StorageManager: 数据存储成功 - ${key}`);
      return result;

    } catch (error) {
      console.error(`StorageManager: 数据存储失败 - ${key}`, error);
      throw new Error(`数据存储失败: ${error.message}`);
    }
  }

  /**
     * 检索数据
     */
  async retrieve(key, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      const retrieveOptions = {
        useCache: options.useCache !== false,
        decrypt: options.decrypt !== false,
        fallback: options.fallback !== false,
        storageType: options.storageType || 'auto',
        ...options
      };

      // 检查缓存
      if (retrieveOptions.useCache && this.cache.has(key)) {
        const cachedData = this.cache.get(key);
        if (this.isCacheValid(cachedData)) {
          console.log(`StorageManager: 从缓存获取数据 - ${key}`);
          return cachedData.data;
        }
      }

      // 从存储中检索
      let data = null;
      const storageTypes = this.getStorageTypePriority(retrieveOptions.storageType);

      for (const storageType of storageTypes) {
        try {
          data = await this.executeRetrieve(key, storageType);
          if (data !== null) {
            break;
          }
        } catch (error) {
          console.warn(`StorageManager: 从 ${storageType} 检索失败`, error);
          continue;
        }
      }

      if (data === null) {
        if (retrieveOptions.fallback) {
          data = await this.retrieveFromBackup(key);
        }

        if (data === null) {
          console.log(`StorageManager: 数据不存在 - ${key}`);
          return null;
        }
      }

      // 数据解压缩
      if (this.config.compressionEnabled) {
        data = await this.decompressData(data);
      }

      // 数据解密
      if (retrieveOptions.decrypt && this.encryptionKey) {
        data = await this.decryptData(data);
      }

      // 更新缓存
      this.updateCache(key, data, retrieveOptions);

      console.log(`StorageManager: 数据检索成功 - ${key}`);
      return data;

    } catch (error) {
      console.error(`StorageManager: 数据检索失败 - ${key}`, error);
      throw new Error(`数据检索失败: ${error.message}`);
    }
  }

  /**
     * 删除数据
     */
  async remove(key, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      const removeOptions = {
        removeFromAll: options.removeFromAll !== false,
        createBackup: options.createBackup !== false,
        ...options
      };

      // 创建删除前备份
      if (removeOptions.createBackup && this.config.enableBackup) {
        const data = await this.retrieve(key, { useCache: false });
        if (data) {
          await this.createBackup(key, data, 'before_delete');
        }
      }

      // 从所有存储中删除
      if (removeOptions.removeFromAll) {
        const storageTypes = ['localStorage', 'sessionStorage', 'indexedDB'];
        for (const storageType of storageTypes) {
          try {
            await this.executeRemove(key, storageType);
          } catch (error) {
            console.warn(`StorageManager: 从 ${storageType} 删除失败`, error);
          }
        }
      } else {
        await this.executeRemove(key, removeOptions.storageType || 'auto');
      }

      // 从缓存中删除
      this.cache.delete(key);

      // 添加到同步队列
      if (this.config.enableCloudSync) {
        this.addToSyncQueue(key, null, 'remove');
      }

      console.log(`StorageManager: 数据删除成功 - ${key}`);
      return true;

    } catch (error) {
      console.error(`StorageManager: 数据删除失败 - ${key}`, error);
      throw new Error(`数据删除失败: ${error.message}`);
    }
  }

  /**
     * 清空存储
     */
  async clear(options = {}) {
    try {
      const clearOptions = {
        clearAll: options.clearAll !== false,
        createBackup: options.createBackup !== false,
        ...options
      };

      // 创建全量备份
      if (clearOptions.createBackup && this.config.enableBackup) {
        await this.createFullBackup();
      }

      // 清空各种存储
      if (clearOptions.clearAll) {
        if (this.storageAvailable.localStorage) {
          localStorage.clear();
        }

        if (this.storageAvailable.sessionStorage) {
          sessionStorage.clear();
        }

        if (this.storageAvailable.indexedDB && this.indexedDB) {
          await this.clearIndexedDB();
        }
      }

      // 清空缓存
      this.cache.clear();

      // 清空同步队列
      this.syncQueue = [];

      console.log('StorageManager: 存储清空完成');
      return true;

    } catch (error) {
      console.error('StorageManager: 存储清空失败', error);
      throw new Error(`存储清空失败: ${error.message}`);
    }
  }

  /**
     * 数据同步
     */
  async sync(options = {}) {
    try {
      if (!this.config.enableCloudSync) {
        console.warn('StorageManager: 云同步未启用');
        return false;
      }

      const syncOptions = {
        force: options.force || false,
        direction: options.direction || 'bidirectional', // 'up', 'down', 'bidirectional'
        ...options
      };

      console.log('StorageManager: 开始数据同步...');

      // 处理同步队列
      const results = [];
      for (const item of this.syncQueue) {
        try {
          const result = await this.syncItem(item, syncOptions);
          results.push(result);
        } catch (error) {
          console.error('StorageManager: 同步项目失败', item, error);
          results.push({ success: false, error: error.message, item });
        }
      }

      // 清空已同步的项目
      this.syncQueue = this.syncQueue.filter((_, index) => !results[index]?.success);

      console.log('StorageManager: 数据同步完成', results);
      return results;

    } catch (error) {
      console.error('StorageManager: 数据同步失败', error);
      throw new Error(`数据同步失败: ${error.message}`);
    }
  }

  /**
     * 创建备份
     */
  async backup(options = {}) {
    try {
      const backupOptions = {
        includeCache: options.includeCache || false,
        compress: options.compress !== false,
        encrypt: options.encrypt !== false,
        ...options
      };

      const backupData = {
        timestamp: Date.now(),
        version: '1.0',
        config: this.config,
        data: {}
      };

      // 备份localStorage数据
      if (this.storageAvailable.localStorage) {
        backupData.data.localStorage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !key.startsWith('__')) {
            backupData.data.localStorage[key] = localStorage.getItem(key);
          }
        }
      }

      // 备份IndexedDB数据
      if (this.storageAvailable.indexedDB && this.indexedDB) {
        backupData.data.indexedDB = await this.exportIndexedDBData();
      }

      // 备份缓存数据
      if (backupOptions.includeCache) {
        backupData.data.cache = Array.from(this.cache.entries());
      }

      // 压缩备份数据
      let processedBackup = backupData;
      if (backupOptions.compress) {
        processedBackup = await this.compressData(backupData);
      }

      // 加密备份数据
      if (backupOptions.encrypt && this.encryptionKey) {
        processedBackup = await this.encryptData(processedBackup);
      }

      // 保存备份
      const backupKey = `backup_${backupData.timestamp}`;
      await this.store(backupKey, processedBackup, { persistent: true, backup: false });

      console.log('StorageManager: 备份创建完成', backupKey);
      return backupKey;

    } catch (error) {
      console.error('StorageManager: 备份创建失败', error);
      throw new Error(`备份创建失败: ${error.message}`);
    }
  }

  /**
     * 恢复备份
     */
  async restore(backupKey, options = {}) {
    try {
      const restoreOptions = {
        clearBefore: options.clearBefore || false,
        validateBackup: options.validateBackup !== false,
        ...options
      };

      // 获取备份数据
      let backupData = await this.retrieve(backupKey, { useCache: false, decrypt: true });

      if (!backupData) {
        throw new Error('备份数据不存在');
      }

      // 解压缩备份数据
      if (this.config.compressionEnabled) {
        backupData = await this.decompressData(backupData);
      }

      // 验证备份数据
      if (restoreOptions.validateBackup) {
        await this.validateBackupData(backupData);
      }

      // 清空现有数据
      if (restoreOptions.clearBefore) {
        await this.clear({ createBackup: true });
      }

      // 恢复localStorage数据
      if (backupData.data.localStorage && this.storageAvailable.localStorage) {
        for (const [key, value] of Object.entries(backupData.data.localStorage)) {
          localStorage.setItem(key, value);
        }
      }

      // 恢复IndexedDB数据
      if (backupData.data.indexedDB && this.storageAvailable.indexedDB) {
        await this.importIndexedDBData(backupData.data.indexedDB);
      }

      // 恢复缓存数据
      if (backupData.data.cache) {
        this.cache.clear();
        for (const [key, value] of backupData.data.cache) {
          this.cache.set(key, value);
        }
      }

      console.log('StorageManager: 备份恢复完成', backupKey);
      return true;

    } catch (error) {
      console.error('StorageManager: 备份恢复失败', error);
      throw new Error(`备份恢复失败: ${error.message}`);
    }
  }

  /**
     * 获取存储统计信息
     */
  getStorageStats() {
    const stats = {
      cache: {
        size: this.cache.size,
        maxSize: this.config.cacheSize
      },
      syncQueue: {
        pending: this.syncQueue.length
      },
      storage: {
        available: this.storageAvailable,
        initialized: this.isInitialized
      },
      config: this.config
    };

    // 计算localStorage使用情况
    if (this.storageAvailable.localStorage) {
      let localStorageSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageSize += key.length + (localStorage.getItem(key) || '').length;
        }
      }
      stats.localStorage = {
        used: localStorageSize,
        items: localStorage.length
      };
    }

    return stats;
  }

  // 辅助方法

  selectStorageType(requested, persistent) {
    if (requested !== 'auto') {
      return requested;
    }

    if (persistent) {
      if (this.storageAvailable.indexedDB) {return 'indexedDB';}
      if (this.storageAvailable.localStorage) {return 'localStorage';}
    } else {
      if (this.storageAvailable.sessionStorage) {return 'sessionStorage';}
      if (this.storageAvailable.localStorage) {return 'localStorage';}
    }

    return 'memory';
  }

  getStorageTypePriority(requested) {
    if (requested !== 'auto') {
      return [requested];
    }

    return ['indexedDB', 'localStorage', 'sessionStorage', 'memory']
      .filter(type => this.storageAvailable[type] || type === 'memory');
  }

  updateCache(key, data, options) {
    if (this.cache.size >= this.config.cacheSize) {
      // 删除最旧的缓存项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      options
    });
  }

  isCacheValid(cachedData) {
    const maxAge = 5 * 60 * 1000; // 5分钟
    return Date.now() - cachedData.timestamp < maxAge;
  }

  addToSyncQueue(key, data, operation) {
    this.syncQueue.push({
      key,
      data,
      operation,
      timestamp: Date.now()
    });
  }

  startSyncService() {
    setInterval(() => {
      if (this.syncQueue.length > 0) {
        this.sync().catch(error => {
          console.error('StorageManager: 自动同步失败', error);
        });
      }
    }, this.config.syncInterval);
  }

  // 占位方法 - 需要根据具体需求实现
  async validateData(_key, _data) { return true; }
  async encryptData(_data) { return _data; }
  async decryptData(_data) { return _data; }
  async compressData(_data) { return _data; }
  async decompressData(_data) { return _data; }
  async executeStore(_key, _data, _storageType, _options) { return true; }
  async executeRetrieve(_key, _storageType) { return null; }
  async executeRemove(_key, _storageType) { return true; }
  async createBackup(_key, _data, _type = 'normal') { return true; }
  async createFullBackup() { return true; }
  async retrieveFromBackup(_key) { return null; }
  async clearIndexedDB() { return true; }
  async syncItem(_item, _options) { return { success: true }; }
  async exportIndexedDBData() { return {}; }
  async importIndexedDBData(_data) { return true; }
  async validateBackupData(_data) { return true; }
  async loadCacheFromStorage() { return true; }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
} else if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
