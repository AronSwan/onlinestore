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
exports.PaymentCallbackDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class PaymentCallbackDto {
}
exports.PaymentCallbackDto = PaymentCallbackDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '商户订单号',
        example: 'ORDER_20240101_123456',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "outTradeNo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付网关订单号',
        example: '2024010122001234567890123456',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "gatewayOrderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '交易状态',
        example: 'TRADE_SUCCESS',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "tradeStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '订单总金额',
        example: 99.99,
    }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PaymentCallbackDto.prototype, "totalAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '实际收款金额',
        example: 99.99,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PaymentCallbackDto.prototype, "receiptAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '支付完成时间（ISO 8601格式）',
        example: '2024-01-01T12:00:00Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "gmtPayment", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '买家用户号',
        example: '2088123456789012',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "buyerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '买家支付宝账号',
        example: 'buyer@example.com',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "buyerLogonId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '卖家支付宝用户号',
        example: '2088987654321098',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "sellerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '卖家支付宝账号',
        example: 'seller@example.com',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "sellerEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '交易创建时间',
        example: '2024-01-01T11:55:00Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "gmtCreate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '交易关闭时间',
        example: '2024-01-01T12:30:00Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "gmtClose", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '资金详情',
        example: '[{"amount":"99.99","fundChannel":"ALIPAYACCOUNT"}]',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "fundBillList", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '回传参数',
        example: '{"userId":"123","orderId":"456"}',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "passbackParams", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '优惠券信息',
        example: '[{"name":"满减券","amount":"10.00"}]',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "voucherDetailList", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '原始回调数据',
        example: {},
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], PaymentCallbackDto.prototype, "rawData", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '签名',
        example: 'abc123def456...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "sign", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '签名类型',
        example: 'RSA2',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "signType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '字符集',
        example: 'utf-8',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "charset", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '版本号',
        example: '1.0',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "version", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '应用ID',
        example: '2021001234567890',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "appId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '区块链交易哈希',
        example: '0x1234567890abcdef...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "txHash", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '区块确认数',
        example: 6,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PaymentCallbackDto.prototype, "confirmations", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '发送方地址',
        example: '0xabcdef1234567890...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "fromAddress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '接收方地址',
        example: '0x1234567890abcdef...',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "toAddress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '网络类型',
        example: 'TRC20',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "network", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '合约地址',
        example: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentCallbackDto.prototype, "contractAddress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '区块高度',
        example: 12345678,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PaymentCallbackDto.prototype, "blockHeight", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '矿工费',
        example: 0.001,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PaymentCallbackDto.prototype, "fee", void 0);
