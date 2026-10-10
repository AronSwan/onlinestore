import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
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
const MAX_MAIL_LENGTH = 254; // RFC 5321 上限
const MAX_MAP_ENTRIES = 10_000; // 内存无界增长兜底（攻击者每发 1 个新 mail 吞 1 条）

/**
 * 邮箱验证码服务（邮件验证批 2026-10-10 补全——原 TODO 从未真发；验收 E 席 P1 整改）
 *
 * 语义四件 + 防护四件：
 * - 真发：经 EmailService（MAIL_PROVIDER=none 时日志模式，配 smtp 即真发）
 * - 重发冷却 60s：窗口内再发=429（冷却到期重发才覆盖旧码=旧码作废）
 * - 尝试上限 5 次：第 5 次错即作废
 * - 单次使用：验对即焚
 * - 邮件守门：service 层 typeof+长度校验（DTO @IsEmail 仅防 HTTP 入口，内部直调无拦）
 * - 内存兜底：超 MAX_MAP_ENTRIES 拒发；定时清理 TTL 过期条目（防 OOM）
 * - 日志脱敏：mail 不直拼日志（防日志基础设施 DoS 与 PII 泄露）
 * 存储=进程内存 Map（单实例部署；多实例需迁 Redis，键 login:mail:{mail}）
 */
@Injectable()
export class VerifyCodeService {
  private readonly logger = new Logger(VerifyCodeService.name);
  private readonly ttlMs = 5 * 60 * 1000;
  private static cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private readonly emailService: EmailService) {
    if (!VerifyCodeService.cleanupTimer) {
      VerifyCodeService.cleanupTimer = setInterval(() => VerifyCodeService.sweepExpired(), 60_000);
      // Node 进程关闭时不解引用 timer——进程退出自然回收
    }
  }

  private static sweepExpired(): void {
    const now = Date.now();
    for (const [key, rec] of memoryStore.entries()) {
      if (now > rec.expireAt) memoryStore.delete(key);
    }
  }

  private guardMail(rawMail: unknown): string {
    if (typeof rawMail !== 'string') {
      throw new BadRequestException('邮箱参数必须是字符串');
    }
    if (rawMail.length === 0 || rawMail.length > MAX_MAIL_LENGTH) {
      throw new BadRequestException(`邮箱长度需在 1–${MAX_MAIL_LENGTH} 之间`);
    }
    return rawMail;
  }

  private maskMail(mail: string): string {
    const atIdx = mail.indexOf('@');
    return atIdx > 0 ? `${mail.slice(0, Math.min(2, atIdx))}***${mail.slice(atIdx)}` : '***';
  }

  async sendLoginMailCode(rawMail: string): Promise<void> {
    const mail = this.guardMail(rawMail);
    const key = `login:mail:${mail}`;
    // 内存兜底：超阈值拒发（攻击者无法绕阈值继续吞内存）
    if (memoryStore.size >= MAX_MAP_ENTRIES && !memoryStore.has(key)) {
      throw new HttpException(
        '系统繁忙，验证码请求数已达上限，请稍后再试',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const existing = memoryStore.get(key);
    if (existing && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
      // 抛对象含 retryAfter:全局 filter 已支持透传为 Retry-After 响应头
      throw new HttpException(
        { message: `验证码发送过于频繁，请 ${waitSec} 秒后再试`, retryAfter: waitSec },
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
    this.logger.log(`验证码已发送: ${this.maskMail(mail)}（有效期 ${this.ttlMs / 60000} 分钟）`);
  }

  async verifyLoginMailCode(rawMail: string, code: string): Promise<boolean> {
    const mail = this.guardMail(rawMail);
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
      '<div style=”font-family:sans-serif;max-width:480px;margin:0 auto”>' +
      '<p>您好，您的验证码是：</p>' +
      `<p style=”font-size:28px;letter-spacing:6px;font-weight:700”>${code}</p>` +
      `<p>${this.ttlMs / 60000} 分钟内有效。若非本人操作请忽略本邮件。</p>` +
      '</div>'
    );
  }
}
