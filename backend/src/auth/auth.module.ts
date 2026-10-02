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
import { SECURITY_CONSTANTS } from '../common/security/security.constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([User]),
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // 注意：主配置经由 load: [createMasterConfiguration] 注册在 'master' 命名空间下，
        // 必须用 master.jwt.* 读取；'jwt.*' 路径永远为 undefined 会导致 HS256 密钥为空。
        // 默认算法与 JWT_ALGORITHM 的 Joi 默认值（HS256）及 jwt.strategy 保持一致。
        const algorithm = configService.get('master.jwt.algorithm', 'HS256');

        if (algorithm === 'RS256') {
          return {
            privateKey: configService.get('master.jwt.privateKey'),
            publicKey: configService.get('master.jwt.publicKey'),
            signOptions: {
              expiresIn: configService.get('master.jwt.expiresIn', '15m'),
              algorithm: 'RS256',
              issuer: SECURITY_CONSTANTS.JWT.ISSUER,
              audience: SECURITY_CONSTANTS.JWT.AUDIENCE,
            },
            verifyOptions: {
              algorithms: ['RS256'],
              issuer: SECURITY_CONSTANTS.JWT.ISSUER,
              audience: SECURITY_CONSTANTS.JWT.AUDIENCE,
            },
          };
        } else {
          // 向后兼容HS256
          // Blocker 2 配套修复（2026-10-02）：jwt.strategy 校验端强制 issuer/audience
          // （SECURITY_CONSTANTS.JWT.ISSUER/AUDIENCE），但 HS256 签发端不带这两个
          // 声明 → jsonwebtoken 抛 JsonWebTokenError('jwt issuer invalid')，合法令牌
          // 全部 401。签发端补齐 issuer/audience，与 RS256 分支及校验端契约一致。
          return {
            secret: configService.get('master.jwt.secret'),
            signOptions: {
              expiresIn: configService.get('master.jwt.expiresIn', '15m'),
              algorithm: 'HS256',
              issuer: SECURITY_CONSTANTS.JWT.ISSUER,
              audience: SECURITY_CONSTANTS.JWT.AUDIENCE,
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
