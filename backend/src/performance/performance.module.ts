import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseOptimizerService } from './database-optimizer.service';
import { PerformanceController } from './performance.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [DatabaseOptimizerService],
  controllers: [PerformanceController],
  exports: [DatabaseOptimizerService],
})
export class PerformanceModule {}
