/**
 * 懒加载器和代码分割模块
 * 负责按需加载路由、组件和脚本模块，提升应用性能
 *
 * @class LazyLoader
 * @description 实现了基于Intersection Observer的懒加载机制
 * 支持路由级别的代码分割和组件级别的按需加载
 */
class LazyLoader {
  /**
     * 创建懒加载器实例
     * @constructor
     * @param {Object} dependencies - 依赖注入对象
     */
  constructor(dependencies = {}) {
    // 使用依赖注入获取依赖
    this.domUtils = dependencies.domUtils || window.diContainer?.get('domUtils');
    this.config = dependencies.config || window.config?.getModule('lazyLoader') || window.CONSTANTS?.LAZY_LOADER;
    this.utils = dependencies.utils || window.utils;
    this.window = dependencies.window || window;
    this.document = dependencies.document || document;

    /** @type {Map<string, any>} 已加载模块的缓存 */
    this.modules = new Map();

    /** @type {Set<string>} 已完成加载的模块标识集合 */
    this.loadedModules = new Set();

    /** @type {Set<string>} 正在加载中的模块标识集合 */
    this.loadingModules = new Set();

    /** @type {Object} 懒加载配置选项 - 使用统一配置模块 */
    this.options = {
      ...(this.config || {
        rootMargin: window.MAGIC_NUMBERS?.LAZY_LOADER?.ROOT_MARGIN || '50px',
        threshold: window.MAGIC_NUMBERS?.LAZY_LOADER?.THRESHOLD || 0.1,
        retryCount: window.MAGIC_NUMBERS?.LIMITS?.MAX_RETRIES || 3,
        retryDelay: window.MAGIC_NUMBERS?.TIMEOUTS?.RETRY_DELAY || 1000
      })
    };

    // 初始化懒加载器
    this.init();
  }

  /**
     * 初始化懒加载器
     * 设置Intersection Observer和各种懒加载机制
     * @private
     */
  init() {
    // 检查浏览器是否支持Intersection Observer API
    if ('IntersectionObserver' in this.window) {
      /** @type {IntersectionObserver} 用于监听元素可见性的观察器 */
      this.observer = new this.window.IntersectionObserver(
        this.handleIntersection.bind(this),
        this.options
      );
    } else {
      console.warn('IntersectionObserver not supported, falling back to scroll events');
    }

    // 初始化路由级别的懒加载
    this.initRouteLazyLoading();

    // 初始化组件级别的懒加载
    this.initComponentLazyLoading();

    console.log('LazyLoader initialized successfully');
  }

  /**
     * 处理Intersection Observer的回调
     * 当元素进入视口时触发模块加载
     *
     * @param {IntersectionObserverEntry[]} entries - 观察的元素条目数组
     * @private
     */
  handleIntersection(entries) {
    entries.forEach(entry => {
      // 检查元素是否进入视口
      if (entry.isIntersecting) {
        const element = entry.target;

        // 从元素的data属性中获取模块信息
        const moduleType = element.dataset.lazyModule;  // 模块类型: route/component/script
        const moduleName = element.dataset.lazyName;    // 模块名称

        // 验证模块信息完整性后开始加载
        if (moduleType && moduleName) {
          this.loadModule(moduleType, moduleName, element);
        }
      }
    });
  }

  /**
     * 初始化路由级别的懒加载
     * 设置导航链接点击事件和浏览器历史记录监听
     * 支持事件委托系统和直接事件监听两种方式
     * 包含完整的错误处理和降级支持
     *
     * @private
     * @returns {void}
     *
     * @example
     * // 在构造函数中自动调用
     * this.initRouteLazyLoading();
     */
  initRouteLazyLoading() {
    // 优先使用事件委托系统处理导航点击，提高性能
    if (this.utils && this.utils.eventDelegator) {
      const navLinksSelector = window.DOM_SELECTORS?.NAVIGATION?.NAV_LINKS || '.nav-links a';
      this.utils.eventDelegator.on(navLinksSelector, (event) => {
        event.preventDefault(); // 阻止默认的页面跳转行为
        const route = this.getRouteFromLink(event.target);
        this.loadRoute(route);
      });
    } else {
      // 备用方案：直接事件监听，确保在事件委托系统不可用时仍能正常工作
      const document = this.document || window.document;
      document.addEventListener('click', (event) => {
        const navLinksSelector = window.DOM_SELECTORS?.NAVIGATION?.NAV_LINKS || '.nav-links a';
        if (event.target.matches(navLinksSelector)) {
          event.preventDefault();
          const route = this.getRouteFromLink(event.target);
          this.loadRoute(route);
        }
      });
    }

    // 监听浏览器的前进/后退按钮事件
    // 确保用户使用浏览器导航时也能正确加载对应的路由模块
    this.window.addEventListener('popstate', (_event) => {
      const route = this.getCurrentRoute();
      this.loadRoute(route);
    });
  }

