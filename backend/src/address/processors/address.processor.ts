import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { NominatimService } from '../services/nominatim.service';
import { AddressCacheService } from '../services/address-cache.service';
import { AddressService } from '../address.service';

export interface GeocodeJobData {
  address: string;
  userId?: string;
  requestId?: string;
}

@Injectable()
@Processor('address-geocoding')
export class AddressProcessor {
  private readonly logger = new Logger(AddressProcessor.name);

  constructor(
    private readonly nominatimService: NominatimService,
    private readonly addressCacheService: AddressCacheService,
    private readonly addressService: AddressService,
  ) {}

  @Process('geocode')
  async handleGeocoding(job: Job<GeocodeJobData>) {
    const { address, userId, requestId } = job.data;

    this.logger.log(`Processing geocoding job for address: ${address}`);

    try {
      // 检查缓存
      const cached = await this.addressCacheService.get(address);
      if (cached) {
        this.logger.log(`Cache hit for address: ${address}`);
        return cached;
      }

      // 调用 Nominatim API
      const results = await this.nominatimService.search(address);

      if (results.length > 0) {
        const result = results[0];

        // 保存到数据库
        const savedAddress = await this.addressService.createAddress({
          address: address,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          countryCode: result.address?.country_code?.toUpperCase(),
        });

        // 缓存结果
        await this.addressCacheService.set(address, savedAddress);

        this.logger.log(`Successfully geocoded address: ${address}`);
        return savedAddress;
      } else {
        this.logger.warn(`No results found for address: ${address}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error processing geocoding job: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('batch-geocode')
  async handleBatchGeocoding(job: Job<{ addresses: string[] }>) {
    const { addresses } = job.data;

    this.logger.log(`Processing batch geocoding job for ${addresses.length} addresses`);

    const results: Array<{
      address: string;
      result: any;
      success: boolean;
      error?: string;
    }> = [];

    for (const address of addresses) {
      try {
        // 使用队列处理单个地址（避免直接调用以保持速率限制）
        const result = await this.handleGeocoding({
          data: { address },
        } as Job<GeocodeJobData>);

        results.push({
          address,
          result,
          success: true,
        });

        // 注意：速率限制由 NominatimService 内部处理，这里不需要额外延迟
        // await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error(`Error geocoding address ${address}: ${error.message}`);
        results.push({
          address,
          result: null,
          error: error.message,
          success: false,
        });
      }
    }

    this.logger.log(
      `Completed batch geocoding: ${results.filter(r => r.success).length}/${addresses.length} successful`,
    );
    return results;
  }

  @Process('validate')
  async handleValidation(job: Job<{ address: string }>) {
    const { address } = job.data;

    this.logger.log(`Processing validation job for address: ${address}`);

    try {
      const result = await this.addressService.validateAddress(address);
      this.logger.log(`Successfully validated address: ${address}`);
      return result;
    } catch (error) {
      this.logger.error(`Error validating address: ${error.message}`, error.stack);
      throw error;
    }
  }
}
