import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Request,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrderSnapshotReadService } from './order-snapshot-read.service';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { RouteLabelInterceptor } from '../monitoring/route-label.interceptor';
import { ApiDocs, ApiGetResource } from '../common/decorators/api-docs.decorator';
import { maskSnapshotsPii } from './snapshot/pii-mask';

/**
 * 订单快照读端点（阶段 3——5 端点）
 *
 * 1. GET /orders/:id/snapshots         ——快照列表（非 admin PII 遮罩）
 * 2. GET /orders/:id/snapshots/:version ——单条快照（非 admin PII 遮罩）
 * 3. GET /orders/:id/snapshots/verify   ——per-order 链校验
 * 4. GET /orders/:id/timeline           ——支付时间线聚合（diff events）
 * 5. GET /orders/:id/snapshots/full     ——admin 全量 PII（Roles ADMIN）
 *
 * 越权审计(2026-10-03 同源)：路径参数是订单ID，handler 内比对归属与令牌主体。
 * 读时脱敏(#25)：非 admin 出口层遮罩 recipientName/recipientPhone/shippingAddress。
 */
@ApiTags('订单快照')
@Controller('orders')
@UseInterceptors(RouteLabelInterceptor)
export class OrderSnapshotController {
  constructor(
    private readonly snapshotRead: OrderSnapshotReadService,
    private readonly ordersService: OrdersService,
  ) {}

  /** 归属校验（非 admin 只能看本人订单） */
  private async assertOwnership(orderId: number, req: any): Promise<void> {
    const order = await this.ordersService.findById(orderId);
    if (!order) {
      throw new ForbiddenException(`订单 ${orderId} 不存在`);
    }
    const user = req?.user;
    if (user?.role !== Role.ADMIN && String(order.userId) !== String(user?.sub)) {
      throw new ForbiddenException('只能查看本人订单');
    }
  }

  @Get(':id/snapshots')
  @UseGuards(JwtAuthGuard)
  @ApiGetResource(Object, '获取订单快照列表')
  @ApiDocs({
    summary: '获取订单快照列表',
    description: '按版本号升序返回订单全量快照，非管理员收货信息已脱敏',
    auth: true,
    params: [{ name: 'id', description: '订单ID', example: 1 }],
    responses: {
      success: { description: '快照列表（含版本链哈希）' },
      forbidden: '只能查看本人订单',
    },
  })
  async getSnapshots(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.assertOwnership(id, req);
    const snapshots = await this.snapshotRead.findByOrderId(id);
    const isAdmin = req?.user?.role === Role.ADMIN;
    return { orderId: id, total: snapshots.length, snapshots: maskSnapshotsPii(snapshots, isAdmin) };
  }

  @Get(':id/snapshots/verify')
  @UseGuards(JwtAuthGuard)
  @ApiGetResource(Object, '校验订单快照链')
  @ApiDocs({
    summary: '校验订单快照链',
    description: '对该订单的快照链做 per-order 完整性校验（六判型）',
    auth: true,
    params: [{ name: 'id', description: '订单ID', example: 1 }],
    responses: {
      success: { description: '链校验结果（valid/headSeq/headHash/problems）' },
    },
  })
  async verifyChain(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.assertOwnership(id, req);
    return this.snapshotRead.verifyChain(id);
  }

  @Get(':id/timeline')
  @UseGuards(JwtAuthGuard)
  @ApiGetResource(Object, '获取订单时间线')
  @ApiDocs({
    summary: '获取订单支付时间线',
    description: '快照版本 diff 聚合为时间线事件（每版标注变化字段），非管理员 PII 已脱敏',
    auth: true,
    params: [{ name: 'id', description: '订单ID', example: 1 }],
    responses: {
      success: { description: '时间线事件数组（version/occurredAt/changes）' },
    },
  })
  async getTimeline(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.assertOwnership(id, req);
    const isAdmin = req?.user?.role === Role.ADMIN;
    return this.snapshotRead.getTimeline(id, isAdmin);
  }

  @Get(':id/snapshots/:version')
  @UseGuards(JwtAuthGuard)
  @ApiGetResource(Object, '获取单条快照')
  @ApiDocs({
    summary: '获取指定版本快照',
    description: '返回订单指定版本的快照详情，非管理员收货信息已脱敏',
    auth: true,
    params: [
      { name: 'id', description: '订单ID', example: 1 },
      { name: 'version', description: '快照版本号', example: 1 },
    ],
    responses: {
      success: { description: '单条快照（含链哈希）' },
      notFound: '快照版本不存在',
    },
  })
  async getSnapshotVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('version', ParseIntPipe) version: number,
    @Request() req: any,
  ) {
    await this.assertOwnership(id, req);
    const isAdmin = req?.user?.role === Role.ADMIN;
    const snapshot = await this.snapshotRead.findByVersion(id, version);
    return maskSnapshotsPii([snapshot], isAdmin)[0];
  }

  @Get(':id/snapshots/full')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiGetResource(Object, '获取订单快照全量（管理员）')
  @ApiDocs({
    summary: '获取订单快照全量（管理员）',
    description: '返回订单全量快照，含完整收货信息（PII 不脱敏）——仅供管理后台售后处理',
    auth: true,
    params: [{ name: 'id', description: '订单ID', example: 1 }],
    responses: {
      success: { description: '快照列表（PII 原样）' },
      forbidden: '仅管理员可访问',
    },
  })
  async getSnapshotsFull(@Param('id', ParseIntPipe) id: number) {
    const snapshots = await this.snapshotRead.findByOrderId(id);
    return { orderId: id, total: snapshots.length, snapshots };
  }
}
