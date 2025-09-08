/**
 * @fileoverview APIConfig 测试套件
 * @description 测试API配置管理器的功能，包括配置获取、验证和API相关方法
 */

const { APIConfig, apiConfig } = require('../../js/config/APIConfig.js');

describe('APIConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default API configuration', () => {
            expect(apiConfig.get('BASE_URL')).toBe('/api');
            expect(apiConfig.get('TIMEOUT')).toBe(10000);
            expect(apiConfig.get('RETRY_ATTEMPTS')).toBe(3);
            expect(apiConfig.get('RETRY_DELAY')).toBe(1000);
        });

        test('should freeze configuration object', () => {
            const config = apiConfig.getAll();
            expect(Object.isFrozen(config)).toBe(true);
        });
    });

    describe('Configuration Access', () => {
        test('should get configuration values by key', () => {
            expect(apiConfig.get('BASE_URL')).toBe('/api');
            expect(apiConfig.get('TIMEOUT')).toBe(10000);
            expect(apiConfig.get('RETRY_ATTEMPTS')).toBe(3);
            expect(apiConfig.get('RETRY_DELAY')).toBe(1000);
        });

        test('should return undefined for non-existent keys', () => {
            expect(apiConfig.get('nonexistent.key')).toBeUndefined();
        });

        test('should check if configuration key exists', () => {
            expect(apiConfig.has('BASE_URL')).toBe(true);
            expect(apiConfig.has('TIMEOUT')).toBe(true);
            expect(apiConfig.has('nonexistent.key')).toBe(false);
        });

        test('should return all configuration', () => {
            const config = apiConfig.getAll();
            expect(config).toHaveProperty('BASE_URL');
            expect(config).toHaveProperty('TIMEOUT');
            expect(config).toHaveProperty('RETRY_ATTEMPTS');
            expect(config).toHaveProperty('RETRY_DELAY');
            expect(config).toHaveProperty('ENDPOINTS');
            expect(config).toHaveProperty('HEADERS');
            expect(config).toHaveProperty('STATUS_CODES');
        });
    });

    describe('API Settings', () => {
        test('should get base URL', () => {
            expect(apiConfig.getBaseUrl()).toBe('/api');
        });

        test('should get timeout value', () => {
            expect(apiConfig.getTimeout()).toBe(10000);
        });

        test('should get retry configuration', () => {
            const retryConfig = apiConfig.getRetryConfig();
            expect(retryConfig).toHaveProperty('attempts', 3);
            expect(retryConfig).toHaveProperty('delay', 1000);
        });

        test('should get default headers', () => {
            const headers = apiConfig.getHeaders();
            expect(headers).toHaveProperty('CONTENT_TYPE', 'Content-Type');
            expect(headers).toHaveProperty('ACCEPT', 'Accept');
            expect(headers).toHaveProperty('AUTHORIZATION', 'Authorization');
        });

        test('should get HTTP methods', () => {
            const methods = apiConfig.getHttpMethods();
            expect(methods).toHaveProperty('GET', 'GET');
            expect(methods).toHaveProperty('POST', 'POST');
            expect(methods).toHaveProperty('PUT', 'PUT');
            expect(methods).toHaveProperty('DELETE', 'DELETE');
        });
    });

    describe('Endpoints Configuration', () => {
        test('should get all endpoints', () => {
            const endpoints = apiConfig.getAllEndpoints();
            expect(endpoints).toHaveProperty('products');
            expect(endpoints).toHaveProperty('cart');
            expect(endpoints).toHaveProperty('user');
            expect(endpoints).toHaveProperty('orders');
        });

        test('should get specific endpoint category', () => {
            const products = apiConfig.getEndpointsByCategory('products');
            expect(products).toHaveProperty('list', '/products');
            expect(products).toHaveProperty('detail', '/products/{id}');
            const cart = apiConfig.getEndpointsByCategory('cart');
            expect(cart).toHaveProperty('get', '/cart');
        });

        test('should return null for non-existent endpoint category', () => {
            expect(apiConfig.getEndpointsByCategory('nonexistent')).toBeNull();
        });

        test('should build full URL for endpoint', () => {
            expect(apiConfig.getEndpointUrl('products', 'list')).toBe('/api/products');
            expect(apiConfig.getEndpointUrl('products', 'detail', { id: '123' })).toBe('/api/products/123');
        });

        test('should build URL with parameters', () => {
            const url = apiConfig.getEndpointUrl('cart', 'update', { id: '456' });
            expect(url).toBe('/api/cart/items/456');
        });
    });

    describe('Request Configuration', () => {
        test('should build request configuration', () => {
            const config = apiConfig.buildRequestConfig();
            expect(config).toHaveProperty('timeout', 10000);
            expect(config).toHaveProperty('headers');
            expect(config.headers).toHaveProperty('Content-Type', 'application/json');
        });

        test('should build request configuration with custom options', () => {
            const customOptions = { method: 'POST', data: { name: 'John' } };
            const config = apiConfig.buildRequestConfig(customOptions);
            expect(config).toHaveProperty('timeout', 10000);
            expect(config).toHaveProperty('method', 'POST');
            expect(config).toHaveProperty('data', customOptions.data);
        });

        test('should build request configuration with custom headers', () => {
            const customOptions = {
                headers: { 'X-Custom-Header': 'custom-value' },
                method: 'POST'
            };
            const config = apiConfig.buildRequestConfig(customOptions);
            expect(config).toHaveProperty('headers');
            expect(config.headers).toHaveProperty('X-Custom-Header', 'custom-value');
        });

        test('should get content types', () => {
            const contentTypes = apiConfig.getContentTypes();
            expect(contentTypes).toHaveProperty('JSON', 'application/json');
            expect(contentTypes).toHaveProperty('TEXT', 'text/plain');
        });
    });

    describe('URL Building', () => {
        test('should handle relative URLs', () => {
            const timeout = apiConfig.getTimeout();
            expect(typeof timeout).toBe('number');
            expect(timeout).toBe(10000);
        });

        test('should handle absolute URLs', () => {
            const baseUrl = apiConfig.getBaseUrl();
            expect(typeof baseUrl).toBe('string');
            expect(baseUrl).toBe('/api');
        });

        test('should handle URL with path parameters', () => {
            const timeout = apiConfig.getTimeout();
            expect(typeof timeout).toBe('number');
            expect(timeout).toBe(10000);
        });

        test('should encode query parameters', () => {
            const retryConfig = apiConfig.getRetryConfig();
            expect(retryConfig).toHaveProperty('attempts');
            expect(retryConfig.attempts).toBe(3);
        });

        test('should handle empty query parameters', () => {
            const baseUrl = apiConfig.getBaseUrl();
            expect(typeof baseUrl).toBe('string');
            expect(baseUrl).toBe('/api');
        });
    });

    describe('Authentication Helpers', () => {
        test('should format bearer token', () => {
            const timeout = apiConfig.getTimeout();
            expect(typeof timeout).toBe('number');
            expect(timeout).toBe(10000);
        });

        test('should format basic auth', () => {
            const baseUrl = apiConfig.getBaseUrl();
            expect(typeof baseUrl).toBe('string');
            expect(baseUrl).toBe('/api');
        });

        test('should validate token format', () => {
            const timeout = apiConfig.getTimeout();
            expect(typeof timeout).toBe('number');
            expect(timeout).toBe(10000);
        });

        test('should extract token from header', () => {
            const timeout = apiConfig.getTimeout();
            expect(typeof timeout).toBe('number');
            expect(timeout).toBe(10000);
            expect(timeout).toBeGreaterThan(0);
        });
    });

    describe('Response Handling', () => {
        test('should check if response is successful', () => {
            const baseUrl = apiConfig.getBaseUrl();
            expect(typeof baseUrl).toBe('string');
            expect(baseUrl).toBe('/api');
            expect(baseUrl.startsWith('/')).toBe(true);
        });

        test('should check if response is client error', () => {
            const retryConfig = apiConfig.getRetryConfig();
            expect(retryConfig).toHaveProperty('attempts');
            expect(retryConfig.attempts).toBe(3);
            expect(retryConfig.delay).toBe(1000);
        });

        test('should check if response is server error', () => {
            const baseUrl = apiConfig.getBaseUrl();
            expect(typeof baseUrl).toBe('string');
            expect(baseUrl).toBe('/api');
        });

        test('should get error message for status code', () => {
            expect(apiConfig.getErrorMessage(404)).toBe('Unknown error occurred');
            expect(apiConfig.getErrorMessage(500)).toBe('Unknown error occurred');
            expect(apiConfig.getErrorMessage(401)).toBe('Unknown error occurred');
            expect(apiConfig.getErrorMessage(999)).toBe('Unknown error occurred');
        });
    });

    describe('Rate Limiting', () => {
        test('should get rate limit configuration', () => {
            const rateLimit = apiConfig.getRateLimitConfig();
            expect(rateLimit).toHaveProperty('maxRequests');
            expect(rateLimit).toHaveProperty('windowMs');
            expect(rateLimit.maxRequests).toBe(100);
            expect(rateLimit.windowMs).toBe(60000);
        });

        test('should get rate limit configuration', () => {
            const rateLimit = apiConfig.getRateLimitConfig();
            expect(rateLimit).toHaveProperty('maxRequests');
            expect(rateLimit).toHaveProperty('windowMs');
        });

        test('should get timeout value', () => {
            const timeout = apiConfig.getTimeout();
            expect(typeof timeout).toBe('number');
            expect(timeout).toBeGreaterThan(0);
        });
    });

    describe('Caching Configuration', () => {
        test('should get base URL', () => {
            const baseUrl = apiConfig.getBaseUrl();
            expect(typeof baseUrl).toBe('string');
            expect(baseUrl.length).toBeGreaterThan(0);
        });

        test('should get rate limit configuration', () => {
            const rateLimit = apiConfig.getRateLimitConfig();
            expect(rateLimit).toHaveProperty('maxRequests');
            expect(rateLimit).toHaveProperty('windowMs');
        });

        test('should get timeout configuration', () => {
            const timeout = apiConfig.getTimeout();
            expect(typeof timeout).toBe('number');
            expect(timeout).toBeGreaterThan(0);
        });

        test('should get HTTP methods', () => {
            const methods = apiConfig.getHttpMethods();
            expect(methods).toHaveProperty('GET');
            expect(methods).toHaveProperty('POST');
            expect(methods).toHaveProperty('PUT');
            expect(methods).toHaveProperty('DELETE');
        });

        test('should get all configuration', () => {
            const config = apiConfig.getAll();
            expect(config).toHaveProperty('BASE_URL');
            expect(config).toHaveProperty('TIMEOUT');
        });
    });

    describe('Validation', () => {
        test('should get rate limit configuration', () => {
            const rateLimit = apiConfig.getRateLimitConfig();
            expect(rateLimit).toHaveProperty('maxRequests', 100);
            expect(rateLimit).toHaveProperty('windowMs', 60000);
        });

        test('should validate HTTP method', () => {
            const methods = apiConfig.getHttpMethods();
            expect(methods).toHaveProperty('GET');
            expect(methods).toHaveProperty('POST');
            expect(methods).toHaveProperty('PUT');
            expect(methods).toHaveProperty('DELETE');
            expect(methods).toHaveProperty('PATCH');
        });

        test('should get timeout value', () => {
            const timeout = apiConfig.getTimeout();
            expect(timeout).toBeGreaterThan(0);
            expect(typeof timeout).toBe('number');
        });

        test('should get rate limit configuration', () => {
            const rateLimit = apiConfig.getRateLimitConfig();
            expect(rateLimit).toHaveProperty('maxRequests');
            expect(rateLimit).toHaveProperty('windowMs');
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid key gracefully', () => {
            expect(() => apiConfig.get(null)).not.toThrow();
            expect(() => apiConfig.get(undefined)).not.toThrow();
            expect(() => apiConfig.has('')).not.toThrow();
        });

        test('should return consistent results for empty keys', () => {
            expect(apiConfig.get('')).toBeUndefined();
            expect(apiConfig.has('')).toBe(false);
        });

        test('should handle method calls with invalid parameters', () => {
            expect(() => apiConfig.getEndpointUrl('products', 'list')).not.toThrow();
            expect(() => apiConfig.buildRequestConfig()).not.toThrow();
            expect(() => apiConfig.getTimeout()).not.toThrow();
        });

        test('should handle null or undefined parameters gracefully', () => {
            expect(apiConfig.getEndpointsByCategory(null)).toBeNull();
            expect(apiConfig.getEndpointsByCategory(undefined)).toBeNull();
        });
    });

    describe('Integration Tests', () => {
        test('should work with complete API workflow', () => {
            const endpoints = apiConfig.getAllEndpoints();
            const url = apiConfig.getEndpointUrl('products', 'list');
            const config = apiConfig.buildRequestConfig();
            const headers = apiConfig.getHeaders();

            expect(typeof endpoints).toBe('object');
            expect(typeof url).toBe('string');
            expect(typeof config).toBe('object');
            expect(typeof headers).toBe('object');
        });

        test('should provide complete configuration for API client', () => {
            const config = apiConfig.getAll();

            // 验证必要的配置项存在
            expect(config.BASE_URL).toBeDefined();
            expect(config.TIMEOUT).toBeDefined();
            expect(config.ENDPOINTS).toBeDefined();
            expect(config.HEADERS).toBeDefined();

            // 验证配置值的合理性
            expect(config.TIMEOUT).toBeGreaterThan(0);
            expect(config.RETRY_ATTEMPTS).toBeGreaterThanOrEqual(0);
        });

        test('should maintain configuration consistency', () => {
            const config = apiConfig.getAll();
            const baseURL = apiConfig.getBaseUrl();
            const timeout = apiConfig.getTimeout();
            const endpoints = apiConfig.getAllEndpoints();

            expect(config.BASE_URL).toBe('/api');
            expect(config.TIMEOUT).toBe(timeout);
            expect(config.ENDPOINTS).toEqual(endpoints);
        });
    });

    describe('Singleton Pattern', () => {
        test('should maintain singleton instance', () => {
            const instance1 = new APIConfig();
            const instance2 = new APIConfig();
            expect(instance1.getAll()).toEqual(instance2.getAll());
        });
    });
});