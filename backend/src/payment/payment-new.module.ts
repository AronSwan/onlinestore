import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { PaymentController } from './controllers/payment.controller';

// Application Services
import { PaymentApplicationService } from './application/services/payment-application.service';
import { PaymentQueryService } from './application/services/payment-query.service';

// Domain Services
import { PaymentGatewayFactory } from './domain/services/payment-gateway.factory';
import { PaymentRiskService } from './domain/services/payment-risk.service';

// Infrastructure Services
import { DatabaseHealthService } from './infrastructure/health/database-health.service';
import { RedisHealthService } from './infrastructure/health/redis-health.service';
import { PaymentGatewayHealthService } from './infrastructure/health/payment-gateway-health.service';

// Mock Repository (should be replaced with actual implementation)
import { MockPaymentOrderRepository } from './infrastructure/repositories/mock-payment-order.repository';
import { PaymentOrderRepository } from './domain/repositories/payment-order.repository';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [PaymentController],
  providers: [
    // Application Services
    PaymentApplicationService,
    PaymentQueryService,

    // Domain Services
    PaymentGatewayFactory,
    PaymentRiskService,

    // Infrastructure Services
    DatabaseHealthService,
    RedisHealthService,
    PaymentGatewayHealthService,

    // Repositories
    {
      provide: 'PaymentOrderRepository',
      useClass: MockPaymentOrderRepository,
    },
  ],
  exports: [PaymentApplicationService, PaymentQueryService],
})
export class PaymentNewModule {}
