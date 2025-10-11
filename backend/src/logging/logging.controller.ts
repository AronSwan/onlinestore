import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Param,
  UseGuards,
  UseFilters,
  UsePipes,
  Logger,
  HttpStatus,
  HttpException,
  ValidationPipe,
  Inject,
} from '@nestjs/common';
import axios from 'axios';
import { Request } from 'express';
import { BusinessLoggerService } from './business-logger.service';
import { OpenObserveConfig } from '../interfaces/logging.interface';
import { UserBehaviorTracker } from './user-behavior-tracker.service';
import { LogAnalyticsService } from './log-analytics.service';
import { LoggingExceptionFilter } from './filters/logging-exception.filter';
import { extractErrorInfo } from './utils/logging-error.util';
import { buildErrorResponse } from '../common/helpers/error-response.helper';
import {
  BusinessLogDto,
  OrderEventDto,
  PaymentEventDto,
  InventoryEventDto,
  SystemEventDto,
  ErrorLogDto,
  PageViewDto,
  ProductViewDto,
  SearchDto,
  CartOperationDto,
  CheckoutDto,
  PurchaseDto,
  CustomEventDto,
  AnalyticsQueryDto,
  UserBehaviorAnalyticsQueryDto,
  PopularPagesQueryDto,
} from './dto/logging.dto';

