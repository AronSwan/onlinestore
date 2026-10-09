"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = exports.PaymentGateway = exports.PaymentMethod = exports.PaymentStatus = void 0;
const typeorm_1 = require("typeorm");
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["SUCCESS"] = "success";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["CANCELLED"] = "cancelled";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["PARTIAL_REFUNDED"] = "partial_refunded";
    PaymentStatus["EXPIRED"] = "expired";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["ALIPAY"] = "alipay";
    PaymentMethod["WECHAT"] = "wechat";
    PaymentMethod["UNIONPAY"] = "unionpay";
    PaymentMethod["CREDIT_CARD"] = "credit_card";
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["USDT_TRC20"] = "usdt_trc20";
    PaymentMethod["USDT_ERC20"] = "usdt_erc20";
    PaymentMethod["USDT_BEP20"] = "usdt_bep20";
    PaymentMethod["BTC"] = "btc";
    PaymentMethod["ETH"] = "eth";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentGateway;
(function (PaymentGateway) {
    PaymentGateway["GOPAY"] = "gopay";
    PaymentGateway["CRYPTO"] = "crypto";
    PaymentGateway["MANUAL"] = "manual";
})(PaymentGateway || (exports.PaymentGateway = PaymentGateway = {}));
let Payment = class Payment {
};
exports.Payment = Payment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Payment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', unique: true, length: 64 }),
    __metadata("design:type", String)
], Payment.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], Payment.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)('int'),
    __metadata("design:type", Number)
], Payment.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 18, scale: 8 }),
    __metadata("design:type", Number)
], Payment.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'CNY' }),
    __metadata("design:type", String)
], Payment.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
    }),
    __metadata("design:type", String)
], Payment.prototype, "method", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
    }),
    __metadata("design:type", String)
], Payment.prototype, "gateway", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
        default: PaymentStatus.PENDING,
    }),
    __metadata("design:type", String)
], Payment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 128 }),
    __metadata("design:type", Object)
], Payment.prototype, "thirdPartyTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 256 }),
    __metadata("design:type", Object)
], Payment.prototype, "blockchainTxHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 128 }),
    __metadata("design:type", Object)
], Payment.prototype, "cryptoAddress", void 0);
__decorate([
    (0, typeorm_1.Column)('json', { nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 512 }),
    __metadata("design:type", Object)
], Payment.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "expiredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "refundedAt", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 18, scale: 8, nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "refundedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 128 }),
    __metadata("design:type", Object)
], Payment.prototype, "refundId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Payment.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 64 }),
    __metadata("design:type", Object)
], Payment.prototype, "idempotencyKey", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Payment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Payment.prototype, "updatedAt", void 0);
exports.Payment = Payment = __decorate([
    (0, typeorm_1.Entity)('payments'),
    (0, typeorm_1.Index)(['paymentId'], { unique: true }),
    (0, typeorm_1.Index)(['orderId']),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['method']),
    (0, typeorm_1.Index)(['createdAt'])
], Payment);
