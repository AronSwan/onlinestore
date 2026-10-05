// 用途：M6 哈希链纯函数核单测——canonical 序列化确定性 / golden vector /
// verifyChain 五类问题判定（设计十决策 #9）。
// golden vector 的 hex 是写死的（非运行时算出再比），改 canonical 键序、
// 分隔符、Date 格式任一字节，这里即红——这是链格式的历史锚。
import {
  ZERO_HASH,
  CANONICAL_KEYS,
  canonicalValue,
  canonicalizeRow,
  computeRecordHash,
  formatCanonicalDate,
  verifyChain,
} from './audit-chain';

// ── 基准行（golden vector 底座，16 字段全集） ────────────────
const baseRow = {
  seq: undefined, // computeRecordHash 用参数 seq 覆盖
  id: 'g1',
  createTime: '2026-10-05 08:00:00.000',
  userId: '1',
  userName: 'a@b.c',
  operation: 'USER_LOGIN',
  module: 'auth',
  method: 'POST',
  url: '/api/auth/login',
  ip: '127.0.0.1',
  userAgent: 'jest',
  requestParams: '{}',
  responseData: '{}',
  duration: 5,
  status: 'SUCCESS',
  errorMessage: null,
};

describe('audit-chain canonical 序列化', () => {
  it('同值不同插入序 → JSON 字节逐位相等（键序由 CANONICAL_KEYS 定死）', () => {
    const a = JSON.stringify(canonicalizeRow(baseRow));
    // 逆序插入的同值行
    const shuffled: Record<string, unknown> = {};
    for (const k of [...Object.keys(baseRow)].reverse()) shuffled[k] = baseRow[k];
    const b = JSON.stringify(canonicalizeRow(shuffled));
    expect(b).toBe(a);
  });

  it('多余键被丢弃——canonical 只认 16 定键', () => {
    const polluted = { ...baseRow, extraField: '不该进哈希', traceId: 'T1' };
    expect(JSON.stringify(canonicalizeRow(polluted))).toBe(JSON.stringify(canonicalizeRow(baseRow)));
  });

  it('null/undefined 归一为 null', () => {
    expect(canonicalValue(undefined)).toBeNull();
    expect(canonicalValue(null)).toBeNull();
    const withUndef = canonicalizeRow({ ...baseRow, errorMessage: undefined });
    expect(withUndef.errorMessage).toBeNull();
  });

  it('中文字符串原样稳定（不做转义折叠/编码变换）', () => {
    expect(canonicalValue('商品创建: 名字=凯莉')).toBe('商品创建: 名字=凯莉');
    const a = JSON.stringify(canonicalizeRow({ ...baseRow, userName: '管理员·张三' }));
    const b = JSON.stringify(canonicalizeRow({ ...baseRow, userName: '管理员·张三' }));
    expect(a).toBe(b);
  });

  it('毫秒串稳定：三位补零不被吞（.500 ≠ .5 ≠ .050）', () => {
    expect(canonicalValue('.500')).toBe('.500');
    expect(canonicalValue('.5')).toBe('.5');
    const r1 = computeRecordHash(ZERO_HASH, 1, { ...baseRow, createTime: '2026-10-05 08:00:01.500' });
    const r2 = computeRecordHash(ZERO_HASH, 1, { ...baseRow, createTime: '2026-10-05 08:00:01.050' });
    expect(r1).not.toBe(r2);
  });

  it('Date 对象走 UTC 定格式（与 sqlite 原生字符串字节一致才等哈希）', () => {
    // 2026-10-05T08:00:00.000Z 的 Date 与同值字符串必须落在同一 canonical 字节
    const asDate = canonicalValue(new Date('2026-10-05T08:00:00.000Z'));
    expect(asDate).toBe('2026-10-05 08:00:00.000');
    expect(formatCanonicalDate(new Date(Date.UTC(2026, 9, 5, 8, 0, 0, 5)))).toBe(
      '2026-10-05 08:00:00.005',
    );
    expect(formatCanonicalDate(new Date(Date.UTC(2026, 0, 2, 3, 4, 5, 67)))).toBe(
      '2026-01-02 03:04:05.067',
    );
  });

  it('CANONICAL_KEYS 恰 16 键且 seq 在首（键序变更=链格式变更，需全链重锚）', () => {
    expect(CANONICAL_KEYS).toHaveLength(16);
    expect(CANONICAL_KEYS[0]).toBe('seq');
    expect(CANONICAL_KEYS[1]).toBe('id');
    expect(CANONICAL_KEYS[CANONICAL_KEYS.length - 1]).toBe('errorMessage');
  });
});

