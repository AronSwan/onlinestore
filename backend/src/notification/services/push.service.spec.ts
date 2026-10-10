import { ConfigService } from '@nestjs/config';
import { PushService } from './push.service';
import { ProviderNotConfiguredError } from './provider-not-configured.error';

describe('PushService 模式切换(通知域集成刀补刀 2026-10-10)', () => {
  const build = (notification: unknown) => {
    const cs = { get: jest.fn().mockReturnValue(notification) } as unknown as ConfigService;
    return new PushService(cs);
  };

  it('PUSH_PROVIDER=none 默认: 日志模式零外发（logger spy 锚定）', async () => {
    const s = build(undefined);
    const logSpy = jest
      .spyOn((s as unknown as { logger: { log: jest.Mock } }).logger, 'log')
      .mockImplementation(() => {});
    await s.sendPush(1, '标题', '内容');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('[PUSH:none 模式]');
    logSpy.mockRestore();
  });

  it('PUSH_PROVIDER=firebase 但 SDK 未装: throw — 首次 send 时抛(被 catch 转 FAILED,应用不挂——找茬批勘正)', async () => {
    const s = build({ notification: { push: { provider: 'firebase' } } });
    await expect(s.sendPush(1, 't', 'c')).rejects.toThrow(ProviderNotConfiguredError);
  });
});
