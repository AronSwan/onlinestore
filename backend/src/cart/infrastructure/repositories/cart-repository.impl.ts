import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { CartItemAggregate } from '../../domain/aggregates/cart-item.aggregate';
import { CartItemEntity } from '../entities/cart-item.entity';

/**
 * 购物车仓储实现
 * 基于 CongoMall 的数据访问模式
 */
@Injectable()
export class CartRepositoryImpl extends CartRepository {
  constructor(
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepository: Repository<CartItemEntity>,
  ) {
    super();
  }

  async findByUserId(userId: string): Promise<CartItemAggregate[]> {
    const entities = await this.cartItemRepository.find({
      where: { customerUserId: userId, delFlag: false },
      order: { createdAt: 'DESC' },
    });
    return entities.map(entity => this.entityToAggregate(entity));
  }

  async findByUserIdAndSkuId(
    userId: string,
    productSkuId: string,
  ): Promise<CartItemAggregate | null> {
    const entity = await this.cartItemRepository.findOne({
      where: { customerUserId: userId, productSkuId, delFlag: false },
    });
    return entity ? this.entityToAggregate(entity) : null;
  }

  async save(cartItem: CartItemAggregate): Promise<void> {
    const entity = this.aggregateToEntity(cartItem);
    await this.cartItemRepository.save(entity);
  }

  async remove(cartItemId: string): Promise<void> {
    await this.cartItemRepository.update(
      { id: cartItemId },
      { delFlag: true, updatedAt: new Date() },
    );
  }

  async removeByUserIdAndSkuIds(userId: string, productSkuIds: string[]): Promise<void> {
    await this.cartItemRepository.update(
      { customerUserId: userId, productSkuId: In(productSkuIds) },
      { delFlag: true, updatedAt: new Date() },
    );
  }

  async clearByUserId(userId: string): Promise<void> {
    await this.cartItemRepository.update(
      { customerUserId: userId },
      { delFlag: true, updatedAt: new Date() },
    );
  }

  async countByUserId(userId: string): Promise<number> {
    return await this.cartItemRepository.count({
      where: { customerUserId: userId, delFlag: false },
    });
  }

  async findSelectedByUserId(userId: string): Promise<CartItemAggregate[]> {
    const entities = await this.cartItemRepository.find({
      where: { customerUserId: userId, selectFlag: true, delFlag: false },
      order: { createdAt: 'DESC' },
    });
    return entities.map(entity => this.entityToAggregate(entity));
  }

  async findByUserIdWithPagination(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: CartItemAggregate[]; total: number }> {
    const [entities, total] = await this.cartItemRepository.findAndCount({
      where: { customerUserId: userId, delFlag: false },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: entities.map(entity => this.entityToAggregate(entity)),
      total,
    };
  }

  async removeBatch(cartItemIds: string[]): Promise<void> {
    await this.cartItemRepository.update(
      { id: In(cartItemIds) },
      { delFlag: true, updatedAt: new Date() },
    );
  }

  async updateAllSelectFlag(userId: string, selectFlag: boolean): Promise<void> {
    await this.cartItemRepository.update(
      { customerUserId: userId, delFlag: false },
      { selectFlag, updatedAt: new Date() },
    );
  }

  async removeSelectedByUserId(userId: string): Promise<void> {
    await this.cartItemRepository.update(
      { customerUserId: userId, selectFlag: true, delFlag: false },
      { delFlag: true, updatedAt: new Date() },
    );
  }

  async countSelectedByUserId(userId: string): Promise<number> {
    return await this.cartItemRepository.count({
      where: { customerUserId: userId, selectFlag: true, delFlag: false },
    });
  }

  async getTotalValue(userId: string): Promise<number> {
    const result = await this.cartItemRepository
      .createQueryBuilder('cart')
      .select('SUM(cart.productPrice * cart.productQuantity)', 'total')
      .where('cart.customerUserId = :userId', { userId })
      .andWhere('cart.delFlag = :delFlag', { delFlag: false })
      .getRawOne();
    return parseFloat(result?.total || '0');
  }

  async getSelectedTotalValue(userId: string): Promise<number> {
    const result = await this.cartItemRepository
      .createQueryBuilder('cart')
      .select('SUM(cart.productPrice * cart.productQuantity)', 'total')
      .where('cart.customerUserId = :userId', { userId })
      .andWhere('cart.selectFlag = :selectFlag', { selectFlag: true })
      .andWhere('cart.delFlag = :delFlag', { delFlag: false })
      .getRawOne();
    return parseFloat(result?.total || '0');
  }

  private entityToAggregate(entity: CartItemEntity): CartItemAggregate {
    return new CartItemAggregate(
      entity.id,
      entity.customerUserId,
      entity.productId,
      entity.productSkuId,
      entity.productName,
      entity.productBrand,
      entity.productPrice,
      entity.productQuantity,
      entity.productPic,
      entity.productAttribute,
      entity.selectFlag,
      entity.delFlag,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private aggregateToEntity(aggregate: CartItemAggregate): CartItemEntity {
    const entity = new CartItemEntity();
    entity.id = aggregate.id;
    entity.customerUserId = aggregate.userId;
    entity.productId = aggregate.productId;
    entity.productSkuId = aggregate.productSkuId;
    entity.productName = aggregate.productName;
    entity.productBrand = aggregate.productBrand;
    entity.productPrice = aggregate.productPrice;
    entity.productQuantity = aggregate.productQuantity;
    entity.productPic = aggregate.productPic;
    entity.productAttribute = aggregate.productAttribute;
    entity.selectFlag = aggregate.selectFlag;
    entity.delFlag = false;
    entity.createdAt = aggregate.createdAt || new Date();
    entity.updatedAt = aggregate.updatedAt || new Date();
    return entity;
  }
}
