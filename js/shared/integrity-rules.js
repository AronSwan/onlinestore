/**
 * REICH 名实相符三闸 · 规则引擎纯函数层（方向二 M4 / docs/modernization-discussion.md v1.1 §2.1）
 *
 * 三闸分工：第一闸=事实卡强制看图四选（主色/包型/五金/场合，表单层）；
 *          第二闸=词表冲突自动比对（本模块 checkNameImage）；
 *          第三闸=发布前对图朗读人工兜底（管理界面层）。
 * 本模块承担第二闸与两翼校验（lint / sanity），供里程碑二管理界面（M3 admin.html+admin.js）直接 import。
 *
 * 纯函数约定：
 *   - 无 DOM / 无网络 / 无全局可变状态；Node ≥ 18 与现代浏览器均可直接 ESM import。
 *   - 业务异常不抛出：入参缺省一律按空处理，返回结构恒定 {…[], …[]}。
 *   - 返回值均为新建对象，可安全 JSON.stringify。
 *
 * 严重级别语义（与 §2.1 对齐）：
 *   - warnings（黄警）：允许保存草稿，但发布预览必须逐条人工确认；
 *   - blockers（红拦）：禁止发布，必须改文案或改事实卡后重检；
 *   - errors（sanity）：数值非法，禁止保存。
 *
 * 数据事实源：禁用词表单一事实源是 ./voice-rules.json（后端闸直接读取）；
 * 本文件内嵌同构镜像 VOICE_RULES 供前端同步使用，integrity-rules.test.js
 * 断言两者深度相等以防漂移。加词流程见 docs/voice-rules-manual.md。
 */

export const INTEGRITY_RULES_VERSION = '1.1.0';

