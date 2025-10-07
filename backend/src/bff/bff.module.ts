import { Module } from '@nestjs/common';
import { BffController } from './bff.controller';
import { BffService } from './bff.service';
import { CartModule } from '../cart/cart.module';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';
import { AggregationModule } from '../aggregation/aggregation.module';

@Module({
  imports: [CartModule, PaymentModule, NotificationModule, AggregationModule],
  controllers: [BffController],
  providers: [BffService],
  exports: [BffService],
})
export class BffModule {}
