import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BusinessLoggerService } from './business-logger.service';
import { UserBehaviorTracker } from './user-behavior-tracker.service';
import { LogAnalyticsService } from './log-analytics.service';
import { LoggingController } from './logging.controller';
import { LoggingExceptionFilter } from './filters/logging-exception.filter';
import OpenObserveTransport from './openobserve-transport';
import { OPENOBSERVE_URL, OPENOBSERVE_ORGANIZATION, OPENOBSERVE_TOKEN } from '../common/openobserve-env';
import { EnvironmentAdapter } from '../config/environment-adapter';

@Module({
  imports: [HttpModule],
  controllers: [LoggingController],
  providers: [
    {
      provide: 'OPENOBSERVE_CONFIG',
      useFactory: () => {
        const oo = (EnvironmentAdapter as any)?.getOpenObserve?.() ?? {
          baseUrl: OPENOBSERVE_URL,
          organization: OPENOBSERVE_ORGANIZATION,
          token: OPENOBSERVE_TOKEN,
          performance: {
            timeout: parseInt(process.env.OPENOBSERVE_TIMEOUT || '30000', 10),
            batchSize: parseInt(process.env.OPENOBSERVE_BATCH_SIZE || '100', 10),
            flushInterval: parseInt(process.env.OPENOBSERVE_FLUSH_INTERVAL || '5000', 10),
          },
          streams: {},
          tracing: {},
          alerts: {},
        };
        return {
          url: oo.baseUrl,
          organization: oo.organization,
          auth: {
            type: 'bearer',
            token: oo.token || OPENOBSERVE_TOKEN || '',
          },
          streams: {
            application_logs: process.env.OPENOBSERVE_STREAM_APPLICATION_LOGS || 'application-logs',
            business_events: oo.streams?.events || (process.env.OPENOBSERVE_STREAM_BUSINESS_EVENTS || 'business-events'),
            user_behavior: process.env.OPENOBSERVE_STREAM_USER_BEHAVIOR || 'user-behavior',
            metrics: oo.streams?.metrics || (process.env.OPENOBSERVE_STREAM_METRICS || 'metrics'),
            traces: oo.streams?.traces || (process.env.OPENOBSERVE_STREAM_TRACES || 'traces'),
          },
          retention: {
            logs: process.env.OPENOBSERVE_RETENTION_LOGS || '30d',
            metrics: process.env.OPENOBSERVE_RETENTION_METRICS || '90d',
            traces: process.env.OPENOBSERVE_RETENTION_TRACES || '7d',
            business_events: process.env.OPENOBSERVE_RETENTION_BUSINESS_EVENTS || '365d',
          },
          performance: {
            batch_size: oo.performance?.batchSize ?? parseInt(process.env.OPENOBSERVE_BATCH_SIZE || '100', 10),
            flush_interval: oo.performance?.flushInterval ?? parseInt(process.env.OPENOBSERVE_FLUSH_INTERVAL || '5000', 10),
            max_retries: oo.performance?.maxRetries ?? parseInt(process.env.OPENOBSERVE_MAX_RETRIES || '3', 10),
            timeout: oo.performance?.timeout ?? parseInt(process.env.OPENOBSERVE_TIMEOUT || '30000', 10),
          },
          tracing: {
            enabled: oo.tracing?.enabled ?? (process.env.OPENOBSERVE_TRACING_ENABLED === 'true'),
            sampling_rate: oo.tracing?.samplingRate ?? parseFloat(process.env.OPENOBSERVE_TRACING_SAMPLING_RATE || '0.1'),
          },
          alerts: {
            enabled: oo.alerts?.enabled ?? (process.env.OPENOBSERVE_ALERTS_ENABLED === 'true'),
            evaluation_interval: oo.alerts?.evaluationInterval ?? parseInt(process.env.OPENOBSERVE_ALERTS_EVALUATION_INTERVAL || '60', 10),
          },
        };
      },
    },
    {
      provide: 'OPENOBSERVE_TRANSPORT',
      useFactory: (cfg: any) => {
        const labels = (EnvironmentAdapter as any)?.getOpenObserve?.()?.metrics?.labels || {};
        return new OpenObserveTransport({
          endpoint: `${cfg.url}/api/${cfg.organization}/business-events/_json`,
          token: cfg.auth.token,
          batchSize: cfg.performance.batch_size,
          flushInterval: cfg.performance.flush_interval,
          service: 'caddy-shopping-backend',
          timeout: cfg.performance.timeout,
          maxRetries: 3,
          staticLabels: {
            domain: process.env.SERVICE_DOMAIN || process.env.DOMAIN || 'default',
            ...labels,
          },
        });
      },
      inject: ['OPENOBSERVE_CONFIG'],
    },
    {
      provide: 'USER_BEHAVIOR_TRANSPORT',
      useFactory: (cfg: any) => {
        const labels = (EnvironmentAdapter as any)?.getOpenObserve?.()?.metrics?.labels || {};
        return new OpenObserveTransport({
          endpoint: `${cfg.url}/api/${cfg.organization}/user-behavior/_json`,
          token: cfg.auth.token,
          batchSize: cfg.performance.batch_size,
          flushInterval: cfg.performance.flush_interval,
          service: 'caddy-shopping-backend',
          timeout: cfg.performance.timeout,
          maxRetries: 3,
          staticLabels: {
            domain: process.env.SERVICE_DOMAIN || process.env.DOMAIN || 'default',
            ...labels,
          },
        });
      },
      inject: ['OPENOBSERVE_CONFIG'],
    },
    BusinessLoggerService,
    UserBehaviorTracker,
    LogAnalyticsService,
    LoggingExceptionFilter,
  ],
  exports: [
    BusinessLoggerService,
    UserBehaviorTracker,
    LogAnalyticsService,
  ],
})
export class LoggingModule {}