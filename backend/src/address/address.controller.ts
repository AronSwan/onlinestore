import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressQueueService } from './services/address-queue.service';
import { AddressCacheService } from './services/address-cache.service';
import { Job } from 'bull';
import { GeocodeJobData } from './services/address-queue.service';
import {
  GeocodeDto,
  ReverseGeocodeDto,
  BatchGeocodeDto,
  ValidateAddressDto,
  FormatAddressDto,
} from './dto/geocode.dto';

// 定义返回类型接口
export interface JobStatusResponse {
  success: boolean;
  data: {
    id: string | number;
    status: string;
    progress: any;
    result: any;
    error: string | null;
    createdAt: Date;
    processedAt: Date | null;
    finishedAt: Date | null;
  };
}

export interface QueueStatusResponse {
  success: boolean;
  data: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
}

@Controller('address')
export class AddressController {
  constructor(
    private readonly addressService: AddressService,
    private readonly queueService: AddressQueueService,
    private readonly cacheService: AddressCacheService,
  ) {}

  /**
   * 地理编码
   */
  @Post('geocode')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async geocode(@Body() request: GeocodeDto): Promise<any> {
    try {
      const results = await this.addressService.geocode(request.address, {
        countryCode: request.countryCode,
        language: request.language,
      });

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 反向地理编码
   */
  @Post('reverse-geocode')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async reverseGeocode(@Body() request: ReverseGeocodeDto): Promise<any> {
    try {
      const result = await this.addressService.reverseGeocode(request.latitude, request.longitude, {
        language: request.language,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 异步批量地理编码
   */
  @Post('geocode/batch')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async batchGeocode(@Body() request: BatchGeocodeDto): Promise<any> {
    try {
      const jobIds = await this.addressService.batchGeocode(request.addresses, {
        priority: request.priority,
      });

      return {
        success: true,
        data: {
          jobIds,
          message: `Submitted ${request.addresses.length} addresses for geocoding`,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 获取任务状态
   */
  @Get('job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string): Promise<JobStatusResponse> {
    try {
      const job = await this.queueService.getJob(jobId);

      if (!job) {
        throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: {
          id: job.id,
          status: await job.getState(),
          progress: job.progress(),
          result: job.returnvalue,
          error: job.failedReason || (null as string | null),
          createdAt: new Date(job.timestamp),
          processedAt: job.processedOn ? new Date(job.processedOn) : null,
          finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 获取队列状态
   */
  @Get('queue/status')
  async getQueueStatus(): Promise<QueueStatusResponse> {
    try {
      const status = await this.queueService.getQueueStatus();

      return {
        success: true,
        data: status,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 获取缓存统计
   */
  @Get('cache/stats')
  async getCacheStats(): Promise<any> {
    try {
      const stats = await this.cacheService.getStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 清理缓存
   */
  @Post('cache/cleanup')
  async cleanupCache(): Promise<any> {
    try {
      await this.cacheService.clear();

      return {
        success: true,
        message: 'Cache cleaned successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 验证地址
   */
  @Post('validate')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async validateAddress(@Body() request: ValidateAddressDto): Promise<any> {
    try {
      const result = await this.addressService.validateAddress(
        request.address,
        request.countryCode,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 格式化地址
   */
  @Post('format')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async formatAddress(@Body() request: FormatAddressDto): Promise<any> {
    try {
      const result = await this.addressService.formatAddress(request.address, request.countryCode);

      return {
        success: true,
        data: {
          formatted: result,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 健康检查
   */
  @Get('health')
  async healthCheck(): Promise<any> {
    try {
      const isHealthy = await this.addressService.healthCheck();

      return {
        success: true,
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
