import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/security/rate-limit.guard';

// DTOs - 参考gopay和temp_congomall的设计
export class CreatePaymentOrderDto {
  orderId: string;
  amount: number;
  currency: string = 'CNY';
  subject: string;
  body?: string;
  payMethod: PaymentMethod;
  notifyUrl?: string;
  returnUrl?: string;
  expireTime?: number; // 过期时间（分钟）
  clientIp?: string;
  userId?: string;
}

export class PaymentCallbackDto {
  tradeNo: string;
  outTradeNo: string;
  totalAmount: string;
  tradeStatus: string;
  gmtPayment?: string;
  [key: string]: any; // 支持各种支付平台的扩展字段
}

export class RefundOrderDto {
  paymentId: string;
  refundAmount: number;
  refundReason: string;
  outRefundNo?: string;
}

export class PaymentQueryDto {
  paymentId?: string;
  outTradeNo?: string;
  tradeNo?: string;
}

// 支付方式枚举 - 参考gopay支持的支付方式
export enum PaymentMethod {
  // 支付宝系列
  ALIPAY_WEB = 'alipay_web',
  ALIPAY_WAP = 'alipay_wap',
  ALIPAY_APP = 'alipay_app',
  ALIPAY_QR = 'alipay_qr',

  // 微信系列
  WECHAT_JSAPI = 'wechat_jsapi',
  WECHAT_H5 = 'wechat_h5',
  WECHAT_APP = 'wechat_app',
  WECHAT_NATIVE = 'wechat_native',
  WECHAT_MINI = 'wechat_mini',

  // 银联
  UNIONPAY_WEB = 'unionpay_web',
  UNIONPAY_WAP = 'unionpay_wap',
  UNIONPAY_APP = 'unionpay_app',
  UNIONPAY_QR = 'unionpay_qr',

  // 数字货币
  USDT_TRC20 = 'usdt_trc20',
  USDT_ERC20 = 'usdt_erc20',
  BTC = 'btc',
  ETH = 'eth',

  // 其他
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

// 支付状态枚举
export enum PaymentStatus {
  PENDING = 'PENDING', // 待支付
  PROCESSING = 'PROCESSING', // 处理中
  SUCCESS = 'SUCCESS', // 支付成功
  FAILED = 'FAILED', // 支付失败
  CANCELLED = 'CANCELLED', // 已取消
  REFUNDED = 'REFUNDED', // 已退款
  PARTIAL_REFUNDED = 'PARTIAL_REFUNDED', // 部分退款
}

// 响应DTO
export class PaymentOrderResponse {
  paymentId: string;
  outTradeNo: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payMethod: PaymentMethod;
  payInfo: any; // 支付信息（二维码、跳转链接等）
  expireTime: Date;
  createdAt: Date;
}

export class PaymentStatusResponse {
  paymentId: string;
  outTradeNo: string;
  tradeNo?: string;
  status: PaymentStatus;
  amount: number;
  paidAmount?: number;
  currency: string;
  payMethod: PaymentMethod;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 支付控制器 - 参考gopay和temp_congomall设计
 *
 * 设计理念：
 * 1. 统一的支付接口，支持多种支付方式
 * 2. 标准化的回调处理机制
 * 3. 完善的状态管理和查询
 * 4. 安全的签名验证
 * 5. 灵活的配置和扩展
 */
@ApiTags('支付管理')
@Controller('api/payment')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CleanPaymentController {
  constructor(
    private readonly paymentApplicationService: any, // 应用服务
    private readonly paymentQueryService: any, // 查询服务
    private readonly paymentCallbackService: any, // 回调服务
  ) {}

  /**
   * 创建支付订单
   * 参考gopay的统一下单接口设计
   */
  @Post('orders')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '创建支付订单',
    description: '统一支付下单接口，支持多种支付方式',
  })
  @ApiResponse({
    status: 201,
    description: '订单创建成功',
    type: PaymentOrderResponse,
  })
  async createPaymentOrder(
    @Body() createOrderDto: CreatePaymentOrderDto,
    @Req() req: Request,
    @Headers('x-client-ip') clientIp?: string,
  ): Promise<PaymentOrderResponse> {
    // 从JWT获取用户信息
    const userId = (req.user as any)?.id || createOrderDto.userId;

    // 构建支付订单命令
    const command = {
      ...createOrderDto,
      userId,
      clientIp: clientIp || req.ip,
      userAgent: req.headers['user-agent'],
    };

    return await this.paymentApplicationService.createPaymentOrder(command);
  }

  /**
   * 查询支付订单状态
   * 支持多种查询方式：paymentId、outTradeNo、tradeNo
   */
  @Get('orders/status')
  @UseGuards(RateLimitGuard)
  @ApiOperation({
    summary: '查询支付状态',
    description: '支持通过多种方式查询支付订单状态',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: PaymentStatusResponse,
  })
  async queryPaymentStatus(@Query() queryDto: PaymentQueryDto): Promise<PaymentStatusResponse> {
    return await this.paymentQueryService.queryPaymentStatus(queryDto);
  }

  /**
   * 批量查询支付状态
   * 提高查询效率，减少网络请求
   */
  @Post('orders/batch-query')
  @UseGuards(RateLimitGuard)
  @ApiOperation({
    summary: '批量查询支付状态',
    description: '一次性查询多个支付订单状态',
  })
  async batchQueryPaymentStatus(@Body() paymentIds: string[]): Promise<PaymentStatusResponse[]> {
    return await this.paymentQueryService.batchQueryPaymentStatus(paymentIds);
  }

