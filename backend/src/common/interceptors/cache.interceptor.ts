import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, timeout, retry } from 'rxjs/operators';
import { Request } from 'express';
import { RedisCacheService } from '../cache/redis-cache.service';
import { MemoryCacheService } from '../cache/memory-cache.service';
import { TracingService } from '../tracing/tracing.service';
import {
  CACHE_METADATA_KEY,
  CACHE_EVICT_METADATA_KEY,
  CACHE_PUT_METADATA_KEY,
  CacheOptions,
  CacheStrategy,
  CacheLevel,
} from '../decorators/cache.decorator';

/**
 * 缓存操作结果
 */
interface CacheOperationResult {
  hit: boolean;
  source: 'memory' | 'redis' | 'none';
  latency: number;
  size?: number;
}

/**
 * 缓存拦截器
 * 自动处理方法级缓存操作
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisCacheService: RedisCacheService,
    private readonly memoryCacheService: MemoryCacheService,
    private readonly tracingService: TracingService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const traceId = this.tracingService.getTraceId() || 'unknown';
    const handler = context.getHandler();
    const target = context.getClass();

    // 检查缓存配置
    const cacheOptions = this.reflector.get<CacheOptions>(CACHE_METADATA_KEY, handler);
    const evictOptions = this.reflector.get<any>(CACHE_EVICT_METADATA_KEY, handler);
    const putOptions = this.reflector.get<CacheOptions>(CACHE_PUT_METADATA_KEY, handler);

    const args = context.getArgs();
    const methodName = handler.name;
    const className = target.name;

    // 处理缓存清除
    if (evictOptions) {
      return this.handleCacheEvict(traceId, evictOptions, args, next, methodName, className);
    }

    // 处理缓存更新
    if (putOptions) {
      return this.handleCachePut(traceId, putOptions, args, next, methodName, className);
    }

    // 处理缓存读取
    if (cacheOptions) {
      return this.handleCacheRead(traceId, cacheOptions, args, next, methodName, className);
    }

    // 没有缓存配置，直接执行
    return next.handle();
  }

  /**
   * 处理缓存读取
   */
  private async handleCacheRead(
    traceId: string,
    options: CacheOptions,
    args: any[],
    next: CallHandler,
    methodName: string,
    className: string,
  ): Promise<Observable<any>> {
    try {
      // 检查缓存条件
      if (options.condition && !options.condition(args)) {
        this.logger.debug(`[${traceId}] Cache condition not met for ${className}.${methodName}`);
        return next.handle();
      }

      // 生成缓存键
      const cacheKey = this.generateCacheKey(options.key || '', args, className, methodName);
      const fullKey = options.prefix ? `${options.prefix}:${cacheKey}` : cacheKey;

      this.logger.debug(`[${traceId}] Checking cache for key: ${fullKey}`);

      // 尝试从缓存获取数据
      const cacheResult = await this.getCachedValue(fullKey, options);

      if (cacheResult.hit) {
        this.logger.debug(
          `[${traceId}] Cache hit from ${cacheResult.source} for ${className}.${methodName}, latency: ${cacheResult.latency}ms`,
        );
        return of(cacheResult.value);
      }

      this.logger.debug(`[${traceId}] Cache miss for ${className}.${methodName}, executing method`);

      // 缓存未命中，执行原方法
      return next.handle().pipe(
        timeout(options.timeout || 30000),
        retry(options.retries || 0),
        tap(async result => {
          // 检查排除条件
          if (options.unless && options.unless(result)) {
            this.logger.debug(
              `[${traceId}] Result excluded from cache for ${className}.${methodName}`,
            );
            return;
          }

          // 存储到缓存
          await this.setCachedValue(fullKey, result, options);
          this.logger.debug(`[${traceId}] Result cached for ${className}.${methodName}`);
        }),
        catchError(error => {
          this.logger.error(`[${traceId}] Error in ${className}.${methodName}:`, error.message);

          // 如果启用降级，尝试返回过期的缓存数据
          if (options.fallback) {
            return this.getFallbackValue(fullKey, options);
          }

          return throwError(error);
        }),
      );
    } catch (error) {
      this.logger.error(`[${traceId}] Cache interceptor error:`, error.message);
      return next.handle();
    }
  }

  /**
   * 处理缓存更新
   */
  private async handleCachePut(
    traceId: string,
    options: CacheOptions,
    args: any[],
    next: CallHandler,
    methodName: string,
    className: string,
  ): Promise<Observable<any>> {
    try {
      const cacheKey = this.generateCacheKey(options.key || '', args, className, methodName);
      const fullKey = options.prefix ? `${options.prefix}:${cacheKey}` : cacheKey;

      this.logger.debug(`[${traceId}] Cache put for key: ${fullKey}`);

      return next.handle().pipe(
        tap(async result => {
          // 检查排除条件
          if (options.unless && options.unless(result)) {
            this.logger.debug(
              `[${traceId}] Result excluded from cache put for ${className}.${methodName}`,
            );
            return;
          }

          // 更新缓存
          await this.setCachedValue(fullKey, result, options);
          this.logger.debug(`[${traceId}] Cache updated for ${className}.${methodName}`);
        }),
        catchError(error => {
          this.logger.error(
            `[${traceId}] Error in cache put for ${className}.${methodName}:`,
            error.message,
          );
          return throwError(error);
        }),
      );
    } catch (error) {
      this.logger.error(`[${traceId}] Cache put interceptor error:`, error.message);
      return next.handle();
    }
  }

  /**
   * 处理缓存清除
   */
  private async handleCacheEvict(
    traceId: string,
    options: any,
    args: any[],
    next: CallHandler,
    methodName: string,
    className: string,
  ): Promise<Observable<any>> {
    try {
      // 方法执行前清除缓存
      if (options.beforeInvocation) {
        await this.evictCache(traceId, options, args, className, methodName);
      }

      return next.handle().pipe(
        tap(async () => {
          // 方法执行后清除缓存
          if (!options.beforeInvocation) {
            await this.evictCache(traceId, options, args, className, methodName);
          }
        }),
        catchError(error => {
          this.logger.error(
            `[${traceId}] Error in cache evict for ${className}.${methodName}:`,
            error.message,
          );
          return throwError(error);
        }),
      );
    } catch (error) {
      this.logger.error(`[${traceId}] Cache evict interceptor error:`, error.message);
      return next.handle();
    }
  }

  /**
   * 从缓存获取值
   */
  private async getCachedValue(
    key: string,
    options: CacheOptions,
  ): Promise<CacheOperationResult & { value?: any }> {
    const start = Date.now();

    try {
      switch (options.strategy) {
        case CacheStrategy.MEMORY_ONLY:
          return await this.getFromMemoryOnly(key, start);

        case CacheStrategy.REDIS_ONLY:
          return await this.getFromRedisOnly(key, start);

        case CacheStrategy.MEMORY_FIRST:
          return await this.getMemoryFirst(key, start);

        case CacheStrategy.REDIS_FIRST:
          return await this.getRedisFirst(key, start);

        default:
          return await this.getMemoryFirst(key, start);
      }
    } catch (error) {
      this.logger.error(`Failed to get cached value for key ${key}:`, error.message);
      return {
        hit: false,
        source: 'none',
        latency: Date.now() - start,
      };
    }
  }

  /**
   * 设置缓存值
   */
  private async setCachedValue(key: string, value: any, options: CacheOptions): Promise<void> {
    try {
      const config = {
        ttl: options.ttl,
        prefix: options.prefix,
        serialize: options.serialize,
        compress: options.compress,
      };

      switch (options.strategy) {
        case CacheStrategy.MEMORY_ONLY:
          await this.setToMemoryOnly(key, value, config);
          break;

        case CacheStrategy.REDIS_ONLY:
          await this.setToRedisOnly(key, value, config);
          break;

        case CacheStrategy.WRITE_THROUGH:
          await this.setWriteThrough(key, value, config);
          break;

        case CacheStrategy.WRITE_BEHIND:
          await this.setWriteBehind(key, value, config);
          break;

        case CacheStrategy.WRITE_AROUND:
          await this.setWriteAround(key, value, config);
          break;

        default:
          await this.setWriteThrough(key, value, config);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to set cached value for key ${key}:`, error.message);
    }
  }

  /**
   * 仅从内存缓存获取
   */
  private async getFromMemoryOnly(
    key: string,
    start: number,
  ): Promise<CacheOperationResult & { value?: any }> {
    const value = this.memoryCacheService.get(key);
    return {
      hit: value !== null,
      source: 'memory',
      latency: Date.now() - start,
      value,
    };
  }

  /**
   * 仅从Redis缓存获取
   */
  private async getFromRedisOnly(
    key: string,
    start: number,
  ): Promise<CacheOperationResult & { value?: any }> {
    const value = await this.redisCacheService.get(key);
    return {
      hit: value !== null,
      source: 'redis',
      latency: Date.now() - start,
      value,
    };
  }

  /**
   * 内存优先获取
   */
  private async getMemoryFirst(
    key: string,
    start: number,
  ): Promise<CacheOperationResult & { value?: any }> {
    // 先尝试内存缓存
    let value = this.memoryCacheService.get(key);
    if (value !== null) {
      return {
        hit: true,
        source: 'memory',
        latency: Date.now() - start,
        value,
      };
    }

    // 再尝试Redis缓存
    value = await this.redisCacheService.get(key);
    if (value !== null) {
      // 回写到内存缓存
      this.memoryCacheService.set(key, value);
      return {
        hit: true,
        source: 'redis',
        latency: Date.now() - start,
        value,
      };
    }

    return {
      hit: false,
      source: 'none',
      latency: Date.now() - start,
    };
  }

  /**
   * Redis优先获取
   */
  private async getRedisFirst(
    key: string,
    start: number,
  ): Promise<CacheOperationResult & { value?: any }> {
    // 先尝试Redis缓存
    let value = await this.redisCacheService.get(key);
    if (value !== null) {
      return {
        hit: true,
        source: 'redis',
        latency: Date.now() - start,
        value,
      };
    }

    // 再尝试内存缓存
    value = this.memoryCacheService.get(key);
    if (value !== null) {
      return {
        hit: true,
        source: 'memory',
        latency: Date.now() - start,
        value,
      };
    }

    return {
      hit: false,
      source: 'none',
      latency: Date.now() - start,
    };
  }

  /**
   * 仅设置到内存缓存
   */
  private async setToMemoryOnly(key: string, value: any, config: any): Promise<void> {
    this.memoryCacheService.set(key, value, config.ttl ? config.ttl * 1000 : undefined);
  }

  /**
   * 仅设置到Redis缓存
   */
  private async setToRedisOnly(key: string, value: any, config: any): Promise<void> {
    await this.redisCacheService.set(key, value, config);
  }

  /**
   * 写穿透（同时写入两级缓存）
   */
  private async setWriteThrough(key: string, value: any, config: any): Promise<void> {
    await Promise.all([
      this.memoryCacheService.set(key, value, config.ttl ? config.ttl * 1000 : undefined),
      this.redisCacheService.set(key, value, config),
    ]);
  }

  /**
   * 写回（异步写入Redis）
   */
  private async setWriteBehind(key: string, value: any, config: any): Promise<void> {
    // 立即写入内存
    this.memoryCacheService.set(key, value, config.ttl ? config.ttl * 1000 : undefined);

    // 异步写入Redis
    setImmediate(async () => {
      try {
        await this.redisCacheService.set(key, value, config);
      } catch (error) {
        this.logger.error(`Failed to write behind to Redis for key ${key}:`, error.message);
      }
    });
  }

  /**
   * 写绕过（只写Redis，不写内存）
   */
  private async setWriteAround(key: string, value: any, config: any): Promise<void> {
    await this.redisCacheService.set(key, value, config);
  }

  /**
   * 清除缓存
   */
  private async evictCache(
    traceId: string,
    options: any,
    args: any[],
    className: string,
    methodName: string,
  ): Promise<void> {
    try {
      if (options.allEntries) {
        // 清除所有缓存
        if (options.pattern) {
          await Promise.all([
            this.memoryCacheService.clear(),
            this.redisCacheService.deleteByPattern(options.pattern),
          ]);
        } else {
          await Promise.all([this.memoryCacheService.clear(), this.redisCacheService.flush()]);
        }
        this.logger.debug(`[${traceId}] All cache entries evicted for ${className}.${methodName}`);
      } else {
        // 清除指定键
        const cacheKey = this.generateCacheKey(options.key || '', args, className, methodName);
        const fullKey = options.prefix ? `${options.prefix}:${cacheKey}` : cacheKey;

        await Promise.all([
          this.memoryCacheService.delete(fullKey),
          this.redisCacheService.delete(fullKey),
        ]);
        this.logger.debug(`[${traceId}] Cache evicted for key: ${fullKey}`);
      }
    } catch (error) {
      this.logger.error(`[${traceId}] Failed to evict cache:`, error.message);
    }
  }

  /**
   * 获取降级值
   */
  private async getFallbackValue(key: string, options: CacheOptions): Promise<Observable<any>> {
    try {
      // 尝试获取过期的缓存数据作为降级
      const value = await this.redisCacheService.get(key);
      if (value !== null) {
        this.logger.warn(`Using fallback cache value for key: ${key}`);
        return of(value);
      }
    } catch (error) {
      this.logger.error(`Failed to get fallback value for key ${key}:`, error.message);
    }

    return throwError(new Error('No fallback value available'));
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    keyConfig: string | ((args: any[]) => string),
    args: any[],
    className: string,
    methodName: string,
  ): string {
    if (typeof keyConfig === 'function') {
      return keyConfig(args);
    }

    if (typeof keyConfig === 'string') {
      return keyConfig;
    }

    // 默认使用类名和方法名
    const argsHash = args.length > 0 ? `:${JSON.stringify(args)}` : '';
    return `${className}:${methodName}${argsHash}`;
  }
}

/**
 * 全局缓存拦截器
 * 为HTTP请求提供自动缓存功能
 */
@Injectable()
export class GlobalCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GlobalCacheInterceptor.name);

  constructor(
    private readonly redisCacheService: RedisCacheService,
    private readonly memoryCacheService: MemoryCacheService,
    private readonly tracingService: TracingService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const traceId = this.tracingService.generateTraceId();

    // 只缓存GET请求
    if (request.method !== 'GET') {
      return next.handle();
    }

    // 生成缓存键
    const cacheKey = this.generateHttpCacheKey(request);

    try {
      // 尝试从缓存获取响应
      const cachedResponse = await this.redisCacheService.get(cacheKey);
      if (cachedResponse) {
        this.logger.debug(`[${traceId}] HTTP cache hit for ${request.method} ${request.url}`);
        return of(cachedResponse);
      }

      this.logger.debug(`[${traceId}] HTTP cache miss for ${request.method} ${request.url}`);

      // 缓存未命中，执行请求并缓存响应
      return next.handle().pipe(
        tap(async response => {
          // 只缓存成功的响应
          if (response && typeof response === 'object') {
            await this.redisCacheService.set(cacheKey, response, {
              ttl: 300, // 5分钟
              serialize: true,
            });
            this.logger.debug(
              `[${traceId}] HTTP response cached for ${request.method} ${request.url}`,
            );
          }
        }),
        catchError(error => {
          this.logger.error(
            `[${traceId}] HTTP request error for ${request.method} ${request.url}:`,
            error.message,
          );
          return throwError(error);
        }),
      );
    } catch (error) {
      this.logger.error(`[${traceId}] Global cache interceptor error:`, error.message);
      return next.handle();
    }
  }

  /**
   * 生成HTTP缓存键
   */
  private generateHttpCacheKey(request: Request): string {
    const url = request.url;
    const query = JSON.stringify(request.query);
    const headers = JSON.stringify({
      accept: request.headers.accept,
      'accept-language': request.headers['accept-language'],
    });

    return `http:${request.method}:${url}:${query}:${headers}`;
  }
}
