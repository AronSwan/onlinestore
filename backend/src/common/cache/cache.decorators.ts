import { SetMetadata, applyDecorators } from '@nestjs/common';
import { CacheStrategy, CacheLevel } from './cache.service';

// 缓存装饰器元数据键
export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';
export const CACHE_STRATEGY = 'cache:strategy';
export const CACHE_LEVELS = 'cache:levels';
export const CACHE_CONDITION = 'cache:condition';
export const CACHE_KEY_GENERATOR = 'cache:key_generator';
export const CACHE_SERIALIZER = 'cache:serializer';
export const CACHE_DESERIALIZER = 'cache:deserializer';
export const CACHE_INVALIDATE = 'cache:invalidate';
export const CACHE_EVICT = 'cache:evict';
export const CACHE_PUT = 'cache:put';

// 缓存键生成器类型
export type CacheKeyGenerator = (target: any, methodName: string, args: any[]) => string;

// 缓存条件类型
export type CacheCondition = (
  target: any,
  methodName: string,
  args: any[],
  result?: any,
) => boolean;

// 序列化器类型
export type CacheSerializer<T> = (value: T) => string;
export type CacheDeserializer<T> = (value: string) => T;

// 缓存配置接口
export interface CacheableOptions {
  key?: string | CacheKeyGenerator;
  ttl?: number;
  strategy?: CacheStrategy;
  levels?: CacheLevel[];
  condition?: CacheCondition;
  serializer?: CacheSerializer<any>;
  deserializer?: CacheDeserializer<any>;
  unless?: CacheCondition; // 不缓存的条件
}

// 缓存失效配置接口
export interface CacheEvictOptions {
  key?: string | CacheKeyGenerator;
  levels?: CacheLevel[];
  allEntries?: boolean; // 是否清空所有缓存
  beforeInvocation?: boolean; // 是否在方法执行前清空缓存
  condition?: CacheCondition;
  pattern?: string; // 匹配模式，支持通配符
}

// 缓存更新配置接口
export interface CachePutOptions {
  key?: string | CacheKeyGenerator;
  ttl?: number;
  strategy?: CacheStrategy;
  levels?: CacheLevel[];
  condition?: CacheCondition;
  serializer?: CacheSerializer<any>;
  unless?: CacheCondition;
}

// 缓存失效配置接口
export interface CacheInvalidateOptions {
  keys?: (string | CacheKeyGenerator)[];
  levels?: CacheLevel[];
  condition?: CacheCondition;
  pattern?: string;
  tags?: string[]; // 缓存标签
}

/**
 * 缓存装饰器 - 自动缓存方法返回值
 * @param options 缓存配置选项
 */
export function Cacheable(options: CacheableOptions = {}) {
  return applyDecorators(
    SetMetadata(CACHE_KEY, options.key),
    SetMetadata(CACHE_TTL, options.ttl),
    SetMetadata(CACHE_STRATEGY, options.strategy),
    SetMetadata(CACHE_LEVELS, options.levels),
    SetMetadata(CACHE_CONDITION, options.condition),
    SetMetadata(CACHE_SERIALIZER, options.serializer),
    SetMetadata(CACHE_DESERIALIZER, options.deserializer),
  );
}

/**
 * 缓存清除装饰器 - 在方法执行时清除指定缓存
 * @param options 缓存清除配置选项
 */
export function CacheEvict(options: CacheEvictOptions = {}) {
  return applyDecorators(
    SetMetadata(CACHE_EVICT, {
      key: options.key,
      levels: options.levels,
      allEntries: options.allEntries || false,
      beforeInvocation: options.beforeInvocation || false,
      condition: options.condition,
      pattern: options.pattern,
    }),
  );
}

/**
 * 缓存更新装饰器 - 无论缓存是否存在都更新缓存
 * @param options 缓存更新配置选项
 */
export function CachePut(options: CachePutOptions = {}) {
  return applyDecorators(
    SetMetadata(CACHE_PUT, {
      key: options.key,
      ttl: options.ttl,
      strategy: options.strategy,
      levels: options.levels,
      condition: options.condition,
      serializer: options.serializer,
      unless: options.unless,
    }),
  );
}

