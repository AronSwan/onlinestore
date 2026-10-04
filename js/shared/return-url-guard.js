/**
 * 登录后 returnUrl 安全校验（纯函数，Node ≥ 18 / 现代浏览器均可 ESM import）
 *
 * 背景（双盲审 P1-1，2026-10-05）：1515d84 的白名单（单 / 开头、非 //、首段无冒号）
 * 基于字符前缀判断，但浏览器 URL 解析器会先做规范化——剥掉 TAB/LF/CR 后
 * `/\t//evil.com` 变成 `///evil.com`（协议相对，跨源跳转），四族绕过实测成立。
 *
 * 修法（双保险，总报告裁决"直接拒绝控制字符"+ 协调席升级"规范化后再复检"）：
 *   ① 拒绝含任何控制字符的 returnUrl——覆盖 C0 全族（\x00-\x1F，含 TAB/LF/CR）、
 *      DEL（\x7F）与 C1 区（\u0080-\u009F，URL 解码后可携带的不可见控制）；
 *   ② 浏览器同款规范化（剥 \t\n\r）后的视图也必须通过白名单复检——即使未来
 *      ①被放宽，规范化视图（浏览器实际跳转的目标）仍受白名单约束。
 *
 * 注意：路径里的中文/空格等经 URLSearchParams 解码后是普通可见字符，不受①影响，
 * 合法站内路径不误伤（见 return-url.test.js 正控组）。
 */

/** 控制字符全集：C0（\x00-\x1F）+ DEL（\x7F）+ C1（\u0080-\u009F） */
// eslint-disable-next-line no-control-regex -- 控制字符即本模块的拦截对象，非误用
const CONTROL_CHARS = /[\x00-\x1F\x7F\u0080-\u009F]/;

/** 浏览器 URL 解析规范化会剥离的字符（WHATWG URL 标准对 tab/LF/CR 的处理） */
const URL_STRIPPED = /[\t\n\r]/g;

/**
 * returnUrl 是否为可安全跳转的站内相对路径。
 * @param {string|null|undefined} returnParam - URLSearchParams 解码后的原始值
 * @returns {boolean} true=可跳回；false=拒绝（调用方应回退到 "/"）
 */
export function isSafeReturnUrl(returnParam) {
  if (typeof returnParam !== 'string' || returnParam.length === 0) {
    return false;
  }
  // ① 白名单式拒绝：任何控制字符（含不可见 C1）一律不放行
  if (CONTROL_CHARS.test(returnParam)) {
    return false;
  }
  // ② 双保险：浏览器规范化视图（剥 \t\n\r）再跑一遍白名单
  const normalized = returnParam.replace(URL_STRIPPED, '');
  return passesWhitelist(returnParam) && passesWhitelist(normalized);
}

/** 白名单本体：单 / 开头、非协议相对（//）、首段（?/# 之前）无 scheme 冒号、无反斜杠 */
function passesWhitelist(value) {
  const firstSegment = value.split(/[?#]/)[0];
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !firstSegment.includes(':') &&
    !value.includes('\\')
  );
}
