import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisCacheService } from '../cache/redis-cache.service';
import { TracingService } from '../tracing/tracing.service';

/**
 * 限流算法类型
 */
export enum RateLimitAlgorithm {
  TOKEN_BUCKET = 'token_bucket',
  SLIDING_WINDOW = 'sliding_window',
  FIXED_WINDOW = 'fixed_window',
  LEAKY_BUCKET = 'leaky_bucket',
}

/**
 * 限流配置
 */
export interface RateLimitConfig {
  algorithm: RateLimitAlgorithm;
  limit: number; // 限制数量
  window: number; // 时间窗口（秒）
  burst?: number; // 突发容量
  refillRate?: number; // 令牌补充速率
  keyGenerator?: (context: any) => string;
  skipIf?: (context: any) => boolean;
  onLimitReached?: (context: any) => void;
}

/**
 * 限流结果
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  algorithm: RateLimitAlgorithm;
  key: string;
}

/**
 * 令牌桶状态
 */
interface TokenBucketState {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

/**
 * 滑动窗口状态
 */
interface SlidingWindowState {
  requests: number[];
  window: number;
  limit: number;
}

/**
 * 固定窗口状态
 */
interface FixedWindowState {
  count: number;
  windowStart: number;
  window: number;
  limit: number;
}

/**
 * 漏桶状态
 */
interface LeakyBucketState {
  volume: number;
  lastLeak: number;
  capacity: number;
  leakRate: number;
}

/**
 * 限流统计
 */
export interface RateLimitStats {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  blockRate: number;
  averageLatency: number;
  peakRps: number;
  algorithms: Record<
    RateLimitAlgorithm,
    {
      requests: number;
      blocked: number;
      rate: number;
    }
  >;
}

/**
 * 限流服务
 * 支持多种限流算法和策略
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly stats: RateLimitStats;
  private readonly defaultConfigs: Map<string, RateLimitConfig> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisCache: RedisCacheService,
    private readonly tracingService: TracingService,
    @Inject('RATE_LIMIT_OPTIONS') private readonly options: any = {},
  ) {
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      blockRate: 0,
      averageLatency: 0,
      peakRps: 0,
      algorithms: {
        [RateLimitAlgorithm.TOKEN_BUCKET]: { requests: 0, blocked: 0, rate: 0 },
        [RateLimitAlgorithm.SLIDING_WINDOW]: { requests: 0, blocked: 0, rate: 0 },
        [RateLimitAlgorithm.FIXED_WINDOW]: { requests: 0, blocked: 0, rate: 0 },
        [RateLimitAlgorithm.LEAKY_BUCKET]: { requests: 0, blocked: 0, rate: 0 },
      },
    };

    this.initializeDefaultConfigs();
  }

  /**
   * 初始化默认配置
   */
  private initializeDefaultConfigs(): void {
    // API限流配置
    this.defaultConfigs.set('api', {
      algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
      limit: this.configService.get('RATE_LIMIT_API_LIMIT', 100),
      window: this.configService.get('RATE_LIMIT_API_WINDOW', 60),
    });

    // 用户限流配置
    this.defaultConfigs.set('user', {
      algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
      limit: this.configService.get('RATE_LIMIT_USER_LIMIT', 1000),
      window: this.configService.get('RATE_LIMIT_USER_WINDOW', 3600),
      burst: this.configService.get('RATE_LIMIT_USER_BURST', 50),
      refillRate: this.configService.get('RATE_LIMIT_USER_REFILL_RATE', 10),
    });

    // IP限流配置
    this.defaultConfigs.set('ip', {
      algorithm: RateLimitAlgorithm.FIXED_WINDOW,
      limit: this.configService.get('RATE_LIMIT_IP_LIMIT', 500),
      window: this.configService.get('RATE_LIMIT_IP_WINDOW', 300),
    });

    // 登录限流配置
    this.defaultConfigs.set('login', {
      algorithm: RateLimitAlgorithm.LEAKY_BUCKET,
      limit: this.configService.get('RATE_LIMIT_LOGIN_LIMIT', 5),
      window: this.configService.get('RATE_LIMIT_LOGIN_WINDOW', 900),
    });
  }

