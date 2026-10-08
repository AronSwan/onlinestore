import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: Repository<Notification>;
  let emailService: EmailService;
  let smsService: SmsService;
  let pushService: PushService;

  // Mock repositories
  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  // Mock services
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: PushService,
          useValue: mockPushService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get<Repository<Notification>>(getRepositoryToken(Notification));
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SmsService>(SmsService);
    pushService = module.get<PushService>(PushService);

    // 重置所有 mock
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should send email notification immediately', async () => {
      const userId = 1;
      const type = NotificationType.EMAIL;
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
        status: NotificationStatus.SENT,
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
      expect(mockNotificationRepository.save).toHaveBeenCalledTimes(2); // 一次创建，一次更新状态
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(metadata.email, title, content);
      expect(result).toEqual(expectedNotification);
    });

    it('should send SMS notification immediately', async () => {
      const userId = 1;
      const type = NotificationType.SMS;
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
        status: NotificationStatus.SENT,
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
      const type = NotificationType.PUSH;
      const title = 'Test Push';
      const content = 'Test content';

      const expectedNotification = {
        id: 1,
        userId,
        type,
        title,
        content,
        status: NotificationStatus.SENT,
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
      const type = NotificationType.IN_APP;
      const title = 'Test In-App';
      const content = 'Test content';

      const expectedNotification = {
        id: 1,
        userId,
        type,
        title,
        content,
        status: NotificationStatus.SENT,
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
      const type = NotificationType.EMAIL;
      const title = 'Test Email';
      const content = 'Test content';
      const metadata = { email: 'test@example.com' };
      const scheduledAt = new Date(Date.now() + 60000); // 1 minute from now

      const expectedNotification = {
        id: 1,
        userId,
        type,
        title,
        content,
        metadata,
        scheduledAt,
        status: NotificationStatus.PENDING,
      };

      mockNotificationRepository.create.mockReturnValue(expectedNotification);
      mockNotificationRepository.save.mockResolvedValue(expectedNotification);

      const result = await service.sendNotification(
        userId,
        type,
        title,
        content,
        metadata,
        scheduledAt,
      );

      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        userId,
        type,
        title,
        content,
        metadata,
        scheduledAt,
      });
      expect(mockNotificationRepository.save).toHaveBeenCalledTimes(1); // 只创建，不处理
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
      expect(result).toEqual(expectedNotification);
    });

    it('should handle email service failure', async () => {
      const userId = 1;
      const type = NotificationType.EMAIL;
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
        status: NotificationStatus.FAILED,
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
      expect(result.status).toBe(NotificationStatus.FAILED);
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
          type: NotificationType.EMAIL,
          title: 'Test Email',
          content: 'Test content',
          status: NotificationStatus.SENT,
        },
        {
          id: 2,
          userId,
          type: NotificationType.SMS,
          title: 'Test SMS',
          content: 'Test content',
          status: NotificationStatus.SENT,
        },
      ] as Notification[];
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
      const notifications: Notification[] = [];
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

      expect(mockNotificationRepository.update).toHaveBeenCalledWith(
        { id: notificationId, userId },
        { status: NotificationStatus.READ, readAt: expect.any(Date) },
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all sent notifications as read for user', async () => {
      const userId = 1;

      mockNotificationRepository.update.mockResolvedValue({ affected: 5 });

      await service.markAllAsRead(userId);

      expect(mockNotificationRepository.update).toHaveBeenCalledWith(
        { userId, status: NotificationStatus.SENT },
        { status: NotificationStatus.READ, readAt: expect.any(Date) },
      );
    });
  });

  describe('getNotificationById', () => {
    it('should return notification by id', async () => {
      const notificationId = 1;
      const expectedNotification = {
        id: notificationId,
        userId: 1,
        type: NotificationType.EMAIL,
        title: 'Test Email',
        content: 'Test content',
        status: NotificationStatus.SENT,
      } as Notification;

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
        type: NotificationType.EMAIL,
        title: 'Test Email',
        content: 'Test content',
        metadata: { email: 'test@example.com' },
      };

      const expectedNotification = {
        id: 1,
        ...notificationDto,
        status: NotificationStatus.SENT,
        sentAt: expect.any(Date),
      };

      mockNotificationRepository.create.mockReturnValue(expectedNotification);
      mockNotificationRepository.save.mockResolvedValue(expectedNotification);

      const result = await service.createNotification(notificationDto);

      expect(result).toEqual(expectedNotification);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        notificationDto.metadata.email,
        notificationDto.title,
        notificationDto.content,
      );
    });
  });
});
