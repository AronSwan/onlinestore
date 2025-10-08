import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BusinessLoggerService } from './business-logger.service';
import { UserBehaviorTracker } from './user-behavior-tracker.service';
import { LogAnalyticsService } from './log-analytics.service';
import { LoggingController } from './logging.controller';

@Module({
  imports: [HttpModule],
  controllers: [LoggingController],
  providers: [
    {
      provide: 'OPENOBSERVE_CONFIG',
      useFactory: () => ({
        url: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
        organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
        auth: {
          type: 'bearer',
          token: process.env.OPENOBSERVE_TOKEN || '',
        },
        streams: {
          application_logs: process.env.OPENOBSERVE_STREAM_APPLICATION_LOGS || 'application-logs',
          business_events: process.env.OPENOBSERVE_STREAM_BUSINESS_EVENTS || 'business-events',
          user_behavior: process.env.OPENOBSERVE_STREAM_USER_BEHAVIOR || 'user-behavior',
          metrics: process.env.OPENOBSERVE_STREAM_METRICS || 'metrics',
          traces: process.env.OPENOBSERVE_STREAM_TRACES || 'traces',
        },
        retention: {
          logs: process.env.OPENOBSERVE_RETENTION_LOGS || '30d',
          metrics: process.env.OPENOBSERVE_RETENTION_METRICS || '90d',
          traces: process.env.OPENOBSERVE_RETENTION_TRACES || '7d',
          business_events: process.env.OPENOBSERVE_RETENTION_BUSINESS_EVENTS || '365d',
        },
        performance: {
          batch_size: parseInt(process.env.OPENOBSERVE_BATCH_SIZE || '100', 10),
          flush_interval: parseInt(process.env.OPENOBSERVE_FLUSH_INTERVAL || '5000', 10),
          max_retries: parseInt(process.env.OPENOBSERVE_MAX_RETRIES || '3', 10),
          timeout: parseInt(process.env.OPENOBSERVE_TIMEOUT || '30000', 10),
        },
        tracing: {
          enabled: process.env.OPENOBSERVE_TRACING_ENABLED === 'true',
          sampling_rate: parseFloat(process.env.OPENOBSERVE_TRACING_SAMPLING_RATE || '0.1'),
        },
        alerts: {
          enabled: process.env.OPENOBSERVE_ALERTS_ENABLED === 'true',
          evaluation_interval: parseInt(process.env.OPENOBSERVE_ALERTS_EVALUATION_INTERVAL || '60', 10),
        },
      }),
    },
    BusinessLoggerService,
    UserBehaviorTracker,
    LogAnalyticsService,
  ],
  exports: [
    BusinessLoggerService,
    UserBehaviorTracker,
    LogAnalyticsService,
  ],
})
export class LoggingModule {}