import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderNotConfiguredError } from './provider-not-configured.error';

/**
 * 短信发送服务（通知域集成刀补刀 2026-10-10——原 TODO 假实现）
 *
 * 同 email 模式: SMS_PROVIDER=none（默认）=日志模式零外发——本地零配置可跑；
 * provider=aliyun|tencent 接真服务时调用 SDK（依赖未装前抛 ProviderNotConfiguredError，
 * 由接入批补 SDK）。单实例部署。
 * 预期: SMS 通道 SDK 接入批，W-1刀2/3 之后或独立小刀（BACKLOG 挂账）。
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  private getProvider(): string {
    const master = this.configService.get<{
      notification?: { sms?: { provider: string } };
    }>('master');
    return master?.notification?.sms?.provider ?? 'none';
  }

  private async sendOnce(target: string | undefined, body: string): Promise<void> {
    const provider = this.getProvider();
    if (provider === 'none') {
      this.logger.log(`[SMS:none 模式] 收件=${target ?? '?'} 内容=${body}`);
      return;
    }
    // 接入批实现: provider=aliyun 调 @alicloud/dysmsapi20170525, provider=tencent 调 tencentcloud-sdk-nodejs-sms
    throw new ProviderNotConfiguredError('sms', provider);
  }

  async sendSms(phone: string, content: string): Promise<void> {
    await this.sendOnce(phone, content);
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    await this.sendOnce(phone, `[验证码] ${code}`);
  }

  async sendBulkSms(phones: string[], content: string): Promise<void> {
    for (const p of phones) await this.sendOnce(p, content);
  }
}
