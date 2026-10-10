import { ConfigService } from '@nestjs/config';
import { PushService } from './push.service';

describe('PushService 模式切换(通知域集成刀补刀 2026-10-10)', () => {
  const build = (notification: unknown) => {
    const cs = { get: jest.fn().mockReturnValue(notification) } as unknown as ConfigService;
    return new PushService(cs);
  };

  it('PUSH_PROVIDER=none 默认: 日志模式零外发', async () => {
    const s = build(undefined);
    await s.sendPush(1, '标题', '内容');
  });

  it('PUSH_PROVIDER=firebase 但 SDK 未装: throw — 启动时配错即挂', async () => {
    const s = build({ notification: { push: { provider: 'firebase' } } });
    await expect(s.sendPush(1, 't', 'c')).rejects.toThrow(/PUSH provider 'firebase' SDK 未接入/);
  });
});
