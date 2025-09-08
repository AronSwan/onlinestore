/**
 * @fileoverview NotificationConfig 测试套件
 * @description 测试通知配置管理器的功能，包括配置获取、验证和通知系统相关方法
 */

const { NotificationConfig, notificationConfig } = require('../../js/config/NotificationConfig');

describe('NotificationConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default notification configuration', () => {
            expect(notificationConfig.get('enabled')).toBe(true);
            expect(notificationConfig.get('position')).toBe('top-right');
            expect(notificationConfig.get('duration')).toBe(3000);
            expect(notificationConfig.get('maxVisible')).toBe(5);
        });

        test('should freeze configuration object', () => {
            const config = notificationConfig.getAll();
            expect(() => {
                config.enabled = false;
            }).toThrow();
        });
    });

    describe('Configuration Access', () => {
        test('should get configuration values by key', () => {
            expect(notificationConfig.get('enabled')).toBe(true);
            expect(notificationConfig.get('position')).toBe('top-right');
            expect(notificationConfig.get('duration')).toBe(3000);
            expect(notificationConfig.get('maxVisible')).toBe(5);
        });

        test('should return undefined for non-existent keys', () => {
            expect(notificationConfig.get('nonexistent.key')).toBeUndefined();
        });

        test('should check if configuration key exists', () => {
            expect(notificationConfig.has('enabled')).toBe(true);
            expect(notificationConfig.has('position')).toBe(true);
            expect(notificationConfig.has('nonexistent.key')).toBe(false);
        });

        test('should return all configuration', () => {
            const config = notificationConfig.getAll();
            expect(config).toHaveProperty('enabled');
            expect(config).toHaveProperty('position');
            expect(config).toHaveProperty('duration');
            expect(config).toHaveProperty('maxVisible');
            expect(config).toHaveProperty('types');
        });
    });

    describe('Notification Settings', () => {
        test('should check if notifications are enabled', () => {
            expect(notificationConfig.isEnabled()).toBe(true);
        });

        test('should get notification position', () => {
            expect(notificationConfig.getPosition()).toBe('top-right');
        });

        test('should get notification duration', () => {
            expect(notificationConfig.getDuration()).toBe(3000);
            expect(notificationConfig.getDuration()).toBeGreaterThan(0);
        });

        test('should get maximum visible notifications', () => {
            expect(notificationConfig.getMaxVisible()).toBe(5);
            expect(notificationConfig.getMaxVisible()).toBeGreaterThan(0);
        });

        test('should get notification types configuration', () => {
            const types = notificationConfig.getTypes();
            expect(types).toHaveProperty('success');
            expect(types).toHaveProperty('error');
            expect(types).toHaveProperty('warning');
            expect(types).toHaveProperty('info');
        });
    });

    describe('Notification Types', () => {
        test('should get success notification settings', () => {
            const successConfig = notificationConfig.getTypeConfig('success');
            expect(successConfig).toHaveProperty('icon', '✓');
            expect(successConfig).toHaveProperty('className', 'notification-success');
            expect(successConfig).toHaveProperty('duration', 3000);
        });

        test('should get error notification settings', () => {
            const errorConfig = notificationConfig.getTypeConfig('error');
            expect(errorConfig).toHaveProperty('icon', '✗');
            expect(errorConfig).toHaveProperty('className', 'notification-error');
            expect(errorConfig).toHaveProperty('duration', 5000);
        });

        test('should get warning notification settings', () => {
            const warningConfig = notificationConfig.getTypeConfig('warning');
            expect(warningConfig).toHaveProperty('icon', '⚠');
            expect(warningConfig).toHaveProperty('className', 'notification-warning');
            expect(warningConfig).toHaveProperty('duration', 4000);
        });

        test('should get info notification settings', () => {
            const infoConfig = notificationConfig.getTypeConfig('info');
            expect(infoConfig).toHaveProperty('icon', 'ℹ');
            expect(infoConfig).toHaveProperty('className', 'notification-info');
            expect(infoConfig).toHaveProperty('duration', 3000);
        });

        test('should return undefined for invalid notification type', () => {
            expect(notificationConfig.getTypeConfig('invalid')).toBeUndefined();
            expect(notificationConfig.getTypeConfig('')).toBeUndefined();
            expect(notificationConfig.getTypeConfig(null)).toBeUndefined();
        });
    });

    describe('Position Validation', () => {
        test('should validate valid positions', () => {
            const validPositions = [
                'top-left', 'top-center', 'top-right',
                'bottom-left', 'bottom-center', 'bottom-right'
            ];

            validPositions.forEach(position => {
                expect(notificationConfig.isValidPosition(position)).toBe(true);
            });
        });

        test('should reject invalid positions', () => {
            const invalidPositions = [
                'center', 'left', 'right', 'top', 'bottom',
                'middle-center', 'invalid-position', '', null, undefined
            ];

            invalidPositions.forEach(position => {
                expect(notificationConfig.isValidPosition(position)).toBe(false);
            });
        });
    });

    describe('Duration Validation', () => {
        test('should validate positive durations', () => {
            expect(notificationConfig.isValidDuration(1000)).toBe(true);
            expect(notificationConfig.isValidDuration(3000)).toBe(true);
            expect(notificationConfig.isValidDuration(10000)).toBe(true);
        });

        test('should reject invalid durations', () => {
            expect(notificationConfig.isValidDuration(0)).toBe(false);
            expect(notificationConfig.isValidDuration(-1000)).toBe(false);
            expect(notificationConfig.isValidDuration(null)).toBe(false);
            expect(notificationConfig.isValidDuration(undefined)).toBe(false);
            expect(notificationConfig.isValidDuration('3000')).toBe(false);
        });
    });

    describe('Notification Creation Helper', () => {
        test('should create notification options for success type', () => {
            const options = notificationConfig.createNotificationOptions('success', 'Test message');
            expect(options).toHaveProperty('type', 'success');
            expect(options).toHaveProperty('message', 'Test message');
            expect(options).toHaveProperty('icon', '✓');
            expect(options).toHaveProperty('className', 'notification-success');
            expect(options).toHaveProperty('duration', 3000);
        });

        test('should create notification options for error type', () => {
            const options = notificationConfig.createNotificationOptions('error', 'Error message');
            expect(options).toHaveProperty('type', 'error');
            expect(options).toHaveProperty('message', 'Error message');
            expect(options).toHaveProperty('icon', '✗');
            expect(options).toHaveProperty('className', 'notification-error');
            expect(options).toHaveProperty('duration', 5000);
        });

        test('should handle invalid notification type gracefully', () => {
            const options = notificationConfig.createNotificationOptions('invalid', 'Test message');
            expect(options).toBeNull();
        });

        test('should handle empty message gracefully', () => {
            const options = notificationConfig.createNotificationOptions('info', '');
            expect(options).toBeNull();
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid key gracefully', () => {
            expect(() => notificationConfig.get(null)).not.toThrow();
            expect(() => notificationConfig.get(undefined)).not.toThrow();
            expect(() => notificationConfig.has('')).not.toThrow();
        });

        test('should return consistent results for empty keys', () => {
            expect(notificationConfig.get('')).toBeUndefined();
            expect(notificationConfig.has('')).toBe(false);
        });

        test('should handle method calls when disabled', () => {
            expect(() => notificationConfig.getPosition()).not.toThrow();
            expect(() => notificationConfig.getDuration()).not.toThrow();
            expect(() => notificationConfig.getTypes()).not.toThrow();
        });
    });

    describe('Integration Tests', () => {
        test('should work with notification system workflow', () => {
            const isEnabled = notificationConfig.isEnabled();
            const position = notificationConfig.getPosition();
            const duration = notificationConfig.getDuration();
            const maxVisible = notificationConfig.getMaxVisible();
            const types = notificationConfig.getTypes();

            expect(typeof isEnabled).toBe('boolean');
            expect(typeof position).toBe('string');
            expect(typeof duration).toBe('number');
            expect(typeof maxVisible).toBe('number');
            expect(typeof types).toBe('object');
        });

        test('should provide complete configuration for notification display', () => {
            const config = notificationConfig.getAll();

            // 验证必要的配置项存在
            expect(config.enabled).toBeDefined();
            expect(config.position).toBeDefined();
            expect(config.duration).toBeDefined();
            expect(config.maxVisible).toBeDefined();
            expect(config.types).toBeDefined();

            // 验证配置值的合理性
            expect(config.duration).toBeGreaterThan(0);
            expect(config.maxVisible).toBeGreaterThan(0);
            expect(notificationConfig.isValidPosition(config.position)).toBe(true);
        });

        test('should maintain configuration consistency', () => {
            const config = notificationConfig.getAll();
            const position = notificationConfig.getPosition();
            const duration = notificationConfig.getDuration();
            const types = notificationConfig.getTypes();

            expect(config.position).toBe(position);
            expect(config.duration).toBe(duration);
            expect(config.types).toEqual(types);
        });
    });

    describe('Singleton Pattern', () => {
        test('should maintain singleton instance', () => {
            const instance1 = new NotificationConfig();
            const instance2 = new NotificationConfig();
            expect(instance1.getAll()).toEqual(instance2.getAll());
        });
    });
});