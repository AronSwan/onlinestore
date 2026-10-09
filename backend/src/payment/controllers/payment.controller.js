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
var PaymentController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const payment_application_service_1 = require("../application/services/payment-application.service");
const payment_query_service_1 = require("../application/services/payment-query.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const rate_limit_guard_1 = require("../../common/security/rate-limit.guard");
const create_payment_order_dto_1 = require("../application/dtos/create-payment-order.dto");
const payment_callback_dto_1 = require("../application/dtos/payment-callback.dto");
const refund_payment_dto_1 = require("../application/dtos/refund-payment.dto");
const query_payment_dto_1 = require("../application/dtos/query-payment.dto");
const payment_order_response_dto_1 = require("../application/dtos/payment-order-response.dto");
const payment_status_response_dto_1 = require("../application/dtos/payment-status-response.dto");
const payment_methods_response_dto_1 = require("../application/dtos/payment-methods-response.dto");
const payment_method_value_object_1 = require("../domain/value-objects/payment-method.value-object");
const payment_order_id_value_object_1 = require("../domain/value-objects/payment-order-id.value-object");
let PaymentController = PaymentController_1 = class PaymentController {
    constructor(paymentApplicationService, paymentQueryService) {
        this.paymentApplicationService = paymentApplicationService;
        this.paymentQueryService = paymentQueryService;
        this.logger = new common_1.Logger(PaymentController_1.name);
    }
    async createPaymentOrder(createOrderDto, idempotencyKey, clientIp, userAgent, req) {
        this.logger.log(`创建支付订单: ${JSON.stringify(createOrderDto)}`);
        const userId = Number(req?.user?.sub ?? 0);
        const paymentContext = {
            userId,
            clientIp: clientIp || req?.ip,
            userAgent,
            idempotencyKey,
            timestamp: new Date(),
        };
        const result = await this.paymentApplicationService.createPaymentOrder(createOrderDto, paymentContext);
        this.logger.log(`支付订单创建成功: ${result.paymentOrderId}`);
        return result;
    }
    async getPaymentOrderStatus(paymentOrderId) {
        this.logger.log(`查询支付订单状态: ${paymentOrderId}`);
        const orderIdVO = payment_order_id_value_object_1.PaymentOrderId.create(paymentOrderId);
        const result = await this.paymentQueryService.getPaymentOrderStatus(orderIdVO);
        return result;
    }
    async batchQueryPaymentStatus(queryDto) {
        this.logger.log(`批量查询支付状态: ${queryDto.paymentOrderIds.length}个订单`);
        const orderIds = queryDto.paymentOrderIds.map(id => payment_order_id_value_object_1.PaymentOrderId.create(id));
        const results = await this.paymentQueryService.batchQueryPaymentStatus(orderIds);
        return results;
    }
    async handlePaymentCallback(paymentMethodStr, callbackData, signature, timestamp, req) {
        this.logger.log(`处理支付回调: ${paymentMethodStr}`);
        try {
            const callbackContext = {
                paymentMethod: payment_method_value_object_1.PaymentMethod.fromString(paymentMethodStr),
                signature,
                timestamp,
                clientIp: req?.ip,
                userAgent: req?.get('user-agent'),
                rawBody: req?.body,
            };
            const result = await this.paymentApplicationService.handlePaymentCallback(callbackData, callbackContext);
            if (result.success) {
                this.logger.log(`支付回调处理成功: ${callbackData.outTradeNo}`);
                return { code: 'SUCCESS', message: 'OK' };
            }
            else {
                this.logger.warn(`支付回调处理失败: ${result.message}`);
                return { code: 'FAIL', message: result.message || 'FAIL' };
            }
        }
        catch (error) {
            this.logger.error(`支付回调处理异常: ${error.message}`, error.stack);
            return { code: 'FAIL', message: 'SYSTEM_ERROR' };
        }
    }
    async createRefund(refundDto, req) {
        this.logger.log(`发起退款: ${JSON.stringify(refundDto)}`);
        const userId = Number(req?.user?.sub ?? 0);
        const refundContext = {
            userId,
            clientIp: req?.ip,
            userAgent: req?.get('user-agent'),
            timestamp: new Date(),
        };
        const result = await this.paymentApplicationService.createRefund(refundDto, refundContext);
        this.logger.log(`退款申请成功: ${result.refundId}`);
        return result;
    }
    async getPaymentMethods() {
        const result = await this.paymentQueryService.getAvailablePaymentMethods();
        return result;
    }
    async getMerchantOrderPayments(merchantOrderId) {
        this.logger.log(`查询商户订单支付记录: ${merchantOrderId}`);
        const results = await this.paymentQueryService.getPaymentsByMerchantOrderId(merchantOrderId);
        return results;
    }
    async syncPaymentOrderStatus(paymentOrderId) {
        this.logger.log(`同步支付订单状态: ${paymentOrderId}`);
        const orderIdVO = payment_order_id_value_object_1.PaymentOrderId.create(paymentOrderId);
        const result = await this.paymentApplicationService.syncPaymentOrderStatus(orderIdVO);
        this.logger.log(`支付订单状态同步完成: ${paymentOrderId}`);
        return result;
    }
    async closePaymentOrder(paymentOrderId, req) {
        this.logger.log(`关闭支付订单: ${paymentOrderId}`);
        const userId = Number(req?.user?.sub ?? 0);
        const orderIdVO = payment_order_id_value_object_1.PaymentOrderId.create(paymentOrderId);
        const result = await this.paymentApplicationService.closePaymentOrder(orderIdVO, String(userId));
        this.logger.log(`支付订单关闭成功: ${paymentOrderId}`);
        return result;
    }
    async healthCheck() {
        const healthStatus = await this.paymentQueryService.getHealthStatus();
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'payment',
            version: '2.0.0',
            ...healthStatus,
        };
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Post)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, rate_limit_guard_1.RateLimitGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: '创建支付订单',
        description: '创建新的支付订单，支持多种支付方式和货币类型',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: '支付订单创建成功',
        type: payment_order_response_dto_1.PaymentOrderResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: '请求参数错误' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: '重复请求' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-idempotency-key')),
    __param(2, (0, common_1.Headers)('x-client-ip')),
    __param(3, (0, common_1.Headers)('user-agent')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_payment_order_dto_1.CreatePaymentOrderDto, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "createPaymentOrder", null);
__decorate([
    (0, common_1.Get)('orders/:paymentOrderId'),
    (0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard),
    (0, swagger_1.ApiOperation)({
        summary: '查询支付订单状态',
        description: '根据支付订单ID查询当前支付状态',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '查询成功',
        type: payment_status_response_dto_1.PaymentStatusResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: '支付订单不存在' }),
    __param(0, (0, common_1.Param)('paymentOrderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPaymentOrderStatus", null);
__decorate([
    (0, common_1.Post)('orders/batch-query'),
    (0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard),
    (0, swagger_1.ApiOperation)({
        summary: '批量查询支付订单状态',
        description: '一次性查询多个支付订单的状态',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '批量查询成功',
        type: [payment_status_response_dto_1.PaymentStatusResponseDto],
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_payment_dto_1.QueryPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "batchQueryPaymentStatus", null);
__decorate([
    (0, common_1.Post)('callbacks/:paymentMethod'),
    (0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: '支付回调处理',
        description: '处理第三方支付平台的异步回调通知',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '回调处理成功',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'SUCCESS' },
                message: { type: 'string', example: 'OK' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: '回调数据无效' }),
    __param(0, (0, common_1.Param)('paymentMethod')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-signature')),
    __param(3, (0, common_1.Headers)('x-timestamp')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, payment_callback_dto_1.PaymentCallbackDto, String, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handlePaymentCallback", null);
__decorate([
    (0, common_1.Post)('refunds'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, rate_limit_guard_1.RateLimitGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: '发起退款',
        description: '对已成功支付的订单发起退款，支持全额退款和部分退款',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: '退款申请成功',
        schema: {
            type: 'object',
            properties: {
                refundId: { type: 'string' },
                status: { type: 'string' },
                refundAmount: { type: 'number' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: '退款参数错误' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: '订单状态不允许退款' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refund_payment_dto_1.RefundPaymentDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "createRefund", null);
__decorate([
    (0, common_1.Get)('methods'),
    (0, swagger_1.ApiOperation)({
        summary: '获取支持的支付方式',
        description: '获取系统支持的所有支付方式列表，包括传统支付和加密货币支付',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: payment_methods_response_dto_1.PaymentMethodsResponseDto,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPaymentMethods", null);
__decorate([
    (0, common_1.Get)('merchant-orders/:merchantOrderId/payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: '查询商户订单的支付记录',
        description: '获取指定商户订单的所有支付记录，包括成功、失败和退款记录',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '查询成功',
        type: [payment_status_response_dto_1.PaymentStatusResponseDto],
    }),
    __param(0, (0, common_1.Param)('merchantOrderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getMerchantOrderPayments", null);
__decorate([
    (0, common_1.Post)('orders/:paymentOrderId/sync'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, rate_limit_guard_1.RateLimitGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: '同步支付订单状态',
        description: '主动向第三方支付平台查询订单状态并更新本地记录',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '同步成功',
        type: payment_status_response_dto_1.PaymentStatusResponseDto,
    }),
    __param(0, (0, common_1.Param)('paymentOrderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "syncPaymentOrderStatus", null);
__decorate([
    (0, common_1.Post)('orders/:paymentOrderId/close'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, rate_limit_guard_1.RateLimitGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: '关闭支付订单（仅本地状态——网关侧会话不关闭）',
        description: '关闭未支付的订单，释放相关资源',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '订单关闭成功',
        schema: {
            type: 'object',
            properties: {
                paymentOrderId: { type: 'string' },
                status: { type: 'string', example: 'CLOSED' },
                closedAt: { type: 'string', format: 'date-time' },
            },
        },
    }),
    __param(0, (0, common_1.Param)('paymentOrderId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "closePaymentOrder", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({
        summary: '支付服务健康检查',
        description: '检查支付服务的运行状态和健康度',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '服务正常',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'healthy' },
                timestamp: { type: 'string', format: 'date-time' },
                service: { type: 'string', example: 'payment' },
                version: { type: 'string', example: '2.0.0' },
                checks: {
                    type: 'object',
                    properties: {
                        database: { type: 'string', example: 'healthy' },
                        redis: { type: 'string', example: 'healthy' },
                        paymentGateways: { type: 'string', example: 'healthy' },
                    },
                },
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "healthCheck", null);
exports.PaymentController = PaymentController = PaymentController_1 = __decorate([
    (0, swagger_1.ApiTags)('Payment'),
    (0, common_1.Controller)('payment'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })),
    __metadata("design:paramtypes", [payment_application_service_1.PaymentApplicationService,
        payment_query_service_1.PaymentQueryService])
], PaymentController);
