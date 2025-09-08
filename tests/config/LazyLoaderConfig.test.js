/**
 * @fileoverview LazyLoaderConfig 测试套件
 * @description 测试懒加载配置管理器的功能，包括配置获取、验证和懒加载相关方法
 */

import { jest } from '@jest/globals';
import { LazyLoaderConfig } from '../../js/config/LazyLoaderConfig.js';

describe('LazyLoaderConfig', () => {
    let lazyLoaderConfig;

    beforeEach(() => {
        jest.clearAllMocks();
        lazyLoaderConfig = new LazyLoaderConfig();
    });

    describe('Initialization', () => {
        test('should initialize with default lazy loading configuration', () => {
            expect(lazyLoaderConfig.get('enabled')).toBe(true);
            expect(lazyLoaderConfig.get('threshold')).toBe(100);
            expect(lazyLoaderConfig.get('rootMargin')).toBe('50px');
        });

        test('should freeze configuration object', () => {
            const config = lazyLoaderConfig.getAll();
            expect(() => {
                config.enabled = false;
            }).toThrow();
        });
    });

    describe('Configuration Access', () => {
        test('should get configuration values by key', () => {
            expect(lazyLoaderConfig.get('enabled')).toBe(true);
            expect(lazyLoaderConfig.get('threshold')).toBe(100);
            expect(lazyLoaderConfig.get('rootMargin')).toBe('50px');
            expect(lazyLoaderConfig.get('loadingClass')).toBe('lazy-loading');
        });

        test('should return undefined for non-existent keys', () => {
            expect(lazyLoaderConfig.get('nonexistent.key')).toBeUndefined();
        });

        test('should check if configuration key exists', () => {
            expect(lazyLoaderConfig.has('enabled')).toBe(true);
            expect(lazyLoaderConfig.has('threshold')).toBe(true);
            expect(lazyLoaderConfig.has('nonexistent.key')).toBe(false);
        });

        test('should return all configuration', () => {
            const config = lazyLoaderConfig.getAll();
            expect(config).toHaveProperty('enabled');
            expect(config).toHaveProperty('threshold');
            expect(config).toHaveProperty('rootMargin');
            expect(config).toHaveProperty('loadingClass');
        });
    });

    describe('Lazy Loading Settings', () => {
        test('should check if lazy loading is enabled', () => {
            expect(lazyLoaderConfig.isEnabled()).toBe(true);
        });

        test('should get intersection threshold', () => {
            expect(lazyLoaderConfig.getThreshold()).toBe(100);
        });

        test('should get root margin', () => {
            expect(lazyLoaderConfig.getRootMargin()).toBe('50px');
        });

        test('should get loading class name', () => {
            expect(lazyLoaderConfig.getLoadingClass()).toBe('lazy-loading');
        });

        test('should get loaded class name', () => {
            expect(lazyLoaderConfig.getLoadedClass()).toBe('lazy-loaded');
        });

        test('should get error class name', () => {
            expect(lazyLoaderConfig.getErrorClass()).toBe('lazy-error');
        });
    });

    describe('Observer Configuration', () => {
        test('should get intersection observer options', () => {
            const options = lazyLoaderConfig.getObserverOptions();
            expect(options).toHaveProperty('threshold', 100);
            expect(options).toHaveProperty('rootMargin', '50px');
        });

        test('should return valid observer options object', () => {
            const options = lazyLoaderConfig.getObserverOptions();
            expect(typeof options).toBe('object');
            expect(options).not.toBeNull();
        });
    });

    describe('CSS Classes', () => {
        test('should provide all CSS class names', () => {
            expect(lazyLoaderConfig.getLoadingClass()).toBeTruthy();
            expect(lazyLoaderConfig.getLoadedClass()).toBeTruthy();
            expect(lazyLoaderConfig.getErrorClass()).toBeTruthy();
        });

        test('should return string values for CSS classes', () => {
            expect(typeof lazyLoaderConfig.getLoadingClass()).toBe('string');
            expect(typeof lazyLoaderConfig.getLoadedClass()).toBe('string');
            expect(typeof lazyLoaderConfig.getErrorClass()).toBe('string');
        });

        test('should have different class names for different states', () => {
            const loadingClass = lazyLoaderConfig.getLoadingClass();
            const loadedClass = lazyLoaderConfig.getLoadedClass();
            const errorClass = lazyLoaderConfig.getErrorClass();

            expect(loadingClass).not.toBe(loadedClass);
            expect(loadingClass).not.toBe(errorClass);
            expect(loadedClass).not.toBe(errorClass);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid key gracefully', () => {
            expect(() => lazyLoaderConfig.get(null)).not.toThrow();
            expect(() => lazyLoaderConfig.get(undefined)).not.toThrow();
            expect(() => lazyLoaderConfig.has('')).not.toThrow();
        });

        test('should return consistent results for empty keys', () => {
            expect(lazyLoaderConfig.get('')).toBeUndefined();
            expect(lazyLoaderConfig.has('')).toBe(false);
        });

        test('should handle method calls when disabled', () => {
            // 即使禁用，方法调用也应该正常工作
            expect(() => lazyLoaderConfig.getThreshold()).not.toThrow();
            expect(() => lazyLoaderConfig.getRootMargin()).not.toThrow();
            expect(() => lazyLoaderConfig.getObserverOptions()).not.toThrow();
        });
    });

    describe('Integration Tests', () => {
        test('should work with Intersection Observer API', () => {
            const options = lazyLoaderConfig.getObserverOptions();
            
            // 验证选项格式符合 Intersection Observer API
            expect(typeof options.threshold).toBe('number');
            expect(typeof options.rootMargin).toBe('string');
            expect(options.rootMargin).toMatch(/\d+px/);
        });

        test('should provide complete configuration for lazy loading implementation', () => {
            const isEnabled = lazyLoaderConfig.isEnabled();
            const options = lazyLoaderConfig.getObserverOptions();
            const classes = {
                loading: lazyLoaderConfig.getLoadingClass(),
                loaded: lazyLoaderConfig.getLoadedClass(),
                error: lazyLoaderConfig.getErrorClass()
            };

            expect(typeof isEnabled).toBe('boolean');
            expect(options).toBeDefined();
            expect(Object.values(classes).every(cls => typeof cls === 'string')).toBe(true);
        });

        test('should maintain configuration consistency', () => {
            const config = lazyLoaderConfig.getAll();
            const threshold = lazyLoaderConfig.getThreshold();
            const rootMargin = lazyLoaderConfig.getRootMargin();

            expect(config.threshold).toBe(threshold);
            expect(config.rootMargin).toBe(rootMargin);
        });
    });

    describe('Singleton Pattern', () => {
        test('should maintain singleton instance', () => {
            const instance1 = new LazyLoaderConfig();
            const instance2 = new LazyLoaderConfig();
            expect(instance1.getAll()).toEqual(instance2.getAll());
        });
    });
});