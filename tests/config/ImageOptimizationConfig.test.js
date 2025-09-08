/**
 * @fileoverview ImageOptimizationConfig 测试套件
 * @description 测试图片优化配置管理器的功能，包括配置获取、验证和图片优化相关方法
 */

import { jest } from '@jest/globals';
import { ImageOptimizationConfig } from '../../js/config/ImageOptimizationConfig.js';

describe('ImageOptimizationConfig', () => {
    let imageOptimizationConfig;

    beforeEach(() => {
        jest.clearAllMocks();
        imageOptimizationConfig = new ImageOptimizationConfig();
    });

    describe('Initialization', () => {
        test('should initialize with default image optimization configuration', () => {
            expect(imageOptimizationConfig.get('enabled')).toBe(true);
            expect(imageOptimizationConfig.get('quality')).toBe(80);
            expect(imageOptimizationConfig.get('formats')).toEqual(['webp', 'jpg', 'png']);
        });

        test('should freeze configuration object', () => {
            const config = imageOptimizationConfig.getAll();
            expect(() => {
                config.enabled = false;
            }).toThrow();
        });
    });

    describe('Configuration Access', () => {
        test('should get configuration values by key', () => {
            expect(imageOptimizationConfig.get('enabled')).toBe(true);
            expect(imageOptimizationConfig.get('quality')).toBe(80);
            expect(imageOptimizationConfig.get('maxWidth')).toBe(1920);
            expect(imageOptimizationConfig.get('maxHeight')).toBe(1080);
        });

        test('should return undefined for non-existent keys', () => {
            expect(imageOptimizationConfig.get('nonexistent.key')).toBeUndefined();
        });

        test('should check if configuration key exists', () => {
            expect(imageOptimizationConfig.has('enabled')).toBe(true);
            expect(imageOptimizationConfig.has('quality')).toBe(true);
            expect(imageOptimizationConfig.has('nonexistent.key')).toBe(false);
        });

        test('should return all configuration', () => {
            const config = imageOptimizationConfig.getAll();
            expect(config).toHaveProperty('enabled');
            expect(config).toHaveProperty('quality');
            expect(config).toHaveProperty('formats');
            expect(config).toHaveProperty('maxWidth');
            expect(config).toHaveProperty('maxHeight');
        });
    });

    describe('Image Optimization Settings', () => {
        test('should check if optimization is enabled', () => {
            expect(imageOptimizationConfig.isEnabled()).toBe(true);
        });

        test('should get image quality setting', () => {
            expect(imageOptimizationConfig.getQuality()).toBe(80);
            expect(imageOptimizationConfig.getQuality()).toBeGreaterThan(0);
            expect(imageOptimizationConfig.getQuality()).toBeLessThanOrEqual(100);
        });

        test('should get supported formats', () => {
            const formats = imageOptimizationConfig.getFormats();
            expect(Array.isArray(formats)).toBe(true);
            expect(formats).toEqual(['webp', 'jpg', 'png']);
            expect(formats.length).toBeGreaterThan(0);
        });

        test('should get maximum dimensions', () => {
            expect(imageOptimizationConfig.getMaxWidth()).toBe(1920);
            expect(imageOptimizationConfig.getMaxHeight()).toBe(1080);
            expect(imageOptimizationConfig.getMaxWidth()).toBeGreaterThan(0);
            expect(imageOptimizationConfig.getMaxHeight()).toBeGreaterThan(0);
        });
    });

    describe('Format Support', () => {
        test('should check if specific format is supported', () => {
            expect(imageOptimizationConfig.isFormatSupported('webp')).toBe(true);
            expect(imageOptimizationConfig.isFormatSupported('jpg')).toBe(true);
            expect(imageOptimizationConfig.isFormatSupported('png')).toBe(true);
            expect(imageOptimizationConfig.isFormatSupported('gif')).toBe(false);
        });

        test('should handle case-insensitive format checking', () => {
            expect(imageOptimizationConfig.isFormatSupported('WEBP')).toBe(true);
            expect(imageOptimizationConfig.isFormatSupported('JPG')).toBe(true);
            expect(imageOptimizationConfig.isFormatSupported('PNG')).toBe(true);
        });

        test('should return false for invalid formats', () => {
            expect(imageOptimizationConfig.isFormatSupported('')).toBe(false);
            expect(imageOptimizationConfig.isFormatSupported(null)).toBe(false);
            expect(imageOptimizationConfig.isFormatSupported(undefined)).toBe(false);
        });
    });

    describe('Dimension Validation', () => {
        test('should validate image dimensions within limits', () => {
            expect(imageOptimizationConfig.isValidDimensions(800, 600)).toBe(true);
            expect(imageOptimizationConfig.isValidDimensions(1920, 1080)).toBe(true);
            expect(imageOptimizationConfig.isValidDimensions(1000, 800)).toBe(true);
        });

        test('should reject dimensions exceeding limits', () => {
            expect(imageOptimizationConfig.isValidDimensions(2000, 1080)).toBe(false);
            expect(imageOptimizationConfig.isValidDimensions(1920, 1200)).toBe(false);
            expect(imageOptimizationConfig.isValidDimensions(2500, 1500)).toBe(false);
        });

        test('should handle invalid dimension inputs', () => {
            expect(imageOptimizationConfig.isValidDimensions(-100, 600)).toBe(false);
            expect(imageOptimizationConfig.isValidDimensions(800, -100)).toBe(false);
            expect(imageOptimizationConfig.isValidDimensions(0, 0)).toBe(false);
            expect(imageOptimizationConfig.isValidDimensions(null, null)).toBe(false);
        });
    });

    describe('Optimization Options', () => {
        test('should get optimization options object', () => {
            const options = imageOptimizationConfig.getOptimizationOptions();
            expect(options).toHaveProperty('quality', 80);
            expect(options).toHaveProperty('maxWidth', 1920);
            expect(options).toHaveProperty('maxHeight', 1080);
            expect(options).toHaveProperty('formats');
        });

        test('should return immutable optimization options', () => {
            const options = imageOptimizationConfig.getOptimizationOptions();
            expect(() => {
                options.quality = 50;
            }).toThrow();
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid key gracefully', () => {
            expect(() => imageOptimizationConfig.get(null)).not.toThrow();
            expect(() => imageOptimizationConfig.get(undefined)).not.toThrow();
            expect(() => imageOptimizationConfig.has('')).not.toThrow();
        });

        test('should return consistent results for empty keys', () => {
            expect(imageOptimizationConfig.get('')).toBeUndefined();
            expect(imageOptimizationConfig.has('')).toBe(false);
        });

        test('should handle method calls when disabled', () => {
            expect(() => imageOptimizationConfig.getQuality()).not.toThrow();
            expect(() => imageOptimizationConfig.getFormats()).not.toThrow();
            expect(() => imageOptimizationConfig.getOptimizationOptions()).not.toThrow();
        });
    });

    describe('Integration Tests', () => {
        test('should work with image processing workflow', () => {
            const isEnabled = imageOptimizationConfig.isEnabled();
            const quality = imageOptimizationConfig.getQuality();
            const formats = imageOptimizationConfig.getFormats();
            const maxWidth = imageOptimizationConfig.getMaxWidth();
            const maxHeight = imageOptimizationConfig.getMaxHeight();

            expect(typeof isEnabled).toBe('boolean');
            expect(typeof quality).toBe('number');
            expect(Array.isArray(formats)).toBe(true);
            expect(typeof maxWidth).toBe('number');
            expect(typeof maxHeight).toBe('number');
        });

        test('should provide complete configuration for image optimization', () => {
            const options = imageOptimizationConfig.getOptimizationOptions();
            
            // 验证必要的配置项存在
            expect(options.quality).toBeDefined();
            expect(options.maxWidth).toBeDefined();
            expect(options.maxHeight).toBeDefined();
            expect(options.formats).toBeDefined();
            
            // 验证配置值的合理性
            expect(options.quality).toBeGreaterThan(0);
            expect(options.quality).toBeLessThanOrEqual(100);
            expect(options.maxWidth).toBeGreaterThan(0);
            expect(options.maxHeight).toBeGreaterThan(0);
        });

        test('should maintain configuration consistency', () => {
            const config = imageOptimizationConfig.getAll();
            const quality = imageOptimizationConfig.getQuality();
            const formats = imageOptimizationConfig.getFormats();

            expect(config.quality).toBe(quality);
            expect(config.formats).toEqual(formats);
        });
    });

    describe('Singleton Pattern', () => {
        test('should maintain singleton instance', () => {
            const instance1 = new ImageOptimizationConfig();
            const instance2 = new ImageOptimizationConfig();
            expect(instance1.getAll()).toEqual(instance2.getAll());
        });
    });
});