"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const notification_service_1 = require("./notification.service");
const notification_entity_1 = require("./entities/notification.entity");
const email_service_1 = require("./services/email.service");
const sms_service_1 = require("./services/sms.service");
const push_service_1 = require("./services/push.service");
describe('NotificationService', () => {
    let service;
    let notificationRepository;
    let emailService;
    let smsService;
    let pushService;
    const mockNotificationRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        findAndCount: jest.fn(),
        update: jest.fn(),
    };
    const mockEmailService = {
        sendEmail: jest.fn().mockResolvedValue({ messageId: 'email-id-123', success: true }),
    };
    const mockSmsService = {
        sendSms: jest.fn().mockResolvedValue({ messageId: 'sms-id-123', success: true }),
    };
    const mockPushService = {
        sendPush: jest.fn().mockResolvedValue({ messageId: 'push-id-123', success: true }),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                notification_service_1.NotificationService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(notification_entity_1.Notification),
                    useValue: mockNotificationRepository,
                },
                {
                    provide: email_service_1.EmailService,
                    useValue: mockEmailService,
                },
                {
                    provide: sms_service_1.SmsService,
                    useValue: mockSmsService,
                },
                {
                    provide: push_service_1.PushService,
                    useValue: mockPushService,
                },
            ],
        }).compile();
        service = module.get(notification_service_1.NotificationService);
        notificationRepository = module.get((0, typeorm_1.getRepositoryToken)(notification_entity_1.Notification));
        emailService = module.get(email_service_1.EmailService);
        smsService = module.get(sms_service_1.SmsService);
        pushService = module.get(push_service_1.PushService);
        jest.clearAllMocks();
    });
    describe('sendNotification', () => {
        it('should send email notification immediately', async () => {
            const userId = 1;
            const type = notification_entity_1.NotificationType.EMAIL;
            const title = 'Test Email';
            const content = 'Test content';
            const metadata = { email: 'test@example.com' };
            const expectedNotification = {
                id: 1,
                userId,
                type,
                title,
                content,
                metadata,
                status: notification_entity_1.NotificationStatus.SENT,
                sentAt: expect.any(Date),
            };
            mockNotificationRepository.create.mockReturnValue(expectedNotification);
            mockNotificationRepository.save.mockResolvedValue(expectedNotification);
            const result = await service.sendNotification(userId, type, title, content, metadata);
            expect(mockNotificationRepository.create).toHaveBeenCalledWith({
                userId,
                type,
                title,
                content,
                metadata,
                scheduledAt: undefined,
            });
            expect(mockNotificationRepository.save).toHaveBeenCalledTimes(2);
            expect(mockEmailService.sendEmail).toHaveBeenCalledWith(metadata.email, title, content);
            expect(result).toEqual(expectedNotification);
        });
        it('should send SMS notification immediately', async () => {
            const userId = 1;
            const type = notification_entity_1.NotificationType.SMS;
            const title = 'Test SMS';
            const content = 'Test content';
            const metadata = { phone: '+1234567890' };
            const expectedNotification = {
                id: 1,
                userId,
                type,
                title,
                content,
                metadata,
                status: notification_entity_1.NotificationStatus.SENT,
                sentAt: expect.any(Date),
            };
            mockNotificationRepository.create.mockReturnValue(expectedNotification);
            mockNotificationRepository.save.mockResolvedValue(expectedNotification);
            const result = await service.sendNotification(userId, type, title, content, metadata);
            expect(mockNotificationRepository.create).toHaveBeenCalledWith({
                userId,
                type,
                title,
                content,
                metadata,
                scheduledAt: undefined,
            });
            expect(mockNotificationRepository.save).toHaveBeenCalledTimes(2);
            expect(mockSmsService.sendSms).toHaveBeenCalledWith(metadata.phone, content);
            expect(result).toEqual(expectedNotification);
        });
        it('should send push notification immediately', async () => {
            const userId = 1;
            const type = notification_entity_1.NotificationType.PUSH;
            const title = 'Test Push';
            const content = 'Test content';
            const expectedNotification = {
                id: 1,
                userId,
                type,
                title,
                content,
                status: notification_entity_1.NotificationStatus.SENT,
                sentAt: expect.any(Date),
            };
            mockNotificationRepository.create.mockReturnValue(expectedNotification);
            mockNotificationRepository.save.mockResolvedValue(expectedNotification);
            const result = await service.sendNotification(userId, type, title, content);
            expect(mockNotificationRepository.create).toHaveBeenCalledWith({
                userId,
                type,
                title,
                content,
                metadata: undefined,
                scheduledAt: undefined,
            });
            expect(mockNotificationRepository.save).toHaveBeenCalledTimes(2);
            expect(mockPushService.sendPush).toHaveBeenCalledWith(userId, title, content);
            expect(result).toEqual(expectedNotification);
        });
        it('should handle in-app notification without sending', async () => {
            const userId = 1;
            const type = notification_entity_1.NotificationType.IN_APP;
            const title = 'Test In-App';
            const content = 'Test content';
            const expectedNotification = {
                id: 1,
                userId,
                type,
                title,
                content,
                status: notification_entity_1.NotificationStatus.SENT,
                sentAt: expect.any(Date),
            };
            mockNotificationRepository.create.mockReturnValue(expectedNotification);
            mockNotificationRepository.save.mockResolvedValue(expectedNotification);
            const result = await service.sendNotification(userId, type, title, content);
            expect(mockNotificationRepository.create).toHaveBeenCalledWith({
                userId,
                type,
                title,
                content,
                metadata: undefined,
                scheduledAt: undefined,
            });
            expect(mockNotificationRepository.save).toHaveBeenCalledTimes(2);
            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
            expect(mockSmsService.sendSms).not.toHaveBeenCalled();
            expect(mockPushService.sendPush).not.toHaveBeenCalled();
            expect(result).toEqual(expectedNotification);
        });
        it('should schedule notification for later sending', async () => {
            const userId = 1;
            const type = notification_entity_1.NotificationType.EMAIL;
            const title = 'Test Email';
            const content = 'Test content';
            const metadata = { email: 'test@example.com' };
            const scheduledAt = new Date(Date.now() + 60000);
            const expectedNotification = {
                id: 1,
                userId,
                type,
                title,
                content,
                metadata,
                scheduledAt,
                status: notification_entity_1.NotificationStatus.PENDING,
            };
            mockNotificationRepository.create.mockReturnValue(expectedNotification);
            mockNotificationRepository.save.mockResolvedValue(expectedNotification);
            const result = await service.sendNotification(userId, type, title, content, metadata, scheduledAt);
            expect(mockNotificationRepository.create).toHaveBeenCalledWith({
                userId,
                type,
                title,
                content,
                metadata,
                scheduledAt,
            });
            expect(mockNotificationRepository.save).toHaveBeenCalledTimes(1);
            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
            expect(result).toEqual(expectedNotification);
        });
        it('should handle email service failure', async () => {
            const userId = 1;
            const type = notification_entity_1.NotificationType.EMAIL;
            const title = 'Test Email';
            const content = 'Test content';
            const metadata = { email: 'test@example.com' };
            const baseNotification = {
                id: 1,
                userId,
                type,
                title,
                content,
                metadata,
                status: notification_entity_1.NotificationStatus.FAILED,
            };
            const expectedNotification = {
                ...baseNotification,
                metadata: {
                    ...metadata,
                    error: 'Email service error',
                },
            };
            mockNotificationRepository.create.mockReturnValue(baseNotification);
            mockNotificationRepository.save.mockResolvedValue(expectedNotification);
            mockEmailService.sendEmail.mockRejectedValue(new Error('Email service error'));
            const result = await service.sendNotification(userId, type, title, content, metadata);
            expect(mockNotificationRepository.save).toHaveBeenCalledTimes(2);
            expect(mockEmailService.sendEmail).toHaveBeenCalled();
            expect(result.status).toBe(notification_entity_1.NotificationStatus.FAILED);
            expect(result.metadata.error).toBe('Email service error');
        });
    });
    describe('getUserNotifications', () => {
        it('should return user notifications with pagination', async () => {
            const userId = 1;
            const page = 1;
            const limit = 20;
            const notifications = [
                {
                    id: 1,
                    userId,
                    type: notification_entity_1.NotificationType.EMAIL,
                    title: 'Test Email',
                    content: 'Test content',
                    status: notification_entity_1.NotificationStatus.SENT,
                },
                {
                    id: 2,
                    userId,
                    type: notification_entity_1.NotificationType.SMS,
                    title: 'Test SMS',
                    content: 'Test content',
                    status: notification_entity_1.NotificationStatus.SENT,
                },
            ];
            const total = 2;
            mockNotificationRepository.findAndCount.mockResolvedValue([notifications, total]);
            const result = await service.getUserNotifications(userId, page, limit);
            expect(mockNotificationRepository.findAndCount).toHaveBeenCalledWith({
                where: { userId },
                order: { createdAt: 'DESC' },
                skip: 0,
                take: limit,
            });
            expect(result).toEqual({ notifications, total });
        });
        it('should use default pagination values', async () => {
            const userId = 1;
            const notifications = [];
            const total = 0;
            mockNotificationRepository.findAndCount.mockResolvedValue([notifications, total]);
            const result = await service.getUserNotifications(userId);
            expect(mockNotificationRepository.findAndCount).toHaveBeenCalledWith({
                where: { userId },
                order: { createdAt: 'DESC' },
                skip: 0,
                take: 20,
            });
            expect(result).toEqual({ notifications, total });
        });
    });
    describe('markAsRead', () => {
        it('should mark notification as read', async () => {
            const notificationId = 1;
            const userId = 1;
            mockNotificationRepository.update.mockResolvedValue({ affected: 1 });
            await service.markAsRead(notificationId, userId);
            expect(mockNotificationRepository.update).toHaveBeenCalledWith({ id: notificationId, userId }, { status: notification_entity_1.NotificationStatus.READ, readAt: expect.any(Date) });
        });
    });
    describe('markAllAsRead', () => {
        it('should mark all sent notifications as read for user', async () => {
            const userId = 1;
            mockNotificationRepository.update.mockResolvedValue({ affected: 5 });
            await service.markAllAsRead(userId);
            expect(mockNotificationRepository.update).toHaveBeenCalledWith({ userId, status: notification_entity_1.NotificationStatus.SENT }, { status: notification_entity_1.NotificationStatus.READ, readAt: expect.any(Date) });
        });
    });
    describe('getNotificationById', () => {
        it('should return notification by id', async () => {
            const notificationId = 1;
            const expectedNotification = {
                id: notificationId,
                userId: 1,
                type: notification_entity_1.NotificationType.EMAIL,
                title: 'Test Email',
                content: 'Test content',
                status: notification_entity_1.NotificationStatus.SENT,
            };
            mockNotificationRepository.findOne.mockResolvedValue(expectedNotification);
            const result = await service.getNotificationById(notificationId);
            expect(mockNotificationRepository.findOne).toHaveBeenCalledWith({
                where: { id: notificationId },
            });
            expect(result).toEqual(expectedNotification);
        });
        it('should return null if notification not found', async () => {
            const notificationId = 999;
            mockNotificationRepository.findOne.mockResolvedValue(null);
            const result = await service.getNotificationById(notificationId);
            expect(mockNotificationRepository.findOne).toHaveBeenCalledWith({
                where: { id: notificationId },
            });
            expect(result).toBeNull();
        });
    });
    describe('createNotification', () => {
        it('should create notification using DTO', async () => {
            const notificationDto = {
                userId: 1,
                type: notification_entity_1.NotificationType.EMAIL,
                title: 'Test Email',
                content: 'Test content',
                metadata: { email: 'test@example.com' },
            };
            const expectedNotification = {
                id: 1,
                ...notificationDto,
                status: notification_entity_1.NotificationStatus.SENT,
                sentAt: expect.any(Date),
            };
            mockNotificationRepository.create.mockReturnValue(expectedNotification);
            mockNotificationRepository.save.mockResolvedValue(expectedNotification);
            const result = await service.createNotification(notificationDto);
            expect(result).toEqual(expectedNotification);
            expect(mockEmailService.sendEmail).toHaveBeenCalledWith(notificationDto.metadata.email, notificationDto.title, notificationDto.content);
        });
    });
});
