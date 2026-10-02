/**
 * 创建用户DTO，用于API请求验证
 * 系统清账(2026-10-03): 原无任何装饰器, 全局 forbidNonWhitelisted 使端点恒 400(砖)——
 * 现补齐校验; role 不在 DTO(admin 建号后如需改角色走后续管理端点, 挂账)
 */

import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsDateString,
  IsObject,
} from 'class-validator';

export interface UserAddressDto {
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface UserPreferencesDto {
  newsletterSubscription?: boolean;
  marketingEmails?: boolean;
  preferredLanguage?: string;
  timezone?: string;
}

export class CreateUserDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名仅允许字母、数字、下划线' })
  username: string;

  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: '密码须至少8位且含大小写字母、数字与特殊字符',
  })
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @Matches(/^[+\d\s()-]{5,20}$/)
  phone?: string;

  @IsOptional()
  @IsObject()
  address?: UserAddressDto;

  @IsOptional()
  @IsObject()
  preferences?: UserPreferencesDto;
}
