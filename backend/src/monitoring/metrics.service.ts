import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // Custom metrics storage
  private metrics = {
    httpRequests: {
      total: 0,
      byMethod: {} as Record<string, number>,
      byRoute: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    },
    httpRequestDurations: {
      data: [] as number[],
      buckets: {
        '0-100': 0,
        '100-500': 0,
        '500-1000': 0,
        '1000-2000': 0,
        '2000+': 0,
      },
    },
    httpRequestErrors: {
      total: 0,
      byMethod: {} as Record<string, number>,
      byRoute: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    },
    activeConnections: 0,
    databaseQueries: {
      total: 0,
      durations: [] as number[],
      byOperation: {} as Record<string, number>,
      byTable: {} as Record<string, number>,
    },
    cache: {
      hits: 0,
      misses: 0,
    },
  };

  constructor() {
    // Initialize metric counters
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // Initialize HTTP request counters
    ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(method => {
      this.metrics.httpRequests.byMethod[method] = 0;
      this.metrics.httpRequestErrors.byMethod[method] = 0;
    });

    // Initialize status code counters
    ['200', '201', '204', '400', '401', '403', '404', '500', '502', '503'].forEach(status => {
      this.metrics.httpRequests.byStatus[status] = 0;
      this.metrics.httpRequestErrors.byStatus[status] = 0;
    });
  }

  // Record HTTP request
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    // Update total request count
    this.metrics.httpRequests.total++;

    // Update by method
    this.metrics.httpRequests.byMethod[method] =
      (this.metrics.httpRequests.byMethod[method] || 0) + 1;

    // Update by route
    this.metrics.httpRequests.byRoute[route] = (this.metrics.httpRequests.byRoute[route] || 0) + 1;

    // Update by status
    const statusStr = statusCode.toString();
    this.metrics.httpRequests.byStatus[statusStr] =
      (this.metrics.httpRequests.byStatus[statusStr] || 0) + 1;

    // Update duration metrics
    this.metrics.httpRequestDurations.data.push(duration);

    // Keep only the last 1000 duration measurements
    if (this.metrics.httpRequestDurations.data.length > 1000) {
      this.metrics.httpRequestDurations.data = this.metrics.httpRequestDurations.data.slice(-1000);
    }

    // Update duration buckets
    if (duration < 100) {
      this.metrics.httpRequestDurations.buckets['0-100']++;
    } else if (duration < 500) {
      this.metrics.httpRequestDurations.buckets['100-500']++;
    } else if (duration < 1000) {
      this.metrics.httpRequestDurations.buckets['500-1000']++;
    } else if (duration < 2000) {
      this.metrics.httpRequestDurations.buckets['1000-2000']++;
    } else {
      this.metrics.httpRequestDurations.buckets['2000+']++;
    }

    // Update error metrics if status code is 4xx or 5xx
    if (statusCode >= 400) {
      this.metrics.httpRequestErrors.total++;
      this.metrics.httpRequestErrors.byMethod[method] =
        (this.metrics.httpRequestErrors.byMethod[method] || 0) + 1;
      this.metrics.httpRequestErrors.byRoute[route] =
        (this.metrics.httpRequestErrors.byRoute[route] || 0) + 1;
      this.metrics.httpRequestErrors.byStatus[statusStr] =
        (this.metrics.httpRequestErrors.byStatus[statusStr] || 0) + 1;
    }
  }

  // Update active connections count
  updateActiveConnections(count: number): void {
    this.metrics.activeConnections = count;
  }

  // Record database query
  recordDatabaseQuery(operation: string, table: string, duration: number): void {
    // Update total query count
    this.metrics.databaseQueries.total++;

    // Update by operation
    this.metrics.databaseQueries.byOperation[operation] =
      (this.metrics.databaseQueries.byOperation[operation] || 0) + 1;

    // Update by table
    this.metrics.databaseQueries.byTable[table] =
      (this.metrics.databaseQueries.byTable[table] || 0) + 1;

    // Update duration metrics
    this.metrics.databaseQueries.durations.push(duration);

    // Keep only the last 1000 duration measurements
    if (this.metrics.databaseQueries.durations.length > 1000) {
      this.metrics.databaseQueries.durations = this.metrics.databaseQueries.durations.slice(-1000);
    }
  }

  // Record cache hit
  recordCacheHit(): void {
    this.metrics.cache.hits++;
  }

  // Record cache miss
  recordCacheMiss(): void {
    this.metrics.cache.misses++;
  }

  // Get all metrics
  getMetrics() {
    // Calculate derived metrics
    const httpRequestDurationAvg =
      this.metrics.httpRequestDurations.data.length > 0
        ? this.metrics.httpRequestDurations.data.reduce((a, b) => a + b, 0) /
          this.metrics.httpRequestDurations.data.length
        : 0;

    const databaseQueryDurationAvg =
      this.metrics.databaseQueries.durations.length > 0
        ? this.metrics.databaseQueries.durations.reduce((a, b) => a + b, 0) /
          this.metrics.databaseQueries.durations.length
        : 0;

    const cacheHitRate =
      this.metrics.cache.hits + this.metrics.cache.misses > 0
        ? (this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses)) * 100
        : 0;

    const errorRate =
      this.metrics.httpRequests.total > 0
        ? (this.metrics.httpRequestErrors.total / this.metrics.httpRequests.total) * 100
        : 0;

    return {
      ...this.metrics,
      derived: {
        httpRequestDurationAvg: Number(httpRequestDurationAvg.toFixed(2)),
        databaseQueryDurationAvg: Number(databaseQueryDurationAvg.toFixed(2)),
        cacheHitRate: Number(cacheHitRate.toFixed(2)),
        errorRate: Number(errorRate.toFixed(2)),
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Get metrics summary
  getMetricsSummary() {
    const metrics = this.getMetrics();

    return {
      httpRequests: {
        total: metrics.httpRequests.total,
        errorRate: metrics.derived.errorRate,
        avgResponseTime: metrics.derived.httpRequestDurationAvg,
      },
      database: {
        totalQueries: metrics.databaseQueries.total,
        avgQueryTime: metrics.derived.databaseQueryDurationAvg,
      },
      cache: {
        hitRate: metrics.derived.cacheHitRate,
      },
      connections: {
        active: metrics.activeConnections,
      },
      timestamp: metrics.timestamp,
    };
  }

  // Reset all metrics (useful for testing)
  resetMetrics(): void {
    this.metrics = {
      httpRequests: {
        total: 0,
        byMethod: {} as Record<string, number>,
        byRoute: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
      },
      httpRequestDurations: {
        data: [],
        buckets: {
          '0-100': 0,
          '100-500': 0,
          '500-1000': 0,
          '1000-2000': 0,
          '2000+': 0,
        },
      },
      httpRequestErrors: {
        total: 0,
        byMethod: {} as Record<string, number>,
        byRoute: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
      },
      activeConnections: 0,
      databaseQueries: {
        total: 0,
        durations: [],
        byOperation: {} as Record<string, number>,
        byTable: {} as Record<string, number>,
      },
      cache: {
        hits: 0,
        misses: 0,
      },
    };

    this.initializeMetrics();
  }

  // Get metrics for a specific category
  getMetricsByCategory(category: 'http' | 'database' | 'cache' | 'connections') {
    const metrics = this.getMetrics();

    switch (category) {
      case 'http':
        return {
          requests: metrics.httpRequests,
          durations: metrics.httpRequestDurations,
          errors: metrics.httpRequestErrors,
          derived: {
            avgResponseTime: metrics.derived.httpRequestDurationAvg,
            errorRate: metrics.derived.errorRate,
          },
        };
      case 'database':
        return {
          queries: metrics.databaseQueries,
          derived: {
            avgQueryTime: metrics.derived.databaseQueryDurationAvg,
          },
        };
      case 'cache':
        return {
          cache: metrics.cache,
          derived: {
            hitRate: metrics.derived.cacheHitRate,
          },
        };
      case 'connections':
        return {
          activeConnections: metrics.activeConnections,
        };
      default:
        return {};
    }
  }
}
