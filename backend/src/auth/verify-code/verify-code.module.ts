import { Module } from '@nestjs/common';
import { VerifyCodeService } from './verify-code.service';
import { VerifyCodeController } from './verify-code.controller';

@Module({
  providers: [VerifyCodeService],
  controllers: [VerifyCodeController],
  exports: [VerifyCodeService],
})
export class VerifyCodeModule {}
