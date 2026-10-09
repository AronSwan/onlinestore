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
exports.CartSummaryResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class CartSummaryResponseDto {
    constructor(totalItems, selectedItems, totalValue, selectedValue) {
        this.totalItems = totalItems;
        this.selectedItems = selectedItems;
        this.totalValue = totalValue;
        this.selectedValue = selectedValue;
    }
}
exports.CartSummaryResponseDto = CartSummaryResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '购物车总商品数量', example: 5 }),
    __metadata("design:type", Number)
], CartSummaryResponseDto.prototype, "totalItems", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '选中商品数量', example: 3 }),
    __metadata("design:type", Number)
], CartSummaryResponseDto.prototype, "selectedItems", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '购物车总价值', example: 8999.97 }),
    __metadata("design:type", Number)
], CartSummaryResponseDto.prototype, "totalValue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '选中商品总价值', example: 5999.98 }),
    __metadata("design:type", Number)
], CartSummaryResponseDto.prototype, "selectedValue", void 0);
