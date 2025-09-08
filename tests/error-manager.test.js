/**
 * ErrorManager 测试套件
 * 测试错误处理、恢复机制和用户友好的错误信息
 */

// 加载ErrorManager模块
const ErrorManager = require('../js/auth/error-manager.js');

describe('ErrorManager', () => {
    let errorManager;
    
    beforeEach(async () => {
        // 清理DOM
        document.body.innerHTML = '';
        
        // 清理localStorage
        localStorage.clear();
        
        // 创建ErrorManager实例
        errorManager = new ErrorManager({
            enableErrorLogging: true,
            enableUserFriendlyMessages: true,
            enableErrorRecovery: true,
            enableErrorReporting: false,
            maxRetryAttempts: 2,
            retryDelay: 100,
            errorDisplayDuration: 1000
        });
        
        await errorManager.init();
    });
    
    afterEach(() => {
        if (errorManager) {
            errorManager.destroy();
        }
        
        // 清理错误提示元素
        const toasts = document.querySelectorAll('.error-toast');
        toasts.forEach(toast => toast.remove());
    });
    
    describe('初始化测试', () => {
        test('应该正确初始化ErrorManager', () => {
            expect(errorManager.isInitialized).toBe(true);
            expect(errorManager.config.enableErrorLogging).toBe(true);
            expect(errorManager.config.maxRetryAttempts).toBe(2);
        });
        
        test('应该设置默认配置', async () => {
            const defaultManager = new ErrorManager();
            await defaultManager.init();
            
            expect(defaultManager.config.enableErrorLogging).toBe(true);
            expect(defaultManager.config.enableUserFriendlyMessages).toBe(true);
            expect(defaultManager.config.maxRetryAttempts).toBe(3);
            
            defaultManager.destroy();
        });
    });
    
    describe('错误类型检测', () => {
        test('应该正确检测验证错误', () => {
            const error = new Error('validation failed');
            const type = errorManager.detectErrorType(error);
            expect(type).toBe('validation');
        });
        
        test('应该正确检测网络错误', () => {
            const error = new Error('network connection failed');
            const type = errorManager.detectErrorType(error);
            expect(type).toBe('network');
        });
        
        test('应该正确检测存储错误', () => {
            const error = new Error('storage quota exceeded');
            const type = errorManager.detectErrorType(error);
            expect(type).toBe('storage');
        });
        
        test('应该正确检测安全错误', () => {
            const error = new Error('security check failed');
            const type = errorManager.detectErrorType(error);
            expect(type).toBe('security');
        });
        
        test('应该将未知错误归类为unknown', () => {
            const error = new Error('some random error');
            const type = errorManager.detectErrorType(error);
            expect(type).toBe('unknown');
        });
    });
    
    describe('错误处理', () => {
        test('应该正确处理和记录错误', async () => {
            const error = new Error('test error');
            const result = await errorManager.handleError(error, {
                type: 'validation',
                context: 'test_context'
            });
            
            expect(result.recovered).toBe(true); // 验证错误通常可以恢复
            expect(result.errorInfo).toBeDefined();
            expect(result.errorInfo.type).toBe('validation');
            expect(result.errorInfo.context).toBe('test_context');
        });
        
        test('应该将错误添加到历史记录', async () => {
            const error = new Error('test error');
            await errorManager.handleError(error);
            
            expect(errorManager.errorHistory.length).toBe(1);
            expect(errorManager.errorHistory[0].message).toBe('test error');
        });
        
        test('应该限制错误历史记录数量', async () => {
            // 设置较小的历史记录限制
            errorManager.config.maxErrorHistory = 2;
            
            // 添加3个错误
            for (let i = 0; i < 3; i++) {
                await errorManager.handleError(new Error(`error ${i}`));
            }
            
            expect(errorManager.errorHistory.length).toBe(2);
            expect(errorManager.errorHistory[0].message).toBe('error 2'); // 最新的错误
        });
    });
    
    describe('错误恢复机制', () => {
        test('应该尝试网络错误恢复', async () => {
            let retryCount = 0;
            const retryFunction = jest.fn(() => {
                retryCount++;
                if (retryCount < 2) {
                    throw new Error('network still failing');
                }
                return 'success';
            });
            
            const error = new Error('network error');
            const result = await errorManager.handleError(error, {
                type: 'network',
                context: { retryFunction },
                recoverable: true
            });
            
            expect(retryFunction).toHaveBeenCalledTimes(2);
            expect(result.recovered).toBe(true);
        });
        
        test('应该在最大重试次数后停止', async () => {
            const retryFunction = jest.fn(() => {
                throw new Error('always failing');
            });
            
            const error = new Error('network error');
            const result = await errorManager.handleError(error, {
                type: 'network',
                context: { retryFunction },
                recoverable: true
            });
            
            expect(retryFunction).toHaveBeenCalledTimes(2); // maxRetryAttempts = 2
            expect(result.recovered).toBe(false);
        });
        
        test('应该处理存储错误恢复', async () => {
            // 模拟存储清理
            const cleanupSpy = jest.spyOn(errorManager, 'cleanupStorage');
            
            const error = new Error('storage quota exceeded');
            await errorManager.handleError(error, {
                type: 'storage',
                recoverable: true
            });
            
            expect(cleanupSpy).toHaveBeenCalled();
        });
    });
    
    describe('用户友好错误信息', () => {
        test('应该生成用户友好的验证错误信息', () => {
            const errorInfo = {
                type: 'validation',
                message: 'username validation failed',
                fieldName: 'username'
            };
            
            const message = errorManager.getUserFriendlyMessage(errorInfo);
            expect(message).toContain('用户名格式不正确');
        });
        
        test('应该生成用户友好的网络错误信息', () => {
            const errorInfo = {
                type: 'network',
                message: 'fetch failed'
            };
            
            const message = errorManager.getUserFriendlyMessage(errorInfo);
            expect(message).toContain('网络连接出现问题');
        });
        
        test('应该为未知错误提供默认信息', () => {
            const errorInfo = {
                type: 'unknown',
                message: 'some weird error'
            };
            
            const message = errorManager.getUserFriendlyMessage(errorInfo);
            expect(message).toContain('发生未知错误');
        });
    });
    
    describe('错误提示显示', () => {
        test('应该显示错误Toast', async () => {
            const error = new Error('test error');
            await errorManager.handleError(error, {
                type: 'validation',
                showUserMessage: true
            });
            
            // 等待Toast创建
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const toast = document.querySelector('.error-toast');
            expect(toast).toBeTruthy();
            expect(toast.textContent).toContain('输入信息有误');
        });
        
        test('应该自动移除Toast', async () => {
            // 设置较短的显示时间
            errorManager.config.errorDisplayDuration = 200;
            
            const error = new Error('test error');
            await errorManager.handleError(error, {
                type: 'validation',
                showUserMessage: true
            });
            
            // 等待Toast创建
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(document.querySelector('.error-toast')).toBeTruthy();
            
            // 等待Toast移除
            await new Promise(resolve => setTimeout(resolve, 500));
            expect(document.querySelector('.error-toast')).toBe(null);
        });
    });
    
    describe('错误监听器', () => {
        test('应该正确添加和移除错误监听器', () => {
            const listener = jest.fn();
            
            errorManager.addErrorListener(listener);
            expect(errorManager.errorListeners.has(listener)).toBe(true);
            
            errorManager.removeErrorListener(listener);
            expect(errorManager.errorListeners.has(listener)).toBe(false);
        });
        
        test('应该通知错误监听器', async () => {
            const listener = jest.fn();
            errorManager.addErrorListener(listener);
            
            const error = new Error('test error');
            await errorManager.handleError(error);
            
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                message: 'test error',
                type: expect.any(String)
            }));
        });
    });
    
    describe('错误统计', () => {
        test('应该生成正确的错误统计', async () => {
            // 添加不同类型的错误
            await errorManager.handleError(new Error('validation error'), { type: 'validation' });
            await errorManager.handleError(new Error('network error'), { type: 'network' });
            await errorManager.handleError(new Error('another validation error'), { type: 'validation' });
            
            const stats = errorManager.getErrorStats();
            
            expect(stats.total).toBe(3);
            expect(stats.byType.validation).toBe(2);
            expect(stats.byType.network).toBe(1);
            expect(stats.recent.length).toBe(3);
        });
    });
    
    describe('存储管理', () => {
        test('应该保存和加载错误历史', async () => {
            const error = new Error('test error');
            await errorManager.handleError(error);
            
            // 手动保存错误历史
            errorManager.saveErrorHistory();
            
            // 验证localStorage.setItem被调用
            expect(localStorage.setItem).toHaveBeenCalledWith('error_history', expect.any(String));
            
            // 模拟localStorage.getItem返回保存的数据
            const mockData = JSON.stringify([{id: 'test', message: 'test error'}]);
            localStorage.getItem.mockReturnValue(mockData);
            
            // 创建新的ErrorManager实例
            const newManager = new ErrorManager();
            await newManager.init();
            
            expect(localStorage.getItem).toHaveBeenCalledWith('error_history');
            
            newManager.destroy();
        });
        
        test('应该清除错误历史', async () => {
            // 先清理之前的错误历史
            errorManager.clearErrorHistory();
            
            await errorManager.handleError(new Error('test error'));
            expect(errorManager.errorHistory.length).toBe(1);
            
            errorManager.clearErrorHistory();
            expect(errorManager.errorHistory.length).toBe(0);
        });
        
        test('应该清理存储空间', () => {
            // 模拟localStorage.key和localStorage.length
            const mockKeys = ['temp_item1', 'cache_item1', 'permanent_item'];
            Object.defineProperty(localStorage, 'length', {
                value: mockKeys.length,
                writable: true
            });
            localStorage.key = jest.fn((index) => mockKeys[index]);
            
            errorManager.cleanupStorage();
            
            // 验证removeItem被调用来清理临时项
            expect(localStorage.removeItem).toHaveBeenCalledWith('temp_item1');
            expect(localStorage.removeItem).toHaveBeenCalledWith('cache_item1');
            // 验证permanent_item没有被清理
            expect(localStorage.removeItem).not.toHaveBeenCalledWith('permanent_item');
        });
    });
    
    describe('工具方法', () => {
        test('应该生成唯一的错误ID', () => {
            const id1 = errorManager.generateErrorId();
            const id2 = errorManager.generateErrorId();
            
            expect(id1).toMatch(/^error_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^error_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
        
        test('应该正确延迟执行', async () => {
            const start = Date.now();
            await errorManager.delay(100);
            const end = Date.now();
            
            expect(end - start).toBeGreaterThanOrEqual(90); // 允许一些误差
        });
    });
});