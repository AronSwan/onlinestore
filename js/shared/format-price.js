/**
 * formatPrice — 全站统一价格格式（B5 · 蓝图 M0）
 *
 * 口径：整数直出 "¥299"；非整数保两位小数 "¥168.50"——消灭 ¥299/¥299.00 双轨
 * （旧 cart.js 三处 toFixed(2) 一律换本函数）。
 *
 * 排印（由消费方 CSS 负责，本函数只出文本）：数字 --font-numeric 600、
 * 金额列右对齐、¥ 符号 0.6em/500/ink-soft 基线对齐右距 0.125em。
 *
 * 健壮性：非有限数值（NaN/Infinity/null/undefined/空串）回 "¥0" 而非抛错——
 * 价格字段来自 localStorage/后端同步，坏数据不该炸渲染；浮点先过
 * Math.round(n*100)/100 消除 168.5*100 类二进制误差，再 toFixed(2) 定位。
 *
 * 形态：ES module（消费方 cart.js / product.js 均 type=module，vite 解析原生路径）；
 * 单测 tests/format-price.spec.js（Node 侧直接 import，五例）。
 */

/** @param {number|string} value 价格（数字或可解析字符串）
 *  @returns {string} "¥299" 或 "¥168.50" */
export function formatPrice(value) {
  var n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n)) {
    return '¥0';
  }
  var cents = Math.round(n * 100);           // 分为整数运算，避开 0.1+0.2 族误差
  var fixed = (cents / 100).toFixed(2);      // 定宽两位
  return '¥' + fixed.replace(/\.00$/, '');   // 整数抹 .00，非整保留两位
}

// Node 侧单测直接 import；浏览器经典脚本如需消费，经 window 挂出（module 内先行判窗）
if (typeof window !== 'undefined') {
  window.formatPrice = formatPrice;
}
