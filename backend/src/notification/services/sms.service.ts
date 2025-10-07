import { Injectable } from '@nestjs/common';

@Injectable()
export class SmsService {
  /**
   * 发送短信
   */
  async sendSms(phone: string, content: string): Promise<void> {
    // TODO: 集成短信服务提供商（如阿里云短信、腾讯云短信等）
    console.log(`发送短信到 ${phone}: ${content}`);

    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * 发送验证码短信
   */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const content = `您的验证码是：${code}，5分钟内有效，请勿泄露给他人。`;
    await this.sendSms(phone, content);
  }

  /**
   * 批量发送短信
   */
  async sendBulkSms(phones: string[], content: string): Promise<void> {
    // TODO: 批量发送短信
    console.log(`批量发送短信给 ${phones.length} 个号码: ${content}`);

    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
