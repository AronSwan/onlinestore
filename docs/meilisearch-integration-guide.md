# MeiliSearch 前端集成指南

## 概述

MeiliSearch 是一个强大的搜索引擎，可以为前端应用提供快速、准确的搜索体验。本指南详细介绍如何将 MeiliSearch 集成到前端项目中。

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装 MeiliSearch 客户端
npm install @meilisearch/browser

# 或者使用 yarn
yarn add @meilisearch/browser
```

### 2. 基本配置

```javascript
import { MeiliSearch } from '@meilisearch/browser';

const client = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'masterKey'
});

const index = client.index('products');
```

## 📁 项目结构

```
js/product-search/
├── meilisearch-client.js      # MeiliSearch 客户端封装
├── search-component.js        # 搜索组件
└── index.js                   # 统一导出

enhanced-search-demo.html      # 演示页面
docs/
└── meilisearch-integration-guide.md  # 本文档
```

## 🔧 核心功能

### 1. 基本搜索

```javascript
// 简单搜索
const result = await index.search('iPhone', {
  limit: 10,
  attributesToRetrieve: ['id', 'name', 'price', 'image']
});

// 格式化结果
const formatted = result.hits.map(hit => ({
  id: hit.id,
  name: hit.name,
  price: hit.price,
  image: hit.image
}));
```

### 2. 高级搜索

```javascript
// 带过滤的搜索
const filteredResult = await index.search('phone', {
  filter: 'category = "手机" AND price < 5000',
  sort: ['price:asc'],
  limit: 20
});

// 多条件过滤
const complexFilter = await index.search('', {
  filter: `category IN ["手机", "平板"] AND price >= 1000 AND price <= 10000`,
  facets: ['category', 'price_range']
});
```

### 3. 搜索建议

```javascript
// 获取搜索建议
const suggestions = await index.search('iph', {
  limit: 5,
  attributesToRetrieve: ['name'],
  sort: ['frequency:desc']
});

// 实时搜索（防抖）
const debouncedSearch = debounce(async (query) => {
  const result = await index.search(query, { limit: 10 });
  updateSearchResults(result);
}, 300);
```

### 4. 分页功能

```javascript
// 分页搜索
async function searchWithPagination(query, page = 1, pageSize = 12) {
  const offset = (page - 1) * pageSize;
  const result = await index.search(query, {
    limit: pageSize,
    offset: offset
  });

  return {
    ...result,
    pagination: {
      currentPage: page,
      pageSize: pageSize,
      totalPages: Math.ceil(result.totalHits / pageSize)
    }
  };
}
```

## 🎨 搜索组件使用

### 1. 基本使用

```javascript
import { initSearchComponent } from './js/product-search/search-component.js';

// 初始化搜索组件
const searchComponent = initSearchComponent('search-container');
```

### 2. 自定义配置

```javascript
class CustomSearchComponent extends SearchComponent {
  constructor(containerId, options = {}) {
    super(containerId);
    this.pageSize = options.pageSize || 12;
    this.showFilters = options.showFilters !== false;
  }

  // 自定义渲染
  render() {
    // 自定义渲染逻辑
  }

  // 自定义事件处理
  handleSearch() {
    // 自定义搜索逻辑
  }
}
```

### 3. 事件监听

```javascript
// 监听搜索事件
searchComponent.on('search', (query, results) => {
  console.log('用户搜索:', query);
  console.log('搜索结果:', results);
});

