import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';
import { ProviderNotConfiguredError } from './provider-not-configured.error';

describe('SmsService 模式切换(通知域集成刀补刀 2026-10-10)', () => {
  const build = (notification: unknown) => {
    const cs = { get: jest.fn().mockReturnValue(notification) } as unknown as ConfigService;
    return new SmsService(cs);
  };

  it('SMS_PROVIDER=none 默认: 日志模式零外发（logger spy 锚定——变异 M1 教训）', async () => {
    const s = build(undefined);
    const logSpy = jest
      .spyOn((s as unknown as { logger: { log: jest.Mock } }).logger, 'log')
      .mockImplementation(() => {});
    await s.sendSms('13800138000', '验证码 123456');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('[SMS:none 模式]');
    expect(logSpy.mock.calls[0][0]).toContain('13800138000');
    logSpy.mockRestore();
  });

  it('master 无 notification 节: 同 none 模式（logSpy 锚定——找茬批补断言）', async () => {
    const s = build(undefined);
    const logSpy2 = jest
      .spyOn((s as unknown as { logger: { log: jest.Mock } }).logger, 'log')
      .mockImplementation(() => {});
    await s.sendVerificationCode('13800138000', '654321');
    expect(logSpy2).toHaveBeenCalledTimes(1);
    expect(logSpy2.mock.calls[0][0]).toContain('[SMS:none 模式]');
    logSpy2.mockRestore();
  });

  it('SMS_PROVIDER=aliyun 但 SDK 未装: throw ProviderNotConfiguredError — 首次 send 时抛(被 catch 转 FAILED,应用不挂——找茬批勘正)', async () => {
    const s = build({ notification: { sms: { provider: 'aliyun' } } });
    await expect(s.sendSms('13800138000', 'x')).rejects.toThrow(ProviderNotConfiguredError);
    await expect(s.sendSms('13800138000', 'x')).rejects.toThrow(/SMS provider 'aliyun' SDK 未接入/);
  });
});
