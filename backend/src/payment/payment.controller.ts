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
  ParseArrayPipe,
  UsePipes,
  DefaultValuePipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiDocs,
  ApiCreateResource,
  ApiGetResource,
} from '../common/decorators/api-docs.decorator';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, RefundPaymentDto } from './dto/payment.dto';
import { PaymentMethod } from './entities/payment.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RateLimitGuard,
  PaymentRateLimit,
  CallbackRateLimit,
  QueryRateLimit,
} from '../common/security/rate-limit.guard';
import { Request } from 'express';

@ApiTags('payment')
@Controller('payment')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @ApiBearerAuth()
  @ApiCreateResource(Object, CreatePaymentDto, '创建支付订单')
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
    @Req() req?: Request,
  ) {
    // 从JWT token中获取用户ID（如果有认证）
    const userId = (req?.user as any)?.id || createPaymentDto.userId;

    return await this.paymentService.createPayment({
      ...createPaymentDto,
      userId,
      idempotencyKey,
    });
  }

  @Get('status/:paymentId')
  @UseGuards(RateLimitGuard)
  @QueryRateLimit()
  @ApiGetResource(Object, '获取支付订单')
  async getPaymentStatus(@Param('paymentId') paymentId: string) {
    return await this.paymentService.getPaymentStatus(paymentId);
  }

  @Get('status/batch')
  @ApiDocs({
    summary: '批量查询支付状态',
    description: '一次性查询多个支付订单的状态，提高查询效率',
    responses: {
      success: {
        description: '查询成功',
      },
    },
  })
  async batchGetPaymentStatus(
    @Query('paymentIds', new ParseArrayPipe({ items: String, separator: ',' }))
    paymentIds: string[],
  ) {
    return await this.paymentService.batchGetPaymentStatus(paymentIds);
  }

  @Post('callback/:method')
  @UseGuards(RateLimitGuard)
  @CallbackRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiDocs({
    summary: '支付回调处理',
    description: '处理第三方支付平台的异步回调通知，更新支付状态',
    params: [{ name: 'method', description: '支付方式' }],

    body: { type: Object, description: '第三方支付平台回调数据' },
    responses: {
      success: {
        description: '回调处理成功',
      },
      internalServerError: '回调数据无效',
    },
  })
  async handleCallback(
    @Param('method') method: PaymentMethod,
    @Body() callbackData: any,
    @Headers('x-signature') signature?: string,
  ) {
    // 严格输入验证
    if (!callbackData || typeof callbackData !== 'object') {
      throw new BadRequestException('无效的回调数据');
    }

    // 验证必要字段
    const requiredFields = ['paymentId', 'status'];
    for (const field of requiredFields) {
      if (!callbackData[field]) {
        throw new BadRequestException(`缺少必要字段: ${field}`);
      }
    }

    // 验证字段格式
    if (!/^[a-zA-Z0-9_-]+$/.test(callbackData.paymentId)) {
      throw new BadRequestException('无效的支付ID格式');
    }

    const validStatuses = ['pending', 'success', 'failed', 'cancelled', 'processing'];
    if (!validStatuses.includes(callbackData.status)) {
      throw new BadRequestException('无效的支付状态');
    }

    // 验证金额格式（如果提供）
    if (callbackData.amount && !/^\d+(\.\d{1,2})?$/.test(callbackData.amount.toString())) {
      throw new BadRequestException('无效的金额格式');
    }

    // 验证第三方交易ID格式（如果提供）
    if (
      callbackData.thirdPartyTransactionId &&
      !/^[a-zA-Z0-9_-]+$/.test(callbackData.thirdPartyTransactionId)
    ) {
      throw new BadRequestException('无效的第三方交易ID格式');
    }

    // 验证区块链交易哈希格式（如果提供）
    if (callbackData.txHash && !/^[a-fA-F0-9]{64}$/.test(callbackData.txHash)) {
      throw new BadRequestException('无效的区块链交易哈希格式');
    }

    // 验证签名格式（如果提供）
    if (signature && !/^[a-fA-F0-9]+$/.test(signature)) {
      throw new BadRequestException('无效的签名格式');
    }

    // 将签名添加到回调数据中
    if (signature) {
      callbackData.signature = signature;
    }

    const result = await this.paymentService.handlePaymentCallback(method, callbackData);

    // 返回第三方期望的响应格式
    if (result.success) {
      return { code: 'SUCCESS', message: 'OK' };
    } else {
      return { code: 'FAIL', message: result.message || 'FAIL' };
    }
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiDocs({
    summary: '发起退款',
    description: '对已成功支付的订单发起退款，支持全额退款和部分退款',
    body: { type: RefundPaymentDto },
    responses: {
      success: {
        description: '退款成功',
      },
      internalServerError: '退款失败，可能是金额超限或支付状态不允许退款',
    },
  })
  async refundPayment(@Body() refundDto: RefundPaymentDto) {
    return await this.paymentService.refundPayment(
      refundDto.paymentId,
      refundDto.amount,
      refundDto.reason,
    );
  }

  @Get('methods')
  @ApiDocs({
    summary: '获取支持的支付方式',
    description: '获取系统支持的所有支付方式列表，包括传统支付和加密货币支付',
    responses: {
      success: {
        description: '支付方式列表，包含传统支付和加密货币支付',
      },
    },
  })
  async getPaymentMethods() {
    return {
      traditional: [
        { method: PaymentMethod.ALIPAY, name: '支付宝', icon: 'alipay', enabled: true },
        { method: PaymentMethod.WECHAT, name: '微信支付', icon: 'wechat', enabled: true },
        { method: PaymentMethod.UNIONPAY, name: '银联支付', icon: 'unionpay', enabled: true },
        { method: PaymentMethod.CREDIT_CARD, name: '信用卡', icon: 'credit-card', enabled: true },
        { method: PaymentMethod.BANK_TRANSFER, name: '银行转账', icon: 'bank', enabled: false },
      ],
      crypto: [
        {
          method: PaymentMethod.USDT_TRC20,
          name: 'USDT (TRC20)',
          icon: 'usdt',
          network: 'TRC20',
          enabled: true,
        },
        {
          method: PaymentMethod.USDT_ERC20,
          name: 'USDT (ERC20)',
          icon: 'usdt',
          network: 'ERC20',
          enabled: true,
        },
        {
          method: PaymentMethod.USDT_BEP20,
          name: 'USDT (BEP20)',
          icon: 'usdt',
          network: 'BEP20',
          enabled: true,
        },
        { method: PaymentMethod.BTC, name: 'Bitcoin', icon: 'btc', network: 'BTC', enabled: false },
        {
          method: PaymentMethod.ETH,
          name: 'Ethereum',
          icon: 'eth',
          network: 'ETH',
          enabled: false,
        },
      ],
    };
  }

  @Get('order/:orderId/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiGetResource(Object, '查询订单的所有支付记录')
  async getOrderPayments(@Param('orderId') orderId: string) {
    return await this.paymentService.getOrderPayments(orderId);
  }

  @Get('health')
  @ApiDocs({
    summary: '支付服务健康检查',
    description: '检查支付服务的运行状态和健康度',
    responses: {
      success: {
        description: '服务正常',
      },
    },
  })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'payment',
      version: '1.0.0',
    };
  }

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiDocs({
    summary: '获取支付配置信息（管理员）',
    description: '获取支付系统的配置信息，仅限管理员访问',
    responses: {
      success: {
        description: '获取成功',
      },
    },
  })
  async getPaymentConfig() {
    // 只返回非敏感的配置信息
    return {
      defaultCurrency: 'CNY',
      defaultExpireMinutes: 30,
      supportedCurrencies: ['CNY', 'USD', 'USDT', 'BTC', 'ETH'],
      maxRefundDays: 30,
      callbackTimeout: 10000,
    };
  }
}
