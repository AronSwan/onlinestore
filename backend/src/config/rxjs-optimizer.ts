// 用途：RxJS异步处理优化，提供更优雅的异步操作处理
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 11:00:00

import { createMasterConfiguration } from './unified-master.config';
import { Observable, from, of, throwError, timer } from 'rxjs';
import { map, catchError, retryWhen, delayWhen, tap, timeout, mergeMap } from 'rxjs/operators';

// Create configuration instance
const masterConfig = createMasterConfiguration();

export class RxJSOptimizer {
  /**
   * 创建带重试机制的异步操作
   */
  static createRetryableOperation<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000,
  ): Observable<T> {
    return from(operation()).pipe(
      retryWhen(errors =>
        errors.pipe(
          delayWhen((error, index) => {
            if (index >= maxRetries) {
              return throwError(() => error);
            }
            return timer(delay * (index + 1));
          }),
        ),
      ),
      timeout(masterConfig.database.connectionTimeout),
    );
  }

  /**
   * 批量处理异步操作
   */
  static batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize = 10,
    concurrency = 3,
  ): Observable<R[]> {
    const batches = this.chunkArray(items, batchSize);

    return from(batches).pipe(
      mergeMap(batch => from(batch).pipe(mergeMap(item => processor(item), concurrency))),
      map(results => (Array.isArray(results) ? results : [results])),
    );
  }

  /**
   * 数据库查询优化 - 批量查询产品信息
   */
  static optimizedProductBatchQuery(productIds: string[]): Observable<any[]> {
    const batches = this.chunkArray(productIds, 50); // 每批50个产品

    return from(batches).pipe(
      mergeMap(batch => this.executeBatchProductQuery(batch), 2), // 并发2个批次
      map(results => (Array.isArray(results) ? results : [results])),
      catchError(error => {
        console.error('批量产品查询失败:', error);
        return throwError(() => new Error('产品批量查询失败'));
      }),
    );
  }

  /**
   * 缓存操作优化
   */
  static cacheOperation<T>(
    key: string,
    operation: () => Observable<T>,
    ttl = 300000, // 5分钟默认缓存
  ): Observable<T> {
    const cacheKey = this.generateCacheKey(key);

    // 这里可以集成实际的缓存服务
    return operation().pipe(
      tap(result => {
        // 缓存结果
        console.log(`缓存结果: ${cacheKey}`);
      }),
      catchError(error => {
        console.error(`缓存操作失败: ${cacheKey}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * 错误处理增强
   */
  static enhancedErrorHandling<T>(operation: () => Observable<T>, context: string): Observable<T> {
    return operation().pipe(
      catchError(error => {
        const enhancedError = new Error(`${context} 操作失败: ${error.message}`);
        enhancedError.stack = error.stack;

        // 详细日志记录
        console.error(enhancedError.message, {
          context,
          timestamp: new Date().toISOString(),
          stack: error.stack,
        });

        return throwError(() => enhancedError);
      }),
    );
  }

  /**
   * API版本控制支持
   */
  static versionedApiCall<T>(version: string, operation: () => Observable<T>): Observable<T> {
    return operation().pipe(
      tap(() => {
        console.log(`API版本 ${version} 调用成功`);
      }),
      catchError(error => {
        console.error(`API版本 ${version} 调用失败:`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * 私有方法：数组分块
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 私有方法：生成统一缓存键
   */
  private static generateCacheKey(key: string): string {
    return `${masterConfig.app.env}:${key}:v1`;
  }

  /**
   * 私有方法：执行批量产品查询（模拟）
   */
  private static executeBatchProductQuery(productIds: string[]): Promise<any[]> {
    // 模拟数据库批量查询
    return Promise.resolve(
      productIds.map(id => ({
        id,
        name: `产品 ${id}`,
        price: Math.random() * 100,
      })),
    );
  }
}
