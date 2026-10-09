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
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const email_service_1 = require("./services/email.service");
const sms_service_1 = require("./services/sms.service");
const push_service_1 = require("./services/push.service");
let NotificationService = class NotificationService {
    constructor(notificationRepository, emailService, smsService, pushService) {
        this.notificationRepository = notificationRepository;
        this.emailService = emailService;
        this.smsService = smsService;
        this.pushService = pushService;
    }
    async sendNotification(userId, type, title, content, metadata, scheduledAt) {
        const notification = this.notificationRepository.create({
            userId,
            type,
            title,
            content,
            metadata,
            scheduledAt,
        });
        await this.notificationRepository.save(notification);
        if (!scheduledAt) {
            await this.processNotification(notification);
        }
        return notification;
    }
    async processNotification(notification) {
        try {
            switch (notification.type) {
                case notification_entity_1.NotificationType.EMAIL:
                    await this.emailService.sendEmail(notification.metadata?.email, notification.title, notification.content);
                    break;
                case notification_entity_1.NotificationType.SMS:
                    await this.smsService.sendSms(notification.metadata?.phone, notification.content);
                    break;
                case notification_entity_1.NotificationType.PUSH:
                    await this.pushService.sendPush(notification.userId, notification.title, notification.content);
                    break;
                case notification_entity_1.NotificationType.IN_APP:
                    break;
            }
            notification.status = notification_entity_1.NotificationStatus.SENT;
            notification.sentAt = new Date();
        }
        catch (error) {
            notification.status = notification_entity_1.NotificationStatus.FAILED;
            notification.metadata = {
                ...notification.metadata,
                error: error.message,
            };
        }
        await this.notificationRepository.save(notification);
    }
    async getUserNotifications(userId, page = 1, limit = 20) {
        const [notifications, total] = await this.notificationRepository.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { notifications, total };
    }
    async markAsRead(notificationId, userId) {
        await this.notificationRepository.update({ id: notificationId, userId }, { status: notification_entity_1.NotificationStatus.READ, readAt: new Date() });
    }
    async markAllAsRead(userId) {
        await this.notificationRepository.update({ userId, status: notification_entity_1.NotificationStatus.SENT }, { status: notification_entity_1.NotificationStatus.READ, readAt: new Date() });
    }
    async getNotificationById(id) {
        return await this.notificationRepository.findOne({ where: { id } });
    }
    async createNotification(dto) {
        return this.sendNotification(dto.userId, dto.type, dto.title, dto.content, dto.metadata, dto.scheduledAt);
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        email_service_1.EmailService,
        sms_service_1.SmsService,
        push_service_1.PushService])
], NotificationService);
