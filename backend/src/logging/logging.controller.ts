import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Req,
  Param,
  UseGuards,
  Logger 
} from '@nestjs/common';
import { Request } from 'express';
import { BusinessLoggerService } from './business-logger.service';
import { UserBehaviorTracker } from './user-behavior-tracker.service';
import { LogAnalyticsService } from './log-analytics.service';

@Controller('api/logging')
export class LoggingController {
  private readonly logger = new Logger(LoggingController.name);

  constructor(
    private readonly businessLoggerService: BusinessLoggerService,
    private readonly userBehaviorTracker: UserBehaviorTracker,
    private readonly logAnalyticsService: LogAnalyticsService,
  ) {}

  // 记录用户操作日志
  @Post('user-action')
  logUserAction(
    @Body() body: { action: string; userId: string; metadata?: any },
  ): { success: boolean; message: string } {
    try {
      this.businessLoggerService.logUserAction(
        body.action,
        body.userId,
        body.metadata,
      );
      
      return {
        success: true,
        message: 'User action logged successfully',
      };
    } catch (error) {
      this.logger.error('Failed to log user action', error);
      return {
        success: false,
        message: 'Failed to log user action',
      };
    }
  }

  // 记录订单事件日志
  @Post('order-event')
  logOrderEvent(
    @Body() body: { orderId: string; event: string; metadata?: any },
  ): { success: boolean; message: string } {
    try {
      this.businessLoggerService.logOrderEvent(
        body.orderId,
        body.event,
        body.metadata,
      );
      
      return {
        success: true,
        message: 'Order event logged successfully',
      };
    } catch (error) {
      this.logger.error('Failed to log order event', error);
      return {
        success: false,
        message: 'Failed to log order event',
      };
    }
  }

  // 记录支付事件日志
  @Post('payment-event')
  logPaymentEvent(
    @Body() body: { 
      paymentId: string; 
      event: string; 
      amount: number; 
      status: string; 
      metadata?: any 
    },
  ): { success: boolean; message: string } {
    try {
      this.businessLoggerService.logPaymentEvent(
        body.paymentId,
        body.event,
        body.amount,
        body.status,
        body.metadata,
      );
      
      return {
        success: true,
        message: 'Payment event logged successfully',
      };
    } catch (error) {
      this.logger.error('Failed to log payment event', error);
      return {
        success: false,
        message: 'Failed to log payment event',
      };
    }
  }

  // 记录库存事件日志
  @Post('inventory-event')
  logInventoryEvent(
    @Body() body: { 
      productId: string; 
      event: string; 
      quantity: number; 
      metadata?: any 
    },
  ): { success: boolean; message: string } {
    try {
      this.businessLoggerService.logInventoryEvent(
        body.productId,
        body.event,
        body.quantity,
        body.metadata,
      );
      
      return {
        success: true,
        message: 'Inventory event logged successfully',
      };
    } catch (error) {
      this.logger.error('Failed to log inventory event', error);
      return {
        success: false,
        message: 'Failed to log inventory event',
      };
    }
  }

  // 记录页面访问
  @Post('page-view')
  trackPageView(
    @Body() body: { sessionId: string; page: string; userId?: string },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    try {
      this.userBehaviorTracker.trackPageView(
        body.sessionId,
        body.page,
        body.userId,
        req,
      );
      
      return {
        success: true,
        message: 'Page view tracked successfully',
      };
    } catch (error) {
      this.logger.error('Failed to track page view', error);
      return {
        success: false,
        message: 'Failed to track page view',
      };
    }
  }

  // 记录商品浏览
  @Post('product-view')
  trackProductView(
    @Body() body: { sessionId: string; productId: string; userId?: string },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    try {
      this.userBehaviorTracker.trackProductView(
        body.sessionId,
        body.productId,
        body.userId,
        req,
      );
      
      return {
        success: true,
        message: 'Product view tracked successfully',
      };
    } catch (error) {
      this.logger.error('Failed to track product view', error);
      return {
        success: false,
        message: 'Failed to track product view',
      };
    }
  }

  // 记录搜索行为
  @Post('search')
  trackSearch(
    @Body() body: { sessionId: string; searchQuery: string; userId?: string },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    try {
      this.userBehaviorTracker.trackSearch(
        body.sessionId,
        body.searchQuery,
        body.userId,
        req,
      );
      
      return {
        success: true,
        message: 'Search tracked successfully',
      };
    } catch (error) {
      this.logger.error('Failed to track search', error);
      return {
        success: false,
        message: 'Failed to track search',
      };
    }
  }

