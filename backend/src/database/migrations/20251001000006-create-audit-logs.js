"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAuditLogs20251001000006 = void 0;
class CreateAuditLogs20251001000006 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id CHAR(36) NOT NULL,
        userId VARCHAR(50) NULL,
        userName VARCHAR(100) NULL,
        operation VARCHAR(100) NOT NULL,
        module VARCHAR(50) NOT NULL,
        method VARCHAR(10) NOT NULL,
        url VARCHAR(500) NOT NULL,
        ip VARCHAR(50) NOT NULL,
        userAgent VARCHAR(500) NULL,
        requestParams TEXT NULL,
        responseData TEXT NULL,
        duration INT NOT NULL,
        status VARCHAR(20) NOT NULL,
        errorMessage TEXT NULL,
        createTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        const [userIdIdx] = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'idx_audit_logs_user_id_create_time'`);
        if (!userIdIdx || parseInt(userIdIdx.cnt, 10) === 0) {
            await queryRunner.query(`CREATE INDEX idx_audit_logs_user_id_create_time ON audit_logs (userId, createTime)`);
        }
        const [moduleIdx] = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'idx_audit_logs_module_create_time'`);
        if (!moduleIdx || parseInt(moduleIdx.cnt, 10) === 0) {
            await queryRunner.query(`CREATE INDEX idx_audit_logs_module_create_time ON audit_logs (module, createTime)`);
        }
    }
    async down(queryRunner) {
        const [userIdIdx] = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'idx_audit_logs_user_id_create_time'`);
        if (userIdIdx && parseInt(userIdIdx.cnt, 10) > 0) {
            await queryRunner.query(`DROP INDEX idx_audit_logs_user_id_create_time ON audit_logs`);
        }
        const [moduleIdx] = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'idx_audit_logs_module_create_time'`);
        if (moduleIdx && parseInt(moduleIdx.cnt, 10) > 0) {
            await queryRunner.query(`DROP INDEX idx_audit_logs_module_create_time ON audit_logs`);
        }
        await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    }
}
exports.CreateAuditLogs20251001000006 = CreateAuditLogs20251001000006;
