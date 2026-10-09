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
exports.ProductImage = void 0;
const typeorm_1 = require("typeorm");
const swagger_1 = require("@nestjs/swagger");
const product_entity_1 = require("./product.entity");
let ProductImage = class ProductImage {
};
exports.ProductImage = ProductImage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    (0, swagger_1.ApiProperty)({ description: '图片ID' }),
    __metadata("design:type", Number)
], ProductImage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product, product => product.images),
    (0, swagger_1.ApiProperty)({ description: '关联产品' }),
    __metadata("design:type", product_entity_1.Product)
], ProductImage.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, swagger_1.ApiProperty)({ description: '产品ID' }),
    __metadata("design:type", Number)
], ProductImage.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, swagger_1.ApiProperty)({ description: '图片URL' }),
    __metadata("design:type", String)
], ProductImage.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, swagger_1.ApiProperty)({ description: '图片标题' }),
    __metadata("design:type", String)
], ProductImage.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, swagger_1.ApiProperty)({ description: '图片描述' }),
    __metadata("design:type", String)
], ProductImage.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    (0, swagger_1.ApiProperty)({ description: '排序权重' }),
    __metadata("design:type", Number)
], ProductImage.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    (0, swagger_1.ApiProperty)({ description: '是否启用' }),
    __metadata("design:type", Boolean)
], ProductImage.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    (0, swagger_1.ApiProperty)({ description: '创建时间' }),
    __metadata("design:type", Date)
], ProductImage.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    (0, swagger_1.ApiProperty)({ description: '更新时间' }),
    __metadata("design:type", Date)
], ProductImage.prototype, "updatedAt", void 0);
exports.ProductImage = ProductImage = __decorate([
    (0, typeorm_1.Entity)('product_images')
], ProductImage);
