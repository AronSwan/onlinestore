import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CircuitBreakerService } from './circuit-breaker.service';
import { CircuitBreakerController } from './circuit-breaker.controller';
import {
  CircuitBreakerInterceptor,
  GlobalCircuitBreakerInterceptor,
} from '../interceptors/circuit-breaker.interceptor';
import { TracingModule } from '../tracing/tracing.module';

/**
 * 熔断器模块
 *
 * 提供完整的熔断器功能，包括：
 * - 熔断器服务管理
 * - 方法级熔断保护
 * - 全局HTTP熔断保护
 * - 熔断器状态监控
 * - API管理接口
 *
 * 特性：
 * - 多级熔断策略
 * - 自动故障检测
 * - 智能恢复机制
 * - 实时监控统计
 * - 分布式追踪集成
 */
@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), TracingModule],
  providers: [CircuitBreakerService, CircuitBreakerInterceptor, GlobalCircuitBreakerInterceptor],
  controllers: [CircuitBreakerController],
  exports: [CircuitBreakerService, CircuitBreakerInterceptor, GlobalCircuitBreakerInterceptor],
})
export class CircuitBreakerModule {
  private readonly logger = new Logger(CircuitBreakerModule.name);

  constructor() {
    this.logger.log('熔断器模块已初始化');
    this.logger.log('功能包括：');
    this.logger.log('  - 服务熔断保护');
    this.logger.log('  - 自动故障检测');
    this.logger.log('  - 智能恢复机制');
    this.logger.log('  - 实时状态监控');
    this.logger.log('  - API管理接口');
  }
}
