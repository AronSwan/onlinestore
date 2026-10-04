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
  Req,
  UploadedFile,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
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
  AuditService,
  AuditAction,
  AuditResult,
  AuditSeverity,
} from '../common/audit/audit.service';
import {
  ApiDocs,
  ApiPaginatedQuery,
  ApiCreateResource,
  ApiUpdateResource,
  ApiDeleteResource,
  ApiGetResource,
} from '../common/decorators/api-docs.decorator';
import { Product } from './entities/product.entity';

// ================================
// M2-B5(2026-10-04) 商品图上传安全常量与工具
// 纪律详见 docs/safety.md「上传只收真图片」行：
// ① magic bytes 校验（不信 mimetype/扩展名）②扩展名白名单 ③≤5MB 双闸
// ④文件名服务端生成，绝不用客户端文件名 ⑤落盘锁定仓库根 images/products/
// （.env 的 UPLOAD_DEST=./uploads 是无关残留配置，不使用）
// ================================
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_EXT_WHITELIST = ['.jpg', '.jpeg', '.png', '.webp'];

/** Multer 内存存储下的上传文件最小形状（仓内无 @types/multer，沿用 file-upload.interceptor 的显式声明风格） */
interface UploadedImageFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype?: string;
}

/** 按 magic bytes 识别真实图片类型：jpeg=FF D8 FF / png=89 50 4E 47… / webp=RIFF....WEBP */
export function detectImageExt(buffer: Buffer): '.jpg' | '.png' | '.webp' | null {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return '.png';
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return '.webp';
  }
  return null;
}

/**
 * M2-B5 补强（攻击席 P2）：结构完整性复查——magic bytes 只认文件头 3-12 字节，
 * polyglot（JPEG 头 + 脚本体 / RIFF 头 + 垃圾尾巴）可骗过第一层入库。本函数按
 * 格式校验整份文件的骨架一致性，纯函数、零依赖：
 *   - JPEG：EOI（FF D9）必须出现在缓冲区尾部 4 字节内（真实 JPEG 结尾允许少量填充字节）；
 *   - PNG：尾部 12 字节内必须含 IEND 块标记（49 45 4E 44，即 0 长度 IEND + CRC 的 12 字节尾块）；
 *   - WebP：RIFF 头 offset 4-8 的文件长度字段（little-endian）按规范 = 文件总长 - 8
 *     （长度字段不含 "RIFF" 与自身共 8 字节），与 buffer.length 严格一致、容差 0。
 */
export function isImageStructurallyComplete(
  buffer: Buffer,
  ext: '.jpg' | '.png' | '.webp',
): boolean {
  if (!buffer || buffer.length < 12) return false;

  if (ext === '.jpg') {
    const tail = buffer.subarray(buffer.length - 4);
    for (let i = 0; i + 1 < tail.length; i++) {
      if (tail[i] === 0xff && tail[i + 1] === 0xd9) return true;
    }
    return false;
  }

  if (ext === '.png') {
    return buffer.toString('ascii', buffer.length - 12).includes('IEND');
  }

  // .webp：RIFF <len:4LE> WEBP …——len 字段声明其后字节数，须与实际余量一致
  const declaredSize = buffer.readUInt32LE(4);
  return declaredSize === buffer.length - 8;
}

/**
 * 落盘目录：仓库根 images/products（前端 vite 直接服务该目录）。
 * 运行布局有两种——源码 <backend>/src/products、构建产物 <backend>/dist/src/products，
 * 据此定位 backend 根后再上溯一级；path.resolve 锁定，杜绝 cwd 漂移。
 */
