import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface NominatimSearchResult {
  place_id: string;
  licence: string;
  osm_type: string;
  osm_id: string;
  boundingbox: [string, string, string, string];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface NominatimReverseResult {
  place_id: string;
  licence: string;
  osm_type: string;
  osm_id: string;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox: [string, string, string, string];
}

export interface GeocodeOptions {
  countryCode?: string;
  language?: string;
  limit?: number;
  viewbox?: string;
  bounded?: boolean;
}

export interface ReverseGeocodeOptions {
  language?: string;
  zoom?: number;
  addressdetails?: boolean;
}

export interface StructuredSearchOptions {
  language?: string;
  limit?: number;
}

@Injectable()
export class NominatimService {
  private readonly logger = new Logger(NominatimService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  private readonly userAgent = 'CaddyStyleShoppingSite/1.0 (contact@example.com)';
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // 1 second between requests

  constructor() {
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'application/json',
      },
    });

    // 添加请求拦截器来实现速率限制
    this.httpClient.interceptors.request.use(async config => {
      await this.enforceRateLimit();
      return config;
    });

    // 添加响应拦截器来处理错误
    this.httpClient.interceptors.response.use(
      response => response,
      error => {
        this.logger.error(`Nominatim API error: ${error.message}`, error.stack);

        if (error.response?.status === 429) {
          throw new HttpException(
            'Rate limit exceeded. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        if (error.response?.status === 403) {
          throw new HttpException(
            'Access forbidden. Please check your usage policy compliance.',
            HttpStatus.FORBIDDEN,
          );
        }

        throw new HttpException(
          `Nominatim service error: ${error.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      },
    );
  }

  /**
   * 强制执行速率限制（每秒最多1个请求）
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      this.logger.debug(`Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * 搜索地址（别名方法，用于处理器兼容性）
   */
  async search(query: string, options: GeocodeOptions = {}): Promise<NominatimSearchResult[]> {
    return this.geocode(query, options);
  }

  /**
   * 地理编码：地址转坐标
   */
  async geocode(query: string, options: GeocodeOptions = {}): Promise<NominatimSearchResult[]> {
    try {
      this.logger.debug(`Geocoding query: ${query}`);

      const params: any = {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: options.limit || 5,
      };

      if (options.countryCode) {
        params.countrycodes = options.countryCode;
      }

      if (options.language) {
        params['accept-language'] = options.language;
      }

      if (options.viewbox) {
        params.viewbox = options.viewbox;
      }

      if (options.bounded) {
        params.bounded = 1;
      }

      const response: AxiosResponse<NominatimSearchResult[]> = await this.httpClient.get(
        '/search',
        {
          params,
        },
      );

      this.logger.debug(`Geocoding completed: ${response.data.length} results`);
      return response.data;
    } catch (error) {
      this.logger.error(`Geocoding failed for query: ${query}`, error.stack);
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
      this.logger.debug(`Reverse geocoding: ${lat}, ${lon}`);

      const params: any = {
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        addressdetails: options.addressdetails !== false ? 1 : 0,
      };

      if (options.language) {
        params['accept-language'] = options.language;
      }

      if (options.zoom !== undefined) {
        params.zoom = options.zoom;
      }

      const response: AxiosResponse<NominatimReverseResult> = await this.httpClient.get(
        '/reverse',
        {
          params,
        },
      );

      this.logger.debug(`Reverse geocoding completed`);
      return response.data;
    } catch (error) {
      this.logger.error(`Reverse geocoding failed for: ${lat}, ${lon}`, error.stack);
      throw error;
    }
  }

  /**
   * 结构化搜索
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
    options: StructuredSearchOptions = {},
  ): Promise<NominatimSearchResult[]> {
    try {
      this.logger.debug(`Structured search with components:`, addressComponents);

      const params: any = {
        format: 'json',
        addressdetails: 1,
        limit: options.limit || 5,
      };

      // 添加地址组件
      if (addressComponents.street) params.street = addressComponents.street;
      if (addressComponents.city) params.city = addressComponents.city;
      if (addressComponents.county) params.county = addressComponents.county;
      if (addressComponents.state) params.state = addressComponents.state;
      if (addressComponents.country) params.country = addressComponents.country;
      if (addressComponents.postalcode) params.postalcode = addressComponents.postalcode;

      if (options.language) {
        params['accept-language'] = options.language;
      }

      const response: AxiosResponse<NominatimSearchResult[]> = await this.httpClient.get(
        '/search',
        {
          params,
        },
      );

      this.logger.debug(`Structured search completed: ${response.data.length} results`);
      return response.data;
    } catch (error) {
      this.logger.error(`Structured search failed`, error.stack);
      throw error;
    }
  }

  /**
   * 获取地点详情
   */
  async getPlaceDetails(
    osmType: string,
    osmId: string,
    options: { language?: string } = {},
  ): Promise<NominatimSearchResult> {
    try {
      this.logger.debug(`Getting place details: ${osmType}/${osmId}`);

      const params: any = {
        osm_type: osmType,
        osm_id: osmId,
        format: 'json',
        addressdetails: 1,
      };

      if (options.language) {
        params['accept-language'] = options.language;
      }

      const response: AxiosResponse<NominatimSearchResult> = await this.httpClient.get('/lookup', {
        params,
      });

      this.logger.debug(`Place details retrieved`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get place details: ${osmType}/${osmId}`, error.stack);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      this.logger.debug(`Performing health check`);

      const response = await this.httpClient.get('/status', {
        timeout: 5000,
      });

      const isHealthy = response.status === 200;
      this.logger.debug(`Health check result: ${isHealthy ? 'healthy' : 'unhealthy'}`);

      return isHealthy;
    } catch (error) {
      this.logger.warn(`Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取服务状态
   */
  async getServiceStatus(): Promise<{
    available: boolean;
    responseTime?: number;
    lastCheck: Date;
  }> {
    const startTime = Date.now();
    const lastCheck = new Date();

    try {
      const available = await this.healthCheck();
      const responseTime = Date.now() - startTime;

      return {
        available,
        responseTime,
        lastCheck,
      };
    } catch (error) {
      return {
        available: false,
        lastCheck,
      };
    }
  }

  /**
   * 批量地理编码（带速率限制）
   */
  async batchGeocode(
    queries: string[],
    options: GeocodeOptions = {},
  ): Promise<Array<{ query: string; results: NominatimSearchResult[]; error?: string }>> {
    const results: Array<{ query: string; results: NominatimSearchResult[]; error?: string }> = [];

    for (const query of queries) {
      try {
        const geocodeResults = await this.geocode(query, options);
        results.push({
          query,
          results: geocodeResults,
        });
      } catch (error) {
        results.push({
          query,
          results: [],
          error: error.message,
        });
      }
    }

    return results;
  }
}
