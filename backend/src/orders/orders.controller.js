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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const orders_service_1 = require("./orders.service");
const order_dto_1 = require("./dto/order.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const owner_or_admin_guard_1 = require("../common/guards/owner-or-admin.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/enums/role.enum");
const route_label_interceptor_1 = require("../monitoring/route-label.interceptor");
const api_docs_decorator_1 = require("../common/decorators/api-docs.decorator");
let OrdersController = class OrdersController {
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    create(createOrderData, req) {
        createOrderData = { ...createOrderData, userId: req?.user?.sub };
        return this.ordersService.create(createOrderData);
    }
    findAll(page, limit, status, startDate, endDate) {
        return this.ordersService.findAll(page, limit);
    }
    findByUserId(userId, page, limit, status) {
        return this.ordersService.findByUserId(userId, page, limit);
    }
    async findOne(id, req) {
        const order = await this.ordersService.findById(id);
        if (!order) {
            throw new common_1.NotFoundException(`订单 ${id} 不存在`);
        }
        const user = req?.user;
        if (user?.role !== role_enum_1.Role.ADMIN && String(order.userId) !== String(user?.sub)) {
            throw new common_1.ForbiddenException('只能查看本人订单');
        }
        return order;
    }
    update(id, updateOrderData) {
        return this.ordersService.update(id, updateOrderData);
    }
    remove(id) {
        return this.ordersService.delete(id);
    }
    getStatistics() {
        return this.ordersService.getStatistics();
    }
    async getMessageHistory(topic, limit, offset) {
        return this.ordersService.getMessageHistory(topic, limit, offset);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '创建订单',
        description: '用户基于购物车或直接购买创建新订单',
        auth: true,
        responses: {
            success: {
                description: '订单创建成功',
            },
            badRequest: '请求参数错误或库存不足',
        },
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [order_dto_1.CreateOrderData, Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, api_docs_decorator_1.ApiPaginatedQuery)(Object, '获取订单列表', '管理员分页获取所有订单列表，支持状态筛选'),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '获取订单列表',
        description: '管理员分页获取所有订单列表，支持按状态、时间等条件筛选',
        auth: true,
        queries: [
            {
                name: 'status',
                description: '订单状态筛选',
                required: false,
                type: 'string',
            },
            {
                name: 'startDate',
                description: '开始日期',
                required: false,
                type: 'string',
            },
            {
                name: 'endDate',
                description: '结束日期',
                required: false,
                type: 'string',
            },
        ],
    }),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, owner_or_admin_guard_1.OwnerOrAdminGuard),
    (0, owner_or_admin_guard_1.OwnerParam)('userId'),
    (0, api_docs_decorator_1.ApiPaginatedQuery)(Object, '获取用户订单', '获取指定用户的订单列表'),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '获取用户订单',
        description: '获取指定用户的订单列表，支持状态筛选',
        auth: true,
        params: [
            {
                name: 'userId',
                description: '用户ID',
                example: 1,
            },
        ],
        queries: [
            {
                name: 'status',
                description: '订单状态筛选',
                required: false,
                type: 'string',
            },
        ],
    }),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findByUserId", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, api_docs_decorator_1.ApiGetResource)(Object, '获取订单详情'),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '获取订单详情',
        description: '根据订单ID获取详细信息，包括订单项、支付状态、物流信息等',
        auth: true,
        params: [
            {
                name: 'id',
                description: '订单ID',
                example: 1,
            },
        ],
        responses: {
            success: {
                description: '获取订单详情成功',
            },
            notFound: '订单不存在',
        },
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, api_docs_decorator_1.ApiUpdateResource)(Object, Object, '更新订单状态'),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '更新订单状态',
        description: '管理员更新订单状态，如确认、发货、完成、取消等',
        auth: true,
        params: [
            {
                name: 'id',
                description: '订单ID',
                example: 1,
            },
        ],
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, order_dto_1.UpdateOrderData]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, api_docs_decorator_1.ApiDeleteResource)('删除订单'),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '删除订单',
        description: '管理员删除订单记录（软删除）',
        auth: true,
        params: [
            {
                name: 'id',
                description: '订单ID',
                example: 1,
            },
        ],
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('statistics/overview'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '获取订单统计',
        description: '获取订单相关的统计信息，包括总数、销售额、状态分布等',
        auth: true,
        responses: {
            success: {
                description: '获取统计信息成功',
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('messages/history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '获取消息历史',
        description: '获取订单相关的Kafka消息历史记录，用于调试和审计',
        auth: true,
        queries: [
            {
                name: 'topic',
                description: 'Kafka主题名称',
                required: true,
                type: 'string',
            },
            {
                name: 'limit',
                description: '返回消息数量限制',
                required: false,
                type: 'number',
                example: 10,
            },
            {
                name: 'offset',
                description: '消息偏移量',
                required: false,
                type: 'number',
                example: 0,
            },
        ],
    }),
    __param(0, (0, common_1.Query)('topic')),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getMessageHistory", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)('订单管理'),
    (0, common_1.Controller)('orders'),
    (0, common_1.UseInterceptors)(route_label_interceptor_1.RouteLabelInterceptor),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
