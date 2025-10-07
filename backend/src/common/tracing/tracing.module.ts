import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TracingService } from './tracing.service';
import { TracingInterceptor } from '../interceptors/tracing.interceptor';
import { initializeTracing, TracingConfig } from './tracing.config';
import { NodeSDK } from '@opentelemetry/sdk-node';

/**
 * 分布式追踪模块
 * 提供全局的分布式追踪功能
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    TracingService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
    {
      provide: 'TRACING_SDK',
      useFactory: (configService: ConfigService): NodeSDK => {
        const tracingConfig: Partial<TracingConfig> = {
          serviceName: configService.get<string>('app.name', 'caddy-shopping-site'),
          serviceVersion: configService.get<string>('app.version', '1.0.0'),
          environment: configService.get<string>('app.environment', 'development'),
          jaeger: {
            enabled: configService.get<boolean>('tracing.jaeger.enabled', false),
            endpoint: configService.get<string>(
              'tracing.jaeger.endpoint',
              'http://localhost:14268/api/traces',
            ),
          },
          zipkin: {
            enabled: configService.get<boolean>('tracing.zipkin.enabled', false),
            endpoint: configService.get<string>(
              'tracing.zipkin.endpoint',
              'http://localhost:9411/api/v2/spans',
            ),
          },
          console: {
            enabled: configService.get<boolean>('tracing.console.enabled', true),
          },
          sampling: {
            ratio: configService.get<number>('tracing.sampling.ratio', 0.1),
          },
          metrics: {
            enabled: configService.get<boolean>('tracing.metrics.enabled', false),
            openobserveEndpoint: configService.get<string>(
              'tracing.metrics.openobserveEndpoint',
              'http://localhost:5080/api/metrics',
            ),
          },
        };

        return initializeTracing(tracingConfig);
      },
      inject: [ConfigService],
    },
  ],
  exports: [TracingService],
})
export class TracingModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly tracingService: TracingService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const isTracingEnabled = this.configService.get<boolean>('tracing.enabled', true);

    if (isTracingEnabled) {
      console.log('🔍 Distributed tracing module initialized');

      // 记录追踪配置信息
      const stats = this.tracingService.getTracingStats();
      console.log('📊 Tracing configuration:', {
        serviceName: stats.serviceName,
        environment: stats.environment,
        jaegerEnabled: this.configService.get<boolean>('tracing.jaeger.enabled', false),
        zipkinEnabled: this.configService.get<boolean>('tracing.zipkin.enabled', false),
        consoleEnabled: this.configService.get<boolean>('tracing.console.enabled', true),
        samplingRatio: this.configService.get<number>('tracing.sampling.ratio', 0.1),
      });
    } else {
      console.log('⚠️  Distributed tracing is disabled');
    }
  }

  async onModuleDestroy() {
    console.log('🔍 Shutting down distributed tracing...');
    // SDK会在进程退出时自动清理
  }
}
