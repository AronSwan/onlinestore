"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiDBOptimizer = void 0;
const unified_master_config_1 = require("./unified-master.config");
const masterConfig = (0, unified_master_config_1.createMasterConfiguration)();
class TiDBOptimizer {
    static validateTiDBConfig() {
        const errors = [];
        const warnings = [];
        if (masterConfig.database.port === 3306) {
            warnings.push('检测到使用MySQL默认端口3306，TiDB推荐使用4000端口');
        }
        const poolSize = masterConfig.database.poolSize;
        if (poolSize < 50) {
            warnings.push(`TiDB连接池大小${poolSize}偏小，建议至少50`);
        }
        if (poolSize > 500) {
            warnings.push(`TiDB连接池大小${poolSize}可能过大，建议根据实际负载调整`);
        }
        const isolationLevel = masterConfig.database.ssl ? 'REPEATABLE READ' : 'READ COMMITTED';
        if (masterConfig.app.env === 'production') {
            warnings.push(`生产环境TiDB推荐使用${isolationLevel}事务隔离级别`);
        }
        return { isValid: errors.length === 0, errors, warnings };
    }
    static getTiDBOptimizationConfig() {
        return {
            distributedTransaction: {
                enable: true,
                maxRetries: 3,
                retryDelay: 100,
                timeout: 30000,
            },
            sharding: {
                autoSplit: true,
                splitThreshold: 1000000,
                maxShardSize: 50000000,
                enableCrossShardQuery: false,
            },
            connectionPool: {
                minIdle: 10,
                maxIdle: Math.floor(masterConfig.database.poolSize / 2),
                idleTimeout: 60000,
                acquireTimeout: masterConfig.database.acquireTimeout,
                validationQuery: 'SELECT 1',
            },
            performance: {
                batchSize: 1000,
                chunkSize: 10000,
                parallelDegree: 4,
                enableQueryCache: true,
                cacheSize: 1000,
            },
        };
    }
    static generateTiDBReport() {
        const validation = this.validateTiDBConfig();
        const optimization = this.getTiDBOptimizationConfig();
        let report = `📊 TiDB配置优化报告 (环境: ${masterConfig.app.env})\n\n`;
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
        report += '🔧 优化配置:\n';
        report += `  - 分布式事务: ${optimization.distributedTransaction.enable ? '启用' : '禁用'}\n`;
        report += `  - 自动分片: ${optimization.sharding.autoSplit ? '启用' : '禁用'}\n`;
        report += `  - 分片阈值: ${optimization.sharding.splitThreshold.toLocaleString()} 行\n`;
        report += `  - 并行度: ${optimization.performance.parallelDegree}\n`;
        report += `  - 查询缓存: ${optimization.performance.enableQueryCache ? '启用' : '禁用'}\n`;
        report += '\n💡 TiDB生产环境建议:\n';
        report += '  - 使用TiDB 5.0+版本以获得最佳性能\n';
        report += '  - 配置TiKV参数优化存储性能\n';
        report += '  - 启用TiFlash列存引擎加速分析查询\n';
        report += '  - 定期执行ANALYZE TABLE更新统计信息\n';
        report += '  - 监控TiDB Dashboard关键指标\n';
        return report;
    }
}
exports.TiDBOptimizer = TiDBOptimizer;
