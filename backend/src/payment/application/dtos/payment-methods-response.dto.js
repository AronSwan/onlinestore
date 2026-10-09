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
exports.PaymentMethodsResponseDto = exports.CryptoPaymentMethodDto = exports.TraditionalPaymentMethodDto = exports.FeeInfoDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class FeeInfoDto {
}
exports.FeeInfoDto = FeeInfoDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '费率（百分比）',
        example: 0.006,
    }),
    __metadata("design:type", Number)
], FeeInfoDto.prototype, "rate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '最小费用',
        example: 0.01,
    }),
    __metadata("design:type", Number)
], FeeInfoDto.prototype, "min", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '最大费用',
        example: 100.0,
    }),
    __metadata("design:type", Number)
], FeeInfoDto.prototype, "max", void 0);
class TraditionalPaymentMethodDto {
}
exports.TraditionalPaymentMethodDto = TraditionalPaymentMethodDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付方式代码',
        example: 'ALIPAY',
    }),
    __metadata("design:type", String)
], TraditionalPaymentMethodDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付方式名称',
        example: '支付宝',
    }),
    __metadata("design:type", String)
], TraditionalPaymentMethodDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '图标',
        example: 'alipay',
    }),
    __metadata("design:type", String)
], TraditionalPaymentMethodDto.prototype, "icon", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '是否启用',
        example: true,
    }),
    __metadata("design:type", Boolean)
], TraditionalPaymentMethodDto.prototype, "enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '描述',
        example: '支持支付宝扫码支付',
    }),
    __metadata("design:type", String)
], TraditionalPaymentMethodDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '费率信息',
        type: FeeInfoDto,
    }),
    __metadata("design:type", FeeInfoDto)
], TraditionalPaymentMethodDto.prototype, "fees", void 0);
class CryptoPaymentMethodDto {
}
exports.CryptoPaymentMethodDto = CryptoPaymentMethodDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付方式代码',
        example: 'USDT_TRC20',
    }),
    __metadata("design:type", String)
], CryptoPaymentMethodDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '支付方式名称',
        example: 'USDT (TRC20)',
    }),
    __metadata("design:type", String)
], CryptoPaymentMethodDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '图标',
        example: 'usdt',
    }),
    __metadata("design:type", String)
], CryptoPaymentMethodDto.prototype, "icon", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '网络类型',
        example: 'TRC20',
    }),
    __metadata("design:type", String)
], CryptoPaymentMethodDto.prototype, "network", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '是否启用',
        example: true,
    }),
    __metadata("design:type", Boolean)
], CryptoPaymentMethodDto.prototype, "enabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '描述',
        example: '基于波场网络的USDT支付',
    }),
    __metadata("design:type", String)
], CryptoPaymentMethodDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '费率信息',
        type: FeeInfoDto,
    }),
    __metadata("design:type", FeeInfoDto)
], CryptoPaymentMethodDto.prototype, "fees", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: '合约地址',
        example: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    }),
    __metadata("design:type", String)
], CryptoPaymentMethodDto.prototype, "contractAddress", void 0);
class PaymentMethodsResponseDto {
}
exports.PaymentMethodsResponseDto = PaymentMethodsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '传统支付方式',
        type: [TraditionalPaymentMethodDto],
    }),
    __metadata("design:type", Array)
], PaymentMethodsResponseDto.prototype, "traditional", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '加密货币支付方式',
        type: [CryptoPaymentMethodDto],
    }),
    __metadata("design:type", Array)
], PaymentMethodsResponseDto.prototype, "crypto", void 0);
