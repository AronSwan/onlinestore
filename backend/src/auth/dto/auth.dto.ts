import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: '用户邮箱',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({
    description: '用户密码',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码长度至少8位' })
  password: string;

  @ApiProperty({
    description: '验证码令牌（多次失败后需要）',
    required: false,
  })
  @IsOptional()
  @IsString()
  captcha_token?: string;
}

export class RegisterDto {
  @ApiProperty({
    description: '用户邮箱',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({
    description: '用户密码',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码长度至少8位' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).*/, {
    message: '密码必须包含大小写字母、数字和特殊字符',
  })
  password: string;

  @ApiProperty({
    description: '用户名',
    example: 'testuser',
    minLength: 3,
    maxLength: 20,
  })
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(3, { message: '用户名长度至少3位' })
  @MaxLength(20, { message: '用户名长度最多20位' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string;

  @ApiProperty({
    description: '验证码令牌（多次失败后需要）',
    required: false,
  })
  @IsOptional()
  @IsString()
  captcha_token?: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: '当前密码',
    example: 'OldPassword123!',
  })
  @IsString({ message: '当前密码必须是字符串' })
  @MinLength(1, { message: '请输入当前密码' })
  oldPassword: string;

  @ApiProperty({
    description: '新密码',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsString({ message: '新密码必须是字符串' })
  @MinLength(8, { message: '新密码长度至少8位' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).*/, {
    message: '新密码必须包含大小写字母、数字和特殊字符',
  })
  newPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: '刷新令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: '刷新令牌必须是字符串' })
  @MinLength(1, { message: '请提供刷新令牌' })
  refresh_token: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: '访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: '刷新令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  @ApiProperty({
    description: '令牌过期时间（秒）',
    example: 900,
  })
  expires_in: number;

  @ApiProperty({
    description: '用户信息',
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'number' },
      email: { type: 'string' },
      username: { type: 'string' },
      role: { type: 'string' },
    },
  })
  user: {
    id: number;
    email: string;
    username: string;
    role: string;
  };
}

export class ProfileResponseDto {
  @ApiProperty({
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
  })
  user: {
    id: number;
    sub: number;
    email: string;
    username: string;
    role: string;
  };
}

export class MessageResponseDto {
  @ApiProperty({
    description: '响应消息',
    example: '操作成功',
  })
  message: string;
}
