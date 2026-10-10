import { HttpException } from '@nestjs/common';
import { VerifyCodeService } from './verify-code.service';
import { EmailService } from '../../notification/services/email.service';

/**
 * 验证码语义四件行为锁（邮件验证批 2026-10-10——原 TODO 从未真发）
 * 冷却/上限/单次使用/先发后存。时间用 Date.now spy 控制，不真等。
 * P1 修复层（验收 E 席整改 2026-10-10）= 守门/大邮件拒入/日志脱敏/retryAfter 透传
 */
describe('VerifyCodeService 语义四件', () => {
  let service: VerifyCodeService;
  let sendHtmlEmail: jest.Mock;
  let nowMs: number;

  // 模块级 memoryStore 跨用例共享——每例用独立邮箱隔离(store 无重置钩子,迁 Redis 时可加)
  let MAIL: string;
  let mailSeq = 0;

  beforeEach(() => {
    mailSeq += 1;
    MAIL = `user${mailSeq}@example.com`;
    nowMs = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    sendHtmlEmail = jest.fn().mockResolvedValue(undefined);
    service = new VerifyCodeService({ sendHtmlEmail } as unknown as EmailService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const sendAndGrabCode = async (): Promise<string> => {
    await service.sendLoginMailCode(MAIL);
    const html = sendHtmlEmail.mock.calls.at(-1)![2] as string;
    const m = html.match(/>(\d{6})</);
    expect(m).toBeTruthy();
    return m![1];
  };

  it('真发路径：sendHtmlEmail 被调用且邮件内含 6 位码', async () => {
    await sendAndGrabCode();
  });

  it('发送失败不留码（fail-closed）：sendHtmlEmail 抛错→落账不发生', async () => {
    sendHtmlEmail.mockRejectedValueOnce(new Error('SMTP down'));
    await expect(service.sendLoginMailCode(MAIL)).rejects.toThrow('SMTP down');
    // 落账没发生=冷却计时也没起（紧接着再发不应 429）
    sendHtmlEmail.mockResolvedValue(undefined);
    nowMs += 1_000;
    await expect(service.sendLoginMailCode(MAIL)).resolves.toBeUndefined();
  });

  it('重发冷却 60s：窗口内再发=429 且旧码不被覆盖；冷却到期重发=新码覆盖', async () => {
    const code1 = await sendAndGrabCode();
    nowMs += 10_000;
    await expect(service.sendLoginMailCode(MAIL)).rejects.toThrow(HttpException);
    expect(await service.verifyLoginMailCode(MAIL, code1)).toBe(true);
    nowMs += 51_000;
    const code2 = await sendAndGrabCode();
    expect(code2).toMatch(/^\d{6}$/);
    expect(await service.verifyLoginMailCode(MAIL, code1)).toBe(false);
    expect(await service.verifyLoginMailCode(MAIL, code2)).toBe(true);
  });

  it('尝试上限 5 次：第 5 次错即作废，正确码也验不过', async () => {
    const code = await sendAndGrabCode();
    for (let i = 0; i < 4; i++) {
      expect(await service.verifyLoginMailCode(MAIL, '000000')).toBe(false);
    }
    expect(await service.verifyLoginMailCode(MAIL, '000000')).toBe(false);
    expect(await service.verifyLoginMailCode(MAIL, code)).toBe(false);
  });

  it('单次使用：验对即焚，同码二次验证 false', async () => {
    const code = await sendAndGrabCode();
    expect(await service.verifyLoginMailCode(MAIL, code)).toBe(true);
    expect(await service.verifyLoginMailCode(MAIL, code)).toBe(false);
  });

  it('过期作废：TTL 过后正确码也 false', async () => {
    const code = await sendAndGrabCode();
    nowMs += 5 * 60 * 1000 + 1;
    expect(await service.verifyLoginMailCode(MAIL, code)).toBe(false);
  });

  // ===== P1 修复增补（验收 E 席整改）=====
  describe('P1 修复层（守门/大邮件/日志脱敏/retryAfter）', () => {
    const makeService = (): VerifyCodeService => {
      return new VerifyCodeService({ sendHtmlEmail } as unknown as EmailService);
    };

    it('守门:非字符串入参抛 BadRequestException（send+verify 双路径同守）', async () => {
      const inputs: unknown[] = [null, undefined, 123, {}, [], true];
      for (const inp of inputs) {
        await expect(makeService().sendLoginMailCode(inp as never)).rejects.toThrow(
          '邮箱参数必须是字符串',
        );
        await expect(makeService().verifyLoginMailCode(inp as never, '123456')).rejects.toThrow(
          '邮箱参数必须是字符串',
        );
      }
      expect(sendHtmlEmail).not.toHaveBeenCalled();
    });

    it('大邮件拒入:RFC 5321 上限 254——1MB 攻击在 service 层挡', async () => {
      const huge = 'a'.repeat(1024) + '@x.c';
      await expect(makeService().sendLoginMailCode(huge)).rejects.toThrow(
        /邮箱长度需在 1–254 之间/,
      );
      expect(sendHtmlEmail).not.toHaveBeenCalled();
    });

    it('日志脱敏:mail 不直拼——仅首 2 字符+@+后缀', async () => {
      const s = makeService();
      const logSpy = jest
        .spyOn((s as unknown as { logger: { log: jest.Mock } }).logger, 'log')
        .mockImplementation(() => {});
      await s.sendLoginMailCode(MAIL);
      const msg = logSpy.mock.calls[0][0] as string;
      expect(msg).toContain('us***@example.com');
      expect(msg).not.toContain('user1@example.com');
      logSpy.mockRestore();
    });

    it('retryAfter 透传:429 抛对象含 retryAfter 数字', async () => {
      const s = makeService();
      await s.sendLoginMailCode(MAIL);
      nowMs += 10_000;
      let caught: unknown = null;
      try {
        await s.sendLoginMailCode(MAIL);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(HttpException);
      const resp = (caught as HttpException).getResponse() as {
        message?: string;
        retryAfter?: number;
      };
      expect(resp.retryAfter).toBe(50);
    });
  });
});
