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
exports.ProblemDetailsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class ProblemDetailsDto {
}
exports.ProblemDetailsDto = ProblemDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '问题类型 URI（错误码枚举挂账缓建，暂 about:blank）', example: 'about:blank' }),
    __metadata("design:type", String)
], ProblemDetailsDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'HTTP reason phrase', example: 'Bad Request' }),
    __metadata("design:type", String)
], ProblemDetailsDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'HTTP 状态码', example: 400 }),
    __metadata("design:type", Number)
], ProblemDetailsDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '中文错误说明（校验数组 join）', example: '邮箱格式不正确' }),
    __metadata("design:type", String)
], ProblemDetailsDto.prototype, "detail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '请求路径', example: '/api/auth/login' }),
    __metadata("design:type", String)
], ProblemDetailsDto.prototype, "instance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'detail 别名（前端兼容，移除挂 /v1 触发器）', example: '邮箱格式不正确', required: false }),
    __metadata("design:type", String)
], ProblemDetailsDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '校验错误明细（class-validator 数组原样）', type: [String], required: false }),
    __metadata("design:type", Array)
], ProblemDetailsDto.prototype, "errors", void 0);
