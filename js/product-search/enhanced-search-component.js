// 用途：增强版搜索组件，提供搜索建议、热门搜索和搜索结果缓存等功能
// 依赖文件：product-search-manager.js, main.js (通过全局对象使用)
// 作者：AI助手
// 时间：2025-09-22 21:30:00

/**
 * 增强版搜索组件类
 * 提供搜索建议、热门搜索和搜索结果缓存等功能
 */
class EnhancedSearchComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.options = {
      containerId: 'enhanced-search-container',
      searchInputId: 'search-input',
      searchSuggestionsId: 'search-suggestions',
      popularSearchesId: 'popular-searches',
      searchResultsId: 'search-results',
      searchButtonId: 'search-button',
      searchHistoryId: 'search-history',
      searchApiEndpoint: '/api/products/search',
      suggestionsApiEndpoint: '/api/products/suggestions',
      popularSearchesApiEndpoint: '/api/products/popular-searches',
      cacheTTL: 5 * 60 * 1000, // 5分钟缓存
      maxSuggestions: 8,
      maxPopularSearches: 10,
      maxSearchHistory: 10,
      ...options
    };

    this.state = {
      initialized: false,
      searchQuery: '',
      searchResults: [],
      searchSuggestions: [],
      popularSearches: [],
      searchHistory: [],
      isLoading: false,
      searchCache: new Map(),
      lastSearchTime: 0,
      eventListeners: {}
    };

    this.elements = {};
    this.debounceTimer = null;
    this.debounceDelay = 300; // 300ms防抖延迟
  }

  /**
 * 初始化搜索组件
 */
