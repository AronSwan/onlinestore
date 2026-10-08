import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
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
  id: string | number;
  status: string;
  progress: any;
  result: any;
  error: string | null;
  createdAt: Date;
  processedAt: Date | null;
  finishedAt: Date | null;
}

export interface QueueStatusResponse {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
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

      return results; // S1契约批:废成功信封
    } catch (error) {
      throw new BadRequestException(error.message); // S1契约批:V-C信封错误半边源头消灭
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

      return result; // S1契约批:废成功信封
    } catch (error) {
      throw new BadRequestException(error.message); // S1契约批:V-C信封错误半边源头消灭
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

      return { jobIds, message: `Submitted ${request.addresses.length} addresses for geocoding` }; // S1契约批:废信封
    } catch (error) {
      throw new BadRequestException(error.message); // S1契约批:V-C信封错误半边源头消灭
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
        throw new NotFoundException('Job not found'); // S1契约批:形状交全局filter
      }

      return {
        id: job.id,
        status: await job.getState(),
        progress: job.progress(),
        result: job.returnvalue,
        error: job.failedReason || (null as string | null),
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      }; // S1契约批:废信封
    } catch (error) {
      throw new BadRequestException(error.message); // S1契约批:V-C信封错误半边源头消灭
    }
  }

  /**
   * 获取队列状态
   */
  @Get('queue/status')
  async getQueueStatus(): Promise<QueueStatusResponse> {
    try {
      // 双盲B1席修复：Redis 缺席时 bull 队列命令的 promise 永不落定（连接
      // 挂起无超时），原 try/catch 永不可达——15s/20s 超时挂死实测复现。
      // 3s race 兜底：超时按队列不可用降级，不再挂连接。
      const status = (await Promise.race([
        this.queueService.getQueueStatus(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error('队列服务不可用（Redis 未连接或响应超时）')), 3000),
        ),
      ])) as { waiting: number; active: number; completed: number; failed: number; delayed: number };

      return status; // S1契约批:废成功信封
    } catch (error) {
      throw new BadRequestException(error.message); // S1契约批:V-C信封错误半边源头消灭
    }
  }

  /**
   * 获取缓存统计
   */
  @Get('cache/stats')
  async getCacheStats(): Promise<any> {
    try {
      const stats = await this.cacheService.getStats();

      return stats; // S1契约批:废成功信封
    } catch (error) {
      throw new BadRequestException(error.message); // S1契约批:V-C信封错误半边源头消灭
    }
  }

  /**
   * 清理缓存
   */
  @Post('cache/cleanup')
  async cleanupCache(): Promise<any> {
    try {
      await this.cacheService.clear();

      return { message: 'Cache cleaned successfully' }; // S1契约批:废信封
    } catch (error) {
      throw new BadRequestException(error.message); // S1契约批:V-C信封错误半边源头消灭
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

      return result; // S1契约批:废成功信封
    } catch (error) {
      throw new BadRequestException(error.message); // S1契约批:V-C信封错误半边源头消灭
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

      return { formatted: result }; // S1契约批:废信封
    } catch (error) {
      throw new BadRequestException(error.message); // S1契约批:V-C信封错误半边源头消灭
    }
  }

  /**
   * 健康检查
   */
  @Get('health')
  async healthCheck(): Promise<any> {
    try {
      const isHealthy = await this.addressService.healthCheck();

      return { status: isHealthy ? 'healthy' : 'unhealthy', timestamp: new Date().toISOString() }; // S1契约批:废信封
    } catch (error) {
      throw new ServiceUnavailableException(error.message); // S1契约批:V-C消灭
    }
  }
}
