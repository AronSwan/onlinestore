import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { RateLimitService } from './services/rate-limit.service';
import { ApiKeyService } from './services/api-key.service';
import { RequestLogService } from './services/request-log.service';

@Module({
  controllers: [GatewayController],
  providers: [GatewayService, RateLimitService, ApiKeyService, RequestLogService],
  exports: [GatewayService],
})
export class GatewayModule {}
