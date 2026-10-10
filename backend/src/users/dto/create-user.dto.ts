// 用途：创建用户数据传输对象
// 依赖文件：user.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:37:00

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';

import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../../common/policies/password.policy';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ description: '用户邮箱', example: 'user@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({
    description: '密码（12-64 位，无组合规则要求）',
    example: 'MyPassw0rd!2026',
    minLength: 12,
    maxLength: 64,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: `密码长度不能少于${PASSWORD_MIN_LENGTH}位` })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: `密码长度不能超过${PASSWORD_MAX_LENGTH}位` })
  password: string;

  @ApiProperty({ description: '用户名', example: 'john_doe' })
  @IsString()
  @MinLength(3, { message: '用户名长度不能少于3位' })
  username: string;

  @ApiProperty({ description: '用户角色', enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ description: '头像URL', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ description: 'Casdoor用户ID', required: false })
  @IsOptional()
  @IsString()
  casdoorId?: string;

  @ApiProperty({ description: '手机号码', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
