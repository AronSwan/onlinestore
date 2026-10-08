/**
 * 新支付控制器测试脚本
 * 用于验证新支付控制器的基本功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';

// 导入新支付控制器相关组件
import { PaymentController } from './controllers/payment.controller';
import { PaymentApplicationService } from './application/services/payment-application.service';
import { PaymentQueryService } from './application/services/payment-query.service';
import { PaymentGatewayFactory } from './domain/services/payment-gateway.factory';
import { PaymentRiskService } from './domain/services/payment-risk.service';
import { PaymentOrderRepository } from './domain/repositories/payment-order.repository';
import { MockPaymentOrderRepository } from './infrastructure/repositories/mock-payment-order.repository';
import { DatabaseHealthService } from './infrastructure/health/database-health.service';
import { RedisHealthService } from './infrastructure/health/redis-health.service';
import { PaymentGatewayHealthService } from './infrastructure/health/payment-gateway-health.service';

// 导入DTO
import { CreatePaymentOrderDto } from './application/dtos/create-payment-order.dto';
import { RefundPaymentDto } from './application/dtos/refund-payment.dto';

async function testPaymentController() {
  console.log('🚀 开始测试新支付控制器...\n');

  try {
    // 创建测试模块
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      controllers: [PaymentController],
      providers: [
        PaymentApplicationService,
        PaymentQueryService,
        PaymentGatewayFactory,
        PaymentRiskService,
        DatabaseHealthService,
        RedisHealthService,
        PaymentGatewayHealthService,
        {
          provide: 'PaymentOrderRepository',
          useClass: MockPaymentOrderRepository,
        },
      ],
    }).compile();

    const controller = module.get<PaymentController>(PaymentController);
    const paymentApplicationService =
      module.get<PaymentApplicationService>(PaymentApplicationService);
    const paymentQueryService = module.get<PaymentQueryService>(PaymentQueryService);

    console.log('✅ 模块创建成功');
    console.log('✅ 控制器实例化成功');
    console.log('✅ 应用服务实例化成功');
    console.log('✅ 查询服务实例化成功\n');

    // 测试获取支付方式
    console.log('📋 测试获取支付方式...');
    const paymentMethods = await controller.getPaymentMethods();
    console.log('✅ 支付方式获取成功:', {
      traditionalCount: paymentMethods.traditional.length,
      cryptoCount: paymentMethods.crypto.length,
    });

    // 测试健康检查
    console.log('\n🏥 测试健康检查...');
    const healthCheck = await controller.healthCheck();
    console.log('✅ 健康检查成功:', {
      status: healthCheck.status,
      hasTimestamp: !!healthCheck.timestamp,
    });

    // 测试创建支付订单
    console.log('\n💳 测试创建支付订单...');
    const createPaymentDto: CreatePaymentOrderDto = {
      merchantOrderId: `TEST_ORDER_${Date.now()}`,
      amount: 99.99,
      currency: 'CNY',
      paymentMethod: 'ALIPAY',
      subject: '测试商品',
      description: '这是一个测试支付订单',
      notifyUrl: 'https://example.com/notify',
      returnUrl: 'https://example.com/return',
    };

    const mockRequest = {
      user: { id: 'test_user_123' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Test Agent' },
    } as any;

    const paymentOrder = await controller.createPaymentOrder(createPaymentDto, mockRequest);

    console.log('✅ 支付订单创建成功:', {
      paymentOrderId: paymentOrder.paymentOrderId,
      amount: paymentOrder.amount,
      status: paymentOrder.status,
    });

    // 测试查询支付状态
    console.log('\n🔍 测试查询支付状态...');
    const paymentStatus = await controller.getPaymentOrderStatus(paymentOrder.paymentOrderId);
    console.log('✅ 支付状态查询成功:', {
      paymentOrderId: paymentStatus.paymentOrderId,
      status: paymentStatus.status,
    });

    // 测试批量查询
    console.log('\n📊 测试批量查询...');
    const batchQuery = await controller.batchQueryPaymentStatus({
      paymentOrderIds: [paymentOrder.paymentOrderId],
    });
    console.log('✅ 批量查询成功:', {
      count: batchQuery.length,
    });

    console.log('\n🎉 所有测试通过！新支付控制器工作正常！');

    return {
      success: true,
      message: '新支付控制器测试通过',
      results: {
        paymentMethods,
        healthCheck,
        paymentOrder,
        paymentStatus,
        batchQuery,
      },
    };
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error.stack);

    return {
      success: false,
      message: '新支付控制器测试失败',
      error: error.message,
    };
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testPaymentController()
    .then(result => {
      console.log('\n📋 测试结果:', result.success ? '✅ 成功' : '❌ 失败');
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ 测试执行失败:', error);
      process.exit(1);
    });
}

export { testPaymentController };