async init() {
  if (this.state.initialized) {
    console.warn('EnhancedSearchComponent: 组件已经初始化');
    return;
  }

  try {
    // 创建搜索界面结构
    this.createSearchInterface();
    
    // 获取DOM元素
    this.getElements();
    
    // 加载搜索历史
    this.loadSearchHistory();
    
    // 加载热门搜索
    await this.loadPopularSearches();
    
    // 绑定事件
    this.bindEvents();
    
    // 设置初始化状态
    this.state.initialized = true;
    console.log('EnhancedSearchComponent: 初始化完成');
  } catch (error) {
    console.error('EnhancedSearchComponent: 初始化失败', error);
  }
}

  /**
   * 创建搜索界面结构
   */
  createSearchInterface() {
    const container = document.getElementById(this.options.containerId);
    if (!container) {
      throw new Error(`EnhancedSearchComponent: 容器元素 '${this.options.containerId}' 未找到`);
    }

    // 创建搜索表单
    const searchForm = document.createElement('form');
    searchForm.setAttribute('role', 'search');
    searchForm.setAttribute('aria-label', '站内搜索');
    searchForm.className = 'enhanced-search-form';

    // 创建搜索输入框容器
    const inputContainer = document.createElement('div');
    inputContainer.className = 'relative';

    // 创建搜索输入框
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.id = this.options.searchInputId;
    searchInput.name = 'q';
    searchInput.placeholder = '搜索产品、系列或关键词';
    searchInput.className = 'w-full py-3 pl-12 pr-4 border border-[var(--border-default)] rounded-none focus:outline-none focus:border-[var(--gold-standard)] focus:ring-2 focus:ring-[var(--gold-standard)] focus:ring-opacity-20 text-lg';
    searchInput.autocomplete = 'off';
    searchInput.spellcheck = 'false';

    // 创建搜索图标
    const searchIcon = document.createElement('i');
    searchIcon.className = 'fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--gray-400)]';
    searchIcon.setAttribute('aria-hidden', 'true');

    // 创建关闭按钮
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.id = 'close-search-btn';
    closeButton.className = 'absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--text-primary)] p-1';
    closeButton.setAttribute('aria-label', '关闭搜索');
    
    const closeIcon = document.createElement('i');
    closeIcon.className = 'fas fa-times text-xl';
    closeIcon.setAttribute('aria-hidden', 'true');
    
    closeButton.appendChild(closeIcon);

    // 组装搜索输入框容器
    inputContainer.appendChild(searchInput);
    inputContainer.appendChild(searchIcon);
    inputContainer.appendChild(closeButton);

    // 创建搜索建议容器
    const searchSuggestions = document.createElement('div');
    searchSuggestions.id = this.options.searchSuggestionsId;
    searchSuggestions.className = 'search-suggestions absolute top-full left-0 right-0 bg-white border border-[var(--border-default)] mt-1 z-10 hidden';

    // 创建搜索历史容器
    const searchHistory = document.createElement('div');
    searchHistory.id = this.options.searchHistoryId;
    searchHistory.className = 'search-history absolute top-full left-0 right-0 bg-white border border-[var(--border-default)] mt-1 z-10 hidden';

    // 创建热门搜索容器
    const popularSearches = document.createElement('div');
    popularSearches.id = this.options.popularSearchesId;
    popularSearches.className = 'popular-searches mt-4';

    // 创建搜索结果容器
    const searchResults = document.createElement('div');
    searchResults.id = this.options.searchResultsId;
    searchResults.className = 'search-results mt-4';

    // 组装搜索表单
    searchForm.appendChild(inputContainer);
    searchForm.appendChild(searchSuggestions);
    searchForm.appendChild(searchHistory);

    // 组装容器
    container.appendChild(searchForm);
    container.appendChild(popularSearches);
    container.appendChild(searchResults);

    // 添加关闭按钮事件
    closeButton.addEventListener('click', () => {
      if (typeof window.toggleSearch === 'function') {
        window.toggleSearch();
      }
    });
  }

  /**
   * 获取DOM元素
   */
  getElements() {
    // 搜索输入框
    this.elements.searchInput = document.getElementById(this.options.searchInputId);
    
    // 搜索建议容器
    this.elements.searchSuggestions = document.getElementById(this.options.searchSuggestionsId);
    
    // 热门搜索容器
    this.elements.popularSearches = document.getElementById(this.options.popularSearchesId);
    
    // 搜索结果容器
    this.elements.searchResults = document.getElementById(this.options.searchResultsId);
    
    // 搜索按钮
    this.elements.searchButton = document.getElementById(this.options.searchButtonId);
    
    // 搜索历史容器
    this.elements.searchHistory = document.getElementById(this.options.searchHistoryId);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 搜索输入事件
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
      this.elements.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
      this.elements.searchInput.addEventListener('blur', this.handleSearchBlur.bind(this));
      this.elements.searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
    }

    // 搜索按钮点击事件
    if (this.elements.searchButton) {
      this.elements.searchButton.addEventListener('click', this.handleSearchClick.bind(this));
    }

    // 点击页面其他地方时隐藏搜索建议
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  /**
   * 处理搜索输入
   * @param {Event} event - 输入事件
   */
  handleSearchInput(event) {
    const query = event.target.value.trim();
    this.state.searchQuery = query;

    // 防抖处理
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (query.length > 0) {
        // 获取搜索建议
        this.fetchSearchSuggestions(query);
      } else {
        // 隐藏搜索建议
        this.hideSearchSuggestions();
      }
    }, this.debounceDelay);
  }

  /**
   * 处理搜索框获得焦点
   * @param {Event} event - 焦点事件
   */
  handleSearchFocus(event) {
    const query = event.target.value.trim();
    
    // 如果有搜索查询，显示搜索建议
    if (query.length > 0) {
      this.showSearchSuggestions();
    } else {
      // 显示搜索历史和热门搜索
      this.showSearchHistory();
      this.showPopularSearches();
    }
  }

  /**
   * 处理搜索框失去焦点
   * @param {Event} event - 焦点事件
   */
  handleSearchBlur(event) {
    // 延迟隐藏搜索建议，以便用户可以点击建议项
    setTimeout(() => {
      this.hideSearchSuggestions();
    }, 200);
  }

  /**
   * 处理搜索按键
   * @param {Event} event - 按键事件
   */
  handleSearchKeydown(event) {
    const query = event.target.value.trim();
    
    // 回车键执行搜索
    if (event.key === 'Enter' && query.length > 0) {
      this.performSearch(query);
    }
  }

  /**
   * 处理搜索按钮点击
   * @param {Event} event - 点击事件
   */
  handleSearchClick(event) {
    const query = this.elements.searchInput ? this.elements.searchInput.value.trim() : '';
    if (query.length > 0) {
      this.performSearch(query);
    }
  }

  /**
   * 处理文档点击事件
   * @param {Event} event - 点击事件
   */
  handleDocumentClick(event) {
    // 如果点击的不是搜索相关元素，隐藏搜索建议
    if (
      this.elements.searchInput &&
      this.elements.searchSuggestions &&
      !this.elements.searchInput.contains(event.target) &&
      !this.elements.searchSuggestions.contains(event.target)
    ) {
      this.hideSearchSuggestions();
    }
  }

  /**
 * 获取搜索建议
 * @param {string} query - 搜索查询
 */
