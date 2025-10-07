import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiGetResource } from '../common/decorators/api-docs.decorator';
import { DatabaseOptimizerService } from './database-optimizer.service';

@ApiTags('performance')
@Controller('performance')
export class PerformanceController {
  constructor(private readonly databaseOptimizer: DatabaseOptimizerService) {}

  @Get('metrics')
  @ApiGetResource(Object, 'API接口')
  async getCurrentMetrics() {
    return await this.databaseOptimizer.getCurrentPerformanceMetrics();
  }

  @Get('slow-queries')
  @ApiGetResource(Object, 'API接口')
  getSlowQueryStats() {
    return this.databaseOptimizer.getSlowQueryStats();
  }

  @Get('database-analysis')
  @ApiGetResource(Object, 'API接口')
  async getDatabaseAnalysis() {
    return await this.databaseOptimizer.analyzeTableStructure();
  }
}
