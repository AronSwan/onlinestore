// 用途：创建客户管理相关表结构
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30 14:30:00

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerManagementTables20251001000005 implements MigrationInterface {
  name = 'CreateCustomerManagementTables20251001000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建客户档案表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond') DEFAULT 'bronze',
        points INT DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0,
        total_orders INT DEFAULT 0,
        successful_orders INT DEFAULT 0,
        returned_orders INT DEFAULT 0,
        first_purchase_at TIMESTAMP NULL,
        last_purchase_at TIMESTAMP NULL,
        login_days INT DEFAULT 0,
        last_login_at TIMESTAMP NULL,
        tags JSON NULL,
        preferences JSON NULL,
        average_rating DECIMAL(3,2) NULL,
        review_count INT DEFAULT 0,
        favorite_count INT DEFAULT 0,
        cart_item_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        user_id INT NOT NULL UNIQUE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 创建用户地址表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('home', 'work', 'billing', 'shipping') DEFAULT 'home',
        is_default BOOLEAN DEFAULT FALSE,
        recipient_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        province VARCHAR(50) NOT NULL,
        city VARCHAR(50) NOT NULL,
        district VARCHAR(50) NOT NULL,
        detail VARCHAR(200) NOT NULL,
        postal_code VARCHAR(10) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        user_id INT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 创建索引
    const profilesTable = 'customer_profiles';
    // 兼容 MySQL/TiDB：用 information_schema.statistics 判断索引是否存在
    const [idxProfilesUserExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_customer_profiles_user'`,
      [profilesTable],
    );
    if (!idxProfilesUserExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_customer_profiles_user ON ${profilesTable} (user_id)`,
      );
    }
    const [idxProfilesLevelExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_customer_profiles_level'`,
      [profilesTable],
    );
    if (!idxProfilesLevelExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_customer_profiles_level ON ${profilesTable} (level)`,
      );
    }
    const [idxProfilesPointsExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_customer_profiles_points'`,
      [profilesTable],
    );
    if (!idxProfilesPointsExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_customer_profiles_points ON ${profilesTable} (points)`,
      );
    }
    const addressesTable = 'user_addresses';
    const [idxAddressesUserExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_user_addresses_user'`,
      [addressesTable],
    );
    if (!idxAddressesUserExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_user_addresses_user ON ${addressesTable} (user_id)`,
      );
    }
    const [idxAddressesUserDefaultExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_user_addresses_user_default'`,
      [addressesTable],
    );
    if (!idxAddressesUserDefaultExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_user_addresses_user_default ON ${addressesTable} (user_id, is_default)`,
      );
    }
    const [idxAddressesTypeExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_user_addresses_type'`,
      [addressesTable],
    );
    if (!idxAddressesTypeExists?.cnt) {
      await queryRunner.query(`CREATE INDEX IDX_user_addresses_type ON ${addressesTable} (type)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_addresses`);
    await queryRunner.query(`DROP TABLE IF EXISTS customer_profiles`);
  }
}
