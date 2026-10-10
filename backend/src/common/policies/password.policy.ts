import { COMMON_PASSWORDS } from './common-passwords.data';

/**
 * 密码策略单源（用户裁决 2026-10-10"对齐业界严格标准线"——NIST SP 800-63B-4/OWASP）
 *
 * 规则三件：长度 12–64 字符；UTF-8 字节数 ≤72（bcrypt 截断防护——64 个 CJK
 * 字符=192 字节会被 bcrypt 静默截断，OWASP"Do not silently truncate"）；
 * 命中常用/泄露黑名单拒绝（SecLists 10k）。
 * 刻意不设组合规则（大小写/数字/符号强制）——NIST 800-63B-4 明文
 * "SHALL NOT impose other composition rules"（组合规则使密码趋同反降熵）。
 * 输入归一化口径：黑名单比对前做小写化+首尾空白剥离（防 Password/ password 绕过）。
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_MAX_BYTES = 72;

const COMMON_PASSWORD_SET = new Set(COMMON_PASSWORDS.map(p => p.toLowerCase()));

export type PasswordPolicyResult = { ok: true } | { ok: false; reason: string };

/**
 * 建立/变更密码时的策略校验（登录端不调用——存量短密码用户可正常登录，
 * NIST：校验发生在建立与变更时，不强制存量迁移）。
 */
export function validatePasswordForCreation(password: string): PasswordPolicyResult {
  if (typeof password !== 'string' || password.length === 0) {
    return { ok: false, reason: '密码不能为空' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, reason: `密码长度至少 ${PASSWORD_MIN_LENGTH} 位` };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, reason: `密码长度不能超过 ${PASSWORD_MAX_LENGTH} 位` };
  }
  const bytes = Buffer.byteLength(password, 'utf8');
  if (bytes > PASSWORD_MAX_BYTES) {
    return {
      ok: false,
      reason: `密码字节数超过 ${PASSWORD_MAX_BYTES}（当前 ${bytes}，多字节字符会触发哈希截断防护）`,
    };
  }
  if (COMMON_PASSWORD_SET.has(password.trim().toLowerCase())) {
    return { ok: false, reason: '密码过于常见（命中常用/泄露密码黑名单），请更换' };
  }
  return { ok: true };
}
