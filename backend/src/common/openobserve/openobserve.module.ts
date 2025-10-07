import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenObserveService } from './openobserve.service';

@Module({
  imports: [ConfigModule],
  providers: [OpenObserveService],
  exports: [OpenObserveService],
})
export class OpenObserveModule {}
