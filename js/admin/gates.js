/**
 * REICH 管理界面三闸（M4 · docs/modernization-discussion.md v1.1 §2.1）
 *
 * 第一闸 事实卡（看图四选）与第三闸（对图朗读预览）的判定逻辑，
 * 以及第二闸（lint 实时 + 词表冲突 + sanity）的纯计算层。
 * 规则引擎直接 import js/shared/integrity-rules.js（ESM 同源，无构建依赖）。
 *
 * 纯函数约定：本文件顶层不触碰 DOM——DOM 渲染仅发生在导出的 render* 函数体内，
 * 保证 node --test 可直接 import 做单测（js/admin/gates.test.js）。
 *
 * 事实卡存储形状（specifications.factCard）：
 *   { colorGroup, bagType, hardware, occasion }
 * 引擎消费形状（integrity-rules.checkNameImage JSDoc）：
 *   { mainColor, bagType } —— 由 normalizeFactCardForEngine 做字段名映射。
 */

import {
  lintCopy,
  checkNameImage,
  sanityCheck,
  COLOR_FAMILIES,
  BAG_SILHOUETTES,
} from '../shared/integrity-rules.js';

/** 第一闸四选的固定两项（主色/包型词表从引擎导出生成） */
export const HARDWARE_OPTIONS = ['金', '银', '白', '无明显'];
export const OCCASION_OPTIONS = ['通勤', '出街', '约会', '旅行'];

/** 主色 15 色系（COLOR_FAMILIES key） */
export const COLOR_OPTIONS = Object.keys(COLOR_FAMILIES);
/** 包型 18 结构组（BAG_SILHOUETTES canonical） */
export const BAG_TYPE_OPTIONS = BAG_SILHOUETTES.map((g) => g.canonical);

/**
 * 第一闸判定：四选是否全部作出（缺任何一项保存按钮禁用并提示）。
 * @param {object|null|undefined} factCard
 * @returns {boolean}
 */
export function factCardComplete(factCard) {
  if (!factCard || typeof factCard !== 'object') return false;
  return ['colorGroup', 'bagType', 'hardware', 'occasion'].every(
    (k) => typeof factCard[k] === 'string' && factCard[k].trim().length > 0,
  );
}

/**
 * 存储形状 → 引擎消费形状（mainColor=主色系，bagType=结构包型）。
 * 兼容读引擎形状（mainColor）以防手工数据两种拼法并存。
 */
export function normalizeFactCardForEngine(factCard) {
  if (!factCard || typeof factCard !== 'object') return {};
  const color =
    typeof factCard.colorGroup === 'string' && factCard.colorGroup
      ? factCard.colorGroup
      : typeof factCard.mainColor === 'string'
        ? factCard.mainColor
        : undefined;
  return {
    mainColor: color,
    bagType: typeof factCard.bagType === 'string' && factCard.bagType ? factCard.bagType : undefined,
    hardware: typeof factCard.hardware === 'string' ? factCard.hardware : undefined,
    occasion: typeof factCard.occasion === 'string' ? factCard.occasion : undefined,
  };
}

/**
 * 第二闸纯计算：lint（禁用词）+ 词表冲突 + sanity 一次算齐。
 * @param {{name?:string, description?:string, price?:number, originalPrice?:number|null,
 *          stock?:number, factCard?:object, peerPrices?:number[]}} input
 * @returns {{lintName:Array, lintDesc:Array, conflicts:{warnings:Array, blockers:Array},
 *            sanity:{errors:Array, warnings:Array}}}
 */
export function evaluateGates({ name, description, price, originalPrice, stock, factCard, peerPrices } = {}) {
  const nameText = typeof name === 'string' ? name : '';
  const descText = typeof description === 'string' ? description : '';
  return {
    lintName: lintCopy(nameText).violations,
    lintDesc: lintCopy(descText).violations,
    conflicts: checkNameImage({
      name: nameText,
      description: descText,
      factCard: normalizeFactCardForEngine(factCard),
    }),
    sanity: sanityCheck({
      price: typeof price === 'number' ? price : undefined,
      originalPrice:
        originalPrice === '' || originalPrice === null || originalPrice === undefined
          ? undefined
          : Number(originalPrice),
      stock: typeof stock === 'number' ? stock : undefined,
      peerPrices,
    }),
  };
}

