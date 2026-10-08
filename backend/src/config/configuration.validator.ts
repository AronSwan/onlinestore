// 用途：配置验证器，提供更严格的配置验证和密钥管理
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 10:50:00

import { createMasterConfiguration } from './unified-master.config';
import { TiDBOptimizer } from './tidb-optimizer';

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

    // 验证TiDB配置
    const tidbValidation = TiDBOptimizer.validateTiDBConfig();
    if (!tidbValidation.isValid) errors.push(...tidbValidation.errors);
    warnings.push(...tidbValidation.warnings);

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




}
