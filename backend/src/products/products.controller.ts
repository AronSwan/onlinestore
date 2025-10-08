// 用途：产品控制器，处理产品相关的HTTP请求
// 依赖文件：products.service.ts, product.entity.ts, search-manager.service.ts, search-suggestion.service.ts, popular-search.service.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:30:30

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
  Inject,
  forwardRef,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { SearchManagerService } from './search/search-manager.service';
import { SearchSuggestionService } from './search/search-suggestion.service';
import { PopularSearchService } from './search/popular-search.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { RouteLabelInterceptor } from '../monitoring/route-label.interceptor';
import {
  ApiDocs,
  ApiPaginatedQuery,
  ApiCreateResource,
  ApiUpdateResource,
  ApiDeleteResource,
  ApiGetResource,
} from '../common/decorators/api-docs.decorator';
import { Product } from './entities/product.entity';

@ApiTags('产品管理')
@Controller('products')
@UseInterceptors(RouteLabelInterceptor)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => SearchManagerService))
    private readonly searchManagerService: SearchManagerService,
    @Inject(forwardRef(() => SearchSuggestionService))
    private readonly searchSuggestionService: SearchSuggestionService,
    @Inject(forwardRef(() => PopularSearchService))
    private readonly popularSearchService: PopularSearchService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCreateResource(Product, CreateProductDto, '创建产品')
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiPaginatedQuery(Product, '获取产品列表', '分页获取产品列表，支持搜索和排序')
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词', example: 'iPhone' })
  @ApiQuery({ name: 'categoryId', required: false, description: '分类ID', example: 1 })
  @ApiQuery({ name: 'brand', required: false, description: '品牌', example: 'Apple' })
  @ApiQuery({ name: 'minPrice', required: false, description: '最低价格', example: 100 })
  @ApiQuery({ name: 'maxPrice', required: false, description: '最高价格', example: 1000 })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll({
      page,
      limit,
      search,
    });
  }

  @Get('search')
  @ApiDocs({
    summary: '搜索产品',
    description: '使用搜索引擎进行全文搜索，支持多种筛选条件',
    queries: [
      { name: 'q', description: '搜索关键词', required: true, type: 'string', example: 'iPhone' },
      { name: 'page', description: '页码', required: false, type: 'number', example: 1 },
      { name: 'limit', description: '每页数量', required: false, type: 'number', example: 20 },
      { name: 'category', description: '分类ID', required: false, type: 'number', example: 1 },
      { name: 'minPrice', description: '最低价格', required: false, type: 'number', example: 100 },
      { name: 'maxPrice', description: '最高价格', required: false, type: 'number', example: 1000 },
      {
        name: 'inStock',
        description: '仅显示有库存商品',
        required: false,
        type: 'boolean',
        example: true,
      },
    ],
    responses: {
      success: {
        description: '搜索成功',
      },
    },
  })
  async searchProducts(@Query() query: any) {
    const { q, page = 1, limit = 20, category, minPrice, maxPrice, inStock } = query;

    const searchOptions = {
      keyword: q,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      categoryId: category ? parseInt(category, 10) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      inStock: inStock === 'true',
    };

    return this.productsService.search(searchOptions);
  }

  @Get('suggestions')
  @ApiDocs({
    summary: '获取搜索建议',
    description: '根据输入提供搜索建议，帮助用户快速找到相关产品',
    queries: [
      { name: 'q', description: '搜索关键词前缀', required: true, type: 'string', example: 'iph' },
      {
        name: 'limit',
        description: '返回建议数量限制',
        required: false,
        type: 'number',
        example: 10,
      },
    ],
    responses: {
      success: {
        description: '获取成功',
      },
    },
  })
  async getSearchSuggestions(@Query() query: any) {
    const { q, limit = 10 } = query;
    return await this.searchSuggestionService.getSuggestions(q, limit);
  }

  @Get('popular-searches')
  @ApiDocs({
    summary: '获取热门搜索',
    description: '获取热门搜索词列表，支持时间范围和分类筛选',
    queries: [
      {
        name: 'limit',
        description: '返回热门搜索数量限制',
        required: false,
        type: 'number',
        example: 10,
      },
      {
        name: 'includeTrends',
        description: '是否包含趋势信息',
        required: false,
        type: 'boolean',
        example: false,
      },
      {
        name: 'timeRange',
        description: '时间范围',
        required: false,
        type: 'string',
        example: 'week',
      },
      {
        name: 'category',
        description: '分类过滤',
        required: false,
        type: 'string',
        example: '手机',
      },
    ],
    responses: {
      success: {
        description: '获取成功',
      },
    },
  })
  async getPopularSearches(@Query() query: any) {
    const { limit = 10, includeTrends = false, timeRange = 'week', category } = query;
    return await this.popularSearchService.getPopularSearches({
      limit: parseInt(limit, 10),
      includeTrends: includeTrends === 'true',
      timeRange,
      category,
    });
  }

  @Get('popular')
  @ApiDocs({
    summary: '获取热门产品',
    description: '根据浏览量、销量等指标获取热门产品列表',
    responses: {
      success: {
        type: Product,
        isArray: true,
        description: '获取热门产品成功',
      },
    },
    queries: [
      {
        name: 'limit',
        description: '返回数量限制',
        example: 10,
        required: false,
        type: 'number',
      },
    ],
  })
  findPopular(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.productsService.findPopular(limit);
  }

  @Get(':id')
  @ApiGetResource(Product, '获取产品详情')
  @ApiDocs({
    summary: '获取产品详情',
    description: '根据产品ID获取详细信息，包括库存、图片、规格等',
    params: [
      {
        name: 'id',
        description: '产品ID',
        example: 1,
      },
    ],
    responses: {
      success: {
        type: Product,
        description: '获取产品详情成功',
      },
      notFound: '产品不存在',
    },
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiUpdateResource(Product, UpdateProductDto, '更新产品信息')
  @ApiDocs({
    summary: '更新产品信息',
    description: '管理员更新产品的基本信息、价格、库存等',
    auth: true,
    params: [
      {
        name: 'id',
        description: '产品ID',
        example: 1,
      },
    ],
  })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDeleteResource('删除产品')
  @ApiDocs({
    summary: '删除产品',
    description: '管理员删除指定产品，同时清理相关数据',
    auth: true,
    params: [
      {
        name: 'id',
        description: '产品ID',
        example: 1,
      },
    ],
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @Post(':id/view')
  @ApiDocs({
    summary: '记录产品浏览',
    description: '记录用户浏览产品的行为，用于统计和推荐',
    params: [
      {
        name: 'id',
        description: '产品ID',
        example: 1,
      },
    ],
    responses: {
      success: {
        description: '浏览记录成功',
      },
    },
  })
  recordView(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.recordView(id);
  }
}
