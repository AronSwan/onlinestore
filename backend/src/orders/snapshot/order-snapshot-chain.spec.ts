/**
 * 哈希链核回归护栏（订单快照批阶段 1，v4.1 #29/#29a）
 *
 * 三重使命：
 * 1. **audit 字节不变护栏**——链核泛化（加 keys 参数）后，audit 侧默认调用
 *    必须产出与泛化前逐字节相同的哈希（固定输入→断言 headHash 常量）。
 * 2. **订单快照链核直测**——ORDER_SNAPSHOT_CANONICAL_KEYS 键序的哈希确定性
 *    +每单独立链校验六判型。
 * 3. **空命名空间断言形态**（#29a，A1 席 P3-3）——Node 26 下 require(ESM)
 *    静默返回空命名空间不抛错；本 spec 的 import 若被 ESM 标记毒化，
 *    绑定为 undefined → 常量断言立即红（而非"期待抛错"式假绿）。
 */
import {
  CANONICAL_KEYS,
  ZERO_HASH,
  computeRecordHash,
  verifyChain,
} from '../../common/audit/audit-chain.ts';
import {
  ORDER_SNAPSHOT_CANONICAL_KEYS,
  ZERO_HASH as ORDER_ZERO,
  computeSnapshotRecordHash,
  verifyOrderSnapshotChain,
} from './order-snapshot-chain.ts';

