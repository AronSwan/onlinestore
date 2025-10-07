/**
 * 用户响应DTO，基于PrestaShop API响应格式
 * 定义用户数据的API输出格式
 */

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthday?: string;
  age?: number;
  phone?: string;
  address?: UserAddressDto;
  preferences: UserPreferencesDto;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;

  constructor(data: Partial<UserResponseDto>) {
    Object.assign(this, data);
  }

  static fromDomain(user: any): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      email: user.email.value,
      firstName: user.firstName.value,
      lastName: user.lastName.value,
      fullName: user.getFullName(),
      birthday: user.birthday.value !== '0000-00-00' ? user.birthday.value : undefined,
      age: user.getAge(),
      phone: user.phone,
      address: user.address ? new UserAddressDto(user.address) : undefined,
      preferences: new UserPreferencesDto(user.preferences),
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    });
  }
}

export class UserAddressDto {
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;

  constructor(data: Partial<UserAddressDto>) {
    Object.assign(this, data);
  }
}

export class UserPreferencesDto {
  newsletterSubscription: boolean;
  marketingEmails: boolean;
  preferredLanguage: string;
  timezone: string;

  constructor(data: Partial<UserPreferencesDto>) {
    Object.assign(this, data);
  }
}

export class UserListResponseDto {
  users: UserResponseDto[];
  pagination: PaginationDto;
  filters?: any;
  sort?: any;

  constructor(data: Partial<UserListResponseDto>) {
    Object.assign(this, data);
  }
}

export class PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;

  constructor(data: Partial<PaginationDto>) {
    Object.assign(this, data);
  }
}
