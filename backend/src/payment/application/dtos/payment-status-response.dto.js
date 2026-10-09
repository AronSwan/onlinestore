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
exports.PaymentStatusResponseDto = exports.RefundInfoDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class RefundInfoDto {
}
exports.RefundInfoDto = RefundInfoDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '退款ID',
        example: 'REFUND_1234567890ABCDEF',
    }),
    __metadata("design:type", String)
], RefundInfoDto.prototype, "refundId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '退款金额',
        example: 50.0,
    }),
    __metadata("design:type", Number)
], RefundInfoDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '退款货币',
        example: 'CNY',
    }),
    __metadata("design:type", String)
], RefundInfoDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '退款状态',
        example: 'PROCESSING',
        enum: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED'],
    }),
    __metadata("design:type", String)
], RefundInfoDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '退款原因',
        example: '用户申请退款',
    }),
    __metadata("design:type", String)
], RefundInfoDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '退款创建时间',
        example: '2024-01-01T13:00:00Z',
    }),
    __metadata("design:type", String)
], RefundInfoDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '退款完成时间',
        example: '2024-01-01T13:05:00Z',
    }),
    __metadata("design:type", String)
], RefundInfoDto.prototype, "completedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '支付网关退款号',
        example: '2024010122001234567890123457',
    }),
    __metadata("design:type", String)
], RefundInfoDto.prototype, "gatewayRefundId", void 0);
class PaymentStatusResponseDto {
}
exports.PaymentStatusResponseDto = PaymentStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付订单ID',
        example: 'PAY_1234567890ABCDEF',
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "paymentOrderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '商户订单ID',
        example: 'ORDER_20240101_123456',
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "merchantOrderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付金额',
        example: 99.99,
    }),
    __metadata("design:type", Number)
], PaymentStatusResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '货币类型',
        example: 'CNY',
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付方式',
        example: 'ALIPAY',
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付状态',
        example: 'SUCCEEDED',
        enum: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'CLOSED'],
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '实际支付金额',
        example: 99.99,
    }),
    __metadata("design:type", Number)
], PaymentStatusResponseDto.prototype, "paidAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '支付完成时间',
        example: '2024-01-01T12:00:00Z',
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "paidAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '失败原因',
        example: '余额不足',
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "failureReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '支付网关订单号',
        example: '2024010122001234567890123456',
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "gatewayOrderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '订单创建时间',
        example: '2024-01-01T11:00:00Z',
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '订单更新时间',
        example: '2024-01-01T12:00:00Z',
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '订单过期时间',
        example: '2024-01-01T12:00:00Z',
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "expireTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '订单关闭时间',
        example: '2024-01-01T12:30:00Z',
    }),
    __metadata("design:type", String)
], PaymentStatusResponseDto.prototype, "closedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '退款记录',
        type: [RefundInfoDto],
    }),
    __metadata("design:type", Array)
], PaymentStatusResponseDto.prototype, "refunds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '支付详情',
        example: {
            buyerId: '2088123456789012',
            buyerLogonId: 'buyer@example.com',
            sellerId: '2088987654321098',
            fundBillList: '[{"amount":"99.99","fundChannel":"ALIPAYACCOUNT"}]',
        },
    }),
    __metadata("design:type", Object)
], PaymentStatusResponseDto.prototype, "paymentDetails", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '区块链交易信息（加密货币支付）',
        example: {
            txHash: '0x1234567890abcdef...',
            confirmations: 6,
            blockHeight: 12345678,
            fromAddress: '0xabcdef1234567890...',
            toAddress: '0x1234567890abcdef...',
            network: 'TRC20',
            fee: 0.001,
        },
    }),
    __metadata("design:type", Object)
], PaymentStatusResponseDto.prototype, "blockchainInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '风险评估信息',
        example: {
            riskLevel: 'LOW',
            riskScore: 0.1,
            riskFactors: ['normal_ip', 'verified_user'],
        },
    }),
    __metadata("design:type", Object)
], PaymentStatusResponseDto.prototype, "riskInfo", void 0);
