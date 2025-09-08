/**
 * @fileoverview DebugConfig 测试套件
 * @description 测试调试配置管理器的功能，包括配置获取、验证和调试相关方法
 */

const { DebugConfig, debugConfig } = require('../../js/config/DebugConfig');

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// Mock console methods
const consoleMock = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    trace: jest.fn(),
    group: jest.fn(),
    groupEnd: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn()
};
Object.defineProperty(window, 'console', {
    value: consoleMock
});

describe('DebugConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    describe('Initialization', () => {
        test('should initialize with default debug configuration', () => {
            const testConfig = new DebugConfig();
            expect(testConfig.get('enabled')).toBe(false);
            expect(testConfig.get('level')).toBe('warn');
            expect(testConfig.get('showTimestamp')).toBe(true);
            expect(testConfig.get('showStackTrace')).toBe(false);
        });

        test('should check localStorage for debug settings', () => {
            expect(localStorageMock.getItem).toHaveBeenCalledWith('debug_enabled');
            expect(localStorageMock.getItem).toHaveBeenCalledWith('debug_level');
        });

        test('should enable debug mode when localStorage flag is set', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                if (key === 'debug_level') return 'debug';
                return null;
            });

            const config = new DebugConfig();
            expect(config.get('enabled')).toBe(true);
            expect(config.get('level')).toBe('debug');
        });

        test('should freeze configuration object', () => {
            const testConfig = new DebugConfig();
            const config = testConfig.getAll();
            expect(() => {
                config.enabled = true;
            }).toThrow();
        });
    });

    describe('Configuration Access', () => {
        test('should get configuration values by key', () => {
            expect(debugConfig.get('enabled')).toBe(false);
            expect(debugConfig.get('level')).toBe('warn');
            expect(debugConfig.get('showTimestamp')).toBe(true);
            expect(debugConfig.get('showStackTrace')).toBe(false);
        });

        test('should return undefined for non-existent keys', () => {
            expect(debugConfig.get('nonexistent.key')).toBeUndefined();
        });

        test('should check if configuration key exists', () => {
            expect(debugConfig.has('enabled')).toBe(true);
            expect(debugConfig.has('level')).toBe(true);
            expect(debugConfig.has('nonexistent.key')).toBe(false);
        });

        test('should return all configuration', () => {
            const config = debugConfig.getAll();
            expect(config).toHaveProperty('enabled');
            expect(config).toHaveProperty('level');
            expect(config).toHaveProperty('showTimestamp');
            expect(config).toHaveProperty('showStackTrace');
            expect(config).toHaveProperty('console');
            expect(config).toHaveProperty('network');
            expect(config).toHaveProperty('performance');
        });
    });

    describe('Debug Settings', () => {
        test('should check if debug is enabled', () => {
            expect(debugConfig.isEnabled()).toBe(false);
        });

        test('should get debug level', () => {
            expect(debugConfig.getLevel()).toBe('warn');
        });

        test('should check if timestamp should be shown', () => {
            expect(debugConfig.shouldShowTimestamp()).toBe(true);
        });

        test('should check if stack trace should be shown', () => {
            expect(debugConfig.shouldShowStackTrace()).toBe(false);
        });

        test('should get console configuration', () => {
            const consoleConfig = debugConfig.getConsoleConfig();
            expect(consoleConfig).toHaveProperty('enabled');
            expect(consoleConfig).toHaveProperty('level');
            expect(consoleConfig).toHaveProperty('colors');
            expect(consoleConfig).toHaveProperty('grouping');
        });

        test('should get network debugging configuration', () => {
            const networkConfig = debugConfig.getNetworkConfig();
            expect(networkConfig).toHaveProperty('enabled');
            expect(networkConfig).toHaveProperty('logRequests');
            expect(networkConfig).toHaveProperty('logResponses');
            expect(networkConfig).toHaveProperty('logErrors');
        });

        test('should get performance debugging configuration', () => {
            const perfConfig = debugConfig.getPerformanceConfig();
            expect(perfConfig).toHaveProperty('enabled');
            expect(perfConfig).toHaveProperty('timing');
            expect(perfConfig).toHaveProperty('memory');
            expect(perfConfig).toHaveProperty('fps');
        });
    });

    describe('Log Level Management', () => {
        test('should validate log levels', () => {
            expect(debugConfig.isValidLevel('debug')).toBe(true);
            expect(debugConfig.isValidLevel('info')).toBe(true);
            expect(debugConfig.isValidLevel('warn')).toBe(true);
            expect(debugConfig.isValidLevel('error')).toBe(true);
            expect(debugConfig.isValidLevel('invalid')).toBe(false);
        });

        test('should get log level priority', () => {
            expect(debugConfig.getLevelPriority('debug')).toBe(0);
            expect(debugConfig.getLevelPriority('info')).toBe(1);
            expect(debugConfig.getLevelPriority('warn')).toBe(2);
            expect(debugConfig.getLevelPriority('error')).toBe(3);
        });

        test('should check if level should be logged', () => {
            // 当前级别是 warn (priority 2)
            expect(debugConfig.shouldLog('debug')).toBe(false); // priority 0 < 2
            expect(debugConfig.shouldLog('info')).toBe(false);  // priority 1 < 2
            expect(debugConfig.shouldLog('warn')).toBe(true);   // priority 2 >= 2
            expect(debugConfig.shouldLog('error')).toBe(true);  // priority 3 >= 2
        });

        test('should get available log levels', () => {
            const levels = debugConfig.getAvailableLevels();
            expect(levels).toContain('debug');
            expect(levels).toContain('info');
            expect(levels).toContain('warn');
            expect(levels).toContain('error');
        });
    });

    describe('Message Formatting', () => {
        test('should format log message with timestamp', () => {
            const message = debugConfig.formatMessage('info', 'Test message');
            expect(message).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] \[INFO\] Test message/);
        });

        test('should format log message without timestamp when disabled', () => {
            // 创建一个禁用时间戳的配置
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_timestamp') return 'false';
                return null;
            });

            const config = new DebugConfig();
            const message = config.formatMessage('info', 'Test message');
            expect(message).toBe('[INFO] Test message');
        });

        test('should format message with context', () => {
            const context = { userId: 123, action: 'login' };
            const message = debugConfig.formatMessage('info', 'User action', context);
            expect(message).toContain('Test message');
            expect(message).toContain('userId: 123');
            expect(message).toContain('action: login');
        });

        test('should format error message with stack trace', () => {
            const error = new Error('Test error');
            const message = debugConfig.formatErrorMessage(error);
            expect(message).toContain('Test error');
            expect(message).toContain('Error:');
        });

        test('should get timestamp string', () => {
            const timestamp = debugConfig.getTimestamp();
            expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
        });
    });

    describe('Console Integration', () => {
        test('should log debug message when enabled and level allows', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                if (key === 'debug_level') return 'debug';
                return null;
            });

            const config = new DebugConfig();
            config.log('debug', 'Test debug message');
            expect(consoleMock.debug).toHaveBeenCalled();
        });

        test('should not log debug message when disabled', () => {
            debugConfig.log('debug', 'Test debug message');
            expect(consoleMock.debug).not.toHaveBeenCalled();
        });

        test('should log warn message when level allows', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                return null;
            });

            const config = new DebugConfig();
            config.log('warn', 'Test warning');
            expect(consoleMock.warn).toHaveBeenCalled();
        });

        test('should log error message when level allows', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                return null;
            });

            const config = new DebugConfig();
            config.log('error', 'Test error');
            expect(consoleMock.error).toHaveBeenCalled();
        });

        test('should create console group', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                return null;
            });

            const config = new DebugConfig();
            config.group('Test Group');
            expect(consoleMock.group).toHaveBeenCalledWith('Test Group');
        });

        test('should end console group', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                return null;
            });

            const config = new DebugConfig();
            config.groupEnd();
            expect(consoleMock.groupEnd).toHaveBeenCalled();
        });
    });

    describe('Performance Debugging', () => {
        test('should start performance timer', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                return null;
            });

            const config = new DebugConfig();
            config.time('test-timer');
            expect(consoleMock.time).toHaveBeenCalledWith('test-timer');
        });

        test('should end performance timer', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                return null;
            });

            const config = new DebugConfig();
            config.timeEnd('test-timer');
            expect(consoleMock.timeEnd).toHaveBeenCalledWith('test-timer');
        });

        test('should not start timer when performance debugging is disabled', () => {
            debugConfig.time('test-timer');
            expect(consoleMock.time).not.toHaveBeenCalled();
        });

        test('should measure execution time', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                return null;
            });

            const config = new DebugConfig();
            const result = config.measure('test-operation', () => {
                return 'test result';
            });

            expect(result).toBe('test result');
            expect(consoleMock.time).toHaveBeenCalled();
            expect(consoleMock.timeEnd).toHaveBeenCalled();
        });
    });

    describe('Network Debugging', () => {
        test('should check if network logging is enabled', () => {
            expect(typeof debugConfig.isNetworkLoggingEnabled()).toBe('boolean');
        });

        test('should check if request logging is enabled', () => {
            expect(typeof debugConfig.shouldLogRequests()).toBe('boolean');
        });

        test('should check if response logging is enabled', () => {
            expect(typeof debugConfig.shouldLogResponses()).toBe('boolean');
        });

        test('should check if error logging is enabled', () => {
            expect(typeof debugConfig.shouldLogErrors()).toBe('boolean');
        });

        test('should log network request', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                return null;
            });

            const config = new DebugConfig();
            const request = {
                method: 'GET',
                url: '/api/users',
                headers: { 'Content-Type': 'application/json' }
            };

            config.logRequest(request);
            expect(consoleMock.log).toHaveBeenCalled();
        });

        test('should log network response', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                return null;
            });

            const config = new DebugConfig();
            const response = {
                status: 200,
                statusText: 'OK',
                data: { users: [] }
            };

            config.logResponse(response);
            expect(consoleMock.log).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid key gracefully', () => {
            expect(() => debugConfig.get(null)).not.toThrow();
            expect(() => debugConfig.get(undefined)).not.toThrow();
            expect(() => debugConfig.has('')).not.toThrow();
        });

        test('should return consistent results for empty keys', () => {
            expect(debugConfig.get('')).toBeUndefined();
            expect(debugConfig.has('')).toBe(false);
        });

        test('should handle method calls with invalid parameters', () => {
            expect(() => debugConfig.log()).not.toThrow();
            expect(() => debugConfig.formatMessage()).not.toThrow();
            expect(() => debugConfig.isValidLevel()).not.toThrow();
        });

        test('should handle localStorage errors gracefully', () => {
            localStorageMock.getItem.mockImplementation(() => {
                throw new Error('localStorage error');
            });

            expect(() => new DebugConfig()).not.toThrow();
        });

        test('should handle console method errors gracefully', () => {
            consoleMock.log.mockImplementation(() => {
                throw new Error('Console error');
            });

            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                return null;
            });

            const config = new DebugConfig();
            expect(() => config.log('info', 'Test message')).not.toThrow();
        });
    });

    describe('Integration Tests', () => {
        test('should work with complete debugging workflow', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'debug_enabled') return 'true';
                if (key === 'debug_level') return 'debug';
                return null;
            });

            const config = new DebugConfig();

            expect(config.isEnabled()).toBe(true);
            expect(config.getLevel()).toBe('debug');
            expect(config.shouldLog('debug')).toBe(true);

            config.log('debug', 'Test message');
            expect(consoleMock.debug).toHaveBeenCalled();
        });

        test('should provide complete configuration for debugging', () => {
            const config = debugConfig.getAll();

            // 验证必要的配置项存在
            expect(config.enabled).toBeDefined();
            expect(config.level).toBeDefined();
            expect(config.console).toBeDefined();
            expect(config.network).toBeDefined();
            expect(config.performance).toBeDefined();

            // 验证配置值的合理性
            expect(typeof config.enabled).toBe('boolean');
            expect(typeof config.level).toBe('string');
        });

        test('should maintain configuration consistency', () => {
            const config = debugConfig.getAll();
            const enabled = debugConfig.isEnabled();
            const level = debugConfig.getLevel();
            const consoleConfig = debugConfig.getConsoleConfig();

            expect(config.enabled).toBe(enabled);
            expect(config.level).toBe(level);
            expect(config.console).toEqual(consoleConfig);
        });
    });

    describe('Singleton Pattern', () => {
        test('should maintain singleton instance', () => {
            const instance1 = new DebugConfig();
            const instance2 = new DebugConfig();
            expect(instance1.getAll()).toEqual(instance2.getAll());
        });
    });
});