  /**
   * 检查限流
   */
  async checkRateLimit(
    key: string,
    config: RateLimitConfig,
    context?: any,
  ): Promise<RateLimitResult> {
    const traceId = this.tracingService.generateTraceId();
    const start = Date.now();

    try {
      // 检查跳过条件
      if (config.skipIf && config.skipIf(context)) {
        this.logger.debug(`[${traceId}] Rate limit skipped for key: ${key}`);
        return {
          allowed: true,
          remaining: config.limit,
          resetTime: Date.now() + config.window * 1000,
          algorithm: config.algorithm,
          key,
        };
      }

      // 生成缓存键
      const cacheKey = this.generateCacheKey(key, config);

      // 根据算法执行限流检查
      let result: RateLimitResult;
      switch (config.algorithm) {
        case RateLimitAlgorithm.TOKEN_BUCKET:
          result = await this.checkTokenBucket(cacheKey, config, traceId || '');
          break;
        case RateLimitAlgorithm.SLIDING_WINDOW:
          result = await this.checkSlidingWindow(cacheKey, config, traceId || '');
          break;
        case RateLimitAlgorithm.FIXED_WINDOW:
          result = await this.checkFixedWindow(cacheKey, config, traceId || '');
          break;
        case RateLimitAlgorithm.LEAKY_BUCKET:
          result = await this.checkLeakyBucket(cacheKey, config, traceId || '');
          break;
        default:
          throw new Error(`Unsupported rate limit algorithm: ${config.algorithm}`);
      }

      // 更新统计
      this.updateStats(config.algorithm, result.allowed, Date.now() - start);

      // 触发限流回调
      if (!result.allowed && config.onLimitReached) {
        config.onLimitReached(context);
      }

      this.logger.debug(
        `[${traceId}] Rate limit check for ${key}: ${result.allowed ? 'ALLOWED' : 'BLOCKED'}, ` +
          `remaining: ${result.remaining}, algorithm: ${config.algorithm}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Rate limit check failed for key ${key}:`, error.message);

      // 出错时默认允许请求
      return {
        allowed: true,
        remaining: config.limit,
        resetTime: Date.now() + config.window * 1000,
        algorithm: config.algorithm,
        key,
      };
    }
  }

  /**
   * 令牌桶算法
   */
  private async checkTokenBucket(
    key: string,
    config: RateLimitConfig,
    traceId: string,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const capacity = config.burst || config.limit;
    const refillRate = config.refillRate || config.limit / config.window;

    // 获取当前状态
    let state: TokenBucketState | null = await this.redisCache.get(key);

    if (!state) {
      state = {
        tokens: capacity,
        lastRefill: now,
        capacity,
        refillRate,
      };
    }

    // 确保state不为null
    const currentState: TokenBucketState = state;

    // 计算需要补充的令牌数
    const timePassed = (now - currentState.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * refillRate);

    // 补充令牌
    currentState.tokens = Math.min(capacity, currentState.tokens + tokensToAdd);
    currentState.lastRefill = now;

    // 检查是否有可用令牌
    const allowed = currentState.tokens > 0;
    if (allowed) {
      currentState.tokens--;
    }

    // 保存状态
    await this.redisCache.set(key, currentState, { ttl: config.window * 2 });

    const resetTime = now + Math.ceil((capacity - currentState.tokens) / refillRate) * 1000;

    return {
      allowed,
      remaining: currentState.tokens,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((1 - currentState.tokens) / refillRate),
      algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
      key,
    };
  }

