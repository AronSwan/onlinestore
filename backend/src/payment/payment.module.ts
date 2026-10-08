import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentController } from './controllers/payment.controller';
import { PaymentApplicationService } from './application/services/payment-application.service';
import { PaymentQueryService } from './application/services/payment-query.service';
import { PaymentOrderRepository } from './domain/repositories/payment-order.repository';
import { PaymentOrderAggregate } from './domain/payment-order.aggregate';
import { MockPaymentOrderRepository } from './infrastructure/repositories/mock-payment-order.repository';
import { PaymentGatewayFactory } from './domain/services/payment-gateway.factory';
import { PaymentRiskService } from './domain/services/payment-risk.service';
import { DatabaseHealthService } from './infrastructure/health/database-health.service';
import { RedisHealthService } from './infrastructure/health/redis-health.service';
import { PaymentGatewayHealthService } from './infrastructure/health/payment-gateway-health.service';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { AlipayStrategy } from './strategies/alipay.strategy';
import { WechatPayStrategy } from './strategies/wechat-pay.strategy';
import { CreditCardStrategy } from './strategies/credit-card.strategy';
import { CryptoStrategy } from './strategies/crypto.strategy';
import { GopayStrategy } from './strategies/gopay.strategy';
import { CryptoGatewayService } from './gateways/crypto-gateway.service';

import { MessagingModule } from '../messaging/messaging.module';
import { SecurityModule } from '../common/security/security.module';
import paymentConfig from './config/payment.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrderAggregate, Payment]),
    ConfigModule.forFeature(paymentConfig),
    MessagingModule,
    SecurityModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentApplicationService,
    PaymentQueryService,
    PaymentService,
    PaymentGatewayFactory,
    CryptoGatewayService,
    PaymentRiskService,
    DatabaseHealthService,
    RedisHealthService,
    PaymentGatewayHealthService,
    {
      provide: 'PaymentOrderRepository',
      useClass: MockPaymentOrderRepository,
    },
    {
      provide: 'PAYMENT_STRATEGIES',
      useFactory: (cryptoGateway: CryptoGatewayService) => {
        const strategies = new Map();
        strategies.set('alipay', new AlipayStrategy());
        strategies.set('wechat', new WechatPayStrategy());
        strategies.set('credit_card', new CreditCardStrategy());
        strategies.set('usdt_trc20', new CryptoStrategy(cryptoGateway, 'USDT_TRC20' as any));
        strategies.set('usdt_erc20', new CryptoStrategy(cryptoGateway, 'USDT_ERC20' as any));
        strategies.set('usdt_bep20', new CryptoStrategy(cryptoGateway, 'USDT_BEP20' as any));
        strategies.set('btc', new CryptoStrategy(cryptoGateway, 'BTC' as any));
        strategies.set('eth', new CryptoStrategy(cryptoGateway, 'ETH' as any));
        return strategies;
      },
      inject: [CryptoGatewayService],
    },
  ],
  exports: [PaymentApplicationService, PaymentQueryService, PaymentService, PaymentGatewayFactory],
})
export class PaymentModule {
  constructor(private configService: ConfigService) {
    // 启动时验证关键配置
    this.validateCriticalConfig();
  }

  private validateCriticalConfig(): void {
    const paymentConfig = this.configService.get('payment');

    if (!paymentConfig) {
      throw new Error('支付配置未找到');
    }

    // 验证必要的配置项
    const requiredConfigs = ['defaultCurrency', 'defaultExpireMinutes', 'maxRetryCount'];

    for (const config of requiredConfigs) {
      if (!paymentConfig[config]) {
        console.warn(`支付配置缺失: ${config}，将使用默认值`);
      }
    }

    console.log('支付模块配置验证完成');
  }
}
