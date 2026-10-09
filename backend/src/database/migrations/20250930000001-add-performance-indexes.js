"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPerformanceIndexes20250930000001 = void 0;
class AddPerformanceIndexes20250930000001 {
    constructor() {
        this.name = 'AddPerformanceIndexes20250930000001';
    }
    async up(queryRunner) {
        console.log('🔄 添加性能优化索引...');
        await queryRunner.query(`
      ALTER TABLE products 
      ADD INDEX idx_products_quick_search (name, price, stock, is_active),
      ADD INDEX idx_products_hot_list (sales_count, view_count, created_at DESC),
      ADD INDEX idx_products_category_hot (category_id, sales_count DESC, created_at DESC)
    `);
        await queryRunner.query(`
      ALTER TABLE orders 
      ADD INDEX idx_orders_daily_stats (DATE(created_at), status, total_amount),
      ADD INDEX idx_orders_user_stats (user_id, status, created_at),
      ADD INDEX idx_orders_product_stats (created_at, status)
    `);
        await queryRunner.query(`
      ALTER TABLE users 
      ADD INDEX idx_users_activity (last_login_at, login_count),
      ADD INDEX idx_users_registration_stats (DATE(created_at), role)
    `);
        await queryRunner.query(`
      ALTER TABLE order_items 
      ADD INDEX idx_order_items_product_stats (product_id, quantity, unit_price),
      ADD INDEX idx_order_items_sales_trend (created_at, product_id, quantity)
    `);
        console.log('✅ 性能优化索引添加完成');
    }
    async down(queryRunner) {
        console.log('🔄 回滚性能优化索引...');
        await queryRunner.query(`
      ALTER TABLE products 
      DROP INDEX idx_products_quick_search,
      DROP INDEX idx_products_hot_list,
      DROP INDEX idx_products_category_hot
    `);
        await queryRunner.query(`
      ALTER TABLE orders 
      DROP INDEX idx_orders_daily_stats,
      DROP INDEX idx_orders_user_stats,
      DROP INDEX idx_orders_product_stats
    `);
        await queryRunner.query(`
      ALTER TABLE users 
      DROP INDEX idx_users_activity,
      DROP INDEX idx_users_registration_stats
    `);
        await queryRunner.query(`
      ALTER TABLE order_items 
      DROP INDEX idx_order_items_product_stats,
      DROP INDEX idx_order_items_sales_trend
    `);
        console.log('✅ 性能优化索引回滚完成');
    }
}
exports.AddPerformanceIndexes20250930000001 = AddPerformanceIndexes20250930000001;
