/**
 * 增强用户控制器，基于PrestaShop用户管理模式
 * 实现CQRS架构和领域驱动设计
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotImplementedException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnerOrAdminGuard } from '../common/guards/owner-or-admin.guard';
import { CreateUserCommand } from './application/commands/create-user.command';
import { UpdateUserCommand } from './application/commands/update-user.command';
import { GetUserForEditingQuery } from './application/queries/get-user-for-editing.query';
import { SearchUsersQuery } from './application/queries/search-users.query';
import { CreateUserDto } from './application/dto/create-user.dto';
import { UpdateUserDto } from './application/dto/update-user.dto';

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  birthday?: string;
  phone?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  address?: any;
  preferences?: any;
}

export interface UserListResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Controller('users')
// 整改（B2，2026-10-02）：用户管理面此前完全无认证，任何匿名请求都能读写用户。
// 类级启用 JWT 认证，未带有效令牌的访问一律 401。
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const command = new CreateUserCommand({
      email: createUserDto.email,
      password: createUserDto.password,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      birthday: createUserDto.birthday,
      phone: createUserDto.phone,
      address: createUserDto.address || undefined,
      preferences: createUserDto.preferences || undefined,
    });

    return await this.commandBus.execute(command);
  }

  // 兼容测试：提供无装饰器的别名方法
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.createUser(createUserDto);
  }

  @Get(':id')
  @UseGuards(OwnerOrAdminGuard)
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    const query = new GetUserForEditingQuery(id);
    return await this.queryBus.execute(query);
  }

  @Put(':id')
  @UseGuards(OwnerOrAdminGuard)
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const command = new UpdateUserCommand({
      userId: id,
      email: updateUserDto.email,
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      birthday: updateUserDto.birthday,
      phone: updateUserDto.phone,
      address: updateUserDto.address || undefined,
      preferences: updateUserDto.preferences || undefined,
    });

    return await this.commandBus.execute(command);
  }

  // 兼容测试：提供无装饰器的别名方法，支持 number|string 的 id
  async update(id: string | number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.updateUser(String(id), updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string): Promise<void> {
    // 整改（B2，2026-10-02）：功能未实现时改抛 NotImplementedException（HTTP 501），
    // 不再用裸 Error——裸 Error 会被全局过滤器按未知异常处理（500），语义不明。
    throw new NotImplementedException('用户删除功能未实现');
  }

  @Get()
  async searchUsers(
    @Query('search') searchTerm?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortDirection') sortDirection?: 'asc' | 'desc',
    @Query('isActive') isActive?: boolean,
    @Query('emailVerified') emailVerified?: boolean,
    @Query('country') country?: string,
    @Query('city') city?: string,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
  ): Promise<UserListResponseDto> {
    const query = new SearchUsersQuery({
      searchTerm,
      page: page || 1,
      limit: limit || 10,
      sortBy,
      sortDirection,
      isActive,
      emailVerified,
      country,
      city,
      createdAfter,
      createdBefore,
    });

    return await this.queryBus.execute(query);
  }

  @Put(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activateUser(@Param('id') id: string): Promise<UserResponseDto> {
    // 这里可以实现激活用户命令
    // const command = new ActivateUserCommand(id);
    // return await this.commandBus.execute(command);
    throw new NotImplementedException('功能未实现');
  }

  @Put(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateUser(@Param('id') id: string): Promise<UserResponseDto> {
    // 这里可以实现停用用户命令
    // const command = new DeactivateUserCommand(id);
    // return await this.commandBus.execute(command);
    throw new NotImplementedException('功能未实现');
  }

  @Put(':id/verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyUserEmail(@Param('id') id: string): Promise<UserResponseDto> {
    // 这里可以实现邮箱验证命令
    // const command = new VerifyUserEmailCommand(id);
    // return await this.commandBus.execute(command);
    throw new NotImplementedException('功能未实现');
  }

  @Get('stats/overview')
  async getUserStats(): Promise<any> {
    // 这里可以实现用户统计查询
    // const query = new GetUserStatsQuery();
    // return await this.queryBus.execute(query);
    return {
      totalUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0,
      newUsersThisMonth: 0,
    };
  }

  // 兼容测试：统计计数路由
  @Get('stats/count')
  async getUserStatsCount(): Promise<any> {
    const stats = await this.getUserStats();
    return {
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      verifiedUsers: stats.verifiedUsers,
      newUsersThisMonth: stats.newUsersThisMonth,
    };
  }

  // 兼容测试：提供简化统计方法别名
  async getStats(): Promise<any> {
    return this.getUserStats();
  }
}
