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
exports.CreateProductDto = exports.nullToUndefined = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
let OriginalPriceNotBelowPriceConstraint = class OriginalPriceNotBelowPriceConstraint {
    validate(value, args) {
        const price = args.object.price;
        if (typeof price !== 'number' || typeof value !== 'number')
            return true;
        return value >= price;
    }
    defaultMessage() {
        return '划线原价 originalPrice 不能低于现价 price';
    }
};
OriginalPriceNotBelowPriceConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'originalPriceNotBelowPrice', async: false })
], OriginalPriceNotBelowPriceConstraint);
const nullToUndefined = ({ value }) => value === null ? undefined : value;
exports.nullToUndefined = nullToUndefined;
const MATCH_VIEW_STRIP_PATTERN = '[^\\p{L}\\p{N}]|[\\u115F\\u1160\\u3164\\u02D0\\u02D1\\u0640]';
const MATCH_VIEW_STRIP = new RegExp(MATCH_VIEW_STRIP_PATTERN, 'gu');
const normalizeNameInput = ({ value }) => {
    if (value === null)
        return undefined;
    if (typeof value !== 'string')
        return value;
    const visibleOnly = value.normalize('NFKC').replace(MATCH_VIEW_STRIP, '');
    return visibleOnly.length === 0 ? '' : value.trim();
};
class CreateProductDto {
}
exports.CreateProductDto = CreateProductDto;
__decorate([
    (0, class_transformer_1.Transform)(normalizeNameInput),
    (0, swagger_1.ApiProperty)({ description: '产品名称', example: '高端智能手机' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '产品名称不能为空' }),
    (0, class_validator_1.MaxLength)(200, { message: '产品名称不能超过 200 字符' }),
    (0, class_validator_1.Matches)(/^[^\n\r\u2028\u2029]*$/, { message: '名称不能包含换行' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "name", void 0);
__decorate([
    (0, class_transformer_1.Transform)(exports.nullToUndefined),
    (0, swagger_1.ApiProperty)({ description: '产品描述', example: '最新款高端智能手机' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000, { message: '产品描述不能超过 2000 字符' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '产品价格', example: 2999.99 }),
    (0, class_transformer_1.Transform)(exports.nullToUndefined),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01, { message: '产品价格必须大于 0' }),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '原价（null=清除划线价）', required: false, example: 3499.99 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01, { message: '原价必须大于 0' }),
    (0, class_validator_1.Validate)(OriginalPriceNotBelowPriceConstraint),
    __metadata("design:type", Object)
], CreateProductDto.prototype, "originalPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '库存数量', example: 100 }),
    (0, class_transformer_1.Transform)(exports.nullToUndefined),
    (0, class_validator_1.IsInt)({ message: '库存数量必须是整数' }),
    (0, class_validator_1.Min)(0, { message: '库存数量不能为负数' }),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "stock", void 0);
__decorate([
    (0, class_transformer_1.Transform)(exports.nullToUndefined),
    (0, swagger_1.ApiProperty)({ description: '产品分类ID', required: false, example: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '主图URL', required: false, example: '/images/products/p1.jpg' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "mainImage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '产品标签', type: [String], required: false, example: ['新品', '热销'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MaxLength)(50, { each: true, message: '每个标签不能超过 50 字符' }),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "tags", void 0);
__decorate([
    (0, class_transformer_1.Transform)(exports.nullToUndefined),
    (0, swagger_1.ApiProperty)({ description: '产品图片URL数组', type: [String], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "images", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '产品规格', type: Object, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: '产品规格必须是对象' }),
    __metadata("design:type", Object)
], CreateProductDto.prototype, "specifications", void 0);
__decorate([
    (0, class_transformer_1.Transform)(exports.nullToUndefined),
    (0, swagger_1.ApiProperty)({ description: '是否上架', default: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "isActive", void 0);
