import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * M6(2026-10-05)：audit_logs 追加哈希链三列 + seq 唯一索引（MySQL/TiDB 方言）。
 * 开发环境靠 synchronize 加列；生产走本迁移。列与索引须与
 * backend/src/common/audit/entities/audit-log.entity.ts 逐项对齐。
 * 存量行不在此迁移内链化——停机/低负载跑 backend/scripts/backfill-audit-chain.mjs
 * 完成 genesis 重锚（SQLite 方言脚本；MySQL 生产重锚需另按同一定序规则执行，
 * 已挂账见 docs/BACKLOG.md）。
 */
export class AddAuditChainColumns20261005000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // MySQL 8 无 ADD COLUMN IF NOT EXISTS（MariaDB 才有），沿用兄弟文件的信息架构探测风格
    const [colCnt] = await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND column_name = 'seq'`,
    );
    if (!colCnt || parseInt(colCnt.cnt, 10) === 0) {
      await queryRunner.query(
        `ALTER TABLE audit_logs
           ADD COLUMN seq INT NULL COMMENT '链序号（哈希链定位，从 1 连续递增）',
           ADD COLUMN prevHash VARCHAR(64) NULL COMMENT '链前驱哈希（创世行固定 64 个 0）',
           ADD COLUMN recordHash VARCHAR(64) NULL COMMENT '链记录哈希（canonical SHA-256）'`,
      );
    }

    const [idxCnt] = await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'idx_audit_logs_seq_unique'`,
    );
    if (!idxCnt || parseInt(idxCnt.cnt, 10) === 0) {
      await queryRunner.query(`CREATE UNIQUE INDEX idx_audit_logs_seq_unique ON audit_logs (seq)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [idxCnt] = await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'idx_audit_logs_seq_unique'`,
    );
    if (idxCnt && parseInt(idxCnt.cnt, 10) > 0) {
      await queryRunner.query(`DROP INDEX idx_audit_logs_seq_unique ON audit_logs`);
    }

    const [colCnt] = await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND column_name = 'seq'`,
    );
    if (colCnt && parseInt(colCnt.cnt, 10) > 0) {
      await queryRunner.query(`ALTER TABLE audit_logs DROP COLUMN seq, DROP COLUMN prevHash, DROP COLUMN recordHash`);
    }
  }
}
