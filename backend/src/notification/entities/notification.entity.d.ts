export declare enum NotificationType {
    EMAIL = "email",
    SMS = "sms",
    PUSH = "push",
    IN_APP = "in_app"
}
export declare enum NotificationStatus {
    PENDING = "pending",
    SENT = "sent",
    FAILED = "failed",
    READ = "read"
}
export declare class Notification {
    id: number;
    userId: number;
    type: NotificationType;
    title: string;
    content: string;
    status: NotificationStatus;
    metadata: any;
    scheduledAt: Date;
    sentAt: Date;
    readAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
