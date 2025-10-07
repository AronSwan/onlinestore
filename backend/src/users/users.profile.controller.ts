import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiUpdateResource } from '../common/decorators/api-docs.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('用户资料')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/users/profile')
export class UsersProfileController {
  constructor(private readonly usersService: UsersService) {}

  @ApiUpdateResource(Object, Object, '更新资源')
  @Put()
  async update(@Body() dto: UpdateProfileDto): Promise<void> {
    // NOTE: 调用现有 UsersService 扩展方法（可后续实现具体逻辑）
    // this.usersService.updateProfile(userIdFromJwt, dto)
    return;
  }
}
