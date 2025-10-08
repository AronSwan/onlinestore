import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersReceiveAddress20251001000002 implements MigrationInterface {
  name = 'CreateUsersReceiveAddress20251001000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users_receive_address (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        province_code VARCHAR(12) NOT NULL,
        province_name VARCHAR(50) NOT NULL,
        city_code VARCHAR(12) NOT NULL,
        city_name VARCHAR(50) NOT NULL,
        district_code VARCHAR(12) NOT NULL,
        district_name VARCHAR(50) NOT NULL,
        detail_address VARCHAR(200) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const tableName = 'users_receive_address';
    // 创建索引（兼容不支持 IF NOT EXISTS 的 MySQL/TiDB）
    const [userIdxExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_users_receive_address_user'`,
      [tableName],
    );
    if (!userIdxExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_users_receive_address_user ON ${tableName} (user_id)`,
      );
    }
    const [userDefaultIdxExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_users_receive_address_user_default'`,
      [tableName],
    );
    if (!userDefaultIdxExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_users_receive_address_user_default ON ${tableName} (user_id, is_default)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users_receive_address`);
  }
}
