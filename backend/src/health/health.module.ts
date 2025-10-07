import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
// import { DatabaseHealthIndicator } from './indicators/database-health.indicator';
// import { RedisHealthIndicator } from './indicators/redis-health.indicator';
// import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule.forFeature([]),
    // RedisModule,
  ],
  controllers: [HealthController],
  providers: [
    // DatabaseHealthIndicator,
    // RedisHealthIndicator,
  ],
})
export class HealthModule {}