// ── golden vector：三行链写死 hex（历史锚，防格式漂移） ────────
describe('audit-chain golden vector（三行链，hex 写死）', () => {
  const GENESIS = 'df96e36b9ed31974a7ef99c0f54adbb729ac47fd343ca0a45d3b7d11f609eaf9';
  const ROW2 = '892202b9ca56b1b1d917c61b4fb921d5cae89a5a875559302d9cec125a10305c';
  const ROW3 = '8920dce7d49c9fbb1e9b805ba7630a42af76e70668604fe5dcaf5eb506c4cb9b';

  it('创世哈希：prevHash=64 零串', () => {
    expect(ZERO_HASH).toBe('0'.repeat(64));
    expect(computeRecordHash(ZERO_HASH, 1, baseRow)).toBe(GENESIS);
    // hex 小写 64 位
    expect(GENESIS).toMatch(/^[0-9a-f]{64}$/);
  });

  it('第 2 行：prevHash=创世哈希', () => {
    const row2 = { ...baseRow, id: 'g2', createTime: '2026-10-05 08:00:01.500', operation: 'PRODUCT_VIEW', duration: 12 };
    expect(computeRecordHash(GENESIS, 2, row2)).toBe(ROW2);
  });

  it('第 3 行：链到第 2 行（改一行即全线漂移的自证）', () => {
    const row3 = { ...baseRow, id: 'g3', createTime: '2026-10-05 08:00:02.123', operation: 'ORDER_CREATE', duration: 88, errorMessage: 'x' };
    expect(computeRecordHash(ROW2, 3, row3)).toBe(ROW3);
    // 篡改第 3 行任一字段（duration 88→89）→ 哈希变
    expect(computeRecordHash(ROW2, 3, { ...row3, duration: 89 })).not.toBe(ROW3);
    // 第 2 行被篡改 → 第 3 行链接不上（prevHash 断）
    expect(computeRecordHash(ROW2.slice(0, 63) + 'f', 3, row3)).not.toBe(ROW3);
  });

  it('三行 golden 链整体过 verifyChain：valid=true，头=ROW3', () => {
    const mk = (seq, prev, id, patch) => ({
      ...baseRow, ...patch, id, seq, prevHash: prev, recordHash: computeRecordHash(prev, seq, { ...baseRow, ...patch, id }),
    });
    const r1 = mk(1, ZERO_HASH, 'g1', {});
    const r2 = mk(2, GENESIS, 'g2', { createTime: '2026-10-05 08:00:01.500', operation: 'PRODUCT_VIEW', duration: 12 });
    const r3 = mk(3, ROW2, 'g3', { createTime: '2026-10-05 08:00:02.123', operation: 'ORDER_CREATE', duration: 88, errorMessage: 'x' });
    const result = verifyChain([r3, r1, r2]); // 乱序输入也要过（内部按 seq 排）
    expect(result.valid).toBe(true);
    expect(result.length).toBe(3);
    expect(result.headSeq).toBe(3);
    expect(result.headHash).toBe(ROW3);
  });
});