/**
 * 缓存失效装饰器 - 使指定的缓存失效
 * @param options 缓存失效配置选项
 */
export function CacheInvalidate(options: CacheInvalidateOptions = {}) {
  return applyDecorators(
    SetMetadata(CACHE_INVALIDATE, {
      keys: options.keys,
      levels: options.levels,
      condition: options.condition,
      pattern: options.pattern,
      tags: options.tags,
    }),
  );
}

/**
 * 缓存键装饰器 - 指定缓存键
 * @param key 缓存键或键生成器
 */
export function CacheKey(key: string | CacheKeyGenerator) {
  return SetMetadata(CACHE_KEY, key);
}

/**
 * 缓存TTL装饰器 - 指定缓存生存时间
 * @param ttl 生存时间（秒）
 */
export function CacheTTL(ttl: number) {
  return SetMetadata(CACHE_TTL, ttl);
}

/**
 * 缓存策略装饰器 - 指定缓存策略
 * @param strategy 缓存策略
 */
export function CacheStrategyDecorator(strategy: CacheStrategy) {
  return SetMetadata(CACHE_STRATEGY, strategy);
}

/**
 * 缓存层级装饰器 - 指定缓存层级
 * @param levels 缓存层级数组
 */
export function CacheLevels(levels: CacheLevel[]) {
  return SetMetadata(CACHE_LEVELS, levels);
}

/**
 * 缓存条件装饰器 - 指定缓存条件
 * @param condition 缓存条件函数
 */
export function CacheCondition(condition: CacheCondition) {
  return SetMetadata(CACHE_CONDITION, condition);
}

// 内置缓存键生成器
export class CacheKeyGenerators {
  /**
   * 基于方法名和参数生成缓存键
   */
  static methodAndArgs: CacheKeyGenerator = (target, methodName, args) => {
    const className = target.constructor.name;
    const argsHash = CacheKeyGenerators.hashArgs(args);
    return `${className}:${methodName}:${argsHash}`;
  };

  /**
   * 基于类名和方法名生成缓存键
   */
  static classAndMethod: CacheKeyGenerator = (target, methodName) => {
    const className = target.constructor.name;
    return `${className}:${methodName}`;
  };

  /**
   * 基于第一个参数生成缓存键
   */
  static firstArg: CacheKeyGenerator = (target, methodName, args) => {
    const className = target.constructor.name;
    const firstArg = args.length > 0 ? String(args[0]) : 'no-args';
    return `${className}:${methodName}:${firstArg}`;
  };

  /**
   * 基于指定参数索引生成缓存键
   */
  static argIndex(index: number): CacheKeyGenerator {
    return (target, methodName, args) => {
      const className = target.constructor.name;
      const arg = args.length > index ? String(args[index]) : 'no-arg';
      return `${className}:${methodName}:${arg}`;
    };
  }

  /**
   * 基于参数属性生成缓存键
   */
  static argProperty(property: string): CacheKeyGenerator {
    return (target, methodName, args) => {
      const className = target.constructor.name;
      const firstArg = args.length > 0 ? args[0] : {};
      const propValue =
        firstArg && typeof firstArg === 'object' ? firstArg[property] : 'no-property';
      return `${className}:${methodName}:${propValue}`;
    };
  }

  /**
   * 自定义键生成器
   */
  static custom(
    generator: (target: any, methodName: string, args: any[]) => string,
  ): CacheKeyGenerator {
    return generator;
  }

  /**
   * 哈希参数数组
   */
  private static hashArgs(args: any[]): string {
    try {
      const argsString = JSON.stringify(args);
      return CacheKeyGenerators.simpleHash(argsString);
    } catch {
      return 'unhashable-args';
    }
  }

  /**
   * 简单哈希函数
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }

    return Math.abs(hash).toString(36);
  }
}

// 内置缓存条件
export class CacheConditions {
  /**
   * 总是缓存
   */
  static always: CacheCondition = () => true;

  /**
   * 从不缓存
   */
  static never: CacheCondition = () => false;