  /**
     * 初始化组件级别的懒加载
     * 扫描页面中所有标记为懒加载的组件并设置观察
     * 使用Intersection Observer API实现基于可见性的懒加载
     * 包含浏览器兼容性处理和降级方案
     *
     * @private
     * @returns {void}
     *
     * @example
     * // HTML中的懒加载组件标记
     * // <div data-lazy-module="component" data-lazy-name="product-card">
     * //   <div class="loading-placeholder">加载中...</div>
     * // </div>
     */
  initComponentLazyLoading() {
    // 查找页面中所有带有懒加载标记的组件
    // data-lazy-module: 模块类型，data-lazy-name: 模块名称
    const document = this.document || window.document;
    const lazySelector = window.DOM_SELECTORS?.LAZY_LOADER?.LAZY_COMPONENTS || '[data-lazy-module][data-lazy-name]';
    const lazyComponents = document.querySelectorAll(lazySelector);

    lazyComponents.forEach(component => {
      if (this.observer) {
        // 使用Intersection Observer监听元素可见性
        // 当元素进入视口时自动触发加载
        this.observer.observe(component);
      } else {
        // 浏览器不支持Intersection Observer时的回退方案
        // 立即加载所有组件以确保功能正常
        const moduleType = component.dataset.lazyModule;
        const moduleName = component.dataset.lazyName;
        this.loadModule(moduleType, moduleName, component);
      }
    });
  }

  /**
     * 从导航链接元素中提取路由名称
     * 解析href属性并转换为内部路由标识
     * 支持锦点链接和相对路径的解析
     * 自动处理空值和默认路由
     *
     * @private
     * @param {HTMLElement} link - 导航链接DOM元素
     * @returns {string} 路由名称，默认为'home'
     *
     * @example
     * const link = document.querySelector('a[href="#products"]');
     * const route = this.getRouteFromLink(link);
     * // 返回: 'products'
     */
  getRouteFromLink(link) {
    const href = link.getAttribute('href');
    // 处理锚点链接，移除#号前缀，空值或#默认为首页
    return href === '#' ? 'home' : href.replace('#', '');
  }

  /**
     * 获取当前页面的路由名称
     * 从URL的hash部分解析路由信息
     * 支持无hash情况下的默认路由处理
     * 自动移除URL中的#号前缀
     *
     * @private
     * @returns {string} 当前路由名称，默认为'home'
     *
     * @example
     * // URL: https://example.com/#products
     * const route = this.getCurrentRoute();
     * // 返回: 'products'
     *
     * // URL: https://example.com/
     * const route = this.getCurrentRoute();
     * // 返回: 'home'
     */
  getCurrentRoute() {
    // 获取URL中的hash部分，如果没有则默认为首页
    const hash = this.window.location.hash || '#home';
    // 移除#号前缀，返回纯路由名称
    return hash.replace('#', '');
  }

