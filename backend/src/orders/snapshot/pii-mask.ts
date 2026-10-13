/**
 * 快照 PII 读时脱敏（阶段 3——#25 出口层遮罩）
 *
 * 快照永不改写（哈希覆盖 PII 使不可变），但出口层须遮罩：
 * - 非 admin 请求→遮罩 recipientName/recipientPhone/shippingAddress
 * - admin 请求→原样返回（管理后台需完整信息处理售后）
 *
 * 遮罩规则（不可逆——只出遮罩值，不回显原值）：
 * - recipientName：保留姓+*（如"张*"、"欧阳**"）
 * - recipientPhone：保留前 3 后 4（如"138****0000"）
 * - shippingAddress：保留前 6 字+…（如"北京市朝阳区…"）
 *
 * P1-A 修因（双盲审四席共中）：遮罩作用在内层 snapshot 对象（真实 PII 所在），
 * 不是外层信封（rowToPayload 返回 {orderId,…,snapshot:{PII}}）。
 */

const PII_FIELDS = ['recipientName', 'recipientPhone', 'shippingAddress'] as const;

/** 遮罩收货人名：姓+* */
export function maskName(name: string | null | undefined): string | null {
  if (name == null) return null;
  const s = String(name);
  if (!s) return null;
  const chars = [...s];
  if (chars.length <= 1) return chars[0] + '*';
  return chars[0] + '*'.repeat(chars.length - 1);
}

/** 遮罩手机号：前3后4 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (phone == null) return null;
  const s = String(phone);
  if (!s) return null;
  if (s.length <= 7) return '*'.repeat(s.length);
  return s.slice(0, 3) + '*'.repeat(s.length - 7) + s.slice(-4);
}

/** 遮罩地址：保留前 4 字+…（P2-10 修因：≤6 字不再全露） */
export function maskAddress(addr: string | null | undefined): string | null {
  if (addr == null) return null;
  const s = String(addr);
  if (!s) return null;
  const chars = [...s];
  if (chars.length <= 2) return '**';
  return chars.slice(0, Math.min(4, chars.length - 1)).join('') + '…';
}

/**
 * 快照 PII 遮罩（读时脱敏主入口）——P1-A 修因：遮内层 snapshot
 * @param payload rowToPayload 返回的信封对象 {orderId,…,snapshot:{PII…}}
 * @param isAdmin true=不遮罩（admin 视图），false=遮罩
 * @returns 新对象（不改原 payload——快照只读）
 */
export function maskSnapshotPii<T extends Record<string, unknown>>(
  payload: T,
  isAdmin: boolean,
): T {
  if (isAdmin) return payload;
  const inner = payload.snapshot as Record<string, unknown> | undefined;
  if (!inner || typeof inner !== 'object') {
    // 兼容平铺形状（无 snapshot 包装层——直接遮顶层）
    return {
      ...payload,
      recipientName: maskName(payload.recipientName as string | null),
      recipientPhone: maskPhone(payload.recipientPhone as string | null),
      shippingAddress: maskAddress(payload.shippingAddress as string | null),
    };
  }
  return {
    ...payload,
    snapshot: {
      ...inner,
      recipientName: maskName(inner.recipientName as string | null),
      recipientPhone: maskPhone(inner.recipientPhone as string | null),
      shippingAddress: maskAddress(inner.shippingAddress as string | null),
    },
  };
}

/** 批量遮罩快照数组 */
export function maskSnapshotsPii<T extends Record<string, unknown>>(
  snapshots: T[],
  isAdmin: boolean,
): T[] {
  return snapshots.map((s) => maskSnapshotPii(s, isAdmin));
}

/**
 * 遮罩 diff changes 中的 PII from/to 值（P2-F 修因）
 */
export function maskChangesPii(
  changes: Record<string, { from: unknown; to: unknown }>,
  isAdmin: boolean,
): Record<string, { from: unknown; to: unknown }> {
  if (isAdmin) return changes;
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, val] of Object.entries(changes)) {
    if (key === 'recipientName') {
      out[key] = { from: maskName(val.from as string | null), to: maskName(val.to as string | null) };
    } else if (key === 'recipientPhone') {
      out[key] = { from: maskPhone(val.from as string | null), to: maskPhone(val.to as string | null) };
    } else if (key === 'shippingAddress') {
      out[key] = { from: maskAddress(val.from as string | null), to: maskAddress(val.to as string | null) };
    } else {
      out[key] = val;
    }
  }
  return out;
}

export { PII_FIELDS };
