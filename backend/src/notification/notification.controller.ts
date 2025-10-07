import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { RedpandaService } from '../messaging/redpanda.service';
import { Topics } from '../messaging/topics';

@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly redpandaService: RedpandaService,
  ) {}

  @Get()
  async getNotifications(
    @Query('userId') userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.notificationService.getUserNotifications(userId, page, limit);
  }

  @Get(':id')
  async getNotification(@Param('id') id: number) {
    return this.notificationService.getNotificationById(id);
  }

  @Post()
  async createNotification(@Body() createNotificationDto: any) {
    return this.notificationService.createNotification(createNotificationDto);
  }

  @Post('test')
  async testNotification(
    @Body()
    testData: {
      userId: number;
      type: string;
      title: string;
      content: string;
      channel?: string;
    },
  ) {
    try {
      // 发布测试消息到 Redpanda
      await this.redpandaService.publish(Topics.NotificationSend, {
        userId: testData.userId,
        type: testData.type || 'test',
        title: testData.title,
        content: testData.content,
        channel: testData.channel || 'email',
        timestamp: new Date().toISOString(),
        metadata: { source: 'test-endpoint' },
      });

      this.logger.log(`Test notification published for user ${testData.userId}`);

      return {
        success: true,
        message: '测试通知已发送到消息队列',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to publish test notification', error);
      throw error;
    }
  }

  @Post('bulk')
  async sendBulkNotifications(
    @Body()
    bulkData: {
      userIds: number[];
      type: string;
      title: string;
      content: string;
      channel?: string;
    },
  ) {
    try {
      const promises = bulkData.userIds.map(userId =>
        this.redpandaService.publish(Topics.NotificationSend, {
          userId,
          type: bulkData.type,
          title: bulkData.title,
          content: bulkData.content,
          channel: bulkData.channel || 'email',
          timestamp: new Date().toISOString(),
          metadata: { source: 'bulk-endpoint' },
        }),
      );

      await Promise.all(promises);

      this.logger.log(`Bulk notifications published for ${bulkData.userIds.length} users`);

      return {
        success: true,
        message: `批量通知已发送给 ${bulkData.userIds.length} 个用户`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to publish bulk notifications', error);
      throw error;
    }
  }
}