// 监听选择事件
searchComponent.on('product-select', (product) => {
  console.log('用户选择了商品:', product);
  // 跳转到商品详情页
  window.location.href = `/products/${product.id}`;
});
```

## 🔍 搜索功能特性

### 1. 实时搜索

- **防抖处理**：300ms 防抖延迟，避免频繁请求
- **即时响应**：输入时即可看到搜索结果
- **性能优化**：缓存搜索结果，减少重复请求

### 2. 智能建议

- **自动完成**：基于用户输入提供搜索建议
- **热门推荐**：显示热门搜索关键词
- **历史记录**：保存用户搜索历史

### 3. 多维筛选

- **分类筛选**：按商品分类筛选
- **价格筛选**：价格范围筛选
- **属性筛选**：按商品属性筛选

### 4. 排序功能

- **相关度排序**：按搜索相关度排序
- **价格排序**：价格从高到低/从低到高
- **名称排序**：按名称 A-Z/Z-A 排序

### 5. 分页导航

- **智能分页**：显示当前页附近的页码
- **快速跳转**：支持页码快速跳转
- **加载优化**：懒加载分页内容

## 🎨 UI/UX 设计

### 1. 搜索框设计

```css
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 25px;
  padding: 0 15px;
  transition: border-color 0.3s;
}

.search-input-wrapper:focus-within {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 12px 0;
  font-size: 16px;
  background: transparent;
}
```

### 2. 搜索结果样式

```css
.product-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
```

### 3. 响应式设计

```css
@media (max-width: 768px) {
  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
  }
  
  .search-input-wrapper {
    border-radius: 20px;
  }
}
```

## 📊 性能优化

### 1. 搜索缓存

```javascript
// 搜索结果缓存
class SearchCache {
  constructor(ttl = 5 * 60 * 1000) { // 5分钟缓存
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value: value,
      timestamp: Date.now()
    });
  }
}
```

### 2. 请求优化

- **防抖处理**：减少搜索请求频率
- **节流处理**：限制搜索请求频率
- **批量请求**：合并多个搜索请求

### 3. 数据优化

- **字段选择**：只返回必要的字段
- **分页加载**：按需加载数据
- **图片懒加载**：延迟加载商品图片

## 🔒 安全考虑

### 1. 输入验证

```javascript
function validateSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return false;
  }
  
  // 防止 SQL 注入
  const sqlInjectionPattern = /('|"|--|\/\*|\*\/|;|\/\\)/;
  if (sqlInjectionPattern.test(query)) {
    return false;
  }
  
  // 限制长度
  if (query.length > 100) {
    return false;
  }
  
  return true;
}
```

### 2. 错误处理

```javascript
async function safeSearch(query) {
  try {
    if (!validateSearchQuery(query)) {
      throw new Error('Invalid search query');
    }
    
    const result = await index.search(query);
    return result;
  } catch (error) {
    console.error('Search error:', error);
    // 返回空结果或错误页面
    return { hits: [], totalHits: 0 };
  }
}
```

## 🚀 部署指南

### 1. 生产环境配置

```javascript
// 生产环境配置
const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'https://your-meilisearch-domain.com',
  apiKey: process.env.MEILISEARCH_API_KEY,
  timeout: 5000, // 5秒超时
  requestConfig: {
    headers: {
      'X-Environment': 'production'
    }
  }
});
```

### 2. 监控和日志

```javascript
// 搜索监控
const monitorSearch = async (query, results, duration) => {
  // 发送监控数据
  await fetch('/api/analytics/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      resultCount: results.hits.length,
      duration,
      timestamp: new Date().toISOString()
    })
  });
};

// 使用示例
const startTime = Date.now();
const result = await index.search(query);
const duration = Date.now() - startTime;
monitorSearch(query, result, duration);
```

## 🛠️ 故障排除

### 1. 常见问题

**问题**：搜索结果为空
**解决**：
- 检查 MeiliSearch 服务是否运行
- 验证索引是否正确创建
- 确认数据是否已正确索引

**问题**：搜索响应慢
**解决**：
- 检查网络连接
- 优化搜索查询参数
- 增加缓存机制

### 2. 调试工具

```javascript
// 启用调试模式
const client = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'masterKey',
  requestConfig: {
    headers: {
      'X-Debug': 'true'
    }
  }
});

// 查看搜索详情
const result = await index.search('test', {
  debug: true
});
console.log('Debug info:', result.debug);
```

## 📈 扩展功能

### 1. 语音搜索

```javascript
// 集成语音搜索
class VoiceSearch {
  constructor(searchComponent) {
    this.searchComponent = searchComponent;
    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    this.setupRecognition();
  }

