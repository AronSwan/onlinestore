/**
 * NextChatAdvanced 支持类 - 包含NextChatUtils和ResourceLoader类
 * 用于解决服务器上nextchat-advanced-optimized.js文件缺少这些类定义的问题
 */

// 作者：AI助手
// 时间：2025-06-17 10:30:00
// 用途：提供NextChatAdvanced所需的工具类和资源加载器，解决服务器上缺少这些类定义的问题
// 依赖文件：无

// 配置常量
const NEXTCHAT_CONFIG = {
  MAX_IMAGE_SIZE: 256 * 1024,
  MAX_MESSAGE_LENGTH: 500,
  SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  VOICE_RECOGNITION_TIMEOUT: 10000,
  ANIMATION_DURATION: 300,
  CDN_TIMEOUT: 5000,
  VECTOR_EMBEDDING_SIZE: 100,

  // CDN资源配置
  CDN_RESOURCES: {
    tensorflow: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js',
    recorder: 'https://cdn.jsdelivr.net/npm/recorder-js@1.0.0/dist/recorder.min.js',
    heic2any: 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js',
    chromadb: 'https://cdn.jsdelivr.net/npm/chromadb@1.8.0/dist/chromadb.min.js',
  },

  // 备用CDN资源配置
  FALLBACK_CDN_RESOURCES: {
    recorder: [
      'https://unpkg.com/recorder-js@1.0.0/dist/recorder.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/recorder-js/1.0.0/recorder.min.js',
      'https://cdn.skypack.dev/recorder-js@1.0.0/dist/recorder.min.js',
    ],
    heic2any: [
      'https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js',
      'https://cdn.skypack.dev/heic2any@0.0.4/dist/heic2any.min.js',
    ],
    chromadb: [
      'https://unpkg.com/chromadb@1.8.0/dist/chromadb.min.js',
      'https://cdn.skypack.dev/chromadb@1.8.0/dist/chromadb.min.js',
      'https://cdn.jsdelivr.net/npm/chromadb@0.4.22/dist/chromadb.min.js', // 降级版本
    ],
  },

  // 预设回复模板
  AI_RESPONSES: {
    '退货': '我们的退货政策是30天内无理由退货。请保持商品标签完整，并提供购买凭证。',
    '尺码': '我们提供详细的尺码表，建议您参考具体商品的尺码指南。如有疑问，我可以为您推荐合适的尺码。',
    '价格': '我们的价格因商品而异，建议您查看具体商品页面获取最新价格信息。',
    '发货': '我们通常在1-3个工作日内发货，配送时间根据地区不同为3-7个工作日。',
    '材质': '我们的产品采用高品质材料制作，具体材质信息请查看商品详情页。',
    'Gucci': 'Gucci是意大利奢侈品牌，以其精湛的工艺和独特的设计闻名。我们提供各类Gucci产品，包括手袋、鞋履、成衣、配饰等。每件产品都体现着品牌的创新精神和经典传承。',
    'gucci': 'Gucci是意大利奢侈品牌，以其精湛的工艺和独特的设计闻名。我们提供各类Gucci产品，包括手袋、鞋履、成衣、配饰等。每件产品都体现着品牌的创新精神和经典传承。',
    '产品': '我们提供多种Gucci产品系列，包括经典款手袋、时尚鞋履、精致成衣和独特配饰。每个系列都融合了品牌传统与现代创新，满足不同场合的需求。',
    '手袋': 'Gucci手袋系列包括经典的GG Marmont、Dionysus、Sylvie等款式，每款都采用优质皮革制作，配有标志性品牌元素，是展现个人风格的完美选择。',
    '新款': '我们最新推出的手袋系列融合了当季流行元素与Gucci经典设计，包括GG Marmont系列的新配色、Dionysus系列的限量版材质以及专为现代生活设计的实用款式。每款新品都体现了品牌对创新和品质的不懈追求。',
    '推荐': '根据您的需求，我推荐您考虑我们的GG Marmont系列手袋，这款经典设计适合各种场合；如果您喜欢更独特的风格，Dionysus系列会是不错的选择；对于日常使用，Sylvie系列既实用又时尚。您更倾向于哪种风格呢？',
    '日常': '对于日常使用，我推荐您考虑Gucci的Sylvie系列或GG Marmont系列。这些手袋设计实用，内部空间充裕，同时保持了Gucci的标志性风格。Sylvie系列特别适合工作场合，而GG Marmont则更适合休闲聚会。',
    '女士': '我们的女士手袋系列丰富多样，从精致小巧的晚宴包到实用大容量的托特包，应有尽有。经典款如GG Marmont和Dionysus深受欢迎，而季节限定款则为追求独特的您提供了更多选择。每款手袋都经过精心设计，完美展现现代女性的优雅与自信。',
    '价格范围': 'Gucci手袋的价格范围根据款式、材质和系列有所不同。入门级款式起价约人民币8,000元，经典款如GG Marmont系列价格在15,000-25,000元之间，而限量版或特殊材质的高端款式可能超过30,000元。所有产品都体现了Gucci的卓越品质和精湛工艺。',
    '售后服务': '我们提供全面的售后服务，包括1年质保、专业清洁保养服务以及维修服务。购买后您会获得详细的保养指南，如有任何问题，欢迎随时联系我们的客服团队或前往专柜咨询。我们致力于确保您对Gucci产品的满意体验。',
    '鞋履': 'Gucci鞋履系列融合了舒适与时尚，包括运动鞋、乐福鞋、高跟鞋等多种款式，每双鞋都经过精心设计，确保舒适度的同时彰显品牌特色。',
    '配饰': 'Gucci配饰系列包括腰带、围巾、珠宝、手表等，这些小巧精致的物品能为您的整体造型增添亮点，展现独特品味。',
    '成衣': 'Gucci成衣系列涵盖男装和女装，从日常休闲装到正式礼服，每件服装都体现了品牌对细节的关注和对创新的追求。',
    '介绍': '欢迎了解Gucci产品！作为意大利奢侈品牌，Gucci以其精湛工艺和独特设计享誉全球。我们提供手袋、鞋履、成衣和配饰等多种产品，每件都融合了品牌传统与创新元素。请问您对哪类产品特别感兴趣？',
    '语音': '您可以使用语音功能与我交流！点击麦克风图标，说出您的问题，我会将语音转换为文字并为您提供专业解答。这项功能让您在忙碌时也能轻松获取产品信息。',
    '声音': '我们的AI助手支持语音互动功能！您可以点击麦克风按钮开始语音输入，系统会自动将您的语音转换为文字。如果您需要，我也可以将回复以语音形式播放给您，让您的购物体验更加便捷。',
  },
};

