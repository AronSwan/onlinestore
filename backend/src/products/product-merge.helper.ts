// 用途：商品 PATCH 合并视图共享 helper（三次修复清单 3/7，双盲审总报告 fix2 §三）
// 依赖文件：product.entity.ts（形状参考，无运行时依赖——纯函数层）
// 背景：控制器复检闸的「合并视图」与 service 写路径的「合并校验」此前各写一份
//   同构逻辑（Y2 判 P2：R2 所修病根的复发面）——两份实现必然漂移。本文件是
//   两处的单点引用；同时承接 Y1 的 postgres 可移植 P1：
//   PG decimal 列经 node-postgres 返回字符串（price='100.00'），原 `typeof === 'number'`
//   守卫在 PG 部署形态下静默失效——这里统一 Number() 强转归一（null 保持 null）。
// 作者：三次修复席（2026-10-05）

/**
 * 数值归一（P1-3 PG 可移植 → 四修 P2 收紧为严格数字形态）：
 *   - null/undefined → null（缺失语义，交 invalid* 标记区分）；
 *   - number 原样（仅有限数：NaN/Infinity → null）；
 *   - 字符串仅放行十进制字面量形态 /^\s*-?\d+(\.\d+)?([eE][+-]?\d+)?\s*$/
 *     （PG decimal 列返回的 '100.00' 天然在形态内）；
 *   - 其余一律 null：''/'  '（空串——旧实现 Number('')=0 静默归零，直调面
 *     危险）、数组（Number([5])=5）、布尔（Number(true)=1）、'0x10'（=16）、
 *     '.5'/'5.'/'+5'/'1e' 等非严格形态、对象/其他类型。
 * 收紧动机：旧实现借用 JS 宽松 Number() 语义，非数字形状被静默"猜"成数字
 * （空串变 0、布尔变 1、十六进制串变 16），mergePriceView 的 invalid* 甄别
 * 对这些形状失效（Y1 直调面共中）。归一失败的形状由调用方 400 fail-clean。
 */
const STRICT_NUMERIC_SHAPE = /^\s*-?\d+(\.\d+)?([eE][+-]?\d+)?\s*$/;
export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && STRICT_NUMERIC_SHAPE.test(value)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** 价格合并视图（R1 不变式 originalPrice>=price 的唯一裁决形状） */
export interface MergedPriceView {
  /** 合并视图现价（提交 ?? 存量，Number 归一；无任何可用值时 null） */
  price: number | null;
  /** 合并视图划线价（显式 null=清除；未传沿用存量；Number 归一） */
  originalPrice: number | null;
  /** 提交方是否携带 price（hasOwnProperty 且非 null/undefined） */
  priceSubmitted: boolean;
  /** 提交方是否携带 originalPrice 键（含显式 null=清除语义） */
  originalPriceSubmitted: boolean;
  /** originalPrice 是否为显式 null（合法的清除划线价语义） */
  originalPriceExplicitNull: boolean;
  /** 提交了 price 但形状非法（归一失败，如 'abc'/对象）——调用方须 400 */
  invalidPrice: boolean;
  /** 提交了 originalPrice（非 null）但形状非法——调用方须 400 */
  invalidOriginalPrice: boolean;
}

/**
 * 「存量+增量」价格合并视图（单点实现，service 写路径与测试共用）：
 *   - price：提交（非 null）→ Number 归一；否则存量归一；
 *   - originalPrice：显式 null → null（清除语义，清除后无不变式可言）；
 *     未传 → 存量归一；提交数字 → Number 归一；
 *   - 存量值按 PG 可移植规则强转（'120.00' → 120），localStorage 形状不再静默跳过校验。
 * 纯函数：不抛异常、不改入参；非法提交形状以 invalid* 标记暴露，由调用方决定报错面。
 */
export function mergePriceView(
  submitted: { price?: unknown; originalPrice?: unknown },
  stored: { price?: unknown; originalPrice?: unknown },
): MergedPriceView {
  const priceSubmitted =
    submitted.price !== null && submitted.price !== undefined;
  const originalPriceKeyPresent = Object.prototype.hasOwnProperty.call(
    submitted,
    'originalPrice',
  );
  const originalPriceExplicitNull =
    originalPriceKeyPresent && submitted.originalPrice === null;
  const originalPriceSubmitted =
    originalPriceKeyPresent &&
    submitted.originalPrice !== null &&
    submitted.originalPrice !== undefined;

  const submittedPrice = toNumberOrNull(submitted.price);
  const storedPrice = toNumberOrNull(stored.price);
  const submittedOriginalPrice = toNumberOrNull(submitted.originalPrice);
  const storedOriginalPrice = toNumberOrNull(stored.originalPrice);

  return {
    price: priceSubmitted ? submittedPrice : storedPrice,
    originalPrice: originalPriceExplicitNull
      ? null
      : originalPriceSubmitted
        ? submittedOriginalPrice
        : storedOriginalPrice,
    priceSubmitted,
    originalPriceSubmitted,
    originalPriceExplicitNull,
    invalidPrice: priceSubmitted && submittedPrice === null,
    invalidOriginalPrice: originalPriceSubmitted && submittedOriginalPrice === null,
  };
}

/**
 * specifications 浅合并（R2 语义的单点实现，控制器闸视图与 service 写路径共用）：
 *   - 提交 null → null（合法的"整体清空"，闸走 lint-only、库写 NULL）；
 *   - 提交普通对象 → { ...存量, ...提交 }（dto 键覆盖同名键、未提及键保留——
 *     factCard 因此天然保留）；
 *   - 未提交（undefined）/ 存量形状异常 → 存量的浅拷贝（闸视图用；写路径由
 *     调用方保证仅在键存在时才引用本函数，不会把 undefined 写成新值）；
 *   - 提交数组/标量 → 原样透传（写路径透传由 @IsObject 前置拦截 HTTP 面，
 *     直接调用面的透传保持与旧实现兼容——数组不再被展开成数字键对象，属修正）。
 */
export function mergeSpecifications(
  submitted: unknown,
  stored: unknown,
): Record<string, unknown> | null {
  if (submitted === null) return null;
  if (submitted !== undefined && (typeof submitted !== 'object' || Array.isArray(submitted))) {
    return submitted as unknown as Record<string, unknown>;
  }
  const base =
    typeof stored === 'object' && stored !== null && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  const overlay = (submitted ?? {}) as Record<string, unknown>;
  return { ...base, ...overlay };
}
