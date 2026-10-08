// 用途：配置验证器，提供更严格的配置验证和密钥管理
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 10:50:00

import { createMasterConfiguration } from './unified-master.config';
import { RedpandaOptimizer } from './redpanda-optimizer';
import { PhysicalDeploymentOptimizer } from './physical-deployment-optimizer';
import { RxJSOptimizer } from './rxjs-optimizer';
import { CacheKeyManager } from './cache-key-manager';
import { ErrorLogger } from './error-logger';
import { ApiVersionManager } from './api-version-manager';

/**
 * Create configuration instance with safe fallback
 * Avoid crashing at module load when env/config is incomplete.
 */
let masterConfig: any;
try {
  masterConfig = createMasterConfiguration();
} catch (e) {
  // Fallback to safe development defaults to prevent startup crash
  masterConfig = {
    app: { env: process.env.NODE_ENV || 'development' },
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      poolSize: Number(process.env.DB_POOL_SIZE || 50),
      connectionTimeout: Number(process.env.DB_CONN_TIMEOUT || 15000),
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || '',
    },
    jwt: (() => {
      const alg = process.env.JWT_ALG || 'HS256';
      if (alg === 'RS256') {
        return {
          algorithm: 'RS256',
          privateKey: process.env.JWT_PRIVATE_KEY || '',
          publicKey: process.env.JWT_PUBLIC_KEY || '',
          expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        };
      }
      return {
        algorithm: 'HS256',
        secret: process.env.JWT_SECRET || 'dev-secret-key-please-change-xxxxxxxxxxxxxxxxxxxx',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      };
    })(),
  };
}

