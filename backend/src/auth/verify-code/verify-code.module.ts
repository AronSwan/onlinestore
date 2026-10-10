import { Module } from '@nestjs/common';
import { NotificationModule } from '../../notification/notification.module';
import { VerifyCodeService } from './verify-code.service';
import { VerifyCodeController } from './verify-code.controller';

@Module({
  imports: [NotificationModule], // 邮件验证批:EmailService 真发
  providers: [VerifyCodeService],
  controllers: [VerifyCodeController],
  exports: [VerifyCodeService],
})
export class VerifyCodeModule {}
