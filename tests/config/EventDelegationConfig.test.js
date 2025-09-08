/**
 * @fileoverview EventDelegationConfig 测试套件
 * @description 测试事件委托配置管理器的功能，包括配置获取、验证和事件委托相关方法
 */

const { EventDelegationConfig, eventDelegationConfig } = require('../../js/config/EventDelegationConfig');

describe('EventDelegationConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default event delegation configuration', () => {
            expect(eventDelegationConfig.get('throttleDelay')).toBe(100);
            expect(eventDelegationConfig.get('debounceDelay')).toBe(300);
            expect(eventDelegationConfig.get('enabled')).toBe(true);
        });

        test('should freeze configuration object', () => {
            const config = eventDelegationConfig.getAll();
            expect(() => {
                config.throttleDelay = 200;
            }).toThrow();
        });
    });

    describe('Configuration Access', () => {
        test('should get configuration values by key', () => {
            expect(eventDelegationConfig.get('throttleDelay')).toBe(100);
            expect(eventDelegationConfig.get('debounceDelay')).toBe(300);
            expect(eventDelegationConfig.get('enabled')).toBe(true);
        });

        test('should return undefined for non-existent keys', () => {
            expect(eventDelegationConfig.get('nonexistent.key')).toBeUndefined();
        });

        test('should check if configuration key exists', () => {
            expect(eventDelegationConfig.has('throttleDelay')).toBe(true);
            expect(eventDelegationConfig.has('debounceDelay')).toBe(true);
            expect(eventDelegationConfig.has('nonexistent.key')).toBe(false);
        });

        test('should return all configuration', () => {
            const config = eventDelegationConfig.getAll();
            expect(config).toHaveProperty('throttleDelay');
            expect(config).toHaveProperty('debounceDelay');
            expect(config).toHaveProperty('enabled');
            expect(config).toHaveProperty('delegatedEvents');
            expect(config).toHaveProperty('customEvents');
        });
    });

    describe('Event Delegation Settings', () => {
        test('should get throttle delay', () => {
            expect(eventDelegationConfig.getThrottleDelay()).toBe(100);
            expect(eventDelegationConfig.getThrottleDelay()).toBeGreaterThan(0);
        });

        test('should get debounce delay', () => {
            expect(eventDelegationConfig.getDebounceDelay()).toBe(300);
            expect(eventDelegationConfig.getDebounceDelay()).toBeGreaterThan(0);
        });

        test('should check if event delegation is enabled', () => {
            expect(eventDelegationConfig.isEnabled()).toBe(true);
        });

        test('should get delegated events configuration', () => {
            const delegatedEvents = eventDelegationConfig.getDelegatedEvents();
            expect(delegatedEvents).toHaveProperty('click');
            expect(delegatedEvents).toHaveProperty('submit');
            expect(delegatedEvents).toHaveProperty('change');
            expect(delegatedEvents).toHaveProperty('input');
        });

        test('should get custom events configuration', () => {
            const customEvents = eventDelegationConfig.getCustomEvents();
            expect(customEvents).toHaveProperty('productAdded');
            expect(customEvents).toHaveProperty('cartUpdated');
            expect(customEvents).toHaveProperty('userLoggedIn');
        });
    });

    describe('Event Configuration', () => {
        test('should get click event configuration', () => {
            const clickConfig = eventDelegationConfig.getEventConfig('click');
            expect(clickConfig).toHaveProperty('selector', '[data-action]');
            expect(clickConfig).toHaveProperty('preventDefault', true);
            expect(clickConfig).toHaveProperty('stopPropagation', false);
        });

        test('should get submit event configuration', () => {
            const submitConfig = eventDelegationConfig.getEventConfig('submit');
            expect(submitConfig).toHaveProperty('selector', 'form[data-ajax]');
            expect(submitConfig).toHaveProperty('preventDefault', true);
            expect(submitConfig).toHaveProperty('stopPropagation', true);
        });

        test('should get change event configuration', () => {
            const changeConfig = eventDelegationConfig.getEventConfig('change');
            expect(changeConfig).toHaveProperty('selector', 'select[data-auto-submit], input[data-auto-submit]');
            expect(changeConfig).toHaveProperty('preventDefault', false);
            expect(changeConfig).toHaveProperty('stopPropagation', false);
        });

        test('should get input event configuration', () => {
            const inputConfig = eventDelegationConfig.getEventConfig('input');
            expect(inputConfig).toHaveProperty('selector', 'input[data-live-search]');
            expect(inputConfig).toHaveProperty('preventDefault', false);
            expect(inputConfig).toHaveProperty('stopPropagation', false);
            expect(inputConfig).toHaveProperty('debounce', true);
        });

        test('should return undefined for non-existent event', () => {
            expect(eventDelegationConfig.getEventConfig('nonexistent')).toBeUndefined();
        });
    });

    describe('Custom Event Configuration', () => {
        test('should get custom event configuration', () => {
            const productAddedConfig = eventDelegationConfig.getCustomEventConfig('productAdded');
            expect(productAddedConfig).toHaveProperty('bubbles', true);
            expect(productAddedConfig).toHaveProperty('cancelable', true);
            expect(productAddedConfig).toHaveProperty('detail');
        });

        test('should get cart updated event configuration', () => {
            const cartUpdatedConfig = eventDelegationConfig.getCustomEventConfig('cartUpdated');
            expect(cartUpdatedConfig).toHaveProperty('bubbles', true);
            expect(cartUpdatedConfig).toHaveProperty('cancelable', false);
        });

        test('should return undefined for non-existent custom event', () => {
            expect(eventDelegationConfig.getCustomEventConfig('nonexistent')).toBeUndefined();
        });
    });

    describe('Event Validation', () => {
        test('should validate supported events', () => {
            const supportedEvents = ['click', 'submit', 'change', 'input'];
            supportedEvents.forEach(event => {
                expect(eventDelegationConfig.isSupportedEvent(event)).toBe(true);
            });
        });

        test('should reject unsupported events', () => {
            const unsupportedEvents = ['mouseover', 'keydown', 'scroll', 'resize'];
            unsupportedEvents.forEach(event => {
                expect(eventDelegationConfig.isSupportedEvent(event)).toBe(false);
            });
        });

        test('should validate custom events', () => {
            const customEvents = ['productAdded', 'cartUpdated', 'userLoggedIn'];
            customEvents.forEach(event => {
                expect(eventDelegationConfig.isCustomEvent(event)).toBe(true);
            });
        });

        test('should reject non-custom events', () => {
            const nonCustomEvents = ['click', 'submit', 'unknownEvent'];
            nonCustomEvents.forEach(event => {
                expect(eventDelegationConfig.isCustomEvent(event)).toBe(false);
            });
        });
    });

    describe('Delay Validation', () => {
        test('should validate positive delays', () => {
            expect(eventDelegationConfig.isValidDelay(100)).toBe(true);
            expect(eventDelegationConfig.isValidDelay(300)).toBe(true);
            expect(eventDelegationConfig.isValidDelay(1000)).toBe(true);
        });

        test('should reject invalid delays', () => {
            expect(eventDelegationConfig.isValidDelay(0)).toBe(false);
            expect(eventDelegationConfig.isValidDelay(-100)).toBe(false);
            expect(eventDelegationConfig.isValidDelay(null)).toBe(false);
            expect(eventDelegationConfig.isValidDelay(undefined)).toBe(false);
            expect(eventDelegationConfig.isValidDelay('100')).toBe(false);
        });

        test('should validate delay within reasonable range', () => {
            expect(eventDelegationConfig.isValidDelay(50)).toBe(true); // minimum
            expect(eventDelegationConfig.isValidDelay(5000)).toBe(true); // maximum
            expect(eventDelegationConfig.isValidDelay(49)).toBe(false); // below minimum
            expect(eventDelegationConfig.isValidDelay(5001)).toBe(false); // above maximum
        });
    });

    describe('Selector Validation', () => {
        test('should validate CSS selectors', () => {
            const validSelectors = [
                '[data-action]',
                'form[data-ajax]',
                '.button',
                '#submit-btn',
                'input[type="text"]',
                'select[data-auto-submit], input[data-auto-submit]'
            ];

            validSelectors.forEach(selector => {
                expect(eventDelegationConfig.isValidSelector(selector)).toBe(true);
            });
        });

        test('should reject invalid selectors', () => {
            const invalidSelectors = [
                '',
                null,
                undefined,
                '[',
                '>>invalid',
                'div > > span'
            ];

            invalidSelectors.forEach(selector => {
                expect(eventDelegationConfig.isValidSelector(selector)).toBe(false);
            });
        });
    });

    describe('Event Options Creation', () => {
        test('should create event options for click events', () => {
            const options = eventDelegationConfig.createEventOptions('click');
            expect(options).toHaveProperty('selector', '[data-action]');
            expect(options).toHaveProperty('preventDefault', true);
            expect(options).toHaveProperty('stopPropagation', false);
        });

        test('should create event options for input events with debounce', () => {
            const options = eventDelegationConfig.createEventOptions('input');
            expect(options).toHaveProperty('selector', 'input[data-live-search]');
            expect(options).toHaveProperty('debounce', true);
            expect(options).toHaveProperty('debounceDelay', 300);
        });

        test('should return null for unsupported events', () => {
            const options = eventDelegationConfig.createEventOptions('unsupported');
            expect(options).toBeNull();
        });
    });

    describe('Custom Event Creation', () => {
        test('should create custom event options', () => {
            const options = eventDelegationConfig.createCustomEventOptions('productAdded', { productId: 123 });
            expect(options).toHaveProperty('bubbles', true);
            expect(options).toHaveProperty('cancelable', true);
            expect(options).toHaveProperty('detail');
            expect(options.detail).toHaveProperty('productId', 123);
        });

        test('should handle custom event without detail', () => {
            const options = eventDelegationConfig.createCustomEventOptions('cartUpdated');
            expect(options).toHaveProperty('bubbles', true);
            expect(options).toHaveProperty('cancelable', false);
        });

        test('should return null for unknown custom events', () => {
            const options = eventDelegationConfig.createCustomEventOptions('unknown');
            expect(options).toBeNull();
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid key gracefully', () => {
            expect(() => eventDelegationConfig.get(null)).not.toThrow();
            expect(() => eventDelegationConfig.get(undefined)).not.toThrow();
            expect(() => eventDelegationConfig.has('')).not.toThrow();
        });

        test('should return consistent results for empty keys', () => {
            expect(eventDelegationConfig.get('')).toBeUndefined();
            expect(eventDelegationConfig.has('')).toBe(false);
        });

        test('should handle method calls with invalid parameters', () => {
            expect(() => eventDelegationConfig.getEventConfig()).not.toThrow();
            expect(() => eventDelegationConfig.isSupportedEvent()).not.toThrow();
            expect(() => eventDelegationConfig.isValidDelay()).not.toThrow();
        });
    });

    describe('Integration Tests', () => {
        test('should work with event delegation workflow', () => {
            const throttleDelay = eventDelegationConfig.getThrottleDelay();
            const debounceDelay = eventDelegationConfig.getDebounceDelay();
            const isEnabled = eventDelegationConfig.isEnabled();
            const delegatedEvents = eventDelegationConfig.getDelegatedEvents();

            expect(typeof throttleDelay).toBe('number');
            expect(typeof debounceDelay).toBe('number');
            expect(typeof isEnabled).toBe('boolean');
            expect(typeof delegatedEvents).toBe('object');
        });

        test('should provide complete configuration for event management', () => {
            const config = eventDelegationConfig.getAll();

            // 验证必要的配置项存在
            expect(config.throttleDelay).toBeDefined();
            expect(config.debounceDelay).toBeDefined();
            expect(config.enabled).toBeDefined();
            expect(config.delegatedEvents).toBeDefined();
            expect(config.customEvents).toBeDefined();

            // 验证配置值的合理性
            expect(config.throttleDelay).toBeGreaterThan(0);
            expect(config.debounceDelay).toBeGreaterThan(0);
        });

        test('should maintain configuration consistency', () => {
            const config = eventDelegationConfig.getAll();
            const throttleDelay = eventDelegationConfig.getThrottleDelay();
            const debounceDelay = eventDelegationConfig.getDebounceDelay();
            const delegatedEvents = eventDelegationConfig.getDelegatedEvents();

            expect(config.throttleDelay).toBe(throttleDelay);
            expect(config.debounceDelay).toBe(debounceDelay);
            expect(config.delegatedEvents).toEqual(delegatedEvents);
        });
    });

    describe('Singleton Pattern', () => {
        test('should maintain singleton instance', () => {
            const instance1 = new EventDelegationConfig();
            const instance2 = new EventDelegationConfig();
            expect(instance1.getAll()).toEqual(instance2.getAll());
        });
    });
});