  /**
     * 加载指定路由的内容
     * 根据路由名称加载对应的模块，更新URL并触发相关事件
     * 包含加载状态管理和错误处理
     *
     * @param {string} route - 路由名称
     * @returns {Promise<void>} 路由加载完成的Promise
     * @public
     */
  async loadRoute(route) {
    try {
      // 显示加载状态
      this.showLoadingState();

      // 根据路由加载对应的模块
      const routeModules = {
        'home': 'home',
        '新品上市': 'new-arrivals',
        '热销商品': 'featured-products',
        '电子设备': 'electronics',
        '服饰配件': 'fashion',
        '关于我们': 'about'
      };

      const moduleName = routeModules[route] || 'home';

      // 加载路由模块
      await this.loadModule('route', moduleName);

      // 更新URL
      if (route !== 'home') {
        this.window.history.pushState({ route }, '', `#${route}`);
      } else {
        this.window.history.pushState({ route: 'home' }, '', '#');
      }

      // 隐藏加载状态
      this.hideLoadingState();

      // 触发路由加载完成事件
      this.window.dispatchEvent(new this.window.CustomEvent('routeLoaded', {
        detail: { route, moduleName }
      }));

    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'Route loading',
          severity: 'high',
          category: 'navigation',
          userMessage: '页面加载失败，请重试',
          route: route
        });
      } else {
        console.error('Route loading failed:', error);
      }
      this.hideLoadingState();
      this.showError('页面加载失败，请重试');
    }
  }

  /**
     * 加载指定类型和名称的模块
     * 支持路由、组件和脚本三种模块类型的懒加载
     * 包含完整的参数验证、错误处理和重试机制
     *
     * @param {string} type - 模块类型 ('route'|'component'|'script')
     * @param {string} name - 模块名称
     * @param {HTMLElement} [element=null] - 触发加载的DOM元素
     * @returns {Promise<void>} 加载完成的Promise
     * @throws {Error} 当模块类型未知或加载失败时抛出错误
     */
  async loadModule(type, name, element = null) {
    // 参数验证
    if (!type || typeof type !== 'string') {
      const error = new Error('Invalid module type provided');
      this.showError('模块类型无效', error);
      throw error;
    }

    if (!name || typeof name !== 'string') {
      const error = new Error('Invalid module name provided');
      this.showError('模块名称无效', error);
      throw error;
    }

    // 验证模块类型
    const validTypes = ['route', 'component', 'script'];
    if (!validTypes.includes(type)) {
      const error = new Error(`Unknown module type: ${type}`);
      this.showError(`未知的模块类型: ${type}`, error);
      throw error;
    }

    const moduleKey = `${type}:${name}`;

    try {
      // 如果模块已加载，直接显示并返回
      if (this.loadedModules.has(moduleKey)) {
        if (element) {
          this.showModule(element, type, name);
        }
        return;
      }

      // 如果模块正在加载，等待加载完成
      if (this.loadingModules.has(moduleKey)) {
        await this.waitForModule(moduleKey);
        if (element) {
          this.showModule(element, type, name);
        }
        return;
      }

      // 标记模块为加载中状态
      this.loadingModules.add(moduleKey);

      let module;

      // 根据模块类型选择相应的加载策略
      switch (type) {
      case 'route':
        module = await this.loadRouteModule(name);
        break;
      case 'component':
        module = await this.loadComponentModule(name);
        break;
      case 'script':
        module = await this.loadScriptModule(name);
        break;
      default:
        // 这个分支理论上不会执行，因为上面已经验证过类型
        throw new Error(`Unknown module type: ${type}`);
      }

      // 验证加载的内容
      if (!module) {
        throw new Error(`Module content is empty or invalid for ${moduleKey}`);
      }

      // 缓存加载成功的模块
      this.modules.set(moduleKey, module);
      this.loadedModules.add(moduleKey);

      // 显示模块内容
      if (element) {
        this.showModule(element, type, name);
      }

      // 触发模块加载完成事件
      window.dispatchEvent(new CustomEvent('moduleLoaded', {
        detail: { type, name, module }
      }));

    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'Module loading',
          severity: 'high',
          category: 'lazy-loading',
          userMessage: `模块 ${name} 加载失败`,
          moduleKey: moduleKey,
          type: type,
          name: name
        });
      } else {
        console.error(`Failed to load module ${moduleKey}:`, error);
      }

      // 实现重试机制，提高加载成功率
      if (this.shouldRetry(moduleKey)) {
        console.log(`重试加载模块: ${moduleKey}`);
        setTimeout(() => {
          this.loadingModules.delete(moduleKey);
          this.loadModule(type, name, element);
        }, this.options.retryDelay);
      } else {
        const userMessage = `模块 ${name} 加载失败`;
        this.showError(userMessage, error);
      }

      throw error;
    } finally {
      // 清理加载状态，允许后续重试
      this.loadingModules.delete(moduleKey);
    }
  }

  /**
     * 加载路由模块
     * 根据路由名称生成对应的路由模块对象，包含标题和内容
     * 支持异步加载和网络延迟模拟
     * 为不同路由提供个性化的内容生成
     *
     * @private
     * @param {string} name - 路由名称，用于确定要加载的路由模块
     * @returns {Promise<Object>} 包含title和content属性的路由模块对象
     * @returns {string} returns.title - 路由页面标题
     * @returns {string} returns.content - 路由页面HTML内容
     *
     * @example
     * const module = await this.loadRouteModule('products');
     * console.log(module.title); // '产品列表'
     * document.title = module.title;
     * document.querySelector('main').innerHTML = module.content;
     */
  async loadRouteModule(name) {
    // 模拟异步加载路由模块，实际项目中可能从服务器获取
    return new Promise((resolve) => {
      setTimeout(() => {
        // 定义所有可用的路由模块配置
        const routeModules = {
          'home': {
            title: '首页',
            content: this.generateHomeContent()
          },
          'new-arrivals': {
            title: '新品上市',
            content: this.generateNewArrivalsContent()
          },
          'featured-products': {
            title: '热销商品',
            content: this.generateFeaturedProductsContent()
          },
          'electronics': {
            title: '电子设备',
            content: this.generateElectronicsContent()
          },
          'fashion': {
            title: '服饰配件',
            content: this.generateFashionContent()
          },
          'about': {
            title: '关于我们',
            content: this.generateAboutContent()
          }
        };

        // 返回指定路由模块，如果不存在则返回首页模块
        resolve(routeModules[name] || routeModules.home);
      }, 300); // 模拟网络延迟
    });
  }

  /**
     * 加载组件模块
     * 根据组件名称生成对应的HTML内容和初始化逻辑
     * 支持可重用的UI组件和动态交互功能
     * 包含完整的组件生命周期管理
     *
     * @private
     * @param {string} name - 组件模块名称
     * @returns {Promise<Object>} 包含HTML和初始化函数的组件对象
     * @returns {string} returns.html - 组件的HTML结构
     * @returns {Function} [returns.init] - 组件初始化函数
     *
     * @example
     * const component = await this.loadComponentModule('product-card');
     * element.innerHTML = component.html;
     * if (component.init) {
     *   component.init(element);
     * }
     */
  async loadComponentModule(name) {
    // 模拟异步加载组件模块
    return new Promise((resolve) => {
      setTimeout(() => {
        const componentModules = {
          'product-card': this.generateProductCardComponent(),
          'newsletter': this.generateNewsletterComponent(),
          'testimonial': this.generateTestimonialComponent(),
          'features': this.generateFeaturesComponent()
        };

        resolve(componentModules[name]);
      }, 200);
    });
  }

  /**
     * 加载脚本模块
     * 动态加载JavaScript文件到页面中
     * 支持异步加载和错误处理
     * 自动管理脚本标签的创建和清理
     *
     * @private
     * @param {string} name - 脚本模块名称
     * @returns {Promise<Object>} 脚本加载结果对象
     * @returns {string} returns.name - 脚本名称
     * @returns {boolean} returns.loaded - 是否加载成功
     * @throws {Error} 当脚本加载失败时抛出错误
     *
     * @example
     * try {
     *   const result = await this.loadScriptModule('analytics');
     *   console.log(`脚本 ${result.name} 加载成功`);
     * } catch (error) {
     *   console.error('脚本加载失败:', error);
     * }
     */
  async loadScriptModule(name) {
    // 动态加载JavaScript文件
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `js/modules/${name}.js`;
      script.onload = () => resolve({ name, loaded: true });
      script.onerror = () => reject(new Error(`Failed to load script: ${name}`));
      document.head.appendChild(script);
    });
  }

  /**
     * 显示已加载的模块内容
     * 根据模块类型选择相应的显示策略
     * 支持路由、组件和脚本三种不同类型的模块
     * 自动选择最适合的渲染方式
     *
     * @private
     * @param {HTMLElement} element - 目标DOM元素
     * @param {string} type - 模块类型 ('route'|'component'|'script')
     * @param {string} name - 模块名称
     * @returns {void}
     */
  showModule(element, type, name) {
    const module = this.modules.get(`${type}:${name}`);
    if (!module) {return;}

    switch (type) {
    case 'route':
      this.showRouteContent(module);
      break;
    case 'component':
      this.showComponentContent(element, module);
      break;
    case 'script':
      // 脚本模块不需要显示内容
      break;
    }
  }

  /**
     * 显示路由模块的内容
     * 更新页面标题和主要内容区域
     * 自动重新初始化新内容中的懒加载组件
     * 保证SEO和可访问性的正确处理
     *
     * @private
     * @param {Object} routeModule - 路由模块对象
     * @param {string} routeModule.title - 页面标题
     * @param {string} routeModule.content - 页面HTML内容
     * @returns {void}
     */
  showRouteContent(routeModule) {
    const mainContent = document.querySelector('main .container');
    if (!mainContent) {return;}

    // 更新页面标题
    document.title = `${routeModule.title} - NexusShop`;

    // 更新内容
    if (window.Utils && window.Utils.setElementHTML) {
      window.Utils.setElementHTML(mainContent, routeModule.content, true); // 内部生成的安全HTML
    } else {
      mainContent.innerHTML = routeModule.content;
    }

    // 重新初始化懒加载组件
    this.initComponentLazyLoading();
  }

  /**
     * 显示组件模块的内容
     * 将组件HTML插入到指定元素并执行初始化
     * 支持组件的生命周期管理和事件绑定
     * 包含安全性检查和错误处理
     *
     * @private
     * @param {HTMLElement} element - 目标DOM元素
     * @param {Object} componentModule - 组件模块对象
     * @param {string} [componentModule.html] - 组件HTML内容
     * @param {Function} [componentModule.init] - 组件初始化函数
     * @returns {void}
     */
  showComponentContent(element, componentModule) {
    if (componentModule.html) {
      if (window.Utils && window.Utils.setElementHTML) {
        window.Utils.setElementHTML(element, componentModule.html, true); // 内部生成的安全HTML
      } else {
        element.innerHTML = componentModule.html;
      }
    }

    if (componentModule.init) {
      componentModule.init(element);
    }
  }

  /**
     * 等待指定模块加载完成
     * 用于处理并发加载同一模块的情况，避免重复加载
     * 通过轮询检查模块加载状态，包含超时机制防止无限等待
     *
     * @param {string} moduleKey - 模块的唯一标识键 (格式: "type:name")
     * @param {number} timeout - 超时时间（毫秒），默认30秒
     * @returns {Promise<void>} 当模块加载完成时resolve的Promise，超时时reject
     * @private
     */
  /**
     * 等待指定模块加载完成
     * 使用轮询机制检查模块是否已加载，支持超时控制
     *
     * @param {string} moduleKey - 模块的唯一标识键
     * @param {number} [timeout=30000] - 超时时间（毫秒），默认30秒
     * @returns {Promise<void>} 模块加载完成的Promise
     * @throws {Error} 当模块键无效、加载超时或检查过程中发生错误时抛出
     * @private
     */
  waitForModule(moduleKey, timeout = window.MAGIC_NUMBERS?.TIMEOUTS?.MODULE_LOAD_TIMEOUT || 30000) {
    return new Promise((resolve, reject) => {
      // 参数验证
      if (!moduleKey || typeof moduleKey !== 'string') {
        reject(new Error('Invalid moduleKey provided'));
        return;
      }

      const startTime = Date.now();

      // 定期检查模块是否已加载完成
      const checkInterval = setInterval(() => {
        try {
          // 检查是否超时
          if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            reject(new Error(`Module loading timeout: ${moduleKey}`));
            return;
          }

          if (this.loadedModules.has(moduleKey)) {
            // 模块加载完成，清理定时器并resolve
            clearInterval(checkInterval);
            resolve();
          }
        } catch (error) {
          // 处理检查过程中的异常
          clearInterval(checkInterval);
          reject(new Error(`Error while waiting for module ${moduleKey}: ${error.message}`));
        }
      }, window.MAGIC_NUMBERS?.TIMEOUTS?.MODULE_CHECK_INTERVAL || 50); // 每50ms检查一次，保持响应性
    });
  }

  /**
     * 检查模块加载失败时是否应该重试
     * 基于配置的重试次数限制决定是否继续尝试加载
     *
     * @param {string} moduleKey - 模块的唯一标识键
     * @returns {boolean} 如果应该重试返回true，否则返回false
     * @private
     */
  shouldRetry(moduleKey) {
    // 获取当前模块的重试次数，初始为0
    const retryCount = this.modules.get(`${moduleKey}:retryCount`) || 0;

    // 检查是否未超过最大重试次数限制
    if (retryCount < this.options.retryCount) {
      // 增加重试计数器
      this.modules.set(`${moduleKey}:retryCount`, retryCount + 1);
      return true;
    }

    // 已达到最大重试次数，不再重试
    return false;
  }

  /**
     * 显示全屏加载状态指示器
     * 在模块加载过程中向用户提供视觉反馈
     * 创建一个覆盖整个页面的加载动画
     * 包含自定义的加载动画和文字提示
     *
     * @private
     * @returns {void}
     *
     * @example
     * this.showLoadingState();
     * // ... 执行加载操作
     * this.hideLoadingState();
     */
  showLoadingState() {
    // 创建加载指示器容器元素
    const document = this.document || window.document;
    const loader = document.createElement('div');
    loader.id = 'lazy-loader';

    // 设置加载指示器的HTML结构
    const loaderHTML = `
            <div class="loader-overlay">
                <div class="loader-spinner"></div>
                <div class="loader-text">加载中...</div>
            </div>
        `;
    if (window.Utils && window.Utils.setElementHTML) {
      window.Utils.setElementHTML(loader, loaderHTML, true); // 内部生成的安全HTML
    } else {
      loader.innerHTML = loaderHTML;
    }

    // 设置全屏覆盖样式，确保加载指示器显示在最顶层
    loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

    // 将加载指示器添加到页面中
    document.body.appendChild(loader);
  }

  /**
     * 隐藏全屏加载状态指示器
     * 移除之前显示的加载动画，恢复正常页面显示
     * 安全地查找和移除加载指示器元素
     * 包含完整的错误处理
     *
     * @private
     * @returns {void}
     */
  hideLoadingState() {
    // 查找并移除加载指示器元素
    const document = this.document || window.document;
    const loader = document.getElementById('lazy-loader');
    if (loader) {
      loader.remove();
    }
  }

  /**
     * 显示错误信息给用户
     * 当模块加载失败时提供用户友好的错误提示
     * 支持显示详细错误信息用于调试
     *
     * @param {string} message - 用户友好的错误消息
     * @param {Error|null} error - 可选的详细错误对象，用于调试
     * @private
     */
  showError(message, error = null) {
    try {
      // 参数验证和清理
      const cleanMessage = message && typeof message === 'string'
        ? message.trim()
        : '加载过程中发生未知错误';

      // 记录详细错误信息到控制台
      if (error) {
        console.error('LazyLoader Error:', {
          message: cleanMessage,
          error: error,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('LazyLoader Error:', cleanMessage);
      }

      // 尝试使用全局通知系统
      if (this.utils && typeof this.utils.showNotification === 'function') {
        this.utils.showNotification(cleanMessage, 'error');
      } else if (window.utils && typeof window.utils.showNotification === 'function') {
        window.utils.showNotification(cleanMessage, 'error');
      } else {
        // 降级处理：使用原生alert作为备选方案
        console.warn('Global notification system not available, using alert as fallback');
        console.log(`错误: ${cleanMessage}`);
      }
    } catch (notificationError) {
      // 如果通知系统也失败，至少确保错误被记录
      console.error('Failed to show error notification:', notificationError);
      console.error('Original error message:', message);
    }
  }

  /**
     * 生成首页内容
     * 创建首页的HTML结构，包含英雄区域和产品展示
     *
     * @returns {string} 首页的HTML内容
     * @private
     */
  /**
     * 生成首页内容
     * 创建首页主要展示区域的HTML结构，包含英雄区域和产品介绍
     * 包含响应式设计和现代化的UI元素
     * 支持SEO优化和可访问性标准
     *
     * @private
     * @returns {string} 首页的HTML内容
     *
     * @example
     * const homeContent = this.generateHomeContent();
     * document.querySelector('main').innerHTML = homeContent;
     */
  generateHomeContent() {
    return `
            <section class="hero">
                <div class="container">
                    <div class="hero-content">
                        <div class="hero-text">
                            <h1>发现时尚科技新生活</h1>
                            <p>探索最新潮流商品，享受限时优惠。智能科技与时尚设计的完美融合，为您的生活增添无限可能。</p>
                            <a href="#" class="btn btn-primary">立即探索 <i class="fas fa-arrow-right"></i></a>
                        </div>
                        <div class="hero-image">
                            <img src="https://placehold.co/600x450/4f46e5/white?text=Premium+Products" alt="NexusShop 精品展示">
                        </div>
                    </div>
                </div>
            </section>
        `;
  }

  /**
     * 生成新品上市页面内容
     * 创建新品展示页面的HTML结构
     * 包含懒加载的产品卡片组件
     * 支持动态内容加载和无缝用户体验
     *
     * @private
     * @returns {string} 新品上市页面的HTML内容
     */
  generateNewArrivalsContent() {
    return `
            <section class="new-arrivals">
                <h2 class="section-title">新品上市</h2>
                <div class="products">
                    <div class="product-card" data-lazy-module="component" data-lazy-name="product-card">
                        <div class="loading-placeholder">加载中...</div>
                    </div>
                    <div class="product-card" data-lazy-module="component" data-lazy-name="product-card">
                        <div class="loading-placeholder">加载中...</div>
                    </div>
                </div>
            </section>
        `;
  }

  /**
     * 生成热销商品页面内容
     * 创建热销商品展示页面的HTML结构
     *
     * @returns {string} 热销商品页面的HTML内容
     * @private
     */
  generateFeaturedProductsContent() {
    return `
            <section class="featured-products">
                <h2 class="section-title">热销商品</h2>
                <div class="products">
                    <div class="product-card" data-lazy-module="component" data-lazy-name="product-card">
                        <div class="loading-placeholder">加载中...</div>
                    </div>
                    <div class="product-card" data-lazy-module="component" data-lazy-name="product-card">
                        <div class="loading-placeholder">加载中...</div>
                    </div>
                </div>
            </section>
        `;
  }

  /**
     * 生成电子设备页面内容
     * 创建电子设备分类页面的HTML结构
     *
     * @returns {string} 电子设备页面的HTML内容
     * @private
     */
  generateElectronicsContent() {
    return `
            <section class="electronics">
                <h2 class="section-title">电子设备</h2>
                <div class="category-grid">
                    <div class="category-item" data-lazy-module="component" data-lazy-name="features">
                        <div class="loading-placeholder">加载中...</div>
                    </div>
                </div>
            </section>
        `;
  }

  /**
     * 生成服饰配件页面内容
     * 创建服饰配件分类页面的HTML结构
     *
     * @returns {string} 服饰配件页面的HTML内容
     * @private
     */
  generateFashionContent() {
    return `
            <section class="fashion">
                <h2 class="section-title">服饰配件</h2>
                <div class="fashion-grid">
                    <div class="fashion-item" data-lazy-module="component" data-lazy-name="product-card">
                        <div class="loading-placeholder">加载中...</div>
                    </div>
                </div>
            </section>
        `;
  }

  /**
     * 生成关于页面内容
     * 创建关于我们页面的HTML结构，包含公司介绍和特色功能
     *
     * @returns {string} 关于页面的HTML内容
     * @private
     */
  generateAboutContent() {
    return `
            <section class="about">
                <h2 class="section-title">关于我们</h2>
                <div class="about-content">
                    <div class="about-text">
                        <h3>NexusShop - 您的购物首选</h3>
                        <p>我们致力于为客户提供最优质的购物体验，汇聚全球精品，让您足不出户即可享受世界级的产品和服务。</p>
                        <div class="about-features" data-lazy-module="component" data-lazy-name="features">
                            <div class="loading-placeholder">加载中...</div>
                        </div>
                    </div>
                </div>
            </section>
        `;
  }

  /**
     * 生成产品卡片组件
     * 创建可重用的产品展示卡片组件
     * 包含产品图片、信息、价格和购买按钮
     * 支持事件委托系统的交互处理
     *
     * @private
     * @returns {Object} 包含HTML和初始化函数的组件对象
     * @returns {string} returns.html - 组件HTML结构
     * @returns {Function} returns.init - 组件初始化函数
     */
  generateProductCardComponent() {
    return {
      html: `
                <div class="product-image">
                    <img src="https://placehold.co/400x400/4f46e5/white?text=Product" alt="商品图片">
                </div>
                <div class="product-info">
                    <div class="product-category">精选商品</div>
                    <h3 class="product-title">优质商品</h3>
                    <p class="product-description">这是一款优质的商品，具有出色的性能和设计。</p>
                    <div class="product-price">
                        <span class="price">¥999</span>
                        <button class="add-to-cart" data-product-id="dynamic-product" data-product-name="优质商品" data-product-price="999">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            `,
      init: (_element) => {
        // 产品卡片交互现在通过事件委托系统处理
        // 不需要单独添加事件监听器
      }
    };
  }

  /**
     * 生成新闻订阅组件
     * 创建邮件订阅表单组件
     *
     * @returns {Object} 包含HTML和初始化函数的组件对象
     * @private
     */
  generateNewsletterComponent() {
    return {
      html: `
                <div class="newsletter-form">
                    <h3>订阅我们的新闻</h3>
                    <p>获取最新产品信息和独家优惠</p>
                    <form>
                        <input type="email" placeholder="您的邮箱地址" required>
                        <button type="submit">订阅</button>
                    </form>
                </div>
            `,
      init: (_element) => {
        // 订阅表单现在通过事件委托系统处理
        // 不需要单独添加事件监听器
      }
    };
  }

  /**
     * 生成客户评价组件
     * 创建客户评价展示组件
     *
     * @returns {Object} 包含HTML的组件对象
     * @private
     */
  generateTestimonialComponent() {
    return {
      html: `
                <div class="testimonial">
                    <div class="testimonial-content">
                        <p>"这是一个非常棒的购物平台，产品质量优秀，服务态度也很好！"</p>
                        <div class="testimonial-author">
                            <img src="https://placehold.co/50x50/4f46e5/white?text=User" alt="用户头像">
                            <div class="author-info">
                                <h4>张三</h4>
                                <p>满意客户</p>
                            </div>
                        </div>
                    </div>
                </div>
            `
    };
  }

  /**
     * 生成特性展示组件
     * 创建服务特性展示网格组件
     *
     * @returns {Object} 包含HTML的组件对象
     * @private
     */
  generateFeaturesComponent() {
    return {
      html: `
                <div class="features-grid">
                    <div class="feature-item">
                        <i class="fas fa-shipping-fast"></i>
                        <h4>快速配送</h4>
                        <p>全国范围内快速配送，让您尽快收到心仪商品</p>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-shield-alt"></i>
                        <h4>品质保证</h4>
                        <p>严格的质量控制，确保每一件商品都符合高标准</p>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-headset"></i>
                        <h4>客服支持</h4>
                        <p>7×24小时客服支持，随时为您解决问题</p>
                    </div>
                </div>
            `
    };
  }
}

// 创建全局懒加载器实例
if (window.diContainer) {
  // 使用依赖注入容器创建实例
  window.lazyLoader = window.diContainer.create('LazyLoader', LazyLoader);
} else {
  // 等待依赖注入容器初始化
  document.addEventListener('DOMContentLoaded', () => {
    if (window.diContainer) {
      window.lazyLoader = window.diContainer.create('LazyLoader', LazyLoader);
    } else {
      // 降级处理：直接创建实例
      window.lazyLoader = new LazyLoader();
    }
  });
}

// 添加CSS样式
const loaderStyles = document.createElement('style');
const spinnerSize = window.MAGIC_NUMBERS?.UI?.SPINNER_SIZE || 50;
const borderWidth = window.MAGIC_NUMBERS?.UI?.BORDER_WIDTH || 4;
const animationDuration = window.MAGIC_NUMBERS?.TIMEOUTS?.ANIMATION_DURATION || 1;
const fontSize = window.MAGIC_NUMBERS?.UI?.FONT_SIZE || 16;
const padding = window.MAGIC_NUMBERS?.UI?.PADDING || 40;
const borderRadius = window.MAGIC_NUMBERS?.UI?.BORDER_RADIUS || 8;
const gridMinWidth = window.MAGIC_NUMBERS?.UI?.GRID_MIN_WIDTH || 250;
const gap = window.MAGIC_NUMBERS?.UI?.GAP || 2;
const featurePadding = window.MAGIC_NUMBERS?.UI?.FEATURE_PADDING || 2;
const featureBorderRadius = window.MAGIC_NUMBERS?.UI?.FEATURE_BORDER_RADIUS || 12;
const iconSize = window.MAGIC_NUMBERS?.UI?.ICON_SIZE || 3;
const titleSize = window.MAGIC_NUMBERS?.UI?.TITLE_SIZE || 1.2;
const lineHeight = window.MAGIC_NUMBERS?.UI?.LINE_HEIGHT || 1.6;

loaderStyles.textContent = `
    .loader-overlay {
        text-align: center;
    }

    .loader-spinner {
        width: ${spinnerSize}px;
        height: ${spinnerSize}px;
        border: ${borderWidth}px solid #f3f3f3;
        border-top: ${borderWidth}px solid #4f46e5;
        border-radius: 50%;
        animation: spin ${animationDuration}s linear infinite;
        margin: 0 auto 20px;
    }

    .loader-text {
        font-size: ${fontSize}px;
        color: #666;
    }

    .loading-placeholder {
        padding: ${padding}px;
        text-align: center;
        color: #999;
        background: #f9fafb;
        border-radius: ${borderRadius}px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(${gridMinWidth}px, 1fr));
        gap: ${gap}rem;
        margin-top: ${gap}rem;
    }

    .feature-item {
        text-align: center;
        padding: ${featurePadding}rem;
        background: white;
        border-radius: ${featureBorderRadius}px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .feature-item i {
        font-size: ${iconSize}rem;
        color: #4f46e5;
        margin-bottom: 1rem;
    }

    .feature-item h4 {
        font-size: ${titleSize}rem;
        margin-bottom: 0.5rem;
        color: #333;
    }

    .feature-item p {
        color: #666;
        line-height: ${lineHeight};
    }
`;
document.head.appendChild(loaderStyles);
