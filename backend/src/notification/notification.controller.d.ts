import { NotificationType } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { RedpandaService } from '../messaging/redpanda.service';
export declare class CreateNotificationDto {
    userId: number;
    type: NotificationType;
    title: string;
    content: string;
    metadata?: Record<string, any>;
}
export declare class NotificationController {
    private readonly notificationService;
    private readonly redpandaService;
    private readonly logger;
    constructor(notificationService: NotificationService, redpandaService: RedpandaService);
    getNotifications(userId: number, page?: number, limit?: number, req?: any): Promise<{
        notifications: import("./entities/notification.entity").Notification[];
        total: number;
    }>;
    getNotification(id: number, req: any): Promise<import("./entities/notification.entity").Notification>;
    createNotification(createNotificationDto: CreateNotificationDto): Promise<import("./entities/notification.entity").Notification>;
    testNotification(testData: {
        userId: number;
        type: string;
        title: string;
        content: string;
        channel?: string;
    }): Promise<{
        message: string;
        timestamp: string;
    }>;
    sendBulkNotifications(bulkData: {
        userIds: number[];
        type: string;
        title: string;
        content: string;
        channel?: string;
    }): Promise<{
        message: string;
        timestamp: string;
    }>;
}
