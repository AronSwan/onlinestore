"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const config_1 = require("@nestjs/config");
const search_suggestion_service_1 = require("./search-suggestion.service");
const search_manager_service_1 = require("./search-manager.service");
const products_service_1 = require("../products.service");
const cache_service_1 = require("../../cache/cache.service");
const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
};
const mockSearchManager = {
    search: jest.fn(),
};
const mockProductsService = {
    getCategories: jest.fn(),
    findPopular: jest.fn(),
};
const mockConfigService = {
    get: jest.fn((key) => {
        if (key === 'search.suggestions.cacheTTL')
            return 300;
        return null;
    }),
};
describe('SearchSuggestionService (R3 isActive 回流防线)', () => {
    let service;
    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await testing_1.Test.createTestingModule({
            providers: [
                search_suggestion_service_1.SearchSuggestionService,
                { provide: config_1.ConfigService, useValue: mockConfigService },
                { provide: cache_service_1.CacheService, useValue: mockCacheService },
                { provide: search_manager_service_1.SearchManagerService, useValue: mockSearchManager },
                { provide: products_service_1.ProductsService, useValue: mockProductsService },
            ],
        }).compile();
        service = module.get(search_suggestion_service_1.SearchSuggestionService);
        mockCacheService.get.mockResolvedValue(null);
        mockCacheService.set.mockResolvedValue(undefined);
        mockProductsService.getCategories.mockResolvedValue([]);
        mockProductsService.findPopular.mockResolvedValue([]);
    });
    it('passes isActive=true filter to the search engine for product suggestions', async () => {
        mockSearchManager.search.mockResolvedValue({
            hits: [
                { id: '1', name: '云朵枕头包', category: '手袋', score: 10 },
            ],
            total: 1,
            processingTimeMs: 1,
            query: '云朵',
        });
        const result = await service.getSuggestions('云朵', { includeCategories: false, includePopular: false });
        expect(mockSearchManager.search).toHaveBeenCalledWith('云朵', expect.objectContaining({
            filters: { isActive: true },
        }));
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('云朵枕头包');
    });
    it('yields no suggestions for engine hits when the engine path returns none', async () => {
        mockSearchManager.search.mockResolvedValue({ hits: [], total: 0 });
        const result = await service.getSuggestions('云朵', { includeCategories: false, includePopular: false });
        expect(result).toEqual([]);
        expect(mockSearchManager.search).toHaveBeenCalledWith('云朵', expect.objectContaining({ filters: { isActive: true } }));
    });
    it('returns empty array without hitting the engine when query is too short', async () => {
        const result = await service.getSuggestions('云');
        expect(result).toEqual([]);
        expect(mockSearchManager.search).not.toHaveBeenCalled();
    });
});
