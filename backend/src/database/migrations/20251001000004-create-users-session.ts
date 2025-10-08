import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersSession20251001000004 implements MigrationInterface {
  name = 'CreateUsersSession20251001000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users_session (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        refresh_token_hash VARCHAR(255) NOT NULL,
        version INT DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        device_info VARCHAR(100),
        ip VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const tableName = 'users_session';
    const [idxUserExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_users_session_user'`,
      [tableName],
    );
    if (!idxUserExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_users_session_user ON ${tableName} (user_id)`,
      );
    }
    const [idxExpiresExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_users_session_expires'`,
      [tableName],
    );
    if (!idxExpiresExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_users_session_expires ON ${tableName} (expires_at)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users_session`);
  }
}
