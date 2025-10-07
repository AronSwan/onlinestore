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
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_customer_profiles_user ON customer_profiles (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_customer_profiles_level ON customer_profiles (level)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_customer_profiles_points ON customer_profiles (points)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_user_addresses_user ON user_addresses (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_user_addresses_user_default ON user_addresses (user_id, is_default)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_user_addresses_type ON user_addresses (type)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_addresses`);
    await queryRunner.query(`DROP TABLE IF EXISTS customer_profiles`);
  }
}
