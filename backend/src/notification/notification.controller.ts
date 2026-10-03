import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
  UseGuards,
  ParseIntPipe,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  IsEnum,
  IsNumber,
  Min,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';



import { OwnerOrAdminGuard, OwnerParam } from '../common/guards/owner-or-admin.guard';
import { NotificationType } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { RedpandaService } from '../messaging/redpanda.service';
import { Topics } from '../messaging/topics';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';


// 终验整改(2026-10-03 #8): 原为 @Body() any 直通——建墙(类型/长度/元数据白名单)
export class CreateNotificationDto {
  @IsNumber()
  @Min(1)
  userId: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
// 系统清账(2026-10-03): 通知面原全裸奔(读任意人通知/匿名建通知), 收口为:
// 类级登录 + 列表按归属(仅本人或 admin) + 单条按归属 + 建通知 admin
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
    @Request() req: any = {},
  ) {
    // 终验整改(2026-10-03 #2): userId 是 query 参数, OwnerOrAdminGuard 只读路径参数
    // (会把本人也拒掉)——归属校验在 handler 内做, 本人或 admin 放行
    const user = req?.user;
    if (user?.role !== Role.ADMIN && String(user?.sub) !== String(userId)) {
      throw new ForbiddenException('只能查看本人的通知');
    }
    return this.notificationService.getUserNotifications(userId, page, limit);
  }

  @Get(':id')
  async getNotification(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    // 终验整改(2026-10-03 #1/High): 此前 req 参数是摆设, 单条读取横向越权敞开——
    // 任何登录用户可遍历读任意用户私有通知
    const notification = await this.notificationService.getNotificationById(id);
    const user = req?.user;
    if (!notification) {
      throw new NotFoundException(`通知 ${id} 不存在`);
    }
    if (user?.role !== Role.ADMIN && String(user?.sub) !== String(notification.userId)) {
      throw new ForbiddenException('只能查看本人的通知');
    }
    return notification;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.createNotification(createNotificationDto);
  }

  @Post('test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
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