async fetchSearchSuggestions(query) {
  try {
    // 检查缓存
    const cacheKey = `suggestions:${query}`;
    const cachedResult = this.state.searchCache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < this.options.cacheTTL) {
      this.state.searchSuggestions = cachedResult.data;
      this.showSearchSuggestions();
      return;
    }

    // 如果没有提供API端点，使用模拟数据
    if (!this.options.suggestionsApiEndpoint) {
      this.state.searchSuggestions = this.getMockSuggestions(query);
      this.showSearchSuggestions();
      return;
    }

    // 从API获取搜索建议
    const response = await fetch(`${this.options.suggestionsApiEndpoint}?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 更新状态
    this.state.searchSuggestions = data.suggestions || [];
    
    // 缓存结果
    this.state.searchCache.set(cacheKey, {
      data: this.state.searchSuggestions,
      timestamp: Date.now()
    });
    
    // 显示搜索建议
    this.showSearchSuggestions();
  } catch (error) {
    console.warn('EnhancedSearchComponent: 获取搜索建议失败', error.message);
    // 使用模拟数据作为后备
    this.state.searchSuggestions = this.getMockSuggestions(query);
    this.showSearchSuggestions();
  }
}

/**
 * 获取模拟的搜索建议数据
 * @param {string} query - 搜索查询
 * @returns {Array} 模拟的搜索建议数据
 */
getMockSuggestions(query) {
  const allSuggestions = [
    '皮革手袋', '帆布包', '迷你包', '托特包', '斜挎包',
    '丝质围巾', '羊毛围巾', '棉质围巾', '印花围巾', '冬季围巾',
    '太阳镜', '光学眼镜', '阅读眼镜', '运动眼镜', '复古眼镜',
    '经典香水', '淡香水', '男士香水', '女士香水', '限量版香水',
    '男士西装', '休闲西装', '商务西装', '燕尾服', '定制西装',
    '女士手表', '男士手表', '智能手表', '机械手表', '石英手表',
    '珠宝首饰', '项链', '耳环', '手镯', '戒指',
    '高跟鞋', '平底鞋', '运动鞋', '靴子', '凉鞋'
  ];

  // 根据查询过滤建议
  return allSuggestions
    .filter(item => item.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5); // 最多返回5个建议
}

  /**
 * 加载热门搜索
 */
async loadPopularSearches() {
  try {
    // 检查缓存
    const cacheKey = 'popular-searches';
    const cachedResult = this.state.searchCache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < this.options.cacheTTL) {
      this.state.popularSearches = cachedResult.data;
      this.showPopularSearches();
      return;
    }

    // 如果没有提供API端点，使用模拟数据
    if (!this.options.popularSearchesApiEndpoint) {
      this.state.popularSearches = this.getMockPopularSearches();
      this.showPopularSearches();
      return;
    }

    // 从API获取热门搜索
    const response = await fetch(this.options.popularSearchesApiEndpoint);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 更新状态
    this.state.popularSearches = data.searches || [];
    
    // 缓存结果
    this.state.searchCache.set(cacheKey, {
      data: this.state.popularSearches,
      timestamp: Date.now()
    });
    
    // 显示热门搜索
    this.showPopularSearches();
  } catch (error) {
    console.warn('EnhancedSearchComponent: 加载热门搜索失败', error.message);
    // 使用模拟数据作为后备
    this.state.popularSearches = this.getMockPopularSearches();
    this.showPopularSearches();
  }
}

/**
 * 获取模拟的热门搜索数据
 * @returns {Array} 模拟的热门搜索数据
 */
getMockPopularSearches() {
  return [
    { term: '皮革手袋', count: 125 },
    { term: '丝质围巾', count: 98 },
    { term: '太阳镜', count: 76 },
    { term: '经典香水', count: 65 },
    { term: '男士西装', count: 54 },
    { term: '女士手表', count: 43 },
    { term: '珠宝首饰', count: 32 },
    { term: '高跟鞋', count: 28 }
  ];
}

  /**
   * 加载搜索历史
   */
  loadSearchHistory() {
    try {
      // 从localStorage加载搜索历史
      const savedHistory = localStorage.getItem('searchHistory');
      
      if (savedHistory) {
        this.state.searchHistory = JSON.parse(savedHistory);
      } else {
        this.state.searchHistory = [];
      }
      
      // 显示搜索历史
      this.showSearchHistory();
    } catch (error) {
      console.error('EnhancedSearchComponent: 加载搜索历史失败', error);
      this.state.searchHistory = [];
    }
  }

  /**
   * 保存搜索历史
   */
  saveSearchHistory() {
    try {
      // 保存到localStorage
      localStorage.setItem('searchHistory', JSON.stringify(this.state.searchHistory));
    } catch (error) {
      console.error('EnhancedSearchComponent: 保存搜索历史失败', error);
    }
  }

  /**
 * 执行搜索
 * @param {string} query - 搜索查询
 */
async performSearch(query) {
  if (!query || query.trim() === '') return;

  // 更新搜索查询
  this.state.searchQuery = query.trim();
  
  // 隐藏搜索建议
  this.hideSearchSuggestions();
  
  // 显示加载状态
  this.setLoadingState(true);
  
  try {
    // 检查缓存
    const cacheKey = `search:${this.state.searchQuery}`;
    const cachedResult = this.state.searchCache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < this.options.cacheTTL) {
      this.state.searchResults = cachedResult.data;
      this.displaySearchResults();
      this.setLoadingState(false);
      return;
    }

    // 如果没有提供API端点，使用模拟数据
    if (!this.options.searchApiEndpoint) {
      const mockResults = this.getMockSearchResults(this.state.searchQuery);
      this.state.searchResults = mockResults;
      this.state.lastSearchTime = Date.now();
      
      // 缓存结果
      this.state.searchCache.set(cacheKey, {
        data: this.state.searchResults,
        timestamp: Date.now()
      });
      
      // 添加到搜索历史
      this.addToSearchHistory(this.state.searchQuery);
      
      // 显示搜索结果
      this.displaySearchResults();
      this.setLoadingState(false);
      return;
    }

    // 构建搜索参数
    const searchParams = new URLSearchParams({
      q: this.state.searchQuery,
      page: '1',
      limit: '20'
    });

    // 从API执行搜索
    const response = await fetch(`${this.options.searchApiEndpoint}?${searchParams}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 更新状态
    this.state.searchResults = data.products || [];
    this.state.lastSearchTime = Date.now();
    
    // 缓存结果
    this.state.searchCache.set(cacheKey, {
      data: this.state.searchResults,
      timestamp: Date.now()
    });
    
    // 添加到搜索历史
    this.addToSearchHistory(this.state.searchQuery);
    
    // 显示搜索结果
    this.displaySearchResults();
  } catch (error) {
    console.error('EnhancedSearchComponent: 执行搜索失败', error);
    
    // 使用模拟数据作为后备
    const mockResults = this.getMockSearchResults(this.state.searchQuery);
    this.state.searchResults = mockResults;
    this.state.lastSearchTime = Date.now();
    
    // 添加到搜索历史
    this.addToSearchHistory(this.state.searchQuery);
    
    // 显示搜索结果
    this.displaySearchResults();
  } finally {
    // 隐藏加载状态
    this.setLoadingState(false);
  }
}

  /**
   * 添加到搜索历史
   * @param {string} query - 搜索查询
   */
  addToSearchHistory(query) {
    // 移除重复项
    this.state.searchHistory = this.state.searchHistory.filter(item => item !== query);
    
    // 添加到开头
    this.state.searchHistory.unshift(query);
    
    // 限制历史记录数量
    if (this.state.searchHistory.length > this.options.maxSearchHistory) {
      this.state.searchHistory = this.state.searchHistory.slice(0, this.options.maxSearchHistory);
    }
    
    // 保存搜索历史
    this.saveSearchHistory();
    
    // 更新显示
    this.showSearchHistory();
  }

  /**
   * 显示搜索建议
   */
  showSearchSuggestions() {
    if (!this.elements.searchSuggestions) return;
    
    // 清空容器
    this.elements.searchSuggestions.innerHTML = '';
    
    // 如果没有搜索建议，隐藏容器
    if (this.state.searchSuggestions.length === 0) {
      this.elements.searchSuggestions.style.display = 'none';
      return;
    }
    
    // 显示容器
    this.elements.searchSuggestions.style.display = 'block';
    
    // 创建建议项
    this.state.searchSuggestions.slice(0, this.options.maxSuggestions).forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'search-suggestion-item';
      item.textContent = suggestion;
      
      // 添加点击事件
      item.addEventListener('click', () => {
        if (this.elements.searchInput) {
          this.elements.searchInput.value = suggestion;
        }
        this.performSearch(suggestion);
      });
      
      this.elements.searchSuggestions.appendChild(item);
    });
  }

  /**
   * 隐藏搜索建议
   */
  hideSearchSuggestions() {
    if (this.elements.searchSuggestions) {
      this.elements.searchSuggestions.style.display = 'none';
    }
  }

  /**
   * 显示搜索历史
   */
  showSearchHistory() {
    if (!this.elements.searchHistory) return;
    
    // 清空容器
    this.elements.searchHistory.innerHTML = '';
    
    // 如果没有搜索历史，隐藏容器
    if (this.state.searchHistory.length === 0) {
      this.elements.searchHistory.style.display = 'none';
      return;
    }
    
    // 显示容器
    this.elements.searchHistory.style.display = 'block';
    
    // 创建标题
    const title = document.createElement('div');
    title.className = 'search-history-title';
    title.textContent = '搜索历史';
    this.elements.searchHistory.appendChild(title);
    
    // 创建历史项
    this.state.searchHistory.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'search-history-item';
      historyItem.textContent = item;
      
      // 添加点击事件
      historyItem.addEventListener('click', () => {
        if (this.elements.searchInput) {
          this.elements.searchInput.value = item;
        }
        this.performSearch(item);
      });
      
      this.elements.searchHistory.appendChild(historyItem);
    });
  }

  /**
   * 显示热门搜索
   */
  async showPopularSearches() {
    if (!this.elements.popularSearches) {
      console.warn('EnhancedSearchComponent: 热门搜索容器不存在');
      return;
    }

    // 如果没有热门搜索数据，则加载
    if (!this.state.popularSearches || this.state.popularSearches.length === 0) {
      await this.loadPopularSearches();
    }

    // 清空容器
    this.elements.popularSearches.innerHTML = '';

    // 如果没有热门搜索数据，则显示提示信息
    if (!this.state.popularSearches || this.state.popularSearches.length === 0) {
      const noDataMsg = document.createElement('div');
      noDataMsg.className = 'no-popular-searches';
      noDataMsg.textContent = '暂无热门搜索';
      this.elements.popularSearches.appendChild(noDataMsg);
      return;
    }

    // 创建标题
    const title = document.createElement('div');
    title.className = 'popular-searches-title';
    title.textContent = '热门搜索';
    this.elements.popularSearches.appendChild(title);

    // 创建热门搜索项
    const popularSearchesList = document.createElement('div');
    popularSearchesList.className = 'popular-searches-list';

    this.state.popularSearches.forEach((search, index) => {
      const searchItem = document.createElement('div');
      searchItem.className = 'popular-search-item';
      
      // 排名
      const rank = document.createElement('span');
      rank.className = 'popular-search-rank';
      rank.textContent = index + 1;
      searchItem.appendChild(rank);
      
      // 搜索词
      const term = document.createElement('span');
      term.className = 'popular-search-term';
      term.textContent = search.term;
      searchItem.appendChild(term);
      
      // 搜索次数
      const count = document.createElement('span');
      count.className = 'popular-search-count';
      count.textContent = `${search.count}次搜索`;
      searchItem.appendChild(count);

      // 添加点击事件
      searchItem.addEventListener('click', () => {
        if (this.elements.searchInput) {
          this.elements.searchInput.value = search.term;
        }
        this.performSearch(search.term);
      });

      popularSearchesList.appendChild(searchItem);
    });

    this.elements.popularSearches.appendChild(popularSearchesList);
    this.elements.popularSearches.style.display = 'block';
  }

