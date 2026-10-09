"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartRepositoryImpl = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cart_repository_1 = require("../../domain/repositories/cart.repository");
const cart_item_aggregate_1 = require("../../domain/aggregates/cart-item.aggregate");
const cart_item_entity_1 = require("../entities/cart-item.entity");
let CartRepositoryImpl = class CartRepositoryImpl extends cart_repository_1.CartRepository {
    constructor(cartItemRepository) {
        super();
        this.cartItemRepository = cartItemRepository;
    }
    async findByUserId(userId) {
        const entities = await this.cartItemRepository.find({
            where: { customerUserId: userId, delFlag: false },
            order: { createdAt: 'DESC' },
        });
        return entities.map(entity => this.entityToAggregate(entity));
    }
    async findByUserIdAndSkuId(userId, productSkuId) {
        const entity = await this.cartItemRepository.findOne({
            where: { customerUserId: userId, productSkuId, delFlag: false },
        });
        return entity ? this.entityToAggregate(entity) : null;
    }
    async findByUserIdAndItemId(userId, cartItemId) {
        const entity = await this.cartItemRepository.findOne({
            where: { customerUserId: userId, id: cartItemId, delFlag: false },
        });
        return entity ? this.entityToAggregate(entity) : null;
    }
    async findByUserIdAndSkuIdAnyState(userId, productSkuId) {
        const entity = await this.cartItemRepository.findOne({
            where: { customerUserId: userId, productSkuId },
        });
        return entity ? this.entityToAggregate(entity) : null;
    }
    async save(cartItem) {
        const entity = this.aggregateToEntity(cartItem);
        await this.cartItemRepository.save(entity);
    }
    async remove(cartItemId) {
        await this.cartItemRepository.update({ id: cartItemId }, { delFlag: true, updatedAt: new Date() });
    }
    async removeByUserIdAndSkuIds(userId, productSkuIds) {
        await this.cartItemRepository.update({ customerUserId: userId, productSkuId: (0, typeorm_2.In)(productSkuIds) }, { delFlag: true, updatedAt: new Date() });
    }
    async clearByUserId(userId) {
        await this.cartItemRepository.update({ customerUserId: userId }, { delFlag: true, updatedAt: new Date() });
    }
    async countByUserId(userId) {
        return await this.cartItemRepository.count({
            where: { customerUserId: userId, delFlag: false },
        });
    }
    async findSelectedByUserId(userId) {
        const entities = await this.cartItemRepository.find({
            where: { customerUserId: userId, selectFlag: true, delFlag: false },
            order: { createdAt: 'DESC' },
        });
        return entities.map(entity => this.entityToAggregate(entity));
    }
    async findByUserIdWithPagination(userId, page, limit) {
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
    async removeBatch(userId, cartItemIds) {
        await this.cartItemRepository.update({ id: (0, typeorm_2.In)(cartItemIds), customerUserId: userId }, { delFlag: true, updatedAt: new Date() });
    }
    async updateAllSelectFlag(userId, selectFlag) {
        await this.cartItemRepository.update({ customerUserId: userId, delFlag: false }, { selectFlag, updatedAt: new Date() });
    }
    async removeSelectedByUserId(userId) {
        await this.cartItemRepository.update({ customerUserId: userId, selectFlag: true, delFlag: false }, { delFlag: true, updatedAt: new Date() });
    }
    async countSelectedByUserId(userId) {
        return await this.cartItemRepository.count({
            where: { customerUserId: userId, selectFlag: true, delFlag: false },
        });
    }
    async getTotalValue(userId) {
        const result = await this.cartItemRepository
            .createQueryBuilder('cart')
            .select('SUM(cart.productPrice * cart.productQuantity)', 'total')
            .where('cart.customerUserId = :userId', { userId })
            .andWhere('cart.delFlag = :delFlag', { delFlag: false })
            .getRawOne();
        return parseFloat(result?.total || '0');
    }
    async getSelectedTotalValue(userId) {
        const result = await this.cartItemRepository
            .createQueryBuilder('cart')
            .select('SUM(cart.productPrice * cart.productQuantity)', 'total')
            .where('cart.customerUserId = :userId', { userId })
            .andWhere('cart.selectFlag = :selectFlag', { selectFlag: true })
            .andWhere('cart.delFlag = :delFlag', { delFlag: false })
            .getRawOne();
        return parseFloat(result?.total || '0');
    }
    entityToAggregate(entity) {
        return new cart_item_aggregate_1.CartItemAggregate(entity.id, entity.customerUserId, entity.productId, entity.productSkuId, entity.productName, entity.productBrand, entity.productPrice, entity.productQuantity, entity.productPic, entity.productAttribute, entity.selectFlag, entity.delFlag, entity.createdAt, entity.updatedAt);
    }
    aggregateToEntity(aggregate) {
        const entity = new cart_item_entity_1.CartItemEntity();
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
};
exports.CartRepositoryImpl = CartRepositoryImpl;
exports.CartRepositoryImpl = CartRepositoryImpl = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cart_item_entity_1.CartItemEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CartRepositoryImpl);