// ─────────────────────────────────────────────────────────────
// 一、语音表禁用词（voice-sheet.md「禁用词表」机器可读镜像）
//    entry 字段：word（词面或 pattern 条目的显示名）/ reason（违规原因）/
//    suggestion（合规替代）/ exceptions（含该词但属误报的长词，如 亲自、宝石）/
//    pattern+flags（正则条目，如多个感叹号）。
// ─────────────────────────────────────────────────────────────
export const VOICE_RULES = {
  version: 1,
  source: 'docs/voice-sheet.md 禁用词表（P8a · 前置于 P2）',
  updated: '2026-10-04',
  banned: [
    { word: '限时', reason: '促销语言，与「从容」定调冲突', suggestion: '本季 / 新到' },
    { word: '抢购', reason: '促销语言，与「从容」定调冲突', suggestion: '新到 / 心头好' },
    { word: '秒杀', reason: '促销语言，与「从容」定调冲突', suggestion: '本季精选' },
    { word: '特惠', reason: '促销语言，与「从容」定调冲突', suggestion: '心头好' },
    { word: '爆款', reason: '促销从众话术，制造焦虑', suggestion: '本季人气款 / 常青款' },
    { word: '轻奢', reason: '自封品质词，心虚式营销', suggestion: '删掉，或写具体材质与工艺' },
    { word: '奢华', reason: '自封品质词（voice-sheet「奢华享受」）', suggestion: '不写——删掉让产品说话' },
    { word: '顶级', reason: '自封品质词，大气靠排版与留白传达', suggestion: '不写——删掉让产品说话' },
    { word: '尊贵', reason: '自封品质词，大气靠排版与留白传达', suggestion: '不写——删掉让产品说话' },
    { word: '立即', reason: '催促焦虑', suggestion: '来看看 / 慢慢挑' },
    { word: '马上', reason: '催促焦虑', suggestion: '慢慢挑' },
    { word: '赶快', reason: '催促焦虑', suggestion: '来看看' },
    {
      word: '亲',
      reason: '电商客服腔',
      suggestion: '你（或不用称呼）',
      exceptions: [
        '亲自', '亲肤', '亲切', '亲近', '亲爱', '亲临', '亲测', '亲民', '亲历',
        '亲笔', '亲吻', '亲热', '亲昵', '亲眷', '亲朋', '双亲', '父亲', '母亲',
        '和亲', '成亲', '定亲', '提亲', '迎亲', '结亲', '沾亲',
      ],
    },
    {
      word: '宝',
      reason: '电商客服腔',
      suggestion: '你（或不用称呼）',
      exceptions: ['宝蓝', '宝石', '宝藏', '珍宝', '国宝', '至宝', '元宝'],
    },
    { word: '宝贝', reason: '电商客服腔', suggestion: '你（或不用称呼）' },
    {
      word: '多个感叹号（！！/!!）',
      reason: '尖叫感，与「从容」定调冲突',
      suggestion: '句号或省略号（单个感叹号可保留）',
      pattern: '[!！]{2,}',
      flags: 'g',
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 二、颜色词表（checkNameImage 数据）
//    key = 色系（family），value = 该色系下的成员词（成员词是文案扫描词面）。
//    归一规则：文案词与事实卡主色各自映射到色系后比较——
//    「湖蓝」与「蓝」同属蓝系、「柠檬黄」与「黄」同属黄系，互不报警。
//    管理界面可直接把 COLOR_FAMILIES 渲染成事实卡「主色」下拉。
// ─────────────────────────────────────────────────────────────
export const COLOR_FAMILIES = {
  黑: ['黑', '炭黑', '墨黑', '哑光黑'],
  白: ['白', '米白', '奶白', '象牙白', '珍珠白', '纯白'],
  棕: ['棕', '棕色', '褐色', '棕褐', '咖啡', '咖啡色', '驼', '驼色', '焦糖', '栗色'],
  蓝: ['蓝', '湖蓝', '天蓝', '宝蓝', '藏蓝', '雾霾蓝', '克莱因蓝', '丹宁蓝', '牛仔蓝', '浅蓝', '深蓝'],
  绿: ['绿', '抹茶绿', '薄荷绿', '牛油果绿', '橄榄绿', '墨绿', '浅绿', '苹果绿', '鼠尾草绿'],
  粉: ['粉', '樱花粉', '藕粉', '裸粉', '干枯玫瑰粉', '玫粉', '烟粉', '浅粉', '嫩粉'],
  黄: ['黄', '柠檬黄', '姜黄', '鹅黄', '奶油黄', '暖黄', '浅黄', '明黄'],
  紫: ['紫', '香芋紫', '葡萄紫', '雾紫', '浅紫', '藕紫', '丁香紫'],
  红: ['红', '酒红', '砖红', '玫红', '枚红', '樱桃红', '铁锈红', '浅红'],
  金: ['金', '香槟金', '玫瑰金', '浅金', '鎏金'],
  橙: ['橙', '橙色', '橘', '橘色', '落日橙', '蜜橙', '活力橙'],
  灰: ['灰', '雾灰', '浅灰', '水泥灰', '深灰'],
  银: ['银', '银色', '哑光银'],
  渐变: ['渐变', '渐变色'],
  拼色: ['拼色', '撞色', '双色'],
};

// 事实卡主色归一用的根字（事实卡值只需包含根字即归入该色系，如「香槟金」→ 金）
const COLOR_ROOTS = ['黑', '白', '棕', '蓝', '绿', '粉', '黄', '紫', '红', '金', '橙', '灰', '银'];

// 文案扫描词表：全部成员词摊平、长词优先（避免「樱花粉」被拆成「粉」、「湖蓝」被拆成「蓝」）
const COLOR_SCAN_LIST = Object.entries(COLOR_FAMILIES)
  .flatMap(([family, words]) => words.map((word) => ({ word, family })))
  .sort((a, b) => b.word.length - a.word.length);

// 颜色词紧邻五金/配件语境时跳过（「金色五金」「银色链条」「拉链银」描述的是五金不是包身）
// 结尾单「五」用于命中「五金」一词自身的「金」字（前缀窗口只剩「…五」）
const HW_BEFORE = /(五金|拉链|链扣|锁扣|五)$/;
const HW_AFTER = /^色{0,1}(?:五金|链条|链扣|拉链|锁扣|链|扣|配件|电镀)/;

// ─────────────────────────────────────────────────────────────
// 三、包型词表（checkNameImage 数据）
//    分两个维度：
//    silhouettes = 结构包型（一只包只有一个结构；写进名字即主要卖点，
//                  文案结构词 ≠ 事实卡结构词 → 红拦，名实不符必须拦下）；
//    carryStyles = 背法（一只包可以既手提又斜挎，冲突 → 黄警即可）。
//    同组 words 互为同义/子串（小圆筒 与 圆筒 同组；tote 与 托特 同组）。
// ─────────────────────────────────────────────────────────────
export const BAG_SILHOUETTES = [
  { canonical: '波士顿', words: ['波士顿', 'boston'] },
  { canonical: '凯莉', words: ['凯莉', 'kelly'] },
  { canonical: '托特', words: ['托特', 'tote'] },
  { canonical: '链条', words: ['链条包', '链条', 'chain'] },
  { canonical: '水桶', words: ['水桶', 'bucket'] },
  { canonical: '圆筒', words: ['小圆筒', '圆筒'] },
  { canonical: '腋下', words: ['腋下'] },
  { canonical: '翻盖', words: ['翻盖'] },
  { canonical: '贝壳', words: ['贝壳'] },
  { canonical: '邮差', words: ['邮差'] },
  { canonical: '马鞍', words: ['马鞍'] },
  { canonical: '法棍', words: ['法棍'] },
  { canonical: '云朵', words: ['云朵'] },
  { canonical: '枕头', words: ['枕头'] },
  { canonical: '菜篮', words: ['菜篮子', '菜篮'] },
  { canonical: '果冻', words: ['果冻'] },
  { canonical: '蝴蝶', words: ['蝴蝶'] },
  { canonical: '水饺', words: ['水饺'] },
];

export const BAG_CARRY_STYLES = [
  { canonical: '斜挎', words: ['斜挎', 'crossbody'] },
  { canonical: '手提', words: ['手提', '手拎'] },
  { canonical: '单肩', words: ['单肩'] },
  { canonical: '手拿', words: ['手拿包', '手拿'] },
];

const BAG_SCAN_LIST = [
  ...BAG_SILHOUETTES.flatMap((g) => g.words.map((word) => ({ word, dimension: 'silhouette', canonical: g.canonical }))),
  ...BAG_CARRY_STYLES.flatMap((g) => g.words.map((word) => ({ word, dimension: 'carry', canonical: g.canonical }))),
].sort((a, b) => b.word.length - a.word.length);

// ─────────────────────────────────────────────────────────────
// 四、sanity 阈值（管理界面可在调用处覆盖展示，逻辑阈值在此统一）
// ─────────────────────────────────────────────────────────────
export const SANITY_THRESHOLDS = {
  /** 现价偏离同类中位数超过 50% → 黄警（提示定价手滑，如 399 误输 39.9 / 3990） */
  PEER_DEVIATION_WARN_RATIO: 0.5,
  /** 划线价 ≥ 现价 3 倍 → 黄警（涉嫌划线价虚高） */
  ORIGINAL_INFLATE_WARN_RATIO: 3,
};

// ═════════════════════════════════════════════════════════════
// 内部工具
// ═════════════════════════════════════════════════════════════

/**
 * 判断 text 中位于 [start, start+len) 的禁用词命中是否落在某个例外词内部。
 * 例外词可包含在命中之前（母亲/双亲）或之后（亲自/宝蓝），双向探测。
 * @private
 */
function isExcepted(text, start, word, exceptions) {
  if (!Array.isArray(exceptions)) return false;
  for (const ex of exceptions) {
    if (typeof ex !== 'string' || !ex.includes(word)) continue;
    let k = ex.indexOf(word);
    while (k !== -1) {
      if (start - k >= 0 && text.startsWith(ex, start - k)) return true;
      k = ex.indexOf(word, k + 1);
    }
  }
  return false;
}

function normalizeRules(rules) {
  const list = Array.isArray(rules) && rules.length > 0 ? rules : VOICE_RULES.banned;
  return list.filter(
    (e) => e && typeof e === 'object' && typeof e.word === 'string' && e.word.length > 0 &&
      (e.pattern === undefined || typeof e.pattern === 'string'),
  );
}

/** 事实卡主色字符串 → 色系集合（根字归一 + 渐变/拼色关键字）@private */
function detectColorFamilies(factColor) {
  const families = new Set();
  if (!factColor) return families;
  for (const root of COLOR_ROOTS) if (factColor.includes(root)) families.add(root);
  if (factColor.includes('渐变')) families.add('渐变');
  if (factColor.includes('拼色') || factColor.includes('撞色')) families.add('拼色');
  return families;
}

/** 文案 → 颜色词命中列表（长词优先、跳过五金语境）@private */
function findColorHits(text, field) {
  const hits = [];
  let i = 0;
  while (i < text.length) {
    const hit = COLOR_SCAN_LIST.find((e) => text.startsWith(e.word, i));
    if (hit) {
      const end = i + hit.word.length;
      const before = text.slice(Math.max(0, i - 3), i);
      const after = text.slice(end, end + 6);
      if (!HW_BEFORE.test(before) && !HW_AFTER.test(after)) {
        hits.push({ field, index: i, word: hit.word, family: hit.family });
      }
      i = end;
    } else {
      i += 1;
    }
  }
  return hits;
}

/** 文案 → 包型词命中列表（英文别名按小写匹配，CJK 与 ASCII 小写化不改字符定位）@private */
function findBagHits(text, field) {
  const lower = text.toLowerCase();
  const hits = [];
  let i = 0;
  while (i < lower.length) {
    const hit = BAG_SCAN_LIST.find((e) => lower.startsWith(e.word, i));
    if (hit) {
      const end = i + hit.word.length;
      // 「链条」双义消歧：紧跟颜色字（银色链条/金色链条=链带五金描述）且后面不是「包」→ 按五金语境跳过；
      // 「黑色链条包」仍按结构包型命中。
      const colorLedChain = hit.canonical === '链条' && hit.word !== '链条包' &&
        text.charAt(i - 1) === '色' && text.charAt(end) !== '包';
      if (!colorLedChain) {
        hits.push({ field, index: i, word: text.slice(i, i + hit.word.length), dimension: hit.dimension, canonical: hit.canonical });
      }
      i = end;
    } else {
      i += 1;
    }
  }
  return hits;
}

/** 事实卡包型字符串 → 所属词组（结构优先于背法；空/未知返回 null）@private */
function findBagGroup(factBag) {
  if (!factBag) return null;
  for (const g of BAG_SILHOUETTES) if (g.words.some((w) => factBag.includes(w))) return { dimension: 'silhouette', canonical: g.canonical };
  for (const g of BAG_CARRY_STYLES) if (g.words.some((w) => factBag.includes(w))) return { dimension: 'carry', canonical: g.canonical };
  return null;
}

const FIELD_LABEL = { name: '标题', description: '描述' };

/**
 * 匹配用规范化（R3·二次修复 → P1·三修属性类 → P1-1·四修白名单折叠）：
 *  ① NFKC 归一化——全角英文（ＢＯＳＴＯＮ→BOSTON）、CJK 兼容变体
 *    （U+F900-FAFF 族，如 U+F90A→金）、全角标点（！→!）等折回规范形；
 *  ② 白名单折叠（四修主修，fix3 裁定）：只保留 \p{L}（字母）与 \p{N}（数字），
 *    其余字符【一律剥除】——Cf/Mn/Me/Mc/Co/Cn/Cs/So/Sk/Po/Pd/Pi/Pf/Pc 全部
 *    标点/符号/组合记号/私有区/未赋码位/代理对，及 White_Space/Zs/Zl/Zp 全部
 *    空白分隔，白名单法不需要枚举黑名单。三修的"Cf 属性类 + White_Space 折叠"
 *    仍属黑名单法（枚举哪些类要剥），X 组共中实证 Co/Cn/Mn 余码位/Emoji/Pd
 *    属性类外拆词族可绕名实红拦（"波[U+E000]士顿"+凯莉卡 201 落库）——本条
 *    一次收口全部属性类，中点 U+00B7/顿号 U+3001 等三修挂账的可见标点分隔
 *    盲区随之消灭；
 *  ③ 例外集：U+115F/U+1160/U+3164（Hangul 填充符；半角 U+FFA0 经 NFKC 折到
 *    U+1160）属 \p{L}（Lo 类）但视觉空白、可拆词可做空名，白名单内显式剥除
 *    ——\p{L} 内唯一需要枚举的例外族（Unicode 官方 filler 码位）。
 * 单 pass 实现（四修 P2"三连 pass 收单 pass"）：NFKC 后一次 replace 完成
 * 折叠+剥除，不再有 FORMAT_AND_MARK/ANY_WHITESPACE/去空格三连链。
 * 仅用于匹配：不改变存库原文；词表层（word 面）violations 的 index/word 与
 * checkNameImage 的定位词均指向本比对视图——word 报文可能脱离原文（原文
 * "限·时"，报文"限时"；原文 ＢＯＳＴＯＮ，报文 BOSTON），管理界面高亮按
 * 比对视图对齐，属既有契约的延伸（如实声明，承三修汇报）。
 * 已知限制（四修显式挂账）：
 *   - \p{L} 内其余视觉近似分隔符（片假名长音符 U+30FC「ー」，Lm 类）不在
 *     剥除集——剥它会误伤合法日文假名文本（比对视图会丢字），挂账待裁；
 *   - 跨书写系统同形字（西里尔 о ↔ 拉丁 o、希腊 Β ↔ 拉丁 B）NFKC 不折——
 *     需 confusable 映射表（Unicode confusables.txt），挂账不引库；
 *   - 不做繁简归一（NFKC 不做简繁转换，"限時搶購"仍会过——需专门映射表，
 *     挂账产品决策，承二次修复汇报）。
 * 单源声明：STRIP_PATTERN 字符串与 js/shared/normalize-pattern.json 的
 * stripPattern 必须逐字符一致（integrity-rules.test.js 一致性用例守门）。
 * 不直接 import JSON 的原因：本模块被浏览器原生 ESM（js/admin/gates.js，
 * 无构建链）与后端闸的 new Function 源码求值装载链（product-integrity.gate.ts
 * 第三级）同时消费——import 属性语法/JSON 模块在两条链上都不成立。
 * @private
 */
const STRIP_PATTERN = '[^\\p{L}\\p{N}]|[\\u115F\\u1160\\u3164]';
const COMPARE_VIEW_STRIP = new RegExp(STRIP_PATTERN, 'gu');
function normalizeForMatch(text) {
  return text.normalize('NFKC').replace(COMPARE_VIEW_STRIP, '');
}

/**
 * 轻归一（正则条目专用的"原文面"，四修 P1-1 两层分离）：NFKC 后仅剥
 * 不可见家族（\p{Cf} 属性类 + NFKC 不消的 Mn 残余 U+034F/U+FE00-FE0F）与
 * 全部空白——标点（！! · — 、）原样保留。供含 Po 类字符的 pattern 条目
 * （如多个感叹号 '[!！]{2,}'）匹配：这类条目在白名单比对视图里会被剥成
 * 空串，必须在保留标点的面上跑。与 normalizeForMatch 分工：词表（word 面，
 * 全 \p{L} 构成）走比对视图；正则（pattern 面，可含标点）走本轻归一视图。
 * @private
 */
const INVISIBLE_AND_SPACE = /[\p{Cf}\u034F\uFE00-\uFE0F\p{White_Space}]/gu;
function normalizeLightForPattern(text) {
  return text.normalize('NFKC').replace(INVISIBLE_AND_SPACE, '');
}

// ═════════════════════════════════════════════════════════════
// 闸门一（机器部分）：lintCopy —— 禁用词扫描
// ═════════════════════════════════════════════════════════════

/**
 * 语音表 lint：扫描禁用词（促销/自封品质/催促/客服腔/多个感叹号）。
 *
 * @param {string} text - 待检文案（商品名/描述/任意营销文案）；非字符串或空串返回空结果。
 * @param {Array<{word:string,reason?:string,suggestion?:string,exceptions?:string[],pattern?:string,flags?:string}>} [rules]
 *   词表；缺省用内嵌镜像 VOICE_RULES.banned。传入自定义词表时完全替换默认（不叠加），
 *   后端闸如需与前端共用，直接读 js/shared/voice-rules.json 传入即可（双闸同源）。
 * @returns {{violations: Array<{word:string,index:number,suggestion:string,reason:string}>}}
 *   violations 按出现位置升序；index 为词首字符在匹配视图中的下标（词表层=
 *   白名单比对视图、正则表层=轻归一原文面，可用于管理界面按视图对齐高亮）。
 *   同一文本命中多个词各记一条；「宝贝」不会被「宝」重复计数（长词优先、命中区间不重叠）。
 */
export function lintCopy(text, rules) {
  if (typeof text !== 'string' || text.length === 0) return { violations: [] };
  // 两层分离（四修 P1-1，fix3 裁定）：
  //  - 词表层（word 面）跑比对视图 normalizeForMatch（NFKC+白名单折叠）——
  //    词表全由 \p{L} 构成（测试守门断言），任何属性类外拆词走私被折叠收口；
  //  - 正则表层（pattern 面）跑轻归一原文面 normalizeLightForPattern——
  //    感叹号条目 '[!！]{2,}' 是 Po 类字符，在白名单视图里会被剥掉，必须在
  //    保留标点的面上跑（隐形字/空白走私仍收口：Cf/Mn 残余/空白已剥）。
  // 存库原文不动；两类报文的 index/word 分别指向各自视图（既有契约：按视图
  // 对齐，不按存库原文）。
  const literalView = normalizeForMatch(text);
  const patternView = normalizeLightForPattern(text);
  if (literalView.length === 0 && patternView.length === 0) {
    return { violations: [] };
  }
  const entries = normalizeRules(rules);

  const literalMatches = [];
  for (const entry of entries.filter((e) => !e.pattern)) {
    let i = literalView.indexOf(entry.word);
    while (i !== -1) {
      if (!isExcepted(literalView, i, entry.word, entry.exceptions)) {
        literalMatches.push({ start: i, end: i + entry.word.length, entry });
      }
      i = literalView.indexOf(entry.word, i + 1);
    }
  }
  // 长词优先解决重叠（宝 vs 宝贝），同长按位置
  literalMatches.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const taken = [];
  const accepted = [];
  for (const m of literalMatches) {
    if (taken.some((t) => m.start < t.end && t.start < m.end)) continue;
    taken.push(m);
    accepted.push(m);
  }
  // 正则条目（多个感叹号等）：在轻归一原文面上匹配，重叠裁决与词表层独立
  // （两视图各自计数，word 面 L/N 与 pattern 面标点不可能语义重叠）
  const patternTaken = [];
  for (const entry of entries.filter((e) => e.pattern)) {
    const re = new RegExp(entry.pattern, entry.flags || 'g');
    let mm = re.exec(patternView);
    while (mm !== null) {
      const start = mm.index;
      const end = start + mm[0].length;
      if (mm[0].length === 0) { re.lastIndex += 1; } // 防零宽死循环
      else if (!patternTaken.some((t) => start < t.end && t.start < end)) {
        patternTaken.push({ start, end });
        accepted.push({ start, end, entry, text: mm[0], surface: 'pattern' });
      }
      mm = re.exec(patternView);
    }
  }
  accepted.sort((a, b) => a.start - b.start);
  return {
    violations: accepted.map((m) => ({
      // 词表层取词面自比对视图（start/end 是视图下标，不是原文下标）；
      // 正则表层用命中原文（mm[0]，轻归一视图的字面）
      word: m.text !== undefined ? m.text : literalView.slice(m.start, m.end),
      index: m.start,
      suggestion: typeof m.entry.suggestion === 'string' ? m.entry.suggestion : '',
      reason: typeof m.entry.reason === 'string' ? m.entry.reason : '',
    })),
  };
}

// ═════════════════════════════════════════════════════════════
// 闸门二：checkNameImage —— 事实卡 × 文案 词表冲突比对
// ═════════════════════════════════════════════════════════════

/**
 * 名实相符词表冲突引擎（三闸之第二闸）。
 *
 * 规则（严重级别按 §2.1「异色词黄警、缺包型词红拦」细化）：
 *  R1 颜色：文案颜色词的色系 ∉ 事实卡主色色系 → 黄警（疑似把背景布/道具色写进文案）。
 *     色系归一处理子串：湖蓝↔蓝、柠檬黄↔黄、樱花粉↔粉 同系不警。
 *     事实卡主色含多个根字时全部放行（「蓝白」→ {蓝,白}；「绿橙紫渐变」→ {绿,橙,紫,渐变}）。
 *     颜色词紧邻五金语境（金色五金/银色链条/拉链银）跳过，不误报五金色。
 *  R2 包型-结构：某字段命中的结构包型词中【没有任何一个】与事实卡结构包型一致 → 红拦
 *     （如文案「波士顿托特」混写 vs 事实卡「凯莉」）。同一字段内任一命中词与事实卡一致
 *     （「云朵枕头包」vs 事实卡「枕头包」）时该字段不红拦——其余叠加词降级黄警
 *     BAG_SILHOUETTE_SECONDARY，人工确认。降级按字段独立判定（R5·二次修复）：
 *     标题命中不得稀释描述里的结构冲突，反之亦然。
 *     结构包型写进名字即主要卖点，名实不符是上午事故 2 的原样重演，必须拦死。
 *     同组归一：小圆筒↔圆筒、托特↔tote 同组不拦。
 *  R3 包型-背法：文案背法词 ≠ 事实卡背法（斜挎 vs 手提）→ 黄警（一只包可兼顾多种背法，人工确认即可）。
 *     背法词与结构词不同维度，互不比较（托特也能手提）。
 *  R4 缺包型：文案与事实卡均无任何包型词 → 红拦（买家无从知道这是什么包）。
 *  R5 事实卡缺项：文案有颜色词而事实卡主色为空 → 黄警；文案有包型词而事实卡包型为空 → 黄警
 *     （提示回第一闸补看图四选）。
 *
 * @param {{name?:string, description?:string, factCard?:{mainColor?:string, bagType?:string, hardware?:string, occasion?:string}}} input
 *   name/description 为文案两字段；factCard 为第一闸看图四选的结果，
 *   引擎实际消费 mainColor（主色）与 bagType（包型）两项，hardware/occasion 预留给表单透传。
 * @returns {{warnings:Array<object>, blockers:Array<object>}}
 *   每条形如 {code, field, message, …上下文}；code ∈
 *   COLOR_MISMATCH | FACT_CARD_COLOR_MISSING | CARRY_MISMATCH | FACT_CARD_BAG_MISSING |
 *   BAG_SILHOUETTE_SECONDARY（黄警）
 *   BAG_SILHOUETTE_MISMATCH | BAG_TYPE_MISSING（红拦）。
 *   field ∈ 'name' | 'description' | 'factCard'，管理界面据此定位输入框。
 */
export function checkNameImage({ name, description, factCard } = {}) {
  const warnings = [];
  const blockers = [];
  // 匹配前规范化（NFKC+剥不可见，与 lintCopy 同源防线——"托␈特包"不得借
  // 零宽逃过包型冲突红拦、"ＢＯＳＴＯＮ"不得借全角逃过词表；存库原文不动，
  // warnings/blockers 定位词取自规范化文本）
  const nameText = normalizeForMatch(typeof name === 'string' ? name : '');
  const descText = normalizeForMatch(typeof description === 'string' ? description : '');
  const fc = factCard && typeof factCard === 'object' ? factCard : {};
  const factColor = normalizeForMatch(typeof fc.mainColor === 'string' ? fc.mainColor.trim() : '');
  const factBag = normalizeForMatch(typeof fc.bagType === 'string' ? fc.bagType.trim() : '');

  // R1 颜色比对
  const allowed = detectColorFamilies(factColor);
  const colorHits = [...findColorHits(nameText, 'name'), ...findColorHits(descText, 'description')];
  if (colorHits.length > 0 && allowed.size === 0) {
    warnings.push({
      code: 'FACT_CARD_COLOR_MISSING',
      field: 'factCard',
      message: '事实卡未填主色，颜色词无法比对——请回第一闸看图四选补齐主色',
    });
  } else {
    const seen = new Set(); // 同字段同色系只警一次，保持信号干净
    for (const hit of colorHits) {
      if (allowed.has(hit.family) || seen.has(`${hit.field}|${hit.family}`)) continue;
      seen.add(`${hit.field}|${hit.family}`);
      warnings.push({
        code: 'COLOR_MISMATCH',
        field: hit.field,
        word: hit.word,
        family: hit.family,
        allowedFamilies: [...allowed],
        factColor,
        message: `${FIELD_LABEL[hit.field]}里的「${hit.word}」属于${hit.family}色系，不在事实卡主色「${factColor || '（空）'}」的色系内——是否把背景布/道具色写进了文案？`,
      });
    }
  }

  // R2-R5 包型比对
  const bagHits = [...findBagHits(nameText, 'name'), ...findBagHits(descText, 'description')];
  const copySilhouettes = new Map(); // canonical -> 首个命中（存在性判断/报文定位）
  const copyCarries = new Map();
  // R5：canonical × 字段 双键聚合——同一结构词可能出现在标题与描述两处，
  // 两处的裁决独立（字段内有无匹配词决定降级与否），不能按 canonical 合并。
  const silhouetteByField = new Map(); // `${canonical}|${field}` -> 首个命中
  for (const hit of bagHits) {
    const target = hit.dimension === 'silhouette' ? copySilhouettes : copyCarries;
    if (!target.has(hit.canonical)) target.set(hit.canonical, hit);
    if (hit.dimension === 'silhouette') {
      const key = `${hit.canonical}|${hit.field}`;
      if (!silhouetteByField.has(key)) silhouetteByField.set(key, hit);
    }
  }
  const factGroup = findBagGroup(factBag);

  if (factGroup && factGroup.dimension === 'silhouette') {
    // M4（反查 P3）叠结构词防过拦：一只包名可叠加多个结构词（「云朵枕头包」）。
    // 同字段内只要命中的结构词中【任一】与事实卡一致，该字段的次要叠加词降级
    // 黄警提示人工确认；命中的结构词中没有任何一个与事实卡一致（波士顿+托特
    // 混写、事实卡凯莉）时维持红拦。结构包型写进名字就是主要卖点，名实不符是
    // 上午事故 2 的原样重演，必须拦死。
    // R5（二次修复 2026-10-05，X1 闸稀释）：降级判定从「全局任一命中」收窄为
    // 「同字段命中」——原语义下 name=凯莉包（与卡一致）会把 description 里与
    // 卡冲突的结构词（托特）一并降级黄警放行（X1 实锤 200 落库）。降级只属于
    // 叠词所在的字段本身：描述里的结构冲突不因标题命中而洗白，反之亦然；
    // blocker 与 warning 独立聚合（有 blocker 即红拦，warning 只做提示）。
    const matchFields = new Set(
      bagHits
        .filter((h) => h.dimension === 'silhouette' && h.canonical === factGroup.canonical)
        .map((h) => h.field),
    );
    for (const hit of silhouetteByField.values()) {
      const { canonical, field } = hit;
      if (canonical === factGroup.canonical) continue;
      if (matchFields.has(field)) {
        warnings.push({
          code: 'BAG_SILHOUETTE_SECONDARY',
          field,
          word: hit.word,
          copyType: canonical,
          factBagType: factBag,
          message: `${FIELD_LABEL[field]}叠加结构词「${hit.word}」与事实卡主包型「${factBag}」不一致——主结构词已匹配，次要词请对图确认`,
        });
      } else {
        blockers.push({
          code: 'BAG_SILHOUETTE_MISMATCH',
          field,
          word: hit.word,
          copyType: canonical,
          factBagType: factBag,
          message: `${FIELD_LABEL[field]}包型「${hit.word}」与事实卡包型「${factBag}」结构冲突——结构包型写进名字就是主要卖点，名实不符，红拦`,
        });
      }
    }
  } else if (factGroup && factGroup.dimension === 'carry') {
    for (const [canonical, hit] of copyCarries) {
      if (canonical === factGroup.canonical) continue;
      warnings.push({
        code: 'CARRY_MISMATCH',
        field: hit.field,
        word: hit.word,
        copyType: canonical,
        factBagType: factBag,
        message: `${FIELD_LABEL[hit.field]}背法「${hit.word}」与事实卡背法「${factBag}」不一致——背法可兼顾，请对图确认`,
      });
    }
  }

  if (!factGroup) {
    if (copySilhouettes.size > 0 || copyCarries.size > 0) {
      warnings.push({
        code: 'FACT_CARD_BAG_MISSING',
        field: 'factCard',
        message: '事实卡未填包型，包型词无法比对——请回第一闸看图四选补齐包型',
      });
    } else {
      blockers.push({
        code: 'BAG_TYPE_MISSING',
        field: 'factCard',
        message: '文案与事实卡都没有包型词——买家无从知道这是什么包（缺包型红拦）',
      });
    }
  }

  return { warnings, blockers };
}

// ═════════════════════════════════════════════════════════════
// 闸门零：sanityCheck —— 价格库存理性检查
// ═════════════════════════════════════════════════════════════

/**
 * 价格/库存 sanity check（保存前调用）。
 *
 * @param {object} input
 * @param {number} input.price - 现价（必填，>0 的有限数）。
 * @param {number|null} [input.originalPrice] - 划线原价（可选；填了则须 >0 且 ≥ 现价）。
 * @param {number} input.stock - 库存（必填，≥0 的整数）。
 * @param {number[]} [input.peerPrices] - 同类商品价格数组（可选，用于偏离警告；非法项自动忽略）。
 * @returns {{errors:Array<object>, warnings:Array<object>}}
 *   errors（禁止保存）：price_missing / price_invalid / price_not_positive /
 *     original_price_invalid / original_below_price / stock_missing / stock_invalid /
 *     stock_negative / stock_not_integer
 *   warnings（提示确认）：price_deviation（偏离同类中位数 > PEER_DEVIATION_WARN_RATIO）、
 *     original_price_inflated（划线价 ≥ 现价 × ORIGINAL_INFLATE_WARN_RATIO）、
 *     zero_stock（库存为 0，保存即触发 M5 自动下架联动）
 */
export function sanityCheck({ price, originalPrice, stock, peerPrices } = {}) {
  const errors = [];
  const warnings = [];
  const has = (v) => v !== undefined && v !== null && v !== '';

  const priceOk = (() => {
    if (!has(price)) { errors.push({ code: 'price_missing', field: 'price', message: '缺少现价' }); return false; }
    if (typeof price !== 'number' || !Number.isFinite(price)) { errors.push({ code: 'price_invalid', field: 'price', message: '现价不是合法数字' }); return false; }
    if (price <= 0) { errors.push({ code: 'price_not_positive', field: 'price', message: '现价必须大于 0' }); return false; }
    return true;
  })();

  if (has(originalPrice)) {
    if (typeof originalPrice !== 'number' || !Number.isFinite(originalPrice) || originalPrice <= 0) {
      errors.push({ code: 'original_price_invalid', field: 'originalPrice', message: '划线原价须为大于 0 的数字（不填表示无划线价）' });
    } else if (priceOk && originalPrice < price) {
      errors.push({ code: 'original_below_price', field: 'originalPrice', message: `划线原价 ${originalPrice} 低于现价 ${price}——划线价必须 ≥ 现价` });
    } else if (priceOk && originalPrice >= price * SANITY_THRESHOLDS.ORIGINAL_INFLATE_WARN_RATIO) {
      warnings.push({ code: 'original_price_inflated', field: 'originalPrice', message: `划线原价 ${originalPrice} 已达现价 ${price} 的 ${SANITY_THRESHOLDS.ORIGINAL_INFLATE_WARN_RATIO} 倍以上——请确认不是多敲了一位` });
    }
  }

  if (!has(stock)) {
    errors.push({ code: 'stock_missing', field: 'stock', message: '缺少库存' });
  } else if (typeof stock !== 'number' || !Number.isFinite(stock)) {
    errors.push({ code: 'stock_invalid', field: 'stock', message: '库存不是合法数字' });
  } else if (stock < 0) {
    errors.push({ code: 'stock_negative', field: 'stock', message: '库存不能为负数' });
  } else if (!Number.isInteger(stock)) {
    errors.push({ code: 'stock_not_integer', field: 'stock', message: '库存必须是整数（只可能整只卖出）' });
  } else if (stock === 0) {
    warnings.push({ code: 'zero_stock', field: 'stock', message: '库存为 0——保存后商品将保持/转为下架状态（M5 自动下架联动）' });
  }

  if (priceOk && Array.isArray(peerPrices)) {
    const peers = peerPrices.filter((p) => typeof p === 'number' && Number.isFinite(p) && p > 0);
    if (peers.length > 0) {
      const sorted = [...peers].sort((a, b) => a - b);
      const mid = sorted.length >> 1;
      const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      const deviation = Math.abs(price - median) / median;
      if (deviation > SANITY_THRESHOLDS.PEER_DEVIATION_WARN_RATIO) {
        warnings.push({ code: 'price_deviation', field: 'price', value: price, median, deviation: Number(deviation.toFixed(4)), message: `现价 ${price} 偏离同类中位数 ${median} 达 ${Math.round(deviation * 100)}%——请确认定价无误` });
      }
    }
  }

  return { errors, warnings };
}
