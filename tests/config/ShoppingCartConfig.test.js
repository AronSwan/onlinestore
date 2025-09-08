/**
 * @fileoverview ShoppingCartConfig 测试套件
 * @description 测试购物车配置管理器的功能，包括配置获取、验证和购物车相关方法
 */

const { ShoppingCartConfig, shoppingCartConfig } = require('../../js/config/ShoppingCartConfig');

describe('ShoppingCartConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default shopping cart configuration', () => {
            expect(shoppingCartConfig.get('maxItems')).toBe(50);
            expect(shoppingCartConfig.get('autoSave')).toBe(true);
            expect(shoppingCartConfig.get('saveInterval')).toBe(5000);
            expect(shoppingCartConfig.get('currency')).toBe('USD');
        });

        test('should freeze configuration object', () => {
            const config = shoppingCartConfig.getAll();
            expect(() => {
                config.maxItems = 100;
            }).toThrow();
        });
    });

    describe('Configuration Access', () => {
        test('should get configuration values by key', () => {
            expect(shoppingCartConfig.get('maxItems')).toBe(50);
            expect(shoppingCartConfig.get('autoSave')).toBe(true);
            expect(shoppingCartConfig.get('saveInterval')).toBe(5000);
            expect(shoppingCartConfig.get('currency')).toBe('USD');
        });

        test('should return undefined for non-existent keys', () => {
            expect(shoppingCartConfig.get('nonexistent.key')).toBeUndefined();
        });

        test('should check if configuration key exists', () => {
            expect(shoppingCartConfig.has('maxItems')).toBe(true);
            expect(shoppingCartConfig.has('autoSave')).toBe(true);
            expect(shoppingCartConfig.has('nonexistent.key')).toBe(false);
        });

        test('should return all configuration', () => {
            const config = shoppingCartConfig.getAll();
            expect(config).toHaveProperty('maxItems');
            expect(config).toHaveProperty('autoSave');
            expect(config).toHaveProperty('saveInterval');
            expect(config).toHaveProperty('currency');
            expect(config).toHaveProperty('validation');
        });
    });

    describe('Shopping Cart Settings', () => {
        test('should get maximum items limit', () => {
            expect(shoppingCartConfig.getMaxItems()).toBe(50);
            expect(shoppingCartConfig.getMaxItems()).toBeGreaterThan(0);
        });

        test('should check if auto save is enabled', () => {
            expect(shoppingCartConfig.isAutoSaveEnabled()).toBe(true);
        });

        test('should get save interval', () => {
            expect(shoppingCartConfig.getSaveInterval()).toBe(5000);
            expect(shoppingCartConfig.getSaveInterval()).toBeGreaterThan(0);
        });

        test('should get currency', () => {
            expect(shoppingCartConfig.getCurrency()).toBe('USD');
        });

        test('should get validation rules', () => {
            const validation = shoppingCartConfig.getValidation();
            expect(validation).toHaveProperty('minQuantity');
            expect(validation).toHaveProperty('maxQuantity');
            expect(validation).toHaveProperty('allowZeroPrice');
            expect(validation).toHaveProperty('requireStock');
        });
    });

    describe('Price Formatting', () => {
        test('should format price with default currency', () => {
            expect(shoppingCartConfig.formatPrice(10.99)).toBe('$10.99');
            expect(shoppingCartConfig.formatPrice(0)).toBe('$0.00');
            expect(shoppingCartConfig.formatPrice(1000)).toBe('$1,000.00');
        });

        test('should format price with custom currency', () => {
            expect(shoppingCartConfig.formatPrice(10.99, 'EUR')).toBe('€10.99');
            expect(shoppingCartConfig.formatPrice(10.99, 'GBP')).toBe('£10.99');
            expect(shoppingCartConfig.formatPrice(10.99, 'JPY')).toBe('¥10.99');
        });

        test('should handle invalid price values', () => {
            expect(shoppingCartConfig.formatPrice(null)).toBe('$0.00');
            expect(shoppingCartConfig.formatPrice(undefined)).toBe('$0.00');
            expect(shoppingCartConfig.formatPrice('invalid')).toBe('$0.00');
            expect(shoppingCartConfig.formatPrice(NaN)).toBe('$0.00');
        });

        test('should handle negative prices', () => {
            expect(shoppingCartConfig.formatPrice(-10.99)).toBe('-$10.99');
        });

        test('should handle very large numbers', () => {
            expect(shoppingCartConfig.formatPrice(1234567.89)).toBe('$1,234,567.89');
        });
    });

    describe('Quantity Validation', () => {
        test('should validate valid quantities', () => {
            expect(shoppingCartConfig.isValidQuantity(1)).toBe(true);
            expect(shoppingCartConfig.isValidQuantity(5)).toBe(true);
            expect(shoppingCartConfig.isValidQuantity(99)).toBe(true);
        });

        test('should reject invalid quantities', () => {
            expect(shoppingCartConfig.isValidQuantity(0)).toBe(false);
            expect(shoppingCartConfig.isValidQuantity(-1)).toBe(false);
            expect(shoppingCartConfig.isValidQuantity(101)).toBe(false); // 超过最大值
            expect(shoppingCartConfig.isValidQuantity(null)).toBe(false);
            expect(shoppingCartConfig.isValidQuantity(undefined)).toBe(false);
            expect(shoppingCartConfig.isValidQuantity('5')).toBe(false);
        });

        test('should validate quantity within configured range', () => {
            const validation = shoppingCartConfig.getValidation();
            expect(shoppingCartConfig.isValidQuantity(validation.minQuantity)).toBe(true);
            expect(shoppingCartConfig.isValidQuantity(validation.maxQuantity)).toBe(true);
            expect(shoppingCartConfig.isValidQuantity(validation.minQuantity - 1)).toBe(false);
            expect(shoppingCartConfig.isValidQuantity(validation.maxQuantity + 1)).toBe(false);
        });
    });

    describe('Price Validation', () => {
        test('should validate positive prices', () => {
            expect(shoppingCartConfig.isValidPrice(10.99)).toBe(true);
            expect(shoppingCartConfig.isValidPrice(0.01)).toBe(true);
            expect(shoppingCartConfig.isValidPrice(1000)).toBe(true);
        });

        test('should handle zero price based on configuration', () => {
            const validation = shoppingCartConfig.getValidation();
            if (validation.allowZeroPrice) {
                expect(shoppingCartConfig.isValidPrice(0)).toBe(true);
            } else {
                expect(shoppingCartConfig.isValidPrice(0)).toBe(false);
            }
        });

        test('should reject negative prices', () => {
            expect(shoppingCartConfig.isValidPrice(-10.99)).toBe(false);
            expect(shoppingCartConfig.isValidPrice(-0.01)).toBe(false);
        });

        test('should reject invalid price values', () => {
            expect(shoppingCartConfig.isValidPrice(null)).toBe(false);
            expect(shoppingCartConfig.isValidPrice(undefined)).toBe(false);
            expect(shoppingCartConfig.isValidPrice('10.99')).toBe(false);
            expect(shoppingCartConfig.isValidPrice(NaN)).toBe(false);
            expect(shoppingCartConfig.isValidPrice(Infinity)).toBe(false);
        });
    });

    describe('Item Validation', () => {
        test('should validate complete item object', () => {
            const validItem = {
                id: 'item-1',
                name: 'Test Product',
                price: 10.99,
                quantity: 2
            };
            expect(shoppingCartConfig.isValidItem(validItem)).toBe(true);
        });

        test('should reject item with missing required fields', () => {
            const invalidItems = [
                { name: 'Test Product', price: 10.99, quantity: 2 }, // missing id
                { id: 'item-1', price: 10.99, quantity: 2 }, // missing name
                { id: 'item-1', name: 'Test Product', quantity: 2 }, // missing price
                { id: 'item-1', name: 'Test Product', price: 10.99 } // missing quantity
            ];

            invalidItems.forEach(item => {
                expect(shoppingCartConfig.isValidItem(item)).toBe(false);
            });
        });

        test('should reject item with invalid field values', () => {
            const invalidItems = [
                { id: '', name: 'Test Product', price: 10.99, quantity: 2 }, // empty id
                { id: 'item-1', name: '', price: 10.99, quantity: 2 }, // empty name
                { id: 'item-1', name: 'Test Product', price: -10.99, quantity: 2 }, // negative price
                { id: 'item-1', name: 'Test Product', price: 10.99, quantity: 0 } // invalid quantity
            ];

            invalidItems.forEach(item => {
                expect(shoppingCartConfig.isValidItem(item)).toBe(false);
            });
        });

        test('should handle null or undefined item', () => {
            expect(shoppingCartConfig.isValidItem(null)).toBe(false);
            expect(shoppingCartConfig.isValidItem(undefined)).toBe(false);
            expect(shoppingCartConfig.isValidItem({})).toBe(false);
        });
    });

    describe('Cart Limits', () => {
        test('should check if cart can accept more items', () => {
            const currentItemCount = 10;
            expect(shoppingCartConfig.canAddItems(currentItemCount, 5)).toBe(true);
            expect(shoppingCartConfig.canAddItems(currentItemCount, 50)).toBe(false); // 超过最大限制
        });

        test('should calculate remaining capacity', () => {
            const currentItemCount = 10;
            const remaining = shoppingCartConfig.getRemainingCapacity(currentItemCount);
            expect(remaining).toBe(40); // 50 - 10
            expect(remaining).toBeGreaterThanOrEqual(0);
        });

        test('should handle edge cases for capacity calculation', () => {
            expect(shoppingCartConfig.getRemainingCapacity(50)).toBe(0);
            expect(shoppingCartConfig.getRemainingCapacity(60)).toBe(0); // 不应该为负数
            expect(shoppingCartConfig.getRemainingCapacity(0)).toBe(50);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid key gracefully', () => {
            expect(() => shoppingCartConfig.get(null)).not.toThrow();
            expect(() => shoppingCartConfig.get(undefined)).not.toThrow();
            expect(() => shoppingCartConfig.has('')).not.toThrow();
        });

        test('should return consistent results for empty keys', () => {
            expect(shoppingCartConfig.get('')).toBeUndefined();
            expect(shoppingCartConfig.has('')).toBe(false);
        });

        test('should handle method calls with invalid parameters', () => {
            expect(() => shoppingCartConfig.formatPrice()).not.toThrow();
            expect(() => shoppingCartConfig.isValidQuantity()).not.toThrow();
            expect(() => shoppingCartConfig.isValidPrice()).not.toThrow();
        });
    });

    describe('Integration Tests', () => {
        test('should work with shopping cart workflow', () => {
            const maxItems = shoppingCartConfig.getMaxItems();
            const autoSave = shoppingCartConfig.isAutoSaveEnabled();
            const saveInterval = shoppingCartConfig.getSaveInterval();
            const currency = shoppingCartConfig.getCurrency();

            expect(typeof maxItems).toBe('number');
            expect(typeof autoSave).toBe('boolean');
            expect(typeof saveInterval).toBe('number');
            expect(typeof currency).toBe('string');
        });

        test('should provide complete configuration for cart management', () => {
            const config = shoppingCartConfig.getAll();

            // 验证必要的配置项存在
            expect(config.maxItems).toBeDefined();
            expect(config.autoSave).toBeDefined();
            expect(config.saveInterval).toBeDefined();
            expect(config.currency).toBeDefined();
            expect(config.validation).toBeDefined();

            // 验证配置值的合理性
            expect(config.maxItems).toBeGreaterThan(0);
            expect(config.saveInterval).toBeGreaterThan(0);
        });

        test('should maintain configuration consistency', () => {
            const config = shoppingCartConfig.getAll();
            const maxItems = shoppingCartConfig.getMaxItems();
            const currency = shoppingCartConfig.getCurrency();
            const validation = shoppingCartConfig.getValidation();

            expect(config.maxItems).toBe(maxItems);
            expect(config.currency).toBe(currency);
            expect(config.validation).toEqual(validation);
        });
    });

    describe('Singleton Pattern', () => {
        test('should maintain singleton instance', () => {
            const instance1 = new ShoppingCartConfig();
            const instance2 = new ShoppingCartConfig();
            expect(instance1.getAll()).toEqual(instance2.getAll());
        });
    });
});