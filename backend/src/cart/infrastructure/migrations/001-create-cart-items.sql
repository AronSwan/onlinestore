-- 购物车商品表创建脚本
-- 基于 CongoMall 设计的分片表结构

CREATE TABLE IF NOT EXISTS cart_items (
    id VARCHAR(50) PRIMARY KEY COMMENT '主键ID',
    customer_user_id VARCHAR(50) NOT NULL COMMENT '用户ID（分片键）',
    product_id VARCHAR(50) NOT NULL COMMENT '商品ID',
    product_sku_id VARCHAR(50) NOT NULL COMMENT '商品SKU ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    product_brand VARCHAR(100) NOT NULL COMMENT '商品品牌',
    product_price DECIMAL(10,2) NOT NULL COMMENT '商品价格',
    product_quantity INT NOT NULL COMMENT '商品数量',
    product_pic VARCHAR(500) NOT NULL COMMENT '商品图片',
    product_attribute TEXT COMMENT '商品属性（JSON格式）',
    select_flag BOOLEAN DEFAULT TRUE COMMENT '是否选中',
    del_flag BOOLEAN DEFAULT FALSE COMMENT '删除标识',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='购物车商品表';

-- 创建索引
CREATE UNIQUE INDEX idx_cart_user_sku ON cart_items(customer_user_id, product_sku_id);
CREATE INDEX idx_cart_user_select ON cart_items(customer_user_id, select_flag);
CREATE INDEX idx_cart_created_time ON cart_items(created_at);
CREATE INDEX idx_cart_product_id ON cart_items(product_id);

-- 分片表配置（如果使用 ShardingSphere）
-- 分片键：customer_user_id
-- 分片算法：hash取模