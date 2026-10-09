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
exports.AddCartItemDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class AddCartItemDto {
}
exports.AddCartItemDto = AddCartItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品 SPU ID', example: 'prod_123456' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], AddCartItemDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品 SKU ID', example: 'sku_123456' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], AddCartItemDto.prototype, "productSkuId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品名称', example: 'Reich 经典手袋' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], AddCartItemDto.prototype, "productName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品品牌', example: 'Reich' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], AddCartItemDto.prototype, "productBrand", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品价格', example: 2999.99 }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], AddCartItemDto.prototype, "productPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品数量', example: 1, minimum: 1, maximum: 999 }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 0 }),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(999),
    __metadata("design:type", Number)
], AddCartItemDto.prototype, "productQuantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品图片URL', example: '/images/products/bag-001.jpg' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], AddCartItemDto.prototype, "productPic", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '商品规格属性 JSON',
        example: '{"color":"黑色","size":"中号","material":"真皮"}',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], AddCartItemDto.prototype, "productAttribute", void 0);
