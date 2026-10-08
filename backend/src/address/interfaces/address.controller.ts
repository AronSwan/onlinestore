import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ApiGetResource,
  ApiCreateResource,
  ApiUpdateResource,
  ApiDeleteResource,
} from '../../common/decorators/api-docs.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AddressService } from '../application/address.service';
import {
  ReceiveAddressRespDTO,
  ReceiveAddressSaveCommand,
  ReceiveAddressUpdateCommand,
} from '../application/dto/receive-address.dto';

@ApiTags('收货地址')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/customer-user')
export class AddressController {
  constructor(private readonly service: AddressService) {}

  @ApiGetResource(Object, '获取用户收货地址列表')
  @Get('receive-address/:customerUserId')
  async list(@Param('customerUserId') customerUserId: string): Promise<ReceiveAddressRespDTO[]> {
    return this.service.listByUserId(customerUserId);
  }

  @ApiCreateResource(Object, Object, '新增用户收货地址')
  @Post('receive-address')
  async save(@Body() body: ReceiveAddressSaveCommand): Promise<void> {
    await this.service.save(body);
  }

  @ApiUpdateResource(Object, Object, '修改用户收货地址')
  @Put('receive-address')
  async update(@Body() body: ReceiveAddressUpdateCommand): Promise<void> {
    await this.service.update(body);
  }

  @ApiDeleteResource('删除用户收货地址')
  @Delete(':customerUserId/receive-address/:receiveAddressId')
  async remove(
    @Param('customerUserId') customerUserId: string,
    @Param('receiveAddressId') receiveAddressId: string,
  ): Promise<void> {
    await this.service.remove(customerUserId, receiveAddressId);
  }

  @ApiUpdateResource(Object, Object, '设置默认地址')
  @Put('receive-address/:receiveAddressId/default')
  async setDefault(
    @Param('receiveAddressId') receiveAddressId: string,
    @Body('userId') userId: string,
  ): Promise<void> {
    await this.service.setDefault(userId, receiveAddressId);
  }
}
