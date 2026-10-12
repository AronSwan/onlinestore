import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 订单快照批阶段 1 治本 P2-1（2026-10-11）：order_snapshots 建表+索引。
 *
 * 与 backend/src/orders/entities/order-snapshot.entity.ts 逐项对齐。
 * 复合主键 (orderId, version)——TiDB 端显式 CLUSTERED（at-time 一次 KV 直达）；
 * MySQL/InnoDB 不显式（聚簇默认），SQLite 不支持（按普通 rowid 表），
 * 端表功能等价（PK 唯一性+索引）——三端 DDL 分方言写实。
 * 二级索引 (operatorType, occurredAt) 按文档 #31——管理跨单读取端点（阶段 3）
 * 真验到位再落；本批暂不建（端点=0=维护负担无消费者）。
 * 留账：方案要求 before 任一端点上线前必须已存该表，故 M3+ 迁移同批或前置。
 * 留账：TiDB GC 配置与本表一致性——本表属正常用户表（不是 MVCC 历史表），
 * GC 行为按默认；非订单快照审计专需调整。
 *
 * dev 走 synchronize=true 自动建表（unified-master.config.ts:469-476），
 * 走本迁移的环境：synchronize=false（典型 prod），且未单独 disable migrations。
 * 检测逻辑：复用兄弟文件的 information_schema 探测+sqlite 表存在性双查法
 * （SQLite 不支持 IF NOT EXISTS 列添加——脚本先探表再决定走 ALTER 还是 CREATE）。
 */
export class CreateOrderSnapshotsTable20261011000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    let isMysqlLike = false;
    try {
      const r = await queryRunner.query('SELECT @@version AS v');
      const v = String(r?.[0]?.v ?? '').toLowerCase();
      isMysqlLike = v.includes('mysql') || v.includes('mariadb');
    } catch {
      // SQLite/PG 抛错或非 mysql 协议——走通用路径
    }

    if (isMysqlLike) {
      // MySQL/TiDB 方言：探测表存在
      const [cnt] = await queryRunner.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'order_snapshots'`,
      );
      if (!cnt || parseInt(cnt.cnt, 10) === 0) {
        // 复合聚簇主键 TiDB 必显式；MySQL/InnoDB 默认聚簇可省——写兼容写法省 CLUSTERED
        await queryRunner.query(
          `CREATE TABLE order_snapshots (
             orderId INT NOT NULL,
             version INT NOT NULL,
             snapshot JSON NOT NULL,
             changedFields JSON NULL,
             operatorType VARCHAR(32) NOT NULL,
             operatorId VARCHAR(64) NULL,
             correlationId VARCHAR(128) NULL,
             occurredAt DATETIME NOT NULL,
             schemaVersion INT NOT NULL DEFAULT 1,
             prevHash VARCHAR(64) NULL,
             recordHash VARCHAR(64) NULL,
             PRIMARY KEY (orderId, version)
           )`,
        );
        // 跨单快照读端点未到，二级索引暂缓——阶段 3 真验到位再 ALTER + CREATE INDEX
      }
    } else {
      // SQLite/PG 方言：探表+按表存在性分叉
      const t = await queryRunner.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='order_snapshots'`,
      ).catch(() => []);
      const exists = Array.isArray(t) && t.length > 0;
      if (!exists) {
        await queryRunner.query(
          `CREATE TABLE order_snapshots (
             "orderId" INTEGER NOT NULL,
             "version" INTEGER NOT NULL,
             "snapshot" TEXT NOT NULL,
             "changedFields" TEXT NULL,
             "operatorType" TEXT NOT NULL,
             "operatorId" TEXT NULL,
             "correlationId" TEXT NULL,
             "occurredAt" TEXT NOT NULL,
             "schemaVersion" INTEGER NOT NULL DEFAULT 1,
             "prevHash" TEXT NULL,
             "recordHash" TEXT NULL,
             PRIMARY KEY ("orderId", "version")
           )`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS order_snapshots');
  }
}