/**
 * 三闸总裁决：保存（发布）按钮可否点亮。
 * 红拦项（按序）：事实卡缺项 / 禁用词 / 结构包型冲突（含缺包型词）/ sanity errors。
 * 黄警（词表冲突 warnings、sanity warnings）不拦——进发布预览逐条确认。
 * @param {ReturnType<typeof evaluateGates>} gates
 * @param {{factCard?:object}} form
 * @returns {{canSave:boolean, blockingReasons:Array<{kind:string, message:string}>}}
 */
export function gateVerdict(gates, form = {}) {
  const reasons = [];
  if (!factCardComplete(form.factCard)) {
    reasons.push({
      kind: 'fact-card',
      message: '事实卡还没填齐——先看图把主色/包型/五金/场合四选点好，再来保存。',
    });
  }
  for (const v of [...gates.lintName, ...gates.lintDesc]) {
    reasons.push({
      kind: 'banned-word',
      message: `「${v.word}」在禁用词表里（${v.reason || '与定调冲突'}）——换成「${v.suggestion || '别的说法'}」试试。`,
    });
  }
  for (const b of gates.conflicts.blockers) {
    reasons.push({ kind: 'blocker', message: b.message });
  }
  for (const e of gates.sanity.errors) {
    reasons.push({ kind: 'sanity', message: e.message });
  }
  return { canSave: reasons.length === 0, blockingReasons: reasons };
}

// ─────────────────────────────────────────────────────────────
// 渲染辅助（仅浏览器调用；纯字符串拼装，不触碰 document）
// ─────────────────────────────────────────────────────────────

/** HTML 转义（admin 页自持，不依赖主站经典脚本） */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  );
}

/**
 * 红下划线背板 HTML：与输入框同字体的镜像层，把禁用词包成 <mark class="lint-hit">。
 * 用法：背板 div 置于 input/textarea 之下（同 padding/字号/行高），输入框背景透明。
 * 命中区间按 index 对齐；长词优先的引擎语义保证区间不重叠。
 * @param {string} text
 * @param {Array<{word:string,index:number,suggestion?:string,reason?:string}>} violations
 * @returns {string} HTML（已转义）
 */
export function renderLintBackdrop(text, violations) {
  const src = typeof text === 'string' ? text : '';
  let html = '';
  let cursor = 0;
  const sorted = [...violations].sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const v of sorted) {
    const start = Math.max(0, v.index || 0);
    const end = Math.min(src.length, start + String(v.word || '').length);
    if (start < cursor || start >= end) continue; // 越界/重叠段丢弃（引擎语义下不发生）
    html += escapeHtml(src.slice(cursor, start));
    html += `<mark class="lint-hit" data-suggestion="${escapeHtml(v.suggestion || '')}">${escapeHtml(src.slice(start, end))}</mark>`;
    cursor = end;
  }
  html += escapeHtml(src.slice(cursor));
  return html + '\n'; // 尾行换行：保证 textarea 镜像层高度随最后一行撑开
}

/**
 * 黄警条文案（词表冲突 warnings → 明亮俏皮从容的导语 + 引擎权威消息）。
 * @param {Array<{code:string,message:string}>} warnings
 * @returns {Array<string>} 每条一段
 */
export function describeWarnings(warnings) {
  const lead = {
    COLOR_MISMATCH: '图和文案对不上啦——',
    CARRY_MISMATCH: '背法先对一眼图——',
    FACT_CARD_COLOR_MISSING: '事实卡缺主色——',
    FACT_CARD_BAG_MISSING: '事实卡缺包型——',
    BAG_SILHOUETTE_SECONDARY: '叠加的结构词——',
  };
  return (warnings || []).map(
    (w) => `${lead[w.code] || '再看一眼——'}${w.message}`,
  );
}
