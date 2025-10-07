import { Module } from '@nestjs/common';
import { AggregationController } from './aggregation.controller';
import { AggregationService } from './aggregation.service';
import { SalesAnalyticsService } from './services/sales-analytics.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { ProductAnalyticsService } from './services/product-analytics.service';
import { ReportService } from './services/report.service';

@Module({
  controllers: [AggregationController],
  providers: [
    AggregationService,
    SalesAnalyticsService,
    UserAnalyticsService,
    ProductAnalyticsService,
    ReportService,
  ],
  exports: [AggregationService],
})
export class AggregationModule {}
