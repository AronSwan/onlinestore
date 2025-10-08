import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { RedisModule } from '../redis/redis.module';
import { MessagingModule } from '../messaging/messaging.module';
import { RedpandaHealthIndicator } from './redpanda.health';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule.forFeature([]),
    HttpModule,
    RedisModule,
    MessagingModule,
  ],
  controllers: [HealthController],
  providers: [
    RedpandaHealthIndicator,
  ],
})
export class HealthModule {}
