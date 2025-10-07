// 用途：用户Web控制器
// 依赖文件：user-registration.service.ts, user-profile.service.ts, user-password.service.ts, user-query.service.ts
// 作者：后端开发团队
// 时间：2025-09-30

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiCreateResource,
  ApiGetResource,
  ApiUpdateResource,
  ApiDeleteResource,
  ApiPaginatedQuery,
} from '../../../../common/decorators/api-docs.decorator';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { Role } from '../../../../auth/enums/role.enum';
import { RouteLabelInterceptor } from '../../../../monitoring/route-label.interceptor';
import { RegisterUserCommand } from '../../../application/commands/register-user.command';
import { UpdateUserProfileCommand } from '../../../application/commands/update-user-profile.command';
import { ChangeUserPasswordCommand } from '../../../application/commands/change-user-password.command';
import { GetUserByIdQuery } from '../../../application/queries/get-user-by-id.query';
import { GetUsersQuery } from '../../../application/queries/get-users.query';

@ApiTags('用户管理')
@Controller('api/users')
@UseInterceptors(RouteLabelInterceptor)
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiCreateResource(Object, Object, '创建用户')
  async create(@Body() createUserDto: RegisterUserCommand) {
    const command = new RegisterUserCommand(
      createUserDto.email,
      createUserDto.username,
      createUserDto.password,
      createUserDto.avatar,
      createUserDto.phone,
    );

    const user = await this.commandBus.execute(command);
    return user.toJSON();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiPaginatedQuery(Object, '获取用户列表')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    const query = new GetUsersQuery(page, limit, search);
    const result = await this.queryBus.execute(query);

    return {
      users: result.users.map((user: any) => user.toJSON()),
      total: result.total,
      page,
      limit,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiGetResource(Object, '获取用户详情')
  async findOne(@Param('id') id: string) {
    const query = new GetUserByIdQuery(parseInt(id, 10));
    return await this.queryBus.execute(query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiUpdateResource(Object, Object, '更新用户信息')
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    const command = new UpdateUserProfileCommand(
      parseInt(id, 10),
      updateUserDto.username,
      updateUserDto.phone,
      updateUserDto.avatar,
    );
    return await this.commandBus.execute(command);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiDeleteResource('删除用户')
  async remove(@Param('id') id: string) {
    // TODO: 实现删除用户命令
    return { message: '用户删除成功' };
  }

  @Patch(':id/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiUpdateResource(Object, Object, '更改密码')
  async changePassword(@Param('id') id: string, @Body() changePasswordDto: any) {
    const command = new ChangeUserPasswordCommand(
      parseInt(id, 10),
      changePasswordDto.oldPassword || changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return await this.commandBus.execute(command);
  }

  @Get('stats/count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiGetResource(Object, '获取用户统计')
  async getStats() {
    // TODO: 实现用户统计查询
    return { totalUsers: 0, activeUsers: 0 };
  }
}
