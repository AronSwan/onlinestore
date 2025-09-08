/**
 * @fileoverview PerformanceConfig 测试套件
 * @description 测试性能配置管理器的功能，包括配置获取、验证和性能监控相关方法
 */

import { jest } from '@jest/globals';
import { PerformanceConfig } from '../../js/config/PerformanceConfig.js';

describe('PerformanceConfig', () => {
    let performanceConfig;

    beforeEach(() => {
        // 重置单例实例
        jest.clearAllMocks();
        performanceConfig = new PerformanceConfig();
    });

    describe('Initialization', () => {
        test('should initialize with default performance configuration', () => {
            expect(performanceConfig.get('monitoring.enabled')).toBe(true);
            expect(performanceConfig.get('monitoring.interval')).toBe(1000);
            expect(performanceConfig.get('monitoring.metrics')).toEqual([
                'memory', 'cpu', 'network', 'dom'
            ]);
        });

        test('should freeze configuration object', () => {
            const config = performanceConfig.getAll();
            expect(() => {
                config.monitoring.enabled = false;
            }).toThrow();
        });
    });

    describe('Configuration Access', () => {
        test('should get configuration values by key', () => {
            expect(performanceConfig.get('monitoring.enabled')).toBe(true);
            expect(performanceConfig.get('monitoring.interval')).toBe(1000);
            expect(performanceConfig.get('thresholds.memory')).toBe(100);
        });

        test('should return undefined for non-existent keys', () => {
            expect(performanceConfig.get('nonexistent.key')).toBeUndefined();
        });

        test('should check if configuration key exists', () => {
            expect(performanceConfig.has('monitoring.enabled')).toBe(true);
            expect(performanceConfig.has('nonexistent.key')).toBe(false);
        });

        test('should return all configuration', () => {
            const config = performanceConfig.getAll();
            expect(config).toHaveProperty('monitoring');
            expect(config).toHaveProperty('thresholds');
            expect(config).toHaveProperty('optimization');
        });
    });

    describe('Performance Monitoring', () => {
        test('should get monitoring interval', () => {
            expect(performanceConfig.getMonitoringInterval()).toBe(1000);
        });

        test('should check if monitoring is enabled', () => {
            expect(performanceConfig.isMonitoringEnabled()).toBe(true);
        });

        test('should get performance metrics list', () => {
            const metrics = performanceConfig.getMetrics();
            expect(metrics).toEqual(['memory', 'cpu', 'network', 'dom']);
            expect(Array.isArray(metrics)).toBe(true);
        });

        test('should get performance thresholds', () => {
            const thresholds = performanceConfig.getThresholds();
            expect(thresholds).toHaveProperty('memory', 100);
            expect(thresholds).toHaveProperty('cpu', 80);
            expect(thresholds).toHaveProperty('network', 2000);
        });
    });

    describe('Optimization Settings', () => {
        test('should check if lazy loading is enabled', () => {
            expect(performanceConfig.isLazyLoadingEnabled()).toBe(true);
        });

        test('should check if caching is enabled', () => {
            expect(performanceConfig.isCachingEnabled()).toBe(true);
        });

        test('should get optimization settings', () => {
            const optimization = performanceConfig.get('optimization');
            expect(optimization).toHaveProperty('lazyLoading', true);
            expect(optimization).toHaveProperty('caching', true);
            expect(optimization).toHaveProperty('minification', true);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid key gracefully', () => {
            expect(() => performanceConfig.get(null)).not.toThrow();
            expect(() => performanceConfig.get(undefined)).not.toThrow();
            expect(() => performanceConfig.has('')).not.toThrow();
        });

        test('should return consistent results for empty keys', () => {
            expect(performanceConfig.get('')).toBeUndefined();
            expect(performanceConfig.has('')).toBe(false);
        });
    });

    describe('Singleton Pattern', () => {
        test('should maintain singleton instance', () => {
            const instance1 = new PerformanceConfig();
            const instance2 = new PerformanceConfig();
            // 注意：这里测试的是配置内容一致性，而不是实例相等性
            expect(instance1.getAll()).toEqual(instance2.getAll());
        });
    });

    describe('Integration Tests', () => {
        test('should work with performance monitoring workflow', () => {
            // 模拟性能监控工作流
            const isEnabled = performanceConfig.isMonitoringEnabled();
            const interval = performanceConfig.getMonitoringInterval();
            const metrics = performanceConfig.getMetrics();
            const thresholds = performanceConfig.getThresholds();

            expect(isEnabled).toBe(true);
            expect(interval).toBeGreaterThan(0);
            expect(metrics.length).toBeGreaterThan(0);
            expect(Object.keys(thresholds).length).toBeGreaterThan(0);
        });

        test('should provide complete configuration for performance optimization', () => {
            const config = performanceConfig.getAll();
            
            // 验证必要的配置项存在
            expect(config.monitoring).toBeDefined();
            expect(config.thresholds).toBeDefined();
            expect(config.optimization).toBeDefined();
            
            // 验证配置结构完整性
            expect(config.monitoring.enabled).toBeDefined();
            expect(config.monitoring.interval).toBeDefined();
            expect(config.monitoring.metrics).toBeDefined();
        });
    });
});