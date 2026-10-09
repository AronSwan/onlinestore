import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';
export declare class NotificationService {
    private notificationRepository;
    private emailService;
    private smsService;
    private pushService;
    constructor(notificationRepository: Repository<Notification>, emailService: EmailService, smsService: SmsService, pushService: PushService);
    sendNotification(userId: number, type: NotificationType, title: string, content: string, metadata?: any, scheduledAt?: Date): Promise<Notification>;
    private processNotification;
    getUserNotifications(userId: number, page?: number, limit?: number): Promise<{
        notifications: Notification[];
        total: number;
    }>;
    markAsRead(notificationId: number, userId: number): Promise<void>;
    markAllAsRead(userId: number): Promise<void>;
    getNotificationById(id: number): Promise<Notification | null>;
    createNotification(dto: {
        userId: number;
        type: NotificationType;
        title: string;
        content: string;
        metadata?: any;
        scheduledAt?: Date;
    }): Promise<Notification>;
}
