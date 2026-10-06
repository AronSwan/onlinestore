#!/usr/bin/env node
/**
 * M1 · 商品图二次批处理（第四轮整改 B7——三套灯光归一）
 * 蓝图：docs/build-blueprint-v1.0.md §M1 + v1.1 §四2（一图入模尖峰先行，已过：p2-G 案）
 *
 * 宪法依据：ui-redesign-brief 白底宪法——六图棚向统一【暖米/纯白系】。
 *   - product-2 黑底黄荧光棚、product-5 深棕黑棚违宪最重（北京席：5 号图角像素 0,0,0 纯黑）
 *   - product-3 青绿冷棚向暖收；1/4/6 已近暖白，仅轻微归一
 * 体积：旗舰 product-1 ≤120KB；product-2(134KB)/product-5(168KB) 超标全降；
 *       全员产出 jpg q85 mozjpeg + webp q82 双格式（<picture> webp 优先 + jpg 回退）。
 *
 * 管线（全局影调，无局部重绘——图库图无分割遮罩，全局归一是诚实上限）：
 *   modulate(饱和) → linear(影调升降，控棚亮度) → soft-light(暖米染色) → multiply(极浅暖落白)
 * 商品本体色相不被篡改（黑包仍黑、蓝花仍蓝），变的是"棚"；暖序恒 R>G>B，
 * 锚定站点 --bg-soft #FAF9F7 微暖底同族。
 *
 * 用法：
 *   node scripts/reprocess-product-images.mjs            # dry-run：出 KB+色度对照表，不写目标文件
 *   node scripts/reprocess-product-images.mjs --apply    # 实写：先备份原图到 originals/ 再产出
 *   node scripts/reprocess-product-images.mjs --apply --only=2   # 只处理 product-2
 *
 * 幂等：--apply 首跑把现有 jpg 备份进 images/products/originals/（已存在则跳过），之后
 * 每次重跑都从 originals 重新推导——参数不变则产物稳定，不会叠加处理。
 *
 * dist 排除：本项目无 publicDir（vite.config.js 未设、仓库无 public/ 目录），构建只收纳
 * 模块图引用的资产，originals/ 无引用者，天然不进 dist（实测 dist/ 无 images 目录）。
 * dev server（root 服务）下 originals/ 可经 URL 访问，属内部备份资产，无引用无曝光面，
 * 不加排除配置（避免为不存在的问题立法——quality-charter 第 5 条）。
 */
import sharp from 'sharp';
import { existsSync, mkdirSync, copyFileSync, statSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const IMG_DIR = resolve(ROOT, 'images/products');
const ORIGINALS_DIR = resolve(IMG_DIR, 'originals');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const onlyArg = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1];

const TREATMENTS = {
  // 旗舰：已近暖白，仅轻微归一（L210→~228）
  'product-1': { modulate: { saturation: 0.95 }, linear: [1.0, 8], softlight: [252, 248, 240], multiply: [255, 252, 246] },
  // 黄荧光黑棚（L113→~194，违宪最重）：提亮+暖米双染；q82 压体积。
  // 国际挑剔用户批 A 档 4（2026-10-06，巴黎贵妇"饱和 0.16 是漂白"）：调色幅度砍半——
  // 脱饱和幅度按"偏离中性 1.0 的距离减半"折算：0.16 → 0.58（黑包本体保真优先）
  'product-2': { modulate: { saturation: 0.58 }, linear: [0.95, 66], softlight: [250, 242, 228], multiply: [255, 250, 240], jpegQuality: 82 },
  // 青绿冷棚（L157→~227）：中度脱饱和+提亮+暖染。
  // 同批砍半：0.30 → 0.65
  'product-3': { modulate: { saturation: 0.65 }, linear: [0.97, 40], softlight: [249, 238, 220], multiply: [255, 249, 238] },
  // 近纯白棚：极轻归一
  'product-4': { modulate: { saturation: 0.94 }, linear: [1.0, 4], softlight: [252, 248, 240], multiply: [255, 252, 246] },
  // 深棕黑棚（L127→~206，违宪最重）：保饱和提亮为主（蓝花本体不褪色）+暖染；q80 压体积。
  // 同批砍半：1.02 → 1.01（过饱和分句本就极轻，砍半后近中性）
  // 同批砍半：1.02 → 1.01（过饱和分句本就极轻，砍半后近中性）；
  // A 档 4 重跑后 800w jpg 123.0KB 轻超 120 软预算 → q80→78 压回（M1 先例同法）
  'product-5': { modulate: { saturation: 1.01 }, linear: [0.92, 62], softlight: [248, 240, 226], multiply: [255, 250, 240], jpegQuality: 78 },
  // 鹅黄近白棚：轻归一
  'product-6': { modulate: { saturation: 0.93 }, linear: [1.0, 4], softlight: [251, 246, 236], multiply: [255, 251, 244] },
};

