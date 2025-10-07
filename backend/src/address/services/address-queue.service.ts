import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { NominatimService, NominatimSearchResult } from './nominatim.service';
import { AddressCacheService } from './address-cache.service';

export interface GeocodeJobData {
  address: string;
  countryCode?: string;
  priority?: number;
  requestId?: string;
  userId?: string;
}

export interface GeocodeJobResult {
  success: boolean;
  results?: NominatimSearchResult[];
  error?: string;
  cached?: boolean;
}

@Injectable()
export class AddressQueueService {
  private readonly logger = new Logger(AddressQueueService.name);

  constructor(
    @InjectQueue('address-geocoding') private geocodingQueue: Queue<GeocodeJobData>,
    private readonly nominatimService: NominatimService,
    private readonly cacheService: AddressCacheService,
  ) {}

  /**
   * 添加地理编码任务到队列
   */
  async addGeocodeJob(
    address: string,
    options: {
      countryCode?: string;
      priority?: number;
      delay?: number;
      requestId?: string;
      userId?: string;
    } = {},
  ): Promise<Job<GeocodeJobData>> {
    const jobData: GeocodeJobData = {
      address,
      countryCode: options.countryCode,
      priority: options.priority || 0,
      requestId: options.requestId,
      userId: options.userId,
    };

    const jobOptions = {
      priority: options.priority || 0,
      delay: options.delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    };

    try {
      const job = await this.geocodingQueue.add('geocode', jobData, jobOptions);
      this.logger.log(`Added geocode job ${job.id} for address: ${address}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to add geocode job: ${error.message}`);
      throw error;
    }
  }

  /**
   * 批量添加地理编码任务
   */
  async addBatchGeocodeJobs(
    addresses: Array<{
      address: string;
      countryCode?: string;
      requestId?: string;
      userId?: string;
    }>,
    options: {
      priority?: number;
      batchSize?: number;
      delayBetweenBatches?: number;
    } = {},
  ): Promise<Job<GeocodeJobData>[]> {
    const batchSize = options.batchSize || 10;
    const jobs: Job<GeocodeJobData>[] = [];

    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);

      for (const addressData of batch) {
        const job = await this.addGeocodeJob(addressData.address, {
          countryCode: addressData.countryCode,
          priority: options.priority,
          requestId: addressData.requestId,
          userId: addressData.userId,
        });
        jobs.push(job);
      }

      // 批次间延迟
      if (i + batchSize < addresses.length && options.delayBetweenBatches) {
        await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
      }
    }

    return jobs;
  }

  /**
   * 处理地理编码任务
   */
  async processGeocodeJob(job: Job<GeocodeJobData>): Promise<GeocodeJobResult> {
    const { address } = job.data;

    try {
      // 检查缓存 - 使用统一的缓存键格式
      const cached = await this.cacheService.get(address);

      if (cached) {
        // 将 Address 转换为 NominatimSearchResult 格式
        const result: NominatimSearchResult = {
          place_id: cached.placeId || '',
          licence: 'Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright',
          osm_type: cached.osmType || 'unknown',
          osm_id: cached.osmId || '',
          boundingbox: ['0', '0', '0', '0'],
          lat: cached.latitude?.toString() || '0',
          lon: cached.longitude?.toString() || '0',
          display_name: cached.formattedAddress || cached.rawAddress || '',
          class: 'unknown',
          type: 'unknown',
          importance: cached.importance || 0,
        };
        return { success: true, results: [result] };
      }

      // 执行地理编码
      const results = await this.nominatimService.geocode(address);

      // 缓存结果 - 将 NominatimSearchResult 转换为 Address 格式
      if (results && results.length > 0) {
        const firstResult = results[0];
        const addressEntity = {
          originalAddress: address,
          formattedAddress: firstResult.display_name,
          latitude: parseFloat(firstResult.lat),
          longitude: parseFloat(firstResult.lon),
          countryCode: firstResult.address?.country_code?.toUpperCase(),
          country: firstResult.address?.country,
          state: firstResult.address?.state,
          city: firstResult.address?.city,
          street: firstResult.address?.road,
          houseNumber: firstResult.address?.house_number,
          postalCode: firstResult.address?.postcode,
          placeId: firstResult.place_id,
          osmType: firstResult.osm_type,
          osmId: firstResult.osm_id,
          importance: firstResult.importance,
          source: 'nominatim',
          lastVerified: new Date(),
        };
        await this.cacheService.set(address, addressEntity as any);
      }

      return { success: true, results };
    } catch (error) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.geocodingQueue.getWaiting(),
      this.geocodingQueue.getActive(),
      this.geocodingQueue.getCompleted(),
      this.geocodingQueue.getFailed(),
      this.geocodingQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  /**
   * 清理队列
   */
  async cleanQueue(): Promise<void> {
    await this.geocodingQueue.clean(0, 'completed');
    await this.geocodingQueue.clean(0, 'failed');
  }

  /**
   * 暂停队列
   */
  async pauseQueue(): Promise<void> {
    await this.geocodingQueue.pause();
  }

  /**
   * 恢复队列
   */
  async resumeQueue(): Promise<void> {
    await this.geocodingQueue.resume();
  }

  /**
   * 获取任务
   */
  async getJob(jobId: string): Promise<Job<GeocodeJobData> | null> {
    try {
      return await this.geocodingQueue.getJob(jobId);
    } catch (error) {
      this.logger.error(`Failed to get job ${jobId}: ${error.message}`);
      return null;
    }
  }

  /**
   * 重试失败的任务
   */
  async retryFailedJobs(): Promise<void> {
    const failedJobs = await this.geocodingQueue.getFailed();

    for (const job of failedJobs) {
      await job.retry();
    }
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.geocodingQueue.getWaiting(),
      this.geocodingQueue.getActive(),
      this.geocodingQueue.getCompleted(),
      this.geocodingQueue.getFailed(),
      this.geocodingQueue.getDelayed(),
    ]);

    const cacheStats = await this.cacheService.getCacheStats();

    return {
      queue: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      },
      cache: cacheStats,
    };
  }
}
