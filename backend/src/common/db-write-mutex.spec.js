"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_write_mutex_1 = require("./db-write-mutex");
describe('runExclusiveWrite（全局写互斥）', () => {
    const tick = (ms = 5) => new Promise(r => setTimeout(r, ms));
    it('并发 50 笔：任意时刻至多 1 笔在执行（零重叠），且全部完成', async () => {
        let active = 0;
        let maxOverlap = 0;
        const results = await Promise.all(Array.from({ length: 50 }, (_, i) => (0, db_write_mutex_1.runExclusiveWrite)(async () => {
            active++;
            maxOverlap = Math.max(maxOverlap, active);
            await tick(2);
            active--;
            return i;
        })));
        expect(maxOverlap).toBe(1);
        expect(results).toEqual(Array.from({ length: 50 }, (_, i) => i));
    });
    it('FIFO：按提交顺序执行（sqlite 单写者语义下的确定性写序）', async () => {
        const order = [];
        await Promise.all([1, 2, 3, 4].map(i => (0, db_write_mutex_1.runExclusiveWrite)(async () => {
            await tick(i % 2 === 0 ? 1 : 6);
            order.push(i);
        })));
        expect(order).toEqual([1, 2, 3, 4]);
    });
    it('失败隔离：第 1 笔抛错 → 错误达该调用方，第 2/3 笔照常执行', async () => {
        const executed = [];
        const p1 = (0, db_write_mutex_1.runExclusiveWrite)(async () => {
            await tick(4);
            throw new Error('boom：链写失败');
        });
        const p2 = (0, db_write_mutex_1.runExclusiveWrite)(async () => {
            executed.push(2);
        });
        const p3 = (0, db_write_mutex_1.runExclusiveWrite)(async () => {
            executed.push(3);
        });
        await expect(p1).rejects.toThrow('boom：链写失败');
        await Promise.all([p2, p3]);
        expect(executed).toEqual([2, 3]);
    });
    it('队尾回落即放行：上一笔结束后新提交的写立即执行（队列不卡死）', async () => {
        const seen = [];
        const first = (0, db_write_mutex_1.runExclusiveWrite)(async () => {
            await tick(10);
            seen.push('first');
        });
        await first;
        const late = (0, db_write_mutex_1.runExclusiveWrite)(async () => {
            seen.push('late');
        });
        await late;
        expect(seen).toEqual(['first', 'late']);
    });
});
