import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckResult } from './health-check.service';
import { ExternalApiConfig } from './dependency-checkers.service';

/**
 * Noop 版本的依赖检查服务，用于在禁用依赖检查器时提供安全的占位实现。
 * - 返回空的依赖状态列表
 * - 对外部 API 检查器的添加/移除操作不执行任何动作
 */
@Injectable()
export class NoopDependencyCheckersService {
  private readonly logger = new Logger('NoopDependencyCheckersService');

  addExternalApiChecker(config: ExternalApiConfig): void {
    this.logger.log(`Noop addExternalApiChecker invoked for: ${config?.name}`);
    // 不执行任何实际注册逻辑
  }

  removeExternalApiChecker(name: string): void {
    this.logger.log(`Noop removeExternalApiChecker invoked for: ${name}`);
    // 不执行任何实际移除逻辑
  }

  async getDependencyStatus(): Promise<HealthCheckResult[]> {
    // 在禁用依赖检查器模式下，返回空列表表示无依赖检查结果
    return [];
  }
}