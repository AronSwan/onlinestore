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
  {
    files: ['src/**/*.{ts,js}', 'test/**/*.{ts,js}'],
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      'scripts/',
      '.eslintrc.js',
      '.prettierrc',
      'package-lock.json'
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
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  { 
    ...prettierConfig,
    files: ['src/**/*.{ts,js}', 'test/**/*.{ts,js}'],
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      'scripts/',
      '.eslintrc.js',
      '.prettierrc',
      'package-lock.json'
    ]
  },
];

module.exports = config;