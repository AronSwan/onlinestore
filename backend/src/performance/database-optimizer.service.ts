import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  timestamp: Date;
  slowQuery: boolean;
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  reason: string;
  estimatedImprovement: string;
  priority: 'high' | 'medium' | 'low';
}

@Injectable()
export class DatabaseOptimizerService {
  private readonly logger = new Logger(DatabaseOptimizerService.name);
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1秒

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  // 查询性能监控
  async monitorQuery<T>(queryFn: () => Promise<T>, queryDescription: string): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const executionTime = Date.now() - startTime;

      // 记录查询指标
      const metrics: QueryPerformanceMetrics = {
        query: queryDescription,
        executionTime,
        rowsExamined: 0, // 实际实现中需要从EXPLAIN获取
        rowsReturned: Array.isArray(result) ? result.length : 1,
        timestamp: new Date(),
        slowQuery: executionTime > this.SLOW_QUERY_THRESHOLD,
      };

      this.queryMetrics.push(metrics);

      if (metrics.slowQuery) {
        this.logger.warn(`慢查询检测: ${queryDescription} 耗时 ${executionTime}ms`);
      }

      // 保持最近1000条记录
      if (this.queryMetrics.length > 1000) {
        this.queryMetrics = this.queryMetrics.slice(-1000);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`查询失败: ${queryDescription} 耗时 ${executionTime}ms`, error);
      throw error;
    }
  }

  // 获取慢查询统计
  getSlowQueryStats() {
    const slowQueries = this.queryMetrics.filter(m => m.slowQuery);
    const totalQueries = this.queryMetrics.length;

    return {
      totalQueries,
      slowQueries: slowQueries.length,
      slowQueryRate: totalQueries > 0 ? slowQueries.length / totalQueries : 0,
      averageExecutionTime:
        totalQueries > 0
          ? this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries
          : 0,
      top10SlowQueries: slowQueries.sort((a, b) => b.executionTime - a.executionTime).slice(0, 10),
    };
  }

  // 分析表结构和索引
  async analyzeTableStructure(): Promise<{
    tables: any[];
    indexes: any[];
    recommendations: IndexRecommendation[];
  }> {
    try {
      // 获取所有表信息
      const tables = await this.dataSource.query(`
        SELECT 
          TABLE_NAME,
          ENGINE,
          TABLE_ROWS,
          DATA_LENGTH,
          INDEX_LENGTH,
          AUTO_INCREMENT
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY DATA_LENGTH DESC
      `);

      // 获取索引信息
      const indexes = await this.dataSource.query(`
        SELECT 
          TABLE_NAME,
          INDEX_NAME,
          COLUMN_NAME,
          SEQ_IN_INDEX,
          CARDINALITY,
          INDEX_TYPE
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
      `);

      // 生成索引建议
      const recommendations = await this.generateIndexRecommendations();

      return { tables, indexes, recommendations };
    } catch (error) {
      this.logger.error('分析表结构失败', error);
      return { tables: [], indexes: [], recommendations: [] };
    }
  }

  // 生成索引建议
  private async generateIndexRecommendations(): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    try {
      // 检查缺失的外键索引
      const missingFKIndexes = await this.dataSource.query(`
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
        AND CONSTRAINT_NAME != 'PRIMARY'
        AND TABLE_NAME NOT IN (
          SELECT DISTINCT TABLE_NAME 
          FROM information_schema.STATISTICS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND COLUMN_NAME = KEY_COLUMN_USAGE.COLUMN_NAME
        )
      `);

      missingFKIndexes.forEach((fk: any) => {
        recommendations.push({
          table: fk.TABLE_NAME,
          columns: [fk.COLUMN_NAME],
          reason: `外键 ${fk.COLUMN_NAME} 缺少索引，影响JOIN性能`,
          estimatedImprovement: '50-80%',
          priority: 'high',
        });
      });

      // 检查大表是否有合适的索引
      const largeTables = await this.dataSource.query(`
        SELECT TABLE_NAME, TABLE_ROWS
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_ROWS > 10000
        ORDER BY TABLE_ROWS DESC
      `);

      largeTables.forEach((table: any) => {
        recommendations.push({
          table: table.TABLE_NAME,
          columns: ['created_at', 'updated_at'],
          reason: `大表 ${table.TABLE_NAME} (${table.TABLE_ROWS} 行) 建议添加时间字段索引`,
          estimatedImprovement: '30-60%',
          priority: 'medium',
        });
      });
    } catch (error) {
      this.logger.error('生成索引建议失败', error);
    }

    return recommendations;
  }

  // 连接池优化建议
  async analyzeConnectionPool() {
    try {
      const poolStats = await this.dataSource.query(`
        SHOW STATUS LIKE 'Threads_%'
      `);

      const connectionStats = await this.dataSource.query(`
        SHOW STATUS LIKE 'Connections'
      `);

      const maxConnections = await this.dataSource.query(`
        SHOW VARIABLES LIKE 'max_connections'
      `);

      return {
        poolStats,
        connectionStats,
        maxConnections,
        recommendations: this.generateConnectionPoolRecommendations(poolStats),
      };
    } catch (error) {
      this.logger.error('分析连接池失败', error);
      return null;
    }
  }

  private generateConnectionPoolRecommendations(stats: any[]) {
    const recommendations = [];

    const threadsConnected = stats.find(s => s.Variable_name === 'Threads_connected')?.Value || 0;
    const threadsRunning = stats.find(s => s.Variable_name === 'Threads_running')?.Value || 0;

    if (threadsRunning / threadsConnected > 0.8) {
      recommendations.push({
        type: 'connection_pool',
        message: '活跃连接比例过高，建议增加连接池大小或优化查询',
        priority: 'high',
      });
    }

    return recommendations;
  }

  // 查询缓存分析
  async analyzeQueryCache() {
    try {
      const cacheStats = await this.dataSource.query(`
        SHOW STATUS LIKE 'Qcache_%'
      `);

      const cacheVariables = await this.dataSource.query(`
        SHOW VARIABLES LIKE 'query_cache_%'
      `);

      return {
        stats: cacheStats,
        variables: cacheVariables,
        recommendations: this.generateQueryCacheRecommendations(cacheStats),
      };
    } catch (error) {
      this.logger.error('分析查询缓存失败', error);
      return null;
    }
  }

  private generateQueryCacheRecommendations(stats: any[]) {
    const recommendations = [];

    const hitRate = this.calculateQueryCacheHitRate(stats);

    if (hitRate < 0.8) {
      recommendations.push({
        type: 'query_cache',
        message: `查询缓存命中率较低 (${(hitRate * 100).toFixed(1)}%)，建议优化缓存策略`,
        priority: 'medium',
      });
    }

    return recommendations;
  }

  private calculateQueryCacheHitRate(stats: any[]): number {
    const hits = stats.find(s => s.Variable_name === 'Qcache_hits')?.Value || 0;
    const inserts = stats.find(s => s.Variable_name === 'Qcache_inserts')?.Value || 0;

    const total = hits + inserts;
    return total > 0 ? hits / total : 0;
  }

  // 定时性能分析 (每天凌晨2点)
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performDailyAnalysis() {
    this.logger.log('开始每日数据库性能分析...');

    try {
      const [tableAnalysis, connectionAnalysis, cacheAnalysis, slowQueryStats] = await Promise.all([
        this.analyzeTableStructure(),
        this.analyzeConnectionPool(),
        this.analyzeQueryCache(),
        this.getSlowQueryStats(),
      ]);

      const report = {
        timestamp: new Date(),
        tableAnalysis,
        connectionAnalysis,
        cacheAnalysis,
        slowQueryStats,
        summary: this.generatePerformanceSummary({
          tableAnalysis,
          connectionAnalysis,
          cacheAnalysis,
          slowQueryStats,
        }),
      };

      // 保存报告到文件或发送通知
      await this.savePerformanceReport(report);

      this.logger.log('每日数据库性能分析完成');
    } catch (error) {
      this.logger.error('每日数据库性能分析失败', error);
    }
  }

  private generatePerformanceSummary(data: any) {
    const issues = [];
    const recommendations = [];

    // 分析慢查询
    if (data.slowQueryStats.slowQueryRate > 0.1) {
      issues.push(`慢查询比例过高: ${(data.slowQueryStats.slowQueryRate * 100).toFixed(1)}%`);
      recommendations.push('优化慢查询，添加必要索引');
    }

    // 分析索引建议
    if (data.tableAnalysis.recommendations.length > 0) {
      const highPriorityRecs = data.tableAnalysis.recommendations.filter(
        (r: IndexRecommendation) => r.priority === 'high',
      );
      if (highPriorityRecs.length > 0) {
        issues.push(`发现 ${highPriorityRecs.length} 个高优先级索引优化建议`);
        recommendations.push('立即处理高优先级索引建议');
      }
    }

    return {
      overallHealth: issues.length === 0 ? 'good' : issues.length < 3 ? 'warning' : 'critical',
      issues,
      recommendations,
      score: Math.max(0, 100 - issues.length * 20),
    };
  }

  private async savePerformanceReport(report: any) {
    // 实际实现中可以保存到文件系统或发送到监控系统
    this.logger.log('性能报告已生成', {
      score: report.summary.score,
      issues: report.summary.issues.length,
      recommendations: report.summary.recommendations.length,
    });
  }

  // 实时性能监控
  async getCurrentPerformanceMetrics() {
    try {
      const [processlist, status] = await Promise.all([
        this.dataSource.query('SHOW PROCESSLIST'),
        this.dataSource.query(`
          SHOW STATUS WHERE Variable_name IN (
            'Threads_connected', 'Threads_running', 'Queries', 
            'Slow_queries', 'Uptime', 'Bytes_sent', 'Bytes_received'
          )
        `),
      ]);

      return {
        activeConnections: processlist.length,
        processlist: processlist.slice(0, 10), // 只返回前10个
        status: status.reduce((acc: any, item: any) => {
          acc[item.Variable_name] = item.Value;
          return acc;
        }, {}),
        queryMetrics: this.getSlowQueryStats(),
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('获取实时性能指标失败', error);
      return null;
    }
  }
}
