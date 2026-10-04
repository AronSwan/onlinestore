// 用途：搜索建议服务单元测试（R3 反查 P2-2 回归）
// 依赖文件：search-suggestion.service.ts
// 时间：2026-10-04
//
// 核心断言：getSuggestions 走引擎在线路径时必须把 isActive:true 过滤下推给引擎——
// suggestions 直接消费引擎 hits 不回填 DB，下架品不得以"搜索建议"形态回流。

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SearchSuggestionService } from './search-suggestion.service';
import { SearchManagerService } from './search-manager.service';
import { ProductsService } from '../products.service';
import { CacheService } from '../../cache/cache.service';

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
  get: jest.fn((key: string) => {
    if (key === 'search.suggestions.cacheTTL') return 300;
    return null;
  }),
};

describe('SearchSuggestionService (R3 isActive 回流防线)', () => {
  let service: SearchSuggestionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchSuggestionService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: SearchManagerService, useValue: mockSearchManager },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<SearchSuggestionService>(SearchSuggestionService);

    // 全链路缓存 miss，逼出引擎在线路径
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockProductsService.getCategories.mockResolvedValue([]);
    mockProductsService.findPopular.mockResolvedValue([]);
  });

  it('passes isActive=true filter to the search engine for product suggestions', async () => {
    // 引擎侧按 filter 生效后的返回：只含在售品的 hit（下架品已被引擎过滤）
    mockSearchManager.search.mockResolvedValue({
      hits: [
        { id: '1', name: '云朵枕头包', category: '手袋', score: 10 },
      ],
      total: 1,
      processingTimeMs: 1,
      query: '云朵',
    });

    const result = await service.getSuggestions('云朵', { includeCategories: false, includePopular: false });

    expect(mockSearchManager.search).toHaveBeenCalledWith(
      '云朵',
      expect.objectContaining({
        filters: { isActive: true },
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('云朵枕头包');
  });

  it('yields no suggestions for engine hits when the engine path returns none', async () => {
    mockSearchManager.search.mockResolvedValue({ hits: [], total: 0 });

    const result = await service.getSuggestions('云朵', { includeCategories: false, includePopular: false });

    expect(result).toEqual([]);
    expect(mockSearchManager.search).toHaveBeenCalledWith(
      '云朵',
      expect.objectContaining({ filters: { isActive: true } }),
    );
  });

  it('returns empty array without hitting the engine when query is too short', async () => {
    const result = await service.getSuggestions('云');

    expect(result).toEqual([]);
    expect(mockSearchManager.search).not.toHaveBeenCalled();
  });
});
