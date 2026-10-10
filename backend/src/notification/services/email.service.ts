import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * 邮件发送服务（邮件验证批 2026-10-10，用户裁决"真发验证码邮件"方案 C）
 *
 * MAIL_PROVIDER=none（默认）＝日志模式零外发——本地零配置可跑、行为与
 * 改造前的桩一致（记日志）；配置 smtp+MAIL_* 后真发（nodemailer，465=
 * 隐式 TLS/587=STARTTLS）。sendgrid 分支保留配置位（apiKey 未接，接时补）。
 * 单实例部署；多实例时 transporter 随进程各持一份即可（无共享态）。
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private transporterInit = false;

  constructor(private readonly configService: ConfigService) {}

  private getMailConfig(): {
    provider: string;
    host?: string;
    port: number;
    user?: string;
    pass?: string;
    from?: string;
  } {
    const master = this.configService.get<{
      mail?: {
        provider: string;
        host?: string;
        port: number;
        user?: string;
        pass?: string;
        from?: string;
      };
    }>('master');
    return master?.mail ?? { provider: 'none', port: 465 };
  }

  private getTransporter(): nodemailer.Transporter | null {
    const cfg = this.getMailConfig();
    if (cfg.provider === 'none') {
      return null;
    }
    if (!this.transporterInit) {
      this.transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.port === 465,
        auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      });
      this.transporterInit = true;
      this.logger.log(`邮件传输已建立: ${cfg.host}:${cfg.port} (${cfg.provider})`);
    }
    return this.transporter;
  }

  /** 发送纯文本邮件 */
  async sendEmail(to: string, subject: string, content: string): Promise<void> {
    const transporter = this.getTransporter();
    const cfg = this.getMailConfig();
    if (!transporter) {
      this.logger.log(`[MAIL:none 模式] 收件=${to} 主题=${subject}`);
      this.logger.log(`[MAIL:none 模式] 内容: ${content}`);
      return;
    }
    await transporter.sendMail({ from: cfg.from ?? cfg.user, to, subject, text: content });
    this.logger.log(`邮件已发送: ${to} 主题: ${subject}`);
  }

  /** 发送 HTML 邮件（验证码等） */
  async sendHtmlEmail(to: string, subject: string, htmlContent: string): Promise<void> {
    const transporter = this.getTransporter();
    const cfg = this.getMailConfig();
    if (!transporter) {
      this.logger.log(`[MAIL:none 模式] 收件=${to} 主题=${subject}`);
      this.logger.log(`[MAIL:none 模式] 内容: ${htmlContent}`);
      return;
    }
    await transporter.sendMail({ from: cfg.from ?? cfg.user, to, subject, html: htmlContent });
    this.logger.log(`邮件已发送: ${to} 主题: ${subject}`);
  }

  /** 批量发送（逐封发，失败记日志不中断其余） */
  async sendBulkEmail(recipients: string[], subject: string, content: string): Promise<void> {
    let sent = 0;
    let failed = 0;
    for (const to of recipients) {
      try {
        await this.sendEmail(to, subject, content);
        sent += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(`批量邮件单封失败: ${to}: ${(error as Error).message}`);
      }
    }
    this.logger.log(`批量邮件完成: ${sent} 成功 / ${failed} 失败 / 共 ${recipients.length}`);
  }
}