@Controller('api/logging')
@UseFilters(LoggingExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class LoggingController {
  private readonly logger = new Logger(LoggingController.name);

  constructor(
    private readonly businessLoggerService: BusinessLoggerService,
    private readonly userBehaviorTracker: UserBehaviorTracker,
    private readonly logAnalyticsService: LogAnalyticsService,
    @Inject('OPENOBSERVE_CONFIG') private readonly openObserveConfig: OpenObserveConfig,
  ) {}

  // 记录用户操作日志
  @Post('user-action')
  logUserAction(@Body() businessLogDto: BusinessLogDto): { success: boolean; message: string } {
    this.businessLoggerService.logUserAction(
      businessLogDto.action,
      businessLogDto.userId,
      businessLogDto.metadata,
    );

    return {
      success: true,
      message: 'User action logged successfully',
    };
  }

  // 记录订单事件日志
  @Post('order-event')
  logOrderEvent(@Body() orderEventDto: OrderEventDto): { success: boolean; message: string } {
    this.businessLoggerService.logOrderEvent(
      orderEventDto.orderId,
      orderEventDto.event,
      orderEventDto.metadata,
    );

    return {
      success: true,
      message: 'Order event logged successfully',
    };
  }

  // 记录支付事件日志
  @Post('payment-event')
  logPaymentEvent(@Body() paymentEventDto: PaymentEventDto): { success: boolean; message: string } {
    try {
      this.businessLoggerService.logPaymentEvent(
        paymentEventDto.paymentId,
        paymentEventDto.event,
        paymentEventDto.amount,
        paymentEventDto.status,
        paymentEventDto.metadata,
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
  logInventoryEvent(@Body() inventoryEventDto: InventoryEventDto): {
    success: boolean;
    message: string;
  } {
    try {
      this.businessLoggerService.logInventoryEvent(
        inventoryEventDto.productId,
        inventoryEventDto.event,
        inventoryEventDto.quantity,
        inventoryEventDto.metadata,
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
    @Body() input: { sessionId: string; page: string; userId?: string },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    this.userBehaviorTracker.trackPageView(
      PageViewDto.createFromInput(input).sessionId,
      PageViewDto.createFromInput(input).page,
      PageViewDto.createFromInput(input).userId,
      req,
    );

    return {
      success: true,
      message: 'Page view tracked successfully',
    };
  }

  // 记录商品浏览
  @Post('product-view')
  trackProductView(
    @Body() input: { sessionId: string; productId: string; userId?: string },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    try {
      const dto = ProductViewDto.createFromInput(input);
      this.userBehaviorTracker.trackProductView(dto.sessionId, dto.productId, dto.userId, req);

      return {
        success: true,
        message: 'Product view tracked successfully',
      };
    } catch (error) {
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to track product view', errorInfo.stack);
      return buildErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to track product view',
        req,
        error,
      );
    }
  }

  // 记录搜索行为
  @Post('search')
  trackSearch(
    @Body() input: { sessionId: string; searchQuery: string; userId?: string },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    try {
      const dto = SearchDto.createFromInput(input);
      this.userBehaviorTracker.trackSearch(dto.sessionId, dto.searchQuery, dto.userId, req);

      return {
        success: true,
        message: 'Search tracked successfully',
      };
    } catch (error) {
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to track search', errorInfo.stack);
      return buildErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to track search',
        req,
        error,
      );
    }
  }

  // 记录购物车操作
  @Post('cart-operation')
  trackCartOperation(
    @Body()
    input: {
      sessionId: string;
      operation: any;
      productId: string;
      quantity: number | string;
      price: number | string;
      userId?: string;
      cartId?: string;
    },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    try {
      const dto = CartOperationDto.createFromInput(input);
      this.userBehaviorTracker.trackCartOperation(
        dto.sessionId,
        dto.operation,
        dto.productId,
        dto.quantity,
        dto.price,
        dto.userId,
        dto.cartId,
        req,
      );

      return {
        success: true,
        message: 'Cart operation tracked successfully',
      };
    } catch (error) {
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to track cart operation', errorInfo.stack);
      return buildErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to track cart operation',
        req,
        error,
      );
    }
  }

  // 记录结账行为
  @Post('checkout')
  trackCheckout(
    @Body()
    input: { sessionId: string; orderId: string; totalAmount: number | string; userId?: string },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    try {
      const dto = CheckoutDto.createFromInput(input);
      this.userBehaviorTracker.trackCheckout(
        dto.sessionId,
        dto.orderId,
        dto.totalAmount,
        dto.userId,
        req,
      );

      return {
        success: true,
        message: 'Checkout tracked successfully',
      };
    } catch (error) {
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to track checkout', errorInfo.stack);
      return buildErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to track checkout',
        req,
        error,
      );
    }
  }

  // 记录购买行为
  @Post('purchase')
  trackPurchase(
    @Body()
    input: { sessionId: string; orderId: string; totalAmount: number | string; userId?: string },
    @Req() req: Request,
  ): { success: boolean; message: string } {
    try {
      const dto = PurchaseDto.createFromInput(input);
      this.userBehaviorTracker.trackPurchase(
        dto.sessionId,
        dto.orderId,
        dto.totalAmount,
        dto.userId,
        req,
      );

      return {
        success: true,
        message: 'Purchase tracked successfully',
      };
    } catch (error) {
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to track purchase', errorInfo.stack);
      return buildErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to track purchase',
        req,
        error,
      );
    }
  }

  // 获取日志统计
  @Get('stats')
  async getLogStats(@Query() analyticsQueryDto: AnalyticsQueryDto) {
    const timeRange = { start: analyticsQueryDto.start, end: analyticsQueryDto.end };
    const stats = await this.logAnalyticsService.getLogStats(timeRange, analyticsQueryDto.filters);

    return {
      success: true,
      data: stats,
    };
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
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to get user behavior analytics', errorInfo.stack);
      return buildErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to get user behavior analytics',
        undefined,
        error,
      );
    }
  }

  // 检测异常日志模式
  @Get('anomaly-detection')
  async detectAnomalousPatterns(@Query('start') start: string, @Query('end') end: string) {
    try {
      const timeRange = { start, end };
      const anomalies = await this.logAnalyticsService.detectAnomalousPatterns(timeRange);

      return {
        success: true,
        data: anomalies,
      };
    } catch (error) {
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to detect anomalous patterns', errorInfo.stack);
      return buildErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to detect anomalous patterns',
        undefined,
        error,
      );
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
  async getConversionFunnel(@Query('start') start: string, @Query('end') end: string) {
    try {
      const timeRange = { start, end };
      const funnel = await this.logAnalyticsService.getConversionFunnel(timeRange);

      return {
        success: true,
        data: funnel,
      };
    } catch (error) {
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to get conversion funnel', errorInfo.stack);
      return {
        success: false,
        message: 'Failed to get conversion funnel',
      };
    }
  }

  // 统一配置读取（只读），用于直接调用 OpenObserve API 的场景
  getOpenObserveConfig(): Readonly<OpenObserveConfig> {
    return this.openObserveConfig;
  }

  // 验证：控制器直接调用 OpenObserve 健康检查
  @Get('openobserve/health')
  async getOpenObserveHealth(): Promise<{ success: boolean; status?: any; message?: string }> {
    try {
      const cfg = this.getOpenObserveConfig();
      const resp = await axios.get(`${cfg.url}/health`, {
        headers: cfg.auth?.token ? { Authorization: `Bearer ${cfg.auth.token}` } : undefined,
        timeout: 5000,
      });
      return { success: true, status: resp.data };
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(
        'Failed to call OpenObserve health from Controller:',
        (error as Error).stack,
      );
      return { success: false, message: msg };
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
      const errorInfo = extractErrorInfo(error);
      this.logger.error('Failed to flush log buffers', errorInfo.stack);
      return buildErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to flush log buffers',
        undefined,
        error,
      );
    }
  }
}
