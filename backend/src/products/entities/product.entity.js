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
exports.Product = void 0;
const typeorm_1 = require("typeorm");
const swagger_1 = require("@nestjs/swagger");
const category_entity_1 = require("./category.entity");
const product_image_entity_1 = require("./product-image.entity");
let Product = class Product {
};
exports.Product = Product;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    (0, swagger_1.ApiProperty)({ description: '产品ID' }),
    __metadata("design:type", Number)
], Product.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 255 }),
    (0, swagger_1.ApiProperty)({ description: '产品名称' }),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    (0, swagger_1.ApiProperty)({ description: '产品描述' }),
    __metadata("design:type", String)
], Product.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    (0, swagger_1.ApiProperty)({ description: '产品价格' }),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, nullable: true }),
    (0, swagger_1.ApiProperty)({ description: '原价' }),
    __metadata("design:type", Number)
], Product.prototype, "originalPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    (0, swagger_1.ApiProperty)({ description: '库存数量' }),
    __metadata("design:type", Number)
], Product.prototype, "stock", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    (0, swagger_1.ApiProperty)({ description: '销量' }),
    __metadata("design:type", Number)
], Product.prototype, "sales", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    (0, swagger_1.ApiProperty)({ description: '是否上架' }),
    __metadata("design:type", Boolean)
], Product.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    (0, swagger_1.ApiProperty)({ description: '浏览量' }),
    __metadata("design:type", Number)
], Product.prototype, "views", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    (0, swagger_1.ApiProperty)({ description: '收藏数' }),
    __metadata("design:type", Number)
], Product.prototype, "favorites", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, swagger_1.ApiProperty)({ description: '主图URL' }),
    __metadata("design:type", String)
], Product.prototype, "mainImage", void 0);
__decorate([
    (0, typeorm_1.Column)('simple-array', { nullable: true }),
    (0, swagger_1.ApiProperty)({ description: '产品标签' }),
    __metadata("design:type", Array)
], Product.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)('json', { nullable: true }),
    (0, swagger_1.ApiProperty)({ description: '产品规格' }),
    __metadata("design:type", Object)
], Product.prototype, "specifications", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => category_entity_1.Category, category => category.products),
    (0, swagger_1.ApiProperty)({ description: '产品分类' }),
    __metadata("design:type", category_entity_1.Category)
], Product.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_image_entity_1.ProductImage, image => image.product),
    (0, swagger_1.ApiProperty)({ description: '产品图片' }),
    __metadata("design:type", Array)
], Product.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    (0, swagger_1.ApiProperty)({ description: '创建时间' }),
    __metadata("design:type", Date)
], Product.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    (0, swagger_1.ApiProperty)({ description: '更新时间' }),
    __metadata("design:type", Date)
], Product.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, swagger_1.ApiProperty)({ description: '上架时间' }),
    __metadata("design:type", Date)
], Product.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.VersionColumn)(),
    (0, swagger_1.ApiProperty)({ description: '乐观锁版本' }),
    __metadata("design:type", Number)
], Product.prototype, "version", void 0);
exports.Product = Product = __decorate([
    (0, typeorm_1.Entity)('products'),
    (0, typeorm_1.Index)(['name']),
    (0, typeorm_1.Index)(['price']),
    (0, typeorm_1.Index)(['stock']),
    (0, typeorm_1.Index)(['isActive', 'createdAt'])
], Product);
