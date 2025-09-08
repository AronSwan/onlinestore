module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true,
        amd: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // 代码质量规则
        'no-unused-vars': ['error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
        'no-console': 'off',
        'no-debugger': 'error',
        'no-alert': 'warn',
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',
        
        // 代码风格规则
        'indent': ['error', 2],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'comma-dangle': ['error', 'never'],
        'no-trailing-spaces': 'error',
        'eol-last': 'error',
        'no-multiple-empty-lines': ['error', { 'max': 2 }],
        
        // ES6+ 规则
        'prefer-const': 'error',
        'no-var': 'error',
        'prefer-arrow-callback': 'error',
        'arrow-spacing': 'error',
        'template-curly-spacing': 'error',
        
        // 最佳实践
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'dot-notation': 'error',
        'no-else-return': 'error',
        'no-empty-function': 'warn',
        'no-magic-numbers': ['warn', {
            ignore: [-1, -10, -20, -30, -50, -100, -500, 0, 0.01, 0.05, 0.1, 0.15, 0.17, 0.2, 0.25, 0.3, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 0.95, 0.98, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11.5, 12, 12.5, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17.5, 18.5, 19.5, 20, 20.5, 21.5, 22.5, 23.5, 24, 24.5, 25, 25.5, 26.5, 27.5, 28.5, 29.5, 30, 30.5, 31.5, 32.5, 33.5, 34.5, 35.5, 36, 36.5, 37.5, 38.5, 39.5, 40, 40.5, 41.5, 42.5, 43.5, 44.5, 45.5, 46.5, 47.5, 48.5, 49.5, 50, 50.5, 51.5, 52.5, 53.5, 54.5, 55.5, 56.5, 57.5, 58.5, 59.5, 60, 60.5, 61.5, 62.5, 63.5, 64.5, 65.5, 66.5, 67.5, 68.5, 69.5, 70.5, 71.5, 72.5, 73.5, 74.5, 75.5, 76.5, 77.5, 78.5, 79.5, 80, 80.5, 81.5, 82.5, 83.5, 84.5, 85.5, 86.5, 87.5, 88.5, 89.5, 90, 90.5, 91.5, 92.5, 93.5, 94.5, 95.5, 96.5, 97.5, 98.5, 99, 99.5, 100, 128, 150, 200, 250, 254, 255, 256, 300, 320, 400, 401, 403, 404, 429, 480, 500, 502, 503, 600, 768, 800, 840, 960, 1000, 1024, 1200, 1440, 1500, 1920, 2000, 2500, 3000, 4000, 5000, 6000, 7000, 8000, 9999, 10000, 30000, 50000, 60000, 100000, 200000, 300000, 500000, -8],
            ignoreArrayIndexes: true,
            enforceConst: true,
            detectObjects: false
        }],
        'no-return-assign': 'error',
        'no-self-compare': 'error',
        'no-throw-literal': 'error',
        'no-unmodified-loop-condition': 'error',
        'no-useless-call': 'error',
        'no-useless-return': 'error',
        'prefer-promise-reject-errors': 'error',
        'radix': 'error',
        'yoda': 'error',
        
        // 变量规则
        'no-delete-var': 'error',
        'no-label-var': 'error',
        'no-restricted-globals': 'error',
        'no-shadow': 'error',
        'no-shadow-restricted-names': 'error',
        'no-undef': 'error',
        'no-undef-init': 'error',
        'no-undefined': 'error',
        'no-use-before-define': ['error', { 'functions': false }]
    },
    globals: {
        // 浏览器全局变量
        'window': 'readonly',
        'document': 'readonly',
        'localStorage': 'readonly',
        'sessionStorage': 'readonly',
        'fetch': 'readonly',
        'URL': 'readonly',
        'URLSearchParams': 'readonly',
        
        // 项目特定全局变量
        'AuthManager': 'readonly',
        'CartManager': 'readonly',
        'ProductManager': 'readonly',
        'UIManager': 'readonly',
        'InputValidator': 'readonly',
        'StorageManager': 'readonly',
        'NetworkManager': 'readonly',
        'PerformanceMonitor': 'readonly',
        'LazyLoader': 'readonly',
        'NotificationManager': 'readonly',
        'ModalManager': 'readonly',
        'LoadingManager': 'readonly',
        'PasswordPolicyManager': 'readonly',
        'AccountLockoutManager': 'readonly',
        'SessionManager': 'readonly',
        'UIInteractionManager': 'readonly',
        'APIIntegrationManager': 'readonly',
        'HTTPClient': 'readonly',
        'RequestInterceptor': 'readonly',
        'ResponseInterceptor': 'readonly',
        'CacheManager': 'readonly',
        'RateLimiter': 'readonly',
        'PasswordSecurity': 'readonly',
        'UIInteraction': 'readonly',
        'APIIntegration': 'readonly',
        'showNotification': 'readonly'
    },
    overrides: [
        {
            files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
            env: {
                jest: true
            },
            globals: {
                'describe': 'readonly',
                'it': 'readonly',
                'test': 'readonly',
                'expect': 'readonly',
                'beforeEach': 'readonly',
                'afterEach': 'readonly',
                'beforeAll': 'readonly',
                'afterAll': 'readonly',
                'jest': 'readonly'
            },
            rules: {
                'no-magic-numbers': 'off',
                'no-undefined': 'off'
            }
        }
    ]
};