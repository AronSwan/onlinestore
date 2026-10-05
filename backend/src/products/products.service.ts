// 用途：产品服务，处理商品相关的业务逻辑
// 依赖文件：product.entity.ts, category.entity.ts, product-image.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:23:30

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, QueryDeepPartialEntity, DeepPartial } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../monitoring/monitoring.service';
import { ProductEventsService } from '../messaging/product-events.service';
import { SearchManagerService } from './search/search-manager.service';
import { ProductIndexData } from './search/search-strategy.interface';

import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  mergePriceView,
  mergeSpecifications,
  toNumberOrNull,
} from './product-merge.helper';

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  /** 四修 P1-3：显式 null=无划线价（落库 NULL），与清除语义对齐 */
  originalPrice?: number | null;
  stock: number;
  categoryId?: number;
  mainImage?: string;
  tags?: string[];
  specifications?: Record<string, any>;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  /** 四修 P1-3：显式 null=清除划线价（HTTP 面经 DTO 原样透传到达此处） */
  originalPrice?: number | null;
  stock?: number;
  categoryId?: number;
  mainImage?: string;
  tags?: string[];
  specifications?: Record<string, any>;
  isActive?: boolean;
}

export interface ProductSearchOptions {
  keyword?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  inStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'sales' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly monitoring: MonitoringService,
    private readonly productEventsService: ProductEventsService,
    private readonly searchManager: SearchManagerService,
  ) {}

  // 缓存观测与列表键索引
  private cacheHits = 0;
  private cacheMisses = 0;
  private listCacheKeys = new Set<string>();
  private popularCacheKeys = new Set<string>();

  private logCache(event: 'hit' | 'miss', key: string) {
    if (event === 'hit') this.cacheHits++;
    else this.cacheMisses++;
    console.log('[cache]', { key, event, hits: this.cacheHits, misses: this.cacheMisses });
  }

  /**
   * R1(反查 P2-1)：@nestjs/cache-manager@3 + cache-manager@7（Keyv）的 TTL 单位是【毫秒】，
   * 而 performance.cache.ttl.* 配置与历史默认值均为【秒】——此前 30/300/600 直接透传，
   * 条目 30-600ms 即蒸发、全站缓存零命中。本方法统一在唯一的 cacheManager.set 边界
   * 做秒→毫秒换算，配置语义保持秒不变。
   */
  private cacheTtlMs(configKey: string, defaultSeconds: number): number {
    const seconds = this.configService.get<number>(configKey) || defaultSeconds;
    return seconds * 1000;
  }

  /**
   * 四修 P2：specifications JSON 序列化上限（10KB）——超长规格在写库前 400
   * fail-clean（长度缺口收口：词表匹配/JSON 列存储都不设防的超长载荷面）。
   * null（整体清空）/ undefined（未提交）不校验；循环引用等无法序列化的形状
   * 同样 400（HTTP 面 JSON 天然无环，此处兜直接调用面）。
   */
  private assertSpecificationsWithinLimit(specifications: unknown): void {
    if (specifications === undefined || specifications === null) return;
    let serialized: string;
    try {
      serialized = JSON.stringify(specifications);
    } catch (e) {
      throw new BadRequestException({
        message: `specifications 无法序列化为 JSON（${(e as Error).message}）`,
        details: { field: 'specifications' },
      });
    }
    const limit = 10 * 1024;
    if (serialized.length > limit) {
      throw new BadRequestException({
        message: `specifications 序列化后 ${serialized.length} 字符，超过 ${limit}（10KB）上限`,
        details: { field: 'specifications', size: serialized.length, limit },
      });
    }
  }

  private async invalidateListCache() {
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';

    // 清除所有产品列表相关缓存
    const patterns = [
      `${keyPrefix}:products:list:*`,
      `${keyPrefix}:popular:products:*`,
      `${keyPrefix}:search:products:*`,
    ];

    for (const pattern of patterns) {
      try {
        // 使用更可靠的缓存键管理策略
        const keysToDelete: string[] = [];

        // 首先清除已知的缓存键
        for (const key of this.listCacheKeys) {
          if (key.startsWith(pattern.replace('*', ''))) {
            keysToDelete.push(key);
          }
        }

        for (const key of this.popularCacheKeys) {
          if (key.startsWith(pattern.replace('*', ''))) {
            keysToDelete.push(key);
          }
        }

        // 批量删除缓存键
        for (const key of keysToDelete) {
          try {
            await this.cacheManager.del(key);
          } catch (e) {
            console.warn('删除缓存键失败', { key, error: (e as Error).message });
          }
        }
      } catch (e) {
        console.warn('清除缓存模式失败', { pattern, error: (e as Error).message });
      }
    }

    // 清空缓存键集合
    this.listCacheKeys.clear();
    this.popularCacheKeys.clear();
  }

  /**
   * 创建产品
   */
  async create(productData: CreateProductData): Promise<Product> {
    // M1-B2(2026-10-04)：categoryId 可选——未传不校验直接建；
    // "传了但不存在" 仍抛 404（原行为保留给该情形）。
    let category: Category | undefined;
    if (productData.categoryId !== undefined && productData.categoryId !== null) {
      const found = await this.categoryRepository.findOne({
        where: { id: productData.categoryId },
      });

      if (!found) {
        throw new NotFoundException();
      }
      category = found;
    }

    // 四修 P2：specifications 序列化上限（create 面：提交什么校验什么）
    this.assertSpecificationsWithinLimit(productData.specifications);

    // originalPrice 类型面如实含 null（P1-3：null=无划线价，落库 NULL）；
    // DeepPartial 按 number 声明，写边界 unknown 桥接（运行时 TypeORM 对
    // nullable 列写 null 是认可值，update 分支同款桥接）
    const product = this.productRepository.create({
      ...productData,
      category,
      publishedAt: new Date(),
    } as unknown as DeepPartial<Product>);

    const saved = await this.productRepository.save(product);

    // 写操作后失效相关缓存
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';

    // 清除产品详情缓存
    try {
      await this.cacheManager.del(`${keyPrefix}:product:${saved.id}`);
    } catch (e) {}

    // 清除热门产品缓存
    for (const key of this.popularCacheKeys) {
      try {
        await this.cacheManager.del(key);
      } catch (e) {}
    }

    // 清除所有列表缓存
    await this.invalidateListCache();

    // 异步发布产品创建事件
    this.publishProductCreatedEvent(saved).catch((error: Error) => {
      console.error('发布产品创建事件失败:', error);
    });

    // 异步索引产品到搜索引擎
    this.indexProductToSearch(saved).catch((error: Error) => {
      console.error('产品搜索索引失败:', error);
    });

    return saved;
  }

  /**
   * 根据ID查找产品
   */
  async findById(id: number): Promise<Product | null> {
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    const cacheKey = `${keyPrefix}:product:${id}`;

    // 尝试从缓存获取，如果失败则继续到数据库查询
    let cached: Product | undefined = undefined;
    try {
      const startGet = process.hrtime.bigint();
      cached = await this.cacheManager.get<Product>(cacheKey);
      const endGet = process.hrtime.bigint();
      this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);

      if (cached) {
        this.logCache('hit', cacheKey);
        this.monitoring.recordCacheHit(cacheKey);
        return cached;
      }
    } catch (error) {
      console.error('缓存获取失败:', error);
      // 继续到数据库查询
    }

    this.logCache('miss', cacheKey);
    this.monitoring.recordCacheMiss(cacheKey);

    const startDb = process.hrtime.bigint();
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'images'],
    });
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('detail', 'products', Number(endDb - startDb) / 1_000_000_000);

    if (product) {
      // R1：秒→毫秒（detail 300s → 300000ms），见 cacheTtlMs 注释
      const ttl = this.cacheTtlMs('performance.cache.ttl.detail', 300);
      try {
        const startSet = process.hrtime.bigint();
        await this.cacheManager.set(cacheKey, product, ttl);
        const endSet = process.hrtime.bigint();
        this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
      } catch (error) {
        console.error('缓存设置失败:', error);
        // 不影响主流程，继续返回产品
      }
    }

    return product;
  }

  /**
   * 搜索产品 - 使用搜索引擎进行全文搜索
   */
  // @CacheSearch({ ttl: 300 }) // 缓存5分钟 - 暂时注释掉，需要修复导入
  async search(options: ProductSearchOptions): Promise<{ products: Product[]; total: number }> {
    const {
      keyword,
      categoryId,
      minPrice,
      maxPrice,
      tags,
      inStock,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    // 如果没有关键词，使用数据库搜索
    if (!keyword) {
      return this.databaseSearch(options);
    }

    try {
      // 使用搜索引擎进行全文搜索
      const searchOptions = {
        filters: {
          categoryId,
          minPrice,
          maxPrice,
          tags,
          inStock,
          isActive: true,
        },
        sortBy: sortBy === 'sales' ? undefined : sortBy, // 搜索引擎可能不支持sales排序
        sortOrder: sortOrder.toLowerCase() as 'asc' | 'desc',
        page,
        limit,
      };

      const searchResult = await this.searchManager.search(keyword, searchOptions);

      // 根据搜索结果从数据库获取完整的产品信息
      const productIds = searchResult.hits.map(hit => parseInt(hit.id));

      if (productIds.length === 0) {
        return { products: [], total: 0 };
      }

      const products = await this.productRepository.find({
        // R3(反查 P2-2)：引擎侧虽传了 isActive:true 过滤，但索引与 DB 可能短暂不一致
        // （下架事件异步、索引写失败重试中）——DB 回填必须复检，下架品不得回流给前台。
        where: { id: In(productIds), isActive: true },
        relations: ['category', 'images'],
      });

      // 保持搜索结果的排序
      const productMap = new Map(products.map(p => [p.id, p]));
      const sortedProducts = productIds.map(id => productMap.get(id)).filter(Boolean) as Product[];

      return {
        products: sortedProducts,
        total: searchResult.total,
      };
    } catch (error) {
      console.warn('搜索引擎搜索失败，回退到数据库搜索:', error);
      // 搜索引擎失败时回退到数据库搜索
      return this.databaseSearch(options);
    }
  }

  /**
   * 数据库搜索 - 搜索引擎不可用时的备用方案
   */
  private async databaseSearch(
    options: ProductSearchOptions,
  ): Promise<{ products: Product[]; total: number }> {
    const {
      keyword,
      categoryId,
      minPrice,
      maxPrice,
      tags,
      inStock,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    // 确保productRepository存在
    if (!this.productRepository) {
      throw new Error('Product repository not available');
    }

    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.isActive = :isActive', { isActive: true });

    if (keyword) {
      query.andWhere('(product.name LIKE :keyword OR product.description LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
      query.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      query.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (tags && tags.length > 0) {
      // M1-B7(2026-10-04)：tags 双方言。tags 为 simple-array 逗号串存储；
      // FIND_IN_SET 是 MySQL/TiDB 方言，SQLite/Postgres 下直接语法错误。
      // 非 MySQL 族用 (',' || tags || ',') LIKE '%,tag,%' 做等值匹配（首尾包逗号防子串误配）。
      const dbType = (
        this.configService.get<string>('master.database.type') || 'sqlite'
      ).toLowerCase();
      const isMysqlFamily = dbType === 'mysql' || dbType === 'tidb';
      tags.forEach((tag, index) => {
        if (isMysqlFamily) {
          query.andWhere(`FIND_IN_SET(:tag${index}, product.tags)`, { [`tag${index}`]: tag });
        } else {
          query.andWhere(`(',' || product.tags || ',') LIKE :tag${index}`, {
            [`tag${index}`]: `%,${tag},%`,
          });
        }
      });
    }

    if (inStock) {
      query.andWhere('product.stock > 0');
    }

    const [products, total] = await query
      .orderBy(`product.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { products, total };
  }

  /**
   * 获取热门产品
   */
  async getPopularProducts(limit: number = 10): Promise<Product[]> {
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    const cacheKey = `${keyPrefix}:popular:products:${limit}`;
    const startGet = process.hrtime.bigint();
    const cached = await this.cacheManager.get<Product[]>(cacheKey);
    const endGet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);

    if (cached) {
      this.logCache('hit', cacheKey);
      this.monitoring.recordCacheHit(cacheKey);
      return cached;
    }
    this.logCache('miss', cacheKey);
    this.monitoring.recordCacheMiss(cacheKey);

    const startDb = process.hrtime.bigint();
    const products = await this.productRepository.find({
      where: { isActive: true },
      order: { sales: 'DESC' },
      take: limit,
      relations: ['category', 'images'],
    });
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery(
      'aggregation',
      'products',
      Number(endDb - startDb) / 1_000_000_000,
    );

    // R1：秒→毫秒（popular 600s → 600000ms），见 cacheTtlMs 注释
    const ttl = this.cacheTtlMs('performance.cache.ttl.popular', 600);
    const startSet = process.hrtime.bigint();
    await this.cacheManager.set(cacheKey, products, ttl);
    const endSet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
    this.popularCacheKeys.add(cacheKey as string);

    return products;
  }

  /**
   * 更新产品信息
   */
  async update(id: number, updateData: UpdateProductData): Promise<Product> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException();
    }

    if (updateData.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateData.categoryId },
      });

      if (!category) {
        throw new NotFoundException();
      }

      // 创建新的updateData对象，避免修改原对象
      const { categoryId, ...restData } = updateData;
      updateData = { ...restData, category } as any;
    }

    // R1（P1·二次修复 2026-10-05，清单 1）+ 三修 P1-1/P1-3：PATCH 跨字段合并校验。
    // 根因：DTO 的 ValidatorConstraint 只能看到请求自带字段——PATCH 只传
    // originalPrice 或只传 price 时跨字段约束被跳过，originalPrice<price
    // 倒挂落库（席 X1 实锤 DB）。服务层是唯一同时看得见"存量+增量"的层：
    // 写库前构造合并视图（dto ?? 存量）复检不变式 originalPrice>=price。
    // 三修升级（fix2 §三 1/3）：①合并视图收敛到 product-merge.helper 单点实现
    // （控制器闸视图与写路径同构，Y2 双份同构 P2）；②存量值 Number() 归一——
    // PG decimal 列经 node-postgres 返回字符串（'100.00'），原 typeof==='number'
    // 守卫在 PG 部署形态静默失效（Y1 P1）；③显式 null 的 price 直接 400（fail-clean，
    // 不再走到 DB NOT NULL 500——DTO 层已把 HTTP 面的 null 归一为 undefined，
    // 此处兜直接调用面）。
    // originalPrice 显式传 null = 清除划线价（合法语义，清除后无不变式可言）；
    // 未传 = 沿用存量值参与比对。
    if (updateData.price === null) {
      throw new BadRequestException({
        message: 'price 不能为 null（要改价请提交正数；不修改则不传该字段）',
        details: { field: 'price', submitted: null },
      });
    }
    const priceView = mergePriceView(updateData as Record<string, unknown>, product as unknown as Record<string, unknown>);
    if (priceView.invalidPrice || priceView.invalidOriginalPrice) {
      const field = priceView.invalidPrice ? 'price' : 'originalPrice';
      throw new BadRequestException({
        message: `${field} 必须是数字（收到无法归一的形状：${JSON.stringify(
          field === 'price' ? updateData.price : updateData.originalPrice,
        )}）`,
        details: { field, submitted: field === 'price' ? updateData.price : updateData.originalPrice },
      });
    }
    if (
      priceView.price !== null &&
      priceView.originalPrice !== null &&
      priceView.originalPrice < priceView.price
    ) {
      throw new BadRequestException({
        message: '划线原价不能低于现价（PATCH 单值提交按「存量+增量」合并视图校验）',
        details: {
          price: { stored: product.price, submitted: updateData.price, effective: priceView.price },
          originalPrice: {
            stored: product.originalPrice,
            submitted: updateData.originalPrice,
            effective: priceView.originalPrice,
          },
        },
      });
    }

    // R2（P2·二次修复 2026-10-05，清单 2）+ 三修 P2-7：specifications 浅合并。
    // 根因：repository.update 直写整体替换——PATCH {specifications:{}} 把存量
    // factCard 静默清空，之后闸/复检的合并视图再也取不到，两步废掉词表冲突
    // 检查（席 X1 实锤）。浅合并语义收敛到 product-merge.helper.mergeSpecifications
    // 单点（dto 键覆盖存量同名键、未提及键保留，factCard 因此天然保留）；
    // 显式传 null 是合法的"整体清空"语义，原样透传由 repository.update 写 NULL。
    if (Object.prototype.hasOwnProperty.call(updateData, 'specifications')) {
      updateData = {
        ...updateData,
        specifications: mergeSpecifications(updateData.specifications, product.specifications),
      } as UpdateProductData;
      // 四修 P2：specifications 序列化上限（合并视图=实际落库形状，按合并后校验）
      this.assertSpecificationsWithinLimit(updateData.specifications);
    }

    // P1-2（四修，fix3 裁定）：事件载荷快照必须在价格剥离【之前】取样——
    // 三修把赋值放在剥离后，纯价格 PATCH 的事件丢失 price 字段（注释写"按
    // 提交意图报文"而代码相反，Y1/Y2 源码级实证）。价格剥离只影响普通写载荷，
    // 不得影响事件报文；本行之后对 updateData 的任何重赋值（键剥离）都只在
    // 写路径生效，快照引用保持"本次提交意图"完整视图。
    const updateDataForEvent = updateData;

    // P1-1（三修 2026-10-05，fix2 §三 1）：并发 TOCTOU 修复——价格写入改单条
    // 条件 UPDATE（check-then-act 无事务，X1 4/5、X2 10/10 并发实锤 DB 倒挂）。
    // 语句级原子性：守卫与写入同一条 UPDATE，affected=0 即另一并发写已先行
    // 落库使本次提交不再合法 → 重读复检后 409 带明细（与顺序面 400 区分）。
    // 双方言兼容：where 串用属性名（TypeORM 按方言转义为 "originalPrice"），
    // 参数占位由 QueryBuilder 按驱动翻译（SQLite ? / PG $n），零方言函数。
    const priceWritten = priceView.priceSubmitted;
    const originalPriceWritten = priceView.originalPriceSubmitted; // 数字值（显式 null 清除语义另行处理）
    if (priceWritten || originalPriceWritten) {
      const qb = this.productRepository.createQueryBuilder().update(Product);
      if (priceWritten && originalPriceWritten) {
        // 双字段同请求：合并校验已过，条件 UPDATE 兜底复检新值配对
        // （两值同语句原子落库，语句内不变式即终态不变式）。
        qb.set({ price: priceView.price!, originalPrice: priceView.originalPrice! })
          .where('id = :id AND (:pairOriginalPrice IS NULL OR :pairPrice IS NULL OR :pairOriginalPrice >= :pairPrice)', {
            id,
            pairOriginalPrice: priceView.originalPrice,
            pairPrice: priceView.price,
          });
      } else if (priceWritten && priceView.originalPriceExplicitNull) {
        // 抬价 + 显式清除划线价：终态 (新价, null) 不变式空集，两值同语句原子落库，
        // 无需对存量值设守卫（存量划线价即将被清除，守它反而误伤 409）。
        // （实体类型把 originalPrice 声明为 number，DB 列实际 nullable——显式写
        // null 是 TypeORM 认可的合法清列值，此处断言收窄类型面。）
        qb.set({ price: priceView.price!, originalPrice: null as unknown as number }).where('id = :id', { id });
      } else if (priceWritten) {
        // 单抬价：存量划线价为空或仍 ≥ 新价才允许落库
        qb.set({ price: priceView.price! })
          .where('id = :id AND (originalPrice IS NULL OR originalPrice >= :guardPrice)', {
            id,
            guardPrice: priceView.price,
          });
      } else {
        // 单调划线价：存量现价为空或 ≤ 新划线价才允许落库
        qb.set({ originalPrice: priceView.originalPrice! })
          .where('id = :id AND (price IS NULL OR price <= :guardOriginalPrice)', {
            id,
            guardOriginalPrice: priceView.originalPrice,
          });
      }
      const result = await qb.execute();
      if (!result || !result.affected) {
        // affected=0：并发交错（或行已消失）。绕过缓存直读库，按当前真值复检给冲突原因。
        const current = await this.productRepository.findOne({ where: { id } });
        if (!current) {
          throw new NotFoundException();
        }
        const currentView = mergePriceView({}, current as unknown as Record<string, unknown>);
        throw new ConflictException({
          message:
            '价格不变式并发冲突：另一并发写已先行落库，本次提交按最新库值复检不再合法（条件 UPDATE affected=0）',
          details: {
            price: { stored: current.price, submitted: updateData.price, effective: currentView.price },
            originalPrice: {
              stored: current.originalPrice,
              submitted: updateData.originalPrice,
              effective: currentView.originalPrice,
            },
          },
        });
      }
      // 价格字段已由条件 UPDATE 落库——从普通写载荷中剥离，防二次无守卫写入
      // （仅剥离 QB 实际写过的键；纯 originalPrice:null 清除若未走 QB 仍保留在载荷）。
      const rest = { ...(updateData as Record<string, unknown>) };
      if (priceWritten) delete rest.price;
      if (originalPriceWritten || (priceWritten && priceView.originalPriceExplicitNull)) {
        delete rest.originalPrice;
      }
      updateData = rest as UpdateProductData;
    }

    // P3（三修，fix2 §三 9）：三 findById 收敛——oldProduct 复用方法开头的存量读
    // （缓存失效前后的两次读对"旧值快照"语义等价），删除紧贴 update 前的冗余重读。
    const oldProduct = product;
    if (Object.keys(updateData as Record<string, unknown>).length > 0) {
      // originalPrice 类型面如实含 null（P1-3 清除语义）；QueryDeepPartialEntity
      // 按 number 声明，写边界 unknown 桥接（同一语义在上方条件 UPDATE 分支已有
      // 先例：originalPrice: null as unknown as number）
      await this.productRepository.update(id, updateData as unknown as QueryDeepPartialEntity<Product>);
    }

    // 清除缓存（统一前缀与热门键集合）
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    try {
      await this.cacheManager.del(`${keyPrefix}:product:${id}`);
    } catch (e) {}
    for (const key of this.popularCacheKeys) {
      try {
        await this.cacheManager.del(key);
      } catch (e) {}
    }
    await this.invalidateListCache();

    const updatedProduct = await this.findById(id);

    // 异步发布产品更新事件
    if (oldProduct && updatedProduct) {
      this.publishProductUpdatedEvent(oldProduct, updatedProduct, updateDataForEvent).catch(error => {
        console.error('发布产品更新事件失败:', error);
      });
    }

    // 异步更新产品搜索索引
    if (updatedProduct) {
      this.indexProductToSearch(updatedProduct).catch((error: Error) => {
        console.error('产品搜索索引更新失败:', error);
      });
    }

    return updatedProduct!;
  }

  /**
   * 删除产品（软删）
   * M2-B6(2026-10-04)：硬删改下架——order_items→products 外键为 ON DELETE NO ACTION，
   * 物理 DELETE 只要存在订单引用即 FK 报错必败；置 isActive=false 即"下架=删除"语义。
   * 后续商品 status 列落地后，本操作映射为 archived。
   */
  async delete(id: number): Promise<void> {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException();
    }

    await this.productRepository.update(id, { isActive: false });

    // 清除缓存（统一前缀与热门键集合）
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    try {
      await this.cacheManager.del(`${keyPrefix}:product:${id}`);
    } catch (e) {}
    for (const key of this.popularCacheKeys) {
      try {
        await this.cacheManager.del(key);
      } catch (e) {}
    }
    await this.invalidateListCache();

    // 异步移除搜索索引，下架品不应再出现在搜索结果
    this.deleteProductFromSearch(id).catch((error: Error) => {
      console.error('产品搜索索引删除失败:', error);
    });
  }

  /**
   * 增加产品浏览量
   */
  async incrementViews(id: number): Promise<void> {
    await this.productRepository.increment({ id }, 'views', 1);

    // 异步发布产品浏览事件
    this.publishProductViewedEvent(id).catch(error => {
      console.error('发布产品浏览事件失败:', error);
    });
  }

  /**
   * 更新产品库存
   */
  async updateStock(id: number, quantity: number): Promise<void> {
    const oldProduct = await this.findById(id);
    const oldStock = oldProduct?.stock || 0;

    await this.productRepository.update(id, {
      stock: () => `stock + ${quantity}`,
    });

    // 清除缓存（统一前缀）
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    try {
      await this.cacheManager.del(`${keyPrefix}:product:${id}`);
    } catch (e) {}
    await this.invalidateListCache();

    // 异步发布库存更新事件
    this.publishInventoryUpdatedEvent(id, oldStock, oldStock + quantity, quantity, 'system').catch(
      error => {
        console.error('发布库存更新事件失败:', error);
      },
    );
  }

  /**
   * 获取产品统计信息
   */
  async getStatistics(): Promise<{
    totalProducts: number;
    activeProducts: number;
    outOfStockProducts: number;
    totalSales: number;
  }> {
    // 确保productRepository存在
    if (!this.productRepository) {
      throw new Error('Product repository not available');
    }

    const totalProducts = await this.productRepository.count();
    const activeProducts = await this.productRepository.count({ where: { isActive: true } });
    const outOfStockProducts = await this.productRepository.count({
      where: { stock: 0, isActive: true },
    });

    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('SUM(product.sales)', 'totalSales')
      .getRawOne();

    return {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      totalSales: parseInt(result.totalSales) || 0,
    };
  }

  /**
   * 获取所有产品（分页）
   * M1-B3(2026-10-04)：公开列表默认只返回在售（isActive=true）——下架品不得漏给前台；
   * 管理端（GET /products/admin/all）传 includeInactive:true 查看全部。
   */
  async findAll(
    options: { page?: number; limit?: number; search?: string; includeInactive?: boolean } = {},
  ): Promise<{ products: Product[]; total: number }> {
    const { page = 1, limit = 20, search, includeInactive = false } = options;
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    // 管理端变体用独立键段，避免与公开列表互相污染（失效模式 products:list:* 两者都覆盖）
    const cacheKey = `${keyPrefix}:products:list:${includeInactive ? 'admin:' : ''}${page}:${limit}:${search || ''}`;
    const startGet = process.hrtime.bigint();
    const cached = await this.cacheManager.get<{ products: Product[]; total: number }>(cacheKey);
    const endGet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);
    if (cached) {
      this.logCache('hit', cacheKey);
      this.monitoring.recordCacheHit(cacheKey);
      return cached;
    }
    this.logCache('miss', cacheKey);
    this.monitoring.recordCacheMiss(cacheKey);

    // 确保productRepository存在
    if (!this.productRepository) {
      throw new Error('Product repository not available');
    }

    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images');

    if (!includeInactive) {
      query.where('product.isActive = :isActive', { isActive: true });
    }

    if (search) {
      const searchCondition = '(product.name LIKE :search OR product.description LIKE :search)';
      const searchParams = { search: `%${search}%` };
      if (includeInactive) {
        query.where(searchCondition, searchParams);
      } else {
        query.andWhere(searchCondition, searchParams);
      }
    }

    const startDb = process.hrtime.bigint();
    const [products, total] = await query
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('list', 'products', Number(endDb - startDb) / 1_000_000_000);
    const result = { products, total };
    // R1：秒→毫秒（list 30s → 30000ms），见 cacheTtlMs 注释
    const ttl = this.cacheTtlMs('performance.cache.ttl.list', 30);
    const startSet = process.hrtime.bigint();
    await this.cacheManager.set(cacheKey, result, ttl);
    const endSet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
    this.listCacheKeys.add(cacheKey as string);
    return result;
  }

  /**
   * 查找热门产品
   */
  async findPopular(limit: number = 10): Promise<Product[]> {
    return this.getPopularProducts(limit);
  }

  /**
   * 根据ID查找单个产品（公开面）
   * M1-B3(2026-10-04)：下架品（isActive=false）对公开访问返回 404——与列表过滤同一语义；
   * 管理路由不受限：update/delete 内部走 findById，不经过本方法。
   */
  async findOne(id: number): Promise<Product> {
    const product = await this.findById(id);
    if (!product || !product.isActive) {
      throw new NotFoundException();
    }
    return product;
  }

  /**
   * 删除产品
   */
  async remove(id: number): Promise<void> {
    return this.delete(id);
  }

  /**
   * 记录产品浏览量
   */
  async recordView(id: number): Promise<void> {
    return this.incrementViews(id);
  }

  /**
   * 发布产品创建事件
   */
  private async publishProductCreatedEvent(product: Product): Promise<void> {
    const event = {
      productId: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      timestamp: new Date().toISOString(),
    };

    await this.productEventsService.publishProductCreated(event);
  }

  /**
   * 发布产品更新事件
   */
  private async publishProductUpdatedEvent(
    oldProduct: Product | null,
    newProduct: Product,
    updateData: UpdateProductData,
  ): Promise<void> {
    const event = {
      productId: newProduct.id,
      name: updateData.name,
      price: updateData.price,
      stock: updateData.stock,
      oldPrice: oldProduct?.price,
      timestamp: new Date().toISOString(),
    };

    await this.productEventsService.publishProductUpdated(event);
  }

  /**
   * 发布产品浏览事件
   */
  private async publishProductViewedEvent(productId: number): Promise<void> {
    const event = {
      productId: productId,
      timestamp: new Date().toISOString(),
    };

    await this.productEventsService.publishProductViewed(event);
  }

  /**
   * 发布库存更新事件
   */
  private async publishInventoryUpdatedEvent(
    productId: number,
    oldStock: number,
    newStock: number,
    change: number,
    reason: 'order' | 'manual' | 'system',
  ): Promise<void> {
    const event = {
      productId: productId,
      oldStock: oldStock,
      newStock: newStock,
      change: change,
      reason: reason,
      timestamp: new Date().toISOString(),
    };

    await this.productEventsService.publishInventoryUpdated(event);
  }

  /**
   * 索引产品到搜索引擎
   */
  private async indexProductToSearch(product: Product): Promise<void> {
    try {
      const indexData: ProductIndexData = {
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        category: product.category?.name || '',
        categoryId: product.category?.id || 0,
        tags: product.tags || [],
        stock: product.stock,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        specifications: product.specifications,
      };

      await this.searchManager.indexProduct(indexData);
    } catch (error) {
      console.error('产品搜索索引失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 从搜索引擎删除产品索引
   */
  private async deleteProductFromSearch(productId: number): Promise<void> {
    try {
      await this.searchManager.deleteProduct(productId.toString());
    } catch (error) {
      console.error('产品搜索索引删除失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 批量索引所有产品到搜索引擎
   */
  async reindexAllProducts(): Promise<{ success: number; failed: number }> {
    try {
      const products = await this.productRepository.find({
        relations: ['category'],
      });

      const indexData: ProductIndexData[] = products.map(product => ({
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        category: product.category?.name || '',
        categoryId: product.category?.id || 0,
        tags: product.tags || [],
        stock: product.stock,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        specifications: product.specifications,
      }));

      await this.searchManager.indexProducts(indexData);

      return { success: products.length, failed: 0 };
    } catch (error) {
      console.error('批量重新索引失败:', error);
      throw new Error(`批量重新索引失败: ${error.message}`);
    }
  }

  /**
   * 根据分类查找产品
   */
  async findByCategory(category: string, limit: number = 10): Promise<Product[]> {
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    const cacheKey = `${keyPrefix}:products:category:${category}:${limit}`;
    const startGet = process.hrtime.bigint();
    const cached = await this.cacheManager.get<Product[]>(cacheKey);
    const endGet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);

    if (cached) {
      this.logCache('hit', cacheKey);
      this.monitoring.recordCacheHit(cacheKey);
      return cached;
    }

    this.logCache('miss', cacheKey);
    this.monitoring.recordCacheMiss(cacheKey);

    // 确保productRepository存在
    if (!this.productRepository) {
      throw new Error('Product repository not available');
    }

    const startDb = process.hrtime.bigint();
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('category.name = :category', { category })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .orderBy('product.sales', 'DESC')
      .take(limit)
      .getMany();
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('list', 'products', Number(endDb - startDb) / 1_000_000_000);

    // R1：秒→毫秒（list 30s → 30000ms），见 cacheTtlMs 注释
    const ttl = this.cacheTtlMs('performance.cache.ttl.list', 30);
    const startSet = process.hrtime.bigint();
    await this.cacheManager.set(cacheKey, products, ttl);
    const endSet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
    this.listCacheKeys.add(cacheKey as string);

    return products;
  }

  /**
   * 获取搜索引擎状态
   */
  async getSearchEngineStatus(): Promise<{ status: 'healthy' | 'unhealthy'; uptime: number }> {
    try {
      const raw = await this.searchManager.getStatus();
      // 兼容不同实现，规范化返回结构（支持 strategies/currentEngine 结构）
      let healthy = false;
      // 默认运行时间：可通过配置覆盖，未配置则为 3600 秒
      const defaultUptime = this.configService.get<number>('search.status.defaultUptime') ?? 3600;
      let uptime = defaultUptime;

      if (typeof (raw as any)?.healthy === 'boolean') {
        healthy = !!(raw as any).healthy;
      } else if (typeof (raw as any)?.status === 'string') {
        healthy = String((raw as any).status).toLowerCase() === 'healthy';
      } else if (Array.isArray((raw as any)?.strategies)) {
        // 如果返回为策略集合，认为存在任何 isHealthy=true 即健康
        healthy = !!(raw as any).strategies.find((s: any) => s?.isHealthy === true);
      }

      if (typeof (raw as any)?.uptime === 'number') {
        uptime = Number((raw as any).uptime);
      } else if (typeof (raw as any)?.uptimeSeconds === 'number') {
        uptime = Number((raw as any).uptimeSeconds);
      }

      return { status: healthy ? 'healthy' : 'unhealthy', uptime };
    } catch (error) {
      console.error('获取搜索引擎状态失败:', error);
      // 保留原始错误消息，满足测试期望
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  /**
   * 获取所有分类
   * 作者：后端开发团队
   * 时间：2025-09-26 18:30:00
   */
  async getCategories(): Promise<Category[]> {
    const keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
    const cacheKey = `${keyPrefix}:categories:all`;

    // 尝试从缓存获取
    const startGet = process.hrtime.bigint();
    const cached = await this.cacheManager.get<Category[]>(cacheKey);
    const endGet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);

    if (cached) {
      this.logCache('hit', cacheKey);
      this.monitoring.recordCacheHit(cacheKey);
      return cached;
    }

    this.logCache('miss', cacheKey);
    this.monitoring.recordCacheMiss(cacheKey);

    // 从数据库获取分类
    const startDb = process.hrtime.bigint();
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: ['products'],
    });
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('list', 'categories', Number(endDb - startDb) / 1_000_000_000);

    // 缓存分类数据（R1：秒→毫秒，list TTL ×2 仍以秒为基準换算）
    const ttl = this.cacheTtlMs('performance.cache.ttl.list', 30) * 2;
    const startSet = process.hrtime.bigint();
    await this.cacheManager.set(cacheKey, categories, ttl); // 分类缓存时间更长（list TTL ×2）
    const endSet = process.hrtime.bigint();
    this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);

    return categories;
  }
}
