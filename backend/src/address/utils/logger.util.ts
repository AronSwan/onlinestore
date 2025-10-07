import { Logger } from '@nestjs/common';

/**
 * 地址日志工具类 - 用于脱敏处理
 */
export class AddressLogger {
  private static readonly logger = new Logger('AddressService');

  /**
   * 脱敏地址信息
   */
  static sanitizeAddress(address: string): string {
    if (!address || address.length <= 10) {
      return address;
    }

    // 保留前3个和后3个字符，中间用***替代
    const start = address.substring(0, 3);
    const end = address.substring(address.length - 3);
    return `${start}***${end}`;
  }

  /**
   * 脱敏坐标信息
   */
  static sanitizeCoordinates(lat: number, lon: number): string {
    // 保留2位小数精度用于日志
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }

  /**
   * 记录地理编码日志
   */
  static logGeocode(address: string, success: boolean, resultCount?: number): void {
    const sanitizedAddress = this.sanitizeAddress(address);
    if (success) {
      this.logger.log(`Geocoding successful for ${sanitizedAddress}, found ${resultCount} results`);
    } else {
      this.logger.warn(`Geocoding failed for ${sanitizedAddress}`);
    }
  }

  /**
   * 记录反向地理编码日志
   */
  static logReverseGeocode(lat: number, lon: number, success: boolean): void {
    const sanitizedCoords = this.sanitizeCoordinates(lat, lon);
    if (success) {
      this.logger.log(`Reverse geocoding successful for ${sanitizedCoords}`);
    } else {
      this.logger.warn(`Reverse geocoding failed for ${sanitizedCoords}`);
    }
  }

  /**
   * 记录缓存操作日志
   */
  static logCacheOperation(operation: 'hit' | 'miss' | 'set', key: string): void {
    const sanitizedKey = this.sanitizeAddress(key);
    this.logger.debug(`Cache ${operation} for key: ${sanitizedKey}`);
  }

  /**
   * 记录错误日志
   */
  static logError(message: string, error: Error, context?: any): void {
    const sanitizedContext = context ? this.sanitizeAddress(JSON.stringify(context)) : '';
    this.logger.error(`${message} ${sanitizedContext}`, error.stack);
  }
}