  /**
   * 滑动窗口算法
   */
  private async checkSlidingWindow(
    key: string,
    config: RateLimitConfig,
    traceId: string,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = config.window * 1000;
    const windowStart = now - windowMs;

    // 获取当前状态
    let state: SlidingWindowState | null = await this.redisCache.get(key);

    if (!state) {
      state = {
        requests: [],
        window: config.window,
        limit: config.limit,
      };
    }

    // 确保state不为null
    const currentState: SlidingWindowState = state;

    // 清理过期请求
    currentState.requests = currentState.requests.filter(timestamp => timestamp > windowStart);

    // 检查是否超过限制
    const allowed = currentState.requests.length < config.limit;

    if (allowed) {
      currentState.requests.push(now);
    }

    // 保存状态
    await this.redisCache.set(key, currentState, { ttl: config.window * 2 });

    const remaining = Math.max(0, config.limit - currentState.requests.length);
    const oldestRequest = currentState.requests[0];
    const resetTime = oldestRequest ? oldestRequest + windowMs : now + windowMs;

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
      algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
      key,
    };
  }

  /**
   * 固定窗口算法
   */
  private async checkFixedWindow(
    key: string,
    config: RateLimitConfig,
    traceId: string,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = config.window * 1000;
    const currentWindow = Math.floor(now / windowMs) * windowMs;

    // 获取当前状态
    let state: FixedWindowState | null = await this.redisCache.get(key);

    if (!state || state.windowStart !== currentWindow) {
      state = {
        count: 0,
        windowStart: currentWindow,
        window: config.window,
        limit: config.limit,
      };
    }

    // 确保state不为null
    const currentState: FixedWindowState = state;

    // 检查是否超过限制
    const allowed = currentState.count < config.limit;

    if (allowed) {
      currentState.count++;
    }

    // 保存状态
    await this.redisCache.set(key, currentState, { ttl: config.window * 2 });

    const remaining = Math.max(0, config.limit - currentState.count);
    const resetTime = currentWindow + windowMs;

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
      algorithm: RateLimitAlgorithm.FIXED_WINDOW,
      key,
    };
  }

  /**
   * 漏桶算法
   */
  private async checkLeakyBucket(
    key: string,
    config: RateLimitConfig,
    traceId: string,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const capacity = config.limit;
    const leakRate = config.limit / config.window; // 每秒漏出的请求数

    // 获取当前状态
    let state: LeakyBucketState | null = await this.redisCache.get(key);

    if (!state) {
      state = {
        volume: 0,
        lastLeak: now,
        capacity,
        leakRate,
      };
    }

    // 确保state不为null
    const currentState: LeakyBucketState = state;

    // 计算漏出的请求数
    const timePassed = (now - currentState.lastLeak) / 1000;
    const leaked = Math.floor(timePassed * leakRate);

    // 更新桶的容量
    currentState.volume = Math.max(0, currentState.volume - leaked);
    currentState.lastLeak = now;

    // 检查是否可以添加新请求
    const allowed = currentState.volume < capacity;

    if (allowed) {
      currentState.volume++;
    }

    // 保存状态
    await this.redisCache.set(key, currentState, { ttl: config.window * 2 });

    const remaining = Math.max(0, capacity - currentState.volume);
    const resetTime = now + Math.ceil(currentState.volume / leakRate) * 1000;

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((currentState.volume - capacity + 1) / leakRate),
      algorithm: RateLimitAlgorithm.LEAKY_BUCKET,
      key,
    };
  }

  /**
   * 使用预定义配置检查限流
   */
  async checkByType(type: string, identifier: string, context?: any): Promise<RateLimitResult> {
    const config = this.defaultConfigs.get(type);
    if (!config) {
      throw new Error(`Unknown rate limit type: ${type}`);
    }

    const key = config.keyGenerator ? config.keyGenerator(context) : `${type}:${identifier}`;
    return this.checkRateLimit(key, config, context);
  }

  /**
   * 重置限流状态
   */
  async resetRateLimit(key: string, config: RateLimitConfig): Promise<void> {
    const cacheKey = this.generateCacheKey(key, config);
    await this.redisCache.delete(cacheKey);
    this.logger.debug(`Rate limit reset for key: ${key}`);
  }

  /**
   * 获取限流状态
   */
  async getRateLimitStatus(key: string, config: RateLimitConfig): Promise<any> {
    const cacheKey = this.generateCacheKey(key, config);
    return await this.redisCache.get(cacheKey);
  }

  /**
   * 获取统计信息
   */
  getStats(): RateLimitStats {
    // 计算阻塞率
    this.stats.blockRate =
      this.stats.totalRequests > 0
        ? (this.stats.blockedRequests / this.stats.totalRequests) * 100
        : 0;

    // 计算各算法的阻塞率
    Object.keys(this.stats.algorithms).forEach(algorithm => {
      const algoStats = this.stats.algorithms[algorithm as RateLimitAlgorithm];
      algoStats.rate = algoStats.requests > 0 ? (algoStats.blocked / algoStats.requests) * 100 : 0;
    });

    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats.totalRequests = 0;
    this.stats.allowedRequests = 0;
    this.stats.blockedRequests = 0;
    this.stats.blockRate = 0;
    this.stats.averageLatency = 0;
    this.stats.peakRps = 0;

    Object.keys(this.stats.algorithms).forEach(algorithm => {
      this.stats.algorithms[algorithm as RateLimitAlgorithm] = {
        requests: 0,
        blocked: 0,
        rate: 0,
      };
    });

    this.logger.debug('Rate limiter statistics reset');
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(key: string, config: RateLimitConfig): string {
    return `rate_limit:${config.algorithm}:${key}`;
  }

  /**
   * 更新统计信息
   */
  private updateStats(algorithm: RateLimitAlgorithm, allowed: boolean, latency: number): void {
    this.stats.totalRequests++;
    this.stats.algorithms[algorithm].requests++;

    if (allowed) {
      this.stats.allowedRequests++;
    } else {
      this.stats.blockedRequests++;
      this.stats.algorithms[algorithm].blocked++;
    }

    // 更新平均延迟
    this.stats.averageLatency =
      (this.stats.averageLatency * (this.stats.totalRequests - 1) + latency) /
      this.stats.totalRequests;
  }

  /**
   * 定期清理过期数据
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredData(): Promise<void> {
    try {
      const pattern = 'rate_limit:*';
      await this.redisCache.deleteByPattern(pattern);
      this.logger.debug('Rate limiter expired data cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup expired rate limit data:', error.message);
    }
  }

  /**
   * 定期记录统计信息
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  logStats(): void {
    const stats = this.getStats();
    this.logger.log(
      `Rate Limiter Stats - Total: ${stats.totalRequests}, ` +
        `Allowed: ${stats.allowedRequests}, Blocked: ${stats.blockedRequests}, ` +
        `Block Rate: ${stats.blockRate.toFixed(2)}%, ` +
        `Avg Latency: ${stats.averageLatency.toFixed(2)}ms`,
    );
  }
}
