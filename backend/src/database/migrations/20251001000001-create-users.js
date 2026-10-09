"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUsers20251001000001 = void 0;
class CreateUsers20251001000001 {
    constructor() {
        this.name = 'CreateUsers20251001000001';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('customer','admin') DEFAULT 'customer',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_users_username (username),
        UNIQUE KEY uniq_users_email (email)
      )
    `);
        const [idxEmailStatusExists] = await queryRunner.query(`SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'idx_users_email_status'`);
        if (!idxEmailStatusExists?.cnt) {
            await queryRunner.query(`ALTER TABLE users ADD INDEX idx_users_email_status (email, is_active)`);
        }
        const [idxUsernameStatusExists] = await queryRunner.query(`SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'idx_users_username_status'`);
        if (!idxUsernameStatusExists?.cnt) {
            await queryRunner.query(`ALTER TABLE users ADD INDEX idx_users_username_status (username, is_active)`);
        }
        const [idxRoleStatusExists] = await queryRunner.query(`SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'idx_users_role_status'`);
        if (!idxRoleStatusExists?.cnt) {
            await queryRunner.query(`ALTER TABLE users ADD INDEX idx_users_role_status (role, is_active)`);
        }
        const [idxCreatedAtExists] = await queryRunner.query(`SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'idx_users_created_at'`);
        if (!idxCreatedAtExists?.cnt) {
            await queryRunner.query(`ALTER TABLE users ADD INDEX idx_users_created_at (created_at)`);
        }
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS users`);
    }
}
exports.CreateUsers20251001000001 = CreateUsers20251001000001;
