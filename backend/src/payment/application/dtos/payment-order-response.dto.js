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
exports.PaymentOrderResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class PaymentOrderResponseDto {
}
exports.PaymentOrderResponseDto = PaymentOrderResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付订单ID',
        example: 'PAY_1234567890ABCDEF',
    }),
    __metadata("design:type", String)
], PaymentOrderResponseDto.prototype, "paymentOrderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '商户订单ID',
        example: 'ORDER_20240101_123456',
    }),
    __metadata("design:type", String)
], PaymentOrderResponseDto.prototype, "merchantOrderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付金额',
        example: 99.99,
    }),
    __metadata("design:type", Number)
], PaymentOrderResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '货币类型',
        example: 'CNY',
    }),
    __metadata("design:type", String)
], PaymentOrderResponseDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付方式',
        example: 'ALIPAY',
    }),
    __metadata("design:type", String)
], PaymentOrderResponseDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付状态',
        example: 'PENDING',
        enum: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'CLOSED'],
    }),
    __metadata("design:type", String)
], PaymentOrderResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '支付URL（用于跳转支付）',
        example: 'https://openapi.alipay.com/gateway.do?...',
    }),
    __metadata("design:type", String)
], PaymentOrderResponseDto.prototype, "paymentUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '支付二维码（Base64编码）',
        example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    }),
    __metadata("design:type", String)
], PaymentOrderResponseDto.prototype, "qrCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '订单过期时间',
        example: '2024-01-01T12:00:00Z',
    }),
    __metadata("design:type", String)
], PaymentOrderResponseDto.prototype, "expireTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '订单创建时间',
        example: '2024-01-01T11:00:00Z',
    }),
    __metadata("design:type", String)
], PaymentOrderResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '支付网关订单号',
        example: '2024010122001234567890123456',
    }),
    __metadata("design:type", String)
], PaymentOrderResponseDto.prototype, "gatewayOrderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '支付说明',
        example: '请在30分钟内完成支付',
    }),
    __metadata("design:type", String)
], PaymentOrderResponseDto.prototype, "paymentInstructions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '扩展信息',
        example: {
            qrCodeUrl: 'https://example.com/qr/123456',
            deepLink: 'alipays://platformapi/startapp?...',
        },
    }),
    __metadata("design:type", Object)
], PaymentOrderResponseDto.prototype, "extraInfo", void 0);
