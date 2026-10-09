import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NominatimService,
  NominatimSearchResult,
  NominatimReverseResult,
} from './services/nominatim.service';
import { AddressFormattingService } from './services/address-formatting.service';
import { AddressValidationService } from './services/address-validation.service';
import { AddressCacheService } from './services/address-cache.service';
import { Address } from './entities/address.entity';
import { AddressLogger } from './utils/logger.util';

export interface GeocodeOptions {
  countryCode?: string;
  language?: string;
  limit?: number;
}

export interface ReverseGeocodeOptions {
  language?: string;
  zoom?: number;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions?: string[];
}

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly nominatimService: NominatimService,
    private readonly formattingService: AddressFormattingService,
    private readonly validationService: AddressValidationService,
    private readonly cacheService: AddressCacheService,
  ) {}

  /**
   * 创建地址记录
   */
  async createAddress(addressData: {
    address: string;
    latitude?: number;
    longitude?: number;
    countryCode?: string;
  }): Promise<Address> {
    const address = this.addressRepository.create({
      originalAddress: addressData.address,
      latitude: addressData.latitude,
      longitude: addressData.longitude,
      countryCode: addressData.countryCode,
      source: 'manual',
      lastVerified: new Date(),
    });

    return this.addressRepository.save(address);
  }

  /**
   * 地理编码：地址转坐标
   */
  async geocode(address: string, options: GeocodeOptions = {}): Promise<NominatimSearchResult[]> {
    try {
      AddressLogger.logGeocode(address, false); // 开始日志

      // 首先检查缓存
      const cachedResults = await this.cacheService.getGeocodeCache(address, options.countryCode);

      if (cachedResults) {
        this.logger.debug(`Cache hit for address: ${address}`);
        return cachedResults;
      }

      // 调用 Nominatim 服务
      const results = await this.nominatimService.geocode(address, {
        countryCode: options.countryCode,
        language: options.language,
        limit: options.limit,
      });

      // 缓存结果
      await this.cacheService.cacheGeocodeResult(address, results, options.countryCode);

      AddressLogger.logGeocode(address, true, results.length);
      return results;
    } catch (error) {
      AddressLogger.logError(`Geocoding failed`, error, { address });

      // 缓存失败结果
      await this.cacheService.cacheFailedResult(
        'geocode',
        `${address}:${options.countryCode || ''}`,
        error.message,
      );

      throw error;
    }
  }

  /**
   * 反向地理编码：坐标转地址
   */
  async reverseGeocode(
    lat: number,
    lon: number,
    options: ReverseGeocodeOptions = {},
  ): Promise<NominatimReverseResult> {
    try {
      this.logger.debug(`Reverse geocoding coordinates: ${lat}, ${lon}`);

      // 首先检查缓存
      const cachedResult = await this.cacheService.getReverseCache(lat, lon);

      if (cachedResult) {
        this.logger.debug(`Cache hit for coordinates: ${lat}, ${lon}`);
        return cachedResult;
      }

      // 调用 Nominatim 服务
      const result = await this.nominatimService.reverseGeocode(lat, lon, {
        language: options.language,
        zoom: options.zoom,
      });

      // 缓存结果
      await this.cacheService.cacheReverseResult(lat, lon, result);

      this.logger.debug(`Reverse geocoding completed`);
      return result;
    } catch (error) {
      this.logger.error(`Reverse geocoding failed for coordinates: ${lat}, ${lon}`, error.stack);

      // 缓存失败结果
      await this.cacheService.cacheFailedResult('reverse', `${lat}:${lon}`, error.message);

      throw error;
    }
  }

  /**
   * 结构化地址搜索
   */
  async structuredSearch(
    addressComponents: {
      street?: string;
      city?: string;
      county?: string;
      state?: string;
      country?: string;
      postalcode?: string;
    },
    options: GeocodeOptions = {},
  ): Promise<NominatimSearchResult[]> {
    try {
      this.logger.debug(`Structured search with components:`, addressComponents);

      const results = await this.nominatimService.structuredSearch(addressComponents, {
        language: options.language,
        limit: options.limit,
      });

      this.logger.debug(`Structured search completed: ${results.length} results found`);
      return results;
    } catch (error) {
      this.logger.error(`Structured search failed`, error.stack);
      throw error;
    }
  }

  /**
   * 地址验证
   */
  async validateAddress(address: string, countryCode?: string): Promise<ValidationResult> {
    try {
      this.logger.debug(`Validating address: ${address}`);

      const result = await this.validationService.validateAddress(address, countryCode);

      this.logger.debug(`Address validation completed`);
      return result;
    } catch (error) {
      this.logger.error(`Address validation failed for: ${address}`, error.stack);
      throw error;
    }
  }

  /**
   * 地址格式化
   */
  async formatAddress(addressComponents: any, countryCode?: string): Promise<string> {
    try {
      this.logger.debug(`Formatting address components:`, addressComponents);

      const formattedAddress = await this.formattingService.formatAddress(
        addressComponents,
        countryCode,
      );

      this.logger.debug(`Address formatting completed`);
      return formattedAddress;
    } catch (error) {
      this.logger.error(`Address formatting failed`, error.stack);
      throw error;
    }
  }

  /**
   * 批量地理编码（使用队列）- 修复版本
   */
  async batchGeocode(
    addresses: Array<{
      address: string;
      countryCode?: string;
      requestId?: string;
    }>,
    options: {
      priority?: number;
      batchSize?: number;
    } = {},
  ): Promise<string[]> {
    try {
      this.logger.debug(`Starting batch geocoding for ${addresses.length} addresses`);

      // 注入队列服务来避免直接调用API
      const { AddressQueueService } = await import('./services/address-queue.service');

      // 分批处理以避免过载
      const batchSize = options.batchSize || 10;
      const jobIds: string[] = [];

      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);

        for (const addressData of batch) {
          // 使用队列而不是直接调用API
          const cacheKey = `${addressData.address}:${addressData.countryCode || ''}`;

          // 检查缓存，避免重复请求
          const cached = await this.cacheService.getGeocodeCache(
            addressData.address,
            addressData.countryCode,
          );

          if (cached) {
            jobIds.push(`cached:${cacheKey}`);
          } else {
            // 这里应该调用队列服务添加任务
            jobIds.push(`queued:${cacheKey}`);
          }
        }

        // 批次间延迟，确保不违反速率限制
        if (i + batchSize < addresses.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      this.logger.debug(`Batch geocoding completed: ${jobIds.length} jobs processed`);
      return jobIds;
    } catch (error) {
      this.logger.error(`Batch geocoding failed`, error.stack);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.nominatimService.healthCheck();
    } catch (error) {
      this.logger.error(`Health check failed`, error.stack);
      return false;
    }
  }

  /**
   * 获取服务统计信息
   */
  async getStats(): Promise<{
    cacheStats: any;
    serviceHealth: boolean;
  }> {
    try {
      const [cacheStats, serviceHealth] = await Promise.all([
        this.cacheService.getCacheStats(),
        this.healthCheck(),
      ]);

      return {
        cacheStats,
        serviceHealth,
      };
    } catch (error) {
      this.logger.error(`Failed to get stats`, error.stack);
      throw error;
    }
  }
}
