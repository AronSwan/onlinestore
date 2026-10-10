import { Injectable, Logger } from '@nestjs/common';
import { ProviderNotConfiguredError } from './provider-not-configured.error';
import { ConfigService } from '@nestjs/config';

/**
 * 推送发送服务（通知域集成刀补刀 2026-10-10——原 TODO 假实现）
 *
 * 同 email 模式: PUSH_PROVIDER=none=日志模式零外发;接真服务时按 BACKLOG 挂账补 SDK。
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly configService: ConfigService) {}

  private getProvider(): string {
    const master = this.configService.get<{
      notification?: { push?: { provider: string } };
    }>('master');
    return master?.notification?.push?.provider ?? 'none';
  }

  private async sendOnce(
    target: string | number | undefined,
    title: string,
    body: string,
  ): Promise<void> {
    const provider = this.getProvider();
    if (provider === 'none') {
      this.logger.log(`[PUSH:none 模式] 收件=${target ?? '?'} 标题=${title} 内容=${body}`);
      return;
    }
    throw new ProviderNotConfiguredError('push', provider);
  }

  async sendPush(userId: string | number, title: string, content: string): Promise<void> {
    await this.sendOnce(userId, title, content);
  }

  async sendBulkPush(
    userIds: Array<string | number>,
    title: string,
    content: string,
  ): Promise<void> {
    for (const u of userIds) await this.sendOnce(u, title, content);
  }

  async sendPushToAll(title: string, content: string): Promise<void> {
    await this.sendOnce('all', title, content);
  }
}
