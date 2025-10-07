// 用途：订单控制器，处理订单相关的HTTP请求
// 依赖文件：orders.service.ts, order.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:45:00

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
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
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

@ApiTags('订单管理')
@Controller('api/orders')
@UseInterceptors(RouteLabelInterceptor)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiDocs({
    summary: '创建订单',
    description: '用户基于购物车或直接购买创建新订单',
    auth: true,
    responses: {
      success: {
        description: '订单创建成功',
      },
      badRequest: '请求参数错误或库存不足',
    },
  })
  create(@Body() createOrderData: any) {
    return this.ordersService.create(createOrderData);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiPaginatedQuery(Object, '获取订单列表', '管理员分页获取所有订单列表，支持状态筛选')
  @ApiDocs({
    summary: '获取订单列表',
    description: '管理员分页获取所有订单列表，支持按状态、时间等条件筛选',
    auth: true,
    queries: [
      {
        name: 'status',
        description: '订单状态筛选',
        required: false,
        type: 'string',
      },
      {
        name: 'startDate',
        description: '开始日期',
        required: false,
        type: 'string',
      },
      {
        name: 'endDate',
        description: '结束日期',
        required: false,
        type: 'string',
      },
    ],
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.findAll(page, limit);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiPaginatedQuery(Object, '获取用户订单', '获取指定用户的订单列表')
  @ApiDocs({
    summary: '获取用户订单',
    description: '获取指定用户的订单列表，支持状态筛选',
    auth: true,
    params: [
      {
        name: 'userId',
        description: '用户ID',
        example: 1,
      },
    ],
    queries: [
      {
        name: 'status',
        description: '订单状态筛选',
        required: false,
        type: 'string',
      },
    ],
  })
  findByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findByUserId(userId, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiGetResource(Object, '获取订单详情')
  @ApiDocs({
    summary: '获取订单详情',
    description: '根据订单ID获取详细信息，包括订单项、支付状态、物流信息等',
    auth: true,
    params: [
      {
        name: 'id',
        description: '订单ID',
        example: 1,
      },
    ],
    responses: {
      success: {
        description: '获取订单详情成功',
      },
      notFound: '订单不存在',
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiUpdateResource(Object, Object, '更新订单状态')
  @ApiDocs({
    summary: '更新订单状态',
    description: '管理员更新订单状态，如确认、发货、完成、取消等',
    auth: true,
    params: [
      {
        name: 'id',
        description: '订单ID',
        example: 1,
      },
    ],
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateOrderData: any) {
    return this.ordersService.update(id, updateOrderData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDeleteResource('删除订单')
  @ApiDocs({
    summary: '删除订单',
    description: '管理员删除订单记录（软删除）',
    auth: true,
    params: [
      {
        name: 'id',
        description: '订单ID',
        example: 1,
      },
    ],
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.delete(id);
  }

  @Get('statistics/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDocs({
    summary: '获取订单统计',
    description: '获取订单相关的统计信息，包括总数、销售额、状态分布等',
    auth: true,
    responses: {
      success: {
        description: '获取统计信息成功',
      },
    },
  })
  getStatistics() {
    return this.ordersService.getStatistics();
  }

  @Get('messages/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDocs({
    summary: '获取消息历史',
    description: '获取订单相关的Kafka消息历史记录，用于调试和审计',
    auth: true,
    queries: [
      {
        name: 'topic',
        description: 'Kafka主题名称',
        required: true,
        type: 'string',
      },
      {
        name: 'limit',
        description: '返回消息数量限制',
        required: false,
        type: 'number',
        example: 10,
      },
      {
        name: 'offset',
        description: '消息偏移量',
        required: false,
        type: 'number',
        example: 0,
      },
    ],
  })
  async getMessageHistory(
    @Query('topic') topic: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.ordersService.getMessageHistory(topic, limit, offset);
  }
}
