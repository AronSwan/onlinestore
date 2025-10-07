import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Address } from '../entities/address.entity';
import { NominatimSearchResult, NominatimReverseResult } from './nominatim.service';

export interface CacheConfig {
  geocodeTTL: number;
  reverseTTL: number;
  failedTTL: number;
}

export interface GeocodeCache {
  results: NominatimSearchResult[];
  timestamp: number;
  source: 'nominatim' | 'manual';
}

export interface ReverseGeocodeCache {
  result: NominatimReverseResult;
  timestamp: number;
  source: 'nominatim' | 'manual';
}

@Injectable()
export class AddressCacheService {
  private readonly logger = new Logger(AddressCacheService.name);
  private readonly redis: Redis;
  private readonly config: CacheConfig;

  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly configService: ConfigService,
  ) {
    // 从配置中读取缓存TTL设置
    this.config = {
      geocodeTTL: this.configService.get('address.cache.geocodeTTL', 30 * 24 * 60 * 60),
      reverseTTL: this.configService.get('address.cache.reverseTTL', 7 * 24 * 60 * 60),
      failedTTL: this.configService.get('address.cache.failedTTL', 4 * 60 * 60),
    };

    // 初始化 Redis 连接
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      db: this.configService.get('REDIS_DB', 0),
    });
  }

  /**
   * 生成地理编码缓存键 - 改进版本，包含更多上下文
   */
  private getGeocodeKey(address: string, countryCode?: string): string {
    const normalizedAddress = this.normalizeAddress(address);
    const suffix = countryCode ? `:${countryCode}` : '';
    // 添加地址长度作为额外的区分因子
    const lengthSuffix = `:len${address.length}`;
    return `geocode:${normalizedAddress}${suffix}${lengthSuffix}`;
  }

  /**
   * 生成反向地理编码缓存键
   */
  private getReverseKey(lat: number, lon: number, precision = 6): string {
    const roundedLat = Number(lat.toFixed(precision));
    const roundedLon = Number(lon.toFixed(precision));
    return `reverse:${roundedLat}:${roundedLon}`;
  }

  /**
   * 生成失败缓存键
   */
  private getFailedKey(type: 'geocode' | 'reverse', key: string): string {
    return `failed:${type}:${key}`;
  }

  /**
   * 标准化地址字符串 - 改进版本，保留更多地址特征
   */
  private normalizeAddress(address: string): string {
    const cleaned = address
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u4e00-\u9fff]/g, '');

    const components = cleaned.split(' ').filter(c => c.length > 0);
    return components.sort().join('|');
  }

  /**
   * 简化的获取方法（用于处理器）
   */
  async get(address: string): Promise<Address | null> {
    const results = await this.getGeocodeCache(address);
    if (results && results.length > 0) {
      // 转换为 Address 实体
      const result = results[0];
      const address_entity = new Address();
      address_entity.originalAddress = address;
      address_entity.formattedAddress = result.display_name;
      address_entity.latitude = parseFloat(result.lat);
      address_entity.longitude = parseFloat(result.lon);
      address_entity.countryCode = result.address?.country_code?.toUpperCase();
      address_entity.osmType = result.osm_type;
      address_entity.osmId = result.osm_id;
      address_entity.importance = result.importance;
      return address_entity;
    }
    return null;
  }

  /**
   * 简化的设置方法（用于处理器）
   */
  async set(address: string, addressData: Partial<Address>): Promise<void> {
    // 转换为 NominatimSearchResult 格式
    const result: NominatimSearchResult = {
      place_id: addressData.placeId || '',
      licence: 'Data © OpenStreetMap contributors',
      osm_type: addressData.osmType || '',
      osm_id: addressData.osmId || '',
      lat: (addressData.latitude || 0).toString(),
      lon: (addressData.longitude || 0).toString(),
      class: 'place',
      type: 'house',
      display_name: addressData.formattedAddress || '',
      address: {
        house_number: addressData.houseNumber,
        road: addressData.street,
        city: addressData.city,
        state: addressData.state,
        postcode: addressData.postalCode,
        country: addressData.country,
        country_code: addressData.countryCode?.toLowerCase(),
      },
      boundingbox: ['0', '0', '0', '0'],
      importance: addressData.importance || 0,
    };

    await this.cacheGeocodeResult(address, [result], addressData.countryCode);
  }

  /**
   * 缓存地理编码结果
   */
  async cacheGeocodeResult(
    address: string,
    results: NominatimSearchResult[],
    countryCode?: string,
    source: 'nominatim' | 'manual' = 'nominatim',
  ): Promise<void> {
    try {
      const key = this.getGeocodeKey(address, countryCode);
      const cacheData: GeocodeCache = {
        results,
        timestamp: Date.now(),
        source,
      };

      // Redis 缓存
      await this.redis.setex(key, this.config.geocodeTTL, JSON.stringify(cacheData));

      // 数据库缓存（仅缓存最佳结果）
      if (results.length > 0) {
        await this.saveToDatabase(address, results[0], countryCode);
      }

      this.logger.debug(`Cached geocode result for: ${address}`);
    } catch (error) {
      this.logger.error(`Failed to cache geocode result: ${error.message}`);
    }
  }

  /**
   * 获取地理编码缓存
   */
  async getGeocodeCache(
    address: string,
    countryCode?: string,
  ): Promise<NominatimSearchResult[] | null> {
    try {
      const key = this.getGeocodeKey(address, countryCode);

      // 检查失败缓存
      const failedKey = this.getFailedKey('geocode', key);
      const isFailed = await this.redis.exists(failedKey);
      if (isFailed) {
        this.logger.debug(`Address in failed cache: ${address}`);
        return null;
      }

      // 尝试 Redis 缓存
      const cached = await this.redis.get(key);
      if (cached) {
        const cacheData: GeocodeCache = JSON.parse(cached);
        this.logger.debug(`Cache hit for geocode: ${address}`);
        return cacheData.results;
      }

      // 尝试数据库缓存
      const dbResult = await this.getFromDatabase(address, countryCode);
      if (dbResult) {
        this.logger.debug(`Database cache hit for geocode: ${address}`);
        // 重新缓存到 Redis
        await this.cacheGeocodeResult(address, [dbResult], countryCode, 'manual');
        return [dbResult];
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get geocode cache: ${error.message}`);
      return null;
    }
  }

  /**
   * 缓存反向地理编码结果
   */
  async cacheReverseResult(
    lat: number,
    lon: number,
    result: NominatimReverseResult,
    source: 'nominatim' | 'manual' = 'nominatim',
  ): Promise<void> {
    try {
      const key = this.getReverseKey(lat, lon);
      const cacheData: ReverseGeocodeCache = {
        result,
        timestamp: Date.now(),
        source,
      };

      await this.redis.setex(key, this.config.reverseTTL, JSON.stringify(cacheData));

      this.logger.debug(`Cached reverse geocode result for: ${lat}, ${lon}`);
    } catch (error) {
      this.logger.error(`Failed to cache reverse geocode result: ${error.message}`);
    }
  }

  /**
   * 获取反向地理编码缓存
   */
  async getReverseCache(lat: number, lon: number): Promise<NominatimReverseResult | null> {
    try {
      const key = this.getReverseKey(lat, lon);

      // 检查失败缓存
      const failedKey = this.getFailedKey('reverse', key);
      const isFailed = await this.redis.exists(failedKey);
      if (isFailed) {
        this.logger.debug(`Coordinates in failed cache: ${lat}, ${lon}`);
        return null;
      }

      const cached = await this.redis.get(key);
      if (cached) {
        const cacheData: ReverseGeocodeCache = JSON.parse(cached);
        this.logger.debug(`Cache hit for reverse geocode: ${lat}, ${lon}`);
        return cacheData.result;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get reverse geocode cache: ${error.message}`);
      return null;
    }
  }

  /**
   * 缓存失败结果
   */
  async cacheFailedResult(type: 'geocode' | 'reverse', key: string, error: string): Promise<void> {
    try {
      const failedKey = this.getFailedKey(type, key);
      await this.redis.setex(failedKey, this.config.failedTTL, error);
      this.logger.debug(`Cached failed result: ${failedKey}`);
    } catch (error) {
      this.logger.error(`Failed to cache failed result: ${error.message}`);
    }
  }

  /**
   * 保存到数据库
   */
  private async saveToDatabase(
    originalAddress: string,
    result: NominatimSearchResult,
    countryCode?: string,
  ): Promise<void> {
    try {
      const existingAddress = await this.addressRepository.findOne({
        where: {
          originalAddress: this.normalizeAddress(originalAddress),
          countryCode,
        },
      });

      if (!existingAddress) {
        const address = this.addressRepository.create({
          originalAddress: this.normalizeAddress(originalAddress),
          formattedAddress: result.display_name,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          countryCode: result.address?.country_code?.toUpperCase(),
          country: result.address?.country,
          state: result.address?.state,
          city: result.address?.city,
          street: result.address?.road,
          houseNumber: result.address?.house_number,
          postalCode: result.address?.postcode,
          placeId: result.place_id,
          osmType: result.osm_type,
          osmId: result.osm_id,
          importance: result.importance,
          source: 'nominatim',
          lastVerified: new Date(),
        });

        await this.addressRepository.save(address);
      }
    } catch (error) {
      this.logger.error(`Failed to save to database: ${error.message}`);
    }
  }

  /**
   * 从数据库获取
   */
  private async getFromDatabase(
    address: string,
    countryCode?: string,
  ): Promise<NominatimSearchResult | null> {
    try {
      const normalizedAddress = this.normalizeAddress(address);

      // 精确匹配
      let dbAddress = await this.addressRepository.findOne({
        where: {
          originalAddress: normalizedAddress,
          countryCode,
        },
      });

      // 模糊匹配
      if (!dbAddress) {
        const addresses = await this.addressRepository
          .createQueryBuilder('address')
          .where('LOWER(address.originalAddress) LIKE :address', {
            address: `%${normalizedAddress}%`,
          })
          .andWhere(countryCode ? 'address.countryCode = :countryCode' : '1=1', {
            countryCode,
          })
          .orderBy('address.importance', 'DESC')
          .limit(1)
          .getOne();

        dbAddress = addresses;
      }

      if (dbAddress) {
        return {
          place_id: dbAddress.placeId || '',
          licence: 'Data © OpenStreetMap contributors',
          osm_type: dbAddress.osmType || '',
          osm_id: dbAddress.osmId || '',
          lat: dbAddress.latitude.toString(),
          lon: dbAddress.longitude.toString(),
          class: 'place',
          type: 'house',
          display_name: dbAddress.formattedAddress,
          address: {
            house_number: dbAddress.houseNumber,
            road: dbAddress.street,
            city: dbAddress.city,
            state: dbAddress.state,
            postcode: dbAddress.postalCode,
            country: dbAddress.country,
            country_code: dbAddress.countryCode?.toLowerCase(),
          },
          boundingbox: ['', '', '', ''],
          importance: dbAddress.importance || 0,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get from database: ${error.message}`);
      return null;
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      // 清理过期的数据库记录（超过90天未验证）
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      await this.addressRepository
        .createQueryBuilder()
        .delete()
        .where('lastVerified < :date', { date: ninetyDaysAgo })
        .andWhere('source = :source', { source: 'nominatim' })
        .execute();

      this.logger.debug('Cleaned up expired cache entries');
    } catch (error) {
      this.logger.error(`Failed to cleanup expired cache: ${error.message}`);
    }
  }

  /**
   * 获取缓存统计（别名方法）
   */
  async getStats(): Promise<{
    redisKeys: number;
    dbEntries: number;
    failedEntries: number;
  }> {
    return this.getCacheStats();
  }

  /**
   * 清理所有缓存
   */
  async clear(): Promise<void> {
    try {
      // 清理 Redis 缓存
      const keys = await this.redis.keys('geocode:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      const reverseKeys = await this.redis.keys('reverse:*');
      if (reverseKeys.length > 0) {
        await this.redis.del(...reverseKeys);
      }

      const failedKeys = await this.redis.keys('failed:*');
      if (failedKeys.length > 0) {
        await this.redis.del(...failedKeys);
      }

      this.logger.debug('All cache cleared successfully');
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<{
    redisKeys: number;
    dbEntries: number;
    failedEntries: number;
  }> {
    try {
      const redisKeys = (await this.redis.eval(
        `return #redis.call('keys', ARGV[1])`,
        0,
        'geocode:*',
      )) as number;

      const dbEntries = await this.addressRepository.count();

      const failedEntries = (await this.redis.eval(
        `return #redis.call('keys', ARGV[1])`,
        0,
        'failed:*',
      )) as number;

      return { redisKeys, dbEntries, failedEntries };
    } catch (error) {
      this.logger.error(`Failed to get cache stats: ${error.message}`);
      return { redisKeys: 0, dbEntries: 0, failedEntries: 0 };
    }
  }
}
