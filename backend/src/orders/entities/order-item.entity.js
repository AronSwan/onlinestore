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
exports.OrderItem = void 0;
const typeorm_1 = require("typeorm");
const swagger_1 = require("@nestjs/swagger");
const order_entity_1 = require("./order.entity");
const product_entity_1 = require("../../products/entities/product.entity");
let OrderItem = class OrderItem {
};
exports.OrderItem = OrderItem;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '订单项ID' }),
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], OrderItem.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '订单ID' }),
    (0, typeorm_1.Column)('int'),
    __metadata("design:type", Number)
], OrderItem.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '产品ID' }),
    (0, typeorm_1.Column)('int'),
    __metadata("design:type", Number)
], OrderItem.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '产品数量' }),
    (0, typeorm_1.Column)('int'),
    __metadata("design:type", Number)
], OrderItem.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '产品单价' }),
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], OrderItem.prototype, "unitPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '订单项总价' }),
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], OrderItem.prototype, "totalPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '产品快照信息' }),
    (0, typeorm_1.Column)('json'),
    __metadata("design:type", Object)
], OrderItem.prototype, "productSnapshot", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '关联的订单' }),
    (0, typeorm_1.ManyToOne)(() => order_entity_1.Order, order => order.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'orderId' }),
    __metadata("design:type", order_entity_1.Order)
], OrderItem.prototype, "order", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '关联的产品' }),
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'productId' }),
    __metadata("design:type", product_entity_1.Product)
], OrderItem.prototype, "product", void 0);
exports.OrderItem = OrderItem = __decorate([
    (0, typeorm_1.Entity)('order_items')
], OrderItem);
