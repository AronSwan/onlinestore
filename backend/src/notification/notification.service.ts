import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private emailService: EmailService,
    private smsService: SmsService,
    private pushService: PushService,
  ) {}

  /**
   * 发送通知
   */
  async sendNotification(
    userId: number,
    type: NotificationType,
    title: string,
    content: string,
    metadata?: any,
    scheduledAt?: Date,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      content,
      metadata,
      scheduledAt,
    });

    await this.notificationRepository.save(notification);

    // 如果没有设置定时发送，立即发送
    if (!scheduledAt) {
      await this.processNotification(notification);
    }

    return notification;
  }

  /**
   * 处理通知发送
   */
  private async processNotification(notification: Notification): Promise<void> {
    try {
      switch (notification.type) {
        case NotificationType.EMAIL:
          await this.emailService.sendEmail(
            notification.metadata?.email,
            notification.title,
            notification.content,
          );
          break;
        case NotificationType.SMS:
          await this.smsService.sendSms(notification.metadata?.phone, notification.content);
          break;
        case NotificationType.PUSH:
          await this.pushService.sendPush(
            notification.userId,
            notification.title,
            notification.content,
          );
          break;
        case NotificationType.IN_APP:
          // 应用内通知不需要额外处理，直接标记为已发送
          break;
      }

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.metadata = {
        ...notification.metadata,
        error: error.message,
      };
    }

    await this.notificationRepository.save(notification);
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { notifications, total };
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, userId },
      { status: NotificationStatus.READ, readAt: new Date() },
    );
  }

  /**
   * 批量标记为已读
   */
  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { userId, status: NotificationStatus.SENT },
      { status: NotificationStatus.READ, readAt: new Date() },
    );
  }

  /**
   * 兼容：按 ID 获取通知（controller 期望的接口）
   */
  async getNotificationById(id: number): Promise<Notification | null> {
    return await this.notificationRepository.findOne({ where: { id } });
  }

  /**
   * 兼容：创建通知（controller 期望的更简单的接口）
   * 接受 DTO-like 对象并委托到 sendNotification
   */
  async createNotification(dto: {
    userId: number;
    type: NotificationType;
    title: string;
    content: string;
    metadata?: any;
    scheduledAt?: Date;
  }): Promise<Notification> {
    return this.sendNotification(
      dto.userId,
      dto.type,
      dto.title,
      dto.content,
      dto.metadata,
      dto.scheduledAt,
    );
  }
}
