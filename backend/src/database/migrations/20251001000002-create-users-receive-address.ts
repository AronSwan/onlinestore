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
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_users_receive_address_user ON users_receive_address (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_users_receive_address_user_default ON users_receive_address (user_id, is_default)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users_receive_address`);
  }
}
