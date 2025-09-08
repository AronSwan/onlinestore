/**
 * 图片优化功能模块
 * 提供图片预加载、懒加载、响应式图片、缓存优化等功能
 * 包含智能的图片质量自适应、多格式支持和性能监控
 *
 * @namespace imageOptimization
 * @description 主要功能包括：
 * - 懒加载：基于Intersection Observer API的图片懒加载
 * - 响应式图片：自动生成多尺寸的srcset和sizes属性
 * - 格式优化：WebP格式支持和降级处理
 * - 网络自适应：根据网络状态调整图片质量
 * - 错误处理：失败重试和占位符显示
 * - 性能监控：图片加载性能的实时监控
 *
 * @example
 * // 初始化图片优化系统
 * const api = imageOptimization.init();
 *
 * // 手动预加载关键图片
 * imageOptimization.preloadImages([
 *   'hero-image.jpg',
 *   'product-banner.jpg'
 * ]);
 *
 * // 获取加载统计
 * const stats = api.getStats();
 * console.log(`成功: ${stats.loaded}, 失败: ${stats.failed}`);
 */
const imageOptimization = {
  /**
     * 预加载图片
     * 创建隐藏Image对象以触发图片下载，提前缓存关键图片
     * 适用于首屏图片或用户即将浏览的内容
     * 包含完整的错误处理，避免无效URL影响系统稳定性
     *
     * @memberof imageOptimization
     * @function preloadImages
     * @param {string[]} imageUrls - 需要预加载的图片URL数组
     * @returns {void}
     *
     * @example
     * // 预加载关键图片
     * imageOptimization.preloadImages([
     *   'https://example.com/hero.jpg',
     *   '/images/product-banner.png'
     * ]);
     */
  preloadImages: function (imageUrls) {
    try {
      imageUrls.forEach(url => {
        const img = new Image();
        img.src = url; // 触发图片下载
      });
    } catch (error) {
      console.error('Error in preloadImages:', error);
    }
  },

  /**
     * 初始化懒加载功能（增强错误处理）
     * 为带有data-src属性的图片实现懒加载，包含重试机制和占位符
     * 支持基于Intersection Observer的高性能观察和降级处理
     * 包含智能占位符生成、失败重试和点击重试功能
     *
     * @memberof imageOptimization
     * @function initLazyLoading
     * @returns {Object|null} 懒加载管理对象，包含统计和控制方法
     * @returns {Function} returns.getLoadedCount - 获取成功加载的图片数量
     * @returns {Function} returns.getFailedCount - 获取加载失败的图片数量
     * @returns {Function} returns.getFailedImages - 获取失败图片的URL列表
     * @returns {Function} returns.retryAllFailed - 重试所有失败的图片
     *
     * @example
     * const lazyLoader = imageOptimization.initLazyLoading();
     * if (lazyLoader) {
     *   console.log(`加载成功: ${lazyLoader.getLoadedCount()}张`);
     *   console.log(`加载失败: ${lazyLoader.getFailedCount()}张`);
     * }
     */
  initLazyLoading: function () {
    try {
      const lazyImages = document.querySelectorAll('img[data-src]');
      const loadedImages = new Set(); // 已成功加载的图片集合
      const failedImages = new Map(); // 存储失败的图片和重试次数

      // 使用统一配置模块
      const config = window.config?.getModule('imageOptimization') || window.CONSTANTS?.IMAGE_OPTIMIZATION || {};
      const maxRetries = config.maxRetries || 3; // 最大重试次数
      const retryDelay = config.retryDelay || 1000; // 重试延迟时间（毫秒）

      /**
             * 创建默认加载占位符
             * @param {number} width - 占位符宽度
             * @param {number} height - 占位符高度
             * @returns {string} Base64编码的SVG占位符
             */
      const createPlaceholder = (width = window.MAGIC_NUMBERS?.IMAGE_PLACEHOLDER_WIDTH || 300, height = window.MAGIC_NUMBERS?.IMAGE_PLACEHOLDER_HEIGHT || 200) => {
        const svgContent = `
                    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="#f3f4f6"/>
                        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${window.MAGIC_NUMBERS?.PLACEHOLDER_FONT_SIZE || 14}" fill="#9ca3af" text-anchor="middle" dy=".3em">Loading...</text>
                    </svg>
                `;
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
      };

      /**
             * 创建错误状态占位符
             * @param {number} width - 占位符宽度
             * @param {number} height - 占位符高度
             * @returns {string} Base64编码的SVG错误占位符
             */
      const createErrorPlaceholder = (width = window.MAGIC_NUMBERS?.IMAGE_PLACEHOLDER_WIDTH || 300, height = window.MAGIC_NUMBERS?.IMAGE_PLACEHOLDER_HEIGHT || 200) => {
        const svgContent = `
                    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="#fef2f2"/>
                        <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="${window.MAGIC_NUMBERS?.PLACEHOLDER_FONT_SIZE || 14}" fill="#ef4444" text-anchor="middle" dy=".3em">Failed to load</text>
                        <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="${window.MAGIC_NUMBERS?.PLACEHOLDER_SMALL_FONT_SIZE || 12}" fill="#9ca3af" text-anchor="middle" dy=".3em">Click to retry</text>
                    </svg>
                `;
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
      };

      /**
             * 加载图片的核心函数
             * @param {HTMLImageElement} lazyImage - 需要加载的图片元素
             * @param {number} retryCount - 当前重试次数
             * @returns {Promise} 加载结果的Promise
             */
      const loadImage = (lazyImage, retryCount = 0) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          const originalSrc = lazyImage.dataset.src;

          // 设置加载状态样式
          lazyImage.classList.add('loading');

          // 如果没有占位符，设置默认占位符
          if (!lazyImage.src || lazyImage.src === window.location.href) {
            const rect = lazyImage.getBoundingClientRect();
            lazyImage.src = createPlaceholder(rect.width || window.MAGIC_NUMBERS?.IMAGE_PLACEHOLDER_WIDTH || 300, rect.height || window.MAGIC_NUMBERS?.IMAGE_PLACEHOLDER_HEIGHT || 200);
          }

          img.onload = () => {
            lazyImage.src = originalSrc;
            lazyImage.classList.remove('loading', 'error');
            lazyImage.classList.add('loaded');
            lazyImage.removeAttribute('data-src');
            loadedImages.add(originalSrc);
            failedImages.delete(originalSrc);
            resolve(lazyImage);
          };

          img.onerror = () => {
            console.warn(`图片加载失败: ${originalSrc}, 重试次数: ${retryCount}`);

            if (retryCount < maxRetries) {
              // 重试加载
              setTimeout(() => {
                loadImage(lazyImage, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              }, retryDelay * (retryCount + 1)); // 递增延迟
            } else {
              // 达到最大重试次数，显示错误占位符
              const rect = lazyImage.getBoundingClientRect();
              lazyImage.src = createErrorPlaceholder(rect.width || window.MAGIC_NUMBERS?.IMAGE_PLACEHOLDER_WIDTH || 300, rect.height || window.MAGIC_NUMBERS?.IMAGE_PLACEHOLDER_HEIGHT || 200);
              lazyImage.classList.remove('loading');
              lazyImage.classList.add('error');
              lazyImage.setAttribute('data-error', 'true');
              lazyImage.setAttribute('data-original-src', originalSrc);
              failedImages.set(originalSrc, maxRetries);

              // 添加点击重试功能
              lazyImage.style.cursor = 'pointer';
              lazyImage.title = '点击重试加载图片';

              reject(new Error(`图片加载失败，已重试${maxRetries}次: ${originalSrc}`));
            }
          };

          img.src = originalSrc;
        });
      };

      // 点击重试处理
      const handleRetryClick = (event) => {
        const img = event.target;
        if (img.tagName === 'IMG' && img.getAttribute('data-error') === 'true') {
          const originalSrc = img.getAttribute('data-original-src');
          if (originalSrc) {
            img.removeAttribute('data-error');
            img.dataset.src = originalSrc;
            img.style.cursor = '';
            img.title = '';
            loadImage(img).catch(error => {
              console.error('重试加载失败:', error);
            });
          }
        }
      };

      // 添加全局点击事件监听器
      document.addEventListener('click', handleRetryClick);

      if ('IntersectionObserver' in window) {
        const lazyImageObserver = new IntersectionObserver((entries, _observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const lazyImage = entry.target;
              lazyImageObserver.unobserve(lazyImage);

              loadImage(lazyImage).catch(error => {
                console.error('懒加载图片失败:', error);
              });
            }
          });
        }, {
          rootMargin: '50px 0px', // 提前50px开始加载
          threshold: 0.1
        });

        lazyImages.forEach(lazyImage => {
          lazyImageObserver.observe(lazyImage);
        });
      } else {
        // 回退方案：直接加载所有图片
        lazyImages.forEach(lazyImage => {
          loadImage(lazyImage).catch(error => {
            console.error('图片加载失败:', error);
          });
        });
      }

      // 返回状态信息
      return {
        getLoadedCount: () => loadedImages.size,
        getFailedCount: () => failedImages.size,
        getFailedImages: () => Array.from(failedImages.keys()),
        retryAllFailed: () => {
          const failedImgs = document.querySelectorAll('img[data-error="true"]');
          failedImgs.forEach(img => {
            const event = new Event('click');
            img.dispatchEvent(event);
          });
        }
      };
    } catch (error) {
      console.error('Error in initLazyLoading:', error);
      return null;
    }
  },

  /**
     * 设置响应式图片
     * 为页面中的图片元素添加响应式属性，生成优化的srcset
     * 自动检测缺少srcset属性的图片并为其生成响应式配置
     * 支持多尺寸和高DPI设备的优化
     *
     * @memberof imageOptimization
     * @function setupResponsiveImages
     * @returns {void}
     *
     * @example
     * // 为所有图片设置响应式属性
     * imageOptimization.setupResponsiveImages();
     */
  setupResponsiveImages: function () {
    try {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        // 为现有图片添加响应式属性
        if (!img.srcset && img.src) {
          this.generateOptimizedSrcset(img);
        }
      });
    } catch (error) {
      console.error('Error in setupResponsiveImages:', error);
    }
  },

  /**
     * 生成优化的srcset属性
     * 为图片元素生成多种尺寸的srcset，支持WebP格式
     * 自动计算最优断点，生成picture元素支持多格式
     * 包含智能的sizes属性生成和高DPI设备适配
     *
     * @memberof imageOptimization
     * @function generateOptimizedSrcset
     * @param {HTMLImageElement} img - 目标图片元素
     * @returns {void}
     *
     * @example
     * const img = document.querySelector('img');
     * imageOptimization.generateOptimizedSrcset(img);
     */
  generateOptimizedSrcset: function (img) {
    try {
      const src = img.src;
      const srcsetEntries = [];
      const webpEntries = [];

      // 检测图片尺寸模式
      const widthMatch = src.match(/\/([^/]+)\/(\d+)x(\d+)\//);
      const baseWidth = widthMatch ? parseInt(widthMatch[2], 10) : 800;
      const baseHeight = widthMatch ? parseInt(widthMatch[3], 10) : 600;

      // 智能生成响应式尺寸
      const breakpoints = this.calculateOptimalBreakpoints(baseWidth);

      breakpoints.forEach(({ width, density: _density }) => {
        const height = Math.floor((baseHeight / baseWidth) * width);

        // 生成标准格式
        const standardSrc = this.generateImageUrl(src, width, height);
        srcsetEntries.push(`${standardSrc} ${width}w`);

        // 生成WebP格式（如果支持）
        if (this.supportsWebP()) {
          const webpSrc = this.generateWebPUrl(standardSrc);
          webpEntries.push(`${webpSrc} ${width}w`);
        }
      });

      // 设置srcset和sizes
      if (webpEntries.length > 0) {
        // 创建picture元素支持WebP
        this.createPictureElement(img, webpEntries, srcsetEntries);
      } else {
        img.srcset = srcsetEntries.join(', ');
      }

      // 智能生成sizes属性
      img.sizes = this.generateOptimalSizes(img);

    } catch (error) {
      console.error('Error in generateOptimizedSrcset:', error);
    }
  },

  /**
     * 计算最优响应式断点
     * 根据基础宽度生成适合的响应式图片断点
     * 包含标准断点和高DPI设备的优化版本
     * 支持可配置的最小/最大宽度限制
     *
     * @memberof imageOptimization
     * @function calculateOptimalBreakpoints
     * @param {number} baseWidth - 图片基础宽度
     * @returns {Array<Object>} 断点配置数组，包含width和density属性
     * @returns {number} returns[].width - 断点宽度
     * @returns {number} returns[].density - 像素密度倍数
     *
     * @example
     * const breakpoints = imageOptimization.calculateOptimalBreakpoints(800);
     * // 返回: [{width: 320, density: 1}, {width: 640, density: 2}, ...]
     */
  calculateOptimalBreakpoints: function (baseWidth) {
    const breakpoints = [];
    const minWidth = window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.MIN_BREAKPOINT_WIDTH || 320;
    const maxWidth = Math.max(baseWidth * (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.MAX_WIDTH_MULTIPLIER || 2), window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.MAX_BREAKPOINT_WIDTH || 1920);

    // 标准断点
    const standardBreakpoints = window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.STANDARD_BREAKPOINTS || [320, 480, 768, 1024, 1200, 1440, 1920];

    standardBreakpoints.forEach(width => {
      if (width >= minWidth && width <= maxWidth) {
        breakpoints.push({ width, density: 1 });

        // 为高DPI设备添加2x版本
        if (width <= (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.HIGH_DPI_THRESHOLD || 960)) {
          breakpoints.push({ width: width * (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.HIGH_DPI_MULTIPLIER || 2), density: 2 });
        }
      }
    });

    // 确保包含原始尺寸
    if (!breakpoints.find(bp => bp.width === baseWidth)) {
      breakpoints.push({ width: baseWidth, density: 1 });
    }

    return breakpoints.sort((a, b) => a.width - b.width);
  },

  /**
     * 生成指定尺寸的图片URL
     * 根据原始URL和目标尺寸生成新的图片URL
     * 支持多种 URL 格式和参数传递方式
     * 自动处理相对路径和绝对路径
     *
     * @memberof imageOptimization
     * @function generateImageUrl
     * @param {string} originalSrc - 原始图片URL
     * @param {number} width - 目标宽度
     * @param {number} height - 目标高度
     * @returns {string} 生成的图片URL
     *
     * @example
     * // 替换尺寸参数
     * const newUrl = imageOptimization.generateImageUrl(
     *   'https://example.com/800x600/image.jpg',
     *   400, 300
     * );
     * // 返回: 'https://example.com/400x300/image.jpg'
     */
  generateImageUrl: function (originalSrc, width, height) {
    // 如果原始URL包含尺寸信息，替换它
    if (originalSrc.match(/\/(\d+)x(\d+)\//)) {
      return originalSrc.replace(/\/(\d+)x(\d+)\//, `/${width}x${height}/`);
    }

    // 如果是相对路径，添加尺寸参数
    if (originalSrc.startsWith('./') || originalSrc.startsWith('/')) {
      const url = new URL(originalSrc, window.location.origin);
      url.searchParams.set('w', width);
      url.searchParams.set('h', height);
      url.searchParams.set('q', window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.IMAGE_QUALITY || '80'); // 质量参数
      return url.toString();
    }

    return originalSrc;
  },

  /**
     * 生成WebP格式的图片URL
     * 将标准格式图片URL转换为WebP格式
     * 支持jpg、jpeg、png等格式的转换
     * 用于创建picture元素中的WebP source
     *
     * @memberof imageOptimization
     * @function generateWebPUrl
     * @param {string} originalUrl - 原始图片URL
     * @returns {string} WebP格式的图片URL
     *
     * @example
     * const webpUrl = imageOptimization.generateWebPUrl('image.jpg');
     * // 返回: 'image.webp'
     */
  generateWebPUrl: function (originalUrl) {
    // 简单的WebP URL生成逻辑
    return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  },

  /**
     * 检测浏览器是否支持WebP格式
     * 使用canvas检测WebP支持，结果会被缓存
     * 提供同步检测结果，适用于即时决策
     * 包含完整的错误处理和降级支持
     *
     * @memberof imageOptimization
     * @function supportsWebP
     * @returns {boolean} 是否支持WebP格式
     *
     * @example
     * if (imageOptimization.supportsWebP()) {
     *   // 使用WebP格式
     *   loadWebPImage();
     * } else {
     *   // 使用标准格式
     *   loadStandardImage();
     * }
     */
  supportsWebP: function () {
    if (typeof this._webpSupport !== 'undefined') {
      return this._webpSupport;
    }

    // 使用canvas检测WebP支持（同步方法）
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      this._webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) {
      this._webpSupport = false;
    }

    return this._webpSupport;
  },

  /**
     * 创建Picture元素以支持多种图片格式
     * 将img元素包装在picture元素中，提供WebP和标准格式的选择
     * 按照渐进增强的原则，优先显示WebP，降级显示标准格式
     * 自动检测是否已在picture中以避免重复处理
     *
     * @memberof imageOptimization
     * @function createPictureElement
     * @param {HTMLImageElement} img - 目标图片元素
     * @param {Array<string>} webpEntries - WebP格式的srcset条目
     * @param {Array<string>} standardEntries - 标准格式的srcset条目
     * @returns {void}
     *
     * @example
     * const webpSources = ['image-400.webp 400w', 'image-800.webp 800w'];
     * const standardSources = ['image-400.jpg 400w', 'image-800.jpg 800w'];
     * imageOptimization.createPictureElement(img, webpSources, standardSources);
     */
  createPictureElement: function (img, webpEntries, standardEntries) {
    if (img.parentElement.tagName === 'PICTURE') {
      return; // 已经在picture元素中
    }

    const picture = document.createElement('picture');

    // WebP source
    const webpSource = document.createElement('source');
    webpSource.type = 'image/webp';
    webpSource.srcset = webpEntries.join(', ');
    picture.appendChild(webpSource);

    // 标准格式source
    const standardSource = document.createElement('source');
    standardSource.srcset = standardEntries.join(', ');
    picture.appendChild(standardSource);

    // 将img元素移动到picture中
    img.parentElement.insertBefore(picture, img);
    picture.appendChild(img);
  },

  /**
     * 生成最优的sizes属性
     * 根据图片在布局中的角色和位置，生成合适的sizes属性值
     * 智能识别英雄图、产品网格、缩略图等不同类型
     * 为不同类型的图片提供针对性的响应式配置
     *
     * @memberof imageOptimization
     * @function generateOptimalSizes
     * @param {HTMLImageElement} img - 目标图片元素
     * @returns {string} 优化后的sizes属性值
     *
     * @example
     * const img = document.querySelector('.hero img');
     * const sizes = imageOptimization.generateOptimalSizes(img);
     * // 返回: '100vw' (英雄图片占满屏幕)
     */
  generateOptimalSizes: function (img) {
    // 检测图片在布局中的角色
    const classList = img.classList;
    const parentClasses = img.parentElement ? img.parentElement.classList : [];

    // 英雄图片
    if (classList.contains('hero') || classList.contains('banner') ||
            parentClasses.contains('hero') || parentClasses.contains('banner')) {
      return '100vw';
    }

    // 产品网格
    if (classList.contains('product-image') || parentClasses.contains('product-grid')) {
      return '(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw';
    }

    // 缩略图
    if (classList.contains('thumbnail') || classList.contains('avatar')) {
      return '(max-width: 480px) 80px, 120px';
    }

    // 侧边栏图片
    if (parentClasses.contains('sidebar') || classList.contains('sidebar-image')) {
      return '(max-width: 768px) 100vw, 300px';
    }

    // 默认响应式sizes
    return '(max-width: 480px) 100vw, (max-width: 768px) 75vw, (max-width: 1200px) 50vw, 33vw';
  },

  /**
     * 图片质量优化
     * 为高DPI设备提供更高质量的图片，自动检测并加载@2x版本
     * 检测设备像素比并智能切换高分辨率图片
     * 包含错误处理，在高分辨率版本不可用时保持原图
     *
     * @memberof imageOptimization
     * @function optimizeImageQuality
     * @returns {void}
     *
     * @example
     * // 自动为高DPI设备优化图片质量
     * imageOptimization.optimizeImageQuality();
     */
  optimizeImageQuality: function () {
    try {
      // 为高DPI设备提供更高质量的图片
      const isHighDPI = window.matchMedia('(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)').matches;

      if (isHighDPI) {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (img.src && !img.src.includes('@2x') && !img.src.includes('@3x')) {
            // 尝试加载2x版本
            const highResSrc = img.src.replace(/(\..+)$/, '@2x$1');
            const testImg = new Image();
            testImg.onload = () => {
              img.src = highResSrc;
            };
            testImg.onerror = () => {
              // 2x版本不存在，保持原样
            };
            testImg.src = highResSrc;
          }
        });
      }
    } catch (error) {
      console.error('Error in optimizeImageQuality:', error);
    }
  },

  /**
     * 图片缓存和性能优化
     * 包括预连接、加载优先级优化和懒加载观察器优化
     */
  optimizeImageCaching: function () {
    try {
      // 添加图片预连接
      this.addImagePreconnects();

      // 优化图片加载优先级
      this.optimizeImagePriority();

      // 实现图片懒加载交叉观察器优化
      this.optimizeLazyLoadingObserver();

    } catch (error) {
      console.error('Error in optimizeImageCaching:', error);
    }
  },

  /**
     * 添加图片域名预连接
     * 为外部图片域名添加preconnect链接，提升加载性能
     */
  addImagePreconnects: function () {
    const imageHosts = new Set();
    const images = document.querySelectorAll('img[src], img[data-src]');

    images.forEach(img => {
      const src = img.src || img.dataset.src;
      if (src) {
        try {
          const url = new URL(src, window.location.origin);
          if (url.origin !== window.location.origin) {
            imageHosts.add(url.origin);
          }
        } catch (e) {
          // 忽略无效URL
        }
      }
    });

    // 为外部图片域名添加预连接
    imageHosts.forEach(host => {
      if (!document.querySelector(`link[rel="preconnect"][href="${host}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = host;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    });
  },

  /**
     * 优化图片加载优先级
     * 为首屏图片设置高优先级，其他图片设置懒加载
     */
  optimizeImagePriority: function () {
    const images = document.querySelectorAll('img');

    images.forEach((img, index) => {
      // 首屏图片设置高优先级
      if (index < 3 || this.isInViewport(img)) {
        img.loading = 'eager';
        img.fetchPriority = 'high';
      } else {
        img.loading = 'lazy';
        img.fetchPriority = 'low';
      }

      // 设置解码方式
      img.decoding = 'async';
    });
  },

  /**
     * 检查元素是否在视口中
     * 判断元素是否完全在当前视口范围内
     * @param {HTMLElement} element - 要检查的元素
     * @returns {boolean} 是否在视口中
     */
  isInViewport: function (element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
     * 优化懒加载观察器
     * 为不同类型的图片使用不同的观察器配置
     */
  optimizeLazyLoadingObserver: function () {
    // 为不同类型的图片使用不同的观察器配置
    const configs = {
      hero: { rootMargin: '0px' }, // 英雄图片立即加载
      above: { rootMargin: '50px' }, // 首屏附近图片提前加载
      normal: { rootMargin: '100px' }, // 普通图片提前100px加载
      lazy: { rootMargin: '200px' } // 懒加载图片提前200px加载
    };

    Object.keys(configs).forEach(type => {
      const selector = type === 'normal' ? 'img[data-src]:not([data-priority])' : `img[data-src][data-priority="${type}"]`;
      const images = document.querySelectorAll(selector);

      if (images.length > 0) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              this.loadImageWithRetry(img);
              observer.unobserve(img);
            }
          });
        }, configs[type]);

        images.forEach(img => observer.observe(img));
      }
    });
  },

  /**
     * 带重试的图片加载
     * 异步加载图片，失败时自动重试
     * @param {string} url - 图片URL
     * @param {number} maxRetries - 最大重试次数，默认3次
     * @param {number} retries - 当前重试次数
     * @returns {Promise} 加载结果
     * @throws {Error} 超过最大重试次数时抛出错误
     */
  loadImageWithRetry: async function (url, maxRetries = 3, retries = 0) {
    try {
      await fetch(url);
    } catch (err) {
      if (retries < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * 2 ** retries));
        return this.loadImageWithRetry(url, maxRetries, retries + 1);
      }
      throw new Error('IMAGE_LOAD_FAILED: ' + url);
    }
  },

  /**
     * 智能选择图片尺寸
     * 基于设备、网络和视口的智能尺寸选择
     * @param {number} baseWidth - 基础宽度
     * @returns {Array<number>} 优化后的尺寸数组
     */
  getOptimalSizes: function (baseWidth) {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const viewportWidth = window.innerWidth;
    const connection = this.getConnectionQuality();

    // 基于设备、网络和视口的智能尺寸选择
    const sizes = [];

    // 获取设备类型和特性
    // const deviceInfo = this.getDeviceInfo(); // 暂时注释，未使用

    // 根据网络质量调整策略
    const qualityMultiplier = connection.effectiveType === '4g' ? 1 :
      connection.effectiveType === '3g' ? 0.8 : 0.6;

    // 小屏设备优化（手机）
    if (viewportWidth <= (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.MOBILE_BREAKPOINT || 480)) {
      const optimalWidth = Math.min(baseWidth, (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.MOBILE_BREAKPOINT || 480) * qualityMultiplier);
      sizes.push(optimalWidth);

      // 高密度屏幕适配
      if (devicePixelRatio > (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.MOBILE_DPI_THRESHOLD || 1.5) && connection.effectiveType !== 'slow-2g') {
        sizes.push(Math.min(baseWidth, optimalWidth * Math.min(devicePixelRatio, window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.MAX_DPI_MULTIPLIER || 2)));
      }
    }
    // 中等屏幕（平板）
    else if (viewportWidth <= (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.TABLET_BREAKPOINT || 768)) {
      const optimalWidth = Math.min(baseWidth, (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.TABLET_BREAKPOINT || 768) * qualityMultiplier);
      sizes.push(optimalWidth);

      if (devicePixelRatio > (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.TABLET_DPI_THRESHOLD || 1.3) && connection.effectiveType !== 'slow-2g') {
        sizes.push(Math.min(baseWidth, optimalWidth * Math.min(devicePixelRatio, window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.MAX_DPI_MULTIPLIER || 2)));
      }
    }
    // 大屏幕（桌面）
    else if (viewportWidth <= (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.DESKTOP_BREAKPOINT || 1200)) {
      sizes.push(Math.min(baseWidth, (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.DESKTOP_BREAKPOINT || 1200) * qualityMultiplier));

      if (devicePixelRatio > (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.DESKTOP_DPI_THRESHOLD || 1.2) && connection.effectiveType === '4g') {
        sizes.push(Math.min(baseWidth, (window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.DESKTOP_BREAKPOINT || 1200) * Math.min(devicePixelRatio, window.MAGIC_NUMBERS?.IMAGE_OPTIMIZATION?.MAX_DPI_MULTIPLIER || 2)));
      }
    }
    // 超大屏幕（4K等）
    else {
      sizes.push(baseWidth);

      // 只在高速网络下提供高密度版本
      if (devicePixelRatio > 1 && connection.effectiveType === '4g' && !connection.saveData) {
        sizes.push(Math.min(baseWidth * 2, baseWidth * devicePixelRatio));
      }
    }

    // 移除重复并排序
    const uniqueSizes = [...new Set(sizes.map(s => Math.round(s)))].sort((a, b) => a - b);

    // 确保至少有一个尺寸
    return uniqueSizes.length > 0 ? uniqueSizes : [baseWidth];
  },

  /**
     * 获取网络连接质量
     * 检测用户的网络连接状态和质量
     * @returns {Object} 网络连接信息对象
     * @returns {string} returns.effectiveType - 网络类型（如'4g', '3g'等）
     * @returns {boolean} returns.saveData - 是否启用数据节省模式
     * @returns {number} returns.downlink - 下行带宽
     */
  getConnectionQuality: function () {
    if ('connection' in navigator) {
      return {
        effectiveType: navigator.connection.effectiveType || '4g',
        saveData: navigator.connection.saveData || false,
        downlink: navigator.connection.downlink || 10
      };
    }
    return { effectiveType: '4g', saveData: false, downlink: 10 };
  },

  /**
     * 获取设备信息
     * 检测设备类型、屏幕信息等
     * @returns {Object} 设备信息对象
     * @returns {boolean} returns.isMobile - 是否为移动设备
     * @returns {boolean} returns.isTablet - 是否为平板设备
     * @returns {boolean} returns.isDesktop - 是否为桌面设备
     * @returns {number} returns.pixelRatio - 设备像素比
     * @returns {number} returns.viewportWidth - 视口宽度
     * @returns {number} returns.viewportHeight - 视口高度
     * @returns {boolean} returns.isRetina - 是否为高密度屏幕
     */
  getDeviceInfo: function () {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    return {
      isMobile,
      isTablet,
      isDesktop,
      pixelRatio: window.devicePixelRatio || 1,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      isRetina: window.devicePixelRatio > 1.5
    };
  },

  /**
     * 获取图片加载统计信息
     * 返回图片加载的成功和失败统计
     * @returns {Object} 加载统计信息
     * @returns {number} returns.loaded - 成功加载的图片数量
     * @returns {number} returns.failed - 加载失败的图片数量
     * @returns {Array} returns.failedImages - 失败图片的详细信息
     */
  getLoadingStats: function () {
    if (this.lazyLoadingInstance) {
      return {
        loaded: this.lazyLoadingInstance.getLoadedCount(),
        failed: this.lazyLoadingInstance.getFailedCount(),
        failedImages: this.lazyLoadingInstance.getFailedImages()
      };
    }
    return { loaded: 0, failed: 0, failedImages: [] };
  },

  /**
     * 重试所有失败的图片
     * 重新尝试加载之前失败的图片
     */
  retryFailedImages: function () {
    if (this.lazyLoadingInstance && this.lazyLoadingInstance.retryAllFailed) {
      this.lazyLoadingInstance.retryAllFailed();
      console.log('正在重试所有失败的图片...');
    } else {
      console.warn('懒加载实例不可用，无法重试失败的图片');
    }
  },

  /**
     * 监控图片加载性能
     * 使用Performance Observer监控图片加载性能，记录加载时间过长的图片
     */
  monitorImagePerformance: function () {
    try {
      // 使用Performance Observer监控图片加载性能
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.initiatorType === 'img') {
              const loadTime = entry.responseEnd - entry.startTime;
              if (loadTime > 3000) { // 超过3秒的图片
                console.warn(`图片加载较慢: ${entry.name}, 耗时: ${loadTime.toFixed(2)}ms`);
              }
            }
          });
        });
        observer.observe({ entryTypes: ['resource'] });
      }
    } catch (error) {
      console.error('Error in monitorImagePerformance:', error);
    }
  },

  /**
     * 初始化所有图片优化功能
     * 启动所有图片优化模块，包括响应式图片、懒加载、质量优化等
     * @returns {Object} 返回API接口供外部调用
     * @returns {Function} returns.getStats - 获取加载统计信息
     * @returns {Function} returns.retryFailed - 重试失败的图片
     */
  init: function () {
    try {
      // 设置响应式图片
      this.setupResponsiveImages();

      // 初始化懒加载并保存实例
      this.lazyLoadingInstance = this.initLazyLoading();

      // 优化图片质量
      this.optimizeImageQuality();

      // 优化图片缓存和性能
      this.optimizeImageCaching();

      // 监控图片加载性能
      this.monitorImagePerformance();

      // 预加载关键图片
      this.preloadImages([
        'https://placehold.co/600x450/4f46e5/white?text=Premium+Products',
        'https://placehold.co/400x400/4f46e5/white?text=Wireless+Earbuds'
      ]);

      // 添加全局错误处理
      window.addEventListener('error', (event) => {
        if (event.target && event.target.tagName === 'IMG') {
          console.error('全局图片加载错误:', event.target.src);
        }
      }, true);

      // 定期检查和报告加载状态
      setInterval(() => {
        const stats = this.getLoadingStats();
        if (stats.failed > 0) {
          console.log(`图片加载统计 - 成功: ${stats.loaded}, 失败: ${stats.failed}`);
        }
      }, 30000); // 每30秒检查一次

      console.log('Image optimization initialized successfully');

      // 返回API接口供外部调用
      return {
        getStats: () => this.getLoadingStats(),
        retryFailed: () => this.retryFailedImages(),
        instance: this
      };
    } catch (error) {
      console.error('Error in imageOptimization.init:', error);
      return null;
    }
  }
};

// 页面加载完成后初始化图片优化
let imageOptimizationAPI;

// 检查是否在浏览器环境中运行
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      imageOptimizationAPI = imageOptimization.init();

      // 将API暴露到全局作用域，方便调试和外部调用
      if (imageOptimizationAPI) {
        window.imageOptimizationAPI = imageOptimizationAPI;
        console.log('图片优化API已暴露到 window.imageOptimizationAPI');
        console.log('可用方法: getStats(), retryFailed()');
      }
    });
  } else {
    imageOptimizationAPI = imageOptimization.init();

    // 将API暴露到全局作用域
    if (imageOptimizationAPI) {
      window.imageOptimizationAPI = imageOptimizationAPI;
      console.log('图片优化API已暴露到 window.imageOptimizationAPI');
      console.log('可用方法: getStats(), retryFailed()');
    }
  }
}

// 导出模块（如果在模块环境中使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = imageOptimization;
}
