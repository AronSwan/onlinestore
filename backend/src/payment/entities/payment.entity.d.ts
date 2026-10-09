export declare enum PaymentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    SUCCESS = "success",
    FAILED = "failed",
    CANCELLED = "cancelled",
    REFUNDED = "refunded",
    PARTIAL_REFUNDED = "partial_refunded",
    EXPIRED = "expired"
}
export declare enum PaymentMethod {
    ALIPAY = "alipay",
    WECHAT = "wechat",
    UNIONPAY = "unionpay",
    CREDIT_CARD = "credit_card",
    BANK_TRANSFER = "bank_transfer",
    USDT_TRC20 = "usdt_trc20",
    USDT_ERC20 = "usdt_erc20",
    USDT_BEP20 = "usdt_bep20",
    BTC = "btc",
    ETH = "eth"
}
export declare enum PaymentGateway {
    GOPAY = "gopay",
    CRYPTO = "crypto",
    MANUAL = "manual"
}
export declare class Payment {
    id: number;
    paymentId: string;
    orderId: string;
    userId: number;
    amount: number;
    currency: string;
    method: PaymentMethod;
    gateway: PaymentGateway;
    status: PaymentStatus;
    thirdPartyTransactionId: string | null;
    blockchainTxHash: string | null;
    cryptoAddress: string | null;
    metadata: any;
    failureReason: string | null;
    paidAt: Date | null;
    expiredAt: Date | null;
    refundedAt: Date | null;
    refundedAmount: number | null;
    refundId: string | null;
    retryCount: number;
    idempotencyKey: string | null;
    createdAt: Date;
    updatedAt: Date;
}