// 国际挑剔用户批 A 档 4：Retina 变体档位（webp）——480/800/1200/1600 四档 srcset
// + 160 缩略档（订单/袋内 72px 缩略用，DPR2 亦覆盖）。product-N.webp = 800 档同字节
// 副本（旧引用路径不 404）。
const VARIANT_WIDTHS = [160, 480, 800, 1200, 1600];

const FLAGSHIP = 'product-1';
const FLAGSHIP_JPG_BUDGET = 120 * 1024;

const solid = ([r, g, b], width, height) => ({
  create: { width, height, channels: 3, background: { r, g, b } },
});

/** 同一处理管线在目标宽度下重建（sharp 操作序恒为 resize→composite——缩放必须
    在建管线时给定，solid 层随之按目标尺寸生成，不能先 composite 再 resize） */
async function buildPipeline(t, srcPath, width) {
  const meta = await sharp(srcPath).metadata();
  let img = sharp(srcPath);
  let w = meta.width;
  let h = meta.height;
  if (width && width < meta.width) {
    img = img.resize({ width });
    w = width;
    h = Math.round(meta.height * (width / meta.width));
  }
  if (t.modulate) img = img.modulate(t.modulate);
  if (t.linear) img = img.linear(t.linear[0], t.linear[1]);
  const layers = [];
  if (t.softlight) layers.push({ input: solid(t.softlight, w, h), blend: 'soft-light' });
  if (t.multiply) layers.push({ input: solid(t.multiply, w, h), blend: 'multiply' });
  if (layers.length) img = img.composite(layers);
  return img;
}

async function statsOf(buffer) {
  const img = sharp(buffer);
  const [stats, meta] = await Promise.all([img.stats(), img.metadata()]);
  const [r, g, b] = stats.channels.map((c) => Math.round(c.mean));
  return { r, g, b, lum: Math.round(r * 0.299 + g * 0.587 + b * 0.114), w: meta.width, h: meta.height };
}

const kb = (n) => `${(n / 1024).toFixed(1)}KB`;

