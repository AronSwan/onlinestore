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
var NotificationController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = exports.CreateNotificationDto = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const notification_entity_1 = require("./entities/notification.entity");
const notification_service_1 = require("./notification.service");
const redpanda_service_1 = require("../messaging/redpanda.service");
const topics_1 = require("../messaging/topics");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/enums/role.enum");
class CreateNotificationDto {
}
exports.CreateNotificationDto = CreateNotificationDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateNotificationDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(notification_entity_1.NotificationType),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateNotificationDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateNotificationDto.prototype, "metadata", void 0);
let NotificationController = NotificationController_1 = class NotificationController {
    constructor(notificationService, redpandaService) {
        this.notificationService = notificationService;
        this.redpandaService = redpandaService;
        this.logger = new common_1.Logger(NotificationController_1.name);
    }
    async getNotifications(userId, page = 1, limit = 10, req = {}) {
        const user = req?.user;
        if (user?.role !== role_enum_1.Role.ADMIN && String(user?.sub) !== String(userId)) {
            throw new common_1.ForbiddenException('只能查看本人的通知');
        }
        return this.notificationService.getUserNotifications(userId, page, limit);
    }
    async getNotification(id, req) {
        const notification = await this.notificationService.getNotificationById(id);
        const user = req?.user;
        if (!notification) {
            throw new common_1.NotFoundException(`通知 ${id} 不存在`);
        }
        if (user?.role !== role_enum_1.Role.ADMIN && String(user?.sub) !== String(notification.userId)) {
            throw new common_1.ForbiddenException('只能查看本人的通知');
        }
        return notification;
    }
    async createNotification(createNotificationDto) {
        return this.notificationService.createNotification(createNotificationDto);
    }
    async testNotification(testData) {
        try {
            await this.redpandaService.publish(topics_1.Topics.NotificationSend, {
                userId: testData.userId,
                type: testData.type || 'test',
                title: testData.title,
                content: testData.content,
                channel: testData.channel || 'email',
                timestamp: new Date().toISOString(),
                metadata: { source: 'test-endpoint' },
            });
            this.logger.log(`Test notification published for user ${testData.userId}`);
            return { message: '测试通知已发送到消息队列', timestamp: new Date().toISOString() };
        }
        catch (error) {
            this.logger.error('Failed to publish test notification', error);
            throw error;
        }
    }
    async sendBulkNotifications(bulkData) {
        try {
            const promises = bulkData.userIds.map(userId => this.redpandaService.publish(topics_1.Topics.NotificationSend, {
                userId,
                type: bulkData.type,
                title: bulkData.title,
                content: bulkData.content,
                channel: bulkData.channel || 'email',
                timestamp: new Date().toISOString(),
                metadata: { source: 'bulk-endpoint' },
            }));
            await Promise.all(promises);
            this.logger.log(`Bulk notifications published for ${bulkData.userIds.length} users`);
            return { message: `批量通知已发送给 ${bulkData.userIds.length} 个用户`, timestamp: new Date().toISOString() };
        }
        catch (error) {
            this.logger.error('Failed to publish bulk notifications', error);
            throw error;
        }
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotification", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateNotificationDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "createNotification", null);
__decorate([
    (0, common_1.Post)('test'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "testNotification", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "sendBulkNotifications", null);
exports.NotificationController = NotificationController = NotificationController_1 = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notification_service_1.NotificationService,
        redpanda_service_1.RedpandaService])
], NotificationController);