// ── verifyChain 五类问题，各自命中并带 seq 定位 ────────────────
describe('verifyChain 问题判定（五类，带 seq 定位）', () => {
  const mkRow = (seq: number, prev: string, patch: Record<string, unknown> = {}) => {
    const content = { ...baseRow, ...patch, id: `r${seq}` };
    return { ...content, seq, prevHash: prev, recordHash: computeRecordHash(prev, seq, content) };
  };

  it('UNCHAINED：三链列 NULL 的行剥离并记账（每行一笔）', () => {
    const rows = [mkRow(1, ZERO_HASH), { ...baseRow, id: 'x1' }, { ...baseRow, id: 'x2' }, mkRow(2, mkRow(1, ZERO_HASH).recordHash)];
    const r = verifyChain(rows);
    expect(r.valid).toBe(false);
    expect(r.problems.filter(p => p.type === 'UNCHAINED')).toHaveLength(2);
    expect(r.problems.find(p => p.type === 'UNCHAINED')?.id).toBe('x1');
  });

  it('GAP：seq 断档指认缺失区间', () => {
    const r1 = mkRow(1, ZERO_HASH);
    const r3 = mkRow(3, r1.recordHash); // 缺 seq=2
    const r = verifyChain([r1, r3]);
    const gap = r.problems.find(p => p.type === 'GAP');
    expect(gap).toBeDefined();
    expect(gap?.seq).toBe(3);
    expect(gap?.detail).toContain('2');
  });

  it('DUPLICATE_SEQ：重号指认同一 seq', () => {
    const r1 = mkRow(1, ZERO_HASH);
    const h1 = r1.recordHash;
    const r2 = mkRow(2, h1);
    const r2dup = mkRow(2, r2.recordHash); // 与 r2 同 seq
    const r = verifyChain([r1, r2, r2dup]);
    const dup = r.problems.find(p => p.type === 'DUPLICATE_SEQ');
    expect(dup?.seq).toBe(2);
  });

  it('BREAK：prevHash 与链头不符，指认该行 seq', () => {
    const r1 = mkRow(1, ZERO_HASH);
    const r2 = mkRow(2, 'f'.repeat(64)); // 前驱指向野哈希
    const r = verifyChain([r1, r2]);
    const brk = r.problems.find(p => p.type === 'BREAK');
    expect(brk?.seq).toBe(2);
  });

  it('CONTENT：重算哈希与存档不符（raw UPDATE 篡改的在线镜像），指认该行 seq', () => {
    const r1 = mkRow(1, ZERO_HASH);
    const r2 = mkRow(2, r1.recordHash);
    const tampered = { ...r2, status: 'FAILURE' }; // 篡改未重算哈希
    const r = verifyChain([r1, tampered]);
    const content = r.problems.find(p => p.type === 'CONTENT');
    expect(content?.seq).toBe(2);
    expect(content?.id).toBe('r2');
  });

  it('FORK：同一 prevHash 被两行引用（分叉）', () => {
    const r1 = mkRow(1, ZERO_HASH);
    const h1 = r1.recordHash;
    const r2a = mkRow(2, h1);
    const r2b = mkRow(3, h1); // 也指向 h1 → 分叉
    const r = verifyChain([r1, r2a, r2b]);
    expect(r.problems.some(p => p.type === 'FORK')).toBe(true);
  });

  it('断点后按该行自身存档哈希续链（损伤定位到行，不全线报错）', () => {
    const r1 = mkRow(1, ZERO_HASH);
    const r2 = mkRow(2, 'a'.repeat(64)); // prevHash 野指：BREAK；重算用期望前驱 → 同行再记一笔 CONTENT
    const r3 = mkRow(3, r2.recordHash); // 正确接在 r2 存档哈希后——重同步成立的证据
    const r = verifyChain([r1, r2, r3]);
    const types = r.problems.map(p => p.type);
    expect(types).toContain('BREAK');
    expect(types).toContain('CONTENT');
    expect(types).not.toContain('GAP');
    // 损伤只落在 seq=2：r3 自身零问题（后续行不被前线断裂连坐）
    expect(r.problems.filter(p => p.seq === 3)).toHaveLength(0);
  });

  it('空库：valid=true，头=零串', () => {
    const r = verifyChain([]);
    expect(r.valid).toBe(true);
    expect(r.headHash).toBe(ZERO_HASH);
    expect(r.headSeq).toBe(0);
    expect(r.length).toBe(0);
  });
});