async function main() {
  const names = Object.keys(TREATMENTS).filter((n) => !onlyArg || n === `product-${onlyArg}`);
  if (onlyArg && names.length === 0) {
    console.error(`--only=${onlyArg} 无匹配目标（可用：${Object.keys(TREATMENTS).join(', ')}）`);
    process.exit(1);
  }

  // 备份面：实写模式下确保 originals/ 存在（幂等：已存在的不覆盖）
  if (APPLY) {
    mkdirSync(ORIGINALS_DIR, { recursive: true });
    for (const name of names) {
      const dst = resolve(ORIGINALS_DIR, `${name}.jpg`);
      if (!existsSync(dst)) copyFileSync(resolve(IMG_DIR, `${name}.jpg`), dst);
    }
  }
  // dry-run 不落盘；尚无 originals 备份的图以当前文件为推导源（标记 live）
  const liveFallback = {};
  for (const name of names) {
    if (!existsSync(resolve(ORIGINALS_DIR, `${name}.jpg`))) liveFallback[name] = true;
  }
  const srcPath = (name) =>
    liveFallback[name] ? resolve(IMG_DIR, `${name}.jpg`) : resolve(ORIGINALS_DIR, `${name}.jpg`);

  const rows = [];
  for (const name of names) {
    const t = TREATMENTS[name];
    const beforeStats = await statsOf(await sharp(srcPath(name)).toBuffer());
    const beforeKB = statSync(srcPath(name)).size;

    // A 档 4：jpg 回退档 = 800w（旗舰 120KB 预算按 800w 校准；现代浏览器走
    // srcset webp 变体，jpg 只服务无 srcset 老浏览器，800w 回退够用且不破体积闸）
    const jpgPipe = await buildPipeline(t, srcPath(name), 800);
    const jpgBuf = await jpgPipe.jpeg({ quality: t.jpegQuality ?? 85, mozjpeg: true }).toBuffer();
    const variants = {};
    for (const w of VARIANT_WIDTHS) {
      const pipe = await buildPipeline(t, srcPath(name), w);
      variants[w] = await pipe.webp({ quality: 82 }).toBuffer();
    }
    const webpBuf = variants[800]; // product-N.webp = 800 档（旧引用兼容）
    const afterStats = await statsOf(jpgBuf);

    rows.push({
      name,
      src: liveFallback[name] ? 'live' : 'originals',
      beforeKB,
      jpgKB: jpgBuf.length,
      webpKB: webpBuf.length,
      variantKB: VARIANT_WIDTHS.map((w) => variants[w].length),
      before: `rgb(${beforeStats.r},${beforeStats.g},${beforeStats.b}) L${beforeStats.lum}`,
      after: `rgb(${afterStats.r},${afterStats.g},${afterStats.b}) L${afterStats.lum}`,
      dim: `${afterStats.w}x${afterStats.h}`,
    });

    if (APPLY) {
      writeFileSync(resolve(IMG_DIR, `${name}.jpg`), jpgBuf);
      writeFileSync(resolve(IMG_DIR, `${name}.webp`), webpBuf);
      for (const w of VARIANT_WIDTHS) {
        writeFileSync(resolve(IMG_DIR, `${name}-${w}.webp`), variants[w]);
      }
    }
  }

  console.log(`\n== M1 商品图二次批处理 ${APPLY ? '【APPLY 实写】' : '【DRY-RUN 预演】'} ==`);
  console.log('图          源         尺寸        棚向(处理前)              棚向(处理后)              jpg(前→后)        webp800');
  for (const r of rows) {
    console.log(
      `${r.name.padEnd(11)} ${r.src.padEnd(10)} ${r.dim.padEnd(12)} ${r.before.padEnd(25)} ${r.after.padEnd(25)} ${kb(r.beforeKB).padEnd(6)}→${kb(r.jpgKB).padEnd(7)} ${kb(r.webpKB)}`
    );
  }
  // A 档 4：四档变体 + 160 缩略档 KB 对照表（验收物）
  console.log('\n变体 KB 对照（webp q82）:');
  console.log('图          ' + VARIANT_WIDTHS.map((w) => `${w}w`.padEnd(9)).join('') + 'jpg800');
  for (const r of rows) {
    console.log(
      `${r.name.padEnd(11)} ` +
      r.variantKB.map((n) => kb(n).padEnd(9)).join('') +
      kb(r.jpgKB)
    );
  }
  const flagship = rows.find((r) => r.name === FLAGSHIP);
  if (flagship) {
    const pass = flagship.jpgKB <= FLAGSHIP_JPG_BUDGET;
    console.log(
      `\n旗舰体积闸：${FLAGSHIP} jpg ${kb(flagship.jpgKB)} ${pass ? '≤' : '超'} 120KB 预算 → ${pass ? 'PASS' : 'FAIL'}`
    );
  }
  const over = rows.filter((r) => r.jpgKB > FLAGSHIP_JPG_BUDGET && r.name !== FLAGSHIP);
  if (over.length) console.log(`注意：非旗舰超 120KB：${over.map((r) => `${r.name} ${kb(r.jpgKB)}`).join(', ')}`);
  if (!APPLY) console.log('\n（dry-run 未写任何文件；--apply 才实写并备份原图到 images/products/originals/）');
}

main().catch((err) => {
  console.error(`[reprocess-product-images] ${err.message}`);
  process.exit(1);
});