  /**
   * 结果不为null时缓存
   */
  static notNull: CacheCondition = (target, methodName, args, result) => result != null;

  /**
   * 结果不为空时缓存
   */
  static notEmpty: CacheCondition = (target, methodName, args, result) => {
    if (result == null) return false;
    if (Array.isArray(result)) return result.length > 0;
    if (typeof result === 'string') return result.length > 0;
    if (typeof result === 'object') return Object.keys(result).length > 0;
    return true;
  };

  /**
   * 参数满足条件时缓存
   */
  static argCondition(predicate: (args: any[]) => boolean): CacheCondition {
    return (target, methodName, args) => predicate(args);
  }

  /**
   * 结果满足条件时缓存
   */
  static resultCondition(predicate: (result: any) => boolean): CacheCondition {
    return (target, methodName, args, result) => predicate(result);
  }

  /**
   * 组合条件 - 所有条件都满足
   */
  static and(...conditions: CacheCondition[]): CacheCondition {
    return (target, methodName, args, result) =>
      conditions.every(condition => condition(target, methodName, args, result));
  }

  /**
   * 组合条件 - 任一条件满足
   */
  static or(...conditions: CacheCondition[]): CacheCondition {
    return (target, methodName, args, result) =>
      conditions.some(condition => condition(target, methodName, args, result));
  }

  /**
   * 反转条件
   */
  static not(condition: CacheCondition): CacheCondition {
    return (target, methodName, args, result) => !condition(target, methodName, args, result);
  }
}

// 内置序列化器
export class CacheSerializers {
  /**
   * JSON序列化器
   */
  static json: {
    serializer: CacheSerializer<any>;
    deserializer: CacheDeserializer<any>;
  } = {
    serializer: value => JSON.stringify(value),
    deserializer: value => JSON.parse(value),
  };

  /**
   * 字符串序列化器
   */
  static string: {
    serializer: CacheSerializer<string>;
    deserializer: CacheDeserializer<string>;
  } = {
    serializer: value => value,
    deserializer: value => value,
  };

  /**
   * 数字序列化器
   */
  static number: {
    serializer: CacheSerializer<number>;
    deserializer: CacheDeserializer<number>;
  } = {
    serializer: value => value.toString(),
    deserializer: value => parseFloat(value),
  };

  /**
   * 布尔序列化器
   */
  static boolean: {
    serializer: CacheSerializer<boolean>;
    deserializer: CacheDeserializer<boolean>;
  } = {
    serializer: value => value.toString(),
    deserializer: value => value === 'true',
  };

  /**
   * 自定义序列化器
   */
  static custom<T>(
    serializer: CacheSerializer<T>,
    deserializer: CacheDeserializer<T>,
  ): {
    serializer: CacheSerializer<T>;
    deserializer: CacheDeserializer<T>;
  } {
    return { serializer, deserializer };
  }
}

// 缓存标签管理
export class CacheTags {
  private static tags = new Map<string, Set<string>>();

  /**
   * 为缓存键添加标签
   */
  static addTag(key: string, tag: string): void {
    if (!this.tags.has(tag)) {
      this.tags.set(tag, new Set());
    }
    this.tags.get(tag)!.add(key);
  }

  /**
   * 获取标签下的所有缓存键
   */
  static getKeysByTag(tag: string): string[] {
    const keys = this.tags.get(tag);
    return keys ? Array.from(keys) : [];
  }

  /**
   * 移除标签
   */
  static removeTag(tag: string): void {
    this.tags.delete(tag);
  }

  /**
   * 从标签中移除缓存键
   */
  static removeKeyFromTag(key: string, tag: string): void {
    const keys = this.tags.get(tag);
    if (keys) {
      keys.delete(key);
      if (keys.size === 0) {
        this.tags.delete(tag);
      }
    }
  }

  /**
   * 清空所有标签
   */
  static clear(): void {
    this.tags.clear();
  }

  /**
   * 获取所有标签
   */
  static getAllTags(): string[] {
    return Array.from(this.tags.keys());
  }
}

