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
exports.CartItemEntity = void 0;
const typeorm_1 = require("typeorm");
let CartItemEntity = class CartItemEntity {
    get userId() {
        return this.customerUserId;
    }
    set userId(value) {
        this.customerUserId = value;
    }
};
exports.CartItemEntity = CartItemEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], CartItemEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, name: 'customer_user_id' }),
    __metadata("design:type", String)
], CartItemEntity.prototype, "customerUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, name: 'product_id' }),
    __metadata("design:type", String)
], CartItemEntity.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, name: 'product_sku_id' }),
    __metadata("design:type", String)
], CartItemEntity.prototype, "productSkuId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, name: 'product_name' }),
    __metadata("design:type", String)
], CartItemEntity.prototype, "productName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'product_brand' }),
    __metadata("design:type", String)
], CartItemEntity.prototype, "productBrand", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'product_price' }),
    __metadata("design:type", Number)
], CartItemEntity.prototype, "productPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'product_quantity' }),
    __metadata("design:type", Number)
], CartItemEntity.prototype, "productQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, name: 'product_pic' }),
    __metadata("design:type", String)
], CartItemEntity.prototype, "productPic", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'product_attribute', nullable: true }),
    __metadata("design:type", String)
], CartItemEntity.prototype, "productAttribute", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'select_flag', default: true }),
    __metadata("design:type", Boolean)
], CartItemEntity.prototype, "selectFlag", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'del_flag', default: false }),
    __metadata("design:type", Boolean)
], CartItemEntity.prototype, "delFlag", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CartItemEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CartItemEntity.prototype, "updatedAt", void 0);
exports.CartItemEntity = CartItemEntity = __decorate([
    (0, typeorm_1.Entity)('cart_items'),
    (0, typeorm_1.Index)(['customerUserId', 'productSkuId'], { unique: true }),
    (0, typeorm_1.Index)(['customerUserId']),
    (0, typeorm_1.Index)(['productSkuId'])
], CartItemEntity);