  /**
   * 支付回调处理
   * 参考gopay的回调处理机制，支持多种支付平台
   */
  @Post('callbacks/:payMethod')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '支付回调处理',
    description: '处理各支付平台的异步通知回调',
  })
  async handlePaymentCallback(
    @Param('payMethod') payMethod: PaymentMethod,
    @Body() callbackData: PaymentCallbackDto,
    @Headers() headers: Record<string, string>,
    @Req() req: Request,
  ): Promise<any> {
    // 构建回调上下文
    const callbackContext = {
      payMethod,
      data: callbackData,
      headers,
      rawBody: req.body,
      clientIp: req.ip,
      timestamp: new Date(),
    };

    const result = await this.paymentCallbackService.handleCallback(callbackContext);

    // 返回各支付平台期望的响应格式
    return this.formatCallbackResponse(payMethod, result);
  }

  /**
   * 发起退款
   * 支持全额退款和部分退款
   */
  @Post('refunds')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '发起退款',
    description: '对已支付订单发起退款，支持部分退款',
  })
  async createRefund(@Body() refundDto: RefundOrderDto, @Req() req: Request): Promise<any> {
    const userId = (req.user as any)?.id;

    const command = {
      ...refundDto,
      operatorId: userId,
      clientIp: req.ip,
    };

    return await this.paymentApplicationService.createRefund(command);
  }

  /**
   * 查询退款状态
   */
  @Get('refunds/:refundId/status')
  @UseGuards(RateLimitGuard)
  @ApiOperation({
    summary: '查询退款状态',
    description: '查询退款订单的处理状态',
  })
  async queryRefundStatus(@Param('refundId') refundId: string): Promise<any> {
    return await this.paymentQueryService.queryRefundStatus(refundId);
  }

  /**
   * 获取支持的支付方式
   * 动态返回当前可用的支付方式
   */
  @Get('methods')
  @ApiOperation({
    summary: '获取支付方式',
    description: '获取当前支持的所有支付方式及其配置',
  })
  async getPaymentMethods(
    @Query('platform') platform?: string, // web, mobile, app
    @Query('currency') currency?: string, // CNY, USD, USDT
  ): Promise<any> {
    return await this.paymentQueryService.getAvailablePaymentMethods({
      platform,
      currency: currency || 'CNY',
    });
  }

  /**
   * 获取支付配置
   * 返回前端所需的支付配置信息
   */
  @Get('config')
  @ApiOperation({
    summary: '获取支付配置',
    description: '获取前端支付所需的配置信息',
  })
  async getPaymentConfig(): Promise<any> {
    return {
      supportedCurrencies: ['CNY', 'USD', 'USDT', 'BTC', 'ETH'],
      defaultCurrency: 'CNY',
      minAmount: 0.01,
      maxAmount: 50000,
      orderExpireMinutes: 30,
      supportedPlatforms: ['web', 'mobile', 'app'],
      features: {
        qrCodePayment: true,
        cryptoPayment: true,
        internationalPayment: true,
        refundSupport: true,
      },
    };
  }

  /**
   * 关闭支付订单
   * 取消未支付的订单
   */
  @Post('orders/:paymentId/close')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '关闭支付订单',
    description: '取消未支付的订单',
  })
  async closePaymentOrder(
    @Param('paymentId') paymentId: string,
    @Req() req: Request,
  ): Promise<any> {
    const userId = (req.user as any)?.id;

    return await this.paymentApplicationService.closePaymentOrder({
      paymentId,
      operatorId: userId,
      reason: '用户主动取消',
    });
  }

  /**
   * 支付订单同步
   * 主动查询支付平台获取最新状态
   */
  @Post('orders/:paymentId/sync')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '同步支付状态',
    description: '主动查询支付平台获取订单最新状态',
  })
  async syncPaymentOrder(@Param('paymentId') paymentId: string): Promise<PaymentStatusResponse> {
    return await this.paymentApplicationService.syncPaymentOrder(paymentId);
  }

  /**
   * 获取支付统计信息
   * 用于管理后台展示
   */
  @Get('statistics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '获取支付统计',
    description: '获取支付相关的统计信息',
  })
  async getPaymentStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('payMethod') payMethod?: PaymentMethod,
  ): Promise<any> {
    return await this.paymentQueryService.getPaymentStatistics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      payMethod,
    });
  }

  /**
   * 健康检查
   * 检查支付服务和各支付平台的连通性
   */
  @Get('health')
  @ApiOperation({
    summary: '健康检查',
    description: '检查支付服务健康状态',
  })
  async healthCheck(): Promise<any> {
    return await this.paymentQueryService.getHealthStatus();
  }

  /**
   * 格式化回调响应
   * 根据不同支付平台返回期望的响应格式
   */
  private formatCallbackResponse(payMethod: PaymentMethod, result: any): any {
    if (payMethod.startsWith('alipay')) {
      return result.success ? 'success' : 'fail';
    }

    if (payMethod.startsWith('wechat')) {
      return {
        return_code: result.success ? 'SUCCESS' : 'FAIL',
        return_msg: result.message || (result.success ? 'OK' : 'FAIL'),
      };
    }

    if (payMethod.startsWith('unionpay')) {
      return {
        respCode: result.success ? '00' : '01',
        respMsg: result.message || (result.success ? 'SUCCESS' : 'FAIL'),
      };
    }

    // 默认响应格式
    return {
      code: result.success ? 'SUCCESS' : 'FAIL',
      message: result.message || (result.success ? 'OK' : 'FAIL'),
    };
  }
}
