// 用途：M6 哈希链写侧集成测试——真实 sqlite :memory: DataSource 走
// AuditService.log 全路径（事务内 读头→插入→回读→补链列），对照设计十决策 #9：
//   1. 连写 3 条 → seq 1..3、链可复算（verifyChain valid）
//   2. Promise.all 20 并发写 → seq 无重号、链完整（进程内串行锁 + 唯一索引双防线）
//   3. raw UPDATE 篡改 status → verifyChain valid:false 指认该 seq
//   4. log 抛错（约束冲突注入）→ 事务回滚不留半行
// 依赖仅项目既有：@nestjs/typeorm 之外零新增；TracingService 用最小 span 桩。
import { DataSource } from 'typeorm';
import { AuditService, AuditAction, AuditResult, AuditSeverity } from './audit.service';
import { AuditLogEntity } from './entities/audit-log.entity';
import { verifyChain, ZERO_HASH } from './audit-chain';

const mkSpan = () => ({
  setAttributes: () => undefined,
  recordException: () => undefined,
});

// 最小 TracingService 桩：trace(name, fn) 直接执行 fn(span)
const tracingStub = {
  trace: (_name: string, fn: (span: any) => Promise<any>) => fn(mkSpan()),
} as any;

const mkContext = (n: number) => ({
  userId: `u${n}`,
  userEmail: `u${n}@test.local`,
  resourceType: 'integration',
  resourceId: String(n),
  httpMethod: 'POST',
  endpoint: `/api/test/${n}`,
});

describe('AuditService 哈希链写侧（:memory: sqlite 集成）', () => {
  let dataSource: DataSource;
  let service: AuditService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [AuditLogEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    service = new AuditService(
      dataSource.getRepository(AuditLogEntity),
      tracingStub,
      dataSource,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const rawRows = async () =>
    (await dataSource.query(
      `SELECT id, seq, prevHash, recordHash, createTime, userId, userName, operation,
              module, method, url, ip, userAgent, requestParams, responseData,
              duration, status, errorMessage FROM audit_logs`,
    )) as Array<Record<string, unknown>>;

  it('连写 3 条 → seq 1..3 连续、verifyChain 复算通过、返回值带链列', async () => {
    const saved: AuditLogEntity[] = [];
    for (let i = 1; i <= 3; i++) {
      const log = await service.log(
        AuditAction.USER_LOGIN,
        AuditResult.SUCCESS,
        mkContext(i),
        undefined,
        AuditSeverity.LOW,
      );
      saved.push(log);
    }
    expect(saved.map(l => l.seq)).toEqual([1, 2, 3]);
    expect(saved[0].prevHash).toBe(ZERO_HASH);

    const rows = await rawRows();
    expect(rows).toHaveLength(3);
    const result = verifyChain(rows);
    expect(result.valid).toBe(true);
    expect(result.length).toBe(3);
    expect(result.headSeq).toBe(3);
    // 头哈希=第 3 条返回的 recordHash（写侧与验侧同源）
    expect(result.headHash).toBe(saved[2].recordHash);
  });

  it('Promise.all 20 并发写 → seq 1..20 无重号、全链完整', async () => {
    // 本测从空库重新起步（上一测遗留 3 行会顶掉 seq 起点，清表保持独立性）
    await dataSource.query(`DELETE FROM audit_logs`);
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        service.log(AuditAction.PRODUCT_VIEW, AuditResult.SUCCESS, mkContext(100 + i)),
      ),
    );
    const seqs = results.map(r => r.seq).sort((a, b) => Number(a) - Number(b));
    expect(seqs).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(new Set(seqs).size).toBe(20); // 无重号

    const rows = await rawRows();
    expect(rows).toHaveLength(20);
    const result = verifyChain(rows);
    expect(result.valid).toBe(true);
    expect(result.headSeq).toBe(20);
  });

  it('raw UPDATE 篡改 status（不重算哈希）→ verifyChain valid:false 指认该 seq', async () => {
    await dataSource.query(`DELETE FROM audit_logs`);
    for (let i = 1; i <= 3; i++) {
      await service.log(AuditAction.ORDER_CREATE, AuditResult.SUCCESS, mkContext(200 + i));
    }
    const [victim] = (await dataSource.query(
      `SELECT id, seq FROM audit_logs WHERE seq = 2`,
    )) as Array<{ id: string; seq: number }>;
    await dataSource.query(`UPDATE audit_logs SET status = 'FAILURE' WHERE id = ?`, [victim.id]);

    const result = verifyChain(await rawRows());
    expect(result.valid).toBe(false);
    const content = result.problems.find(p => p.type === 'CONTENT');
    expect(content?.seq).toBe(2);
    // 其余行完好：问题只有这一笔
    expect(result.problems).toHaveLength(1);
  });

  it('log 抛错 → 事务回滚不留半行（链头不动）', async () => {
    await dataSource.query(`DELETE FROM audit_logs`);
    await service.log(AuditAction.USER_LOGIN, AuditResult.SUCCESS, mkContext(301));
    const [head] = (await dataSource.query(
      `SELECT seq, recordHash FROM audit_logs ORDER BY seq DESC LIMIT 1`,
    )) as Array<{ seq: number; recordHash: string }>;
    expect(Number(head.seq)).toBe(1);

    // 注入失败：拿走表让插入炸（事务内异常必须整体回滚）
    await dataSource.query(`ALTER TABLE audit_logs RENAME TO audit_logs_hidden`);
    await expect(
      service.log(AuditAction.USER_LOGOUT, AuditResult.SUCCESS, mkContext(302)),
    ).rejects.toThrow();
    await dataSource.query(`ALTER TABLE audit_logs_hidden RENAME TO audit_logs`);

    const rows = await rawRows();
    expect(rows).toHaveLength(1); // 没有半行残留
    expect(Number(rows[0].seq)).toBe(1);
    expect(String(rows[0].recordHash)).toBe(head.recordHash); // 链头不动
    // 库仍可用：后续写续链不重号
    const next = await service.log(AuditAction.USER_LOGIN, AuditResult.SUCCESS, mkContext(303));
    expect(next.seq).toBe(2);
    expect(verifyChain(await rawRows()).valid).toBe(true);
  });
});
