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
 */

const PII_FIELDS = ['recipientName', 'recipientPhone', 'shippingAddress'] as const;

/** 遮罩收货人名：姓+* */
export function maskName(name: string | null): string | null {
  if (!name) return null;
  const chars = [...name];
  if (chars.length <= 1) return chars[0] + '*';
  return chars[0] + '*'.repeat(chars.length - 1);
}

/** 遮罩手机号：前3后4 */
export function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  if (phone.length <= 7) return '*'.repeat(phone.length);
  return phone.slice(0, 3) + '*'.repeat(phone.length - 7) + phone.slice(-4);
}

/** 遮罩地址：前6字+… */
export function maskAddress(addr: string | null): string | null {
  if (!addr) return null;
  const chars = [...addr];
  if (chars.length <= 6) return chars.join('') + '…';
  return chars.slice(0, 6).join('') + '…';
}

/**
 * 快照 payload PII 遮罩（读时脱敏主入口）
 * @param payload 快照 JSON（含 PII 字段）
 * @param isAdmin true=不遮罩（admin 视图），false=遮罩
 * @returns 新对象（不改原 payload——快照只读）
 */
export function maskSnapshotPii<T extends Record<string, unknown>>(
  payload: T,
  isAdmin: boolean,
): T {
  if (isAdmin) return payload;
  return {
    ...payload,
    recipientName: maskName(payload.recipientName as string | null),
    recipientPhone: maskPhone(payload.recipientPhone as string | null),
    shippingAddress: maskAddress(payload.shippingAddress as string | null),
  };
}

/** 批量遮罩快照数组 */
export function maskSnapshotsPii<T extends Record<string, unknown>>(
  snapshots: T[],
  isAdmin: boolean,
): T[] {
  return snapshots.map((s) => maskSnapshotPii(s, isAdmin));
}

export { PII_FIELDS };
