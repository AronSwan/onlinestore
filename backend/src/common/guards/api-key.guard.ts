import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
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