export class ConfigurationValidator {
  /**
   * 验证所有配置项
   */
  static validateAll(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证数据库配置
    const dbValidation = this.validateDatabaseConfig();
    if (!dbValidation.isValid) errors.push(...dbValidation.errors);
    warnings.push(...dbValidation.warnings);

    // 验证Redis配置
    const redisValidation = this.validateRedisConfig();
    if (!redisValidation.isValid) errors.push(...redisValidation.errors);
    warnings.push(...redisValidation.warnings);

    // 验证JWT配置
    const jwtValidation = this.validateJwtConfig();
    if (!jwtValidation.isValid) errors.push(...jwtValidation.errors);
    warnings.push(...jwtValidation.warnings);

    // 验证连接池配置
    const poolValidation = this.validateConnectionPool();
    warnings.push(...poolValidation.warnings);

    // 验证Redpanda配置
    const redpandaValidation = RedpandaOptimizer.validateRedpandaConfig();
    if (!redpandaValidation.isValid) errors.push(...redpandaValidation.errors);
    warnings.push(...redpandaValidation.warnings);

    // 验证部署配置
    const deploymentValidation = PhysicalDeploymentOptimizer.validateDeploymentConfig();
    if (!deploymentValidation.isValid) errors.push(...deploymentValidation.errors);
    warnings.push(...deploymentValidation.warnings);

    // 验证RxJS异步处理优化
    const rxjsValidation = this.validateRxJSOptimization();
    if (!rxjsValidation.isValid) errors.push(...rxjsValidation.errors);
    warnings.push(...rxjsValidation.warnings);

    // 验证缓存键管理
    const cacheValidation = this.validateCacheKeyManagement();
    if (!cacheValidation.isValid) errors.push(...cacheValidation.errors);
    warnings.push(...cacheValidation.warnings);

    // 验证错误日志增强
    const errorLogValidation = this.validateErrorLogging();
    if (!errorLogValidation.isValid) errors.push(...errorLogValidation.errors);
    warnings.push(...errorLogValidation.warnings);

    // 验证API版本控制
    const apiVersionValidation = this.validateApiVersionControl();
    if (!apiVersionValidation.isValid) errors.push(...apiVersionValidation.errors);
    warnings.push(...apiVersionValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证数据库配置
   */
  static validateDatabaseConfig() {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!masterConfig.database.host || masterConfig.database.host === 'localhost') {
      if (masterConfig.app.env === 'production') {
        errors.push('生产环境数据库主机不能为localhost');
      } else {
        warnings.push('开发环境使用localhost数据库主机');
      }
    }

    if (!masterConfig.database.username || masterConfig.database.username === 'root') {
      warnings.push('建议使用非root用户连接数据库');
    }

    if (!masterConfig.database.password || masterConfig.database.password === 'password') {
      if (masterConfig.app.env === 'production') {
        errors.push('生产环境必须设置强壮的数据库密码');
      } else {
        warnings.push('开发环境使用默认密码，生产环境请修改');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证Redis配置
   */
  static validateRedisConfig() {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!masterConfig.redis.host || masterConfig.redis.host === 'localhost') {
      if (masterConfig.app.env === 'production') {
        errors.push('生产环境Redis主机不能为localhost');
      } else {
        warnings.push('开发环境使用localhost Redis主机');
      }
    }

    if (!masterConfig.redis.password && masterConfig.app.env === 'production') {
      warnings.push('生产环境建议设置Redis密码');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证JWT配置
   */
  static validateJwtConfig() {
    const errors: string[] = [];
    const warnings: string[] = [];
    const algorithm = masterConfig.jwt.algorithm || 'RS256';

    if (algorithm === 'RS256') {
      // RS256算法验证
      if (!masterConfig.jwt.privateKey) {
        if (masterConfig.app.env === 'production') {
          errors.push('生产环境使用RS256算法必须设置JWT_PRIVATE_KEY');
        } else {
          warnings.push('开发环境建议设置JWT_PRIVATE_KEY以使用RS256算法');
        }
      }

      if (!masterConfig.jwt.publicKey) {
        if (masterConfig.app.env === 'production') {
          errors.push('生产环境使用RS256算法必须设置JWT_PUBLIC_KEY');
        } else {
          warnings.push('开发环境建议设置JWT_PUBLIC_KEY以使用RS256算法');
        }
      }

      // 验证RSA密钥格式
      if (masterConfig.jwt.privateKey) {
        if (!masterConfig.jwt.privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
          errors.push('JWT私钥格式不正确，应为PKCS#8格式');
        }
      }

      if (masterConfig.jwt.publicKey) {
        if (!masterConfig.jwt.publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
          errors.push('JWT公钥格式不正确，应为SPKI格式');
        }
      }
    } else if (algorithm === 'HS256') {
      // HS256算法验证（向后兼容）
      if (!masterConfig.jwt.secret || masterConfig.jwt.secret === 'dev-secret-key') {
        if (masterConfig.app.env === 'production') {
          errors.push('生产环境必须设置强壮的JWT密钥');
        } else {
          warnings.push('开发环境使用默认JWT密钥，生产环境请修改');
        }
      }

      // 强化JWT密钥长度要求
      if (masterConfig.jwt.secret && masterConfig.jwt.secret.length < 32) {
        if (masterConfig.app.env === 'production') {
          errors.push('生产环境JWT密钥长度必须至少32字符');
        } else {
          errors.push('JWT密钥长度必须至少32字符（安全合规要求）');
        }
      }

      // 检查是否使用默认密钥
      if (masterConfig.jwt.secret === 'dev-secret-key' && masterConfig.app.env === 'production') {
        errors.push('生产环境不能使用默认JWT密钥');
      }

      // 检查密钥复杂度
      if (masterConfig.jwt.secret && !/^[A-Za-z0-9+/=]{32,}$/.test(masterConfig.jwt.secret)) {
        warnings.push('JWT密钥建议使用混合字母数字字符以提高安全性');
      }

      // 建议升级到RS256
      warnings.push('建议升级到RS256算法以提高安全性');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证连接池配置
   */
  static validateConnectionPool() {
    const warnings: string[] = [];

    const poolSize = masterConfig.database.poolSize;
    if (poolSize < 50) {
      warnings.push(`连接池大小${poolSize}可能偏小，建议至少50`);
    }
    if (poolSize > 500) {
      warnings.push(`连接池大小${poolSize}可能过大，建议根据实际负载调整`);
    }

    const timeout = masterConfig.database.connectionTimeout;
    if (timeout < 10000) {
      warnings.push(`连接超时时间${timeout}ms可能过短，建议至少10秒`);
    }

    return { isValid: true, errors: [], warnings };
  }

  /**
   * 生成配置摘要报告
   */
  static generateConfigReport(): string {
    const validation = this.validateAll();

    let report = `配置验证报告 (环境: ${masterConfig.app.env})\n`;
    report += `验证结果: ${validation.isValid ? '✅ 通过' : '❌ 失败'}\n\n`;

    if (validation.errors.length > 0) {
      report += '❌ 错误:\n';
      validation.errors.forEach(error => (report += `  - ${error}\n`));
      report += '\n';
    }

    if (validation.warnings.length > 0) {
      report += '⚠️  警告:\n';
      validation.warnings.forEach(warning => (report += `  - ${warning}\n`));
      report += '\n';
    }

    // 配置摘要
    report += '📊 配置摘要:\n';
    report += `  - 数据库: ${masterConfig.database.host}:${masterConfig.database.port}\n`;
    report += `  - Redis: ${masterConfig.redis.host}:${masterConfig.redis.port}\n`;
    report += `  - 连接池大小: ${masterConfig.database.poolSize}\n`;
    report += `  - JWT过期: ${masterConfig.jwt.expiresIn}\n`;

    return report;
  }

  /**
   * 验证RxJS异步处理优化
   */
  static validateRxJSOptimization() {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查重试机制配置
    if (!masterConfig.database.connectionTimeout) {
      warnings.push('数据库连接超时未配置，建议配置连接超时时间');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证缓存键管理
   */
  static validateCacheKeyManagement() {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 测试缓存键生成
    try {
      const testKey = CacheKeyManager.product.byId('test-123');
      if (!testKey.includes(masterConfig.app.env)) {
        errors.push('缓存键未包含环境标识');
      }
    } catch (error) {
      errors.push(`缓存键生成测试失败: ${error.message}`);
    }

    // 检查TTL配置
    const ttlConfig = CacheKeyManager.config.TTL;
    if (!ttlConfig.products.byId || ttlConfig.products.byId < 300000) {
      warnings.push('建议增加产品缓存TTL以提高性能');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证错误日志增强
   */
  static validateErrorLogging() {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查日志级别配置
    if (masterConfig.app.env === 'production') {
      warnings.push('生产环境建议配置详细的日志级别');
    }

    // 只在测试环境中测试错误日志功能
    if (process.env.NODE_ENV === 'test') {
      try {
        const testError = new Error('测试错误');
        ErrorLogger.logError(testError, 'VALIDATION_TEST');
      } catch (error) {
        errors.push(`错误日志功能测试失败: ${error.message}`);
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 验证API版本控制
   */
  static validateApiVersionControl() {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证版本支持
    const versionValidation = ApiVersionManager.validateVersion('v2');
    if (!versionValidation.valid) {
      errors.push(`API版本验证失败: ${versionValidation.message}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}
