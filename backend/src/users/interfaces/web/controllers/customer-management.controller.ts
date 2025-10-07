// 用途：客户管理控制器，提供高级客户管理API
// 依赖文件：customer-management.service.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:40:00

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  ApiGetResource,
  ApiCreateResource,
  ApiUpdateResource,
} from '../../../../common/decorators/api-docs.decorator';

// 使用 barrel exports 简化导入
import {
  CustomerManagementService,
  CustomerSearchOptions,
  CustomerStats,
  CustomerLevel,
} from '../../..';

import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { Role } from '../../../../auth/enums/role.enum';
import { RouteLabelInterceptor } from '../../../../monitoring/route-label.interceptor';

@ApiTags('客户管理')
@Controller('api/customers')
@UseInterceptors(RouteLabelInterceptor)
export class CustomerManagementController {
  constructor(private readonly customerService: CustomerManagementService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiGetResource(Object, '获取客户统计信息')
  async getCustomerStats(): Promise<CustomerStats> {
    return this.customerService.getCustomerStats();
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiGetResource(Object, '搜索客户')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'level', required: false, enum: CustomerLevel })
  async searchCustomers(@Query() options: CustomerSearchOptions) {
    return this.customerService.searchCustomers(options);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiGetResource(Object, '获取客户详情')
  async getCustomerDetails(@Param('id') id: number) {
    return this.customerService.getCustomerDetails(id);
  }

  @Patch(':id/level')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiUpdateResource(Object, Object, '更新客户等级')
  async updateCustomerLevel(@Param('id') id: number, @Body('level') level: CustomerLevel) {
    return this.customerService.updateCustomerLevel(id, level);
  }

  @Post(':id/tags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiCreateResource(Object, Object, '添加客户标签')
  async addCustomerTag(@Param('id') id: number, @Body('tag') tag: string) {
    return this.customerService.addCustomerTag(id, tag);
  }

  @Get(':id/behavior')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiGetResource(Object, '获取客户行为分析')
  async getCustomerBehavior(@Param('id') id: number) {
    return this.customerService.getCustomerBehavior(id);
  }

  @Post(':id/addresses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiCreateResource(Object, Object, '添加客户地址')
  async addAddress(@Param('id') id: number, @Body() addressData: any) {
    return this.customerService.addAddress(id, addressData);
  }

  @Patch(':id/addresses/:addressId/default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiUpdateResource(Object, Object, '设置默认地址')
  async setDefaultAddress(@Param('id') id: number, @Param('addressId') addressId: number) {
    return this.customerService.setDefaultAddress(id, addressId);
  }
}
