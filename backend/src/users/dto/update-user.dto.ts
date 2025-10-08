// 用途：更新用户数据传输对象
// 依赖文件：user.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:38:00

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  IsEmail,
  IsEnum,
  IsUrl,
  Matches,
  IsObject,
  MaxLength,
} from 'class-validator';

// 定义密码复杂度要求
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// 定义角色枚举
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export class UpdateUserDto {
  @ApiProperty({ description: '用户名', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: '用户名长度不能少于3位' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username?: string;

  @ApiProperty({ description: '密码', required: false, minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: '密码长度不能少于8位' })
  @Matches(PASSWORD_REGEX, {
    message: '密码必须包含大小写字母、数字和特殊字符',
  })
  password?: string;

  @ApiProperty({ description: '邮箱地址', required: false })
  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string;

  @ApiProperty({ description: '头像URL', required: false })
  @IsOptional()
  @IsUrl({}, { message: '请输入有效的URL地址' })
  @Matches(/\.(jpg|jpeg|png|gif|webp|svg)$/i, {
    message: '头像必须是jpg、jpeg、png、gif、webp或svg格式',
  })
  avatar?: string;

  @ApiProperty({ description: '手机号码', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' })
  phone?: string;

  @ApiProperty({ description: '用户角色', required: false, enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: '无效的用户角色' })
  role?: UserRole;

  @ApiProperty({ description: '用户状态', required: false })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'], {
    message: '用户状态必须是active、inactive或suspended',
  })
  status?: 'active' | 'inactive' | 'suspended';

  @ApiProperty({ description: '是否激活', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: '用户描述', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '用户描述不能超过500个字符' })
  description?: string;

  @ApiProperty({ description: 'Casdoor用户ID', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Casdoor用户ID只能包含字母、数字、下划线和连字符',
  })
  casdoorId?: string;

  @ApiProperty({ description: '最后登录IP', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{1,3}\.){3}\d{1,3}$|^::1$|^[0-9a-fA-F:]+$/, {
    message: '请输入有效的IP地址',
  })
  lastLoginIp?: string;

  @ApiProperty({ description: '最后登录时间', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, {
    message: '请输入有效的ISO时间格式',
  })
  lastLoginAt?: string;

  @ApiProperty({ description: '用户偏好设置', required: false })
  @IsOptional()
  @IsObject()
  preferences?: {
    language?: string;
    theme?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
  };
}

// 密码更新专用DTO，用于密码重置和修改密码
export class UpdatePasswordDto {
  @ApiProperty({ description: '当前密码', required: true })
  @IsString()
  @MinLength(8, { message: '当前密码长度不能少于8位' })
  currentPassword: string;

  @ApiProperty({ description: '新密码', required: true, minLength: 8 })
  @IsString()
  @MinLength(8, { message: '新密码长度不能少于8位' })
  @Matches(PASSWORD_REGEX, {
    message: '新密码必须包含大小写字母、数字和特殊字符',
  })
  newPassword: string;

  @ApiProperty({ description: '确认新密码', required: true })
  @IsString()
  @MinLength(8, { message: '确认密码长度不能少于8位' })
  confirmPassword: string;
}

// 用户注册DTO
export class RegisterUserDto {
  @ApiProperty({ description: '用户名', required: true })
  @IsString()
  @MinLength(3, { message: '用户名长度不能少于3位' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string;

  @ApiProperty({ description: '密码', required: true, minLength: 8 })
  @IsString()
  @MinLength(8, { message: '密码长度不能少于8位' })
  @Matches(PASSWORD_REGEX, {
    message: '密码必须包含大小写字母、数字和特殊字符',
  })
  password: string;

  @ApiProperty({ description: '邮箱地址', required: true })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({ description: '手机号码', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' })
  phone?: string;

  @ApiProperty({ description: '用户角色', required: false, enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole, { message: '无效的用户角色' })
  role?: UserRole = UserRole.USER;
}

// 用户登录DTO
export class LoginUserDto {
  @ApiProperty({ description: '用户名或邮箱', required: true })
  @IsString()
  identifier: string;

  @ApiProperty({ description: '密码', required: true })
  @IsString()
  password: string;

  @ApiProperty({ description: '记住我', required: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

// 用户响应DTO，用于API响应，排除敏感信息
export class UserUpdateResponseDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '邮箱地址' })
  email: string;

  @ApiProperty({ description: '手机号码' })
  phone?: string;

  @ApiProperty({ description: '用户角色' })
  role: UserRole;

  @ApiProperty({ description: '用户状态' })
  status: 'active' | 'inactive' | 'suspended';

  @ApiProperty({ description: '是否激活' })
  isActive: boolean;

  @ApiProperty({ description: '头像URL' })
  avatar?: string;

  @ApiProperty({ description: '用户描述' })
  description?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt: string;

  @ApiProperty({ description: '最后登录时间' })
  lastLoginAt?: string;

  @ApiProperty({ description: '最后登录IP' })
  lastLoginIp?: string;

  @ApiProperty({ description: '用户偏好设置' })
  preferences?: {
    language?: string;
    theme?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
  };
}
