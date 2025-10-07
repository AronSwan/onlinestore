import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCreateResource } from '../../common/decorators/api-docs.decorator';
import { VerifyCodeService } from './verify-code.service';

class VerifyCodeSendDto {
  sendType!: 'login' | 'register';
  mail!: string;
}

@ApiTags('验证码')
@Controller('api/customer-user/verify-code')
export class VerifyCodeController {
  constructor(private readonly service: VerifyCodeService) {}

  @ApiCreateResource(Object, Object, '创建资源')
  @Post('send')
  async send(@Body() body: VerifyCodeSendDto): Promise<void> {
    // NOTE: only mail login demo
    await this.service.sendLoginMailCode(body.mail);
  }
}
