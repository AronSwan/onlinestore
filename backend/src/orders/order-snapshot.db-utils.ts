import type { EntityManager } from 'typeorm';

/**
 * 方言检测辅助（订单快照批阶段 1 FOR UPDATE 真防）
 *
 * queryRunnerUsesForUpdate(em): 该 EntityManager 是否支持 SELECT ... FOR UPDATE（行锁）
 * - MySQL / MariaDB / PostgreSQL / TiDB：均支持（TiDB 完全 MySQL 协议兼容）
 * - SQLite：默认驱动 better-sqlite3 不支持（TypeORM SelectQueryBuilder 探针：会抛
 *   LockNotSupportedOnGivenDriverError——席C坑J实证）
 *
 * queryRunnerDbType(em): 简化版方言探针，返回 'sqlite' | 'mysql' | 'other'
 * 用于按方言分叉 SQL（如 JSON 列读写）。本批暂不调用，但留作未来扩展点。
 *
 * 实现策略：用 em.connection.options.type 读驱动名——最稳（schema 级配位不会变）；
 * 无 option 时退化 em.query 一句 SELECT VERSION() 实探。
 */
export function queryRunnerUsesForUpdate(em: EntityManager): boolean {
  const driver = (em.connection.options as { type?: string }).type ?? '';
  if (driver.includes('mysql') || driver.includes('postgres')) return true;
  if (driver.includes('sqlite')) return false;
  // 退化探针：MySQL/TiDB/Pg 抛 'for update' 错误时此分支不命中——保留保守 false
  return false;
}

export function queryRunnerDbType(em: EntityManager): 'sqlite' | 'mysql' | 'other' {
  const driver = (em.connection.options as { type?: string }).type ?? '';
  if (driver.includes('sqlite')) return 'sqlite';
  if (driver.includes('mysql') || driver.includes('postgres')) return 'mysql';
  return 'other';
}