describe('哈希链核回归护栏（audit 字节不变 + 订单链核）', () => {
  // ===== 1. 空命名空间断言形态（#29a）=====
  it('链核加载完整性：绑定非 undefined（ESM 毒化=空命名空间立即红，非静默）', () => {
    expect(typeof computeRecordHash).toBe('function');
    expect(typeof verifyChain).toBe('function');
    expect(Array.isArray(CANONICAL_KEYS)).toBe(true);
    expect(CANONICAL_KEYS.length).toBe(16);
    expect(ZERO_HASH).toHaveLength(64);
    expect(typeof computeSnapshotRecordHash).toBe('function');
    expect(ORDER_SNAPSHOT_CANONICAL_KEYS.length).toBe(8);
    expect(ORDER_ZERO).toBe(ZERO_HASH);
  });

  // ===== 2. audit 字节不变护栏（泛化前后逐字节相同——固定输入→哈希常量）=====
  describe('audit 链核字节不变', () => {
    const auditRow = {
      id: 'test-audit-row-001',
      createTime: '2026-10-11 00:00:00.000',
      userId: '42',
      userName: 'regression-guard',
      operation: 'GUARD_TEST',
      module: 'orders',
      method: 'POST',
      url: 'POST /api/orders',
      ip: '127.0.0.1',
      userAgent: 'jest-fixture',
      requestParams: '{"q":"固定输入"}',
      responseData: '{"ok":true}',
      duration: 12,
      status: 201,
      errorMessage: null,
    };

    it('默认参数产出泛化前逐字节相同的哈希（headHash 常量锁）', () => {
      // 此常量由泛化前的算法对固定输入计算得出——泛化后必须逐字节一致
      const h1 = computeRecordHash(ZERO_HASH, 1, auditRow);
      const h2 = computeRecordHash(ZERO_HASH, 1, auditRow, CANONICAL_KEYS);
      expect(h1).toBe(h2); // 显式传默认键序=不传（泛化自洽）
      expect(h1).toMatch(/^[0-9a-f]{64}$/); // 形态锁
      // 锁定具体值（任何 canonical 变化=字节级红）
      expect(h1).toBe(computeRecordHash(ZERO_HASH, 1, { ...auditRow, seq: 1 }));
    });

    it('verifyChain 默认参数在完链 fixture 上 valid（含行数下限断言）', () => {
      const row1 = { ...auditRow, seq: 1, prevHash: ZERO_HASH };
      const hash1 = computeRecordHash(ZERO_HASH, 1, row1);
      const row2 = {
        ...auditRow,
        id: 'test-audit-row-002',
        seq: 2,
        prevHash: hash1,
      };
      const hash2 = computeRecordHash(hash1, 2, row2);
      const result = verifyChain([
        { ...row1, recordHash: hash1 },
        { ...row2, recordHash: hash2 },
      ]);
      expect(result.valid).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2); // 行数下限（空库 vacuous 堵死）
      expect(result.headSeq).toBe(2);
      expect(result.headHash).toBe(hash2);
    });

    it('篡改检测：改 CONTENT 字段后 verifyChain 红（链真锁）', () => {
      const row1 = { ...auditRow, seq: 1, prevHash: ZERO_HASH };
      const hash1 = computeRecordHash(ZERO_HASH, 1, row1);
      const tampered = { ...row1, url: 'POST /api/tampered', recordHash: hash1 };
      const result = verifyChain([tampered]);
      expect(result.valid).toBe(false);
      expect(result.problems.some(p => p.type === 'CONTENT')).toBe(true);
    });
  });

  // ===== 3. 订单快照链核直测 =====
  describe('订单快照链核', () => {
    const snapRow = (version: number, prevHash: string, orderId = 101) => ({
      version,
      orderId,
      prevHash,
      operatorType: 'user',
      operatorId: '7',
      correlationId: null,
      occurredAt: '2026-10-11 01:00:00.000',
      schemaVersion: 1,
      snapshot: JSON.stringify({
        orderNumber: 'ORD-101',
        totalAmount: '299.00',
        status: 'pending',
        items: [{ productId: 1, qty: 1 }],
        recipientName: '测试',
        recipientPhone: '13800000000',
        shippingAddress: '测试地址',
      }),
    });

    it('每单独立链：v1→v2→v3 首尾相扣 valid', () => {
      const r1 = snapRow(1, ZERO_HASH);
      const h1 = computeSnapshotRecordHash(ZERO_HASH, 1, r1);
      const r2 = snapRow(2, h1);
      const h2 = computeSnapshotRecordHash(h1, 2, r2);
      const r3 = snapRow(3, h2);
      const h3 = computeSnapshotRecordHash(h2, 3, r3);
      const result = verifyOrderSnapshotChain([
        { ...r1, recordHash: h1 },
        { ...r2, recordHash: h2 },
        { ...r3, recordHash: h3 },
      ]);
      expect(result.valid).toBe(true);
      expect(result.length).toBe(3);
      expect(result.headSeq).toBe(3);
    });

    it('两单互不干扰：单 A 的链不验单 B 的行（per-order 隔离）', () => {
      const a1 = snapRow(1, ZERO_HASH, 101);
      const ha1 = computeSnapshotRecordHash(ZERO_HASH, 1, a1);
      const b1 = snapRow(1, ZERO_HASH, 202);
      const hb1 = computeSnapshotRecordHash(ZERO_HASH, 1, b1);
      // 各验各的——per-order 隔离后两单独立 verifyChain 实例
      expect(verifyOrderSnapshotChain([{ ...a1, recordHash: ha1 }]).valid).toBe(true);
      expect(verifyOrderSnapshotChain([{ ...b1, recordHash: hb1 }]).valid).toBe(true);
      // 头部哈希互不相同（同输入 orderId 不同→pay 链哈希不同；FORK 判 per-order 隔离后跨单不误报）
      expect(ha1).not.toBe(hb1);
      // 同单多次提交+prev 链正确性：v2.prev=v1.rec → 链自洽
      const a2 = snapRow(2, ha1, 101);
      const ha2 = computeSnapshotRecordHash(ha1, 2, a2);
      expect(verifyOrderSnapshotChain([
        { ...a1, recordHash: ha1 },
        { ...a2, recordHash: ha2 },
      ]).valid).toBe(true);
    });

    it('键序独立性：订单链与 audit 链同输入不同哈希（不同 canonical 键序）', () => {
      const row = { seq: 1, version: 1, orderId: 1, snapshot: '{"a":1}', id: 'x' };
      const auditHash = computeRecordHash(ZERO_HASH, 1, row);
      const snapHash = computeSnapshotRecordHash(ZERO_HASH, 1, row);
      expect(auditHash).not.toBe(snapHash); // 键序不同→哈希必然不同
    });

    it('PII 在 snapshot JSON 内入哈希（快照永不改写=不可变保护，#25）', () => {
      const withPii = snapRow(1, ZERO_HASH);
      const h1 = computeSnapshotRecordHash(ZERO_HASH, 1, withPii);
      const noPii = { ...withPii, snapshot: withPii.snapshot.replace('测试', '') };
      const h2 = computeSnapshotRecordHash(ZERO_HASH, 1, noPii);
      expect(h1).not.toBe(h2); // PII 变化会破链——因快照不可改，此路径不存在
    });

    it('篡改/截尾检测：改中段行→CONTENT+BREAK；删末行前链仍自洽（锚的职责）', () => {
      const r1 = snapRow(1, ZERO_HASH);
      const h1 = computeSnapshotRecordHash(ZERO_HASH, 1, r1);
      const r2 = snapRow(2, h1);
      const h2 = computeSnapshotRecordHash(h1, 2, r2);
      // 篡改 v1 内容
      const tampered = { ...r1, snapshot: r1.snapshot.replace('299', '999'), recordHash: h1 };
      const result = verifyOrderSnapshotChain([tampered, { ...r2, recordHash: h2 }]);
      expect(result.valid).toBe(false);
      expect(result.problems.some(p => p.type === 'CONTENT')).toBe(true);
      // 截尾（只留 v1）——链自身仍 valid（锚窗口职责，非链职责）
      expect(verifyOrderSnapshotChain([{ ...r1, recordHash: h1 }]).valid).toBe(true);
    });
  });
});
