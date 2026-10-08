import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentController } from './controllers/payment.controller';
import { PaymentApplicationService } from './application/services/payment-application.service';
import { PaymentQueryService } from './application/services/payment-query.service';
import { PaymentOrderRepository } from './domain/repositories/payment-order.repository';
import { TypeOrmPaymentOrderRepository } from './infrastructure/repositories/typeorm-payment-order.repository';
import { PaymentGatewayFactory } from './domain/services/payment-gateway.factory';
import { PaymentRiskService } from './domain/services/payment-risk.service';
import { DatabaseHealthService } from './infrastructure/health/database-health.service';
import { RedisHealthService } from './infrastructure/health/redis-health.service';
import { PaymentGatewayHealthService } from './infrastructure/health/payment-gateway-health.service';
import { Payment, PaymentMethod as PaymentMethodEnum } from './entities/payment.entity';
import { AlipayStrategy } from './strategies/alipay.strategy';
import { WechatPayStrategy } from './strategies/wechat-pay.strategy';
import { CreditCardStrategy } from './strategies/credit-card.strategy';
import { CryptoStrategy } from './strategies/crypto.strategy';
import { CryptoGatewayService } from './gateways/crypto-gateway.service';

import { MessagingModule } from '../messaging/messaging.module';
import { SecurityModule } from '../common/security/security.module';
import paymentConfig from './config/payment.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]), // 439行版聚合非实体(无@Entity),摘除——真实体仅 Payment
    ConfigModule.forFeature(paymentConfig),
    MessagingModule,
    SecurityModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentApplicationService,
    PaymentQueryService,
    PaymentGatewayFactory,
    CryptoGatewayService,
    PaymentRiskService,
    DatabaseHealthService,
    RedisHealthService,
    PaymentGatewayHealthService,
    {
      provide: 'PaymentOrderRepository',
      useClass: TypeOrmPaymentOrderRepository, // 定调批:mock(内存Map)→TypeORM真仓储
    },
    {
      provide: 'PAYMENT_STRATEGIES',
      useFactory: (cryptoGateway: CryptoGatewayService) => {
        const strategies = new Map();
        strategies.set('alipay', new AlipayStrategy());
        strategies.set('wechat', new WechatPayStrategy());
        strategies.set('credit_card', new CreditCardStrategy());
        strategies.set('usdt_trc20', new CryptoStrategy(cryptoGateway, PaymentMethodEnum.USDT_TRC20));
        strategies.set('usdt_erc20', new CryptoStrategy(cryptoGateway, PaymentMethodEnum.USDT_ERC20));
        strategies.set('usdt_bep20', new CryptoStrategy(cryptoGateway, PaymentMethodEnum.USDT_BEP20));
        strategies.set('btc', new CryptoStrategy(cryptoGateway, PaymentMethodEnum.BTC));
        strategies.set('eth', new CryptoStrategy(cryptoGateway, PaymentMethodEnum.ETH));
        return strategies;
      },
      inject: [CryptoGatewayService],
    },
  ],
  exports: [PaymentApplicationService, PaymentQueryService, PaymentGatewayFactory],
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