/**
   * 隐藏热门搜索
   */
  hidePopularSearches() {
    if (this.elements.popularSearches) {
      this.elements.popularSearches.style.display = 'none';
    }
  }

  /**
   * 显示搜索结果
   */
  displaySearchResults() {
    if (!this.elements.searchResults) return;
    
    // 清空容器
    this.elements.searchResults.innerHTML = '';
    
    // 如果没有搜索结果，显示无结果提示
    if (this.state.searchResults.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-search-results';
      noResults.textContent = `没有找到与 "${this.state.searchQuery}" 相关的产品`;
      this.elements.searchResults.appendChild(noResults);
      return;
    }
    
    // 创建结果标题
    const resultsTitle = document.createElement('div');
    resultsTitle.className = 'search-results-title';
    resultsTitle.textContent = `搜索结果 (${this.state.searchResults.length} 个产品)`;
    this.elements.searchResults.appendChild(resultsTitle);
    
    // 创建产品网格容器
    const productsGrid = document.createElement('div');
    productsGrid.className = 'products-grid';
    
    // 创建产品卡片
    this.state.searchResults.forEach(product => {
      const productCard = this.createProductCard(product);
      productsGrid.appendChild(productCard);
    });
    
    this.elements.searchResults.appendChild(productsGrid);
  }

  /**
   * 创建产品卡片
   * @param {Object} product - 产品数据
   * @returns {HTMLElement} 产品卡片元素
   */
  createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // 产品图片
    const image = document.createElement('img');
    image.className = 'product-image';
    image.src = product.image || 'https://via.placeholder.com/300x200?text=Product';
    image.alt = product.name;
    card.appendChild(image);
    
    // 产品信息容器
    const info = document.createElement('div');
    info.className = 'product-info';
    
    // 产品名称
    const name = document.createElement('div');
    name.className = 'product-name';
    name.textContent = product.name;
    info.appendChild(name);
    
    // 产品价格
    const price = document.createElement('div');
    price.className = 'product-price';
    price.textContent = `¥${product.price}`;
    info.appendChild(price);
    
    // 产品评分
    const rating = document.createElement('div');
    rating.className = 'product-rating';
    
    const stars = document.createElement('div');
    stars.className = 'product-rating-stars';
    stars.textContent = '★★★★★';
    rating.appendChild(stars);
    
    const count = document.createElement('div');
    count.className = 'product-rating-count';
    count.textContent = `${product.reviewCount || 0} 评价`;
    rating.appendChild(count);
    
    info.appendChild(rating);
    
    // 产品操作按钮
    const actions = document.createElement('div');
    actions.className = 'product-actions';
    
    const addToCartBtn = document.createElement('button');
    addToCartBtn.className = 'product-button add-to-cart-button';
    addToCartBtn.textContent = '加入购物车';
    actions.appendChild(addToCartBtn);
    
    const addToWishlistBtn = document.createElement('button');
    addToWishlistBtn.className = 'product-button add-to-wishlist-button';
    addToWishlistBtn.textContent = '收藏';
    actions.appendChild(addToWishlistBtn);
    
    info.appendChild(actions);
    
    card.appendChild(info);
    
    // 添加点击事件
    card.addEventListener('click', (event) => {
      // 如果点击的是按钮，不触发卡片点击事件
      if (event.target.classList.contains('product-button')) {
        return;
      }
      
      // 触发产品选择事件
      this.handleProductSelect(product);
    });
    
    return card;
  }

  /**
   * 处理产品选择
   * @param {Object} product - 产品数据
   */
  handleProductSelect(product) {
    // 触发自定义事件
    const event = new CustomEvent('productSelect', {
      detail: { product }
    });
    document.dispatchEvent(event);
    
    // 如果有产品详情页面，可以导航到产品详情
    if (product.id) {
      // window.location.href = `/product.html?id=${product.id}`;
      console.log('导航到产品详情页', product.id);
    }
  }

  /**
   * 设置加载状态
   * @param {boolean} isLoading - 是否正在加载
   */
  setLoadingState(isLoading) {
    this.state.isLoading = isLoading;
    
    // 更新搜索按钮状态
    if (this.elements.searchButton) {
      this.elements.searchButton.disabled = isLoading;
      this.elements.searchButton.textContent = isLoading ? '搜索中...' : '搜索';
    }
    
    // 更新搜索输入框状态
    if (this.elements.searchInput) {
      this.elements.searchInput.disabled = isLoading;
    }
    
    // 显示或隐藏加载指示器
    let loadingIndicator = document.getElementById('search-loading-indicator');
    
    if (isLoading) {
      if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'search-loading-indicator';
        loadingIndicator.className = 'search-loading-indicator';
        loadingIndicator.textContent = '加载中...';
        
        if (this.elements.searchResults) {
          this.elements.searchResults.parentNode.insertBefore(loadingIndicator, this.elements.searchResults);
        }
      }
      loadingIndicator.style.display = 'block';
    } else if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }

  /**
   * 清除搜索缓存
   */
  clearCache() {
    this.state.searchCache.clear();
    console.log('EnhancedSearchComponent: 搜索缓存已清除');
  }

  /**
 * 获取模拟的搜索结果数据
 * @param {string} query - 搜索查询
 * @param {Object} filters - 筛选条件
 * @returns {Array} 模拟的搜索结果数据
 */
