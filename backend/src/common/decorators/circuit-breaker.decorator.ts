import { SetMetadata } from '@nestjs/common';
import { CircuitBreakerConfig } from '../circuit-breaker/circuit-breaker.service';

/**
 * 熔断器装饰器选项
 */
export interface CircuitBreakerOptions extends Partial<CircuitBreakerConfig> {
  /** 熔断器名称，默认使用类名+方法名 */
  name?: string;
  /** 是否启用熔断器 */
  enabled?: boolean;
  /** 降级函数 */
  fallback?: (...args: any[]) => any;
  /** 降级值 */
  fallbackValue?: any;
  /** 是否记录错误 */
  logErrors?: boolean;
}

/**
 * 熔断器元数据键
 */
export const CIRCUIT_BREAKER_METADATA = 'circuit-breaker';

/**
 * 熔断器装饰器
 * 为方法提供熔断保护，防止级联故障
 *
 * @param options 熔断器配置选项
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @CircuitBreaker({
 *     name: 'user-service-get-user',
 *     failureThreshold: 50,
 *     timeout: 3000,
 *     fallbackValue: { id: 'unknown', name: 'Unknown User' }
 *   })
 *   async getUser(id: string) {
 *     return this.userRepository.findById(id);
 *   }
 *
 *   @CircuitBreaker({
 *     fallback: (userId: string) => ({ recommendations: [] })
 *   })
 *   async getRecommendations(userId: string) {
 *     return this.recommendationService.getRecommendations(userId);
 *   }
 * }
 * ```
 */
export function CircuitBreaker(options: CircuitBreakerOptions = {}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    const defaultOptions: CircuitBreakerOptions = {
      name: `${className}.${methodName}`,
      enabled: true,
      logErrors: true,
      ...options,
    };

    SetMetadata(CIRCUIT_BREAKER_METADATA, defaultOptions)(target, propertyKey, descriptor);
    return descriptor;
  };
}

/**
 * 数据库操作熔断器装饰器
 * 专门用于数据库操作的熔断保护
 */
export function DatabaseCircuitBreaker(
  options: Partial<CircuitBreakerOptions> = {},
): MethodDecorator {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 60,
    timeout: 5000,
    resetTimeout: 30000,
    minimumNumberOfCalls: 5,
    slowCallDurationThreshold: 2000,
    slowCallRateThreshold: 60,
    logErrors: true,
    ...options,
  };

  return CircuitBreaker(defaultOptions);
}

/**
 * 外部API调用熔断器装饰器
 * 专门用于外部API调用的熔断保护
 */
export function ExternalApiCircuitBreaker(
  options: Partial<CircuitBreakerOptions> = {},
): MethodDecorator {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 40,
    timeout: 10000,
    resetTimeout: 60000,
    minimumNumberOfCalls: 3,
    slowCallDurationThreshold: 5000,
    slowCallRateThreshold: 50,
    logErrors: true,
    ...options,
  };

  return CircuitBreaker(defaultOptions);
}

/**
 * 缓存操作熔断器装饰器
 * 专门用于缓存操作的熔断保护
 */
export function CacheCircuitBreaker(options: Partial<CircuitBreakerOptions> = {}): MethodDecorator {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 70,
    timeout: 2000,
    resetTimeout: 15000,
    minimumNumberOfCalls: 10,
    slowCallDurationThreshold: 1000,
    slowCallRateThreshold: 70,
    logErrors: false, // 缓存失败通常不需要记录错误
    ...options,
  };

  return CircuitBreaker(defaultOptions);
}

/**
 * 消息队列熔断器装饰器
 * 专门用于消息队列操作的熔断保护
 */
export function MessageQueueCircuitBreaker(
  options: Partial<CircuitBreakerOptions> = {},
): MethodDecorator {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 50,
    timeout: 8000,
    resetTimeout: 45000,
    minimumNumberOfCalls: 5,
    slowCallDurationThreshold: 3000,
    slowCallRateThreshold: 60,
    logErrors: true,
    ...options,
  };

  return CircuitBreaker(defaultOptions);
}

/**
 * 文件操作熔断器装饰器
 * 专门用于文件操作的熔断保护
 */
export function FileOperationCircuitBreaker(
  options: Partial<CircuitBreakerOptions> = {},
): MethodDecorator {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 80,
    timeout: 15000,
    resetTimeout: 30000,
    minimumNumberOfCalls: 3,
    slowCallDurationThreshold: 10000,
    slowCallRateThreshold: 80,
    logErrors: true,
    ...options,
  };

  return CircuitBreaker(defaultOptions);
}

/**
 * 支付服务熔断器装饰器
 * 专门用于支付相关操作的熔断保护
 */
export function PaymentCircuitBreaker(
  options: Partial<CircuitBreakerOptions> = {},
): MethodDecorator {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 30, // 支付服务要求更严格
    timeout: 15000,
    resetTimeout: 120000, // 更长的恢复时间
    minimumNumberOfCalls: 2,
    slowCallDurationThreshold: 8000,
    slowCallRateThreshold: 40,
    logErrors: true,
    ...options,
  };

  return CircuitBreaker(defaultOptions);
}

/**
 * 搜索服务熔断器装饰器
 * 专门用于搜索操作的熔断保护
 */
export function SearchCircuitBreaker(
  options: Partial<CircuitBreakerOptions> = {},
): MethodDecorator {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 60,
    timeout: 6000,
    resetTimeout: 30000,
    minimumNumberOfCalls: 5,
    slowCallDurationThreshold: 3000,
    slowCallRateThreshold: 70,
    logErrors: false,
    fallbackValue: { results: [], total: 0, message: '搜索服务暂时不可用' },
    ...options,
  };

  return CircuitBreaker(defaultOptions);
}

/**
 * 推荐服务熔断器装饰器
 * 专门用于推荐系统的熔断保护
 */
export function RecommendationCircuitBreaker(
  options: Partial<CircuitBreakerOptions> = {},
): MethodDecorator {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 70,
    timeout: 4000,
    resetTimeout: 20000,
    minimumNumberOfCalls: 3,
    slowCallDurationThreshold: 2000,
    slowCallRateThreshold: 80,
    logErrors: false,
    fallbackValue: [],
    ...options,
  };

  return CircuitBreaker(defaultOptions);
}

/**
 * 通知服务熔断器装饰器
 * 专门用于通知发送的熔断保护
 */
export function NotificationCircuitBreaker(
  options: Partial<CircuitBreakerOptions> = {},
): MethodDecorator {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 50,
    timeout: 10000,
    resetTimeout: 60000,
    minimumNumberOfCalls: 3,
    slowCallDurationThreshold: 5000,
    slowCallRateThreshold: 60,
    logErrors: true,
    fallbackValue: { sent: false, message: '通知服务暂时不可用' },
    ...options,
  };

  return CircuitBreaker(defaultOptions);
}

/**
 * 分析服务熔断器装饰器
 * 专门用于数据分析操作的熔断保护
 */
export function AnalyticsCircuitBreaker(
  options: Partial<CircuitBreakerOptions> = {},
): MethodDecorator {
  const defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 80,
    timeout: 3000,
    resetTimeout: 15000,
    minimumNumberOfCalls: 5,
    slowCallDurationThreshold: 1500,
    slowCallRateThreshold: 90,
    logErrors: false,
    fallbackValue: null,
    ...options,
  };

  return CircuitBreaker(defaultOptions);
}
