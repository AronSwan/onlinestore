import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { ApiGetResource, ApiCreateResource } from '../common/decorators/api-docs.decorator';
import { GatewayService } from './gateway.service';
import { RateLimitService } from './services/rate-limit.service';
import { ApiKeyService } from './services/api-key.service';

@ApiTags('gateway')
@Controller('gateway')
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly rateLimitService: RateLimitService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  @Get('stats')
  @ApiGetResource(Object, 'API接口')
  async getApiStats(@Query('timeRange') timeRange: string = '24h') {
    return await this.gatewayService.getApiStats(timeRange);
  }

  @Get('rate-limit/stats')
  @ApiGetResource(Object, 'API接口')
  async getRateLimitStats() {
    return await this.rateLimitService.getRateLimitStats();
  }

  @Get('api-keys')
  @ApiGetResource(Object, 'API接口')
  async getActiveApiKeys() {
    return await this.gatewayService.getActiveApiKeys();
  }

  @Post('api-keys')
  @ApiCreateResource(Object, Object, '创建资源')
  async createApiKey(@Body() createApiKeyDto: { name: string; permissions?: string[] }) {
    const apiKey = await this.apiKeyService.createApiKey(
      createApiKeyDto.name,
      createApiKeyDto.permissions,
    );

    return {
      apiKey,
      message: 'API密钥创建成功',
    };
  }

  @Post('api-keys/:apiKey/revoke')
  @ApiCreateResource(Object, Object, '创建资源')
  async revokeApiKey(@Param('apiKey') apiKey: string) {
    await this.apiKeyService.revokeApiKey(apiKey);

    return {
      message: 'API密钥已撤销',
    };
  }

  @Get('api-keys/:apiKey/info')
  @ApiGetResource(Object, 'API接口')
  async getApiKeyInfo(@Param('apiKey') apiKey: string) {
    const keyInfo = await this.apiKeyService.getApiKeyInfo(apiKey);
    if (!keyInfo) {
      throw new Error('API密钥不存在');
    }
    return keyInfo;
  }

  @Post('validate')
  @ApiCreateResource(Object, Object, '创建资源')
  async validateRequest(
    @Body() validateDto: { apiKey: string; clientIp: string; endpoint: string },
  ) {
    const isValid = await this.gatewayService.validateRequest(
      validateDto.apiKey,
      validateDto.clientIp,
      validateDto.endpoint,
    );
    return {
      isValid: isValid.valid,
      message: isValid.valid ? '请求验证通过' : `请求验证失败: ${isValid.reason}`,
    };
  }

  @Get('rate-limit/remaining')
  @ApiGetResource(Object, 'API接口')
  async getRemainingRequests(
    @Query('clientIp') clientIp: string,
    @Query('endpoint') endpoint: string,
    @Query('limit') limit?: number,
  ) {
    return await this.rateLimitService.getRemainingRequests(clientIp, endpoint, limit);
  }
}
