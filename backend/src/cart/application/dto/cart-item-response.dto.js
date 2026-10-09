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
exports.CartItemResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class CartItemResponseDto {
    constructor(id, productId, productSkuId, productName, productBrand, productPrice, productQuantity, productPic, productAttribute, selectFlag, createdAt, updatedAt) {
        this.id = id;
        this.productId = productId;
        this.productSkuId = productSkuId;
        this.productName = productName;
        this.productBrand = productBrand;
        this.productPrice = productPrice;
        this.productQuantity = productQuantity;
        this.productPic = productPic;
        this.productAttribute = productAttribute;
        this.selectFlag = selectFlag;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.totalPrice = productPrice * productQuantity;
    }
}
exports.CartItemResponseDto = CartItemResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '购物车商品ID', example: 'cart_1234567890_abc123' }),
    __metadata("design:type", String)
], CartItemResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品 SPU ID', example: 'prod_123456' }),
    __metadata("design:type", String)
], CartItemResponseDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品 SKU ID', example: 'sku_123456' }),
    __metadata("design:type", String)
], CartItemResponseDto.prototype, "productSkuId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品名称', example: 'Reich 经典手袋' }),
    __metadata("design:type", String)
], CartItemResponseDto.prototype, "productName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品品牌', example: 'Reich' }),
    __metadata("design:type", String)
], CartItemResponseDto.prototype, "productBrand", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品价格', example: 2999.99 }),
    __metadata("design:type", Number)
], CartItemResponseDto.prototype, "productPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品数量', example: 1 }),
    __metadata("design:type", Number)
], CartItemResponseDto.prototype, "productQuantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品图片URL', example: '/images/products/bag-001.jpg' }),
    __metadata("design:type", String)
], CartItemResponseDto.prototype, "productPic", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品规格属性', example: '{"color":"黑色","size":"中号"}' }),
    __metadata("design:type", String)
], CartItemResponseDto.prototype, "productAttribute", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '是否选中', example: true }),
    __metadata("design:type", Boolean)
], CartItemResponseDto.prototype, "selectFlag", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '创建时间' }),
    __metadata("design:type", Date)
], CartItemResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '更新时间' }),
    __metadata("design:type", Date)
], CartItemResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '商品总价', example: 2999.99 }),
    __metadata("design:type", Number)
], CartItemResponseDto.prototype, "totalPrice", void 0);
