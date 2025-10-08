import { Injectable, Logger, Inject } from '@nestjs/common';
import { UserBehaviorLog, OpenObserveConfig } from '../interfaces/logging.interface';
import OpenObserveTransport from './openobserve-transport';
import { Request } from 'express';

@Injectable()
export class UserBehaviorTracker {
  private readonly logger = new Logger(UserBehaviorTracker.name);
  private readonly openObserveTransport: OpenObserveTransport;

  constructor(
    @Inject('OPENOBSERVE_CONFIG') private readonly config: OpenObserveConfig,
  ) {
    this.openObserveTransport = new OpenObserveTransport({
      endpoint: `${config.url}/api/${config.organization}/user-behavior/_json`,
      token: config.auth.token || '',
      batchSize: config.performance.batch_size,
      flushInterval: config.performance.flush_interval,
      service: 'caddy-shopping-frontend',
    });
  }

  // 记录页面访问
  trackPageView(sessionId: string, page: string, userId?: string, req?: Request): void {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: 'PAGE_VIEW',
      eventData: { page },
      deviceInfo: this.extractDeviceInfo(req),
      referrer: req?.headers?.referer,
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 记录商品浏览
  trackProductView(sessionId: string, productId: string, userId?: string, req?: Request): void {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: 'PRODUCT_VIEW',
      eventData: { productId },
      deviceInfo: this.extractDeviceInfo(req),
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 记录搜索行为
  trackSearch(sessionId: string, searchQuery: string, userId?: string, req?: Request): void {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: 'SEARCH',
      eventData: { searchQuery },
      deviceInfo: this.extractDeviceInfo(req),
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 记录购物车操作
  trackCartOperation(
    sessionId: string, 
    operation: 'CART_ADD' | 'CART_REMOVE', 
    productId: string, 
    quantity: number, 
    price: number, 
    userId?: string, 
    cartId?: string,
    req?: Request
  ): void {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: operation,
      eventData: { 
        productId, 
        quantity, 
        price,
        cartId 
      },
      deviceInfo: this.extractDeviceInfo(req),
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 记录结账行为
  trackCheckout(sessionId: string, orderId: string, totalAmount: number, userId?: string, req?: Request): void {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: 'CHECKOUT',
      eventData: { 
        orderId, 
        totalAmount 
      },
      deviceInfo: this.extractDeviceInfo(req),
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 记录购买行为
  trackPurchase(sessionId: string, orderId: string, totalAmount: number, userId?: string, req?: Request): void {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: 'PURCHASE',
      eventData: { 
        orderId, 
        totalAmount 
      },
      deviceInfo: this.extractDeviceInfo(req),
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 记录自定义事件
  trackCustomEvent(
    sessionId: string, 
    eventType: string, 
    eventData: any, 
    userId?: string, 
    req?: Request
  ): void {
    const behaviorLog: UserBehaviorLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      eventType: eventType as any,
      eventData,
      deviceInfo: this.extractDeviceInfo(req),
    };

    this.sendBehaviorLog(behaviorLog);
  }

  // 提取设备信息
  private extractDeviceInfo(req?: Request): any {
    if (!req) return null;

    return {
      userAgent: req.headers['user-agent'],
      ip: this.getClientIp(req),
      platform: req.headers['sec-ch-ua-platform'] || 'unknown',
    };
  }

  // 获取客户端IP
  private getClientIp(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  // 发送行为日志到OpenObserve
  private sendBehaviorLog(behaviorLog: UserBehaviorLog): void {
    try {
      this.openObserveTransport.log(behaviorLog, () => {});
    } catch (error) {
      this.logger.error('Failed to send user behavior log to OpenObserve', error);
    }
  }

  // 强制刷新缓冲区
  flush(): void {
    try {
      (this.openObserveTransport as any).flush();
    } catch (error) {
      this.logger.error('Failed to flush behavior log buffer', error);
    }
  }
}