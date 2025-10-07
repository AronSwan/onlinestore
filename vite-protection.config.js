// 前端反扒保护配置
// 作者：AI助手
// 时间：2025-09-27

import { defineConfig } from 'vite';
import { createHash } from 'crypto';

export default defineConfig({
  build: {
    // 代码压缩和混淆
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,           // 移除console语句
        drop_debugger: true,          // 移除debugger语句
        pure_funcs: ['console.log', 'console.debug'], // 移除特定函数
        sequences: true,              // 连续语句合并
        dead_code: true,              // 移除死代码
        conditionals: true,           // 优化条件表达式
        booleans: true,               // 优化布尔值
        unused: true,                 // 移除未使用变量
        if_return: true,              // 优化if-return
        join_vars: true,              // 合并变量声明
        collapse_vars: true           // 内联变量
      },
      mangle: {
        toplevel: true,               // 顶级变量名混淆
        properties: {
          regex: /^_/,                // 混淆下划线开头的属性
          reserved: ['$']              // 保留$开头的变量（如jQuery）
        }
      },
      format: {
        comments: false               // 移除注释
      }
    },
    
    // 代码分割优化
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['axios'],          // 第三方库单独打包
          utils: ['./js/utils/*']     // 工具函数单独打包
        },
        // 文件名添加哈希
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // 源映射配置（生产环境关闭）
    sourcemap: process.env.NODE_ENV === 'development'
  },
  
  // 开发服务器配置
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  },
  
  // 插件配置
  plugins: [
    // 自定义插件：为静态资源添加版本哈希
    {
      name: 'asset-hash',
      generateBundle(options, bundle) {
        Object.keys(bundle).forEach(fileName => {
          const file = bundle[fileName];
          if (file.type === 'asset' && (fileName.endsWith('.css') || fileName.endsWith('.js'))) {
            const hash = createHash('md5').update(file.source).digest('hex').slice(0, 8);
            file.fileName = file.fileName.replace(/(\.\w+)$/, `-${hash}$1`);
          }
        });
      }
    },
    
    // 自定义插件：移除开发相关的代码
    {
      name: 'remove-dev-code',
      transform(code, id) {
        if (id.includes('node_modules')) return code;
        
        // 移除开发环境特定的代码
        return code
          .replace(/if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*\)\s*\{[^}]+\}/g, '')
          .replace(/console\.(log|debug|info)\([^)]*\);?/g, '');
      }
    }
  ],
  
  // 环境变量配置
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    '__VUE_PROD_DEVTOOLS__': false,  // 禁用Vue DevTools
    '__VUE_OPTIONS_API__': false     // 禁用Options API（如果使用Vue）
  }
});