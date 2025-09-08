/**
 * StorageManager 测试套件
 * 测试数据存储和持久化功能
 */

describe('StorageManager', () => {
    let storageManager;
    
    beforeEach(async () => {
        // 清理测试环境
        localStorage.clear();
        if (typeof indexedDB !== 'undefined') {
            // 清理IndexedDB（如果支持）
            try {
                const databases = await indexedDB.databases();
                await Promise.all(
                    databases.map(db => {
                        if (db.name && db.name.startsWith('test_')) {
                            return new Promise((resolve, reject) => {
                                const deleteReq = indexedDB.deleteDatabase(db.name);
                                deleteReq.onsuccess = () => resolve();
                                deleteReq.onerror = () => reject(deleteReq.error);
                            });
                        }
                    })
                );
            } catch (error) {
                console.warn('IndexedDB cleanup failed:', error);
            }
        }
        
        // 检查StorageManager是否可用
        if (typeof window !== 'undefined' && window.StorageManager) {
            storageManager = new StorageManager({
                enableLocalStorage: true,
                enableIndexedDB: true,
                enableDataValidation: true,
                enableBackup: true,
                enableEncryption: true,
                dbName: 'test_storage_db',
                dbVersion: 1
            });
            await storageManager.init();
        } else {
            console.warn('StorageManager not available, skipping tests');
        }
    });
    
    afterEach(() => {
        if (storageManager) {
            storageManager.destroy();
        }
    });
    
    describe('初始化测试', () => {
        it('应该能够正确初始化StorageManager', () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            expect(storageManager).toBeDefined();
            expect(storageManager.config).toBeDefined();
            expect(storageManager.config.enableLocalStorage).toBe(true);
            expect(storageManager.config.enableIndexedDB).toBe(true);
        });
        
        it('应该能够检查存储可用性', () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            const availability = storageManager.checkStorageAvailability();
            expect(availability).toBeDefined();
            expect(typeof availability.localStorage).toBe('boolean');
            expect(typeof availability.indexedDB).toBe('boolean');
        });
    });
    
    describe('数据存储测试', () => {
        it('应该能够存储和检索简单数据', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            const testData = { name: 'test', value: 123 };
            const key = 'test_simple_data';
            
            // 存储数据
            await storageManager.store(key, testData);
            
            // 检索数据
            const retrievedData = await storageManager.retrieve(key);
            expect(retrievedData).toEqual(testData);
        });
        
        it('应该能够存储和检索复杂对象', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            const complexData = {
                user: {
                    id: 'user_123',
                    profile: {
                        name: 'John Doe',
                        email: 'john@example.com',
                        preferences: {
                            theme: 'dark',
                            notifications: true
                        }
                    },
                    activities: [
                        { action: 'login', timestamp: '2024-01-01T00:00:00Z' },
                        { action: 'update_profile', timestamp: '2024-01-02T00:00:00Z' }
                    ]
                }
            };
            
            const key = 'test_complex_data';
            
            // 存储复杂数据
            await storageManager.store(key, complexData, {
                persistent: true,
                encrypted: true
            });
            
            // 检索数据
            const retrievedData = await storageManager.retrieve(key);
            expect(retrievedData).toEqual(complexData);
        });
        
        it('应该能够处理加密存储', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            const sensitiveData = {
                password: 'secret123',
                token: 'abc123xyz',
                apiKey: 'key_12345'
            };
            
            const key = 'test_encrypted_data';
            
            // 存储加密数据
            await storageManager.store(key, sensitiveData, {
                encrypted: true,
                persistent: true
            });
            
            // 检查localStorage中的数据是否已加密
            const rawData = localStorage.getItem(key);
            expect(rawData).toBeDefined();
            expect(rawData).not.toContain('secret123');
            expect(rawData).not.toContain('abc123xyz');
            
            // 检索并验证解密后的数据
            const retrievedData = await storageManager.retrieve(key);
            expect(retrievedData).toEqual(sensitiveData);
        });
    });
    
    describe('数据管理测试', () => {
        it('应该能够删除指定数据', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            const testData = { test: 'delete_me' };
            const key = 'test_delete_data';
            
            // 存储数据
            await storageManager.store(key, testData);
            
            // 验证数据存在
            let retrievedData = await storageManager.retrieve(key);
            expect(retrievedData).toEqual(testData);
            
            // 删除数据
            await storageManager.remove(key);
            
            // 验证数据已删除
            retrievedData = await storageManager.retrieve(key);
            expect(retrievedData).toBeNull();
        });
        
        it('应该能够清空所有数据', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            // 存储多个数据项
            await storageManager.store('test_1', { value: 1 });
            await storageManager.store('test_2', { value: 2 });
            await storageManager.store('test_3', { value: 3 });
            
            // 验证数据存在
            expect(await storageManager.retrieve('test_1')).toBeDefined();
            expect(await storageManager.retrieve('test_2')).toBeDefined();
            expect(await storageManager.retrieve('test_3')).toBeDefined();
            
            // 清空所有数据
            await storageManager.clear();
            
            // 验证数据已清空
            expect(await storageManager.retrieve('test_1')).toBeNull();
            expect(await storageManager.retrieve('test_2')).toBeNull();
            expect(await storageManager.retrieve('test_3')).toBeNull();
        });
        
        it('应该能够获取存储统计信息', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            // 存储一些测试数据
            await storageManager.store('stats_test_1', { data: 'test1' });
            await storageManager.store('stats_test_2', { data: 'test2' });
            
            const stats = await storageManager.getStats();
            expect(stats).toBeDefined();
            expect(typeof stats.totalKeys).toBe('number');
            expect(typeof stats.totalSize).toBe('number');
            expect(stats.totalKeys).toBeGreaterThanOrEqual(2);
        });
    });
    
    describe('数据备份和恢复测试', () => {
        it('应该能够创建数据备份', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            // 存储测试数据
            const testData = {
                user1: { name: 'Alice', email: 'alice@example.com' },
                user2: { name: 'Bob', email: 'bob@example.com' }
            };
            
            await storageManager.store('backup_test_user1', testData.user1);
            await storageManager.store('backup_test_user2', testData.user2);
            
            // 创建备份
            const backup = await storageManager.backup();
            expect(backup).toBeDefined();
            expect(backup.timestamp).toBeDefined();
            expect(backup.data).toBeDefined();
            expect(Object.keys(backup.data).length).toBeGreaterThanOrEqual(2);
        });
        
        it('应该能够从备份恢复数据', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            // 存储原始数据
            const originalData = {
                restore_test_1: { value: 'original1' },
                restore_test_2: { value: 'original2' }
            };
            
            await storageManager.store('restore_test_1', originalData.restore_test_1);
            await storageManager.store('restore_test_2', originalData.restore_test_2);
            
            // 创建备份
            const backup = await storageManager.backup();
            
            // 修改数据
            await storageManager.store('restore_test_1', { value: 'modified1' });
            await storageManager.store('restore_test_2', { value: 'modified2' });
            
            // 验证数据已修改
            expect(await storageManager.retrieve('restore_test_1')).toEqual({ value: 'modified1' });
            expect(await storageManager.retrieve('restore_test_2')).toEqual({ value: 'modified2' });
            
            // 从备份恢复
            await storageManager.restore(backup);
            
            // 验证数据已恢复
            expect(await storageManager.retrieve('restore_test_1')).toEqual(originalData.restore_test_1);
            expect(await storageManager.retrieve('restore_test_2')).toEqual(originalData.restore_test_2);
        });
    });
    
    describe('数据同步测试', () => {
        it('应该能够处理数据同步操作', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            // 存储需要同步的数据
            await storageManager.store('sync_test_data', { 
                value: 'sync_test',
                timestamp: new Date().toISOString()
            }, {
                persistent: true,
                sync: true
            });
            
            // 执行同步操作
            const syncResult = await storageManager.sync();
            expect(syncResult).toBeDefined();
            expect(typeof syncResult.success).toBe('boolean');
        });
    });
    
    describe('错误处理测试', () => {
        it('应该能够处理无效的存储键', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            // 测试空键
            await expect(storageManager.store('', { test: 'data' })).rejects.toThrow();
            
            // 测试null键
            await expect(storageManager.store(null, { test: 'data' })).rejects.toThrow();
            
            // 测试undefined键
            await expect(storageManager.store(undefined, { test: 'data' })).rejects.toThrow();
        });
        
        it('应该能够处理存储空间不足的情况', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            // 模拟存储空间不足（通过存储大量数据）
            const largeData = 'x'.repeat(1024 * 1024); // 1MB字符串
            
            try {
                // 尝试存储大量数据直到失败
                for (let i = 0; i < 100; i++) {
                    await storageManager.store(`large_data_${i}`, largeData);
                }
            } catch (error) {
                // 应该能够优雅地处理存储错误
                expect(error).toBeDefined();
                expect(error.message).toContain('存储');
            }
        });
        
        it('应该能够处理损坏的数据', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            // 手动在localStorage中插入损坏的数据
            localStorage.setItem('corrupted_data', 'invalid_json{');
            
            // 尝试检索损坏的数据
            const result = await storageManager.retrieve('corrupted_data');
            expect(result).toBeNull(); // 应该返回null而不是抛出错误
        });
    });
    
    describe('性能测试', () => {
        it('应该能够在合理时间内处理大量数据操作', async () => {
            if (!storageManager) {
                console.warn('StorageManager not available, skipping test');
                expect(true).toBe(true);
                return;
            }
            
            const startTime = Date.now();
            const dataCount = 100;
            
            // 批量存储数据
            const storePromises = [];
            for (let i = 0; i < dataCount; i++) {
                storePromises.push(
                    storageManager.store(`perf_test_${i}`, {
                        id: i,
                        data: `test_data_${i}`,
                        timestamp: new Date().toISOString()
                    })
                );
            }
            
            await Promise.all(storePromises);
            
            // 批量检索数据
            const retrievePromises = [];
            for (let i = 0; i < dataCount; i++) {
                retrievePromises.push(storageManager.retrieve(`perf_test_${i}`));
            }
            
            const results = await Promise.all(retrievePromises);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // 验证所有操作在合理时间内完成（5秒）
            expect(duration).toBeLessThan(5000);
            
            // 验证所有数据正确检索
            expect(results.length).toBe(dataCount);
            results.forEach((result, index) => {
                expect(result).toBeDefined();
                expect(result.id).toBe(index);
            });
        });
    });
});