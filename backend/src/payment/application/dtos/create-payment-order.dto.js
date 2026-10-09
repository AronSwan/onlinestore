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
exports.CreatePaymentOrderDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreatePaymentOrderDto {
}
exports.CreatePaymentOrderDto = CreatePaymentOrderDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '商户订单ID',
        example: 'ORDER_20240101_123456',
        minLength: 1,
        maxLength: 64,
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentOrderDto.prototype, "merchantOrderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付金额',
        example: 99.99,
        minimum: 0.01,
        maximum: 999999.99,
    }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 6 }),
    (0, class_validator_1.Min)(0.01),
    (0, class_validator_1.Max)(999999.99),
    __metadata("design:type", Number)
], CreatePaymentOrderDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '货币类型',
        example: 'CNY',
        enum: ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'SGD', 'USDT', 'BTC', 'ETH'],
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsEnum)(['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'SGD', 'USDT', 'BTC', 'ETH']),
    __metadata("design:type", String)
], CreatePaymentOrderDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付方式',
        example: 'ALIPAY',
        enum: [
            'ALIPAY',
            'WECHAT',
            'UNIONPAY',
            'CREDIT_CARD',
            'BANK_TRANSFER',
            'USDT_TRC20',
            'USDT_ERC20',
            'USDT_BEP20',
            'BTC',
            'ETH',
        ],
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsEnum)([
        'ALIPAY',
        'WECHAT',
        'UNIONPAY',
        'CREDIT_CARD',
        'BANK_TRANSFER',
        'USDT_TRC20',
        'USDT_ERC20',
        'USDT_BEP20',
        'BTC',
        'ETH',
    ]),
    __metadata("design:type", String)
], CreatePaymentOrderDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付主题/商品名称',
        example: '商品购买',
        maxLength: 256,
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentOrderDto.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '支付描述',
        example: '购买商品的详细描述',
        maxLength: 1024,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentOrderDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '用户ID（可选，从JWT token中获取）',
        example: 'user_123456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentOrderDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '异步通知URL',
        example: 'https://example.com/payment/notify',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreatePaymentOrderDto.prototype, "notifyUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '同步返回URL',
        example: 'https://example.com/payment/return',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreatePaymentOrderDto.prototype, "returnUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '订单过期时间（ISO 8601格式）',
        example: '2024-01-01T12:00:00Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], CreatePaymentOrderDto.prototype, "expireTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '扩展参数',
        example: {
            productId: 'PROD_123',
            categoryId: 'CAT_456',
            discountCode: 'SAVE10',
        },
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreatePaymentOrderDto.prototype, "extraParams", void 0);
