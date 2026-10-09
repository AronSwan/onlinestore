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
exports.PagedCartResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const cart_item_response_dto_1 = require("./cart-item-response.dto");
class PagedCartResponseDto {
    constructor(items, total, page, limit) {
        this.items = items;
        this.total = total;
        this.page = page;
        this.limit = limit;
        this.totalPages = Math.ceil(total / limit);
        this.hasNext = page < this.totalPages;
        this.hasPrev = page > 1;
    }
}
exports.PagedCartResponseDto = PagedCartResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '购物车商品列表', type: [cart_item_response_dto_1.CartItemResponseDto] }),
    __metadata("design:type", Array)
], PagedCartResponseDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '总数量', example: 25 }),
    __metadata("design:type", Number)
], PagedCartResponseDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '当前页码', example: 1 }),
    __metadata("design:type", Number)
], PagedCartResponseDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '每页数量', example: 20 }),
    __metadata("design:type", Number)
], PagedCartResponseDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '总页数', example: 2 }),
    __metadata("design:type", Number)
], PagedCartResponseDto.prototype, "totalPages", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '是否有下一页', example: true }),
    __metadata("design:type", Boolean)
], PagedCartResponseDto.prototype, "hasNext", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '是否有上一页', example: false }),
    __metadata("design:type", Boolean)
], PagedCartResponseDto.prototype, "hasPrev", void 0);
