/**
 * 创建用户DTO，用于API请求验证
 * 基于PrestaShop用户管理模式
 */

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
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthday?: string;
  phone?: string;
  address?: UserAddressDto;
  preferences?: UserPreferencesDto;
}

export class UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  phone?: string;
  address?: UserAddressDto;
  preferences?: UserPreferencesDto;
}
