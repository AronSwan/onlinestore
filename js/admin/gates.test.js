/**
 * 三闸前端侧纯函数层单测（node --test）
 * 运行：node --test js/admin/gates.test.js（Windows 下目录参数请给文件路径）
 * 覆盖：事实卡完整性判定 / 三个历史事故形状在前端的呈现（黄警 vs 红拦）/
 *       保存按钮总裁决（缺事实卡、禁用词、结构冲突、sanity errors 四类红拦）/
 *       红下划线背板 HTML 拼装（转义与区间对齐）。
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  factCardComplete,
  normalizeFactCardForEngine,
  evaluateGates,
  gateVerdict,
  renderLintBackdrop,
  describeWarnings,
  COLOR_OPTIONS,
  BAG_TYPE_OPTIONS,
  HARDWARE_OPTIONS,
  OCCASION_OPTIONS,
  escapeHtml,
} from './gates.js';

// ─────────────────────────────────────────────────────────────
// 第一闸：事实卡四选
// ─────────────────────────────────────────────────────────────

test('事实卡四选项数：主色 15 色系 / 包型 18 结构组 / 五金 4 / 场合 4', () => {
  assert.equal(COLOR_OPTIONS.length, 15);
  assert.equal(BAG_TYPE_OPTIONS.length, 18);
  assert.deepEqual(HARDWARE_OPTIONS, ['金', '银', '白', '无明显']);
  assert.deepEqual(OCCASION_OPTIONS, ['通勤', '出街', '约会', '旅行']);
});

test('factCardComplete：四项齐全才 true，缺一/空串/非对象均 false', () => {
  const full = { colorGroup: '黑', bagType: '水桶', hardware: '银', occasion: '通勤' };
  assert.equal(factCardComplete(full), true);
  assert.equal(factCardComplete({ ...full, colorGroup: '' }), false);
  assert.equal(factCardComplete({ ...full, hardware: undefined }), false);
  assert.equal(factCardComplete(null), false);
  assert.equal(factCardComplete(undefined), false);
});

test('normalizeFactCardForEngine：colorGroup→mainColor 映射，兼容读 mainColor 拼法', () => {
  assert.deepEqual(normalizeFactCardForEngine({ colorGroup: '黑', bagType: '水桶' }), {
    mainColor: '黑',
    bagType: '水桶',
    hardware: undefined,
    occasion: undefined,
  });
  assert.equal(normalizeFactCardForEngine({ mainColor: '蓝', bagType: '托特' }).mainColor, '蓝');
});

// ─────────────────────────────────────────────────────────────
// 第二闸：三个历史事故形状（与 js/shared 引擎测试同判）
// ─────────────────────────────────────────────────────────────

const FC_BLACK_BUCKET = { colorGroup: '黑', bagType: '小圆筒', hardware: '银', occasion: '通勤' };
const FC_BLACK_TUB = { colorGroup: '黑', bagType: '水桶', hardware: '银', occasion: '通勤' };

test('事故 1（勾黑写黄）：conflicts.warnings 含 COLOR_MISMATCH，blockers 为空，不拦保存', () => {
  const g = evaluateGates({
    name: '柠檬黄小圆筒',
    description: '明亮的柠檬黄背景前，黑色小圆筒包非常上镜',
    price: 299,
    stock: 1,
    factCard: FC_BLACK_BUCKET,
  });
  assert.equal(g.conflicts.blockers.length, 0);
  assert.ok(g.conflicts.warnings.some((w) => w.code === 'COLOR_MISMATCH'));
  const v = gateVerdict(g, { factCard: FC_BLACK_BUCKET });
  assert.equal(v.canSave, true);
});

test('事故 2（凯莉写成托特）：blockers 含 BAG_SILHOUETTE_MISMATCH，保存被红拦', () => {
  const g = evaluateGates({
    name: '蓝白织纹托特',
    description: '蓝白织纹托特包，通勤也拿得出手',
    factCard: { colorGroup: '蓝白', bagType: '凯莉', hardware: '银', occasion: '通勤' },
  });
  assert.ok(g.conflicts.blockers.some((b) => b.code === 'BAG_SILHOUETTE_MISMATCH'));
  const v = gateVerdict(g, { factCard: { colorGroup: '蓝白', bagType: '凯莉' } });
  assert.equal(v.canSave, false);
  assert.ok(v.blockingReasons.some((r) => r.kind === 'blocker'));
});

test('事故 3（绿橙紫渐变描述写粉到金）：两条 COLOR_MISMATCH 黄警，不红拦', () => {
  const g = evaluateGates({
    name: '绿橙紫渐变云朵包',
    description: '色彩从粉到金自然渐变',
    factCard: { colorGroup: '绿橙紫渐变', bagType: '云朵', hardware: '金', occasion: '出街' },
  });
  assert.equal(g.conflicts.blockers.length, 0);
  const families = g.conflicts.warnings
    .filter((w) => w.code === 'COLOR_MISMATCH')
    .map((w) => w.family)
    .sort();
  assert.deepEqual(families, ['粉', '金']);
});

test('缺包型词（文案与事实卡都没有）：BAG_TYPE_MISSING 红拦', () => {
  const g = evaluateGates({
    name: '温柔的日常包',
    description: '很百搭。',
    factCard: { colorGroup: '黑', bagType: '', hardware: '金', occasion: '通勤' },
  });
  assert.ok(g.conflicts.blockers.some((b) => b.code === 'BAG_TYPE_MISSING'));
});

// ─────────────────────────────────────────────────────────────
// 禁用词 lint + sanity + 总裁决
// ─────────────────────────────────────────────────────────────

test('禁用词：名称命中 限时/轻奢 → lintName 逐词命中，保存红拦', () => {
  const g = evaluateGates({
    name: '限时轻奢水桶包',
    description: '从容的水桶包',
    factCard: { colorGroup: '黑', bagType: '水桶', hardware: '银', occasion: '通勤' },
  });
  assert.deepEqual(g.lintName.map((v) => v.word), ['限时', '轻奢']);
  const v = gateVerdict(g, { factCard: { colorGroup: '黑', bagType: '水桶' } });
  assert.equal(v.canSave, false);
  assert.equal(v.blockingReasons.filter((r) => r.kind === 'banned-word').length, 2);
});

test('例外词不误报：「亲自」「宝石」不命中禁用词', () => {
  const g = evaluateGates({
    name: '亲自看过的宝石扣水桶包',
    description: '',
    factCard: { colorGroup: '黑', bagType: '水桶', hardware: '金', occasion: '约会' },
  });
  assert.deepEqual([...g.lintName, ...g.lintDesc], []);
});

test('sanity：负库存/零价 errors 红拦；划线价 3 倍黄警不拦', () => {
  const bad = evaluateGates({
    name: '黑色水桶包',
    description: '黑色水桶包，通勤用',
    price: 0,
    stock: -2,
    factCard: FC_BLACK_TUB,
  });
  assert.ok(bad.sanity.errors.some((e) => e.code === 'price_not_positive'));
  assert.ok(bad.sanity.errors.some((e) => e.code === 'stock_negative'));
  assert.equal(gateVerdict(bad, { factCard: FC_BLACK_TUB }).canSave, false);

  const inflated = evaluateGates({
    name: '黑色水桶包',
    description: '黑色水桶包，通勤用',
    price: 299,
    originalPrice: 9999,
    stock: 5,
    factCard: FC_BLACK_TUB,
  });
  assert.ok(inflated.sanity.warnings.some((w) => w.code === 'original_price_inflated'));
  assert.equal(inflated.sanity.errors.length, 0);
  assert.equal(gateVerdict(inflated, { factCard: FC_BLACK_TUB }).canSave, true);
});

test('总裁决：无事实卡 → 保存禁用并给出第一闸提示', () => {
  const g = evaluateGates({ name: '黑色水桶包', description: '', price: 299, stock: 1 });
  const v = gateVerdict(g, { factCard: null });
  assert.equal(v.canSave, false);
  assert.ok(v.blockingReasons.some((r) => r.kind === 'fact-card' && r.message.includes('事实卡')));
});

// ─────────────────────────────────────────────────────────────
// 渲染辅助（纯字符串）
// ─────────────────────────────────────────────────────────────

test('renderLintBackdrop：命中词包 <mark>，HTML 转义，区间对齐不重叠', () => {
  // '限时<b>秒杀</b>'：限时@0，秒杀@5（引擎按原文下标）
  const html = renderLintBackdrop('限时<b>秒杀</b>', [
    { word: '限时', index: 0, suggestion: '本季' },
    { word: '秒杀', index: 5, suggestion: '本季精选' },
  ]);
  assert.ok(html.startsWith('<mark class="lint-hit"'));
  assert.ok(html.includes('data-suggestion="本季"'));
  assert.ok(html.includes('&lt;b&gt;')); // 原文标签被转义
  assert.ok(html.includes('<mark class="lint-hit" data-suggestion="本季精选">秒杀</mark>'));
  const plain = html.replace(/<[^>]+>/g, '');
  assert.equal(plain.replace(/\n$/, ''), '限时&lt;b&gt;秒杀&lt;/b&gt;'); // 正文保持转义态
});

test('renderLintBackdrop：无命中时纯转义文本 + 尾换行', () => {
  const html = renderLintBackdrop('总有一只先背。', []);
  assert.equal(html, '总有一只先背。\n');
});

test('describeWarnings：黄警条带俏皮导语 + 引擎权威消息', () => {
  const lines = describeWarnings([
    { code: 'COLOR_MISMATCH', message: '标题里的「柠檬黄」属于黄色系…' },
  ]);
  assert.equal(lines.length, 1);
  assert.ok(lines[0].startsWith('图和文案对不上啦——'));
  assert.ok(lines[0].includes('柠檬黄'));
});

test('escapeHtml：五个字符全覆盖', () => {
  assert.equal(escapeHtml(`<a href="x">&'</a>`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});
