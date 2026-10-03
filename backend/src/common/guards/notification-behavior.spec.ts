// 用途：通知归属的行为锁——一审(2026-10-03)发现原"源码包含字符串"的文本锁可被
// 一行注释骗过，改直调 handler 断言 ForbiddenException（删比对逻辑即红）。
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationController } from '../../notification/notification.controller';

describe('通知归属行为锁(一审修复)', () => {
  const makeService = (notification: any) => ({
    getUserNotifications: jest.fn().mockResolvedValue({ notifications: [], total: 0 }),
    getNotificationById: jest.fn().mockResolvedValue(notification),
    createNotification: jest.fn(),
    testNotification: jest.fn(),
    sendBulkNotifications: jest.fn(),
  });
  // controller 构造需要 redpandaService —— 查真实签名后传 mock
  const makeController = (svc: any) =>
    new NotificationController(svc as any, { publish: jest.fn() } as any);

  const otherUser = { user: { sub: 21, email: 'a@t', role: 'user' } };
  const owner = { user: { sub: 22, email: 'b@t', role: 'user' } };
  const admin = { user: { sub: 1, email: 'ad@t', role: 'admin' } };

  it('列表: 普通用户查他人 userId 抛 ForbiddenException(比对被删即红)', async () => {
    const c = makeController(makeService(null));
    await expect(
      (c as any).getNotifications(22, 1, 10, otherUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('列表: 本人放行', async () => {
    const c = makeController(makeService(null));
    await expect((c as any).getNotifications(22, 1, 10, owner)).resolves.toBeTruthy();
  });

  it('列表: admin 旁路', async () => {
    const c = makeController(makeService(null));
    await expect((c as any).getNotifications(22, 1, 10, admin)).resolves.toBeTruthy();
  });

  it('单条: 他人通知抛 ForbiddenException', async () => {
    const c = makeController(makeService({ id: 9, userId: 22 }));
    await expect((c as any).getNotification(9, otherUser)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('单条: 本人/admin 放行', async () => {
    const c = makeController(makeService({ id: 9, userId: 22 }));
    await expect((c as any).getNotification(9, owner)).resolves.toMatchObject({ id: 9 });
    await expect((c as any).getNotification(9, admin)).resolves.toMatchObject({ id: 9 });
  });

  it('单条: 不存在(服务返回 null)→404', async () => {
    // 反诈组量刑(2026-10-03): 原第4用例有一行装饰性断言(mock 恒返非 null 却注释
    // 称测 404 分支)——删除, 只留真测 null 路径的断言
    const c = makeController(makeService(null));
    await expect((c as any).getNotification(99, owner)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
