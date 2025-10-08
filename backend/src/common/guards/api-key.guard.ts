import { Injectable, CanActivate, ExecutionContext, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from '../cache/redis-cache.service';
import { TracingService } from '../tracing/tracing.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @Optional() private readonly redisCacheService?: RedisCacheService,
    @Optional() private readonly tracingService?: TracingService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());

    // If the route is marked as public, allow access
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.query.api_key;

    // Get the valid API key from environment variables
    const validApiKey = this.configService.get<string>('MONITORING_API_KEY');

    // If no API key is configured, deny access
    if (!validApiKey) {
      return false;
    }

    // Compare the provided API key with the valid one
    return apiKey === validApiKey;
  }
}
