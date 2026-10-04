/**
 * returnUrl 安全校验对抗用例（node:test，Node ≥ 18）
 * 运行：node --test js/shared/return-url.test.js
 *
 * 双盲审 P1-1（2026-10-05）：`/\t//host` 四族控制字符走私击穿 1515d84 白名单
 * （浏览器 URL 解析剥 TAB/LF/CR 后 `/\t//host` → `///host` 协议相对跨源）。
 * 覆盖：C0 全族 + DEL + C1 扫描、tab/LF/CR 单独与组合、四族走私、
 * 历史回归（javascript:/单斜杠/反斜杠/协议相对）、合法路径不误伤。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeReturnUrl } from './return-url-guard.js';

// ─────────────────────────────────────────────
// 一、双盲审点名的四族走私（必须全拒）
// ─────────────────────────────────────────────
test('四族走私：/\\t//host、/\\n//host、/\\r//host、/\\t/ 全部拒绝', () => {
  assert.equal(isSafeReturnUrl('/\t//evil.com'), false, 'tab 族');
  assert.equal(isSafeReturnUrl('/\n//evil.com'), false, 'LF 族');
  assert.equal(isSafeReturnUrl('/\r//evil.com'), false, 'CR 族');
  assert.equal(isSafeReturnUrl('/\t/'), false, '裸 /\\t/ 族（剥 tab 后 //）');
});

test('tab/LF/CR 单独与组合走私', () => {
  assert.equal(isSafeReturnUrl('/a\tb'), false, '路径中部 tab');
  assert.equal(isSafeReturnUrl('/a\nb'), false, '路径中部 LF');
  assert.equal(isSafeReturnUrl('/a\rb'), false, '路径中部 CR');
  assert.equal(isSafeReturnUrl('/\t\n\r//evil.com'), false, '三字符组合');
  assert.equal(isSafeReturnUrl('/\r\n\t/evil.com'), false, '组合变体');
  assert.equal(isSafeReturnUrl('/ok?\t//evil.com'), false, 'query 里的 tab');
  assert.equal(isSafeReturnUrl('/ok#\t//evil.com'), false, 'hash 里的 tab');
});

// ─────────────────────────────────────────────
// 二、控制字符全族扫描（C0 全族 + DEL + C1）
// ─────────────────────────────────────────────
test('C0 全族（\\x00-\\x1F）逐字符嵌入一律拒绝', () => {
  for (let c = 0x00; c <= 0x1f; c++) {
    const evil = `/a${String.fromCharCode(c)}b`;
    assert.equal(
      isSafeReturnUrl(evil),
      false,
      `U+${c.toString(16).padStart(4, '0')} 应被拒绝（输入 ${JSON.stringify(evil)}）`
    );
  }
});

test('DEL（\\x7F）拒绝', () => {
  assert.equal(isSafeReturnUrl('/a\x7Fb'), false);
  assert.equal(isSafeReturnUrl('/\x7F//evil.com'), false);
});

test('C1 区（\\u0080-\\u009F，URL 解码后可携带）逐字符拒绝', () => {
  for (let c = 0x80; c <= 0x9f; c++) {
    const evil = `/a${String.fromCharCode(c)}b`;
    assert.equal(
      isSafeReturnUrl(evil),
      false,
      `U+${c.toString(16).padStart(4, '0')} 应被拒绝`
    );
  }
});

// ─────────────────────────────────────────────
// 三、历史回归（1515d84 修过的面不能回退）
// ─────────────────────────────────────────────
test('回归：javascript:/协议相对/单斜杠 scheme/反斜杠/相对路径 全拒', () => {
  assert.equal(isSafeReturnUrl('javascript:alert(1)'), false);
  assert.equal(isSafeReturnUrl('//evil.com'), false);
  assert.equal(isSafeReturnUrl('/\\evil.com'), false, '反斜杠');
  assert.equal(isSafeReturnUrl('/\\//evil.com'), false);
  assert.equal(isSafeReturnUrl('https:/evil.com'), false, '单斜杠 scheme（规范化补 //）');
  assert.equal(isSafeReturnUrl('/https://evil.com'), false, '首段含冒号');
  assert.equal(isSafeReturnUrl('/jav\tascript:alert(1)'), false, '控制字符拆 scheme');
  assert.equal(isSafeReturnUrl('foo/bar'), false, '无前导斜杠');
  assert.equal(isSafeReturnUrl(''), false, '空串');
  assert.equal(isSafeReturnUrl(null), false, 'null（无 returnUrl 参数）');
  assert.equal(isSafeReturnUrl(undefined), false, 'undefined');
});

// ─────────────────────────────────────────────
// 四、合法站内路径正控（不误伤）
// ─────────────────────────────────────────────
test('正控：合法站内相对路径全放行（含中文/空格解码/查询/锚点）', () => {
  assert.equal(isSafeReturnUrl('/'), true);
  assert.equal(isSafeReturnUrl('/index.html'), true);
  assert.equal(isSafeReturnUrl('/admin.html'), true, 'M3 分流守卫的主用例');
  assert.equal(isSafeReturnUrl('/orders.html?tab=all'), true);
  assert.equal(isSafeReturnUrl('/profile.html#section'), true);
  assert.equal(isSafeReturnUrl('/products?q=%E6%89%8B%E5%9B%BE'), true, '中文解码不误伤');
  assert.equal(isSafeReturnUrl('/products/a%20b'), true, '空格 %20 解码不误伤');
  assert.equal(isSafeReturnUrl('/admin.html?returnUrl=/orders.html'), true, '值内嵌合法路径');
});
