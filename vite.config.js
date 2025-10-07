import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [],
    root: './',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: isProduction ? false : true, // 生产环境关闭sourcemap
      minify: isProduction ? 'terser' : 'esbuild', // 生产环境使用terser
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,           // 移除console语句
          drop_debugger: true,          // 移除debugger语句
          pure_funcs: ['console.log', 'console.debug'] // 移除特定函数
        },
        mangle: {
          toplevel: true,               // 顶级变量名混淆
          properties: {
            regex: /^_/                 // 混淆下划线开头的属性
          }
        }
      } : undefined,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: ({ name }) => {
            if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/\.css$/.test(name ?? '')) {
              return 'assets/css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
    server: {
      port: 5173,
      open: true,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    },
    css: {
      preprocessorOptions: {
        css: {
          charset: false,
        },
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      '__VUE_PROD_DEVTOOLS__': false,  // 禁用Vue DevTools（如果使用Vue）
    }
  };
});