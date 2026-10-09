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
exports.UserUpdateResponseDto = exports.LoginUserDto = exports.RegisterUserDto = exports.UpdatePasswordDto = exports.UpdateUserDto = exports.UserRole = exports.PASSWORD_REGEX = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
exports.PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["ADMIN"] = "admin";
    UserRole["MODERATOR"] = "moderator";
})(UserRole || (exports.UserRole = UserRole = {}));
class UpdateUserDto {
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户名', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3, { message: '用户名长度不能少于3位' }),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '密码', required: false, minLength: 8 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: '密码长度不能少于8位' }),
    (0, class_validator_1.Matches)(exports.PASSWORD_REGEX, {
        message: '密码必须包含大小写字母、数字和特殊字符',
    }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '邮箱地址', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: '请输入有效的邮箱地址' }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '头像URL', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({}, { message: '请输入有效的URL地址' }),
    (0, class_validator_1.Matches)(/\.(jpg|jpeg|png|gif|webp|svg)$/i, {
        message: '头像必须是jpg、jpeg、png、gif、webp或svg格式',
    }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "avatar", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '手机号码', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户角色', required: false, enum: UserRole }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(UserRole, { message: '无效的用户角色' }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户状态', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['active', 'inactive', 'suspended'], {
        message: '用户状态必须是active、inactive或suspended',
    }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '是否激活', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateUserDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户描述', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: '用户描述不能超过500个字符' }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Casdoor用户ID', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_-]+$/, {
        message: 'Casdoor用户ID只能包含字母、数字、下划线和连字符',
    }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "casdoorId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '最后登录IP', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(\d{1,3}\.){3}\d{1,3}$|^::1$|^[0-9a-fA-F:]+$/, {
        message: '请输入有效的IP地址',
    }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "lastLoginIp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '最后登录时间', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, {
        message: '请输入有效的ISO时间格式',
    }),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "lastLoginAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户偏好设置', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "preferences", void 0);
class UpdatePasswordDto {
}
exports.UpdatePasswordDto = UpdatePasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '当前密码', required: true }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: '当前密码长度不能少于8位' }),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '新密码', required: true, minLength: 8 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: '新密码长度不能少于8位' }),
    (0, class_validator_1.Matches)(exports.PASSWORD_REGEX, {
        message: '新密码必须包含大小写字母、数字和特殊字符',
    }),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "newPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '确认新密码', required: true }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: '确认密码长度不能少于8位' }),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "confirmPassword", void 0);
class RegisterUserDto {
    constructor() {
        this.role = UserRole.USER;
    }
}
exports.RegisterUserDto = RegisterUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户名', required: true }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3, { message: '用户名长度不能少于3位' }),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' }),
    __metadata("design:type", String)
], RegisterUserDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '密码', required: true, minLength: 8 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: '密码长度不能少于8位' }),
    (0, class_validator_1.Matches)(exports.PASSWORD_REGEX, {
        message: '密码必须包含大小写字母、数字和特殊字符',
    }),
    __metadata("design:type", String)
], RegisterUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '邮箱地址', required: true }),
    (0, class_validator_1.IsEmail)({}, { message: '请输入有效的邮箱地址' }),
    __metadata("design:type", String)
], RegisterUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '手机号码', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' }),
    __metadata("design:type", String)
], RegisterUserDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户角色', required: false, enum: UserRole, default: UserRole.USER }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(UserRole, { message: '无效的用户角色' }),
    __metadata("design:type", String)
], RegisterUserDto.prototype, "role", void 0);
class LoginUserDto {
}
exports.LoginUserDto = LoginUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户名或邮箱', required: true }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginUserDto.prototype, "identifier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '密码', required: true }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '记住我', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LoginUserDto.prototype, "rememberMe", void 0);
class UserUpdateResponseDto {
}
exports.UserUpdateResponseDto = UserUpdateResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户ID' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户名' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '邮箱地址' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '手机号码' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户角色' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户状态' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '是否激活' }),
    __metadata("design:type", Boolean)
], UserUpdateResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '头像URL' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "avatar", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户描述' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '创建时间' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '更新时间' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '最后登录时间' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "lastLoginAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '最后登录IP' }),
    __metadata("design:type", String)
], UserUpdateResponseDto.prototype, "lastLoginIp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '用户偏好设置' }),
    __metadata("design:type", Object)
], UserUpdateResponseDto.prototype, "preferences", void 0);
