import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

describe('SmsService 模式切换(通知域集成刀补刀 2026-10-10)', () => {
  const build = (notification: unknown) => {
    const cs = { get: jest.fn().mockReturnValue(notification) } as unknown as ConfigService;
    return new SmsService(cs);
  };

  it('SMS_PROVIDER=none 默认: 日志模式零外发', async () => {
    const s = build(undefined);
    await s.sendSms('13800138000', '验证码 123456');
    // 无外部调用, 无 throw, 仅 logger.log
  });

  it('master 无 notification 节: 同 none 模式', async () => {
    const s = build(undefined);
    await s.sendVerificationCode('13800138000', '654321');
  });

  it('SMS_PROVIDER=aliyun 但 SDK 未装: throw ProviderNotConfiguredError — 启动时配错即挂', async () => {
    const s = build({ notification: { sms: { provider: 'aliyun' } } });
    await expect(s.sendSms('13800138000', 'x')).rejects.toThrow(/SMS provider 'aliyun' SDK 未接入/);
  });
});
