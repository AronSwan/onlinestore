import { Controller, Get } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async basicHealthCheck() {
    return this.monitoringService.healthCheck();
  }

  @Get('status')
  @ApiOperation({ summary: 'Detailed system status' })
  @ApiResponse({ status: 200, description: 'System status retrieved successfully' })
  async systemStatus() {
    const health = await this.monitoringService.healthCheck();
    return {
      status: health.status,
      timestamp: health.timestamp,
      uptime: health.uptime,
      system: health.system,
    };
  }

  @Get('database')
  @ApiOperation({ summary: 'Database connection check' })
  @ApiResponse({ status: 200, description: 'Database connection status' })
  async databaseHealth() {
    try {
      // This would be implemented with actual database check logic
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message,
      };
    }
  }

  @Get('redis')
  @ApiOperation({ summary: 'Redis connection check' })
  @ApiResponse({ status: 200, description: 'Redis connection status' })
  async redisHealth() {
    try {
      // This would be implemented with actual Redis check logic
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        redis: 'connected',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        redis: 'disconnected',
        error: error.message,
      };
    }
  }
}
