import { ProductsService } from './products.service';
import { SearchManagerService } from './search/search-manager.service';
import { SearchSuggestionService } from './search/search-suggestion.service';
import { PopularSearchService } from './search/popular-search.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuditService } from '../common/audit/audit.service';
import { Product } from './entities/product.entity';
interface UploadedImageFile {
    originalname: string;
    buffer: Buffer;
    size: number;
    mimetype?: string;
}
export declare function detectImageExt(buffer: Buffer): '.jpg' | '.png' | '.webp' | null;
export declare function isImageStructurallyComplete(buffer: Buffer, ext: '.jpg' | '.png' | '.webp'): boolean;
export declare function resolveUploadDir(): string;
export declare class ProductsController {
    private readonly productsService;
    private readonly searchManagerService;
    private readonly searchSuggestionService;
    private readonly popularSearchService;
    private readonly auditService;
    constructor(productsService: ProductsService, searchManagerService: SearchManagerService, searchSuggestionService: SearchSuggestionService, popularSearchService: PopularSearchService, auditService: AuditService);
    private auditProductWrite;
    create(createProductDto: CreateProductDto, req?: Record<string, unknown>): Promise<Product>;
    uploadImage(file?: UploadedImageFile): Promise<{
        path: string;
    }>;
    findAll(page: number, limit: number, q?: string): Promise<{
        products: Product[];
        total: number;
    }>;
    searchProducts(query: Record<string, any>): Promise<{
        products: Product[];
        total: number;
    }>;
    getSearchSuggestions(query: Record<string, any>): Promise<import("./search/search-suggestion.service").SearchSuggestion[]>;
    getPopularSearches(query: Record<string, any>): Promise<import("./search/popular-search.service").PopularSearchTerm[]>;
    findPopular(limit: number): Promise<Product[]>;
    findAllAdmin(page: number, limit: number, q?: string): Promise<{
        products: Product[];
        total: number;
    }>;
    findOne(id: number): Promise<Product>;
    update(id: number, updateProductDto: UpdateProductDto, req?: Record<string, unknown>): Promise<Product>;
    remove(id: number, req?: Record<string, unknown>): Promise<void>;
    recordView(id: number): Promise<void>;
}
export {};
