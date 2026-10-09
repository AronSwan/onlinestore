/**
 * 退款域错误（W-3 席守卫批，2026-10-09）
 *
 * 域层纯 TS（不引 Nest）；应用层 createRefund 捕获后翻译为
 * ConflictException(409)——三个错误共同的语义：请求与支付订单当前状态冲突。
 * 原状是裸 Error('只有成功的支付订单才能退款')——经全局 filter 出口恒 500，
 * 客户端无法区分业务拒绝与系统故障。
 */

/** 订单状态不满足退款前置条件（仅 SUCCEEDED 可退） */
export class RefundNotAllowedError extends Error {
  constructor(
    readonly paymentOrderId: string,
    readonly currentStatus: string,
  ) {
    super(`只有成功的支付订单才能退款（订单 ${paymentOrderId} 当前状态: ${currentStatus}）`);
    this.name = 'RefundNotAllowedError';
  }
}

/** 退款币种与订单币种不一致（跨币种累计比较无意义，须先拒） */
export class RefundCurrencyMismatchError extends Error {
  constructor(
    readonly paymentOrderId: string,
    readonly orderCurrency: string,
    readonly refundCurrency: string,
  ) {
    super(
      `退款币种 ${refundCurrency} 与订单币种 ${orderCurrency} 不一致（订单 ${paymentOrderId}）`,
    );
    this.name = 'RefundCurrencyMismatchError';
  }
}

/**
 * 累计退款超出可退余额（paidAmount 为准）。
 * 预留口径=非 FAILED 退款（PENDING/PROCESSING/SUCCEEDED 均占额——
 * 在途退款先占额防并发超退，FAILED 释放）。
 * 金额均为最小单位整数（分/聪），规避浮点尾差。
 */
export class RefundOverpaidError extends Error {
  constructor(
    readonly paymentOrderId: string,
    readonly currency: string,
    readonly refundableMinor: number,
    readonly requestedMinor: number,
    readonly reservedMinor: number,
  ) {
    super(
      `退款金额超出可退余额（订单 ${paymentOrderId}，${currency}）：可退 ` +
        `${refundableMinor}，已占 ${reservedMinor}，本次请求 ${requestedMinor}（最小单位）`,
    );
    this.name = 'RefundOverpaidError';
  }
}
