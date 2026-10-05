// 用途：M3 双盲审 P0 根治——全局写事务互斥（promise 队列式 single-flight）。
// 根因（四席双盲审 X1/X2 共中，2026-10-05）：TypeORM sqlite 驱动全库共享单连接，
// 两路并发 manager.transaction() 在同一连接上交叉 BEGIN/COMMIT/ROLLBACK：
// 轻则 "cannot start a transaction within a transaction" 双 500；重则事务悬挂——
// 连接停留在未决事务，此后所有 autocommit 写被吸入该幽灵事务（API 报成功但
// 外部直查不落库、写锁被持、verify 端点对幽灵链报 valid=true 的脑裂）。
// 修法：进程内全部显式写事务（以及依赖写序的多语句写段）经同一队列排队，
// 前一笔回落（无论成败）才放行下一笔。AuditService.chainTail（M6 上线，
// 30 路并发审计写无恙）已在该模式下验证——本文件是同一思想的推广与单点化。
// 粒度声明：互斥粒度=进程级全部写事务。sqlite 单写者语义下这是正确层；
// PG 部署形态下连接池每事务独立连接、MVCC 自身保证隔离，本互斥无害只是
// 多余串行（不改变正确性）——迁移 PG 时可保留（安全）或降级为直通（提吞吐）。
// 接入域（四席裁定）：orders.service 下单事务 / products.service update 条件
// UPDATE 写段 / AuditService 链写事务。未接入的 address/payment 服务事务不在
// app.module 注册（不活跃），激活前须先接入本互斥（见 BACKLOG M3 批声明）。
// 单语句 autocommit 写不显式 BEGIN、不与 BEGIN 交叉，无需排队；它们的真实
// 风险是被"悬挂事务"吸入——本互斥消灭悬挂事务后单语句写安全。

/** 进程内唯一写队列尾。失败被吞在队尾上（不阻断后续写），真实错误由调用方拿到。 */
let writeTail: Promise<unknown> = Promise.resolve();

/**
 * 排他执行一笔写事务/写段：与进程内所有其他 runExclusiveWrite 调用串行。
 * - FIFO 无饥饿：promise 链按提交顺序排队。
 * - 失败隔离：上一笔抛错不影响本笔执行；本笔的错误原样抛给调用方。
 * - 禁止嵌套：fn 内再调 runExclusiveWrite 会等待外层回落=自锁死。
 */
export function runExclusiveWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeTail.then(fn, fn);
  writeTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
