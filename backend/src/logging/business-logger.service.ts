import { Injectable, Logger, Inject } from '@nestjs/common';
import { BusinessLogEntry, OpenObserveConfig } from '../interfaces/logging.interface';
import OpenObserveTransport from './openobserve-transport';

@Injectable()
export class BusinessLoggerService {
  private readonly logger = new Logger(BusinessLoggerService.name);
  private readonly openObserveTransport: OpenObserveTransport;

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
  ) {
    this.openObserveTransport = new OpenObserveTransport({
      endpoint: `${config.url}/api/${config.organization}/business-events/_json`,
      token: config.auth.token || '',
      batchSize: config.performance.batch_size,
      flushInterval: config.performance.flush_interval,
      service: 'caddy-shopping-backend',
    });
  }

  // 记录用户操作日志
  logUserAction(action: string, userId: string, metadata: any = {}): void {
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: 'caddy-shopping-backend',
      category: 'USER',
      action,
      message: `User action: ${action}`,
      userId,
      ...metadata,
    };

    this.sendLog(logEntry);
  }

  // 记录订单处理日志
  logOrderEvent(orderId: string, event: string, metadata: any = {}): void {
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: 'caddy-shopping-backend',
      category: 'ORDER',
      action: event,
      message: `Order event: ${event} for order ${orderId}`,
      businessContext: {
        orderId,
        ...metadata,
      },
    };

    this.sendLog(logEntry);
  }

  // 记录支付交易日志
  logPaymentEvent(paymentId: string, event: string, amount: number, status: string, metadata: any = {}): void {
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: 'caddy-shopping-backend',
      category: 'PAYMENT',
      action: event,
      message: `Payment event: ${event} for payment ${paymentId}`,
      businessContext: {
        paymentId,
        amount,
        currency: 'CNY',
        status,
        ...metadata,
      },
    };

    this.sendLog(logEntry);
  }

  // 记录库存管理日志
  logInventoryEvent(productId: string, event: string, quantity: number, metadata: any = {}): void {
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: 'caddy-shopping-backend',
      category: 'INVENTORY',
      action: event,
      message: `Inventory event: ${event} for product ${productId}`,
      businessContext: {
        productId,
        quantity,
        ...metadata,
      },
    };

    this.sendLog(logEntry);
  }

  // 记录系统事件日志
  logSystemEvent(event: string, level: 'INFO' | 'WARN' | 'ERROR', metadata: any = {}): void {
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'caddy-shopping-backend',
      category: 'SYSTEM',
      action: event,
      message: `System event: ${event}`,
      ...metadata,
    };

    this.sendLog(logEntry);
  }

  // 记录错误日志
  logError(error: Error, context: any = {}): void {
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      service: 'caddy-shopping-backend',
      category: 'SYSTEM',
      action: 'ERROR_OCCURRED',
      message: error.message,
      tags: {
        errorName: error.name,
        stackTrace: error.stack,
      },
      ...context,
    };

    this.sendLog(logEntry);
  }

  // 发送日志到OpenObserve
  private sendLog(logEntry: BusinessLogEntry): void {
    try {
      // 添加追踪信息
      if (this.config.tracing.enabled) {
        this.addTracingInfo(logEntry);
      }

      this.openObserveTransport.log(logEntry, () => {});
    } catch (error) {
      this.logger.error('Failed to send business log to OpenObserve', error);
    }
  }

  // 添加追踪信息
  private addTracingInfo(logEntry: BusinessLogEntry): void {
    try {
      const trace = require('@opentelemetry/api');
      const activeSpan = trace.trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        logEntry.traceId = spanContext.traceId;
        logEntry.spanId = spanContext.spanId;
      }
    } catch (error) {
      // 忽略追踪错误，不影响日志发送
      this.logger.debug('Failed to add tracing info to log', error);
    }
  }

  // 强制刷新缓冲区
  flush(): void {
    try {
      (this.openObserveTransport as any).flush();
    } catch (error) {
      this.logger.error('Failed to flush log buffer', error);
    }
  }
}