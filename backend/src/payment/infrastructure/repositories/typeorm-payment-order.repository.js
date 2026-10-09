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
exports.TypeOrmPaymentOrderRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_entity_1 = require("../../entities/payment.entity");
const payment_order_aggregate_1 = require("../../domain/aggregates/payment-order.aggregate");
const payment_order_id_value_object_1 = require("../../domain/value-objects/payment-order-id.value-object");
const money_value_object_1 = require("../../domain/value-objects/money.value-object");
const payment_method_value_object_1 = require("../../domain/value-objects/payment-method.value-object");
const STATUS_TO_ENTITY = {
    [payment_order_aggregate_1.PaymentStatus.PENDING]: 'pending',
    [payment_order_aggregate_1.PaymentStatus.PROCESSING]: 'processing',
    [payment_order_aggregate_1.PaymentStatus.SUCCEEDED]: 'success',
    [payment_order_aggregate_1.PaymentStatus.FAILED]: 'failed',
    [payment_order_aggregate_1.PaymentStatus.CANCELLED]: 'cancelled',
    [payment_order_aggregate_1.PaymentStatus.EXPIRED]: 'expired',
    [payment_order_aggregate_1.PaymentStatus.CLOSED]: 'cancelled',
};
const STATUS_TO_DOMAIN = {
    pending: payment_order_aggregate_1.PaymentStatus.PENDING,
    processing: payment_order_aggregate_1.PaymentStatus.PROCESSING,
    success: payment_order_aggregate_1.PaymentStatus.SUCCEEDED,
    failed: payment_order_aggregate_1.PaymentStatus.FAILED,
    cancelled: payment_order_aggregate_1.PaymentStatus.CANCELLED,
    expired: payment_order_aggregate_1.PaymentStatus.EXPIRED,
    refunded: payment_order_aggregate_1.PaymentStatus.SUCCEEDED,
    partial_refunded: payment_order_aggregate_1.PaymentStatus.SUCCEEDED,
};
const METHOD_TO_ENTITY = {
    ALIPAY: 'alipay',
    WECHAT: 'wechat',
    UNIONPAY: 'unionpay',
    CREDIT_CARD: 'credit_card',
    BANK_TRANSFER: 'bank_transfer',
    USDT_TRC20: 'usdt_trc20',
    USDT_ERC20: 'usdt_erc20',
    USDT_BEP20: 'usdt_bep20',
    BTC: 'btc',
    ETH: 'eth',
};
const METHOD_TO_DOMAIN = Object.fromEntries(Object.entries(METHOD_TO_ENTITY).map(([k, v]) => [v, k]));
let TypeOrmPaymentOrderRepository = class TypeOrmPaymentOrderRepository {
    constructor(repository) {
        this.repository = repository;
    }
    async findById(id) {
        const entity = await this.repository.findOne({
            where: { paymentId: id.value },
        });
        return entity ? this.toAggregate(entity) : null;
    }
    async findByIds(ids) {
        if (ids.length === 0)
            return [];
        const entities = await this.repository.find({
            where: ids.map(i => ({ paymentId: i.value })),
        });
        return entities.map(e => this.toAggregate(e));
    }
    async findByMerchantOrderId(merchantOrderId) {
        const entities = await this.repository.find({
            where: { orderId: merchantOrderId },
            order: { createdAt: 'DESC' },
        });
        return entities.map(e => this.toAggregate(e));
    }
    async findByIdempotencyKey(idempotencyKey) {
        if (!idempotencyKey)
            return null;
        const entity = await this.repository.findOne({
            where: { idempotencyKey },
            order: { createdAt: 'DESC' },
        });
        return entity ? this.toAggregate(entity) : null;
    }
    async findByUserId(userId, page, limit) {
        const numericUserId = this.toNumericUserId(userId);
        const [entities, total] = await this.repository.findAndCount({
            where: { userId: numericUserId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { orders: entities.map(e => this.toAggregate(e)), total };
    }
    async save(paymentOrder) {
        const existing = await this.repository.findOne({
            where: { paymentId: paymentOrder.id.value },
        });
        const metadata = {
            ...(existing?.metadata ?? {}),
            subject: paymentOrder.subject,
            description: paymentOrder.description,
            paymentUrl: paymentOrder.paymentUrl,
            qrCode: paymentOrder.qrCode,
        };
        if (paymentOrder.paidAmount) {
            metadata.paidAmount = paymentOrder.paidAmount.amount;
        }
        if (paymentOrder.refunds && paymentOrder.refunds.length > 0) {
            metadata.refunds = paymentOrder.refunds.map(r => ({
                id: r.id.value,
                amount: r.amount.amount,
                reason: r.reason,
                operatorId: r.operatorId,
                status: r.status,
                gatewayRefundId: r.gatewayRefundId,
                completedAt: r.completedAt,
                createdAt: r.createdAt,
            }));
        }
        if (paymentOrder.closedAt) {
            metadata.closedAt = paymentOrder.closedAt.toISOString();
        }
        const entity = {
            paymentId: paymentOrder.id.value,
            orderId: paymentOrder.merchantOrderId,
            userId: this.toNumericUserId(paymentOrder.userId),
            amount: paymentOrder.amount.amount,
            currency: paymentOrder.amount.currency,
            method: this.methodToEntity(paymentOrder.paymentMethod),
            gateway: 'manual',
            status: this.statusToEntity(paymentOrder.status),
            thirdPartyTransactionId: paymentOrder.gatewayOrderId ?? null,
            metadata,
            failureReason: paymentOrder.failureReason ?? null,
            paidAt: paymentOrder.paidAt ?? null,
            expiredAt: paymentOrder.expireTime ?? null,
            idempotencyKey: paymentOrder.idempotencyKey ?? null,
        };
        if (existing) {
            await this.repository.update({ id: existing.id }, entity);
        }
        else {
            await this.repository.save(entity);
        }
    }
    async getStatistics(startDate, endDate) {
        const rows = await this.repository
            .createQueryBuilder('p')
            .select('p.method', 'method')
            .addSelect('COUNT(*)', 'count')
            .addSelect('SUM(p.amount)', 'amount')
            .addSelect(`SUM(CASE WHEN p.status = 'success' THEN 1 ELSE 0 END)`, 'successCount')
            .addSelect(`SUM(CASE WHEN p.status = 'failed' THEN 1 ELSE 0 END)`, 'failedCount')
            .where('p.createdAt BETWEEN :start AND :end', {
            start: startDate,
            end: endDate,
        })
            .groupBy('p.method')
            .getRawAndEntities();
        const methodStats = [];
        let totalCount = 0;
        let successCount = 0;
        let failedCount = 0;
        for (const raw of rows.raw) {
            const count = Number(raw.count) || 0;
            methodStats.push({
                method: String(raw.method),
                count,
                amount: Number(raw.amount) || 0,
            });
            totalCount += count;
            successCount += Number(raw.successCount) || 0;
            failedCount += Number(raw.failedCount) || 0;
        }
        const totalAmount = methodStats.reduce((s, m) => s + m.amount, 0);
        return {
            totalAmount,
            totalCount,
            successCount,
            failedCount,
            methodStats,
        };
    }
    toAggregate(entity) {
        const metadata = (entity.metadata ?? {});
        const aggregate = new payment_order_aggregate_1.PaymentOrderAggregate(payment_order_id_value_object_1.PaymentOrderId.create(entity.paymentId), entity.orderId, new money_value_object_1.Money(Number(entity.amount), entity.currency), this.methodToDomain(entity.method), metadata.subject ?? '', String(entity.userId), this.statusToDomain(entity.status), entity.createdAt ?? new Date(), entity.updatedAt ?? new Date(), metadata.description, metadata.paymentUrl, metadata.qrCode, entity.thirdPartyTransactionId ?? undefined, metadata.paidAmount !== undefined
            ? new money_value_object_1.Money(Number(metadata.paidAmount), entity.currency)
            : undefined, entity.paidAt ?? undefined, entity.failureReason ?? undefined, entity.expiredAt ?? undefined, metadata.closedAt ? new Date(metadata.closedAt) : undefined, []);
        aggregate.idempotencyKey = entity.idempotencyKey ?? undefined;
        return aggregate;
    }
    toNumericUserId(userId) {
        const n = Number(userId);
        if (!Number.isInteger(n) || n <= 0) {
            throw new Error(`支付订单 userId 非法（须为正整数）: ${userId}`);
        }
        return n;
    }
    statusToEntity(status) {
        const mapped = STATUS_TO_ENTITY[status];
        if (!mapped) {
            throw new Error(`未知支付状态（fail-closed 拒绝落库）: ${status}`);
        }
        return mapped;
    }
    statusToDomain(entityStatus) {
        const mapped = STATUS_TO_DOMAIN[entityStatus];
        if (!mapped) {
            throw new Error(`未知实体支付状态: ${entityStatus}`);
        }
        return mapped;
    }
    methodToEntity(method) {
        const key = typeof method === 'string' ? method : (method?.value ?? '');
        const mapped = METHOD_TO_ENTITY[key.toUpperCase()];
        if (!mapped) {
            throw new Error(`未知支付方式（fail-closed 拒绝落库）: ${key}`);
        }
        return mapped;
    }
    methodToDomain(entityMethod) {
        const upper = METHOD_TO_DOMAIN[entityMethod];
        if (!upper) {
            throw new Error(`未知实体支付方式: ${entityMethod}`);
        }
        const instances = payment_method_value_object_1.PaymentMethod;
        const instance = instances[upper];
        if (!instance) {
            throw new Error(`PaymentMethod VO 缺少实例: ${upper}`);
        }
        return instance;
    }
};
exports.TypeOrmPaymentOrderRepository = TypeOrmPaymentOrderRepository;
exports.TypeOrmPaymentOrderRepository = TypeOrmPaymentOrderRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TypeOrmPaymentOrderRepository);
