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
exports.RefundPaymentDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class RefundPaymentDto {
}
exports.RefundPaymentDto = RefundPaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付订单ID',
        example: 'PAY_1234567890ABCDEF',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RefundPaymentDto.prototype, "paymentOrderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '退款金额',
        example: 50.0,
        minimum: 0.01,
        maximum: 999999.99,
    }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 6 }),
    (0, class_validator_1.Min)(0.01),
    (0, class_validator_1.Max)(999999.99),
    __metadata("design:type", Number)
], RefundPaymentDto.prototype, "refundAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '货币类型',
        example: 'CNY',
        enum: ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'SGD', 'USDT', 'BTC', 'ETH'],
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsEnum)(['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'SGD', 'USDT', 'BTC', 'ETH']),
    __metadata("design:type", String)
], RefundPaymentDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '退款原因',
        example: '用户申请退款',
        maxLength: 500,
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RefundPaymentDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '退款说明',
        example: '商品质量问题，用户要求退款',
        maxLength: 1000,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RefundPaymentDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '操作员ID（可选，从JWT token中获取）',
        example: 'admin_123',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RefundPaymentDto.prototype, "operatorId", void 0);
