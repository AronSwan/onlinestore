// 用途：认证控制器，处理认证相关的HTTP请求和Casdoor外部认证
// 依赖文件：auth.service.ts, auth-proxy.service.ts
// 作者：后端开发团队
// 时间：2025-09-26 20:00:00

import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Redirect,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  ApiDocs,
  ApiCreateResource,
  ApiGetResource,
} from '../common/decorators/api-docs.decorator';
import { AuthGuard } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthProxyService } from './auth-proxy.service';
import { LoginResponse } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  RefreshTokenDto,
  LoginResponseDto,
  ProfileResponseDto,
  MessageResponseDto,
} from './dto/auth.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authProxyService: AuthProxyService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 1500, ttl: 60 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateResource(Object, Object, '用户注册')
  async register(@Body(ValidationPipe) registerData: RegisterDto): Promise<LoginResponseDto> {
    return this.authService.register(registerData);
  }

  @Post('login')
  @Throttle({ default: { limit: 1500, ttl: 60 } })
  @HttpCode(HttpStatus.OK)
  @ApiCreateResource(Object, Object, '用户登录')
  async login(@Body(ValidationPipe) loginData: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginData);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCreateResource(Object, Object, '刷新令牌')
  async refreshToken(
    @Body(ValidationPipe) refreshData: RefreshTokenDto,
  ): Promise<LoginResponseDto> {
    return this.authService.refreshToken(refreshData.refresh_token);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户信息' })
  @ApiResponse({ status: 200, description: '成功获取用户信息', type: ProfileResponseDto })
  async getProfile(@Request() req: any): Promise<ProfileResponseDto> {
    return {
      user: req.user,
    };
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiCreateResource(Object, Object, '修改密码')
  async changePassword(
    @Request() req: any,
    @Body(ValidationPipe) changePasswordData: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    await this.authService.changePassword({
      userId: req.user.sub,
      oldPassword: changePasswordData.oldPassword,
      newPassword: changePasswordData.newPassword,
    });
    return { message: '密码修改成功' };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiCreateResource(Object, Object, '用户登出')
  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({ status: 201, description: '登出成功', type: MessageResponseDto })
  async logout(@Request() req: any): Promise<MessageResponseDto> {
    // 在实际应用中，这里可以添加令牌黑名单逻辑
    return { message: '登出成功' };
  }

  // Casdoor认证相关端点
  @Get('casdoor/login')
  @Redirect()
  @ApiGetResource(Object, '重定向到Casdoor登录')
  async casdoorLogin() {
    const loginUrl = await this.authProxyService.getCasdoorLoginUrl();
    return { url: loginUrl };
  }

  @Get('casdoor/callback')
  @ApiGetResource(Object, 'Casdoor登录回调')
  async casdoorCallback(@Query('code') code: string, @Query('state') state: string) {
    return this.authProxyService.handleCasdoorCallback(code, state);
  }

  @Get('casdoor/userinfo')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiGetResource(Object, '获取Casdoor用户信息')
  async getCasdoorUserInfo(@Request() req: any) {
    return this.authProxyService.getCasdoorUserInfo(req.user.email);
  }

  @Post('casdoor/logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Redirect()
  @ApiCreateResource(Object, Object, 'Casdoor登出')
  async casdoorLogout() {
    const logoutUrl = await this.authProxyService.getCasdoorLogoutUrl();
    return { url: logoutUrl };
  }
}
