/**
 * MeiliSearch 搜索组件
 * 提供完整的搜索界面和功能
 */

import meilisearchClient from './meilisearch-client.js';

class SearchComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.searchInput = null;
    this.searchResults = null;
    this.suggestions = null;
    this.filters = null;
    this.isLoading = false;
    this.currentQuery = '';
    this.currentPage = 1;
    this.pageSize = 12;
    
    this.init();
  }

  init() {
    if (!this.container) {
      console.error('搜索容器未找到');
      return;
    }

    this.render();
    this.bindEvents();
    this.loadPopularSearches();
    this.loadCategories();
  }

  render() {
    this.container.innerHTML = `
      <div class="search-container">
        <!-- 搜索框 -->
        <div class="search-box">
          <div class="search-input-wrapper">
            <input 
              type="text" 
              class="search-input" 
              placeholder="搜索商品..."
              autocomplete="off"
            >
            <button class="search-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </button>
            <button class="clear-button" style="display: none;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <!-- 搜索建议 -->
          <div class="search-suggestions" style="display: none;">
            <div class="suggestions-list"></div>
          </div>
        </div>

        <!-- 搜索过滤器 -->
        <div class="search-filters" style="display: none;">
          <div class="filter-section">
            <h3>分类</h3>
            <div class="category-filters"></div>
          </div>
          
          <div class="filter-section">
            <h3>价格范围</h3>
            <div class="price-range">
              <input type="number" class="price-min" placeholder="最低价">
              <span>-</span>
              <input type="number" class="price-max" placeholder="最高价">
              <button class="apply-filter">应用</button>
            </div>
          </div>
          
          <div class="filter-actions">
            <button class="clear-filters">清除筛选</button>
          </div>
        </div>

        <!-- 搜索结果 -->
        <div class="search-results">
          <div class="results-header">
            <div class="results-info">
              <span class="results-count">找到 0 个商品</span>
              <div class="results-sort">
                <label>排序：</label>
                <select class="sort-select">
                  <option value="relevance">相关度</option>
                  <option value="price-asc">价格从低到高</option>
                  <option value="price-desc">价格从高到低</option>
                  <option value="name-asc">名称 A-Z</option>
                  <option value="name-desc">名称 Z-A</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="products-grid">
            <!-- 商品将在这里动态加载 -->
          </div>
          
          <!-- 分页 -->
          <div class="pagination">
            <button class="prev-page" disabled>上一页</button>
            <div class="page-numbers"></div>
            <button class="next-page" disabled>下一页</button>
          </div>
          
          <!-- 加载状态 -->
          <div class="loading" style="display: none;">
            <div class="spinner"></div>
            <p>搜索中...</p>
          </div>
          
          <!-- 无结果 -->
          <div class="no-results" style="display: none;">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <h3>未找到相关商品</h3>
            <p>请尝试其他关键词或调整筛选条件</p>
          </div>
        </div>
      </div>
    `;

    // 获取DOM元素
    this.searchInput = this.container.querySelector('.search-input');
    this.searchButton = this.container.querySelector('.search-button');
    this.clearButton = this.container.querySelector('.clear-button');
    this.suggestionsContainer = this.container.querySelector('.search-suggestions');
    this.suggestionsList = this.container.querySelector('.suggestions-list');
    this.filtersContainer = this.container.querySelector('.search-filters');
    this.categoryFilters = this.container.querySelector('.category-filters');
    this.priceMin = this.container.querySelector('.price-min');
    this.priceMax = this.container.querySelector('.price-max');
    this.applyFilterButton = this.container.querySelector('.apply-filter');
    this.clearFiltersButton = this.container.querySelector('.clear-filters');
    this.resultsContainer = this.container.querySelector('.products-grid');
    this.resultsCount = this.container.querySelector('.results-count');
    this.sortSelect = this.container.querySelector('.sort-select');
    this.paginationContainer = this.container.querySelector('.pagination');
    this.loadingContainer = this.container.querySelector('.loading');
    this.noResultsContainer = this.container.querySelector('.no-results');
  }

  bindEvents() {
    // 搜索输入事件
    this.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
    this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
    this.searchInput.addEventListener('blur', this.handleSearchBlur.bind(this));

    // 搜索按钮事件
    this.searchButton.addEventListener('click', this.handleSearch.bind(this));
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSearch();
      }
    });

    // 清除按钮事件
    this.clearButton.addEventListener('click', this.clearSearch.bind(this));

    // 过滤器事件
    this.applyFilterButton.addEventListener('click', this.applyFilters.bind(this));
    this.clearFiltersButton.addEventListener('click', this.clearFilters.bind(this));

    // 排序事件
    this.sortSelect.addEventListener('change', this.handleSort.bind(this));

    // 分页事件
    this.paginationContainer.addEventListener('click', this.handlePagination.bind(this));

    // 点击外部关闭建议
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.hideSuggestions();
      }
    });
  }

  // 实时搜索（防抖）
  handleSearchInput = meilisearchClient.debounceSearch(async (e) => {
    const query = e.target.value.trim();
    
    if (query.length === 0) {
      this.clearSearch();
      return;
    }

    this.currentQuery = query;
    this.showSuggestions();
    
    try {
      const suggestions = await meilisearchClient.getSearchSuggestions(query, 5);
      this.displaySuggestions(suggestions);
    } catch (error) {
      console.error('获取搜索建议失败:', error);
    }
  }, 300);

  handleSearchFocus() {
    if (this.currentQuery) {
      this.showSuggestions();
    }
  }

  handleSearchBlur() {
    // 延迟隐藏建议，以便用户可以点击建议
    setTimeout(() => {
      this.hideSuggestions();
    }, 200);
  }

  handleSearch() {
    const query = this.searchInput.value.trim();
    if (!query) return;

    this.currentQuery = query;
    this.currentPage = 1;
    this.performSearch(query);
    this.hideSuggestions();
  }

  async performSearch(query, page = 1, filters = {}) {
    this.showLoading();
    
    try {
      let searchParams = {
        limit: this.pageSize,
        offset: (page - 1) * this.pageSize
      };

      // 添加排序
      const sortValue = this.sortSelect.value;
      switch (sortValue) {
        case 'price-asc':
          searchParams.sort = ['price:asc'];
          break;
        case 'price-desc':
          searchParams.sort = ['price:desc'];
          break;
        case 'name-asc':
          searchParams.sort = ['name:asc'];
          break;
        case 'name-desc':
          searchParams.sort = ['name:desc'];
          break;
      }

      // 添加过滤器
      if (filters.category) {
        searchParams.filter = `category = "${filters.category}"`;
      }
      if (filters.priceRange) {
        const priceFilter = `price >= ${filters.priceRange.min} AND price <= ${filters.priceRange.max}`;
        searchParams.filter = searchParams.filter ? `${searchParams.filter} AND ${priceFilter}` : priceFilter;
      }

      const result = await meilisearchClient.cachedSearch(query, searchParams);
      
      this.displayResults(result, page);
      this.updateResultsInfo(result, query);
      this.updatePagination(result, page);
      
    } catch (error) {
      console.error('搜索失败:', error);
      this.showError();
    } finally {
      this.hideLoading();
    }
  }

  showSuggestions() {
    this.suggestionsContainer.style.display = 'block';
  }

  hideSuggestions() {
    this.suggestionsContainer.style.display = 'none';
  }

  displaySuggestions(suggestions) {
    if (suggestions.length === 0) {
      this.suggestionsList.innerHTML = '<div class="no-suggestions">暂无建议</div>';
      return;
    }

    this.suggestionsList.innerHTML = suggestions.map(suggestion => `
      <div class="suggestion-item" data-suggestion="${suggestion}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        ${suggestion}
      </div>
    `).join('');

    // 绑定建议点击事件
    this.suggestionsList.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const suggestion = item.dataset.suggestion;
        this.searchInput.value = suggestion;
        this.currentQuery = suggestion;
        this.performSearch(suggestion);
        this.hideSuggestions();
      });
    });
  }

  clearSearch() {
    this.searchInput.value = '';
    this.currentQuery = '';
    this.currentPage = 1;
    this.clearButton.style.display = 'none';
    this.resultsContainer.innerHTML = '';
    this.resultsCount.textContent = '找到 0 个商品';
    this.hideSuggestions();
  }

  showFilters() {
    this.filtersContainer.style.display = 'block';
  }

  hideFilters() {
    this.filtersContainer.style.display = 'none';
  }

  async loadCategories() {
    try {
      const categories = await meilisearchClient.getCategories();
      this.displayCategories(categories);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  }

  displayCategories(categories) {
    this.categoryFilters.innerHTML = categories.map(category => `
      <label class="category-filter">
        <input type="checkbox" value="${category}" class="category-checkbox">
        <span>${category}</span>
      </label>
    `).join('');
  }

  applyFilters() {
    const selectedCategories = Array.from(this.categoryFilters.querySelectorAll('.category-checkbox:checked'))
      .map(cb => cb.value);
    
    const minPrice = parseFloat(this.priceMin.value) || 0;
    const maxPrice = parseFloat(this.priceMax.value) || Infinity;
    
    const filters = {
      category: selectedCategories[0] || null,
      priceRange: { min: minPrice, max: maxPrice }
    };

    this.performSearch(this.currentQuery, this.currentPage, filters);
    this.showFilters();
  }

  clearFilters() {
    this.categoryFilters.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    this.priceMin.value = '';
    this.priceMax.value = '';
    this.performSearch(this.currentQuery, this.currentPage, {});
  }

  handleSort() {
    this.performSearch(this.currentQuery, this.currentPage);
  }

  displayResults(result, page) {
    const { hits, totalHits } = result;
    
    if (hits.length === 0) {
      this.showNoResults();
      return;
    }

    this.hideNoResults();
    this.resultsContainer.innerHTML = hits.map(product => `
      <div class="product-card" data-product-id="${product.id}">
        <div class="product-image">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-description">${product.description}</p>
          <div class="product-price">
            <span class="current-price">¥${product.price}</span>
            ${product.originalPrice ? `<span class="original-price">¥${product.originalPrice}</span>` : ''}
          </div>
          <div class="product-category">${product.category}</div>
        </div>
      </div>
    `).join('');

    // 绑定商品点击事件
    this.resultsContainer.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        const productId = card.dataset.productId;
        window.location.href = `/products/${productId}`;
      });
    });
  }

  updateResultsInfo(result, query) {
    this.resultsCount.textContent = `找到 ${result.totalHits} 个商品`;
    if (query) {
      this.resultsCount.textContent += ` 关于 "${query}"`;
    }
  }

  updatePagination(result, currentPage) {
    const totalPages = Math.ceil(result.totalHits / this.pageSize);
    const prevButton = this.paginationContainer.querySelector('.prev-page');
    const nextButton = this.paginationContainer.querySelector('.next-page');
    const pageNumbers = this.paginationContainer.querySelector('.page-numbers');

    // 更新上一页/下一页按钮
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages || totalPages === 0;

    // 生成页码
    let pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
        pages.push(i);
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        pages.push('...');
      }
    }

    pageNumbers.innerHTML = pages.map(page => {
      if (page === '...') {
        return '<span>...</span>';
      }
      return `<button class="page-number ${page === currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`;
    }).join('');
  }

  handlePagination(e) {
    if (e.target.classList.contains('page-number')) {
      const page = parseInt(e.target.dataset.page);
      this.performSearch(this.currentQuery, page);
    } else if (e.target.classList.contains('prev-page') && !e.target.disabled) {
      this.performSearch(this.currentQuery, this.currentPage - 1);
    } else if (e.target.classList.contains('next-page') && !e.target.disabled) {
      this.performSearch(this.currentQuery, this.currentPage + 1);
    }
  }

  showLoading() {
    this.loadingContainer.style.display = 'block';
    this.resultsContainer.style.display = 'none';
  }

  hideLoading() {
    this.loadingContainer.style.display = 'none';
    this.resultsContainer.style.display = 'grid';
  }

  showNoResults() {
    this.noResultsContainer.style.display = 'block';
    this.resultsContainer.style.display = 'none';
  }

  hideNoResults() {
    this.noResultsContainer.style.display = 'none';
    this.resultsContainer.style.display = 'grid';
  }

  showError() {
    this.resultsContainer.innerHTML = `
      <div class="error-message">
        <h3>搜索失败</h3>
        <p>请稍后重试或联系客服</p>
      </div>
    `;
  }

  async loadPopularSearches() {
    try {
      const popularSearches = await meilisearchClient.getPopularSearches(10);
      console.log('热门搜索:', popularSearches);
      // 可以在这里显示热门搜索
    } catch (error) {
      console.error('加载热门搜索失败:', error);
    }
  }
}

// 创建全局搜索组件实例
let searchComponent = null;

// 初始化搜索组件
function initSearchComponent(containerId) {
  if (!searchComponent) {
    searchComponent = new SearchComponent(containerId);
  }
  return searchComponent;
}

export default SearchComponent;
export { initSearchComponent };
