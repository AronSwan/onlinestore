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
exports.MessageResponseDto = exports.ProfileResponseDto = exports.LoginResponseDto = exports.RefreshTokenDto = exports.ChangePasswordDto = exports.RegisterDto = exports.LoginDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class LoginDto {
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '用户邮箱',
        example: 'user@example.com',
    }),
    (0, class_validator_1.IsEmail)({}, { message: '请输入有效的邮箱地址' }),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '用户密码',
        example: 'Password123!',
        minLength: 8,
    }),
    (0, class_validator_1.IsString)({ message: '密码必须是字符串' }),
    (0, class_validator_1.MinLength)(8, { message: '密码长度至少8位' }),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '验证码令牌（多次失败后需要）',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "captcha_token", void 0);
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '用户邮箱',
        example: 'user@example.com',
    }),
    (0, class_validator_1.IsEmail)({}, { message: '请输入有效的邮箱地址' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '用户密码',
        example: 'Password123!',
        minLength: 8,
    }),
    (0, class_validator_1.IsString)({ message: '密码必须是字符串' }),
    (0, class_validator_1.MinLength)(8, { message: '密码长度至少8位' }),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).*/, {
        message: '密码必须包含大小写字母、数字和特殊字符',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '用户名',
        example: 'testuser',
        minLength: 3,
        maxLength: 20,
    }),
    (0, class_validator_1.IsString)({ message: '用户名必须是字符串' }),
    (0, class_validator_1.MinLength)(3, { message: '用户名长度至少3位' }),
    (0, class_validator_1.MaxLength)(20, { message: '用户名长度最多20位' }),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '验证码令牌（多次失败后需要）',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "captcha_token", void 0);
class ChangePasswordDto {
}
exports.ChangePasswordDto = ChangePasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '当前密码',
        example: 'OldPassword123!',
    }),
    (0, class_validator_1.IsString)({ message: '当前密码必须是字符串' }),
    (0, class_validator_1.MinLength)(1, { message: '请输入当前密码' }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "oldPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '新密码',
        example: 'NewPassword123!',
        minLength: 8,
    }),
    (0, class_validator_1.IsString)({ message: '新密码必须是字符串' }),
    (0, class_validator_1.MinLength)(8, { message: '新密码长度至少8位' }),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).*/, {
        message: '新密码必须包含大小写字母、数字和特殊字符',
    }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
class RefreshTokenDto {
}
exports.RefreshTokenDto = RefreshTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '刷新令牌',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    (0, class_validator_1.IsString)({ message: '刷新令牌必须是字符串' }),
    (0, class_validator_1.MinLength)(1, { message: '请提供刷新令牌' }),
    __metadata("design:type", String)
], RefreshTokenDto.prototype, "refresh_token", void 0);
class LoginResponseDto {
}
exports.LoginResponseDto = LoginResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '访问令牌',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    __metadata("design:type", String)
], LoginResponseDto.prototype, "access_token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '刷新令牌',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    __metadata("design:type", String)
], LoginResponseDto.prototype, "refresh_token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '令牌过期时间（秒）',
        example: 900,
    }),
    __metadata("design:type", Number)
], LoginResponseDto.prototype, "expires_in", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '用户信息',
        type: 'object',
        additionalProperties: false,
        properties: {
            id: { type: 'number' },
            email: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string' },
        },
    }),
    __metadata("design:type", Object)
], LoginResponseDto.prototype, "user", void 0);
class ProfileResponseDto {
}
exports.ProfileResponseDto = ProfileResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '用户信息',
        type: 'object',
        additionalProperties: false,
        properties: {
            id: { type: 'number' },
            sub: { type: 'number' },
            email: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string' },
        },
    }),
    __metadata("design:type", Object)
], ProfileResponseDto.prototype, "user", void 0);
class MessageResponseDto {
}
exports.MessageResponseDto = MessageResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '响应消息',
        example: '操作成功',
    }),
    __metadata("design:type", String)
], MessageResponseDto.prototype, "message", void 0);
