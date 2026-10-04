/**
 * integrity-rules 单元测试（node:test，Node ≥ 18）
 * 运行：node --test js/shared/
 *
 * 覆盖：
 *   1. 上午三个名实不符事故案例（必须全部被 checkNameImage 拦住）；
 *   2. lintCopy / checkNameImage / sanityCheck 的正常与边界；
 *   3. 词表归一化（湖蓝↔蓝、柠檬黄↔黄、小圆筒↔圆筒）与例外词防误报；
 *   4. voice-rules.json 与模块内嵌镜像 VOICE_RULES 深度相等（防双闸数据漂移）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  lintCopy,
  checkNameImage,
  sanityCheck,
  VOICE_RULES,
  COLOR_FAMILIES,
  BAG_SILHOUETTES,
  BAG_CARRY_STYLES,
  SANITY_THRESHOLDS,
} from './integrity-rules.js';

// ─────────────────────────────────────────────
// 〇、数据源完整性
// ─────────────────────────────────────────────
test('词表规模非空且导出完整（供管理界面渲染下拉）', () => {
  assert.ok(Object.keys(COLOR_FAMILIES).length >= 15, '颜色色系 ≥15');
  assert.ok(BAG_SILHOUETTES.length >= 15, '结构包型词组 ≥15');
  assert.ok(BAG_CARRY_STYLES.length >= 4, '背法词组 ≥4');
  assert.ok(VOICE_RULES.banned.length >= 15, '禁用词 ≥15 条');
});

test('voice-rules.json 与内嵌镜像 VOICE_RULES 深度相等（双闸防漂移）', () => {
  const fromDisk = JSON.parse(readFileSync(new URL('./voice-rules.json', import.meta.url), 'utf8'));
  assert.deepStrictEqual(VOICE_RULES, fromDisk);
});

// ─────────────────────────────────────────────
// 一、三个历史事故案例（acceptance：全部拦住）
// ─────────────────────────────────────────────
test('事故 1：黑包名「柠檬黄小圆筒」（黄是背景布）→ 黄警 COLOR_MISMATCH，不红拦', () => {
  const r = checkNameImage({
    name: '柠檬黄小圆筒',
    description: '明亮的柠檬黄背景前，黑色小圆筒包非常上镜',
    factCard: { mainColor: '黑', bagType: '小圆筒' },
  });
  assert.equal(r.blockers.length, 0, '包型小圆筒与事实卡一致，无红拦');
  const hits = r.warnings.filter((w) => w.code === 'COLOR_MISMATCH');
  assert.ok(hits.length >= 1, '至少一条颜色黄警');
  assert.ok(hits.some((w) => w.family === '黄' && w.field === 'name'), '标题的柠檬黄命中黄系');
  assert.ok(hits.every((w) => w.family === '黄'), '黑∈事实卡色系，不应误报');
});

test('事故 2：凯莉包名「蓝白织纹托特」（不织纹不托特）→ 红拦 BAG_SILHOUETTE_MISMATCH', () => {
  const r = checkNameImage({
    name: '蓝白织纹托特',
    description: '蓝白织纹托特包，通勤也拿得出手',
    factCard: { mainColor: '蓝白', bagType: '凯莉' },
  });
  assert.equal(r.warnings.length, 0, '蓝、白都在事实卡色系内，无颜色黄警');
  const blockers = r.blockers.filter((b) => b.code === 'BAG_SILHOUETTE_MISMATCH');
  // R5（二次修复）：裁决按 canonical×字段 独立聚合——托特在标题与描述两处
  // 冲突，各红拦一条（field 定位到具体输入框），断言从 1 条更新为 2 条
  assert.equal(blockers.length, 2, '标题与描述的托特各一条结构冲突红拦');
  assert.deepEqual(blockers.map((b) => b.word).sort(), ['托特', '托特']);
  assert.deepEqual(blockers.map((b) => b.field).sort(), ['description', 'name']);
  assert.equal(blockers[0].factBagType, '凯莉');
});

test('事故 3：绿橙紫渐变描述写「粉到金」→ 黄警 COLOR_MISMATCH ×2（粉、金），渐变本身不警', () => {
  const r = checkNameImage({
    name: '绿橙紫渐变云朵包',
    description: '色彩从粉到金自然渐变',
    factCard: { mainColor: '绿橙紫渐变', bagType: '云朵' },
  });
  assert.equal(r.blockers.length, 0, '云朵包型与事实卡一致');
  const families = r.warnings.filter((w) => w.code === 'COLOR_MISMATCH').map((w) => w.family).sort();
  assert.deepEqual(families, ['粉', '金'], '粉、金两色系报警；绿/橙/紫/渐变均在事实卡色系内');
});

// ─────────────────────────────────────────────
// 二、lintCopy
// ─────────────────────────────────────────────
test('lintCopy：voice-sheet 示例文案全部干净（正控）', () => {
  assert.deepEqual(lintCopy('总有一只先背。——2025 秋冬，到货了'), { violations: [] });
  assert.deepEqual(lintCopy('IT\'S TOTE SEASON · 包包们的季节到了'), { violations: [] });
  assert.deepEqual(lintCopy('偶尔来信，不打扰。（真的偶尔。）'), { violations: [] });
});

test('lintCopy：促销/自封品质/催促词逐词命中，index 与 suggestion 齐全', () => {
  const r = lintCopy('这款轻奢托特限时特惠，顶级质感');
  const words = r.violations.map((v) => v.word);
  assert.deepEqual(words, ['轻奢', '限时', '特惠', '顶级']);
  assert.equal(r.violations[1].index, 6); // 「限时」首字下标
  assert.ok(r.violations.every((v) => v.suggestion.length > 0), '每条都带合规替代');
  assert.ok(r.violations.every((v) => v.reason.length > 0), '每条都带原因');
});

test('lintCopy：限时/抢购/秒杀/特惠 全组命中且下标正确', () => {
  const r = lintCopy('限时抢购秒杀特惠');
  assert.deepEqual(r.violations.map((v) => [v.word, v.index]), [
    ['限时', 0], ['抢购', 2], ['秒杀', 4], ['特惠', 6],
  ]);
});

test('lintCopy：催促词组（立即/马上/赶快）', () => {
  const words = lintCopy('立即下单，马上抢，赶快买').violations.map((v) => v.word);
  assert.deepEqual(words, ['立即', '马上', '赶快']);
});

test('lintCopy：例外词防误报——亲（亲自/母亲）、宝（宝蓝/宝石）', () => {
  assert.deepEqual(lintCopy('亲自上手试背过').violations, []);
  assert.deepEqual(lintCopy('母亲节的好礼').violations, []);
  assert.deepEqual(lintCopy('宝蓝色很衬肤色').violations, []);
  assert.deepEqual(lintCopy('蓝宝石五金件').violations, []);
});

test('lintCopy：客服腔本体仍命中——孤立的 亲 / 宝 / 宝贝', () => {
  assert.equal(lintCopy('亲，看看这只').violations[0].word, '亲');
  assert.equal(lintCopy('宝，帮你选好了').violations[0].word, '宝');
  const r = lintCopy('宝贝快看看');
  assert.equal(r.violations.length, 1, '「宝贝」不被「宝」重复计数');
  assert.equal(r.violations[0].word, '宝贝');
});

test('lintCopy：多个感叹号命中（全角/半角/混合），单个感叹号放行', () => {
  const r = lintCopy('上新了！！！');
  assert.equal(r.violations.length, 1);
  // R3（二次修复）：NFKC 归一化后全角 ！→!，word 取规范化文本（与 index
  // 同一契约）——断言从 '！！！' 更新为 '!!!'，属有意行为变化，非迁就实现
  assert.equal(r.violations[0].word, '!!!');
  assert.equal(r.violations[0].index, 3);
  assert.equal(lintCopy('速来!！').violations.length, 1, '半角+全角混合也算');
  assert.deepEqual(lintCopy('来！真的值！').violations, [], '单个感叹号不违反「从容」');
});

test('lintCopy：非字符串与空串不抛异常', () => {
  assert.deepEqual(lintCopy(''), { violations: [] });
  assert.deepEqual(lintCopy(undefined), { violations: [] });
  assert.deepEqual(lintCopy(null), { violations: [] });
  assert.deepEqual(lintCopy(123), { violations: [] });
});

// ─────────────────────────────────────────────
// 零宽字符走私（双盲审 P3，随 P1-2 修）：ZWSP/ZWNJ/ZWJ/BOM/词连接符
// 剥离仅用于匹配——不改变存库原文，violations.word/index 取规范化文本
// ─────────────────────────────────────────────
test('lintCopy 零宽走私：「限␈时」「特␈惠」等各类零宽字符插入仍全命中', () => {
  const r = lintCopy('限\u200B时特\u2060惠');
  assert.deepEqual(r.violations.map((v) => v.word), ['限时', '特惠']);
  assert.deepEqual(lintCopy('轻\u200C奢\u200D托特').violations.map((v) => v.word), ['轻奢']);
  assert.deepEqual(lintCopy('亲\uFEFF，看看这只').violations.map((v) => v.word), ['亲']);
  assert.deepEqual(lintCopy('秒\u200B\u200C杀').violations.map((v) => v.word), ['秒杀']);
});

test('lintCopy 零宽走私：感叹号正则条目同样不可逃（!!中插零宽）', () => {
  // 「!␈!」剥离后为「!!」→ 命中 [!！]{2,}
  const r = lintCopy('速来!\u200B!');
  assert.equal(r.violations.length, 1);
  assert.equal(r.violations[0].word, '!!');
});

test('lintCopy 零宽：纯零宽字符串与合法文案不受影响（正控）', () => {
  assert.deepEqual(lintCopy('\u200B\u200C\u200D\uFEFF\u2060').violations, [], '纯零宽剥离后为空');
  assert.deepEqual(lintCopy('总有一只先背。——2025 秋冬，到货了').violations, []);
});

test('checkNameImage 零宽走私：「托␈特包」不得借零宽逃过包型冲突红拦', () => {
  const r = checkNameImage({
    name: '托\u200B特包',
    description: '',
    factCard: { mainColor: '黑', bagType: '凯莉' },
  });
  assert.ok(r.blockers.some((b) => b.code === 'BAG_SILHOUETTE_MISMATCH'));
  // 反向：零宽不制造假冲突——名实相符仍放行
  const ok = checkNameImage({
    name: '托\u200B特包',
    description: '',
    factCard: { mainColor: '黑', bagType: '托特' },
  });
  assert.equal(ok.blockers.length, 0);
});

test('checkNameImage 零宽：事实卡主色含零宽仍正确归入色系比对', () => {
  const r = checkNameImage({
    name: '黑色小圆筒',
    description: '',
    factCard: { mainColor: '黑\u200B', bagType: '小圆筒' },
  });
  assert.equal(r.blockers.length, 0);
  assert.ok(!r.warnings.some((w) => w.code === 'COLOR_MISMATCH'), '事实卡黑系零宽不误报');
});

test('lintCopy：自定义词表完全替换默认（后端闸可传同源 JSON）', () => {
  const custom = [{ word: '香草', reason: '测试', suggestion: '原香' }];
  const r = lintCopy('限时香草味', custom);
  assert.equal(r.violations.length, 1);
  assert.equal(r.violations[0].word, '香草');
  assert.equal(r.violations[0].suggestion, '原香');
});

// ─────────────────────────────────────────────
// 三、checkNameImage：归一化与规则分支
// ─────────────────────────────────────────────
test('归一化：湖蓝↔蓝 双向同系不警（子串归一）', () => {
  const a = checkNameImage({ name: '湖蓝托特', description: '', factCard: { mainColor: '蓝', bagType: '托特' } });
  const b = checkNameImage({ name: '蓝托特', description: '', factCard: { mainColor: '湖蓝', bagType: '托特' } });
  assert.deepEqual(a, { warnings: [], blockers: [] });
  assert.deepEqual(b, { warnings: [], blockers: [] });
});

test('归一化：柠檬黄↔黄 双向同系不警', () => {
  const a = checkNameImage({ name: '柠檬黄小圆筒', description: '', factCard: { mainColor: '黄', bagType: '圆筒' } });
  const b = checkNameImage({ name: '黄', description: '', factCard: { mainColor: '柠檬黄', bagType: '圆筒' } });
  assert.deepEqual(a, { warnings: [], blockers: [] });
  assert.deepEqual(b, { warnings: [], blockers: [] });
});

test('归一化：小圆筒↔圆筒 同组；与波士顿冲突则红拦', () => {
  const ok = checkNameImage({ name: '圆筒', description: '', factCard: { mainColor: '黑', bagType: '小圆筒' } });
  assert.deepEqual(ok, { warnings: [], blockers: [] });
  const bad = checkNameImage({ name: '小圆筒', description: '', factCard: { mainColor: '黑', bagType: '波士顿' } });
  assert.equal(bad.blockers.filter((b) => b.code === 'BAG_SILHOUETTE_MISMATCH').length, 1);
});

test('英文别名：Tote 与事实卡「托特」同组不拦', () => {
  const r = checkNameImage({ name: '黑色 Tote 包', description: '', factCard: { mainColor: '黑', bagType: '托特' } });
  assert.deepEqual(r, { warnings: [], blockers: [] });
});

// ─────────────────────────────────────────────
// 三·五、M4（反查 P3）：叠结构词防过拦
// ─────────────────────────────────────────────
test('叠结构词：云朵枕头包（事实卡枕头）→ 任一命中词匹配即不红拦，次要词黄警', () => {
  const r = checkNameImage({
    name: '云朵枕头包',
    description: '',
    factCard: { mainColor: '黑', bagType: '枕头包' },
  });
  assert.equal(r.blockers.length, 0, '「枕头」与事实卡一致，主结构在案，不得红拦');
  const secondary = r.warnings.filter((w) => w.code === 'BAG_SILHOUETTE_SECONDARY');
  assert.equal(secondary.length, 1, '「云朵」作为次要叠加词降级黄警恰好一条');
  assert.equal(secondary[0].word, '云朵');
  assert.equal(secondary[0].factBagType, '枕头包');
});

test('叠结构词：波士顿托特混写（事实卡凯莉）→ 两个命中词都不匹配，仍红拦', () => {
  const r = checkNameImage({
    name: '波士顿托特包',
    description: '',
    factCard: { mainColor: '黑', bagType: '凯莉' },
  });
  const blockers = r.blockers.filter((b) => b.code === 'BAG_SILHOUETTE_MISMATCH');
  assert.equal(blockers.length, 2, '波士顿、托特均与事实卡不一致，各红拦一条');
  assert.deepEqual(blockers.map((b) => b.word).sort(), ['托特', '波士顿']);
  assert.ok(!r.warnings.some((w) => w.code === 'BAG_SILHOUETTE_SECONDARY'), '无任何匹配词时不降级');
});

test('叠结构词：同组叠加不产生次要词黄警（小圆筒+圆筒 同 canonical 只记一次）', () => {
  const r = checkNameImage({
    name: '小圆筒圆筒包',
    description: '',
    factCard: { mainColor: '黑', bagType: '圆筒' },
  });
  assert.deepEqual(r, { warnings: [], blockers: [] });
});

test('R4 缺包型：文案与事实卡均无包型词 → 红拦 BAG_TYPE_MISSING', () => {
  const r = checkNameImage({ name: '黑色的它', description: '很能装', factCard: { mainColor: '黑', bagType: '' } });
  assert.ok(r.blockers.some((b) => b.code === 'BAG_TYPE_MISSING'));
  assert.equal(r.warnings.length, 0);
  // factCard 整个缺省同样红拦
  const r2 = checkNameImage({ name: '好看的包', description: '' });
  assert.ok(r2.blockers.some((b) => b.code === 'BAG_TYPE_MISSING'));
});

test('R3 背法冲突：斜挎 vs 手提 → 黄警而非红拦', () => {
  const r = checkNameImage({ name: '黑色斜挎包', description: '', factCard: { mainColor: '黑', bagType: '手提' } });
  assert.equal(r.blockers.length, 0);
  assert.ok(r.warnings.some((w) => w.code === 'CARRY_MISMATCH' && w.word === '斜挎'));
  const ok = checkNameImage({ name: '黑色斜挎包', description: '', factCard: { mainColor: '黑', bagType: '斜挎' } });
  assert.deepEqual(ok, { warnings: [], blockers: [] });
});

test('R5 事实卡缺项：文案有颜色/包型词而事实卡为空 → 黄警提示回第一闸', () => {
  const colorMissing = checkNameImage({ name: '红色翻盖包', description: '', factCard: { mainColor: '', bagType: '翻盖' } });
  assert.ok(colorMissing.warnings.some((w) => w.code === 'FACT_CARD_COLOR_MISSING'));
  assert.ok(!colorMissing.warnings.some((w) => w.code === 'COLOR_MISMATCH'), '无法比对时不再叠色警');
  const bagMissing = checkNameImage({ name: '红色翻盖包', description: '', factCard: { mainColor: '红', bagType: '' } });
  assert.ok(bagMissing.warnings.some((w) => w.code === 'FACT_CARD_BAG_MISSING'));
  assert.equal(bagMissing.blockers.length, 0);
});

test('五金语境防误报：银色链条/金色五金 不触发颜色黄警', () => {
  const r = checkNameImage({
    name: '黑色托特',
    description: '配银色链条和金色五金',
    factCard: { mainColor: '黑', bagType: '托特' },
  });
  assert.deepEqual(r, { warnings: [], blockers: [] });
});

test('链条双义消歧：色字领起的「链条」算链带；「链条包」仍是结构包型', () => {
  const asBag = checkNameImage({ name: '黑色链条包', description: '', factCard: { mainColor: '黑', bagType: '链条' } });
  assert.deepEqual(asBag, { warnings: [], blockers: [] });
  const wrongBag = checkNameImage({ name: '黑色链条包', description: '', factCard: { mainColor: '黑', bagType: '托特' } });
  assert.ok(wrongBag.blockers.some((b) => b.code === 'BAG_SILHOUETTE_MISMATCH'));
});

test('完全相符的干净样本：warnings 与 blockers 全空', () => {
  const r = checkNameImage({
    name: '樱花粉腋下包',
    description: '樱花粉小腋下包，春天的样子',
    factCard: { mainColor: '樱花粉', bagType: '腋下' },
  });
  assert.deepEqual(r, { warnings: [], blockers: [] });
});

test('checkNameImage：缺省入参不抛异常', () => {
  const r = checkNameImage();
  assert.ok(Array.isArray(r.warnings) && Array.isArray(r.blockers));
});

// ─────────────────────────────────────────────
// 四、sanityCheck
// ─────────────────────────────────────────────
test('sanityCheck：正常输入全绿', () => {
  const r = sanityCheck({ price: 399, originalPrice: 599, stock: 10 });
  assert.deepEqual(r, { errors: [], warnings: [] });
});

test('sanityCheck：现价非法（缺失/非数/≤0）→ errors', () => {
  assert.ok(sanityCheck({ price: 0, stock: 1 }).errors.some((e) => e.code === 'price_not_positive'));
  assert.ok(sanityCheck({ price: -5, stock: 1 }).errors.some((e) => e.code === 'price_not_positive'));
  assert.ok(sanityCheck({ price: NaN, stock: 1 }).errors.some((e) => e.code === 'price_invalid'));
  assert.ok(sanityCheck({}).errors.some((e) => e.code === 'price_missing'));
});

test('sanityCheck：原价低于现价 / 原价非法 → errors；不填原价放行', () => {
  const below = sanityCheck({ price: 399, originalPrice: 299, stock: 5 });
  assert.ok(below.errors.some((e) => e.code === 'original_below_price'));
  const invalid = sanityCheck({ price: 399, originalPrice: 0, stock: 5 });
  assert.ok(invalid.errors.some((e) => e.code === 'original_price_invalid'));
  const none = sanityCheck({ price: 399, originalPrice: null, stock: 5 });
  assert.equal(none.errors.length, 0);
});

test('sanityCheck：库存负数/非整数/缺失 → errors；零库存 → 黄警', () => {
  assert.ok(sanityCheck({ price: 10, stock: -1 }).errors.some((e) => e.code === 'stock_negative'));
  assert.ok(sanityCheck({ price: 10, stock: 2.5 }).errors.some((e) => e.code === 'stock_not_integer'));
  assert.ok(sanityCheck({ price: 10 }).errors.some((e) => e.code === 'stock_missing'));
  const zero = sanityCheck({ price: 10, stock: 0 });
  assert.equal(zero.errors.length, 0);
  assert.ok(zero.warnings.some((w) => w.code === 'zero_stock'));
});

test('sanityCheck：同类价格偏离中位数超阈值 → 黄警 price_deviation', () => {
  const dev = sanityCheck({ price: 399, stock: 5, peerPrices: [199, 209, 189] });
  const w = dev.warnings.find((x) => x.code === 'price_deviation');
  assert.ok(w, '偏离同类中位数应黄警');
  assert.equal(w.median, 199);
  const ok = sanityCheck({ price: 199, stock: 5, peerPrices: [189, 199, 209] });
  assert.ok(!ok.warnings.some((x) => x.code === 'price_deviation'));
});

test('sanityCheck：peerPrices 中的非法项被忽略；偶数个样本取两数均值', () => {
  const ok = sanityCheck({ price: 199, stock: 5, peerPrices: ['x', -1, 200] });
  assert.ok(!ok.warnings.some((x) => x.code === 'price_deviation'));
  const even = sanityCheck({ price: 600, stock: 5, peerPrices: [200, 200, 300, 300] });
  const w = even.warnings.find((x) => x.code === 'price_deviation');
  assert.ok(w && w.median === 250);
});

test('sanityCheck：划线价虚高（≥现价 3 倍）→ 黄警', () => {
  const r = sanityCheck({ price: 100, originalPrice: 400, stock: 1 });
  assert.ok(r.warnings.some((w) => w.code === 'original_price_inflated'));
  assert.equal(r.errors.length, 0);
  assert.equal(SANITY_THRESHOLDS.ORIGINAL_INFLATE_WARN_RATIO, 3);
  assert.equal(SANITY_THRESHOLDS.PEER_DEVIATION_WARN_RATIO, 0.5);
});

// ─────────────────────────────────────────────
// R3（二次修复 2026-10-05）：隐形字符家族扩展 + NFKC。
// X1/X2 各实锤不同码位逃逸：U+00AD 软连字符、U+034F 组合字连接符、
// U+2061-2064 隐形操作符族、U+FE00-FE0F 变体选择符、全角英文、CJK 兼容变体。
// 修法 = NFKC 归一化 + 剥残余不可见码位（NFKC 不消的兜底）。
// ─────────────────────────────────────────────
test('R3 隐形码位：软连字符 U+00AD / CGJ U+034F / 隐形操作符 U+2061-2064 / VS U+FE00 逐码位走私全命中', () => {
  // 禁用词面「限时」被各码位拆开 → 剥离后仍命中
  assert.deepEqual(lintCopy('限\u00AD时秒杀').violations.map((v) => v.word), ['限时', '秒杀']);
  assert.deepEqual(lintCopy('限\u034F时秒杀').violations.map((v) => v.word), ['限时', '秒杀']);
  assert.deepEqual(lintCopy('限\u2061时秒杀').violations.map((v) => v.word), ['限时', '秒杀']);
  assert.deepEqual(lintCopy('限\u2062时秒杀').violations.map((v) => v.word), ['限时', '秒杀']);
  assert.deepEqual(lintCopy('限\u2063时秒杀').violations.map((v) => v.word), ['限时', '秒杀']);
  assert.deepEqual(lintCopy('限\u2064时秒杀').violations.map((v) => v.word), ['限时', '秒杀']);
  assert.deepEqual(lintCopy('限\uFE00时秒杀').violations.map((v) => v.word), ['限时', '秒杀']);
  assert.deepEqual(lintCopy('限\uFE0F时秒杀').violations.map((v) => v.word), ['限时', '秒杀']);
});

test('R3 NFKC：全角英文包型词（ＢＯＳＴＯＮ手提包 vs 凯莉卡）命中红拦（X2 全角规避实锤）', () => {
  const r = checkNameImage({
    name: 'ＢＯＳＴＯＮ手提包',
    description: '',
    factCard: { mainColor: '黑', bagType: '凯莉' },
  });
  const blockers = r.blockers.filter((b) => b.code === 'BAG_SILHOUETTE_MISMATCH');
  assert.equal(blockers.length, 1, '全角ＢＯＳＴＯＮ 归一为 boston，与凯莉卡结构冲突红拦');
  assert.equal(blockers[0].copyType, '波士顿');
  // 反向：全角与事实卡一致时不误拦
  const ok = checkNameImage({
    name: 'ＢＯＳＴＯＮ手提包',
    description: '',
    factCard: { mainColor: '黑', bagType: '波士顿' },
  });
  assert.equal(ok.blockers.length, 0, '全角包型词与卡一致，放行');
});

test('R3 NFKC：CJK 兼容变体（U+F90A→金）仍参与色系比对，不再逃逸', () => {
  // 描述用兼容变体 金（U+F90A）写「香槟金」→ NFKC 折回「香槟金」命中金系；
  // 事实卡黑系 → COLOR_MISMATCH 黄警（匹配面恢复，而非静默漏检）
  const r = checkNameImage({
    name: '黑色波士顿',
    description: '配色灵感来自香槟\uF90A',
    factCard: { mainColor: '黑', bagType: '波士顿' },
  });
  assert.ok(
    r.warnings.some((w) => w.code === 'COLOR_MISMATCH' && w.family === '金'),
    '兼容变体 金 归一为 金，参与色系比对',
  );
  // 反向：事实卡用兼容变体写主色，文案的规范形「金」不误报
  // （描述避开五金语境——「香槟金五金」会被五金消歧跳过，取非五金语境断言）
  const ok = checkNameImage({
    name: '波士顿手提包',
    description: '香槟金的温润光泽',
    factCard: { mainColor: '\uF90A', bagType: '波士顿' },
  });
  assert.ok(!ok.warnings.some((w) => w.code === 'COLOR_MISMATCH'), '卡侧变体归一后同系不误报');
});

test('R3 已知限制正控：繁体「限時搶購」仍会过（繁简归一挂账产品决策，不在此修）', () => {
  assert.deepEqual(lintCopy('限時搶購').violations, [], '繁简不做归一——显式声明为已知限制');
});

test('R3 不影响合法文案：NFKC 后零宽正控仍绿', () => {
  assert.deepEqual(lintCopy('\u200B\u200C\u200D\uFEFF\u2060\u00AD\u034F\u2061\uFE0F').violations, [], '纯隐形字符剥离后为空');
  assert.deepEqual(lintCopy('总有一只先背。——2025 秋冬，到货了').violations, []);
  assert.deepEqual(lintCopy('偶尔来信，不打扰。（真的偶尔。）').violations, [], '全角标点归一不产生假命中');
});

// ─────────────────────────────────────────────
// R5（二次修复 2026-10-05）：闸稀释——blocker 不因 warning 降级。
// 根因：M4「任一命中降级」为全局语义，name 命中主包型时 description 里
// 与卡冲突的结构词被稀释为黄警放行（X1 实锤：name=凯莉包+老描述含"托特"→200 落库）。
// 修法：降级判定收窄为「同字段命中」——描述的结构冲突与 name 命中无关。
// ─────────────────────────────────────────────
test('R5 闸稀释（X1 原案）：name=凯莉包+描述含托特+卡凯莉 → 红拦（不再被 name 命中稀释）', () => {
  const r = checkNameImage({
    name: '凯莉包',
    description: '老描述：一只经典托特，通勤也拿得出手',
    factCard: { mainColor: '黑', bagType: '凯莉' },
  });
  const blockers = r.blockers.filter((b) => b.code === 'BAG_SILHOUETTE_MISMATCH');
  assert.equal(blockers.length, 1, '描述的托特与卡凯莉结构冲突，独立红拦');
  assert.equal(blockers[0].field, 'description');
  assert.equal(blockers[0].word, '托特');
  assert.ok(!r.warnings.some((w) => w.code === 'BAG_SILHOUETTE_SECONDARY'), '不得降级为次要词黄警');
});

test('R5 对称面：描述命中不稀释标题的结构冲突', () => {
  const r = checkNameImage({
    name: '托特包',
    description: '经典凯莉版型',
    factCard: { mainColor: '黑', bagType: '凯莉' },
  });
  assert.ok(
    r.blockers.some((b) => b.code === 'BAG_SILHOUETTE_MISMATCH' && b.field === 'name' && b.word === '托特'),
    '标题托特 vs 卡凯莉：描述命中凯莉不得洗白标题冲突',
  );
});

test('R5 不回退 M4：同字段叠词降级语义保留（云朵枕头包 vs 卡枕头包 仍是次要词黄警）', () => {
  const r = checkNameImage({
    name: '云朵枕头包',
    description: '',
    factCard: { mainColor: '黑', bagType: '枕头包' },
  });
  assert.equal(r.blockers.length, 0);
  const secondary = r.warnings.filter((w) => w.code === 'BAG_SILHOUETTE_SECONDARY');
  assert.equal(secondary.length, 1);
  assert.equal(secondary[0].word, '云朵');
});

test('R5 同字段命中才降级：name 含匹配词+描述只含冲突词 → 描述红拦；两字段各自干净则放行', () => {
  // name 云朵+枕头（枕头=匹配）→ name 内云朵降黄警；description 只有云朵（无匹配）→ 红拦
  const r = checkNameImage({
    name: '云朵枕头包',
    description: '云朵般柔软',
    factCard: { mainColor: '黑', bagType: '枕头包' },
  });
  const blockers = r.blockers.filter((b) => b.code === 'BAG_SILHOUETTE_MISMATCH');
  assert.equal(blockers.length, 1, '描述的云朵（该字段无任何匹配词）独立红拦');
  assert.equal(blockers[0].field, 'description');
  assert.ok(
    r.warnings.some((w) => w.code === 'BAG_SILHOUETTE_SECONDARY' && w.field === 'name' && w.word === '云朵'),
    '标题内云朵仍按叠词降级黄警',
  );
});

test('R5 与 R3 组合：全角冲突词+name 命中也不稀释（ＴＯＴＥ 描述 vs 凯莉卡）', () => {
  const r = checkNameImage({
    name: '凯莉包',
    description: 'ＴＯＴＥ 版型经典',
    factCard: { mainColor: '黑', bagType: '凯莉' },
  });
  assert.ok(
    r.blockers.some((b) => b.code === 'BAG_SILHOUETTE_MISMATCH' && b.field === 'description'),
    '全角 ＴＯＴＥ 归一命中托特，结构冲突红拦且不被 name 命中稀释',
  );
});

// ─────────────────────────────────────────────
// 五、三修 P1（fix2 §三 2）：Cf 属性类剥离 + White_Space 折叠去空格比对
// ─────────────────────────────────────────────
test('三修 P1：Cf 属性类抽样 10 码位（覆盖零宽/双定向/隔离/记号/语言标签各子族）拆词全拦', () => {
  // 从 Cf 全族（本 Unicode 版共 170 码位，Y1 枚举 160+）按子族抽 10 个：
  const samples = [
    ['U+00AD', '软连字符'], ['U+061C', '阿拉伯记号'], ['U+200B', '零宽空格'],
    ['U+200E', '从左到右记号'], ['U+202A', '双向嵌入 LRE'], ['U+202E', '反向覆盖 RLO'],
    ['U+2060', '词连接符'], ['U+2066', '从左隔离 LRI'], ['U+FEFF', 'BOM/零宽不换行'],
    ['U+E0001', '语言标签启动符'],
  ];
  for (const [cp, label] of samples) {
    const r = lintCopy(`限${String.fromCodePoint(parseInt(cp.slice(2), 16))}时`);
    assert.ok(
      r.violations.some((v) => v.word === '限时'),
      `${cp}（${label}）拆词应被剥离后命中「限时」`,
    );
  }
});

test('三修 P1：Mn 残余（U+034F 组合字连接符 / U+FE0F 变体选择符）仍显式剥离', () => {
  assert.ok(lintCopy('限\u034F时').violations.some((v) => v.word === '限时'));
  assert.ok(lintCopy('抢\uFE0F购').violations.some((v) => v.word === '抢购'));
});

test('三修 P1：可见分隔符拆词收口——空格/全角空格/NBSP/制表符折叠后比对视图无空格', () => {
  for (const sep of [' ', '\u3000', '\u00A0', '\t', '\r\n']) {
    const r = lintCopy(`限${sep}时${sep}抢${sep}购`);
    const words = r.violations.map((v) => v.word);
    assert.ok(words.includes('限时') && words.includes('抢购'), `分隔符 ${JSON.stringify(sep)} 拆词应被折叠收口`);
  }
  // word 报文脱离原文（如实声明）：原文带空格，报文是去空格比对视图的词面
  const r = lintCopy('限 时');
  assert.equal(r.violations[0].word, '限时');
});

test('三修 P1：checkNameImage 同源收口——「托 特包」按去空格视图命中托特红拦', () => {
  const r = checkNameImage({
    name: '托 特包',
    description: '',
    factCard: { mainColor: '黑', bagType: '凯莉' },
  });
  assert.ok(
    r.blockers.some((b) => b.code === 'BAG_SILHOUETTE_MISMATCH' && b.word === '托特'),
    '空格拆词的托特在去空格比对视图下结构冲突红拦',
  );
});

test('三修 P1：去空格后例外词仍生效（「亲 切」不因折叠误报「亲」）', () => {
  const r = lintCopy('亲 切自然的描述');
  assert.equal(r.violations.filter((v) => v.word === '亲').length, 0, '去空格后例外词按比对视图探测');
});

test('三修已知限制（如实锁定）：中点 U+00B7（Po 类）不在 Cf/White_Space，拆词仍过——挂账待裁', () => {
  // 本用例锁定的是【当前声明的盲区现状】，修复（可见标点分隔符治理）后应删改本断言
  const r = lintCopy('限\u00B7时');
  assert.equal(r.violations.length, 0, 'U+00B7 中点拆词仍属声明盲区（fix2 §三 2 已知限制）');
});
