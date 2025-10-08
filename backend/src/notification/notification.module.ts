import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationConsumer } from './consumers/notification.consumer';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), forwardRef(() => MessagingModule)],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService, SmsService, PushService, NotificationConsumer],
  exports: [NotificationService],
})
export class NotificationModule {}
