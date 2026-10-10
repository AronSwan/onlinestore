import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { randomInt } from 'crypto';
import { EmailService } from '../../notification/services/email.service';

interface VerifyCodeRecord {
  code: string;
  expireAt: number;
  attempts: number;
  sentAt: number;
}

const memoryStore = new Map<string, VerifyCodeRecord>();
const RESEND_COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 5;

/**
 * 邮箱验证码服务（邮件验证批 2026-10-10 补全——原 TODO 从未真发）
 *
 * 语义四件（业界标准：Clerk/Supabase/Auth0 对照，调研 2026-10-10）：
 * - 真发：经 EmailService（MAIL_PROVIDER=none 时日志模式，配 smtp 即真发）
 * - 重发冷却 60s：窗口内再发=429（冷却到期重发才覆盖旧码=旧码作废）
 * - 尝试上限 5 次：第 5 次错即作废（6 位码≈19.9bit 熵，靠上限+冷却补）
 * - 单次使用：验对即焚（消原版 5 分钟重放窗）
 * 存储=进程内存 Map（单实例部署；多实例需迁 Redis，键 login:mail:{mail}）
 */
@Injectable()
export class VerifyCodeService {
  private readonly logger = new Logger(VerifyCodeService.name);
  private readonly ttlMs = 5 * 60 * 1000;

  constructor(private readonly emailService: EmailService) {}

  async sendLoginMailCode(mail: string): Promise<void> {
    const key = `login:mail:${mail}`;
    const existing = memoryStore.get(key);
    if (existing && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
      throw new HttpException(
        `验证码发送过于频繁，请 ${waitSec} 秒后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const code = String(randomInt(100000, 999999));
    // 先发信后落账：发送失败不留码（fail-closed，防“码已存但用户没收到”的幽灵码）
    await this.emailService.sendHtmlEmail(mail, '您的登录验证码', this.renderTemplate(code));
    memoryStore.set(key, {
      code,
      expireAt: Date.now() + this.ttlMs,
      attempts: 0,
      sentAt: Date.now(),
    });
    this.logger.log(`验证码已发送: ${mail}（有效期 ${this.ttlMs / 60000} 分钟）`);
  }

  async verifyLoginMailCode(mail: string, code: string): Promise<boolean> {
    const key = `login:mail:${mail}`;
    const rec = memoryStore.get(key);
    if (!rec || Date.now() > rec.expireAt) {
      memoryStore.delete(key);
      return false;
    }
    if (rec.attempts >= MAX_ATTEMPTS) {
      memoryStore.delete(key); // 已锁死即作废，逼走重发流程
      return false;
    }
    if (rec.code === code) {
      memoryStore.delete(key); // 单次使用：验对即焚
      return true;
    }
    rec.attempts += 1;
    if (rec.attempts >= MAX_ATTEMPTS) {
      memoryStore.delete(key); // 第 5 次错即作废
    }
    return false;
  }

  private renderTemplate(code: string): string {
    return (
      '<div style="font-family:sans-serif;max-width:480px;margin:0 auto">' +
      '<p>您好，您的验证码是：</p>' +
      `<p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p>` +
      `<p>${this.ttlMs / 60000} 分钟内有效。若非本人操作请忽略本邮件。</p>` +
      '</div>'
    );
  }
}
