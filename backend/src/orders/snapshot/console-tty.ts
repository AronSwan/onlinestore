/**
 * TTY 守卫 + 颜色统一（阶段 3 前置修因——双盲#4 抽公共）
 *
 * scripts/verify-{audit,orders}-chain.mjs 双端 TTY 守卫不一致（orders 端有、audit
 * 端无）+ 颜色短名不一致（orders 用 GRN/YEL/RED、audit 用 GREEN/YELLOW/RED）。
 * 本模块取同源色板+ TTY 守卫=一份参考实现。CI 非 TTY 跑时颜色 ANSI 转义
 * 污染 stdout = 已知坑——此守卫=防。
 */

const IS_TTY = process.stdout.isTTY === true;

function wrap(open, close, s) {
  return IS_TTY ? `\u001b[${open}m${s}\u001b[${close}m` : s;
}

export const RED = (s) => wrap(31, 39, s);
export const GREEN = (s) => wrap(32, 39, s); // 与 audit 端形态对齐
export const YELLOW = (s) => wrap(33, 39, s); // 与 audit 端形态对齐
