import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

/**
 * 邮件发送模式切换锁（邮件验证批 2026-10-10）
 * none（默认）=日志模式零外发；smtp=建 transport 真调 sendMail。
 * nodemailer 整包 mock——不建真连接。
 */
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

import * as nodemailer from 'nodemailer';

describe('EmailService 模式切换', () => {
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    // jest.config resetMocks=true 会清模块 mock 实现——每例重立
    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-id' });
    (nodemailer.createTransport as jest.Mock).mockImplementation(() => ({
      sendMail: sendMailMock,
    }));
  });
  const build = (mail: Record<string, unknown> | undefined) => {
    const configService = {
      get: jest.fn().mockReturnValue(mail === undefined ? undefined : { mail }),
    } as unknown as ConfigService;
    return { service: new EmailService(configService), configService };
  };

  it('MAIL_PROVIDER=none（默认）：不建 transport，日志模式零外发', async () => {
    const { service } = build({ provider: 'none', port: 465 });
    await service.sendHtmlEmail('a@b.c', '主题', '<p>码</p>');
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('master 无 mail 节（未配置）：同 none 模式', async () => {
    const { service } = build(undefined);
    await service.sendEmail('a@b.c', '主题', '内容');
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('MAIL_PROVIDER=smtp：建 transport（465=隐式TLS）并真调 sendMail', async () => {
    const { service } = build({
      provider: 'smtp',
      host: 'smtp.example.com',
      port: 465,
      user: 'u',
      pass: 'p',
      from: 'noreply@example.com',
    });
    await service.sendHtmlEmail('a@b.c', '验证码', '<p>123456</p>');
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        auth: { user: 'u', pass: 'p' },
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: 'a@b.c',
        subject: '验证码',
        html: '<p>123456</p>',
      }),
    );
  });

  it('587 端口=STARTTLS（secure:false）', async () => {
    const { service } = build({ provider: 'smtp', host: 'smtp.example.com', port: 587 });
    await service.sendEmail('a@b.c', 's', 'c');
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false }),
    );
  });

  it('批量：单封失败不中断其余', async () => {
    const { service } = build({ provider: 'none', port: 465 });
    // none 模式 sendEmail 不会抛——改用 smtp 模式下 sendMail 首封失败次封成功
    const { service: smtpService } = build({ provider: 'smtp', host: 'h', port: 465 });
    sendMailMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({});
    await expect(smtpService.sendBulkEmail(['x@y.z', 'ok@y.z'], 's', 'c')).resolves.toBeUndefined();
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });
});
