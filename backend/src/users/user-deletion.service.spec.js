"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const user_deletion_service_1 = require("./user-deletion.service");
describe('UserDeletionService（权益批 B10 · 被遗忘权）', () => {
    let emQueries;
    let em;
    let dataSource;
    let service;
    beforeEach(() => {
        emQueries = [];
        em = {
            query: jest.fn((sql, params) => {
                emQueries.push({ sql, params: params || [] });
                if (sql.startsWith('SELECT id FROM users')) {
                    return [{ id: 42 }];
                }
                return [];
            }),
        };
        dataSource = {
            transaction: jest.fn(async (fn) => fn(em)),
            query: jest.fn().mockResolvedValue([]),
        };
        service = new user_deletion_service_1.UserDeletionService(dataSource);
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    it('单事务内按依赖序清从表 → 脱敏审计 → 删用户行', async () => {
        await service.deleteMeCascade(42);
        expect(dataSource.transaction).toHaveBeenCalledTimes(1);
        const sqls = emQueries.map((q) => q.sql);
        const iOrderItems = sqls.indexOf('DELETE FROM order_items WHERE orderId IN (SELECT id FROM orders WHERE user_id = ?)');
        const iOrders = sqls.indexOf('DELETE FROM orders WHERE user_id = ?');
        const iAudit = sqls.indexOf('UPDATE audit_logs SET userName = ? WHERE userId = ?');
        const iUsers = sqls.indexOf('DELETE FROM users WHERE id = ?');
        expect(iOrderItems).toBeGreaterThan(-1);
        expect(iOrders).toBeGreaterThan(iOrderItems);
        expect(iAudit).toBeGreaterThan(iOrders);
        expect(iUsers).toBeGreaterThan(iAudit);
        const cart = emQueries.find((q) => q.sql.startsWith('DELETE FROM cart_items'));
        expect(cart?.params).toEqual(['42']);
        const session = emQueries.find((q) => q.sql.startsWith('DELETE FROM users_session'));
        expect(session?.params).toEqual(['42']);
        const audit = emQueries.find((q) => q.sql.startsWith('UPDATE audit_logs'));
        expect(audit?.params).toEqual([user_deletion_service_1.ANONYMIZED_USERNAME, '42']);
    });
    it('用户不存在抛 NotFoundException，且不执行任何删除', async () => {
        em.query = jest.fn(() => []);
        await expect(service.deleteMeCascade(999)).rejects.toBeInstanceOf(common_1.NotFoundException);
        const sqls = emQueries.map((q) => q.sql);
        expect(sqls.some((s) => s.startsWith('DELETE'))).toBe(false);
    });
    it('非法 id（0/负数/非整数）直接 404，不开事务', async () => {
        await expect(service.deleteMeCascade(0)).rejects.toBeInstanceOf(common_1.NotFoundException);
        await expect(service.deleteMeCascade(-1)).rejects.toBeInstanceOf(common_1.NotFoundException);
        await expect(service.deleteMeCascade(1.5)).rejects.toBeInstanceOf(common_1.NotFoundException);
        expect(dataSource.transaction).not.toHaveBeenCalled();
    });
    it('响应后 3s 补脱敏审计（拦截器为本次 DELETE 补写的那一行）', async () => {
        jest.useFakeTimers();
        const p = service.deleteMeCascade(42);
        await p;
        expect(dataSource.query).not.toHaveBeenCalled();
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
        await Promise.resolve();
        expect(dataSource.query).toHaveBeenCalledWith('UPDATE audit_logs SET userName = ? WHERE userId = ?', [user_deletion_service_1.ANONYMIZED_USERNAME, '42']);
    });
    it('补脱敏失败只记日志不抛出（注销不回滚）', async () => {
        jest.useFakeTimers();
        dataSource.query = jest.fn().mockRejectedValue(new Error('db gone'));
        await service.deleteMeCascade(42);
        jest.advanceTimersByTime(3000);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });
});
