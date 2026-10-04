import { defineConfig } from 'vite';
import { resolve, relative, isAbsolute } from 'path';
import { readFileSync, existsSync } from 'fs';

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

// P1-3(双盲审 2026-10-05) · 页面样式源序恢复插件。
// 根因：vite 把 HTML 里的 <link rel=stylesheet> 也当作入口模块图的一部分，
// rollup 按"共享面"给模块分 chunk——被多页共同链接的 CSS 会被合并进同一个
// 共享 chunk（如 site-header+main+tailwind-entry+fonts 合并成 69,609B 的
// site-header-*.css），且产物 <link> 顺序跟随 chunk 图序而非源 HTML 文档序。
// 源页的层叠契约是"tailwind utilities 在其余 <link> 之后"（CDN 时代同款，
// 见 css/tailwind-entry.css 头注），合并+重排让 utilities 落到第 2 位，
// .login-card 反压 .p-8 造成 login 生产构建 +124px 视觉回归。
// 修法分两层（缺一不可）：
//   ① manualChunks 把每个源 CSS 钉进独立 chunk——多成分合并 chunk 无论放哪都
//      无法保留全部源内两两顺序，必须先取消合并；
//   ② 本插件把每页产物 <link> 重排回源 HTML 的文档顺序——chunk 图序不可控
//      （rollup 内部实现细节），源序才是页面的显式层叠契约。
function restoreStylesheetOrder() {
  // 产物 CSS → 源文件的反查面：asset.names[0] 是 vite 以 chunk 名命名的
  // 'style_<相对路径把 / 编码为 __>.css'（实测稳定、含 dash 的文件名无歧义），
  // 解码即得源相对路径。不解析产物文件名（vite 哈希字符集含 '-' 与 '_'），
  // 也不用 asset.originalFileNames（实测为空数组）。
  const buildAssetSrcMap = (bundle) => {
    const assetSrc = new Map();
    for (const [file, entry] of Object.entries(bundle)) {
      if (entry.type !== 'asset' || !file.startsWith('assets/css/')) continue;
      const emittedName = (entry.names || []).find((n) => /^style_.+\.css$/.test(n));
      if (!emittedName) continue;
      const rel = emittedName.replace(/^style_/, '').replace(/\.css$/, '').replace(/__/g, '/') + '.css';
      const abs = resolve(__dirname, rel);
      if (existsSync(abs)) assetSrc.set(file, abs);
    }
    return assetSrc;
  };
  return {
    name: 'restore-stylesheet-order',
    // 时序事实（Y2 席对 vite 7 源码逐行核对，2026-10-05 双盲审二次修复修正）：
    // transformIndexHtml(order:'post') 在 vite:build-html 注入产物 CSS <link>
    // 之后执行——这是本插件能重排 <link> 的唯一窗口；vite 7 没有 HTML minify
    // 阶段（旧注释"minify 之前"失实，产物 HTML 不做压缩），post 处理器返回的
    // HTML 即最终落盘内容。不改在 generateBundle 里直接改 bundle 的 HTML asset
    // source——vite:build-html（post 插件，晚于本插件）会再重写 HTML 把改动
    // 覆盖掉（实测）；ctx.bundle 提供产物反查面。
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        const page = ctx.filename;
        // 源页 stylesheet href 的文档顺序（绝对路径化，层叠契约的唯一事实源）
        const srcHtml = readFileSync(page, 'utf8');
        const srcOrder = [...srcHtml.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)]
          .map((m) => (m[0].match(/href="([^"]+)"/) || [])[1])
          .filter(Boolean)
          .map((href) => resolve(__dirname, href));
        if (srcOrder.length < 2) return html;
        const assetSrc = buildAssetSrcMap(bundle);
        // 全 html 扫描（不依赖一行一 link），只动产物 stylesheet 链接
        const tagRe = /<link\b[^>]*rel="stylesheet"[^>]*>/g;
        const matches = [...html.matchAll(tagRe)].filter((m) => /href="\/assets\/css\//.test(m[0]));
        if (matches.length < 2) return html;
        const keyed = matches.map((m, i) => {
          const href = (m[0].match(/href="(\/assets\/css\/[^"]+)"/) || [])[1];
          const src = href ? assetSrc.get(href.slice(1)) : undefined;
          const pos = src !== undefined
            ? srcOrder.findIndex((s) => s.toLowerCase() === src.toLowerCase())
            : -1;
          if (pos === -1) {
            this.warn(`restore-stylesheet-order: ${page} 产物 CSS ${href} 无法映射回源页链接，排至末尾`);
          }
          return { tag: m[0], pos: pos === -1 ? Number.MAX_SAFE_INTEGER : pos, i };
        });
        // 稳定排序：源序优先，未映射项按原相对顺序殿后
        keyed.sort((a, b) => a.pos - b.pos || a.i - b.i);
        let out = '';
        let last = 0;
        matches.forEach((m, i) => {
          out += html.slice(last, m.index) + keyed[i].tag;
          last = m.index + m[0].length;
        });
        out += html.slice(last);
        this.info?.(`restore-stylesheet-order: ${page} 恢复 ${keyed.length} 条 stylesheet 链接为源序`);
        return out;
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [copyClassicScripts(), restoreStylesheetOrder()],
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
          // P1-3 ①：每个源 CSS 强制独立 chunk（取消跨页共享合并）。
          // 仅圈定仓库根下的 *.css（node_modules 不动）；chunk 名 = 'style_' +
          // 相对路径把分隔符编码为 '__'（路径段内不含 '__' 与 '-'，供
          // restoreStylesheetOrder 无歧义解码回源路径；'style_' 前缀防与五个
          // HTML entry 名 main/login/orders/profile/admin 冲突）。
          manualChunks(id) {
            if (!id.endsWith('.css')) return undefined;
            const rel = relative(__dirname, id);
            if (rel.startsWith('..') || isAbsolute(rel)) return undefined;
            return `style_${rel.replace(/\.css$/, '').replace(/[\\/]+/g, '__')}`;
          },
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