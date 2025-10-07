import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeIndexes20250930000000 implements MigrationInterface {
  name = 'OptimizeIndexes20250930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 开始优化数据库索引...');

    // 1. 优化用户表索引
    await queryRunner.query(`
      ALTER TABLE users 
      ADD INDEX idx_users_email_status (email, is_active),
      ADD INDEX idx_users_username_status (username, is_active),
      ADD INDEX idx_users_role_status (role, is_active),
      ADD INDEX idx_users_created_at (created_at)
    `);

    // 2. 优化产品表索引
    await queryRunner.query(`
      ALTER TABLE products 
      ADD INDEX idx_products_category_status (category_id, is_active),
      ADD INDEX idx_products_price_range (price, is_active),
      ADD INDEX idx_products_stock_status (stock, is_active),
      ADD INDEX idx_products_sales_rank (sales_count DESC, created_at DESC),
      ADD INDEX idx_products_search (name, description(255), is_active),
      ADD INDEX idx_products_active_created (is_active, created_at DESC)
    `);

    // 3. 优化订单表索引
    await queryRunner.query(`
      ALTER TABLE orders 
      ADD INDEX idx_orders_user_status (user_id, status),
      ADD INDEX idx_orders_status_created (status, created_at DESC),
      ADD INDEX idx_orders_payment_status (payment_status, created_at),
      ADD INDEX idx_orders_total_amount (total_amount DESC),
      ADD INDEX idx_orders_user_date (user_id, DATE(created_at)),
      ADD INDEX idx_orders_composite_search (user_id, status, payment_status)
    `);

    // 4. 优化订单项表索引
    await queryRunner.query(`
      ALTER TABLE order_items 
      ADD INDEX idx_order_items_order_product (order_id, product_id),
      ADD INDEX idx_order_items_product_quantity (product_id, quantity),
      ADD INDEX idx_order_items_unit_price (unit_price DESC)
    `);

    // 5. 优化分类表索引
    await queryRunner.query(`
      ALTER TABLE categories 
      ADD INDEX idx_categories_parent_active (parent_id, is_active),
      ADD INDEX idx_categories_slug_active (slug, is_active),
      ADD INDEX idx_categories_sort_weight (sort_weight DESC)
    `);

    // 6. 优化产品图片表索引
    await queryRunner.query(`
      ALTER TABLE product_images 
      ADD INDEX idx_product_images_product_sort (product_id, sort_weight DESC),
      ADD INDEX idx_product_images_active (is_active)
    `);

    console.log('✅ 数据库索引优化完成');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 回滚数据库索引优化...');

    // 删除新增的索引
    await queryRunner.query(`
      ALTER TABLE users 
      DROP INDEX idx_users_email_status,
      DROP INDEX idx_users_username_status,
      DROP INDEX idx_users_role_status,
      DROP INDEX idx_users_created_at
    `);

    await queryRunner.query(`
      ALTER TABLE products 
      DROP INDEX idx_products_category_status,
      DROP INDEX idx_products_price_range,
      DROP INDEX idx_products_stock_status,
      DROP INDEX idx_products_sales_rank,
      DROP INDEX idx_products_search,
      DROP INDEX idx_products_active_created
    `);

    await queryRunner.query(`
      ALTER TABLE orders 
      DROP INDEX idx_orders_user_status,
      DROP INDEX idx_orders_status_created,
      DROP INDEX idx_orders_payment_status,
      DROP INDEX idx_orders_total_amount,
      DROP INDEX idx_orders_user_date,
      DROP INDEX idx_orders_composite_search
    `);

    await queryRunner.query(`
      ALTER TABLE order_items 
      DROP INDEX idx_order_items_order_product,
      DROP INDEX idx_order_items_product_quantity,
      DROP INDEX idx_order_items_unit_price
    `);

    await queryRunner.query(`
      ALTER TABLE categories 
      DROP INDEX idx_categories_parent_active,
      DROP INDEX idx_categories_slug_active,
      DROP INDEX idx_categories_sort_weight
    `);

    await queryRunner.query(`
      ALTER TABLE product_images 
      DROP INDEX idx_product_images_product_sort,
      DROP INDEX idx_product_images_active
    `);

    console.log('✅ 数据库索引回滚完成');
  }
}
