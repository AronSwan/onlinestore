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
var PaymentApplicationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentApplicationService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const payment_order_aggregate_1 = require("../../domain/aggregates/payment-order.aggregate");
const payment_gateway_factory_1 = require("../../domain/services/payment-gateway.factory");
const payment_risk_service_1 = require("../../domain/services/payment-risk.service");
const payment_order_id_value_object_1 = require("../../domain/value-objects/payment-order-id.value-object");
const money_value_object_1 = require("../../domain/value-objects/money.value-object");
const payment_method_value_object_1 = require("../../domain/value-objects/payment-method.value-object");
const create_payment_order_command_1 = require("../commands/create-payment-order.command");
const process_payment_callback_command_1 = require("../commands/process-payment-callback.command");
const create_refund_command_1 = require("../commands/create-refund.command");
const payment_order_created_event_1 = require("../../domain/events/payment-order-created.event");
const payment_succeeded_event_1 = require("../../domain/events/payment-succeeded.event");
const payment_failed_event_1 = require("../../domain/events/payment-failed.event");
const refund_created_event_1 = require("../../domain/events/refund-created.event");
let PaymentApplicationService = PaymentApplicationService_1 = class PaymentApplicationService {
    constructor(paymentOrderRepository, paymentGatewayFactory, paymentRiskService, eventEmitter) {
        this.paymentOrderRepository = paymentOrderRepository;
        this.paymentGatewayFactory = paymentGatewayFactory;
        this.paymentRiskService = paymentRiskService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(PaymentApplicationService_1.name);
    }
    async createPaymentOrder(dto, context) {
        this.logger.log(`创建支付订单开始: ${dto.merchantOrderId}`);
        try {
            const command = create_payment_order_command_1.CreatePaymentOrderCommand.create({
                merchantOrderId: dto.merchantOrderId,
                amount: money_value_object_1.Money.create(dto.amount, dto.currency),
                paymentMethod: payment_method_value_object_1.PaymentMethod.fromString(dto.paymentMethod),
                subject: dto.subject || '',
                description: dto.description || '',
                userId: String(context.userId ?? ''),
                clientIp: String(context.clientIp ?? ''),
                userAgent: String(context.userAgent ?? ''),
                idempotencyKey: context.idempotencyKey ? String(context.idempotencyKey) : undefined,
                notifyUrl: dto.notifyUrl,
                returnUrl: dto.returnUrl,
                expireTime: dto.expireTime ? new Date(dto.expireTime) : undefined,
                extraParams: dto.extraParams,
            });
            if (context.idempotencyKey) {
                const existingOrder = await this.paymentOrderRepository.findByIdempotencyKey(String(context.idempotencyKey));
                if (existingOrder) {
                    this.logger.log(`幂等性检查：返回已存在的订单 ${existingOrder.id.value}`);
                    return this.toPaymentOrderResponse(existingOrder);
                }
            }
            const riskResult = await this.paymentRiskService.assessRisk({
                userId: String(context.userId ?? ''),
                amount: command.amount,
                paymentMethod: command.paymentMethod,
                clientIp: String(context.clientIp ?? ''),
                userAgent: String(context.userAgent ?? ''),
            });
            if (riskResult.isHighRisk()) {
                throw new Error(`支付风险过高: ${riskResult.getReason()}`);
            }
            const paymentOrder = payment_order_aggregate_1.PaymentOrderAggregate.create(command);
            const gateway = this.paymentGatewayFactory.createGateway(command.paymentMethod);
            const gatewayResult = await gateway.createPayment({
                paymentOrderId: paymentOrder.id.value,
                merchantOrderId: command.merchantOrderId,
                amount: command.amount,
                subject: command.subject,
                description: command.description || '',
                notifyUrl: command.notifyUrl,
                returnUrl: command.returnUrl,
                expireTime: command.expireTime,
                extraParams: command.extraParams,
            });
            paymentOrder.updateGatewayInfo(gatewayResult.gatewayOrderId, gatewayResult.paymentUrl, gatewayResult.qrCode);
            await this.paymentOrderRepository.save(paymentOrder);
            const event = new payment_order_created_event_1.PaymentOrderCreatedEvent(paymentOrder.id.value, command.merchantOrderId, command.amount.amount, command.amount.currency, command.paymentMethod.value, String(context.userId ?? ''));
            this.eventEmitter.emit('payment.order.created', event);
            this.logger.log(`支付订单创建成功: ${paymentOrder.id.value}`);
            return this.toPaymentOrderResponse(paymentOrder);
        }
        catch (error) {
            this.logger.error(`创建支付订单失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async handlePaymentCallback(dto, context) {
        this.logger.log(`处理支付回调开始: ${dto.outTradeNo}`);
        try {
            const command = process_payment_callback_command_1.ProcessPaymentCallbackCommand.create({
                paymentMethod: context.paymentMethod,
                outTradeNo: dto.outTradeNo,
                gatewayOrderId: dto.gatewayOrderId,
                tradeStatus: dto.tradeStatus,
                totalAmount: dto.totalAmount,
                receiptAmount: dto.receiptAmount,
                gmtPayment: dto.gmtPayment ? new Date(dto.gmtPayment) : undefined,
                signature: context.signature,
                rawData: dto.rawData,
            });
            const gateway = this.paymentGatewayFactory.createGateway(context.paymentMethod);
            const isValidSignature = await gateway.verifyCallback({
                signature: context.signature,
                data: (dto.rawData ?? dto),
                timestamp: context.timestamp,
            });
            if (!isValidSignature) {
                this.logger.warn(`支付回调签名验证失败: ${dto.outTradeNo}`);
                return { success: false, message: 'INVALID_SIGNATURE' };
            }
            const paymentOrders = await this.paymentOrderRepository.findByMerchantOrderId(dto.outTradeNo);
            const paymentOrder = paymentOrders.length > 0 ? paymentOrders[0] : null;
            if (!paymentOrder) {
                this.logger.warn(`支付订单不存在: ${dto.outTradeNo}`);
                return { success: false, message: 'ORDER_NOT_FOUND' };
            }
            const isSuccess = gateway.isPaymentSuccess(dto.tradeStatus);
            if (isSuccess) {
                paymentOrder.markAsSucceeded(dto.gatewayOrderId, money_value_object_1.Money.create(dto.receiptAmount || 0, paymentOrder.amount.currency), command.gmtPayment);
                const event = new payment_succeeded_event_1.PaymentSucceededEvent(paymentOrder.id.value, paymentOrder.merchantOrderId, dto.receiptAmount || 0, paymentOrder.amount.currency, dto.gatewayOrderId);
                this.eventEmitter.emit('payment.succeeded', event);
            }
            else {
                const failureReason = gateway.getFailureReason(dto.tradeStatus);
                paymentOrder.markAsFailed(failureReason);
                const event = new payment_failed_event_1.PaymentFailedEvent(paymentOrder.id.value, paymentOrder.merchantOrderId, failureReason);
                this.eventEmitter.emit('payment.failed', event);
            }
            await this.paymentOrderRepository.save(paymentOrder);
            this.logger.log(`支付回调处理成功: ${dto.outTradeNo}, 状态: ${dto.tradeStatus}`);
            return { success: true };
        }
        catch (error) {
            this.logger.error(`处理支付回调失败: ${error.message}`, error.stack);
            return { success: false, message: 'SYSTEM_ERROR' };
        }
    }
    async createRefund(dto, context) {
        this.logger.log(`创建退款开始: ${dto.paymentOrderId}`);
        try {
            const command = create_refund_command_1.CreateRefundCommand.create({
                paymentOrderId: payment_order_id_value_object_1.PaymentOrderId.create(dto.paymentOrderId),
                refundAmount: money_value_object_1.Money.create(dto.refundAmount, dto.currency),
                reason: dto.reason,
                operatorId: String(context.userId ?? 'system'),
            });
            const paymentOrder = await this.paymentOrderRepository.findById(command.paymentOrderId);
            if (!paymentOrder) {
                throw new Error('支付订单不存在');
            }
            const refund = paymentOrder.createRefund(command.refundAmount, command.reason, command.operatorId);
            const gateway = this.paymentGatewayFactory.createGateway(paymentOrder.paymentMethod);
            const gatewayResult = await gateway.createRefund({
                paymentOrderId: paymentOrder.id.value,
                gatewayOrderId: paymentOrder.gatewayOrderId ?? '',
                refundId: refund.id.value,
                refundAmount: command.refundAmount,
                reason: command.reason,
            });
            refund.updateGatewayInfo(gatewayResult.gatewayRefundId);
            await this.paymentOrderRepository.save(paymentOrder);
            const event = new refund_created_event_1.RefundCreatedEvent(refund.id.value, paymentOrder.id.value, paymentOrder.merchantOrderId, command.refundAmount.amount, command.refundAmount.currency, command.reason, command.operatorId);
            this.eventEmitter.emit('refund.created', event);
            this.logger.log(`退款创建成功: ${refund.id.value}`);
            return {
                refundId: refund.id.value,
                status: refund.status,
                refundAmount: command.refundAmount.amount,
            };
        }
        catch (error) {
            this.logger.error(`创建退款失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async syncPaymentOrderStatus(paymentOrderId) {
        this.logger.log(`同步支付订单状态: ${paymentOrderId.value}`);
        try {
            const paymentOrder = await this.paymentOrderRepository.findById(paymentOrderId);
            if (!paymentOrder) {
                throw new Error('支付订单不存在');
            }
            const gateway = this.paymentGatewayFactory.createGateway(paymentOrder.paymentMethod);
            const gatewayStatus = await gateway.queryPaymentStatus({
                paymentOrderId: paymentOrder.id.value,
                gatewayOrderId: paymentOrder.gatewayOrderId ?? '',
            });
            if (gatewayStatus.isSuccess && !paymentOrder.isSucceeded()) {
                paymentOrder.markAsSucceeded(gatewayStatus.gatewayOrderId, money_value_object_1.Money.create(gatewayStatus.paidAmount, paymentOrder.amount.currency), gatewayStatus.paidAt);
                await this.paymentOrderRepository.save(paymentOrder);
            }
            this.logger.log(`支付订单状态同步完成: ${paymentOrderId.value}`);
            return this.toPaymentStatusResponse(paymentOrder);
        }
        catch (error) {
            this.logger.error(`同步支付订单状态失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    async closePaymentOrder(paymentOrderId, operatorId) {
        this.logger.log(`关闭支付订单: ${paymentOrderId.value}`);
        try {
            const paymentOrder = await this.paymentOrderRepository.findById(paymentOrderId);
            if (!paymentOrder) {
                throw new Error('支付订单不存在');
            }
            paymentOrder.close(operatorId);
            const gateway = this.paymentGatewayFactory.createGateway(paymentOrder.paymentMethod);
            await gateway.closePayment({
                paymentOrderId: paymentOrder.id.value,
                gatewayOrderId: paymentOrder.gatewayOrderId ?? '',
            });
            await this.paymentOrderRepository.save(paymentOrder);
            this.logger.log(`支付订单关闭成功: ${paymentOrderId.value}`);
            return {
                paymentOrderId: paymentOrder.id.value,
                status: paymentOrder.status,
                closedAt: paymentOrder.closedAt ? paymentOrder.closedAt.toISOString() : '',
            };
        }
        catch (error) {
            this.logger.error(`关闭支付订单失败: ${error.message}`, error.stack);
            throw error;
        }
    }
    toPaymentOrderResponse(paymentOrder) {
        return {
            paymentOrderId: paymentOrder.id.value,
            merchantOrderId: paymentOrder.merchantOrderId,
            amount: paymentOrder.amount.amount,
            currency: paymentOrder.amount.currency,
            paymentMethod: paymentOrder.paymentMethod.value,
            status: paymentOrder.status,
            paymentUrl: paymentOrder.paymentUrl,
            qrCode: paymentOrder.qrCode,
            expireTime: paymentOrder.expireTime?.toISOString(),
            createdAt: paymentOrder.createdAt.toISOString(),
        };
    }
    toPaymentStatusResponse(paymentOrder) {
        return {
            paymentOrderId: paymentOrder.id.value,
            merchantOrderId: paymentOrder.merchantOrderId,
            amount: paymentOrder.amount.amount,
            currency: paymentOrder.amount.currency,
            paymentMethod: paymentOrder.paymentMethod.value,
            status: paymentOrder.status,
            paidAmount: paymentOrder.paidAmount?.amount,
            paidAt: paymentOrder.paidAt?.toISOString(),
            failureReason: paymentOrder.failureReason,
            createdAt: paymentOrder.createdAt.toISOString(),
            updatedAt: paymentOrder.updatedAt.toISOString(),
        };
    }
};
exports.PaymentApplicationService = PaymentApplicationService;
exports.PaymentApplicationService = PaymentApplicationService = PaymentApplicationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PaymentOrderRepository')),
    __metadata("design:paramtypes", [Object, payment_gateway_factory_1.PaymentGatewayFactory,
        payment_risk_service_1.PaymentRiskService,
        event_emitter_1.EventEmitter2])
], PaymentApplicationService);
