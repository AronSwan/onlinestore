"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsController = void 0;
exports.detectImageExt = detectImageExt;
exports.isImageStructurallyComplete = isImageStructurallyComplete;
exports.resolveUploadDir = resolveUploadDir;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const swagger_1 = require("@nestjs/swagger");
const products_service_1 = require("./products.service");
const search_manager_service_1 = require("./search/search-manager.service");
const search_suggestion_service_1 = require("./search/search-suggestion.service");
const popular_search_service_1 = require("./search/popular-search.service");
const create_product_dto_1 = require("./dto/create-product.dto");
const update_product_dto_1 = require("./dto/update-product.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/enums/role.enum");
const route_label_interceptor_1 = require("../monitoring/route-label.interceptor");
const audit_service_1 = require("../common/audit/audit.service");
const api_docs_decorator_1 = require("../common/decorators/api-docs.decorator");
const product_entity_1 = require("./entities/product.entity");
const product_integrity_gate_1 = require("./product-integrity.gate");
const product_merge_helper_1 = require("./product-merge.helper");
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_EXT_WHITELIST = ['.jpg', '.jpeg', '.png', '.webp'];
function detectImageExt(buffer) {
    if (!buffer || buffer.length < 12)
        return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
        return '.jpg';
    if (buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a) {
        return '.png';
    }
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        return '.webp';
    }
    return null;
}
function isImageStructurallyComplete(buffer, ext) {
    if (!buffer || buffer.length < 12)
        return false;
    if (ext === '.jpg') {
        const tail = buffer.subarray(buffer.length - 4);
        for (let i = 0; i + 1 < tail.length; i++) {
            if (tail[i] === 0xff && tail[i + 1] === 0xd9)
                return true;
        }
        return false;
    }
    if (ext === '.png') {
        return buffer.toString('ascii', buffer.length - 12).includes('IEND');
    }
    const declaredSize = buffer.readUInt32LE(4);
    return declaredSize === buffer.length - 8;
}
function resolveUploadDir() {
    const backendRoot = path.resolve(__dirname, __dirname.split(path.sep).includes('dist') ? '../../..' : '../..');
    return path.resolve(backendRoot, '..', 'images', 'products');
}
let ProductsController = class ProductsController {
    constructor(productsService, searchManagerService, searchSuggestionService, popularSearchService, auditService) {
        this.productsService = productsService;
        this.searchManagerService = searchManagerService;
        this.searchSuggestionService = searchSuggestionService;
        this.popularSearchService = popularSearchService;
        this.auditService = auditService;
    }
    async auditProductWrite(req, actionLabel, productId, newValues) {
        try {
            await this.auditService.log(audit_service_1.AuditAction.ADMIN_PRODUCT_MANAGE, audit_service_1.AuditResult.SUCCESS, {
                userId: req?.user?.sub != null ? String(req.user.sub) : undefined,
                userEmail: req?.user?.email,
                userRole: req?.user?.role,
                httpMethod: req?.method,
                endpoint: req ? `${req.method} ${req.originalUrl || req.url || ''}` : undefined,
                resourceType: 'products',
                resourceId: String(productId),
            }, `商品${actionLabel}: productId=${productId}`, audit_service_1.AuditSeverity.LOW, undefined, newValues);
        }
        catch (error) {
            console.warn('商品审计日志写入失败:', error.message);
        }
    }
    async create(createProductDto, req) {
        await (0, product_integrity_gate_1.enforceProductIntegrityGate)(createProductDto);
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
    async uploadImage(file) {
        if (!file || !file.buffer || file.buffer.length === 0) {
            throw new common_1.BadRequestException('未接收到上传文件');
        }
        if (file.size > UPLOAD_MAX_BYTES) {
            throw new common_1.PayloadTooLargeException('图片大小超过 5MB 上限');
        }
        const clientExt = path.extname(file.originalname || '').toLowerCase();
        if (!UPLOAD_EXT_WHITELIST.includes(clientExt)) {
            throw new common_1.BadRequestException('不支持的图片扩展名（仅 .jpg/.jpeg/.png/.webp）');
        }
        const detectedExt = detectImageExt(file.buffer);
        if (!detectedExt) {
            throw new common_1.BadRequestException('文件内容不是有效的 jpeg/png/webp 图片');
        }
        if (!isImageStructurallyComplete(file.buffer, detectedExt)) {
            throw new common_1.BadRequestException('文件结构不完整');
        }
        const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${detectedExt}`;
        const uploadDir = resolveUploadDir();
        fs.mkdirSync(uploadDir, { recursive: true });
        const target = path.resolve(uploadDir, filename);
        if (!target.startsWith(uploadDir + path.sep)) {
            throw new common_1.BadRequestException('非法文件名');
        }
        fs.writeFileSync(target, file.buffer);
        return { path: `/images/products/${filename}` };
    }
    findAll(page, limit, q) {
        return this.productsService.findAll({
            page,
            limit,
            search: q,
        });
    }
    async searchProducts(query) {
        if (!query.q || !String(query.q).trim()) {
            throw new common_1.BadRequestException('搜索关键词 q 必填');
        }
        const { q, page = 1, limit = 20, category, minPrice, maxPrice, inStock, tags } = query;
        const searchOptions = {
            keyword: q,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            categoryId: category ? parseInt(category, 10) : undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            inStock: inStock === 'true',
            tags: tags ? String(tags).split(',').map(t => t.trim()).filter(Boolean) : undefined,
        };
        return this.productsService.search(searchOptions);
    }
    async getSearchSuggestions(query) {
        const { q, limit = 10 } = query;
        return await this.searchSuggestionService.getSuggestions(q, limit);
    }
    async getPopularSearches(query) {
        const { limit = 10, includeTrends = false, timeRange = 'week', category } = query;
        return await this.popularSearchService.getPopularSearches({
            limit: parseInt(limit, 10),
            includeTrends: includeTrends === 'true',
            timeRange,
            category,
        });
    }
    findPopular(limit) {
        return this.productsService.findPopular(limit);
    }
    findAllAdmin(page, limit, q) {
        return this.productsService.findAll({
            page,
            limit,
            search: q,
            includeInactive: true,
        });
    }
    async findOne(id) {
        return this.productsService.findOne(id);
    }
    async update(id, updateProductDto, req) {
        const existing = await this.productsService.findById(id).catch(() => null);
        const gateView = {
            ...updateProductDto,
            name: updateProductDto.name ?? existing?.name,
            description: updateProductDto.description ?? existing?.description,
            specifications: Object.prototype.hasOwnProperty.call(updateProductDto, 'specifications')
                ? (0, product_merge_helper_1.mergeSpecifications)(updateProductDto.specifications, existing?.specifications)
                : (existing?.specifications ?? {}),
            tags: updateProductDto.tags ?? undefined,
        };
        await (0, product_integrity_gate_1.enforceProductIntegrityGate)(gateView);
        const updated = await this.productsService.update(id, updateProductDto);
        await this.auditProductWrite(req, '更新', id, { id, changes: updateProductDto });
        return updated;
    }
    async remove(id, req) {
        await this.productsService.remove(id);
        await this.auditProductWrite(req, '删除', id, { id, isActive: false });
    }
    recordView(id) {
        return this.productsService.recordView(id);
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, api_docs_decorator_1.ApiCreateResource)(product_entity_1.Product, create_product_dto_1.CreateProductDto, '创建产品'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_product_dto_1.CreateProductDto, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: UPLOAD_MAX_BYTES } })),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Get)(),
    (0, api_docs_decorator_1.ApiPaginatedQuery)(product_entity_1.Product, '获取产品列表', '分页获取产品列表，支持搜索和排序'),
    (0, swagger_1.ApiQuery)({ name: 'q', required: false, description: '搜索关键词（旧参数名 search 已弃用——值被忽略不参与过滤）', example: 'iPhone' }),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, api_docs_decorator_1.ApiDocs)({
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
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "searchProducts", null);
__decorate([
    (0, common_1.Get)('suggestions'),
    (0, api_docs_decorator_1.ApiDocs)({
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
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getSearchSuggestions", null);
__decorate([
    (0, common_1.Get)('popular-searches'),
    (0, api_docs_decorator_1.ApiDocs)({
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
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getPopularSearches", null);
__decorate([
    (0, common_1.Get)('popular'),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '获取热门产品',
        description: '根据浏览量、销量等指标获取热门产品列表',
        responses: {
            success: {
                type: product_entity_1.Product,
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
    }),
    __param(0, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "findPopular", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '获取全部产品（含下架）',
        description: '管理员查看全部产品列表，不按 isActive 过滤',
        auth: true,
    }),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "findAllAdmin", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, api_docs_decorator_1.ApiGetResource)(product_entity_1.Product, '获取产品详情'),
    (0, api_docs_decorator_1.ApiDocs)({
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
                type: product_entity_1.Product,
                description: '获取产品详情成功',
            },
            notFound: '产品不存在',
        },
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, api_docs_decorator_1.ApiUpdateResource)(product_entity_1.Product, update_product_dto_1.UpdateProductDto, '更新产品信息'),
    (0, api_docs_decorator_1.ApiDocs)({
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
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_product_dto_1.UpdateProductDto, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, api_docs_decorator_1.ApiDeleteResource)('删除产品'),
    (0, api_docs_decorator_1.ApiDocs)({
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
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/view'),
    (0, api_docs_decorator_1.ApiDocs)({
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
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "recordView", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)('产品管理'),
    (0, common_1.Controller)('products'),
    (0, common_1.UseInterceptors)(route_label_interceptor_1.RouteLabelInterceptor),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => search_manager_service_1.SearchManagerService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => search_suggestion_service_1.SearchSuggestionService))),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => popular_search_service_1.PopularSearchService))),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        search_manager_service_1.SearchManagerService,
        search_suggestion_service_1.SearchSuggestionService,
        popular_search_service_1.PopularSearchService,
        audit_service_1.AuditService])
], ProductsController);
