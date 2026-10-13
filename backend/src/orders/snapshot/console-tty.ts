/**
 * TTY 守卫 + 颜色统一（阶段 3 前置修因——双盲#4 抽公共）
 *
 * scripts/verify-{audit,orders}-chain.mjs 双端 TTY 守卫不一致（orders 端有、audit
 * 端无）+ 颜色短名不一致（orders 用 GRN/YEL/RED、audit 用 GREEN/YELLOW/RED）。
 * 本模块取同源色板+ TTY 守卫=一份参考实现。CI 非 TTY 跑时颜色 ANSI 转义
 * 污染 stdout/stderr = 已知坑——此守卫=防。
 *
 * P1-D 修因（双盲审 X1+Y2 共中）：stdout + stderr 双端 TTY 守卫 + RED_ERR 导出。
 */

const ESC = String.fromCharCode(27);
const IS_TTY_OUT = process.stdout.isTTY === true;
const IS_TTY_ERR = process.stderr.isTTY === true;

function wrapOut(open, close, s) {
  return IS_TTY_OUT ? ESC + '[' + open + 'm' + s + ESC + '[' + close + 'm' : s;
}

function wrapErr(open, close, s) {
  return IS_TTY_ERR ? ESC + '[' + open + 'm' + s + ESC + '[' + close + 'm' : s;
}

export const RED = (s) => wrapOut(31, 39, s);
export const GREEN = (s) => wrapOut(32, 39, s);
export const YELLOW = (s) => wrapOut(33, 39, s);

/** stderr 专用色（错误输出走 stderr 时用——P1-D） */
export const RED_ERR = (s) => wrapErr(31, 39, s);
export const YELLOW_ERR = (s) => wrapErr(33, 39, s);
