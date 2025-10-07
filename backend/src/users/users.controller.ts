// 用途：用户控制器，处理用户相关的HTTP请求
// 依赖文件：users.service.ts, user.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:31:00

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
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { RouteLabelInterceptor } from '../monitoring/route-label.interceptor';
import {
  ApiDocs,
  ApiCreateResource,
  ApiUpdateResource,
  ApiDeleteResource,
  ApiGetResource,
  ApiPaginatedQuery,
} from '../common/decorators/api-docs.decorator';

@ApiTags('用户管理')
@Controller('api/users')
@UseInterceptors(RouteLabelInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCreateResource(CreateUserDto, Object, '创建用户')
  @ApiDocs({
    summary: '创建用户',
    description: '管理员创建新用户账户，包括基本信息和角色分配',
    auth: true,
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiPaginatedQuery(Object, '获取用户列表', '管理员分页获取用户列表')
  @ApiDocs({
    summary: '获取用户列表',
    description: '管理员分页获取用户列表，支持按用户名、邮箱等条件搜索',
    auth: true,
    queries: [
      {
        name: 'search',
        description: '搜索关键词（用户名、邮箱）',
        required: false,
        type: 'string',
      },
      {
        name: 'role',
        description: '用户角色筛选',
        required: false,
        type: 'string',
      },
      {
        name: 'status',
        description: '用户状态筛选',
        required: false,
        type: 'string',
      },
    ],
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAll({
      page,
      limit,
      search,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiGetResource(Object, '获取用户详情')
  @ApiDocs({
    summary: '获取用户详情',
    description: '根据用户ID获取详细信息，包括个人资料、权限等',
    auth: true,
    params: [
      {
        name: 'id',
        description: '用户ID',
        example: 1,
      },
    ],
    responses: {
      success: {
        description: '获取用户详情成功',
      },
      notFound: '用户不存在',
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiUpdateResource(UpdateUserDto, Object, '更新用户信息')
  @ApiDocs({
    summary: '更新用户信息',
    description: '用户更新自己的个人信息，或管理员更新用户信息',
    auth: true,
    params: [
      {
        name: 'id',
        description: '用户ID',
        example: 1,
      },
    ],
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDeleteResource('删除用户')
  @ApiDocs({
    summary: '删除用户',
    description: '管理员删除用户账户（软删除）',
    auth: true,
    params: [
      {
        name: 'id',
        description: '用户ID',
        example: 1,
      },
    ],
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Get('stats/count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDocs({
    summary: '获取用户统计',
    description: '获取用户总数、活跃用户数、角色分布等统计信息',
    auth: true,
    responses: {
      success: {
        description: '获取统计信息成功',
      },
    },
  })
  getStats() {
    return this.usersService.getUserStats();
  }
}
