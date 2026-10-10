import {
  validatePasswordForCreation,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MAX_BYTES,
} from './password.policy';

/**
 * 密码策略单源行为锁（用户裁决 2026-10-10"对齐业界严格标准线"）
 * 规则=NIST SP 800-63B-4/OWASP 调研定谳：12-64 位+字节≤72+黑名单，无组合规则。
 */
describe('password.policy validatePasswordForCreation', () => {
  const ok = (pw: string) => expect(validatePasswordForCreation(pw).ok).toBe(true);
  const bad = (pw: string) => {
    const r = validatePasswordForCreation(pw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.length).toBeGreaterThan(0);
  };

  it('常量锚：12/64/72（改档只动此处，NIST 逐字合规=15 见调研）', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(PASSWORD_MAX_LENGTH).toBe(64);
    expect(PASSWORD_MAX_BYTES).toBe(72);
  });

  it('12 位纯小写无符号数字通过——组合规则已废（原 8 位+四类组合必拒）', () => {
    ok('abcdefghijkl'); // 旧规则下必拒：无大写无数字无符号
  });

  it('长度边界：11 拒/12 过/64 过/65 拒', () => {
    bad('a'.repeat(11));
    ok('a'.repeat(12));
    ok('a'.repeat(64));
    bad('a'.repeat(65));
  });

  it('黑名单：表内真实条目拒（含大小写/空白变体归一化）——条目经 node 实测在表', () => {
    bad('unbelievable'); // SecLists 10k 实有 12 位条目
    bad('BusinessBabe '); // 大写+尾空白归一化后同形
    bad('  scandinavian'); // 前空白归一化
    ok('xk9$mQ2vLp7#zR'); // 非表内 14 位过
  });

  it('黑名单归一化不误伤：尾缀变形过（非表成员）', () => {
    ok('unbelievablezz'); // 尾缀变形非黑名单成员
  });

  it('短常用密码（如 password1）由长度闸先拒——黑名单在 12 位下限上仍留 NIST 合规面', () => {
    bad('password1'); // 9 位:长度拒(非黑名单路径,黑名单成员 passwords/password1 均 <12)
  });

  it('bcrypt 字节截断防护：多字节密码超 72 字节拒（OWASP 禁静默截断）', () => {
    // 24 个 CJK 字符 = 72 字节 = 上界内过
    ok('密'.repeat(24));
    // 25 个 CJK 字符 = 75 字节 = 拒
    bad('密'.repeat(25));
  });

  it('空/非字符串拒', () => {
    bad('');
    bad(undefined as unknown as string);
  });
});
