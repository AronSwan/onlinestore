import { Injectable } from '@nestjs/common';
import { RateLimitService } from './services/rate-limit.service';
import { ApiKeyService } from './services/api-key.service';
import { RequestLogService } from './services/request-log.service';

@Injectable()
export class GatewayService {
  constructor(
    private rateLimitService: RateLimitService,
    private apiKeyService: ApiKeyService,
    private requestLogService: RequestLogService,
  ) {}

  /**
   * 验证API请求
   */
  async validateRequest(
    apiKey: string,
    clientIp: string,
    endpoint: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    // 1. 验证API Key
    const keyValid = await this.apiKeyService.validateApiKey(apiKey);
    if (!keyValid) {
      return { valid: false, reason: 'Invalid API key' };
    }

    // 2. 检查速率限制
    const rateLimitPassed = await this.rateLimitService.checkRateLimit(clientIp, endpoint);
    if (!rateLimitPassed) {
      return { valid: false, reason: 'Rate limit exceeded' };
    }

    // 3. 记录请求日志
    await this.requestLogService.logRequest(apiKey, clientIp, endpoint);

    return { valid: true };
  }

  /**
   * 获取API统计信息
   */
  async getApiStats(timeRange: string = '24h') {
    return {
      totalRequests: await this.requestLogService.getTotalRequests(timeRange),
      requestsByEndpoint: await this.requestLogService.getRequestsByEndpoint(timeRange),
      requestsByApiKey: await this.requestLogService.getRequestsByApiKey(timeRange),
      errorRate: await this.requestLogService.getErrorRate(timeRange),
    };
  }

  /**
   * 获取活跃API Key列表
   */
  async getActiveApiKeys() {
    return await this.apiKeyService.getActiveApiKeys();
  }
}