getMockSearchResults(query, filters = {}) {
  // 模拟产品数据
  const allProducts = [
    {
      id: 'prod-001',
      name: '经典皮革手袋',
      category: '手袋',
      price: 5800,
      originalPrice: 6800,
      image: 'images/products/bag-1.jpg',
      description: '采用顶级意大利皮革制作，经典设计，永恒优雅。',
      rating: 4.8,
      reviewCount: 124,
      inStock: true,
      tags: ['皮革', '手袋', '经典']
    },
    {
      id: 'prod-002',
      name: '丝质印花围巾',
      category: '围巾',
      price: 1200,
      originalPrice: null,
      image: 'images/products/scarf-1.jpg',
      description: '100%真丝材质，手工印花，轻盈柔软。',
      rating: 4.6,
      reviewCount: 89,
      inStock: true,
      tags: ['丝质', '围巾', '印花']
    },
    {
      id: 'prod-003',
      name: '限量版太阳镜',
      category: '眼镜',
      price: 3200,
      originalPrice: null,
      image: 'images/products/sunglasses-1.jpg',
      description: '限量版设计，防UV镜片，时尚与功能并重。',
      rating: 4.9,
      reviewCount: 67,
      inStock: true,
      tags: ['太阳镜', '限量版', '防UV']
    },
    {
      id: 'prod-004',
      name: '经典香水',
      category: '香水',
      price: 1800,
      originalPrice: 2100,
      image: 'images/products/perfume-1.jpg',
      description: '经典香调，持久留香，展现独特魅力。',
      rating: 4.7,
      reviewCount: 156,
      inStock: true,
      tags: ['香水', '经典', '持久']
    },
    {
      id: 'prod-005',
      name: '男士商务西装',
      category: '服装',
      price: 8800,
      originalPrice: null,
      image: 'images/products/suit-1.jpg',
      description: '精剪裁，高级面料，展现男士优雅气质。',
      rating: 4.5,
      reviewCount: 43,
      inStock: true,
      tags: ['西装', '商务', '男士']
    }
  ];

  // 根据查询过滤产品
  let filteredProducts = allProducts;
  
  if (query) {
    const queryLower = query.toLowerCase();
    filteredProducts = allProducts.filter(product => 
      product.name.toLowerCase().includes(queryLower) ||
      product.description.toLowerCase().includes(queryLower) ||
      product.category.toLowerCase().includes(queryLower) ||
      product.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );
  }

  // 应用类别筛选
  if (filters.category && filters.category !== 'all') {
    filteredProducts = filteredProducts.filter(product => 
      product.category === filters.category
    );
  }

  // 应用价格范围筛选
  if (filters.priceRange) {
    const { min, max } = filters.priceRange;
    filteredProducts = filteredProducts.filter(product => 
      product.price >= min && product.price <= max
    );
  }

  // 应用排序
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'price-asc':
        filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rating-desc':
        filteredProducts.sort((a, b) => b.rating - a.rating);
        break;
      default:
        // 默认排序（相关性）
        break;
    }
  }

  return filteredProducts;
}

