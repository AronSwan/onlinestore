/* F1 幽灵变量枚举脚本：全站 CSS/HTML 中 var(--x) 引用 vs --x: 定义 对账
   用法: node scripts/ghost-vars.mjs
   输出: 幽灵清单（按引用次数降序）+ 每文件计数 + 总数 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SCAN_EXT = new Set(['.css', '.html', '.js']); // js 扫 JS 注入的 Tailwind arbitrary 类里的 var() 引用
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'backend', 'k8s', 'tests', 'docs', 'scripts']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (SCAN_EXT.has(extname(name))) yield p;
  }
}

const refRe = /var\(\s*(--[A-Za-z0-9_-]+)/g;
const defRe = /(--[A-Za-z0-9_-]+)\s*:/g;

const defs = new Map();       // name -> [file:line]
const refs = new Map();       // name -> Map(file -> count)

for (const file of walk(ROOT)) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(ROOT.length).replace(/\\/g, '/').replace(/^\//, '');
  // 定义：只统计 :root / 选择器块内的自定义属性声明（排除 var() 左侧不可能的误判——defRe 只匹配 "--x:" 形式）
  let m;
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    // 去掉行内注释，避免注释里的假定义/假引用
    const clean = line.replace(/\/\*.*?\*\//g, '');
    defRe.lastIndex = 0;
    while ((m = defRe.exec(clean))) {
      // 排除 "var(--x):" 这种不可能情况以及 url 里的
      const idx = m.index;
      const before = clean.slice(Math.max(0, idx - 8), idx);
      if (/var\(\s*$/.test(before)) continue;
      if (!defs.has(m[1])) defs.set(m[1], []);
      defs.get(m[1]).push(`${rel}:${i + 1}`);
    }
    refRe.lastIndex = 0;
    while ((m = refRe.exec(clean))) {
      if (!refs.has(m[1])) refs.set(m[1], new Map());
      const fm = refs.get(m[1]);
      fm.set(rel, (fm.get(rel) || 0) + 1);
    }
  });
}

// 跨行注释里的引用也会误计，但 v3 仓里 CSS 注释少，误差可接受；定义同理
const ghosts = [];
for (const [name, fm] of refs) {
  if (!defs.has(name)) {
    const total = [...fm.values()].reduce((a, b) => a + b, 0);
    ghosts.push({ name, total, files: [...fm.entries()].sort((a, b) => b[1] - a[1]) });
  }
}
ghosts.sort((a, b) => b.total - a.total);

console.log(`引用变量名总数: ${refs.size}`);
console.log(`已定义变量名总数: ${defs.size}`);
console.log(`幽灵变量（引用但无定义）: ${ghosts.length}`);
console.log('---');
for (const g of ghosts) {
  const locs = g.files.map(([f, c]) => `${f}(${c})`).join(' ');
  console.log(`${String(g.total).padStart(4)}  ${g.name}  -> ${locs}`);
}