// 自定义错误类
class NextChatError extends Error {
  constructor(message, type = 'GENERAL') {
    super(message);
    this.name = 'NextChatError';
    this.type = type;
  }
}

class VoiceRecognitionError extends NextChatError {
  constructor(message) {
    super(message, 'VOICE_RECOGNITION');
  }
}

class ImageProcessingError extends NextChatError {
  constructor(message) {
    super(message, 'IMAGE_PROCESSING');
  }
}

class ResourceLoadError extends NextChatError {
  constructor(message) {
    super(message, 'RESOURCE_LOAD');
  }
}

/**
 * 工具函数集合
 */
class NextChatUtils {
  // HTML转义防止XSS
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 输入验证
  static validateMessage(message) {
    if (!message || typeof message !== 'string') {
      throw new NextChatError('消息内容无效', 'VALIDATION');
    }

    if (message.length > NEXTCHAT_CONFIG.MAX_MESSAGE_LENGTH) {
      throw new NextChatError(`消息长度不能超过${NEXTCHAT_CONFIG.MAX_MESSAGE_LENGTH}字符`, 'VALIDATION');
    }

    return message.trim();
  }

  // 文件类型验证
  static validateImageFile(file) {
    if (!file || !file.type) {
      throw new ImageProcessingError('无效的文件');
    }

    if (!NEXTCHAT_CONFIG.SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
      throw new ImageProcessingError('不支持的图片格式');
    }

    if (file.size > NEXTCHAT_CONFIG.MAX_IMAGE_SIZE) {
      throw new ImageProcessingError('图片文件过大');
    }

    return true;
  }

  // 防抖函数
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 节流函数
  static throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // 格式化时间
  static formatTime(date = new Date()) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // 生成唯一ID
  static generateId(prefix = 'msg') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 资源加载管理器
 */
class ResourceLoader {
  constructor() {
    this.loadedResources = new Set();
    this.loadingPromises = new Map();
  }

  async loadResource(tag, attributes, timeout = NEXTCHAT_CONFIG.CDN_TIMEOUT) {
    const resourceKey = `${tag}_${attributes.src || attributes.href}`;

    // 如果已经加载过，直接返回
    if (this.loadedResources.has(resourceKey)) {
      return Promise.resolve();
    }

    // 如果正在加载，返回现有的Promise
    if (this.loadingPromises.has(resourceKey)) {
      return this.loadingPromises.get(resourceKey);
    }

    const loadPromise = new Promise((resolve, reject) => {
      const element = document.createElement(tag);

      // 设置超时
      const timeoutId = setTimeout(() => {
        reject(new ResourceLoadError(`资源加载超时: ${attributes.src || attributes.href}`));
      }, timeout);

      element.onload = () => {
        clearTimeout(timeoutId);
        this.loadedResources.add(resourceKey);
        this.loadingPromises.delete(resourceKey);
        resolve();
      };

      element.onerror = () => {
        clearTimeout(timeoutId);
        this.loadingPromises.delete(resourceKey);
        reject(new ResourceLoadError(`资源加载失败: ${attributes.src || attributes.href}`));
      };

      // 设置属性
      Object.assign(element, attributes);
      document.head.appendChild(element);
    });

    this.loadingPromises.set(resourceKey, loadPromise);
    return loadPromise;
  }