/**
   * 销毁搜索组件
   */
  destroy() {
    // 移除事件监听
    if (this.elements.searchInput) {
      this.elements.searchInput.removeEventListener('input', this.handleSearchInput);
      this.elements.searchInput.removeEventListener('focus', this.handleSearchFocus);
      this.elements.searchInput.removeEventListener('blur', this.handleSearchBlur);
      this.elements.searchInput.removeEventListener('keydown', this.handleSearchKeydown);
    }

    if (this.elements.searchButton) {
      this.elements.searchButton.removeEventListener('click', this.handleSearchClick);
    }

    document.removeEventListener('click', this.handleDocumentClick);
    
    // 清除定时器
    clearTimeout(this.debounceTimer);
    
    // 重置状态
    this.state.initialized = false;
    
    console.log('EnhancedSearchComponent: 已销毁');
  }

  /**
   * 添加事件监听器
   * @param {string} event - 事件名称
   * @param {function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.state.eventListeners[event]) {
      this.state.eventListeners[event] = [];
    }
    this.state.eventListeners[event].push(callback);
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (this.state.eventListeners[event]) {
      this.state.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件 ${event} 的回调函数执行失败:`, error);
        }
      });
    }
  }
}

// 创建默认实例
const defaultEnhancedSearchComponent = new EnhancedSearchComponent();

// 导出模块
export { EnhancedSearchComponent };
export default defaultEnhancedSearchComponent;

// 添加到全局对象，以便在HTML中直接使用
if (typeof window !== 'undefined') {
  window.EnhancedSearchComponent = EnhancedSearchComponent;
  window.defaultEnhancedSearchComponent = defaultEnhancedSearchComponent;
}