import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 购物车商品实体 - 参考 CongoMall CartItemDO 设计
 */
@Entity('cart_items')
@Index(['customerUserId', 'productSkuId'], { unique: true })
@Index(['customerUserId'])
@Index(['productSkuId'])
export class CartItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'customer_user_id' })
  customerUserId: string;

  // 为了兼容性，添加 userId 别名
  get userId(): string {
    return this.customerUserId;
  }

  set userId(value: string) {
    this.customerUserId = value;
  }

  @Column({ type: 'varchar', length: 50, name: 'product_id' })
  productId: string;

  @Column({ type: 'varchar', length: 50, name: 'product_sku_id' })
  productSkuId: string;

  @Column({ type: 'varchar', length: 200, name: 'product_name' })
  productName: string;

  @Column({ type: 'varchar', length: 100, name: 'product_brand' })
  productBrand: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'product_price' })
  productPrice: number;

  @Column({ type: 'int', name: 'product_quantity' })
  productQuantity: number;

  @Column({ type: 'varchar', length: 500, name: 'product_pic' })
  productPic: string;

  @Column({ type: 'text', name: 'product_attribute', nullable: true })
  productAttribute: string;

  @Column({ type: 'boolean', name: 'select_flag', default: true })
  selectFlag: boolean;

  @Column({ type: 'boolean', name: 'del_flag', default: false })
  delFlag: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
