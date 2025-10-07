// 用途：ESLint配置文件，支持TypeScript和Prettier
// 作者：后端开发团队
// 时间：2025-10-01 15:30:00

import { ESLint } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

// 由于ESLint 9+使用ES模块，需要通过动态导入获取配置
const config = [
  {
    files: ['src/**/*.{ts,js}', 'test/**/*.{ts,js}'],
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      'test/',
      'scripts/',
      '.eslintrc.js',
      '.prettierrc',
      'package-lock.json'
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
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
      'test/',
      'scripts/',
      '.eslintrc.js',
      '.prettierrc',
      'package-lock.json'
    ]
  },
];

export default config;