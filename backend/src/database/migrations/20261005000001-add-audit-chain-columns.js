"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddAuditChainColumns20261005000001 = void 0;
class AddAuditChainColumns20261005000001 {
    async up(queryRunner) {
        const [colCnt] = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND column_name = 'seq'`);
        if (!colCnt || parseInt(colCnt.cnt, 10) === 0) {
            await queryRunner.query(`ALTER TABLE audit_logs
           ADD COLUMN seq INT NULL COMMENT '链序号（哈希链定位，从 1 连续递增）',
           ADD COLUMN prevHash VARCHAR(64) NULL COMMENT '链前驱哈希（创世行固定 64 个 0）',
           ADD COLUMN recordHash VARCHAR(64) NULL COMMENT '链记录哈希（canonical SHA-256）'`);
        }
        const [idxCnt] = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'idx_audit_logs_seq_unique'`);
        if (!idxCnt || parseInt(idxCnt.cnt, 10) === 0) {
            await queryRunner.query(`CREATE UNIQUE INDEX idx_audit_logs_seq_unique ON audit_logs (seq)`);
        }
    }
    async down(queryRunner) {
        const [idxCnt] = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'idx_audit_logs_seq_unique'`);
        if (idxCnt && parseInt(idxCnt.cnt, 10) > 0) {
            await queryRunner.query(`DROP INDEX idx_audit_logs_seq_unique ON audit_logs`);
        }
        const [colCnt] = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND column_name = 'seq'`);
        if (colCnt && parseInt(colCnt.cnt, 10) > 0) {
            await queryRunner.query(`ALTER TABLE audit_logs DROP COLUMN seq, DROP COLUMN prevHash, DROP COLUMN recordHash`);
        }
    }
}
exports.AddAuditChainColumns20261005000001 = AddAuditChainColumns20261005000001;
