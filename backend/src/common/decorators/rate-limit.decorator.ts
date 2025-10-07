import { SetMetadata, applyDecorators } from '@nestjs/common';
import { RateLimitAlgorithm, RateLimitConfig } from '../rate-limiter/rate-limiter.service';

/**
 * 限流元数据键
 */
export const RATE_LIMIT_KEY = 'rate_limit';
export const RATE_LIMIT_SKIP_KEY = 'rate_limit_skip';

/**
 * 限流装饰器选项
 */
export interface RateLimitDecoratorOptions extends Partial<RateLimitConfig> {
  name?: string; // 限流器名称
  keyPrefix?: string; // 键前缀
  message?: string; // 限流消息
  statusCode?: number; // HTTP状态码
  headers?: Record<string, string>; // 响应头
}

/**
 * 基础限流装饰器
 */
export const RateLimit = (options: RateLimitDecoratorOptions = {}) => {
  const config: RateLimitConfig = {
    algorithm: options.algorithm || RateLimitAlgorithm.SLIDING_WINDOW,
    limit: options.limit || 100,
    window: options.window || 60,
    burst: options.burst,
    refillRate: options.refillRate,
    keyGenerator: options.keyGenerator,
    skipIf: options.skipIf,
    onLimitReached: options.onLimitReached,
  };

  const metadata = {
    config,
    name: options.name,
    keyPrefix: options.keyPrefix,
    message: options.message || 'Too many requests',
    statusCode: options.statusCode || 429,
    headers: options.headers || {},
  };

  return SetMetadata(RATE_LIMIT_KEY, metadata);
};

/**
 * 跳过限流装饰器
 */
export const SkipRateLimit = () => SetMetadata(RATE_LIMIT_SKIP_KEY, true);

/**
 * API限流装饰器
 * 适用于一般API接口
 */
export const ApiRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    limit: 100,
    window: 60,
    name: 'api',
    keyPrefix: 'api',
    message: 'API rate limit exceeded',
    ...options,
  });
};

/**
 * 用户限流装饰器
 * 基于用户ID的限流
 */
export const UserRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
    limit: 1000,
    window: 3600,
    burst: 50,
    refillRate: 10,
    name: 'user',
    keyPrefix: 'user',
    message: 'User rate limit exceeded',
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const userId = request.user?.id || request.ip;
      return `user:${userId}`;
    },
    ...options,
  });
};

/**
 * IP限流装饰器
 * 基于IP地址的限流
 */
export const IpRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.FIXED_WINDOW,
    limit: 500,
    window: 300,
    name: 'ip',
    keyPrefix: 'ip',
    message: 'IP rate limit exceeded',
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const ip = request.ip || request.connection.remoteAddress;
      return `ip:${ip}`;
    },
    ...options,
  });
};

/**
 * 登录限流装饰器
 * 用于登录接口的严格限流
 */
export const LoginRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.LEAKY_BUCKET,
    limit: 5,
    window: 900, // 15分钟
    name: 'login',
    keyPrefix: 'login',
    message: 'Too many login attempts',
    statusCode: 423, // Locked
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const ip = request.ip || request.connection.remoteAddress;
      const username = request.body?.username || request.body?.email;
      return username ? `login:${username}:${ip}` : `login:${ip}`;
    },
    ...options,
  });
};

/**
 * 注册限流装饰器
 * 用于注册接口的限流
 */
export const RegisterRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.FIXED_WINDOW,
    limit: 3,
    window: 3600, // 1小时
    name: 'register',
    keyPrefix: 'register',
    message: 'Too many registration attempts',
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const ip = request.ip || request.connection.remoteAddress;
      return `register:${ip}`;
    },
    ...options,
  });
};

/**
 * 密码重置限流装饰器
 */
export const PasswordResetRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    limit: 3,
    window: 1800, // 30分钟
    name: 'password_reset',
    keyPrefix: 'pwd_reset',
    message: 'Too many password reset attempts',
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const email = request.body?.email;
      const ip = request.ip || request.connection.remoteAddress;
      return email ? `pwd_reset:${email}` : `pwd_reset:${ip}`;
    },
    ...options,
  });
};

/**
 * 搜索限流装饰器
 * 用于搜索接口的限流
 */
export const SearchRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
    limit: 100,
    window: 60,
    burst: 20,
    refillRate: 5,
    name: 'search',
    keyPrefix: 'search',
    message: 'Search rate limit exceeded',
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const userId = request.user?.id || request.ip;
      return `search:${userId}`;
    },
    ...options,
  });
};