  setupRecognition() {
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.searchComponent.searchInput.value = transcript;
      this.searchComponent.performSearch(transcript);
    };
  }

  start() {
    this.recognition.start();
  }
}
```

### 2. 图片搜索

```javascript
// 图片搜索功能
class ImageSearch {
  constructor(searchComponent) {
    this.searchComponent = searchComponent;
    this.setupImageUpload();
  }

  setupImageUpload() {
    const uploadArea = document.createElement('div');
    uploadArea.className = 'image-upload-area';
    uploadArea.innerHTML = `
      <input type="file" accept="image/*" class="image-upload-input">
      <div class="upload-placeholder">
        <svg>...</svg>
        <p>上传图片搜索</p>
      </div>
    `;
    
    uploadArea.querySelector('.image-upload-input').addEventListener('change', (e) => {
      this.handleImageUpload(e.target.files[0]);
    });
    
    this.searchComponent.container.appendChild(uploadArea);
  }

  async handleImageUpload(file) {
    // 上传图片到后端进行识别
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/image-search', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    this.searchComponent.searchInput.value = result.query;
    this.searchComponent.performSearch(result.query);
  }
}
```

### 3. 个性化推荐

```javascript
// 个性化搜索推荐
class PersonalizedSearch {
  constructor(searchComponent) {
    this.searchComponent = searchComponent;
    this.userPreferences = this.loadUserPreferences();
  }

  loadUserPreferences() {
    // 从本地存储或 API 加载用户偏好
    const stored = localStorage.getItem('userPreferences');
    return stored ? JSON.parse(stored) : {};
  }

  async getPersonalizedSuggestions(query) {
    const baseSuggestions = await this.searchComponent.client.getSearchSuggestions(query);
    
    // 根据用户偏好排序建议
    return baseSuggestions.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, query);
      const scoreB = this.calculateRelevanceScore(b, query);
      return scoreB - scoreA;
    });
  }

  calculateRelevanceScore(suggestion, query) {
    let score = 0;
    
    // 基础相关性
    score += suggestion.includes(query) ? 10 : 0;
    
    // 用户偏好相关性
    if (this.userPreferences.categories) {
      score += this.userPreferences.categories.includes(suggestion) ? 5 : 0;
    }
    
    // 历史搜索相关性
    if (this.userPreferences.searchHistory) {
      score += this.userPreferences.searchHistory.includes(suggestion) ? 3 : 0;
    }
    
    return score;
  }
}
```

## 📚 最佳实践

### 1. 搜索体验优化

- **即时反馈**：搜索结果快速显示
- **智能提示**：提供搜索建议和自动完成
- **错误处理**：优雅处理搜索错误
- **加载状态**：显示搜索加载状态

### 2. 性能优化

- **缓存策略**：合理使用缓存
- **请求优化**：减少不必要的请求
- **数据压缩**：压缩搜索结果数据
- **懒加载**：按需加载数据

### 3. 用户体验

- **响应式设计**：适配不同设备
- **无障碍访问**：支持键盘导航和屏幕阅读器
- **国际化**：支持多语言搜索
- **个性化**：根据用户偏好定制搜索结果

## 🎯 总结

MeiliSearch 为前端搜索提供了强大的功能支持，通过合理的集成和优化，可以构建出快速、智能、用户友好的搜索体验。本指南涵盖了从基本配置到高级功能的各个方面，可以根据项目需求选择合适的功能进行实现。

---

**相关资源**：
- [MeiliSearch 官方文档](https://docs.meilisearch.com/)
- [MeiliSearch JavaScript 客户端](https://github.com/meilisearch/meilisearch-js)
- [搜索最佳实践](https://uxdesign.cc/search-best-practices-7d9a0a3976d8)

**技术支持**：
- 如有问题，请参考故障排除部分
- 或联系开发团队获取支持
