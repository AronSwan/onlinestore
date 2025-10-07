// 用途：用户认证和授权模块，支持JWT、OAuth2和Casdoor外部认证
// 依赖文件：unified-master.config.ts, users.module.ts, auth-proxy.service.ts
// 作者：后端开发团队
// 时间：2025-06-17 12:20:00

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthProxyService } from './auth-proxy.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { createMasterConfiguration } from '../config/unified-master.config';
import { User } from '../users/entities/user.entity';
import { CaptchaService } from './captcha.service';
import { VerifyCodeModule } from './verify-code/verify-code.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([User]),
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const algorithm = configService.get('jwt.algorithm', 'RS256');

        if (algorithm === 'RS256') {
          return {
            privateKey: configService.get('jwt.privateKey'),
            publicKey: configService.get('jwt.publicKey'),
            signOptions: {
              expiresIn: configService.get('jwt.expiresIn', '15m'),
              algorithm: 'RS256',
              issuer: 'caddy-shopping-api',
              audience: 'caddy-shopping-client',
            },
            verifyOptions: {
              algorithms: ['RS256'],
              issuer: 'caddy-shopping-api',
              audience: 'caddy-shopping-client',
            },
          };
        } else {
          // 向后兼容HS256
          return {
            secret: configService.get('jwt.secret'),
            signOptions: {
              expiresIn: configService.get('jwt.expiresIn', '15m'),
              algorithm: 'HS256',
            },
          };
        }
      },
      inject: [ConfigService],
    }),
    HttpModule,
    VerifyCodeModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, AuthProxyService, CaptchaService],
  exports: [AuthService, AuthProxyService],
})
export class AuthModule {}
