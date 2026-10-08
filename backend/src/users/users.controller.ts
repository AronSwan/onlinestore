/**
 * 用户控制器
 * 直连 UsersService（原 CQRS application/ 层为幻影引用，类文件从未存在于本仓库）
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
  Request,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnerOrAdminGuard, OwnerParam } from '../common/guards/owner-or-admin.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { UserDeletionService } from './user-deletion.service';
import { User } from './entities/user.entity';

// 出口形状与 User 实体对齐——password 永不出口
export interface UserResponseDto {
  id: number;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function toResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    avatar: user.avatar,
    phone: user.phone,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
    updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : String(user.updatedAt),
  };
}

@Controller('users')
// 整改（B2，2026-10-02）：用户管理面此前完全无认证，任何匿名请求都能读写用户。
// 类级启用 JWT 认证，未带有效令牌的访问一律 401。
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userDeletion: UserDeletionService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);
    return toResponse(user);
  }

  // 兼容测试：提供无装饰器的别名方法
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.createUser(createUserDto);
  }

  // 求真修复(2026-10-04): /api/users/profile 是前端 profile-manager.js 的真实调用路径,
  // 若声明在 @Get(':id') 之后会被 ':id' 抢先匹配("profile"被当用户 id 403 踢人)
  @Get('profile')
  getProfile(@Request() req: Record<string, any>) {
    return { user: req.user };
  }

  @Get(':id')
  @UseGuards(OwnerOrAdminGuard)
  @OwnerParam('id')
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(Number(id));
    return toResponse(user);
  }

  @Put(':id')
  @UseGuards(OwnerOrAdminGuard)
  @OwnerParam('id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(Number(id), updateUserDto);
    return toResponse(user);
  }

  // 兼容测试：提供无装饰器的别名方法，支持 number|string 的 id
  async update(id: string | number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    return this.updateUser(String(id), updateUserDto);
  }

  // 权益批 B10（隐私 P1② 被遗忘权）：本人注销端点。必须声明在 @Delete(':id')
  // 之前——否则字面量 'me' 被 ':id' 抢先匹配（与 @Get('profile') 同坑，
  // 求真修复 2026-10-04 已在 GET 侧修过一次）。鉴权：类级 JwtAuthGuard；
  // id 取自令牌 sub，不经 URL——A 删 B 无路径（管理员的 /users/:id 另有 ADMIN 角色闸）。
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteMe(@Request() req: Record<string, any>): Promise<{ message: string }> {
    const userId = Number(req.user?.sub);
    await this.userDeletion.deleteMeCascade(userId);
    return { message: '账号已注销' };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string): Promise<void> {
    // 整改（B2，2026-10-02）：功能未实现时改抛 NotImplementedException（HTTP 501），
    // 不再用裸 Error——裸 Error 会被全局过滤器按未知异常处理（500），语义不明。
    throw new NotImplementedException('用户删除功能未实现');
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async searchUsers(
    @Query('search') searchTerm?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<UserListResponseDto> {
    const currentPage = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    const { users, total } = await this.usersService.findAll({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
    });

    return {
      users: users.map(toResponse),
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  @Put(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async activateUser(@Param('id') id: string): Promise<UserResponseDto> {
    throw new NotImplementedException('功能未实现');
  }

  @Put(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deactivateUser(@Param('id') id: string): Promise<UserResponseDto> {
    throw new NotImplementedException('功能未实现');
  }

  @Put(':id/verify-email')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async verifyUserEmail(@Param('id') id: string): Promise<UserResponseDto> {
    throw new NotImplementedException('功能未实现');
  }

  @Get('stats/overview')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getUserStats(): Promise<any> {
    // 实体只承载 totalUsers/activeUsers/newUsersToday 三个真实计数
    return await this.usersService.getStatistics();
  }

  // 兼容测试：统计计数路由
  @Get('stats/count')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getUserStatsCount(): Promise<any> {
    return this.getUserStats();
  }

  // 兼容测试：提供简化统计方法别名
  async getStats(): Promise<any> {
    return this.getUserStats();
  }
}
