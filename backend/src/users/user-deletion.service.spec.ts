// 用途：权益批 B10——UserDeletionService（DELETE /users/me 级联注销）单元测试
// 依赖文件：user-deletion.service.ts
// 作者：权益修复批施工席
// 时间：2026-10-06

import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserDeletionService, ANONYMIZED_USERNAME } from './user-deletion.service';

describe('UserDeletionService（权益批 B10 · 被遗忘权）', () => {
  let emQueries: Array<{ sql: string; params: unknown[] }>;
  let em: { query: jest.Mock };
  let dataSource: { transaction: jest.Mock; query: jest.Mock };
  let service: UserDeletionService;

  beforeEach(() => {
    emQueries = [];
    em = {
      query: jest.fn((sql: string, params?: unknown[]) => {
        emQueries.push({ sql, params: params || [] });
        if (sql.startsWith('SELECT id FROM users')) {
          return [{ id: 42 }];
        }
        return [];
      }),
    };
    dataSource = {
      transaction: jest.fn(async (fn: (e: unknown) => Promise<unknown>) => fn(em)),
      query: jest.fn().mockResolvedValue([]),
    };
    service = new UserDeletionService(dataSource as unknown as DataSource);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('单事务内按依赖序清从表 → 脱敏审计 → 删用户行', async () => {
    await service.deleteMeCascade(42);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    const sqls = emQueries.map((q) => q.sql);
    // 依赖序：order_items 先于 orders，orders 先于 users；审计 UPDATE 在 DELETE users 之前
    // （order_items 外键列为驼峰 orderId——实体建表原貌）
    const iOrderItems = sqls.indexOf('DELETE FROM order_items WHERE orderId IN (SELECT id FROM orders WHERE user_id = ?)');
    const iOrders = sqls.indexOf('DELETE FROM orders WHERE user_id = ?');
    const iAudit = sqls.indexOf('UPDATE audit_logs SET userName = ? WHERE userId = ?');
    const iUsers = sqls.indexOf('DELETE FROM users WHERE id = ?');
    expect(iOrderItems).toBeGreaterThan(-1);
    expect(iOrders).toBeGreaterThan(iOrderItems);
    expect(iAudit).toBeGreaterThan(iOrders);
    expect(iUsers).toBeGreaterThan(iAudit);

    // 字符串键列（cart_items.customer_user_id / users_session.userId）传 String 形参
    const cart = emQueries.find((q) => q.sql.startsWith('DELETE FROM cart_items'));
    expect(cart?.params).toEqual(['42']);
    const session = emQueries.find((q) => q.sql.startsWith('DELETE FROM users_session'));
    expect(session?.params).toEqual(['42']);
    // 审计脱敏值与 userId 键
    const audit = emQueries.find((q) => q.sql.startsWith('UPDATE audit_logs'));
    expect(audit?.params).toEqual([ANONYMIZED_USERNAME, '42']);
  });

  it('用户不存在抛 NotFoundException，且不执行任何删除', async () => {
    em.query = jest.fn(() => []);
    await expect(service.deleteMeCascade(999)).rejects.toBeInstanceOf(NotFoundException);
    const sqls = emQueries.map((q) => q.sql);
    expect(sqls.some((s) => s.startsWith('DELETE'))).toBe(false);
  });

  it('非法 id（0/负数/非整数）直接 404，不开事务', async () => {
    await expect(service.deleteMeCascade(0)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.deleteMeCascade(-1)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.deleteMeCascade(1.5)).rejects.toBeInstanceOf(NotFoundException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('响应后 3s 补脱敏审计（拦截器为本次 DELETE 补写的那一行）', async () => {
    jest.useFakeTimers();
    const p = service.deleteMeCascade(42);
    await p;
    // 事务内一次 + 3s 后一次
    expect(dataSource.query).not.toHaveBeenCalled();
    jest.advanceTimersByTime(3000);
    await Promise.resolve();
    await Promise.resolve();
    expect(dataSource.query).toHaveBeenCalledWith(
      'UPDATE audit_logs SET userName = ? WHERE userId = ?',
      [ANONYMIZED_USERNAME, '42'],
    );
  });

  it('补脱敏失败只记日志不抛出（注销不回滚）', async () => {
    jest.useFakeTimers();
    dataSource.query = jest.fn().mockRejectedValue(new Error('db gone'));
    await service.deleteMeCascade(42);
    jest.advanceTimersByTime(3000);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    // 不抛出即通过
  });
});