// 缓存装饰器工厂
export class CacheDecoratorFactory {
  /**
   * 创建用户相关的缓存装饰器
   */
  static forUser(ttl: number = 3600) {
    return Cacheable({
      key: CacheKeyGenerators.custom((target, methodName, args) => {
        const userId = args[0]?.userId || args[0]?.id || 'anonymous';
        return `user:${userId}:${target.constructor.name}:${methodName}`;
      }),
      ttl,
      condition: CacheConditions.and(
        CacheConditions.notNull,
        CacheConditions.argCondition(args => args.length > 0),
      ),
    });
  }

  /**
   * 创建分页相关的缓存装饰器
   */
  static forPagination(ttl: number = 1800) {
    return Cacheable({
      key: CacheKeyGenerators.custom((target, methodName, args) => {
        const page = args[0]?.page || 1;
        const limit = args[0]?.limit || 10;
        const filters = args[0]?.filters ? JSON.stringify(args[0].filters) : 'no-filters';
        return `pagination:${target.constructor.name}:${methodName}:${page}:${limit}:${CacheKeyGenerators['hashArgs']([filters])}`;
      }),
      ttl,
      condition: CacheConditions.notEmpty,
    });
  }

  /**
   * 创建配置相关的缓存装饰器
   */
  static forConfig(ttl: number = 7200) {
    return Cacheable({
      key: CacheKeyGenerators.classAndMethod,
      ttl,
      levels: [CacheLevel.L1, CacheLevel.L2],
      condition: CacheConditions.notNull,
    });
  }

  /**
   * 创建短期缓存装饰器
   */
  static shortTerm(ttl: number = 300) {
    return Cacheable({
      key: CacheKeyGenerators.methodAndArgs,
      ttl,
      levels: [CacheLevel.L1],
      condition: CacheConditions.notNull,
    });
  }

  /**
   * 创建长期缓存装饰器
   */
  static longTerm(ttl: number = 86400) {
    return Cacheable({
      key: CacheKeyGenerators.methodAndArgs,
      ttl,
      levels: [CacheLevel.L1, CacheLevel.L2],
      condition: CacheConditions.notNull,
    });
  }

  /**
   * 创建只读缓存装饰器（仅L2层）
   */
  static readOnly(ttl: number = 3600) {
    return Cacheable({
      key: CacheKeyGenerators.methodAndArgs,
      ttl,
      levels: [CacheLevel.L2],
      strategy: CacheStrategy.WRITE_AROUND,
      condition: CacheConditions.notNull,
    });
  }
}

// 使用示例和最佳实践注释
/**
 * 使用示例：
 *
 * @Injectable()
 * export class UserService {
 *   // 基本缓存
 *   @Cacheable({ key: 'user:profile', ttl: 3600 })
 *   async getUserProfile(userId: string) {
 *     return await this.userRepository.findById(userId);
 *   }
 *
 *   // 使用键生成器
 *   @Cacheable({
 *     key: CacheKeyGenerators.argProperty('id'),
 *     ttl: 1800,
 *     condition: CacheConditions.notNull
 *   })
 *   async getUserById(user: { id: string }) {
 *     return await this.userRepository.findById(user.id);
 *   }
 *
 *   // 缓存清除
 *   @CacheEvict({
 *     key: CacheKeyGenerators.argProperty('id'),
 *     pattern: 'user:*'
 *   })
 *   async updateUser(user: { id: string, name: string }) {
 *     return await this.userRepository.update(user);
 *   }
 *
 *   // 缓存更新
 *   @CachePut({
 *     key: CacheKeyGenerators.argProperty('id'),
 *     condition: CacheConditions.notNull
 *   })
 *   async saveUser(user: { id: string, name: string }) {
 *     return await this.userRepository.save(user);
 *   }
 *
 *   // 使用工厂方法
 *   @CacheDecoratorFactory.forUser(3600)
 *   async getUserSettings(userId: string) {
 *     return await this.userRepository.getSettings(userId);
 *   }
 *
 *   // 分页缓存
 *   @CacheDecoratorFactory.forPagination(1800)
 *   async getUsers(query: { page: number, limit: number, filters?: any }) {
 *     return await this.userRepository.findWithPagination(query);
 *   }
 * }
 */
