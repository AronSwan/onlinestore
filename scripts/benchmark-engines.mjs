#!/usr/bin/env node
/**
 * MeiliSearch vs Zinc 双引擎评测（2026-10-07 立，用户令"评测"）。
 * 用法：node scripts/benchmark-engines.mjs
 * 数据=两引擎各自已灌的 6 件商品（reindex-meili/reindex-zinc）；查询矩阵分七维；
 * 性能=每查询 20 轮取中位。输出 JSON（报告的复现命令即本脚本）。
 */
const MEILI = { base: 'http://127.0.0.1:7700', key: 'master-key-change-in-production' };
const ZINC = { base: 'http://127.0.0.1:4080', auth: 'Basic ' + Buffer.from('admin:CHANGE_ME_zinc_admin_password').toString('base64') };

async function meiliSearch(q) {
  const r = await fetch(`${MEILI.base}/indexes/products/search`, { method: 'POST',
    headers: { Authorization: `Bearer ${MEILI.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q }) }).then(x => x.json());
  return (r.hits || []).map(h => h.name);
}
async function zincSearch(q) {
  const r = await fetch(`${ZINC.base}/api/products/_search`, { method: 'POST',
    headers: { Authorization: ZINC.auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_type: 'match', query: { term: q }, from: 0, max_results: 20, _source: ['name'] }) }).then(x => x.json());
  return ((r.hits || {}).hits || []).map(h => h._source?.name).filter(Boolean);
}

// 查询矩阵：q=查询, want=期望命中的品名集合（人工判定）, dim=维度
const MATRIX = [
  // A 精确（品名子串）
  { dim: 'exact', q: '手袋', want: ['渐变褶皱手袋'] },
  { dim: 'exact', q: '波士顿', want: ['黑皮波士顿包'] },
  { dim: 'exact', q: '链条', want: ['双色糖果链条包', '粉色 V 纹链条包'] },
  { dim: 'exact', q: '手提', want: ['湖蓝锁扣手提包', '花语皮革手提包'] },
  { dim: 'exact', q: '渐变褶皱手袋', want: ['渐变褶皱手袋'] },
  // B 错字容错
  { dim: 'typo', q: '手代', want: ['渐变褶皱手袋'] },
  { dim: 'typo', q: '波丝顿', want: ['黑皮波士顿包'] },
  { dim: 'typo', q: '渐娈褶皱', want: ['渐变褶皱手袋'] },
  // C 描述联想（词不在品名、在描述）
  { dim: 'desc', q: '傍晚', want: ['渐变褶皱手袋'] },
  { dim: 'desc', q: '糖果色', want: ['双色糖果链条包'] },
  { dim: 'desc', q: '紫红', want: ['渐变褶皱手袋'] },
  // D 泛词
  { dim: 'broad', q: '包', want: ['黑皮波士顿包', '双色糖果链条包', '湖蓝锁扣手提包', '花语皮革手提包', '粉色 V 纹链条包'] },
  // E 拼音/英文
  { dim: 'pinyin', q: 'shoudai', want: ['渐变褶皱手袋'] },
  { dim: 'en', q: 'Boston', want: ['黑皮波士顿包'] },
];

function score(results, want) {
  // 精确率：命中集里期望项占比；召回率：期望项被找回占比；两者均值=单查分
  const w = new Set(want);
  const hit = results.filter(n => w.has(n));
  const precision = results.length ? hit.length / results.length : 0;
  const recall = hit.length / want.length;
  return { precision, recall, f: (precision + recall) / 2 };
}

const out = { meili: {}, zinc: {} };
for (const { dim, q, want } of MATRIX) {
  for (const [name, fn] of [['meili', meiliSearch], ['zinc', zincSearch]]) {
    const results = await fn(q).catch(() => []);
    out[name][q] = { dim, results, ...score(results, want) };
  }
}
// 性能：三个代表查询×20 轮中位
async function bench(fn, q) {
  const times = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    await fn(q).catch(() => {});
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return { medianMs: +times[10].toFixed(1), p95Ms: +times[19].toFixed(1) };
}
out.perf = {};
for (const q of ['手袋', '包', '渐变褶皱手袋']) {
  out.perf[q] = { meili: await bench(meiliSearch, q), zinc: await bench(zincSearch, q) };
}
// 分维度汇总
for (const engine of ['meili', 'zinc']) {
  const dims = {};
  for (const [q, r] of Object.entries(out[engine])) {
    dims[r.dim] = dims[r.dim] || { n: 0, sum: 0 };
    dims[r.dim].n++; dims[r.dim].sum += r.f;
  }
  out.summary = out.summary || {};
  out.summary[engine] = Object.fromEntries(Object.entries(dims).map(([d, v]) => [d, +(v.sum / v.n).toFixed(2)]));
}
console.log(JSON.stringify(out, null, 1));
