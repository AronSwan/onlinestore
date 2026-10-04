import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// F4 · 经典脚本原样落盘插件：vite build 对无 type="module" 的 <script src> 只告警
// 不打包也不拷贝（switch-plan 坑 7 原记"原样拷贝"有误——实测 v7 dist 里缺失，
// 部署后 404）。清单从五个入口 HTML 现场解析（非手写维护——页面加经典脚本时
// 自动跟进，漏项会在 dist 里显式 404 而非静默缺失；文件不存在则 readFileSync
// 抛错、构建明确失败）。
function copyClassicScripts() {
  const pages = ['index.html', 'login.html', 'orders.html', 'profile.html', 'admin.html'];
  return {
    name: 'copy-classic-scripts',
    generateBundle() {
      const classic = new Set();
      for (const page of pages) {
        const html = readFileSync(resolve(__dirname, page), 'utf8');
        for (const m of html.matchAll(/<script(?![^>]*type="module")[^>]*\ssrc="(js\/[^"]+)"[^>]*>/g)) {
          classic.add(m[1]);
        }
      }
      for (const file of classic) {
        this.emitFile({ type: 'asset', fileName: file, source: readFileSync(resolve(__dirname, file), 'utf8') });
      }
      this.info?.(`copy-classic-scripts: ${[...classic].join(', ')}`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [copyClassicScripts()],
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
        // F3：四页 MPA。原先只配 index 一页，login/orders/profile 会被构建
        // 静默丢弃（不报错）——MPA 每页必须是显式入口。
        input: {
          main: resolve(__dirname, 'index.html'),
          login: resolve(__dirname, 'login.html'),
          orders: resolve(__dirname, 'orders.html'),
          profile: resolve(__dirname, 'profile.html'),
          admin: resolve(__dirname, 'admin.html'), // M3/M4 管理后台正式入库（a4f0775），F3 纳入 MPA 构建
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
      // P4：dev server 代理 /api 到本地 Nest 后端（backend/.env PORT=3777）
      proxy: {
        '/api': {
          target: 'http://localhost:3777',
          changeOrigin: true,
        },
      },
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