import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiDocs,
  ApiCreateResource,
  ApiGetResource,
} from '../../common/decorators/api-docs.decorator';
import { CartApplicationService } from '../application/cart-application.service';
import { AddCartItemDto } from '../application/dto/add-cart-item.dto';
import { UpdateCartItemDto } from '../application/dto/update-cart-item.dto';
import { CartItemResponseDto } from '../application/dto/cart-item-response.dto';
import { CartSummaryResponseDto } from '../application/dto/cart-summary-response.dto';
import { PagedCartResponseDto } from '../application/dto/paged-cart-response.dto';

/**
 * 购物车控制器 - 参考 CongoMall CartItemController 设计
 */
@ApiTags('购物车管理')
@Controller('api/cart')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // 需要实现 JWT 认证守卫
export class CartController {
  constructor(private readonly cartApplicationService: CartApplicationService) {}

  @Get('items/:customerUserId')
  @ApiGetResource(Object, 'API接口')
  async getCartItems(
    @Param('customerUserId') customerUserId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PagedCartResponseDto> {
    return await this.cartApplicationService.getCartItems(customerUserId, page, limit);
  }

  @Get('selected/:customerUserId')
  @ApiGetResource(Object, 'API接口')
  async getSelectedCartItems(
    @Param('customerUserId') customerUserId: string,
  ): Promise<CartItemResponseDto[]> {
    return await this.cartApplicationService.getSelectedCartItems(customerUserId);
  }

  @Post('items/:customerUserId')
  @ApiCreateResource(Object, Object, '创建资源')
  async addCartItem(
    @Param('customerUserId') customerUserId: string,
    @Body() addCartItemDto: AddCartItemDto,
  ): Promise<CartItemResponseDto> {
    return await this.cartApplicationService.addCartItem(customerUserId, addCartItemDto);
  }

  @Put('items/:customerUserId/:cartItemId')
  @ApiDocs({
    summary: '更新购物车商品',
    description: '更新购物车中指定商品的数量、选中状态等信息',
    params: [
      {
        name: 'customerUserId',
        description: '用户唯一标识符',
        example: 'user_123456',
      },
      {
        name: 'cartItemId',
        description: '购物车商品唯一标识符',
        example: 'cart_123456',
      },
    ],
    body: { type: Object, description: '更新商品的信息' },
    responses: {
      success: {
        description: '购物车商品不存在',
      },
    },
  })
  async updateCartItem(
    @Param('customerUserId') customerUserId: string,
    @Param('cartItemId') cartItemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<void> {
    await this.cartApplicationService.updateCartItem(customerUserId, cartItemId, updateCartItemDto);
  }

  @Put('select-all/:customerUserId')
  @ApiDocs({
    summary: '批量更新选中状态',
    description: '批量设置用户购物车中所有商品的选中状态',
    params: [
      {
        name: 'customerUserId',
        description: '用户唯一标识符',
        example: 'user_123456',
      },
    ],
    body: { type: Object, description: '选中状态标志' },
    responses: {
      success: {
        description: '批量更新成功',
      },
    },
  })
  async updateAllSelectFlag(
    @Param('customerUserId') customerUserId: string,
    @Body('selectFlag') selectFlag: boolean,
  ): Promise<void> {
    await this.cartApplicationService.updateAllSelectFlag(customerUserId, selectFlag);
  }

  @Delete('items/:customerUserId/:cartItemId')
  @ApiDocs({
    summary: '删除购物车商品',
    description: '从用户购物车中删除指定的商品',
    params: [
      {
        name: 'customerUserId',
        description: '用户唯一标识符',
        example: 'user_123456',
      },
      {
        name: 'cartItemId',
        description: '购物车商品唯一标识符',
        example: 'cart_123456',
      },
    ],
    responses: {
      success: {
        description: '购物车商品不存在',
      },
    },
  })
  async removeCartItem(
    @Param('customerUserId') customerUserId: string,
    @Param('cartItemId') cartItemId: string,
  ): Promise<void> {
    await this.cartApplicationService.removeCartItem(customerUserId, cartItemId);
  }

  @Delete('items/:customerUserId')
  @ApiDocs({
    summary: '批量删除购物车商品',
    description: '根据商品ID列表批量删除用户购物车中的商品',
    params: [
      {
        name: 'customerUserId',
        description: '用户唯一标识符',
        example: 'user_123456',
      },
    ],
    body: { type: Object, description: '要删除的购物车商品ID列表' },
    responses: {
      success: {
        description: '批量删除成功',
      },
    },
  })
  async removeCartItems(
    @Param('customerUserId') customerUserId: string,
    @Body('cartItemIds') cartItemIds: string[],
  ): Promise<void> {
    await this.cartApplicationService.removeCartItems(customerUserId, cartItemIds);
  }

  @Delete('selected/:customerUserId')
  @ApiDocs({
    summary: '清空选中商品',
    description: '删除用户购物车中所有已选中的商品',
    params: [
      {
        name: 'customerUserId',
        description: '用户唯一标识符',
        example: 'user_123456',
      },
    ],
    responses: {
      success: {
        description: '清空选中商品成功',
      },
    },
  })
  async clearSelectedItems(@Param('customerUserId') customerUserId: string): Promise<void> {
    await this.cartApplicationService.clearSelectedItems(customerUserId);
  }

  @Get('summary/:customerUserId')
  @ApiGetResource(Object, 'API接口')
  async getCartSummary(
    @Param('customerUserId') customerUserId: string,
  ): Promise<CartSummaryResponseDto> {
    return await this.cartApplicationService.getCartSummary(customerUserId);
  }

  @Get('count/:customerUserId')
  @ApiGetResource(Object, 'API接口')
  async getCartItemCount(@Param('customerUserId') customerUserId: string): Promise<number> {
    return await this.cartApplicationService.getCartItemCount(customerUserId);
  }
}
