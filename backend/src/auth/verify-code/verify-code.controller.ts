import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn, IsString, MaxLength } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { ApiCreateResource } from '../../common/decorators/api-docs.decorator';
import { VerifyCodeService } from './verify-code.service';

class VerifyCodeSendDto {
  // 系统清账(2026-10-03): 原无任何装饰器, 全局 forbidNonWhitelisted 使端点恒 400(砖)
  @IsIn(['login', 'register'])
  sendType!: 'login' | 'register';

  @IsEmail()
  @IsString()
  @MaxLength(254)
  mail!: string;
}

@ApiTags('验证码')
@Controller('customer-user/verify-code')
export class VerifyCodeController {
  constructor(private readonly service: VerifyCodeService) {}

  @ApiCreateResource(Object, Object, '创建资源')
  @Post('send')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async send(@Body() body: VerifyCodeSendDto): Promise<void> {
    // NOTE: only mail login demo
    await this.service.sendLoginMailCode(body.mail);
  }
}
