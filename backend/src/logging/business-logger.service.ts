import { Injectable, Logger, Inject } from '@nestjs/common';
import { extractErrorInfo } from './utils/logging-error.util';
import { BusinessLogEntry, OpenObserveConfig } from '../interfaces/logging.interface';
import OpenObserveTransport from './openobserve-transport';

@Injectable()
export class BusinessLoggerService {
  private readonly logger = new Logger(BusinessLoggerService.name);

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
    @Inject('OPENOBSERVE_TRANSPORT') private readonly openObserveTransport: OpenObserveTransport,
  ) {}

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
    const errorInfo = extractErrorInfo(error);
    const sanitized = { ...context };
    delete (sanitized as any).level;
    delete (sanitized as any).category;
    delete (sanitized as any).action;
    const logEntry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      service: 'caddy-shopping-backend',
      message: errorInfo.message,
      tags: {
        errorName: errorInfo.name,
        stackTrace: errorInfo.stack,
      },
      ...sanitized,
      level: 'ERROR',
      category: 'SYSTEM',
      action: 'ERROR_OCCURRED',
    };

    this.sendLog(logEntry);
  }

  // 发送日志到OpenObserve
  private async sendLog(logEntry: BusinessLogEntry): Promise<void> {
    try {
      // 添加追踪信息
      if (this.config.tracing.enabled) {
        await this.addTracingInfo(logEntry);
      }

      this.openObserveTransport.log(logEntry, () => {});
    } catch (error) {
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to send business log to OpenObserve', errorInfo.stack);
    }
  }

  // 添加追踪信息
  private async addTracingInfo(logEntry: BusinessLogEntry): Promise<void> {
    try {
      const { trace } = await import('@opentelemetry/api');
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        logEntry.traceId = spanContext.traceId;
        logEntry.spanId = spanContext.spanId;
      }
    } catch (error) {
      // 忽略追踪错误，不影响日志发送
      const errorInfo = extractErrorInfo(error);
      this.logger.debug('Failed to add tracing info to log', errorInfo.stack);
    }
  }

  // 通用日志入口（结构化日志直发 OpenObserve）
  logRaw(entry: any): void {
    try {
      this.openObserveTransport.log(entry, () => {});
    } catch (error) {
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to send raw business log to OpenObserve', errorInfo.stack);
    }
  }

  // 强制刷新缓冲区
  flush(): void {
    try {
      if (this.openObserveTransport && typeof this.openObserveTransport.flush === 'function') {
        this.openObserveTransport.flush();
      }
    } catch (error) {
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to flush log buffer', errorInfo.stack);
    }
  }

  
}