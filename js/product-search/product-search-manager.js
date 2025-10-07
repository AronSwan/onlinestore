// 用途：产品搜索管理器核心实现
// 依赖文件：index.html (通过全局对象使用)
// 作者：AI助手
// 时间：2025-09-26 12:30:00

/**
 * 产品搜索管理器类 - 处理产品搜索、筛选和展示
 */
class ProductSearchManager {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.options = options;
        this.state = { initialized: false };
        this.dependencies = {};
        this.containers = {};
        this.eventCallbacks = {};
        this.searchCore = null;
        this.searchHistory = [];
        
        // 初始化搜索核心
        this.initSearchCore();
    }
    
    /**
     * 设置依赖项
     * @param {Object} dependencies - 依赖项对象
     */
    setDependencies(dependencies) {
        console.log('ProductSearchManager: 设置依赖项', dependencies);
        this.dependencies = {
            ...this.dependencies,
            ...dependencies
        };
        return this;
    }
    
    /**
     * 设置容器元素
     * @param {Object} containers - 容器元素对象
     */
    setContainers(containers) {
        console.log('ProductSearchManager: 设置容器', containers);
        this.containers = {
            ...this.containers,
            ...containers
        };
        return this;
    }
    
    /**
     * 设置事件回调
     * @param {Object} callbacks - 事件回调函数对象
     */
    setEventCallbacks(callbacks) {
        console.log('ProductSearchManager: 设置事件回调', callbacks);
        this.eventCallbacks = {
            ...this.eventCallbacks,
            ...callbacks
        };
        return this;
    }
    
    /**
     * 初始化搜索核心
     */
    initSearchCore() {
        // 创建搜索核心实例
        this.searchCore = {
            // 加载用户偏好设置
            loadUserPreferences: async () => {
                console.log('搜索核心: 加载用户偏好设置');
                // 返回模拟的用户偏好设置
                return {
                    search: {
                        history: ['智能手表', '蓝牙耳机', '运动鞋'],
                        suggestions: ['智能手表', '蓝牙耳机', '运动鞋', '编程入门指南', '设计思维']
                    },
                    filters: {},
                    sort: {},
                    view: {
                        mode: 'grid',
                        itemsPerPage: 12
                    }
                };
            },
            
            // 执行搜索
            performSearch: async (query, filters = {}, options = {}) => {
                console.log('搜索核心: 执行搜索', { query, filters, options });
                
                try {
                    // 获取模拟产品数据
                    const products = window.mockProducts || this.getMockProducts();
                    
                    // 过滤产品
                    let filteredProducts = products;
                    
                    // 根据关键词过滤
                    if (query) {
                        const lowerQuery = query.toLowerCase();
                        filteredProducts = filteredProducts.filter(product => 
                            product.name.toLowerCase().includes(lowerQuery) ||
                            product.description.toLowerCase().includes(lowerQuery) ||
                            (product.keywords && product.keywords.some(k => k.toLowerCase().includes(lowerQuery)))
                        );
                    }
                    
                    // 根据分类过滤
                    if (filters.category && filters.category.length > 0) {
                        filteredProducts = filteredProducts.filter(product => 
                            filters.category.includes(product.category)
                        );
                    }
                    
                    // 根据价格范围过滤
                    if (filters.minPrice !== undefined) {
                        filteredProducts = filteredProducts.filter(product => 
                            product.price >= filters.minPrice
                        );
                    }
                    
                    if (filters.maxPrice !== undefined) {
                        filteredProducts = filteredProducts.filter(product => 
                            product.price <= filters.maxPrice
                        );
                    }
                    
                    // 排序
                    if (options.sortBy) {
                        filteredProducts.sort((a, b) => {
                            const dir = options.sortOrder === 'desc' ? -1 : 1;
                            if (a[options.sortBy] < b[options.sortBy]) return -1 * dir;
                            if (a[options.sortBy] > b[options.sortBy]) return 1 * dir;
                            return 0;
                        });
                    }
                    
                    return {
                        success: true,
                        results: filteredProducts,
                        total: filteredProducts.length
                    };
                } catch (error) {
                    console.error('搜索核心: 搜索出错', error);
                    return {
                        success: false,
                        error: error.message,
                        results: [],
                        total: 0
                    };
                }
            },
            
            // 获取产品列表
            getProducts: async (options = {}) => {
                console.log('搜索核心: 获取产品列表', options);
                const products = window.mockProducts || this.getMockProducts();
                return { success: true, results: products, total: products.length };
            },
            
            // 其他必要方法
            setSearchHistory: (history) => {
                console.log('搜索核心: 设置搜索历史', history);
            },
            
            setSearchSuggestions: (suggestions) => {
                console.log('搜索核心: 设置搜索建议', suggestions);
            },
            
            getSearchHistory: () => {
                console.log('搜索核心: 获取搜索历史');
                return ['智能手表', '蓝牙耳机', '运动鞋'];
            }
        };
    }
    
    /**
     * 获取模拟产品数据
     * @returns {Array} 产品数据数组
     */
    getMockProducts() {
        return [
            {
                id: '1',
                name: '智能手机',
                price: 2999,
                originalPrice: 3499,
                category: 'electronics',
                color: 'black',
                brand: 'BrandA',
                rating: 4.5,
                reviewCount: 128,
                image: 'https://via.placeholder.com/300x200?text=Smartphone',
                description: '高性能智能手机，配备先进的处理器和摄像头系统。',
                keywords: ['手机', '智能', '通讯', '电子产品'],
                inStock: true,
                discount: 14
            },
            {
                id: '2',
                name: '笔记本电脑',
                price: 5999,
                originalPrice: 6999,
                category: 'electronics',
                color: 'silver',
                brand: 'BrandB',
                rating: 4.7,
                reviewCount: 256,
                image: 'https://via.placeholder.com/300x200?text=Laptop',
                description: '轻薄便携的笔记本电脑，适合办公和学习使用。',
                keywords: ['电脑', '笔记本', '办公', '电子产品'],
                inStock: true,
                discount: 14
            },
            {
                id: '3',
                name: '休闲T恤',
                price: 99,
                originalPrice: 129,
                category: 'clothing',
                color: 'white',
                brand: 'BrandC',
                rating: 4.2,
                reviewCount: 64,
                image: 'https://via.placeholder.com/300x200?text=T-Shirt',
                description: '舒适的纯棉T恤，适合日常休闲穿着。',
                keywords: ['T恤', '服装', '休闲', '纯棉'],
                inStock: true,
                discount: 23
            },
            {
                id: '4',
                name: '牛仔裤',
                price: 199,
                originalPrice: 249,
                category: 'clothing',
                color: 'blue',
                brand: 'BrandA',
                rating: 4.3,
                reviewCount: 96,
                image: 'https://via.placeholder.com/300x200?text=Jeans',
                description: '经典款牛仔裤，百搭时尚，适合各种场合。',
                keywords: ['牛仔裤', '服装', '休闲', '百搭'],
                inStock: true,
                discount: 20
            },
            {
                id: '5',
                name: '咖啡机',
                price: 899,
                originalPrice: 1099,
                category: 'home',
                color: 'black',
                brand: 'BrandB',
                rating: 4.6,
                reviewCount: 128,
                image: 'https://via.placeholder.com/300x200?text=Coffee+Maker',
                description: '全自动咖啡机，一键制作多种咖啡饮品。',
                keywords: ['咖啡机', '家电', '厨房', '咖啡'],
                inStock: true,
                discount: 18
            },
            {
                id: '6',
                name: '台灯',
                price: 149,
                originalPrice: 199,
                category: 'home',
                color: 'white',
                brand: 'BrandC',
                rating: 4.1,
                reviewCount: 42,
                image: 'https://via.placeholder.com/300x200?text=Desk+Lamp',
                description: 'LED护眼台灯，多档调光，适合阅读和工作。',
                keywords: ['台灯', '灯具', 'LED', '护眼'],
                inStock: true,
                discount: 25
            }
        ];
    }
    
    /**
     * 初始化产品搜索管理器
     * @returns {Promise} 初始化结果Promise
     */
    async init() {
        console.log('ProductSearchManager: 开始初始化...');
        
        try {
            // 检查必要的容器
            if (!this.containers.products) {
                console.warn('ProductSearchManager: 未找到产品容器，尝试创建...');
                // 尝试创建产品容器
                this.createDefaultContainers();
            }
            
            // 加载用户偏好设置
            const userPreferences = await this.searchCore.loadUserPreferences();
            console.log('ProductSearchManager: 用户偏好设置已加载');
            
            // 设置搜索历史
            if (userPreferences.search && userPreferences.search.history) {
                this.searchHistory = userPreferences.search.history;
            }
            
            // 初始化搜索功能
            this.initializeSearch();
            
            // 初始化筛选功能
            this.initializeFilters();
            
            // 初始化结果展示
            this.initializeResults();
            
            // 设置初始化状态
            this.state.initialized = true;
            console.log('ProductSearchManager: 初始化完成');
            
            // 触发初始化完成事件
            if (this.eventCallbacks.onInitComplete) {
                this.eventCallbacks.onInitComplete();
            }
            
            // 加载默认产品列表
            await this.loadDefaultProducts();
            
            return this;
        } catch (error) {
            console.error('ProductSearchManager: 初始化失败', error);
            
            // 触发错误事件
            if (this.eventCallbacks.onError) {
                this.eventCallbacks.onError(error);
            }
            
            // 尝试简化初始化
            this.state.initialized = true;
            console.log('ProductSearchManager: 简化初始化完成');
            
            // 直接显示产品
            this.showDefaultProducts();
            
            return this;
        }
    }
    
    /**
     * 创建默认容器
     */
    createDefaultContainers() {
        // 查找产品容器或创建一个
        let productsContainer = document.getElementById('product-container');
        if (!productsContainer) {
            productsContainer = document.createElement('div');
            productsContainer.id = 'product-container';
            productsContainer.className = 'products-container';
            
            // 尝试找到合适的位置插入
            const productsSection = document.querySelector('.products-section');
            if (productsSection) {
                productsSection.appendChild(productsContainer);
            } else {
                document.body.appendChild(productsContainer);
            }
        }
        
        this.containers.products = productsContainer;
    }
    
    /**
     * 初始化搜索功能
     */
    initializeSearch() {
        console.log('ProductSearchManager: 初始化搜索功能');
        
        // 查找搜索输入框
        const searchInput = document.getElementById('search-input') || 
                          this.containers.searchInput;
        
        if (searchInput) {
            // 添加搜索事件监听
            searchInput.addEventListener('input', this.handleSearchInput.bind(this));
            searchInput.addEventListener('keypress', this.handleSearchKeyPress.bind(this));
        }
        
        // 显示搜索历史
        this.displaySearchHistory();
    }
    
    /**
     * 初始化筛选功能
     */
    initializeFilters() {
        console.log('ProductSearchManager: 初始化筛选功能');
        
        // 查找筛选容器
        const filtersContainer = this.containers.filters || 
                                document.getElementById('filters-container');
        
        if (filtersContainer) {
            // 添加筛选器事件监听
            const filterCheckboxes = filtersContainer.querySelectorAll('input[type="checkbox"]');
            filterCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', this.handleFilterChange.bind(this));
            });
            
            const filterRadios = filtersContainer.querySelectorAll('input[type="radio"]');
            filterRadios.forEach(radio => {
                radio.addEventListener('change', this.handleFilterChange.bind(this));
            });
        }
        
        // 初始化排序功能
        this.initializeSorting();
    }
    
    /**
     * 初始化排序功能
     */
    initializeSorting() {
        console.log('ProductSearchManager: 初始化排序功能');
        
        // 查找排序容器
        const sortContainer = this.containers.sort || 
                             document.getElementById('sort-container');
        
        if (sortContainer) {
            // 添加排序选项事件监听
            const sortOptions = sortContainer.querySelectorAll('.sort-option');
            sortOptions.forEach(option => {
                option.addEventListener('click', this.handleSortOptionClick.bind(this));
            });
        }
    }
    
    /**
     * 初始化结果展示
     */
    initializeResults() {
        console.log('ProductSearchManager: 初始化结果展示');
        
        // 确保有产品容器
        if (this.containers.products) {
            // 清空容器
            this.containers.products.innerHTML = '';
        }
    }
    
    /**
     * 加载默认产品列表
     */
    async loadDefaultProducts() {
        try {
            const result = await this.searchCore.getProducts();
            if (result.success && result.results) {
                this.displayProducts(result.results);
                this.updateProductsCount(result.total);
                
                // 触发搜索完成事件
                if (this.eventCallbacks.onSearchComplete) {
                    this.eventCallbacks.onSearchComplete(result.results);
                }
            }
        } catch (error) {
            console.error('ProductSearchManager: 加载默认产品失败', error);
            this.showDefaultProducts();
        }
    }
    
    /**
     * 显示默认产品（降级方案）
     */
    showDefaultProducts() {
        const mockProducts = this.getMockProducts();
        this.displayProducts(mockProducts);
        this.updateProductsCount(mockProducts.length);
    }
    
    /**
     * 显示产品列表
     * @param {Array} products - 产品数组
     */
    displayProducts(products) {
        if (!this.containers.products) {
            console.error('ProductSearchManager: 缺少产品容器');
            return;
        }
        
        // 清空容器
        this.containers.products.innerHTML = '';
        
        if (!products || products.length === 0) {
            // 显示无结果提示
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = '没有找到匹配的产品';
            this.containers.products.appendChild(noResults);
            return;
        }
        
        // 创建并添加产品卡片
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">¥${product.price}</div>
                    <div class="product-rating">
                        <div class="product-rating-stars">★★★★★</div>
                        <div class="product-rating-count">${product.reviewCount || 0} 评价</div>
                    </div>
                    <div class="product-actions">
                        <button class="product-button add-to-cart-button">加入购物车</button>
                        <button class="product-button add-to-wishlist-button">收藏</button>
                    </div>
                </div>
            `;
            
            // 添加点击事件
            card.addEventListener('click', () => {
                if (this.eventCallbacks.onProductSelect) {
                    this.eventCallbacks.onProductSelect(product);
                }
            });
            
            this.containers.products.appendChild(card);
        });
    }
    
    /**
     * 更新产品计数
     * @param {number} count - 产品数量
     */
    updateProductsCount(count) {
        const productsCount = this.containers.productsCount || 
                             document.getElementById('products-count');
        
        if (productsCount) {
            productsCount.textContent = `显示 ${count} 个产品`;
        }
    }
    
    /**
     * 显示搜索历史
     */
    displaySearchHistory() {
        const searchHistoryElement = this.containers.searchHistory || 
                                   document.getElementById('search-history');
        
        if (searchHistoryElement && this.searchHistory.length > 0) {
            searchHistoryElement.innerHTML = '';
            
            this.searchHistory.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'search-history-item';
                historyItem.textContent = item;
                
                // 添加点击事件
                historyItem.addEventListener('click', () => {
                    const searchInput = document.getElementById('search-input') || 
                                      this.containers.searchInput;
                    if (searchInput) {
                        searchInput.value = item;
                        this.performSearch(item);
                    }
                });
                
                searchHistoryElement.appendChild(historyItem);
            });
        }
    }
    
    /**
     * 处理搜索输入
     * @param {Event} event - 输入事件
     */
    handleSearchInput(event) {
        const query = event.target.value.trim();
        // 可以在这里实现搜索建议功能
    }
    
    /**
     * 处理搜索按键
     * @param {Event} event - 按键事件
     */
    handleSearchKeyPress(event) {
        if (event.key === 'Enter') {
            const query = event.target.value.trim();
            if (query) {
                this.performSearch(query);
            }
        }
    }
    
    /**
     * 执行搜索
     * @param {string} query - 搜索关键词
     */
    async performSearch(query) {
        console.log('ProductSearchManager: 执行搜索', query);
        
        // 显示加载指示器
        this.showLoading(true);
        
        try {
            // 获取筛选条件
            const filters = this.getFilters();
            
            // 执行搜索
            const result = await this.searchCore.performSearch(query, filters);
            
            if (result.success) {
                // 显示结果
                this.displayProducts(result.results);
                this.updateProductsCount(result.total);
                
                // 添加到搜索历史
                if (query && !this.searchHistory.includes(query)) {
                    this.searchHistory.unshift(query);
                    if (this.searchHistory.length > 10) {
                        this.searchHistory.pop();
                    }
                    this.displaySearchHistory();
                }
                
                // 触发搜索完成事件
                if (this.eventCallbacks.onSearchComplete) {
                    this.eventCallbacks.onSearchComplete(result.results);
                }
            } else {
                console.error('ProductSearchManager: 搜索失败', result.error);
                
                // 触发错误事件
                if (this.eventCallbacks.onError) {
                    this.eventCallbacks.onError(new Error(result.error));
                }
            }
        } catch (error) {
            console.error('ProductSearchManager: 搜索出错', error);
            
            // 触发错误事件
            if (this.eventCallbacks.onError) {
                this.eventCallbacks.onError(error);
            }
        } finally {
            // 隐藏加载指示器
            this.showLoading(false);
        }
    }
    
    /**
     * 获取筛选条件
     * @returns {Object} 筛选条件对象
     */
    getFilters() {
        const filters = {};
        
        // 查找筛选容器
        const filtersContainer = this.containers.filters || 
                                document.getElementById('filters-container');
        
        if (filtersContainer) {
            // 获取类别筛选
            const categoryCheckboxes = filtersContainer.querySelectorAll('input[id^="filter-"]:checked');
            const categories = Array.from(categoryCheckboxes).map(checkbox => checkbox.value);
            if (categories.length > 0) {
                filters.category = categories;
            }
            
            // 获取价格范围
            const priceMin = document.getElementById('price-min');
            const priceMax = document.getElementById('price-max');
            if (priceMin && priceMin.value) {
                filters.minPrice = parseFloat(priceMin.value);
            }
            if (priceMax && priceMax.value) {
                filters.maxPrice = parseFloat(priceMax.value);
            }
            
            // 获取评分筛选
            const ratingRadio = filtersContainer.querySelector('input[name="rating"]:checked');
            if (ratingRadio && ratingRadio.value) {
                filters.minRating = parseFloat(ratingRadio.value);
            }
        }
        
        return filters;
    }
    
    /**
     * 处理筛选条件变化
     * @param {Event} event - 变化事件
     */
    handleFilterChange(event) {
        // 获取搜索输入框的值
        const searchInput = document.getElementById('search-input') || 
                          this.containers.searchInput;
        const query = searchInput ? searchInput.value.trim() : '';
        
        // 重新执行搜索
        this.performSearch(query);
    }
    
    /**
     * 处理排序选项点击
     * @param {Event} event - 点击事件
     */
    handleSortOptionClick(event) {
        // 更新活跃排序选项
        const sortOptions = event.target.parentElement.querySelectorAll('.sort-option');
        sortOptions.forEach(option => {
            option.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // 获取搜索输入框的值
        const searchInput = document.getElementById('search-input') || 
                          this.containers.searchInput;
        const query = searchInput ? searchInput.value.trim() : '';
        
        // 重新执行搜索
        this.performSearch(query);
    }
    
    /**
     * 显示或隐藏加载指示器
     * @param {boolean} show - 是否显示
     */
    showLoading(show) {
        const loadingIndicator = this.containers.loading || 
                                document.getElementById('loading-indicator');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
        
        // 禁用或启用加载更多按钮
        const loadMoreButton = this.containers.loadMore || 
                              document.getElementById('load-more-button');
        
        if (loadMoreButton) {
            loadMoreButton.disabled = show;
        }
    }
}

// 创建默认实例
const defaultProductSearchManager = new ProductSearchManager();

// 导出模块
export { ProductSearchManager };
export default defaultProductSearchManager;

// 添加到全局对象，以便在HTML中直接使用
if (typeof window !== 'undefined') {
    window.ProductSearchManager = ProductSearchManager;
    window.defaultProductSearchManager = defaultProductSearchManager;
}