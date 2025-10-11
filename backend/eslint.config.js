// 用途：ESLint配置文件，支持TypeScript和Prettier
// 作者：后端开发团队
// 时间：2025-10-01 15:30:00
// 修改：2025-10-07 转换为CommonJS格式

const { ESLint } = require('eslint');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

// CommonJS格式的ESLint配置
const config = [
  // 源码规则（使用 tsconfig.json）
  {
    files: ['src/**/*.{ts,js}'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'scripts/**',
      '**/*.d.ts'
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'commonjs',
      },
      globals: {
        node: true,
        jest: true,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  // 测试代码规则（使用 tsconfig.spec.json）
  {
    files: ['test/**/*.{ts,js}', 'src/**/*.spec.ts', 'src/**/*.test.ts'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'scripts/**',
      '**/*.d.ts'
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.spec.json',
        tsconfigRootDir: __dirname,
        sourceType: 'commonjs',
      },
      globals: {
        node: true,
        jest: true,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  // 运维/工具脚本规则（更严格的检查，JS/CommonJS）
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 2022,
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'error',
      'no-implicit-globals': 'error',
      'no-shadow': 'error',
      'no-redeclare': 'error',
      'eqeqeq': ['error', 'smart'],
      'curly': ['error', 'multi-line'],
      'prefer-const': ['error', { destructuring: 'any' }],
      'no-var': 'error',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  // 运维/工具脚本规则（TypeScript 版本，严格检查）
  {
    files: ['scripts/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'commonjs',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'error',
      'eqeqeq': ['error', 'smart'],
      'curly': ['error', 'multi-line'],
      'prefer-const': ['error', { destructuring: 'any' }],
      'no-var': 'error',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  // Prettier compatibility config（应用于所有 TS/JS 文件）
  {
    files: ['src/**/*.{ts,js}', 'test/**/*.{ts,js}', 'src/**/*.spec.ts', 'src/**/*.test.ts'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'scripts/**',
      '**/*.d.ts'
    ],
    rules: prettierConfig.rules || {}
  },
];

module.exports = config;