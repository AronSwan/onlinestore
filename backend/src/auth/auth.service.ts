// 用途：认证服务，处理用户登录、注册、令牌管理等
// 依赖文件：users.service.ts, unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 12:30:00

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { createMasterConfiguration } from '../config/unified-master.config';
import { RedisHealthService } from '../redis/redis-health.service';

// Create configuration instance
const configuration = createMasterConfiguration();
import type Redis from 'ioredis';
import { CaptchaService } from './captcha.service';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: number;
    email: string;
    username: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  private readonly config;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisHealth: RedisHealthService,
    private readonly captchaService: CaptchaService,
  ) {
    this.config = createMasterConfiguration();
  }

  /**
   * 用户注册
   */
  async register(registerData: {
    email: string;
    password: string;
    username: string;
    captcha_token?: string;
  }): Promise<LoginResponse> {
    const redis = this.redisHealth.getClient?.() as Redis | undefined;
    const regFailKey = `auth:reg:fail:${registerData.email}`;
    const threshold = 5; // 默认值，因为新配置系统中没有captcha配置
    const windowSec = 600; // 10分钟窗口

    if (redis) {
      try {
        const fails = parseInt((await redis.get(regFailKey)) || '0', 10);
        if (fails >= threshold) {
          if (!registerData.captcha_token) {
            throw new BadRequestException('需要验证码');
          }
          const ok = await this.captchaService.verify(registerData.captcha_token);
          if (!ok) {
            throw new BadRequestException('验证码校验失败');
          }
        }
      } catch (error) {
        // 如果是验证码校验失败，直接抛出异常
        if (error instanceof BadRequestException) {
          throw error;
        }
        // Redis连接错误时，继续执行注册流程
        console.error('Redis connection error during registration:', error);
      }
    }
    // 检查用户是否已存在
    const existingUser = await this.usersService.findByEmail(registerData.email);
    if (existingUser) {
      if (redis) {
        try {
          await redis.multi().incr(regFailKey).expire(regFailKey, windowSec).exec();
        } catch (error) {
          // Redis连接错误时，继续执行流程
          console.error('Redis connection error during registration:', error);
        }
      }
      throw new ConflictException('用户已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(registerData.password, 12);

    // 创建用户
    const user = await this.usersService.create({
      ...registerData,
      password: hashedPassword,
      role: UserRole.USER,
    });

    // 生成令牌
    if (redis) {
      try {
        await redis.del(regFailKey);
      } catch (error) {
        // Redis连接错误时，继续执行流程
        console.error('Redis connection error during registration:', error);
      }
    }
    return this.generateTokens(user);
  }

  /**
   * 用户登录
   */
  async login(loginData: {
    email: string;
    password: string;
    captcha_token?: string;
  }): Promise<LoginResponse> {
    const redis = this.redisHealth.getClient?.() as Redis | undefined;
    const loginFailKey = `auth:login:fail:${loginData.email}`;
    const windowSec = 600; // 10分钟窗口
    const threshold = 5; // 默认值，因为新配置系统中没有captcha配置

    // 查找用户
    const user = await this.usersService.findByEmail(loginData.email);
    if (!user) {
      if (redis) {
        await redis.multi().incr(loginFailKey).expire(loginFailKey, windowSec).exec();
      }
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    if (redis) {
      const fails = parseInt((await redis.get(loginFailKey)) || '0', 10);
      if (fails >= threshold) {
        if (!loginData.captcha_token) {
          throw new BadRequestException('需要验证码');
        }
        const ok = await this.captchaService.verify(loginData.captcha_token);
        if (!ok) {
          throw new BadRequestException('验证码校验失败');
        }
      }
    }

    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    if (!isPasswordValid) {
      if (redis) {
        await redis.multi().incr(loginFailKey).expire(loginFailKey, windowSec).exec();
      }
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成令牌
    if (redis) {
      await redis.del(loginFailKey);
    }
    return this.generateTokens(user);
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.jwt.secret,
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('刷新令牌无效');
    }
  }

  /**
   * 生成访问令牌和刷新令牌
   */
  private async generateTokens(user: User): Promise<LoginResponse> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.config.jwt.refreshExpiresIn,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15分钟
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * 验证JWT令牌
   */
  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('令牌无效');
    }
  }

  /**
   * 修改密码
   */
  async changePassword(changePasswordData: {
    userId: number;
    oldPassword: string;
    newPassword: string;
  }): Promise<void> {
    const user = await this.usersService.findById(changePasswordData.userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const isOldPasswordValid = await bcrypt.compare(changePasswordData.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('原密码错误');
    }

    const hashedNewPassword = await bcrypt.hash(changePasswordData.newPassword, 12);
    await this.userRepository.update(changePasswordData.userId, { password: hashedNewPassword });
  }
}