  // 记录购物车操作
  @Post('cart-operation')
  trackCartOperation(
    @Body() body: { 
      sessionId: string; 
      operation: 'CART_ADD' | 'CART_REMOVE'; 
      productId: string; 
      quantity: number; 
      price: number; 
      userId?: string; 
      cartId?: string 
    },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    try {
      this.userBehaviorTracker.trackCartOperation(
        body.sessionId,
        body.operation,
        body.productId,
        body.quantity,
        body.price,
        body.userId,
        body.cartId,
        req,
      );
      
      return {
        success: true,
        message: 'Cart operation tracked successfully',
      };
    } catch (error) {
      this.logger.error('Failed to track cart operation', error);
      return {
        success: false,
        message: 'Failed to track cart operation',
      };
    }
  }

  // 记录结账行为
  @Post('checkout')
  trackCheckout(
    @Body() body: { sessionId: string; orderId: string; totalAmount: number; userId?: string },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    try {
      this.userBehaviorTracker.trackCheckout(
        body.sessionId,
        body.orderId,
        body.totalAmount,
        body.userId,
        req,
      );
      
      return {
        success: true,
        message: 'Checkout tracked successfully',
      };
    } catch (error) {
      this.logger.error('Failed to track checkout', error);
      return {
        success: false,
        message: 'Failed to track checkout',
      };
    }
  }

  // 记录购买行为
  @Post('purchase')
  trackPurchase(
    @Body() body: { sessionId: string; orderId: string; totalAmount: number; userId?: string },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    try {
      this.userBehaviorTracker.trackPurchase(
        body.sessionId,
        body.orderId,
        body.totalAmount,
        body.userId,
        req,
      );
      
      return {
        success: true,
        message: 'Purchase tracked successfully',
      };
    } catch (error) {
      this.logger.error('Failed to track purchase', error);
      return {
        success: false,
        message: 'Failed to track purchase',
      };
    }
  }

  // 获取日志统计
  @Get('stats')
  async getLogStats(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query() filters: any,
  ) {
    try {
      const timeRange = { start, end };
      const stats = await this.logAnalyticsService.getLogStats(timeRange, filters);
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Failed to get log stats', error);
      return {
        success: false,
        message: 'Failed to get log stats',
      };
    }
  }

  // 获取用户行为分析
  @Get('user-behavior-analytics')
  async getUserBehaviorAnalytics(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('userId') userId?: string,
  ) {
    try {
      const timeRange = { start, end };
      const analytics = await this.logAnalyticsService.getUserBehaviorAnalytics(timeRange, userId);
      
      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      this.logger.error('Failed to get user behavior analytics', error);
      return {
        success: false,
        message: 'Failed to get user behavior analytics',
      };
    }
  }

  // 检测异常日志模式
  @Get('anomaly-detection')
  async detectAnomalousPatterns(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    try {
      const timeRange = { start, end };
      const anomalies = await this.logAnalyticsService.detectAnomalousPatterns(timeRange);
      
      return {
        success: true,
        data: anomalies,
      };
    } catch (error) {
      this.logger.error('Failed to detect anomalous patterns', error);
      return {
        success: false,
        message: 'Failed to detect anomalous patterns',
      };
    }
  }

  // 获取热门页面
  @Get('popular-pages')
  async getPopularPages(
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const timeRange = { start, end };
      const limitNum = limit ? parseInt(limit, 10) : 10;
      const pages = await this.logAnalyticsService.getPopularPages(timeRange, limitNum);
      
      return {
        success: true,
        data: pages,
      };
    } catch (error) {
      this.logger.error('Failed to get popular pages', error);
      return {
        success: false,
        message: 'Failed to get popular pages',
      };
    }
  }

  // 获取转化漏斗
  @Get('conversion-funnel')
  async getConversionFunnel(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    try {
      const timeRange = { start, end };
      const funnel = await this.logAnalyticsService.getConversionFunnel(timeRange);
      
      return {
        success: true,
        data: funnel,
      };
    } catch (error) {
      this.logger.error('Failed to get conversion funnel', error);
      return {
        success: false,
        message: 'Failed to get conversion funnel',
      };
    }
  }

  // 强制刷新日志缓冲区
  @Post('flush')
  flushLogs(): { success: boolean; message: string } {
    try {
      this.businessLoggerService.flush();
      this.userBehaviorTracker.flush();
      
      return {
        success: true,
        message: 'Log buffers flushed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to flush log buffers', error);
      return {
        success: false,
        message: 'Failed to flush log buffers',
      };
    }
  }
}