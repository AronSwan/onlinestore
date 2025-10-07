import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      const result = this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
        connection: 'active',
        database: this.dataSource.options.database,
      });

      return result;
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: error.message,
        connection: 'failed',
      });

      throw new HealthCheckError('Database health check failed', result);
    }
  }
}
