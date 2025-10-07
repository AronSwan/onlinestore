import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiGetResource } from '../common/decorators/api-docs.decorator';
import { BffService } from './bff.service';

@ApiTags('前端聚合服务')
@Controller('bff')
export class BffController {
  constructor(private readonly bffService: BffService) {}

  @Get('user/:userId/home')
  @ApiGetResource(Object, 'API接口')
  async getUserHomePage(@Param('userId') userId: number) {
    return await this.bffService.getUserHomePage(userId);
  }

  @Get('order/:orderId')
  @ApiGetResource(Object, 'API接口')
  async getOrderDetailsPage(@Param('orderId') orderId: string, @Query('userId') userId: number) {
    return await this.bffService.getOrderDetailsPage(orderId, userId);
  }

  @Get('product/:productId')
  @ApiGetResource(Object, 'API接口')
  async getProductDetailsPage(
    @Param('productId') productId: number,
    @Query('userId') userId?: number,
  ) {
    return await this.bffService.getProductDetailsPage(productId, userId);
  }

  @Get('user/:userId/cart')
  @ApiGetResource(Object, 'API接口')
  async getCartPage(@Param('userId') userId: number) {
    return await this.bffService.getCartPage(userId);
  }

  @Get('user/:userId/checkout')
  @ApiGetResource(Object, 'API接口')
  async getCheckoutPage(@Param('userId') userId: number) {
    return await this.bffService.getCheckoutPage(userId);
  }

  @Get('user/:userId/center')
  @ApiGetResource(Object, 'API接口')
  async getUserCenterPage(@Param('userId') userId: number) {
    return await this.bffService.getUserCenterPage(userId);
  }

  @Get('mobile/home')
  @ApiGetResource(Object, 'API接口')
  async getMobileHomePage() {
    return await this.bffService.getMobileHomePage();
  }
}
