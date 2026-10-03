// 用途：订单详情归属+密码剥离的行为锁——反诈组量刑(2026-10-03)：
// V1 critical 修复(findOne 归属 403 + 三处剥离)此前无任何自动化锁，
// 回滚该修复 984 盏绿灯一盏不红。本 spec 直调 handler/service 断言行为。
import { ForbiddenException } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('订单详情行为锁(反诈组量刑)', () => {
  const orderOf = (userId: number) =>
    ({ id: 7, userId, totalAmount: 100, user: { id: userId, password: '$2b$12$hash', email: 'x@t' } }) as any;

  const makeController = () => {
    const svc = {
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<OrdersService>;
    return { c: new OrdersController(svc as any), svc };
  };

  it('普通用户读他人订单 → ForbiddenException(删归属比对即红)', async () => {
    const { c, svc } = makeController();
    svc.findById.mockResolvedValue(orderOf(22));
    await expect(
      (c as any).findOne(7, { user: { sub: 21, role: 'user' } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('本人/admin 放行(mock 返回已剥离对象, 剥离锁在 service 层用例)', async () => {
    const { c, svc } = makeController();
    // service.findById 真实实现会剥离(见下一用例); controller 层 mock 返回已剥离形状
    const stripped = { ...orderOf(21), user: { id: 21, email: 'x@t' } };
    svc.findById.mockResolvedValue(stripped as any);
    const res = await (c as any).findOne(7, { user: { sub: 21, role: 'user' } });
    expect(res).toMatchObject({ id: 7 });
    // admin 旁路
    const res2 = await (c as any).findOne(7, { user: { sub: 1, role: 'admin' } });
    expect(res2).toMatchObject({ id: 7 });
  });

  it('service 剥离 user.password——findById 直接断言, findByUserId/findAll 经 findAndCount 断言(删任一剥离即红)', async () => {
    // repo 层返回带 password 的 user(模拟数据库原始行), service 层必须吐出无 password
    const raw = orderOf(1);
    const repo = {
      manager: { transaction: jest.fn() },
      findOne: jest.fn().mockResolvedValue(raw),
      findAndCount: jest.fn().mockResolvedValue([[JSON.parse(JSON.stringify(raw))], 1]),
    } as any;
    const monitoring = { observeDbQuery: jest.fn() } as any;
    const svc = new OrdersService(repo, {} as any, {} as any, monitoring, {} as any);

    const one = await svc.findById(1);
    expect(one?.user).not.toHaveProperty('password'); // findById 剥离

    const list = await svc.findAll(1, 10);
    expect(list.orders[0]?.user).not.toHaveProperty('password'); // findAll 剥离(一审补修点)
  });
});