/**
 * 上传限流装饰器
 * 用于文件上传接口的限流
 */
export const UploadRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.LEAKY_BUCKET,
    limit: 10,
    window: 3600, // 1小时
    name: 'upload',
    keyPrefix: 'upload',
    message: 'Upload rate limit exceeded',
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const userId = request.user?.id || request.ip;
      return `upload:${userId}`;
    },
    ...options,
  });
};

/**
 * 支付限流装饰器
 * 用于支付接口的严格限流
 */
export const PaymentRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.FIXED_WINDOW,
    limit: 5,
    window: 300, // 5分钟
    name: 'payment',
    keyPrefix: 'payment',
    message: 'Payment rate limit exceeded',
    statusCode: 423, // Locked
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const userId = request.user?.id;
      if (!userId) {
        throw new Error('Payment requires authentication');
      }
      return `payment:${userId}`;
    },
    ...options,
  });
};

/**
 * 短信验证码限流装饰器
 */
export const SmsRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    limit: 5,
    window: 3600, // 1小时
    name: 'sms',
    keyPrefix: 'sms',
    message: 'SMS rate limit exceeded',
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const phone = request.body?.phone;
      const ip = request.ip || request.connection.remoteAddress;
      return phone ? `sms:${phone}` : `sms:${ip}`;
    },
    ...options,
  });
};

/**
 * 邮件验证码限流装饰器
 */
export const EmailRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    limit: 10,
    window: 3600, // 1小时
    name: 'email',
    keyPrefix: 'email',
    message: 'Email rate limit exceeded',
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const email = request.body?.email;
      const ip = request.ip || request.connection.remoteAddress;
      return email ? `email:${email}` : `email:${ip}`;
    },
    ...options,
  });
};

/**
 * 评论限流装饰器
 */
export const CommentRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
    limit: 50,
    window: 3600, // 1小时
    burst: 10,
    refillRate: 2,
    name: 'comment',
    keyPrefix: 'comment',
    message: 'Comment rate limit exceeded',
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const userId = request.user?.id || request.ip;
      return `comment:${userId}`;
    },
    ...options,
  });
};

/**
 * 订单限流装饰器
 */
export const OrderRateLimit = (options: Partial<RateLimitDecoratorOptions> = {}) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.LEAKY_BUCKET,
    limit: 20,
    window: 3600, // 1小时
    name: 'order',
    keyPrefix: 'order',
    message: 'Order rate limit exceeded',
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const userId = request.user?.id;
      if (!userId) {
        throw new Error('Order requires authentication');
      }
      return `order:${userId}`;
    },
    ...options,
  });
};

/**
 * 组合限流装饰器
 * 可以同时应用多个限流策略
 */
export const CombinedRateLimit = (...decorators: any[]) => {
  return applyDecorators(...decorators);
};

/**
 * 条件限流装饰器
 * 根据条件动态应用限流
 */
export const ConditionalRateLimit = (
  condition: (context: any) => boolean,
  options: RateLimitDecoratorOptions,
) => {
  return RateLimit({
    ...options,
    skipIf: context => !condition(context),
  });
};

/**
 * 时间段限流装饰器
 * 在特定时间段内应用限流
 */
export const TimeBasedRateLimit = (
  startHour: number,
  endHour: number,
  options: RateLimitDecoratorOptions,
) => {
  return RateLimit({
    ...options,
    skipIf: context => {
      const hour = new Date().getHours();
      return hour < startHour || hour >= endHour;
    },
  });
};

/**
 * 角色限流装饰器
 * 基于用户角色的不同限流策略
 */
export const RoleBasedRateLimit = (
  roleConfigs: Record<string, Partial<RateLimitDecoratorOptions>>,
) => {
  return RateLimit({
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    limit: 100,
    window: 60,
    keyGenerator: context => {
      const request = context.switchToHttp().getRequest();
      const userRole = request.user?.role || 'guest';
      const userId = request.user?.id || request.ip;
      return `role:${userRole}:${userId}`;
    },
    skipIf: context => {
      const request = context.switchToHttp().getRequest();
      const userRole = request.user?.role || 'guest';
      const config = roleConfigs[userRole];

      if (config && config.skipIf) {
        return config.skipIf(context);
      }

      return false;
    },
  });
};