  async loadResourceWithMultipleFallbacks(tag, primaryAttributes, fallbackSources, resourceName = 'resource') {
    try {
      console.log(`[FALLBACK] Loading ${resourceName} from primary source...`);
      await this.loadResource(tag, primaryAttributes);
      console.log(`[FALLBACK] ${resourceName} loaded successfully from primary source`);
    } catch (error) {
      console.warn(`[FALLBACK] Failed to load ${resourceName} from primary source:`, error);

      if (fallbackSources && fallbackSources.length > 0) {
        for (let i = 0; i < fallbackSources.length; i++) {
          const fallbackSource = fallbackSources[i];
          const fallbackAttributes = { ...primaryAttributes };
          
          if (tag === 'script') {
            fallbackAttributes.src = fallbackSource;
          } else if (tag === 'link') {
            fallbackAttributes.href = fallbackSource;
          }
          
          console.log(`[FALLBACK] *** TRYING FALLBACK ${i + 1} for ${resourceName} ***`, fallbackAttributes);
          try {
            await this.loadResource(tag, fallbackAttributes);
            console.log(`[FALLBACK] *** ${resourceName} loaded successfully using FALLBACK ${i + 1} ***`);
            return; // 成功加载，退出循环
          } catch (fallbackError) {
            console.error(`[FALLBACK] *** FAILED to load ${resourceName} from FALLBACK ${i + 1}:`, fallbackError);
            if (i === fallbackSources.length - 1) {
              // 最后一个备用源也失败了，抛出错误
              throw fallbackError;
            }
          }
        }
      } else {
        console.log(`[FALLBACK] No fallback available for ${resourceName}`);
        throw error;
      }
    }
  }

  async loadResourceWithFallback(tag, primaryAttributes, fallbackAttributes, resourceName = 'resource') {
    try {
      console.log(`[FALLBACK] Loading ${resourceName} from primary source...`);
      await this.loadResource(tag, primaryAttributes);
      console.log(`[FALLBACK] ${resourceName} loaded successfully from primary source`);
    } catch (error) {
      console.warn(`[FALLBACK] Failed to load ${resourceName} from primary source:`, error);

      if (fallbackAttributes) {
        console.log(`[FALLBACK] *** TRYING FALLBACK for ${resourceName} ***`, fallbackAttributes);
        try {
          await this.loadResource(tag, fallbackAttributes);
          console.log(`[FALLBACK] *** ${resourceName} loaded successfully using FALLBACK ***`);
        } catch (fallbackError) {
          console.error(`[FALLBACK] *** FAILED to load ${resourceName} from FALLBACK source:`, fallbackError);
          throw fallbackError;
        }
      } else {
        console.log(`[FALLBACK] No fallback available for ${resourceName}`);
        throw error;
      }
    }
  }

  // 批量加载资源
  async loadResources(resources) {
    const results = {
      success: 0,
      failed: 0,
      details: [],
    };

    const loadPromises = resources.map(async (resource) => {
      try {
        if (resource.fallbackSources) {
          await this.loadResourceWithMultipleFallbacks(
            resource.tag,
            resource.attributes,
            resource.fallbackSources,
            resource.name || 'resource',
          );
        } else if (resource.fallbackAttributes) {
          await this.loadResourceWithFallback(
            resource.tag,
            resource.attributes,
            resource.fallbackAttributes,
            resource.name || 'resource',
          );
        } else {
          await this.loadResource(
            resource.tag,
            resource.attributes,
            resource.timeout || NEXTCHAT_CONFIG.CDN_TIMEOUT,
          );
        }
        
        results.success++;
        results.details.push({
          name: resource.name || 'resource',
          status: 'success',
          url: resource.attributes.src || resource.attributes.href,
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          name: resource.name || 'resource',
          status: 'failed',
          url: resource.attributes.src || resource.attributes.href,
          error: error.message,
        });
        throw error;
      }
    });

    try {
      await Promise.all(loadPromises);
    } catch (error) {
      // 继续执行，即使部分资源加载失败
      console.warn('部分资源加载失败，但继续执行初始化');
    }

    return results;
  }
}