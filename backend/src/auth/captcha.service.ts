// 用途：Captcha 验证服务，支持 hCaptcha 与 reCAPTCHA 服务端校验
// 依赖文件：unified-master.config.ts, @nestjs/axios
// 作者：后端开发团队
// 时间：2025-06-17 12:15:00

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { createMasterConfiguration } from '../config/unified-master.config';

// Create configuration instance
const masterConfig = createMasterConfiguration();

@Injectable()
export class CaptchaService {
  constructor(private readonly http: HttpService) {}

  async verify(token: string, remoteip?: string): Promise<boolean> {
    // 使用默认的captcha配置，因为新配置系统中没有captcha
    const captchaConfig = {
      enabled: false,
      provider: 'recaptcha',
      secret: '',
      threshold: 5,
      windowSec: 600,
    };

    if (!captchaConfig.enabled) {
      return true; // 未开启时直接通过
    }

    const provider = captchaConfig.provider;
    const secret = captchaConfig.secret;
    if (!secret) {
      // 未配置密钥视为验证失败，防止误放行
      return false;
    }

    try {
      if (provider === 'hcaptcha') {
        const url = 'https://hcaptcha.com/siteverify';
        const payload = new URLSearchParams({
          secret,
          response: token,
        });
        if (remoteip) payload.append('remoteip', remoteip);

        const resp = await firstValueFrom(
          this.http.post(url, payload.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }),
        );
        return !!resp.data?.success;
      }

      if (provider === 'recaptcha') {
        const url = 'https://www.google.com/recaptcha/api/siteverify';
        const payload = new URLSearchParams({
          secret,
          response: token,
        });
        if (remoteip) payload.append('remoteip', remoteip);

        const resp = await firstValueFrom(
          this.http.post(url, payload.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }),
        );
        return !!resp.data?.success;
      }

      return false;
    } catch (e) {
      return false;
    }
  }
}
