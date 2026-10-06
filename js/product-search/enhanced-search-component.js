// 用途：增强版搜索组件，提供搜索建议、热门搜索和搜索结果缓存等功能
// 依赖文件：product-search-manager.js, main.js (通过全局对象使用), utils/escape-html.js, shared/format-price.js
// 作者：AI助手
// 时间：2025-09-22 21:30:00

/**
 * 增强版搜索组件类
 * 提供搜索建议、热门搜索和搜索结果缓存等功能
 */
// M7·B5: 价格格式单一来源（整数直出 ¥299 非整两位）——A 席 M0 组件复用
import { formatPrice } from '../shared/format-price.js';

// B4（苏黎世 P2-4·流程体验官终版裁决 2026-10-06）：搜索同义词小表——手袋域
// 四词互认（建议层 filterSuggestionPool 与查询层 performSearch 两处同表）。
// 上新词（如"腰包"）只改此一处。
const SYNONYM_GROUPS = [
  ['手袋', '包', '提包', '挎包']
];

// 离线建议词表（原 getMockSuggestions 内联表提取为模块常量——A8 词池拉取
// 失败时的回落源；getMockSuggestions 过滤逻辑不变）
const ALL_MOCK_SUGGESTIONS = [
  '皮革手袋', '帆布包', '迷你包', '托特包', '斜挎包',
  '锁扣手提包', '波士顿包', '褶皱手袋', '迷你链条包', '翻盖链条包',
  '链条包', '手提包', '单肩包', '信封包', '水桶包',
  '马鞍包', '云朵包', '腋下包', '法棍包', '手拿包',
  '粒面皮', '光面皮', '印花皮革', '糖果色', '渐变褶皱',
  '通勤包', '约会包', '银色链条', '粉色链条包', '湖蓝手提包',
  '花语手提包', '复古包', '漆皮包', '编织包', '小方包',
  '双肩包', '帆布托特', '迷你斜挎', '心形扣', '圆环扣'
];

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

    // A8（流程体验官终版裁决·双席共中）：建议词池——随 /api/products 一次拉全，
    // 内存过滤（逐键 fetch /api/products/suggestions 段整体退役）
    this.suggestionPool = null;        // 词条池（品名+标签去重）
    this.productPool = null;           // 原始商品数组（B4 查询层同义词补齐用）
    this.suggestionPoolPromise = null; // 池加载 promise（缓存，失败回落离线词表）
    // B5b（苏黎世 P2-5·终版）：combobox 键盘导航——建议项 activeIndex 状态
    this.activeIndex = -1;
  }

  /**
   * 初始化搜索组件
   * B13（东京 P2-3·流程体验官终版裁决）：bindEvents 前移到 loadPopularSearches
   * 之前（首开即有监听，不与热门搜索 fetch 竞速）；loadPopularSearches 不再
   * await——init 即回（site-header 焦点挂 init promise 链），热门异步补位
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

    // 绑定事件（B13 前移）
    this.bindEvents();

    // A8：建议词池后台起拉（不阻塞首开；首查时 await 就绪）
    this.ensureSuggestionPool();

    // 加载热门搜索（B13：异步补位，其完成时自行调 showPopularSearches）
    this.loadPopularSearches();

    // 设置初始化状态
    this.state.initialized = true;
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
    searchInput.placeholder = '搜手袋、颜色或系列'; // 批五(19): 品类词口径（弃"产品"泛词）
    searchInput.className = 'w-full py-3 pl-12 pr-4 border border-[var(--border-default)] rounded-none focus:outline-none focus:border-[var(--candy-blush-ink)] focus:ring-2 focus:ring-[var(--ink)] focus:ring-opacity-20 text-lg';
    searchInput.autocomplete = 'off';
    searchInput.spellcheck = 'false';
    // B5b（流程体验官终版裁决）：combobox 语义——输入框即 combo，建议列表为
    // listbox（aria-activedescendant 跟随 activeIndex，见 showSearchSuggestions）
    searchInput.setAttribute('role', 'combobox');
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.setAttribute('aria-autocomplete', 'list');
    searchInput.setAttribute('aria-controls', this.options.searchSuggestionsId);

    // 创建搜索图标
    const searchIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    searchIcon.setAttribute('viewBox', '0 0 24 24');
    searchIcon.setAttribute('width', '18');
    searchIcon.setAttribute('height', '18');
    searchIcon.setAttribute('fill', 'none');
    searchIcon.setAttribute('stroke', 'currentColor');
    searchIcon.setAttribute('stroke-width', '2');
    searchIcon.setAttribute('class', 'absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--gray-400)]');
    searchIcon.setAttribute('aria-hidden', 'true');
    searchIcon.innerHTML = '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>';

    // 创建关闭按钮
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.id = 'close-search-btn';
    closeButton.className = 'absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--text-primary)] p-1';
    closeButton.setAttribute('aria-label', '关闭搜索');
    
    const closeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    closeIcon.setAttribute('viewBox', '0 0 24 24');
    closeIcon.setAttribute('width', '20');
    closeIcon.setAttribute('height', '20');
    closeIcon.setAttribute('fill', 'none');
    closeIcon.setAttribute('stroke', 'currentColor');
    closeIcon.setAttribute('stroke-width', '2');
    closeIcon.setAttribute('aria-hidden', 'true');
    closeIcon.innerHTML = '<path d="M6 6l12 12M18 6L6 18"/>';
    
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
        // A8（流程体验官终版裁决·双席共中）：防抖触发即有回音——词池在途（首开
        // 首查）先出"找找…"占位兜空窗（三点动画，CSS 随件在本组件样式表）；
        // 池已就绪则同步内存过滤零空窗，不出闪一帧的假占位
        if (!this.suggestionPool) {
          this.showSearchingPlaceholder();
        }
        // 获取搜索建议
        this.fetchSearchSuggestions(query);
      } else {
        // 隐藏搜索建议
        this.hideSearchSuggestions();
      }
    }, this.debounceDelay);
  }

  /** A8：防抖触发即占位行——"找找…" + 三点动画（aria-live 播报查找中） */
  showSearchingPlaceholder() {
    const box = this.elements.searchSuggestions;
    if (!box) return;
    box.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'search-suggestion-item search-suggestion-loading';
    row.setAttribute('aria-live', 'polite');
    const label = document.createElement('span');
    label.className = 'search-loading-label';
    label.textContent = '找找…';
    row.appendChild(label);
    const dots = document.createElement('span');
    dots.className = 'search-loading-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) dots.appendChild(document.createElement('i'));
    row.appendChild(dots);
    box.appendChild(row);
    box.style.display = 'block';
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
   * B5b（苏黎世 P2-5·流程体验官终版裁决）：建议列表 combobox 键盘导航——
   * ↑↓ 移动高亮（aria-selected 跟随）、Enter 选中高亮项（未高亮=原词搜索）、
   * ESC 分层（先收建议层，stopPropagation 不让本键再收搜索条——下一次 ESC 才收）
   * @param {Event} event - 按键事件
   */
  handleSearchKeydown(event) {
    const query = event.target.value.trim();
    const suggestionsOpen = !!(this.elements.searchSuggestions &&
      this.elements.searchSuggestions.style.display !== 'none' &&
      this.elements.searchSuggestions.children.length > 0);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!suggestionsOpen) return;
      event.preventDefault();
      const count = this.state.searchSuggestions.slice(0, this.options.maxSuggestions).length;
      if (!count) return;
      // 环形移动：-1（无高亮）↓ 到 0；0 ↑ 回 -1（收高亮，Enter 走原词）
      if (event.key === 'ArrowDown') {
        this.activeIndex = this.activeIndex + 1 >= count ? -1 : this.activeIndex + 1;
      } else {
        this.activeIndex = this.activeIndex - 1 < -1 ? count - 1 : this.activeIndex - 1;
      }
      this.updateSuggestionActive();
      return;
    }

    if (event.key === 'Enter') {
      if (suggestionsOpen && this.activeIndex >= 0) {
        const picked = this.state.searchSuggestions[this.activeIndex];
        if (picked) {
          event.preventDefault();
          if (this.elements.searchInput) {
            this.elements.searchInput.value = typeof picked === 'string' ? picked : (picked.text || '');
          }
          this.performSearch(this.elements.searchInput ? this.elements.searchInput.value.trim() : query);
        }
        return;
      }
      if (query.length > 0) {
        this.performSearch(query);
      }
      return;
    }

    if (event.key === 'Escape') {
      // B5a（苏黎世 P2-5 行级·根因）：input type="search" 的原生 ESC 默认行为
      // 是清空输入框——"ESC 关条再开丢已输入词"即此。preventDefault 阻断原生清词
      //（关闭搜索条由 overlay-escape 分发器负责，本键不 stopPropagation）
      event.preventDefault();
      if (suggestionsOpen) {
        event.stopPropagation(); // B5 分层：建议层开着时本键只收建议层，搜索条留给下一次 ESC
        this.hideSearchSuggestions();
      }
    }
  }

  /** B5b：高亮项同步——class/aria-selected/aria-activedescendant 三处一体 */
  updateSuggestionActive() {
    const box = this.elements.searchSuggestions;
    if (!box) return;
    const items = box.querySelectorAll('.search-suggestion-item');
    items.forEach((item, index) => {
      const active = index === this.activeIndex;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const input = this.elements.searchInput;
    if (input) {
      const activeItem = items[this.activeIndex];
      if (activeItem && activeItem.id) {
        input.setAttribute('aria-activedescendant', activeItem.id);
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }
    const activeEl = items[this.activeIndex];
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
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
   * A8（流程体验官终版裁决）：建议本地出——词池随 /api/products 一次拉全，
   * 内存前缀/包含过滤（前缀优先），逐键 fetch 段退役；池在途时上方占位行兜
   * 空窗，就绪即替换。与既有 suggestions API 的兼容口径=本地优先，API 不可用
   * （池拉取失败）回落离线词表（getMockSuggestions 全表）。
   * @param {string} query - 搜索查询
   */
  async fetchSearchSuggestions(query) {
    const pool = await this.ensureSuggestionPool();
    // 查询已清空（用户在池就绪前删光了词）：不再弹建议
    if (!this.elements.searchInput || this.elements.searchInput.value.trim() !== query) {
      if (this.elements.searchInput && this.elements.searchInput.value.trim() === '') {
        this.hideSearchSuggestions();
      }
      return;
    }
    this.state.searchSuggestions = this.filterSuggestionPool(query, pool);
    this.activeIndex = -1; // B5b：新词重置高亮
    this.showSearchSuggestions();
  }

  /** A8：词池加载（promise 缓存）——品名+标签去重入池；失败回落离线词表 */
  ensureSuggestionPool() {
    if (this.suggestionPool) return Promise.resolve(this.suggestionPool);
    if (!this.suggestionPoolPromise) {
      this.suggestionPoolPromise = fetch('/api/products?limit=50', {
        headers: { Accept: 'application/json' }
      })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then((data) => {
          const products = Array.isArray(data && data.products) ? data.products : [];
          const entries = [];
          products.forEach((p) => {
            if (p && p.name) entries.push(String(p.name));
            (Array.isArray(p && p.tags) ? p.tags : []).forEach((t) => {
              if (t) entries.push(String(t));
            });
          });
          this.productPool = products;   // B4 查询层同义词补齐用（原始商品）
          this.suggestionPool = Array.from(new Set(entries));
          return this.suggestionPool;
        })
        .catch((error) => {
          console.warn('EnhancedSearchComponent: 建议词池拉取失败，回落离线词表', error.message);
          this.suggestionPool = ALL_MOCK_SUGGESTIONS.slice();
          return this.suggestionPool;
        });
    }
    return this.suggestionPoolPromise;
  }

  /**
   * B4（苏黎世 P2-4·流程体验官终版裁决）：手袋域同义词小表——建议与查询两处互认。
   * 查询词命中组内任一词 → 全组互认（搜"包"也提示"手袋/提包/挎包"系词条）
   */
  expandQuery(query) {
    const q = String(query || '').trim();
    const terms = [q];
    SYNONYM_GROUPS.forEach((group) => {
      if (group.indexOf(q) !== -1) {
        group.forEach((word) => {
          if (word !== q) terms.push(word);
        });
      }
    });
    return terms;
  }

  /** A8：内存过滤——前缀（查询词）> 前缀（同义词）> 包含（查询词）> 包含（同义词），
      同分字典序；上限 maxSuggestions */
  filterSuggestionPool(query, pool) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const terms = this.expandQuery(query).map((t) => t.toLowerCase());
    const scored = [];
    (pool || []).forEach((entry) => {
      const e = String(entry).toLowerCase();
      let score = 0;
      if (e.indexOf(q) === 0) score = 4;
      else if (terms.some((t) => e.indexOf(t) === 0)) score = 3;
      else if (e.indexOf(q) !== -1) score = 2;
      else if (terms.some((t) => e.indexOf(t) !== -1)) score = 1;
      if (score > 0) scored.push({ entry: String(entry), score });
    });
    scored.sort((a, b) => (b.score - a.score) || a.entry.localeCompare(b.entry, 'zh'));
    return scored.slice(0, this.options.maxSuggestions).map((s) => s.entry);
  }

/**
 * 获取模拟的搜索建议数据（A8：表体已提取为 ALL_MOCK_SUGGESTIONS 模块常量）
 * @param {string} query - 搜索查询
 * @returns {Array} 模拟的搜索建议数据
 */
getMockSuggestions(query) {
  // 根据查询过滤建议
  return ALL_MOCK_SUGGESTIONS
    .filter(item => item.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5); // 最多返回5个建议
}

  /**
   * 加载热门搜索
   * B13：init 不再 await 本方法——存 promise 供 showPopularSearches 判"在途"
   *（完成后清标记：真空数据仍能渲染"暂无热门搜索"诚实态）
   */
  async loadPopularSearches() {
    const pending = this._fetchPopularSearches();
    this._popularLoadPromise = pending;
    try {
      await pending;
    } finally {
      if (this._popularLoadPromise === pending) this._popularLoadPromise = null;
    }
  }

  async _fetchPopularSearches() {
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
    { term: '锁扣手提包', count: 98 },
    { term: '波士顿包', count: 76 },
    { term: '褶皱手袋', count: 65 },
    { term: '迷你链条包', count: 54 },
    { term: '翻盖链条包', count: 43 },
    { term: '托特包', count: 32 },
    { term: '斜挎包', count: 28 }
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
    // B4（流程体验官终版裁决）：查询层同义词互认——API 主词结果之外，用
    // /api/products 词池同源数据补齐同义词命中（搜"手袋"也见 波士顿包/提包），
    // 按 id 去重、API 序在前（同义词补齐不打乱主词相关性）
    await this.mergeSynonymResults(this.state.searchQuery);
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
   * B4：查询层同义词补齐——词池（/api/products 同源）按同义词组匹配，去重后
   * 追加在 API 主词结果之后；词池不可用（productPool null）静默跳过
   */
  async mergeSynonymResults(query) {
    const terms = this.expandQuery(query);
    if (terms.length <= 1 || !Array.isArray(this.productPool)) return;
    const seen = new Set(this.state.searchResults.map((p) => String(p && p.id)));
    const synonyms = terms.slice(1).map((t) => t.toLowerCase());
    const extra = this.productPool.filter((p) => {
      if (!p || seen.has(String(p.id))) return false;
      const haystack = [
        p.name, p.description,
        Array.isArray(p.tags) ? p.tags.join(' ') : ''
      ].join(' ').toLowerCase();
      return synonyms.some((t) => haystack.indexOf(t) !== -1);
    });
    if (extra.length) this.state.searchResults = this.state.searchResults.concat(extra);
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
   * B5b：listbox/option 语义 + activeIndex 状态渲染（aria-selected）；鼠标
   * 悬停同步高亮（与键盘高亮同一状态源，不另起一套 hover 样式）
   */
  showSearchSuggestions() {
    if (!this.elements.searchSuggestions) return;

    // 清空容器
    this.elements.searchSuggestions.innerHTML = '';

    // 如果没有搜索建议，隐藏容器
    if (this.state.searchSuggestions.length === 0) {
      this.hideSearchSuggestions();
      return;
    }

    // 显示容器（B5b：listbox 语义）
    this.elements.searchSuggestions.setAttribute('role', 'listbox');
    this.elements.searchSuggestions.setAttribute('aria-label', '搜索建议');
    this.elements.searchSuggestions.style.display = 'block';
    if (this.elements.searchInput) {
      this.elements.searchInput.setAttribute('aria-expanded', 'true');
    }

    // 创建建议项（实战检验修复: 后端建议形如 {text,highlight,popularity},
    // 兼容字符串与对象两种形状, 此前直接赋值对象渲染成 [object Object]）
    this.state.searchSuggestions.slice(0, this.options.maxSuggestions).forEach((suggestion, index) => {
      const suggestionText = typeof suggestion === 'string'
        ? suggestion
        : (suggestion && suggestion.text) || '';
      if (!suggestionText) return;
      const item = document.createElement('div');
      item.className = 'search-suggestion-item';
      item.id = `${this.options.searchSuggestionsId}-option-${index}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.textContent = suggestionText;

      // 添加点击事件
      item.addEventListener('click', () => {
        if (this.elements.searchInput) {
          this.elements.searchInput.value = suggestionText;
        }
        this.performSearch(suggestionText);
      });

      // B5b：鼠标悬停与键盘高亮同源（不抢占键盘焦点）
      item.addEventListener('mouseenter', () => {
        this.activeIndex = index;
        this.updateSuggestionActive();
      });

      this.elements.searchSuggestions.appendChild(item);
    });

    this.updateSuggestionActive();
  }

  /**
   * 隐藏搜索建议
   */
  hideSearchSuggestions() {
    if (this.elements.searchSuggestions) {
      this.elements.searchSuggestions.style.display = 'none';
    }
    // B5b：combobox 状态收口
    this.activeIndex = -1;
    if (this.elements.searchInput) {
      this.elements.searchInput.setAttribute('aria-expanded', 'false');
      this.elements.searchInput.removeAttribute('aria-activedescendant');
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

    // 求真修复(2026-10-04): loadPopularSearches → showPopularSearches →
    // 空数据时再调 loadPopularSearches = 无限互调至栈溢出。
    // load 调用方已保证有数据(或 mock); 空数据显示提示即可, 不再回调 load。

    // B13：数据还在途（init 已不 await load）——此刻不渲染"暂无热门搜索"
    // 假空态，加载完成时 _fetchPopularSearches 会自行重渲
    if ((!this.state.popularSearches || this.state.popularSearches.length === 0)
        && this._popularLoadPromise) {
      return;
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
    
    // 如果没有搜索结果，显示无结果提示（香港席 M7：voice-sheet 三态承诺——
    // 乱词搜索不该是一片空白；文案从容，附两枚推荐词把人领回去）
    if (this.state.searchResults.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-search-results';
      noResults.textContent = '没找到这只——它可能还在路上。';

      const suggest = document.createElement('div');
      suggest.className = 'no-search-results-suggest';
      const suggestLabel = document.createElement('span');
      suggestLabel.className = 'no-search-results-suggest-label';
      suggestLabel.textContent = '不如看看：';
      suggest.appendChild(suggestLabel);
      ['波士顿包', '湖蓝锁扣手提包'].forEach(term => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'no-search-results-chip';
        chip.textContent = term;
        chip.addEventListener('click', () => {
          if (this.elements.searchInput) {
            this.elements.searchInput.value = term;
          }
          this.performSearch(term);
        });
        suggest.appendChild(chip);
      });
      noResults.appendChild(suggest);
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
  /**
   * 创建产品卡片（M7·B2+B10 重构）
   * 结构复用首页 bento 单格卡（.bento-card/.cell-fig/.cell-body——bento.css 已随页面加载），
   * 图与名为双锚点链接直入 PDP（product.html?id=8 位零填充，与 home-products 卡片同口径）；
   * 五星与评价计数删除（假社会证明），零评价态换"首批上架，来做第一个"；
   * 死按钮（原加入购物车/收藏 console.log 桩）删除——加购在 PDP 内完成，不在搜索结果里假装。
   * 插值统一 escapeHtml（js/utils/escape-html.js 由页面先载）；价格走 formatPrice。
   */
  createProductCard(product) {
    const esc = (v) => escapeHtml(String(v ?? ''));
    const name = product.name ? String(product.name) : 'Reich 单品';
    const pdpHref = this.pdpUrl(product);

    const card = document.createElement('article');
    card.className = 'bento-card reich-product-card';
    card.setAttribute('itemscope', '');
    card.setAttribute('itemtype', 'https://schema.org/Product');
    if (product.id != null) card.dataset.productId = String(product.id);

    const inner = document.createElement('div');
    inner.className = 'cell-inner';

    // 图锚点：figure 链接化（可点入 PDP）
    const fig = document.createElement('a');
    fig.className = 'card-fig cell-fig';
    if (pdpHref) fig.href = pdpHref;
    fig.setAttribute('aria-label', name);
    const img = document.createElement('img');
    img.className = 'reich-product-image';
    img.src = product.image || product.mainImage || '/images/default-product.png';
    img.alt = 'Reich ' + name;
    img.loading = 'lazy';
    img.decoding = 'async';
    fig.appendChild(img);

    const body = document.createElement('div');
    body.className = 'cell-body';

    // 名锚点：h3 内联链接（双锚不包卡——bag/心形若日后挂入不受牵连）
    const h3 = document.createElement('h3');
    h3.className = 'cell-name reich-product-name';
    h3.setAttribute('itemprop', 'name');
    if (pdpHref) {
      const a = document.createElement('a');
      a.href = pdpHref;
      a.textContent = name;
      h3.appendChild(a);
    } else {
      h3.textContent = name;
    }

    const desc = document.createElement('p');
    desc.className = 'cell-desc';
    desc.textContent = product.description ? String(product.description) : name + '，本季上新，慢慢挑。';

    const meta = document.createElement('div');
    meta.className = 'cell-meta';
    const price = document.createElement('p');
    price.className = 'reich-product-price';
    price.style.margin = '0';
    price.textContent = typeof formatPrice === 'function'
      ? formatPrice(Number(product.price) || 0)
      : '¥' + (Number(product.price) || 0);

    // B10: 零评价诚实态（首批上架，来做第一个）——不上假五星
    const social = document.createElement('span');
    social.className = 'reich-product-social';
    social.style.fontSize = 'var(--text-caption, 0.6875rem)';
    social.style.color = 'var(--ink-soft)';
    social.textContent = !product.reviewCount ? '首批上架，来做第一个' : '';

    meta.appendChild(price);
    if (social.textContent) meta.appendChild(social);

    body.appendChild(h3);
    body.appendChild(desc);
    body.appendChild(meta);
    inner.appendChild(fig);
    inner.appendChild(body);
    card.appendChild(inner);

    // 卡片点击兜底（点在卡空白处也进 PDP；链接已在键盘焦点路径上）
    card.addEventListener('click', (event) => {
      if (event.target.closest('a') || event.target.closest('button')) return;
      if (pdpHref) window.location.href = pdpHref;
    });

    return card;
  }

  /** PDP 深链 id 口径：8 位零填充（与 home-products/PDP ?id= 一致）；
   *  API 数字 id 直补零，mock 的 prod-003 取尾数字归一；无数字 id 不出链接。 */
  pdpUrl(product) {
    const raw = String(product.id ?? '');
    let num = null;
    if (/^\d+$/.test(raw)) num = Number(raw);
    else {
      const m = raw.match(/(\d+)$/);
      if (m) num = Number(m[1]);
    }
    return num ? 'product.html?id=' + String(num).padStart(8, '0') : null;
  }

  /**
   * 处理产品选择
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
      name: '渐变褶皱手袋',
      category: '手袋',
      price: 299,
      originalPrice: null,
      image: 'images/products/product-1.jpg',
      description: '绿到橙再到紫，渐变在褶皱上慢慢晕开，紫红提手一拎就走。',
      rating: 4.8,
      reviewCount: 124,
      inStock: true,
      tags: ['渐变', '褶皱', '手袋']
    },
    {
      id: 'prod-002',
      name: '花语皮革手提包',
      category: '手提包',
      price: 229,
      originalPrice: null,
      image: 'images/products/product-5.jpg',
      description: '棕榈叶与粉花朵开在蓝波浪纹上，银色大圆环一拎就走。',
      rating: 4.6,
      reviewCount: 89,
      inStock: true,
      tags: ['印花', '手提包', '花语']
    },
    {
      id: 'prod-003',
      name: '湖蓝锁扣手提包',
      category: '手提包',
      price: 189,
      originalPrice: null,
      image: 'images/products/product-3.jpg',
      description: '湖蓝色光面皮革，白色矩形锁扣配一点金色五金。',
      rating: 4.9,
      reviewCount: 67,
      inStock: true,
      tags: ['锁扣手提包', '手提包', '湖蓝']
    },
    {
      id: 'prod-004',
      name: '双色糖果链条包',
      category: '斜挎包',
      price: 168,
      originalPrice: null,
      image: 'images/products/product-4.jpg',
      description: '薄荷绿与樱花粉各一只，挂在银色链条上晒太阳。',
      rating: 4.7,
      reviewCount: 156,
      inStock: true,
      tags: ['链条包', '斜挎包', '糖果色']
    },
    {
      id: 'prod-005',
      name: '黑皮波士顿包',
      category: '手提包',
      price: 259,
      originalPrice: null,
      image: 'images/products/product-2.jpg',
      description: '黑色粒面皮革，双提手加一道皮带扣，精神又稳当。',
      rating: 4.5,
      reviewCount: 43,
      inStock: true,
      tags: ['手提包', '波士顿包', '皮革']
    }
  ];

  // 根据查询过滤产品（B4：同义词互认——"手袋/包/提包/挎包"同组词全命中）
  let filteredProducts = allProducts;

  if (query) {
    const queryTerms = this.expandQuery(query).map((t) => t.toLowerCase());
    filteredProducts = allProducts.filter(product =>
      queryTerms.some(term =>
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.tags.some(tag => tag.toLowerCase().includes(term))
      )
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