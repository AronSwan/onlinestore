"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cache_manager_1 = require("@nestjs/cache-manager");
const common_2 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const monitoring_service_1 = require("../monitoring/monitoring.service");
const product_events_service_1 = require("../messaging/product-events.service");
const search_manager_service_1 = require("./search/search-manager.service");
const embedding_service_1 = require("./search/embedding.service");
const product_entity_1 = require("./entities/product.entity");
const category_entity_1 = require("./entities/category.entity");
const product_image_entity_1 = require("./entities/product-image.entity");
const product_merge_helper_1 = require("./product-merge.helper");
const db_write_mutex_1 = require("../common/db-write-mutex");
let ProductsService = class ProductsService {
    constructor(productRepository, categoryRepository, productImageRepository, cacheManager, configService, monitoring, productEventsService, searchManager, embeddingService) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.productImageRepository = productImageRepository;
        this.cacheManager = cacheManager;
        this.configService = configService;
        this.monitoring = monitoring;
        this.productEventsService = productEventsService;
        this.searchManager = searchManager;
        this.embeddingService = embeddingService;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.listCacheKeys = new Set();
        this.popularCacheKeys = new Set();
    }
    logCache(event, key) {
        if (event === 'hit')
            this.cacheHits++;
        else
            this.cacheMisses++;
        console.log('[cache]', { key, event, hits: this.cacheHits, misses: this.cacheMisses });
    }
    cacheTtlMs(configKey, defaultSeconds) {
        const seconds = this.configService.get(configKey) || defaultSeconds;
        return seconds * 1000;
    }
    assertSpecificationsWithinLimit(specifications) {
        if (specifications === undefined || specifications === null)
            return;
        let serialized;
        try {
            serialized = JSON.stringify(specifications);
        }
        catch (e) {
            throw new common_1.BadRequestException({
                message: `specifications 无法序列化为 JSON（${e.message}）`,
                details: { field: 'specifications' },
            });
        }
        const limit = 10 * 1024;
        if (serialized.length > limit) {
            throw new common_1.BadRequestException({
                message: `specifications 序列化后 ${serialized.length} 字符，超过 ${limit}（10KB）上限`,
                details: { field: 'specifications', size: serialized.length, limit },
            });
        }
    }
    async invalidateListCache() {
        const keyPrefix = this.configService.get('redis.keyPrefix') || 'caddy_shopping';
        const patterns = [
            `${keyPrefix}:products:list:*`,
            `${keyPrefix}:popular:products:*`,
            `${keyPrefix}:search:products:*`,
        ];
        for (const pattern of patterns) {
            try {
                const keysToDelete = [];
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
                for (const key of keysToDelete) {
                    try {
                        await this.cacheManager.del(key);
                    }
                    catch (e) {
                        console.warn('删除缓存键失败', { key, error: e.message });
                    }
                }
            }
            catch (e) {
                console.warn('清除缓存模式失败', { pattern, error: e.message });
            }
        }
        this.listCacheKeys.clear();
        this.popularCacheKeys.clear();
    }
    async create(productData) {
        let category;
        if (productData.categoryId !== undefined && productData.categoryId !== null) {
            const found = await this.categoryRepository.findOne({
                where: { id: productData.categoryId },
            });
            if (!found) {
                throw new common_1.NotFoundException();
            }
            category = found;
        }
        this.assertSpecificationsWithinLimit(productData.specifications);
        const product = this.productRepository.create({
            ...productData,
            category,
            publishedAt: new Date(),
        });
        const saved = await this.productRepository.save(product);
        const keyPrefix = this.configService.get('redis.keyPrefix') || 'caddy_shopping';
        try {
            await this.cacheManager.del(`${keyPrefix}:product:${saved.id}`);
        }
        catch (e) { }
        for (const key of this.popularCacheKeys) {
            try {
                await this.cacheManager.del(key);
            }
            catch (e) { }
        }
        await this.invalidateListCache();
        this.publishProductCreatedEvent(saved).catch((error) => {
            console.error('发布产品创建事件失败:', error);
        });
        this.indexProductToSearch(saved).catch((error) => {
            console.error('产品搜索索引失败:', error);
        });
        return saved;
    }
    async findById(id) {
        const keyPrefix = this.configService.get('redis.keyPrefix') || 'caddy_shopping';
        const cacheKey = `${keyPrefix}:product:${id}`;
        let cached = undefined;
        try {
            const startGet = process.hrtime.bigint();
            cached = await this.cacheManager.get(cacheKey);
            const endGet = process.hrtime.bigint();
            this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);
            if (cached) {
                this.logCache('hit', cacheKey);
                this.monitoring.recordCacheHit(cacheKey);
                return cached;
            }
        }
        catch (error) {
            console.error('缓存获取失败:', error);
        }
        this.logCache('miss', cacheKey);
        this.monitoring.recordCacheMiss(cacheKey);
        const startDb = process.hrtime.bigint();
        const product = await this.productRepository.findOne({
            where: { id },
            relations: { category: true, images: true },
        });
        const endDb = process.hrtime.bigint();
        this.monitoring.observeDbQuery('detail', 'products', Number(endDb - startDb) / 1_000_000_000);
        if (product) {
            const ttl = this.cacheTtlMs('performance.cache.ttl.detail', 300);
            try {
                const startSet = process.hrtime.bigint();
                await this.cacheManager.set(cacheKey, product, ttl);
                const endSet = process.hrtime.bigint();
                this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
            }
            catch (error) {
                console.error('缓存设置失败:', error);
            }
        }
        return product;
    }
    async search(options) {
        const { keyword, categoryId, minPrice, maxPrice, tags, inStock, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC', } = options;
        if (!keyword) {
            return this.databaseSearch(options);
        }
        try {
            const searchOptions = {
                filters: {
                    categoryId,
                    minPrice,
                    maxPrice,
                    tags,
                    inStock,
                    isActive: true,
                },
                sortBy: sortBy === 'sales' ? undefined : sortBy,
                sortOrder: sortOrder.toLowerCase(),
                page,
                limit,
            };
            try {
                searchOptions.queryVector = await this.embeddingService.embedOne(keyword);
            }
            catch (e) {
            }
            const searchResult = await this.searchManager.search(keyword, searchOptions);
            const productIds = searchResult.hits.map(hit => parseInt(hit.id));
            if (productIds.length === 0) {
                return { products: [], total: 0 };
            }
            const products = await this.productRepository.find({
                where: { id: (0, typeorm_2.In)(productIds), isActive: true },
                relations: { category: true, images: true },
            });
            const productMap = new Map(products.map(p => [p.id, p]));
            const sortedProducts = productIds.map(id => productMap.get(id)).filter(Boolean);
            return {
                products: sortedProducts,
                total: searchResult.total,
            };
        }
        catch (error) {
            console.warn('搜索引擎搜索失败，回退到数据库搜索:', error);
            return this.databaseSearch(options);
        }
    }
    async databaseSearch(options) {
        const { keyword, categoryId, minPrice, maxPrice, tags, inStock, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC', } = options;
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
            const dbType = (this.configService.get('master.database.type') || 'better-sqlite3').toLowerCase();
            const isMysqlFamily = dbType === 'mysql' || dbType === 'tidb';
            tags.forEach((tag, index) => {
                if (isMysqlFamily) {
                    query.andWhere(`FIND_IN_SET(:tag${index}, product.tags)`, { [`tag${index}`]: tag });
                }
                else {
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
    async getPopularProducts(limit = 10) {
        const keyPrefix = this.configService.get('redis.keyPrefix') || 'caddy_shopping';
        const cacheKey = `${keyPrefix}:popular:products:${limit}`;
        const startGet = process.hrtime.bigint();
        const cached = await this.cacheManager.get(cacheKey);
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
            relations: { category: true, images: true },
        });
        const endDb = process.hrtime.bigint();
        this.monitoring.observeDbQuery('aggregation', 'products', Number(endDb - startDb) / 1_000_000_000);
        const ttl = this.cacheTtlMs('performance.cache.ttl.popular', 600);
        const startSet = process.hrtime.bigint();
        await this.cacheManager.set(cacheKey, products, ttl);
        const endSet = process.hrtime.bigint();
        this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
        this.popularCacheKeys.add(cacheKey);
        return products;
    }
    async update(id, updateData) {
        const product = await this.findById(id);
        if (!product) {
            throw new common_1.NotFoundException();
        }
        if (updateData.categoryId) {
            const category = await this.categoryRepository.findOne({
                where: { id: updateData.categoryId },
            });
            if (!category) {
                throw new common_1.NotFoundException();
            }
            const { categoryId, ...restData } = updateData;
            updateData = { ...restData, category };
        }
        if (updateData.price === null) {
            throw new common_1.BadRequestException({
                message: 'price 不能为 null（要改价请提交正数；不修改则不传该字段）',
                details: { field: 'price', submitted: null },
            });
        }
        const priceView = (0, product_merge_helper_1.mergePriceView)(updateData, product);
        if (priceView.invalidPrice || priceView.invalidOriginalPrice) {
            const field = priceView.invalidPrice ? 'price' : 'originalPrice';
            throw new common_1.BadRequestException({
                message: `${field} 必须是数字（收到无法归一的形状：${JSON.stringify(field === 'price' ? updateData.price : updateData.originalPrice)}）`,
                details: { field, submitted: field === 'price' ? updateData.price : updateData.originalPrice },
            });
        }
        if (priceView.price !== null &&
            priceView.originalPrice !== null &&
            priceView.originalPrice < priceView.price) {
            throw new common_1.BadRequestException({
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
        if (Object.prototype.hasOwnProperty.call(updateData, 'specifications')) {
            updateData = {
                ...updateData,
                specifications: (0, product_merge_helper_1.mergeSpecifications)(updateData.specifications, product.specifications),
            };
            this.assertSpecificationsWithinLimit(updateData.specifications);
        }
        const updateDataForEvent = updateData;
        const priceWritten = priceView.priceSubmitted;
        const originalPriceWritten = priceView.originalPriceSubmitted;
        await (0, db_write_mutex_1.runExclusiveWrite)(async () => {
            if (priceWritten || originalPriceWritten) {
                const qb = this.productRepository.createQueryBuilder().update(product_entity_1.Product);
                if (priceWritten && originalPriceWritten) {
                    qb.set({ price: priceView.price, originalPrice: priceView.originalPrice })
                        .where('id = :id AND (:pairOriginalPrice IS NULL OR :pairPrice IS NULL OR :pairOriginalPrice >= :pairPrice)', {
                        id,
                        pairOriginalPrice: priceView.originalPrice,
                        pairPrice: priceView.price,
                    });
                }
                else if (priceWritten && priceView.originalPriceExplicitNull) {
                    qb.set({ price: priceView.price, originalPrice: null }).where('id = :id', { id });
                }
                else if (priceWritten) {
                    qb.set({ price: priceView.price })
                        .where('id = :id AND (originalPrice IS NULL OR originalPrice >= :guardPrice)', {
                        id,
                        guardPrice: priceView.price,
                    });
                }
                else {
                    qb.set({ originalPrice: priceView.originalPrice })
                        .where('id = :id AND (price IS NULL OR price <= :guardOriginalPrice)', {
                        id,
                        guardOriginalPrice: priceView.originalPrice,
                    });
                }
                const result = await qb.execute();
                if (!result || !result.affected) {
                    const current = await this.productRepository.findOne({ where: { id } });
                    if (!current) {
                        throw new common_1.NotFoundException();
                    }
                    const currentView = (0, product_merge_helper_1.mergePriceView)({}, current);
                    throw new common_1.ConflictException({
                        message: '价格不变式并发冲突：另一并发写已先行落库，本次提交按最新库值复检不再合法（条件 UPDATE affected=0）',
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
                const rest = { ...updateData };
                if (priceWritten)
                    delete rest.price;
                if (originalPriceWritten || (priceWritten && priceView.originalPriceExplicitNull)) {
                    delete rest.originalPrice;
                }
                updateData = rest;
            }
            if (Object.keys(updateData).length > 0) {
                await this.productRepository.update(id, updateData);
            }
        });
        const oldProduct = product;
        const keyPrefix = this.configService.get('redis.keyPrefix') || 'caddy_shopping';
        try {
            await this.cacheManager.del(`${keyPrefix}:product:${id}`);
        }
        catch (e) { }
        for (const key of this.popularCacheKeys) {
            try {
                await this.cacheManager.del(key);
            }
            catch (e) { }
        }
        await this.invalidateListCache();
        const updatedProduct = await this.findById(id);
        if (oldProduct && updatedProduct) {
            this.publishProductUpdatedEvent(oldProduct, updatedProduct, updateDataForEvent).catch(error => {
                console.error('发布产品更新事件失败:', error);
            });
        }
        if (updatedProduct) {
            this.indexProductToSearch(updatedProduct).catch((error) => {
                console.error('产品搜索索引更新失败:', error);
            });
        }
        return updatedProduct;
    }
    async delete(id) {
        const product = await this.findById(id);
        if (!product) {
            throw new common_1.NotFoundException();
        }
        await this.productRepository.update(id, { isActive: false });
        const keyPrefix = this.configService.get('redis.keyPrefix') || 'caddy_shopping';
        try {
            await this.cacheManager.del(`${keyPrefix}:product:${id}`);
        }
        catch (e) { }
        for (const key of this.popularCacheKeys) {
            try {
                await this.cacheManager.del(key);
            }
            catch (e) { }
        }
        await this.invalidateListCache();
        this.deleteProductFromSearch(id).catch((error) => {
            console.error('产品搜索索引删除失败:', error);
        });
    }
    async incrementViews(id) {
        await this.productRepository.increment({ id }, 'views', 1);
        this.publishProductViewedEvent(id).catch(error => {
            console.error('发布产品浏览事件失败:', error);
        });
    }
    async getStatistics() {
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
    async findAll(options = {}) {
        const { page = 1, limit = 20, search, includeInactive = false } = options;
        const keyPrefix = this.configService.get('redis.keyPrefix') || 'caddy_shopping';
        const cacheKey = `${keyPrefix}:products:list:${includeInactive ? 'admin:' : ''}${page}:${limit}:${search || ''}`;
        const startGet = process.hrtime.bigint();
        const cached = await this.cacheManager.get(cacheKey);
        const endGet = process.hrtime.bigint();
        this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);
        if (cached) {
            this.logCache('hit', cacheKey);
            this.monitoring.recordCacheHit(cacheKey);
            return cached;
        }
        this.logCache('miss', cacheKey);
        this.monitoring.recordCacheMiss(cacheKey);
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
            }
            else {
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
        const ttl = this.cacheTtlMs('performance.cache.ttl.list', 30);
        const startSet = process.hrtime.bigint();
        await this.cacheManager.set(cacheKey, result, ttl);
        const endSet = process.hrtime.bigint();
        this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
        this.listCacheKeys.add(cacheKey);
        return result;
    }
    async findPopular(limit = 10) {
        return this.getPopularProducts(limit);
    }
    async findOne(id) {
        const product = await this.findById(id);
        if (!product || !product.isActive) {
            throw new common_1.NotFoundException();
        }
        return product;
    }
    async remove(id) {
        return this.delete(id);
    }
    async recordView(id) {
        return this.incrementViews(id);
    }
    async publishProductCreatedEvent(product) {
        const event = {
            productId: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            timestamp: new Date().toISOString(),
        };
        await this.productEventsService.publishProductCreated(event);
    }
    async publishProductUpdatedEvent(oldProduct, newProduct, updateData) {
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
    async publishProductViewedEvent(productId) {
        const event = {
            productId: productId,
            timestamp: new Date().toISOString(),
        };
        await this.productEventsService.publishProductViewed(event);
    }
    async publishInventoryUpdatedEvent(productId, oldStock, newStock, change, reason) {
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
    async indexProductToSearch(product) {
        try {
            const indexData = {
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
            try {
                indexData.embedding = await this.embeddingService.embedOne(`${product.name} ${product.description || ''}`);
            }
            catch (e) { }
            await this.searchManager.indexProduct(indexData);
        }
        catch (error) {
            console.error('产品搜索索引失败:', error);
        }
    }
    async deleteProductFromSearch(productId) {
        try {
            await this.searchManager.deleteProduct(productId.toString());
        }
        catch (error) {
            console.error('产品搜索索引删除失败:', error);
        }
    }
    async findByCategory(category, limit = 10) {
        const keyPrefix = this.configService.get('redis.keyPrefix') || 'caddy_shopping';
        const cacheKey = `${keyPrefix}:products:category:${category}:${limit}`;
        const startGet = process.hrtime.bigint();
        const cached = await this.cacheManager.get(cacheKey);
        const endGet = process.hrtime.bigint();
        this.monitoring.observeRedisDuration('get', Number(endGet - startGet) / 1_000_000_000);
        if (cached) {
            this.logCache('hit', cacheKey);
            this.monitoring.recordCacheHit(cacheKey);
            return cached;
        }
        this.logCache('miss', cacheKey);
        this.monitoring.recordCacheMiss(cacheKey);
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
        const ttl = this.cacheTtlMs('performance.cache.ttl.list', 30);
        const startSet = process.hrtime.bigint();
        await this.cacheManager.set(cacheKey, products, ttl);
        const endSet = process.hrtime.bigint();
        this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
        this.listCacheKeys.add(cacheKey);
        return products;
    }
    async getCategories() {
        const keyPrefix = this.configService.get('redis.keyPrefix') || 'caddy_shopping';
        const cacheKey = `${keyPrefix}:categories:all`;
        const startGet = process.hrtime.bigint();
        const cached = await this.cacheManager.get(cacheKey);
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
        const categories = await this.categoryRepository.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC', name: 'ASC' },
            relations: { products: true },
        });
        const endDb = process.hrtime.bigint();
        this.monitoring.observeDbQuery('list', 'categories', Number(endDb - startDb) / 1_000_000_000);
        const ttl = this.cacheTtlMs('performance.cache.ttl.list', 30) * 2;
        const startSet = process.hrtime.bigint();
        await this.cacheManager.set(cacheKey, categories, ttl);
        const endSet = process.hrtime.bigint();
        this.monitoring.observeRedisDuration('set', Number(endSet - startSet) / 1_000_000_000);
        return categories;
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __param(2, (0, typeorm_1.InjectRepository)(product_image_entity_1.ProductImage)),
    __param(3, (0, common_2.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, config_1.ConfigService,
        monitoring_service_1.MonitoringService,
        product_events_service_1.ProductEventsService,
        search_manager_service_1.SearchManagerService,
        embedding_service_1.EmbeddingService])
], ProductsService);
