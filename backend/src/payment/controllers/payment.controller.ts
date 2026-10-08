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
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';

import { PaymentApplicationService } from '../application/services/payment-application.service';
import { PaymentQueryService } from '../application/services/payment-query.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/security/rate-limit.guard';

// DTOs
import { CreatePaymentOrderDto } from '../application/dtos/create-payment-order.dto';
import { PaymentCallbackDto } from '../application/dtos/payment-callback.dto';
import { RefundPaymentDto } from '../application/dtos/refund-payment.dto';
import { QueryPaymentDto } from '../application/dtos/query-payment.dto';

// Response DTOs
import { PaymentOrderResponseDto } from '../application/dtos/payment-order-response.dto';
import { PaymentStatusResponseDto } from '../application/dtos/payment-status-response.dto';
import { PaymentMethodsResponseDto } from '../application/dtos/payment-methods-response.dto';

// Domain Types
import { PaymentMethod } from '../domain/value-objects/payment-method.value-object';
import { PaymentOrderId } from '../domain/value-objects/payment-order-id.value-object';

/**
 * 支付控制器 - 基于DDD架构设计
 * 参考temp_congomall项目的架构模式和gopay的API设计
 */
@ApiTags('Payment')
@Controller('api/payment')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentApplicationService: PaymentApplicationService,
    private readonly paymentQueryService: PaymentQueryService,
  ) {}

  /**
   * 创建支付订单
   * 支持多种支付方式：支付宝、微信、银联、加密货币等
   */
  @Post('orders')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '创建支付订单',
    description: '创建新的支付订单，支持多种支付方式和货币类型',
  })
  @ApiResponse({
    status: 201,
    description: '支付订单创建成功',
    type: PaymentOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '重复请求' })
  async createPaymentOrder(
    @Body() createOrderDto: CreatePaymentOrderDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
    @Headers('x-client-ip') clientIp?: string,
    @Headers('user-agent') userAgent?: string,
    @Req() req?: Request,
  ): Promise<PaymentOrderResponseDto> {
    this.logger.log(`创建支付订单: ${JSON.stringify(createOrderDto)}`);

    // 从JWT token中获取用户ID
    const userId = (req?.user as any)?.id || createOrderDto.userId;

    // 构建支付上下文
    const paymentContext = {
      userId,
      clientIp: clientIp || req?.ip,
      userAgent,
      idempotencyKey,
      timestamp: new Date(),
    };

    const result = await this.paymentApplicationService.createPaymentOrder(
      createOrderDto,
      paymentContext,
    );

    this.logger.log(`支付订单创建成功: ${result.paymentOrderId}`);
    return result;
  }

  /**
   * 查询支付订单状态
   */
  @Get('orders/:paymentOrderId')
  @UseGuards(RateLimitGuard)
  @ApiOperation({
    summary: '查询支付订单状态',
    description: '根据支付订单ID查询当前支付状态',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: PaymentStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: '支付订单不存在' })
  async getPaymentOrderStatus(
    @Param('paymentOrderId') paymentOrderId: string,
  ): Promise<PaymentStatusResponseDto> {
    this.logger.log(`查询支付订单状态: ${paymentOrderId}`);

    const orderIdVO = PaymentOrderId.create(paymentOrderId);
    const result = await this.paymentQueryService.getPaymentOrderStatus(orderIdVO);

    return result;
  }

  /**
   * 批量查询支付订单状态
   */
  @Post('orders/batch-query')
  @UseGuards(RateLimitGuard)
  @ApiOperation({
    summary: '批量查询支付订单状态',
    description: '一次性查询多个支付订单的状态',
  })
  @ApiResponse({
    status: 200,
    description: '批量查询成功',
    type: [PaymentStatusResponseDto],
  })
  async batchQueryPaymentStatus(
    @Body() queryDto: QueryPaymentDto,
  ): Promise<PaymentStatusResponseDto[]> {
    this.logger.log(`批量查询支付状态: ${queryDto.paymentOrderIds.length}个订单`);

    const orderIds = queryDto.paymentOrderIds.map(id => PaymentOrderId.create(id));
    const results = await this.paymentQueryService.batchQueryPaymentStatus(orderIds);

    return results;
  }

  /**
   * 支付回调处理
   * 处理各种支付渠道的异步通知
   */
  @Post('callbacks/:paymentMethod')
  @UseGuards(RateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '支付回调处理',
    description: '处理第三方支付平台的异步回调通知',
  })
  @ApiResponse({
    status: 200,
    description: '回调处理成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'SUCCESS' },
        message: { type: 'string', example: 'OK' },
      },
    },
  })
  @ApiResponse({ status: 400, description: '回调数据无效' })
  async handlePaymentCallback(
    @Param('paymentMethod') paymentMethodStr: string,
    @Body() callbackData: PaymentCallbackDto,
    @Headers('x-signature') signature?: string,
    @Headers('x-timestamp') timestamp?: string,
    @Req() req?: Request,
  ) {
    this.logger.log(`处理支付回调: ${paymentMethodStr}`);

    try {
      // 构建回调上下文
      const callbackContext = {
        paymentMethod: PaymentMethod.fromString(paymentMethodStr),
        signature,
        timestamp,
        clientIp: req?.ip,
        userAgent: req?.get('user-agent'),
        rawBody: req?.body,
      };

      const result = await this.paymentApplicationService.handlePaymentCallback(
        callbackData,
        callbackContext,
      );

      // 返回第三方支付平台期望的响应格式
      if (result.success) {
        this.logger.log(`支付回调处理成功: ${callbackData.outTradeNo}`);
        return { code: 'SUCCESS', message: 'OK' };
      } else {
        this.logger.warn(`支付回调处理失败: ${result.message}`);
        return { code: 'FAIL', message: result.message || 'FAIL' };
      }
    } catch (error) {
      this.logger.error(`支付回调处理异常: ${error.message}`, error.stack);
      return { code: 'FAIL', message: 'SYSTEM_ERROR' };
    }
  }

  /**
   * 发起退款
   */
  @Post('refunds')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '发起退款',
    description: '对已成功支付的订单发起退款，支持全额退款和部分退款',
  })
  @ApiResponse({
    status: 201,
    description: '退款申请成功',
    schema: {
      type: 'object',
      properties: {
        refundId: { type: 'string' },
        status: { type: 'string' },
        refundAmount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: '退款参数错误' })
  @ApiResponse({ status: 409, description: '订单状态不允许退款' })
  async createRefund(@Body() refundDto: RefundPaymentDto, @Req() req?: Request) {
    this.logger.log(`发起退款: ${JSON.stringify(refundDto)}`);

    const userId = (req?.user as any)?.id;
    const refundContext = {
      userId,
      clientIp: req?.ip,
      userAgent: req?.get('user-agent'),
      timestamp: new Date(),
    };

    const result = await this.paymentApplicationService.createRefund(refundDto, refundContext);

    this.logger.log(`退款申请成功: ${result.refundId}`);
    return result;
  }

  /**
   * 获取支持的支付方式
   */
  @Get('methods')
  @ApiOperation({
    summary: '获取支持的支付方式',
    description: '获取系统支持的所有支付方式列表，包括传统支付和加密货币支付',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: PaymentMethodsResponseDto,
  })
  async getPaymentMethods(): Promise<PaymentMethodsResponseDto> {
    const result = await this.paymentQueryService.getAvailablePaymentMethods();
    return result;
  }

  /**
   * 查询商户订单的支付记录
   */
  @Get('merchant-orders/:merchantOrderId/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '查询商户订单的支付记录',
    description: '获取指定商户订单的所有支付记录，包括成功、失败和退款记录',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [PaymentStatusResponseDto],
  })
  async getMerchantOrderPayments(
    @Param('merchantOrderId') merchantOrderId: string,
  ): Promise<PaymentStatusResponseDto[]> {
    this.logger.log(`查询商户订单支付记录: ${merchantOrderId}`);

    const results = await this.paymentQueryService.getPaymentsByMerchantOrderId(merchantOrderId);

    return results;
  }

  /**
   * 同步支付订单状态
   * 主动查询第三方支付平台的订单状态
   */
  @Post('orders/:paymentOrderId/sync')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '同步支付订单状态',
    description: '主动向第三方支付平台查询订单状态并更新本地记录',
  })
  @ApiResponse({
    status: 200,
    description: '同步成功',
    type: PaymentStatusResponseDto,
  })
  async syncPaymentOrderStatus(
    @Param('paymentOrderId') paymentOrderId: string,
  ): Promise<PaymentStatusResponseDto> {
    this.logger.log(`同步支付订单状态: ${paymentOrderId}`);

    const orderIdVO = PaymentOrderId.create(paymentOrderId);
    const result = await this.paymentApplicationService.syncPaymentOrderStatus(orderIdVO);

    this.logger.log(`支付订单状态同步完成: ${paymentOrderId}`);
    return result;
  }

  /**
   * 关闭支付订单
   */
  @Post('orders/:paymentOrderId/close')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '关闭支付订单',
    description: '关闭未支付的订单，释放相关资源',
  })
  @ApiResponse({
    status: 200,
    description: '订单关闭成功',
    schema: {
      type: 'object',
      properties: {
        paymentOrderId: { type: 'string' },
        status: { type: 'string', example: 'CLOSED' },
        closedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async closePaymentOrder(@Param('paymentOrderId') paymentOrderId: string, @Req() req?: Request) {
    this.logger.log(`关闭支付订单: ${paymentOrderId}`);

    const userId = (req?.user as any)?.id;
    const orderIdVO = PaymentOrderId.create(paymentOrderId);

    const result = await this.paymentApplicationService.closePaymentOrder(orderIdVO, userId);

    this.logger.log(`支付订单关闭成功: ${paymentOrderId}`);
    return result;
  }

  /**
   * 支付服务健康检查
   */
  @Get('health')
  @ApiOperation({
    summary: '支付服务健康检查',
    description: '检查支付服务的运行状态和健康度',
  })
  @ApiResponse({
    status: 200,
    description: '服务正常',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        service: { type: 'string', example: 'payment' },
        version: { type: 'string', example: '2.0.0' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'healthy' },
            redis: { type: 'string', example: 'healthy' },
            paymentGateways: { type: 'string', example: 'healthy' },
          },
        },
      },
    },
  })
  async healthCheck() {
    const healthStatus = await this.paymentQueryService.getHealthStatus();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'payment',
      version: '2.0.0',
      ...healthStatus,
    };
  }
}
