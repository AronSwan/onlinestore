/**
 * 更新用户DTO(本人资料自服务)
 * 系统清账(2026-10-03): 原无任何装饰器(砖); 刻意不含 role/password——
 * 角色变更为管理操作(挂账), 改密走 /api/auth/change-password
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

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

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