export function resolveUploadDir(): string {
  const backendRoot = path.resolve(
    __dirname,
    __dirname.split(path.sep).includes('dist') ? '../../..' : '../..',
  );
  return path.resolve(backendRoot, '..', 'images', 'products');
}

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
    private readonly auditService: AuditService,
  ) {}

  /**
   * M1-B4(2026-10-04)：商品写操作审计——记 actor/action/productId/diff 摘要入 audit_logs。
   * 用 AuditService 现有 log() 形状（ADMIN_PRODUCT_MANAGE 枚举），不发明新接口；
   * 审计失败只告警不阻断主流程。
   */
  private async auditProductWrite(
    req: any,
    actionLabel: '创建' | '更新' | '删除',
    productId: number | string,
    newValues?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.auditService.log(
        AuditAction.ADMIN_PRODUCT_MANAGE,
        AuditResult.SUCCESS,
        {
          userId: req?.user?.sub != null ? String(req.user.sub) : undefined,
          userEmail: req?.user?.email,
          userRole: req?.user?.role,
          httpMethod: req?.method,
          endpoint: req ? `${req.method} ${req.originalUrl || req.url || ''}` : undefined,
          resourceType: 'products',
          resourceId: String(productId),
        },
        `商品${actionLabel}: productId=${productId}`,
        AuditSeverity.LOW,
        undefined,
        newValues,
      );
    } catch (error) {
      console.warn('商品审计日志写入失败:', (error as Error).message);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCreateResource(Product, CreateProductDto, '创建产品')
  async create(@Body() createProductDto: CreateProductDto, @Req() req?: any) {
    const created = await this.productsService.create(createProductDto);
    await this.auditProductWrite(req, '创建', created.id, {
      id: created.id,
      name: created.name,
      price: created.price,
      stock: created.stock,
      isActive: created.isActive,
      mainImage: created.mainImage,
      tags: createProductDto.tags,
    });
    return created;
  }

  /**
   * M2-B5(2026-10-04)：商品图上传（admin）。
   * Multer 内存存储（limits 5MB 为第一闸），buffer 到手后 magic bytes 校验再落盘——
   * 校验前没有任何字节写入磁盘。
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_MAX_BYTES } }))
  @ApiBearerAuth()
  async uploadImage(@UploadedFile() file?: UploadedImageFile) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('未接收到上传文件');
    }
    // 第二闸（Multer 限额之外的防御性复查，伪造 size 头场景兜底）
    if (file.size > UPLOAD_MAX_BYTES) {
      throw new PayloadTooLargeException('图片大小超过 5MB 上限');
    }
    const clientExt = path.extname(file.originalname || '').toLowerCase();
    if (!UPLOAD_EXT_WHITELIST.includes(clientExt)) {
      throw new BadRequestException('不支持的图片扩展名（仅 .jpg/.jpeg/.png/.webp）');
    }
    // magic bytes 为最终裁决：不信 mimetype，不信扩展名
    const detectedExt = detectImageExt(file.buffer);
    if (!detectedExt) {
      throw new BadRequestException('文件内容不是有效的 jpeg/png/webp 图片');
    }
    // M2-B5 补强（攻击席 P2）：结构完整性复查——拦 polyglot（JPEG 头+脚本体 / 截断图），
    // 位于 magic bytes 识别之后、落盘之前，不合格一律 400。
    if (!isImageStructurallyComplete(file.buffer, detectedExt)) {
      throw new BadRequestException('文件结构不完整');
    }
    // 文件名服务端生成（时间戳+随机），扩展名以内容检测为准；绝不使用客户端文件名
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${detectedExt}`;
    const uploadDir = resolveUploadDir();
    fs.mkdirSync(uploadDir, { recursive: true });
    const target = path.resolve(uploadDir, filename);
    // 双保险防路径穿越：解析结果必须仍在锁定目录内
    if (!target.startsWith(uploadDir + path.sep)) {
      throw new BadRequestException('非法文件名');
    }
    fs.writeFileSync(target, file.buffer);
    return { path: `/images/products/${filename}` };
  }

  @Get()
  @ApiPaginatedQuery(Product, '获取产品列表', '分页获取产品列表，支持搜索和排序')
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词', example: 'iPhone' })
  // R4(反查 P3)：此前此处还挂了 categoryId/minPrice/maxPrice 三行 @ApiQuery，但 handler
  // 并不接收这些参数（过滤能力在 GET /products/search）——文档失实已删，只保留真实支持的 search。
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

  /**
   * M1-B3(2026-10-04)：管理端全量列表（含下架品），公开列表只看在售。
   * 声明位置必须早于 @Get(':id')，保证 /products/admin/all 不被 :id 路由吞掉。
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiDocs({
    summary: '获取全部产品（含下架）',
    description: '管理员查看全部产品列表，不按 isActive 过滤',
    auth: true,
  })
  findAllAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll({
      page,
      limit,
      search,
      includeInactive: true,
    });
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req?: any,
  ) {
    const updated = await this.productsService.update(id, updateProductDto);
    // diff 摘要：本次提交的变更载荷（before 态由 service 内快照可查，此处记录请求侧 patch）
    await this.auditProductWrite(req, '更新', id, { id, changes: updateProductDto });
    return updated;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiDeleteResource('删除产品')
  @ApiDocs({
    summary: '删除产品',
    description: '管理员删除指定产品（软删=下架，isActive=false；order_items FK NO ACTION 硬删必败）',
    auth: true,
    params: [
      {
        name: 'id',
        description: '产品ID',
        example: 1,
      },
    ],
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req?: any) {
    await this.productsService.remove(id);
    await this.auditProductWrite(req, '删除', id, { id, isActive: false });
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
