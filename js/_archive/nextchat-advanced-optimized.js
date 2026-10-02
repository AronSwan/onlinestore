/**
 * NextChatAdvanced AI助手主类 - 优化版本
 * 提供文本、图片、语音交互功能，集成向量数据库
 */

// 作者：AI助手
// 时间：2025-06-17 10:30:00
// 用途：提供高级AI聊天功能，支持文本、图像和语音交互，集成向量数据库，用于电商网站智能客服
// 依赖文件：tensorflow, recorder-js, heic2any, chromadb (通过CDN加载)

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

class NextChatAdvanced {
  constructor(options = {}) {
    // 配置初始化
    this.config = {
      container: options.container || document.body,
      cdnBase: options.cdnBase || 'https://cdn.jsdelivr.net/npm',
      autoInit: options.autoInit !== false,
      enableVoice: options.enableVoice !== false,
      enableImage: options.enableImage !== false,
      enableVectorDB: options.enableVectorDB !== false,
      enableAutoSpeak: options.enableAutoSpeak !== false,
      debug: options.debug || false,
      ...options,
    };

    // 状态管理
    this.state = {
      isInitialized: false,
      isRecording: false,
      isProcessing: false,
      isSpeaking: false,
      autoSpeakEnabled: this.config.enableAutoSpeak,
      voiceControlVisible: false,
      imageUploadVisible: false,
      chatWindowVisible: false,
      lastUserMessage: '',
      lastAIResponse: '',
      messageHistory: [],
      recognition: null,
      speechSynthesis: null,
      currentVoice: null,
      audioContext: null,
      analyser: null,
      dataArray: null,
      animationId: null,
      vectorDB: null,
      audioStream: null,
      recorder: null,
      voices: [],
      currentSpeechRate: 1.0,
    };

    // DOM元素引用
    this.elements = {
      launcher: null,
      chatWindow: null,
      chatMessages: null,
      chatInput: null,
      sendButton: null,
      voiceButton: null,
      imageButton: null,
      closeButton: null,
      imageUpload: null,
      imagePreviewContainer: null,
      voiceControlContainer: null,
      voiceSelect: null,
      speechRateSlider: null,
      speakButton: null,
      stopButton: null,
      autoSpeakToggle: null,
      waveform: null,
    };

    // 资源加载器 - 延迟初始化
    this.resourceLoader = null;
    this._resourceLoaderPromise = null;

    // 创建资源加载器的方法
    this._getResourceLoader = () => {
      if (this.resourceLoader) {
        return Promise.resolve(this.resourceLoader);
      }

      if (this._resourceLoaderPromise) {
        return this._resourceLoaderPromise;
      }

      this._resourceLoaderPromise = new Promise((resolve, reject) => {
        if (typeof ResourceLoader !== 'undefined') {
          this.resourceLoader = new ResourceLoader();
          resolve(this.resourceLoader);
        } else {
          console.warn('ResourceLoader is not defined. Waiting for it to be defined...');
          // 延迟初始化，等待ResourceLoader被定义
          const checkInterval = setInterval(() => {
            if (typeof ResourceLoader !== 'undefined') {
              clearInterval(checkInterval);
              this.resourceLoader = new ResourceLoader();
              console.log('ResourceLoader is now defined and initialized');
              resolve(this.resourceLoader);
            }
          }, 100); // 每100毫秒检查一次

          // 设置超时，避免无限等待
          setTimeout(() => {
            clearInterval(checkInterval);
            if (!this.resourceLoader) {
              console.error('ResourceLoader is still not defined after waiting. Make sure ResourceLoader class is defined before NextChatAdvanced class');
              reject(new Error('ResourceLoader is not defined. Make sure ResourceLoader class is defined before NextChatAdvanced class'));
            }
          }, 5000); // 最多等待5秒
        }
      });

      return this._resourceLoaderPromise;
    };

    // 自动初始化
    if (this.config.autoInit) {
      this.init();
    }
  }

  // 验证CDN基础URL
  validateCdnBase() {
    if (!this.config.cdnBase) {
      throw new NextChatError('CDN基础URL未配置');
    }

    // 确保CDN基础URL以/结尾
    if (!this.config.cdnBase.endsWith('/')) {
      this.config.cdnBase += '/';
    }

    // 验证CDN基础URL格式
    try {
      new URL(this.config.cdnBase);
    } catch (e) {
      throw new NextChatError(`无效的CDN基础URL: ${this.config.cdnBase}`);
    }
  }

  // 初始化方法
  async init() {
    try {
      if (this.state.isInitialized) {
        console.warn('NextChatAdvanced已经初始化');
        return;
      }

      console.log('正在初始化NextChatAdvanced...');

      // 验证CDN配置
      this.validateCdnBase();

      // 加载必要的资源
      await this.loadResources();

      // 初始化组件
      await this.initializeComponents();

      // 创建UI
      this.createUI();

      // 设置事件监听器
      this.setupEventListeners();

      // 标记为已初始化
      this.state.isInitialized = true;

      console.log('NextChatAdvanced初始化完成');

      // 触发就绪事件
      this.notifyReady();
    } catch (error) {
      console.error('NextChatAdvanced初始化失败:', error);
      this.handleError(error);
      throw error;
    }
  }

  // 加载必要的资源
  async loadResources() {
    console.log('加载必要的资源...');

    // 确保resourceLoader已初始化
    const resourceLoader = await this._getResourceLoader();

    // 构建资源列表
    const resources = [];

    // 添加TensorFlow.js资源
    if (this.config.enableImage) {
      resources.push({
        tag: 'script',
        attributes: {
          src: NEXTCHAT_CONFIG.CDN_RESOURCES.tensorflow,
          async: true,
          defer: true,
        },
        timeout: NEXTCHAT_CONFIG.CDN_TIMEOUT,
      });
    }

    // 添加录音库资源
    if (this.config.enableVoice) {
      resources.push({
        tag: 'script',
        attributes: {
          src: NEXTCHAT_CONFIG.CDN_RESOURCES.recorder,
          async: true,
          defer: true,
        },
        timeout: NEXTCHAT_CONFIG.CDN_TIMEOUT,
      });
    }

    // 添加HEIC转换库资源
    if (this.config.enableImage) {
      resources.push({
        tag: 'script',
        attributes: {
          src: NEXTCHAT_CONFIG.CDN_RESOURCES.heic2any,
          async: true,
          defer: true,
        },
        timeout: NEXTCHAT_CONFIG.CDN_TIMEOUT,
      });
    }

    // 添加向量数据库资源
    if (this.config.enableVectorDB) {
      resources.push({
        tag: 'script',
        attributes: {
          src: NEXTCHAT_CONFIG.CDN_RESOURCES.chromadb,
          async: true,
          defer: true,
        },
        timeout: NEXTCHAT_CONFIG.CDN_TIMEOUT,
      });
    }

    // 批量加载资源
    const loadResults = await resourceLoader.loadResources(resources);

    // 检查加载结果
    if (loadResults.failed > 0) {
      console.warn(`部分资源加载失败: ${loadResults.failed}个资源`);
    }

    console.log(`资源加载完成: ${loadResults.success}个资源成功加载`);
  }

  // 初始化组件
  async initializeComponents() {
    console.log('初始化组件...');

    // 初始化语音识别
    if (this.config.enableVoice) {
      await this.initializeVoiceRecognition();
    }

    // 初始化图片上传
    if (this.config.enableImage) {
      await this.initializeImageUpload();
    }

    // 初始化向量数据库
    if (this.config.enableVectorDB) {
      await this.initializeVectorDB();
    }

    // 初始化语音合成
    if (this.config.enableVoice) {
      await this.initializeSpeechSynthesis();
    }

    console.log('组件初始化完成');
  }

  // 创建内存向量数据库
  createMemoryVectorDB() {
    console.log('创建内存向量数据库...');

    const memoryVectorDB = {
      messages: [],

      // 添加消息到向量数据库
      async addMessage(message) {
        try {
          const embedding = this.simpleTextEmbedding(message.content);
          this.messages.push({
            id: message.id || this.generateId(),
            content: message.content,
            sender: message.sender,
            timestamp: message.timestamp || new Date().toISOString(),
            embedding: embedding,
          });
          console.log('消息已添加到内存向量数据库');
        } catch (error) {
          console.error('添加消息到内存向量数据库失败:', error);
        }
      },

      // 查询相似消息
      async querySimilarMessages(query, limit = 5) {
        try {
          if (this.messages.length === 0) {
            return [];
          }

          const queryEmbedding = this.simpleTextEmbedding(query);
          const similarities = this.messages.map(msg => {
            const similarity = this.cosineSimilarity(queryEmbedding, msg.embedding);
            return {
              message: msg,
              similarity: similarity,
            };
          });

          // 按相似度排序并返回最相似的消息
          return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .map(item => item.message);
        } catch (error) {
          console.error('查询内存向量数据库失败:', error);
          return [];
        }
      },

      // 简单的文本嵌入
      simpleTextEmbedding(text) {
        const words = text.toLowerCase().split(/\s+/);
        const embedding = new Array(NEXTCHAT_CONFIG.VECTOR_EMBEDDING_SIZE).fill(0);

        words.forEach((word, index) => {
          if (index < NEXTCHAT_CONFIG.VECTOR_EMBEDDING_SIZE) {
            embedding[index] = word.length / 10;
          }
        });

        return embedding;
      },

      // 计算余弦相似度
      cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
          return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
          dotProduct += vecA[i] * vecB[i];
          normA += vecA[i] * vecA[i];
          normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) {
          return 0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      },

      // 生成ID
      generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
      },
    };

    return memoryVectorDB;
  }

  // 创建UI
  createUI() {
    console.log('创建UI...');

    // 创建启动器
    this.createLauncher();

    // 创建聊天窗口
    this.createChatWindow();

    console.log('UI创建完成');
  }

  // 创建启动器
  createLauncher() {
    const launcher = document.createElement('div');
    launcher.className = 'nextchat-launcher';
    launcher.setAttribute('role', 'button');
    launcher.setAttribute('aria-label', '打开AI助手');
    launcher.setAttribute('tabindex', '0');
    launcher.innerHTML = `
      <div class="nextchat-launcher-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="currentColor"/>
        </svg>
      </div>
    `;

    // 添加点击事件
    launcher.addEventListener('click', () => {
      this.toggleChatWindow();
    });

    // 添加键盘事件
    launcher.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleChatWindow();
      }
    });

    // 添加到容器
    this.config.container.appendChild(launcher);
    this.elements.launcher = launcher;
  }

  // 创建聊天窗口
  createChatWindow() {
    const chatWindow = document.createElement('div');
    chatWindow.className = 'nextchat-chat-window';
    chatWindow.setAttribute('role', 'dialog');
    chatWindow.setAttribute('aria-label', 'AI助手聊天窗口');
    chatWindow.setAttribute('tabindex', '-1');
    chatWindow.style.display = 'none';

    // 创建头部
    const header = document.createElement('div');
    header.className = 'nextchat-header';

    // 创建标题
    const title = document.createElement('div');
    title.className = 'nextchat-title';
    title.textContent = 'AI助手';
    header.appendChild(title);

    // 创建操作按钮容器
    const actions = document.createElement('div');
    actions.className = 'nextchat-actions';

    // 创建语音按钮
    if (this.config.enableVoice) {
      const voiceButton = document.createElement('button');
      voiceButton.className = 'nextchat-button nextchat-voice-button';
      voiceButton.setAttribute('role', 'button');
      voiceButton.setAttribute('aria-label', '语音输入');
      voiceButton.setAttribute('title', '语音输入');
      voiceButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="currentColor"/>
          <path d="M17 11C17 14.31 14.31 17 11 17C7.69 17 5 14.31 5 11H3C3 15.53 6.61 19.32 11 19.92V22H13V19.92C17.39 19.32 21 15.53 21 11H17Z" fill="currentColor"/>
        </svg>
      `;
      actions.appendChild(voiceButton);
      this.elements.voiceButton = voiceButton;
    }

    // 创建图片按钮
    if (this.config.enableImage) {
      const imageButton = document.createElement('button');
      imageButton.className = 'nextchat-button nextchat-image-button';
      imageButton.setAttribute('role', 'button');
      imageButton.setAttribute('aria-label', '上传图片');
      imageButton.setAttribute('title', '上传图片');
      imageButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.5L14.5 12L19 18H5L8.5 13.5Z" fill="currentColor"/>
        </svg>
      `;
      actions.appendChild(imageButton);
      this.elements.imageButton = imageButton;
    }

    // 创建关闭按钮
    const closeButton = document.createElement('button');
    closeButton.className = 'nextchat-button nextchat-close-button';
    closeButton.setAttribute('role', 'button');
    closeButton.setAttribute('aria-label', '关闭聊天窗口');
    closeButton.setAttribute('title', '关闭');
    closeButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
      </svg>
    `;
    actions.appendChild(closeButton);
    this.elements.closeButton = closeButton;

    header.appendChild(actions);
    chatWindow.appendChild(header);

    // 创建消息容器
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'nextchat-messages-container';

    const messages = document.createElement('div');
    messages.className = 'nextchat-messages';
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-live', 'polite');
    messagesContainer.appendChild(messages);
    chatWindow.appendChild(messagesContainer);
    this.elements.chatMessages = messages;

    // 创建输入区域
    const inputContainer = document.createElement('div');
    inputContainer.className = 'nextchat-input-container';

    const input = document.createElement('textarea');
    input.className = 'nextchat-input';
    input.setAttribute('role', 'textbox');
    input.setAttribute('aria-label', '输入消息');
    input.setAttribute('placeholder', '输入您的问题...');
    input.setAttribute('rows', '1');
    inputContainer.appendChild(input);
    this.elements.chatInput = input;

    const sendButton = document.createElement('button');
    sendButton.className = 'nextchat-button nextchat-send-button';
    sendButton.setAttribute('role', 'button');
    sendButton.setAttribute('aria-label', '发送消息');
    sendButton.setAttribute('title', '发送');
    sendButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.01 21L23 12L2.01 3V10L17 12L2.01 14V21Z" fill="currentColor"/>
      </svg>
    `;
    inputContainer.appendChild(sendButton);
    this.elements.sendButton = sendButton;

    chatWindow.appendChild(inputContainer);

    // 创建图片上传区域
    if (this.config.enableImage) {
      const imageUpload = document.createElement('div');
      imageUpload.className = 'nextchat-image-upload';
      imageUpload.style.display = 'none';

      const imageUploadHeader = document.createElement('div');
      imageUploadHeader.className = 'nextchat-image-upload-header';
      imageUploadHeader.textContent = '上传图片';
      imageUpload.appendChild(imageUploadHeader);

      const imageUploadContent = document.createElement('div');
      imageUploadContent.className = 'nextchat-image-upload-content';

      const imageUploadArea = document.createElement('div');
      imageUploadArea.className = 'nextchat-image-upload-area';
      imageUploadArea.setAttribute('role', 'button');
      imageUploadArea.setAttribute('aria-label', '点击或拖拽图片到此处上传');
      imageUploadArea.setAttribute('tabindex', '0');
      imageUploadArea.innerHTML = `
        <div class="nextchat-image-upload-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 16H15V10H19L12 3L5 10H9V16Z" fill="currentColor"/>
            <path d="M5 18V20H19V18H5Z" fill="currentColor"/>
          </svg>
        </div>
        <div class="nextchat-image-upload-text">点击或拖拽图片到此处上传</div>
        <div class="nextchat-image-upload-hint">支持 JPG, PNG, GIF, WEBP 格式，最大 256KB</div>
      `;
      imageUploadContent.appendChild(imageUploadArea);

      const imagePreviewContainer = document.createElement('div');
      imagePreviewContainer.className = 'nextchat-image-preview-container';
      imageUploadContent.appendChild(imagePreviewContainer);

      imageUpload.appendChild(imageUploadContent);
      chatWindow.appendChild(imageUpload);
      this.elements.imageUpload = imageUpload;
      this.elements.imagePreviewContainer = imagePreviewContainer;
    }

    // 添加到容器
    this.config.container.appendChild(chatWindow);
    this.elements.chatWindow = chatWindow;
  }

  // 设置事件监听器
  setupEventListeners() {
    console.log('设置事件监听器...');

    // 关闭按钮点击事件
    if (this.elements.closeButton) {
      this.elements.closeButton.addEventListener('click', () => {
        this.toggleChatWindow();
      });
    }

    // 发送按钮点击事件
    if (this.elements.sendButton) {
      this.elements.sendButton.addEventListener('click', () => {
        this.sendMessage();
      });
    }

    // 输入框回车事件
    if (this.elements.chatInput) {
      this.elements.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // 输入框自动调整高度
      this.elements.chatInput.addEventListener('input', () => {
        this.autoResizeTextarea();
      });
    }

    // 语音按钮点击事件
    if (this.elements.voiceButton) {
      this.elements.voiceButton.addEventListener('click', () => {
        this.toggleVoiceRecording();
      });
    }

    // 图片按钮点击事件
    if (this.elements.imageButton) {
      this.elements.imageButton.addEventListener('click', () => {
        this.toggleImageUpload();
      });
    }

    // 图片上传区域事件
    if (this.elements.imageUpload) {
      this.setupImageUploadEvents();
    }

    // 窗口失焦事件
    window.addEventListener('blur', () => {
      if (this.state.chatWindowVisible) {
        this.elements.chatWindow.classList.add('nextchat-blur');
      }
    });

    // 窗口聚焦事件
    window.addEventListener('focus', () => {
      if (this.state.chatWindowVisible) {
        this.elements.chatWindow.classList.remove('nextchat-blur');
      }
    });

    // 点击窗口外部关闭聊天窗口
    document.addEventListener('click', (e) => {
      if (
        this.state.chatWindowVisible &&
        !this.elements.chatWindow.contains(e.target) &&
        !this.elements.launcher.contains(e.target)
      ) {
        this.toggleChatWindow();
      }
    });

    console.log('事件监听器设置完成');
  }

  // 初始化语音识别
  async initializeVoiceRecognition() {
    console.log('初始化语音识别...');

    // 检查浏览器是否支持语音识别
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('浏览器不支持语音识别');
      return;
    }

    try {
      // 创建语音识别对象
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.state.recognition = new SpeechRecognition();

      // 配置语音识别
      this.state.recognition.lang = 'zh-CN';
      this.state.recognition.continuous = false;
      this.state.recognition.interimResults = true;
      this.state.recognition.maxAlternatives = 1;

      // 设置事件处理
      this.state.recognition.onstart = () => {
        console.log('语音识别开始');
        this.state.isRecording = true;
        this.updateVoiceButtonUI();
      };

      this.state.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // 更新输入框
        if (this.elements.chatInput) {
          this.elements.chatInput.value = finalTranscript || interimTranscript;
          this.autoResizeTextarea();
        }

        // 如果有最终结果，停止录音
        if (finalTranscript) {
          this.stopVoiceRecording();
        }
      };

      this.state.recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        this.stopVoiceRecording();
        this.showNotification(`语音识别错误: ${event.error}`, 'error');
      };

      this.state.recognition.onend = () => {
        console.log('语音识别结束');
        this.state.isRecording = false;
        this.updateVoiceButtonUI();
      };

      console.log('语音识别初始化完成');
    } catch (error) {
      console.error('语音识别初始化失败:', error);
      throw new VoiceRecognitionError(`语音识别初始化失败: ${error.message}`);
    }
  }

  // 初始化图片上传
  async initializeImageUpload() {
    console.log('初始化图片上传...');

    // 检查浏览器是否支持FileReader
    if (!window.FileReader) {
      console.warn('浏览器不支持FileReader');
      return;
    }

    // 创建隐藏的文件输入
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', (e) => {
      this.handleImageFiles(e.target.files);
    });

    // 添加到DOM
    this.config.container.appendChild(fileInput);
    this.elements.fileInput = fileInput;

    console.log('图片上传初始化完成');
  }

  // 初始化向量数据库
  async initializeVectorDB() {
    console.log('初始化向量数据库...');

    try {
      // 检查是否支持IndexedDB
      if (!window.indexedDB) {
        console.warn('浏览器不支持IndexedDB，使用内存存储');
        this.state.vectorDB = this.createMemoryVectorDB();
        return;
      }

      // 检查ChromaDB是否可用
      if (typeof ChromaDB !== 'undefined') {
        // 使用ChromaDB
        this.state.vectorDB = new ChromaDB({
          name: 'nextchat-vector-db',
          dimension: NEXTCHAT_CONFIG.VECTOR_EMBEDDING_SIZE,
        });
        await this.state.vectorDB.connect();
      } else {
        console.warn('ChromaDB不可用，使用内存存储');
        this.state.vectorDB = this.createMemoryVectorDB();
      }

      console.log('向量数据库初始化完成');
    } catch (error) {
      console.error('向量数据库初始化失败:', error);
      // 降级到内存存储
      this.state.vectorDB = this.createMemoryVectorDB();
      console.log('使用内存存储作为向量数据库');
    }
  }

  // 初始化语音合成
  async initializeSpeechSynthesis() {
    console.log('初始化语音合成...');

    // 检查浏览器是否支持语音合成
    if (!('speechSynthesis' in window)) {
      console.warn('浏览器不支持语音合成');
      return;
    }

    try {
      // 获取语音合成对象
      this.state.speechSynthesis = window.speechSynthesis;

      // 加载语音列表
      this.loadVoices();

      // 监听语音列表变化
      if (this.state.speechSynthesis.onvoiceschanged !== undefined) {
        this.state.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }

      // 设置语音合成事件
      this.state.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };

      console.log('语音合成初始化完成');
    } catch (error) {
      console.error('语音合成初始化失败:', error);
      throw new VoiceRecognitionError(`语音合成初始化失败: ${error.message}`);
    }
  }

  // 加载语音列表
  loadVoices() {
    if (!this.state.speechSynthesis) {
      return;
    }

    // 获取可用语音
    this.state.voices = this.state.speechSynthesis.getVoices();

    // 过滤中文语音
    const chineseVoices = this.state.voices.filter(voice =>
      voice.lang.includes('zh') || voice.name.includes('Chinese'),
    );

    // 如果有中文语音，选择第一个
    if (chineseVoices.length > 0) {
      this.state.currentVoice = chineseVoices[0];
    } else if (this.state.voices.length > 0) {
      // 如果没有中文语音，选择第一个语音
      this.state.currentVoice = this.state.voices[0];
    }

    console.log(`加载了${this.state.voices.length}个语音，当前语音: ${this.state.currentVoice ? this.state.currentVoice.name : '无'}`);
  }

  // 切换聊天窗口
  toggleChatWindow() {
    if (!this.state.isInitialized) {
      console.warn('NextChatAdvanced未初始化');
      return;
    }

    this.state.chatWindowVisible = !this.state.chatWindowVisible;

    if (this.state.chatWindowVisible) {
      // 显示聊天窗口
      this.elements.chatWindow.style.display = 'block';

      // 添加动画类
      setTimeout(() => {
        this.elements.chatWindow.classList.add('nextchat-visible');
      }, 10);

      // 聚焦到输入框
      setTimeout(() => {
        if (this.elements.chatInput) {
          this.elements.chatInput.focus();
        }
      }, 300);

      // 滚动到底部
      this.scrollToBottom();
    } else {
      // 隐藏聊天窗口
      this.elements.chatWindow.classList.remove('nextchat-visible');

      // 停止录音
      if (this.state.isRecording) {
        this.stopVoiceRecording();
      }

      // 停止语音播放
      if (this.state.isSpeaking) {
        this.stopSpeaking();
      }

      // 隐藏图片上传
      if (this.state.imageUploadVisible) {
        this.toggleImageUpload();
      }

      setTimeout(() => {
        this.elements.chatWindow.style.display = 'none';
      }, 300);
    }

    // 更新启动器状态
    this.updateLauncherUI();
  }

  // 更新启动器UI
  updateLauncherUI() {
    if (this.state.chatWindowVisible) {
      this.elements.launcher.classList.add('nextchat-active');
    } else {
      this.elements.launcher.classList.remove('nextchat-active');
    }
  }

  // 自动调整文本框高度
  autoResizeTextarea() {
    if (!this.elements.chatInput) {
      return;
    }

    // 重置高度
    this.elements.chatInput.style.height = 'auto';

    // 设置新高度
    const newHeight = Math.min(this.elements.chatInput.scrollHeight, 120);
    this.elements.chatInput.style.height = `${newHeight}px`;
  }

  // 滚动到底部
  scrollToBottom() {
    if (this.elements.chatMessages) {
      this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
  }

  // 显示通知
  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `nextchat-notification nextchat-${type}`;
    notification.textContent = message;

    // 添加到DOM
    this.config.container.appendChild(notification);

    // 添加动画类
    setTimeout(() => {
      notification.classList.add('nextchat-visible');
    }, 10);

    // 自动移除
    setTimeout(() => {
      notification.classList.remove('nextchat-visible');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  // 处理错误
  handleError(error) {
    console.error('NextChatAdvanced错误:', error);

    // 显示错误通知
    if (error instanceof NextChatError) {
      this.showNotification(error.message, 'error');
    } else {
      this.showNotification('发生未知错误', 'error');
    }

    // 触发错误事件
    this.dispatchEvent('error', { error });
  }

  // 触发自定义事件
  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(`nextchat:${eventName}`, {
      detail,
      bubbles: true,
      cancelable: true,
    });

    this.config.container.dispatchEvent(event);
  }

  // 通知就绪
  notifyReady() {
    this.dispatchEvent('ready', { instance: this });
  }

  // 发送消息
  async sendMessage() {
    if (!this.state.isInitialized) {
      console.warn('NextChatAdvanced未初始化');
      return;
    }

    // 获取输入内容
    const message = this.elements.chatInput.value.trim();

    // 检查消息是否为空
    if (!message) {
      return;
    }

    // 检查是否正在处理
    if (this.state.isProcessing) {
      this.showNotification('正在处理中，请稍候...', 'info');
      return;
    }

    try {
      // 设置处理状态
      this.state.isProcessing = true;

      // 保存用户消息
      this.state.lastUserMessage = message;

      // 添加用户消息到UI
      this.addMessageToUI('user', message);

      // 清空输入框
      this.elements.chatInput.value = '';
      this.autoResizeTextarea();

      // 添加处理中消息
      const processingMessageId = this.addProcessingMessageToUI();

      // 滚动到底部
      this.scrollToBottom();

      // 处理消息
      const response = await this.processMessage(message);

      // 保存AI回复
      this.state.lastAIResponse = response;

      // 移除处理中消息
      this.removeMessageFromUI();

      // 添加AI回复到UI
      this.addMessageToUI('ai', response);

      // 添加到消息历史
      this.state.messageHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      });

      this.state.messageHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      });

      // 存储到向量数据库
      if (this.state.vectorDB) {
        try {
          await this.state.vectorDB.addMessage({
            content: message,
            sender: 'user',
            timestamp: new Date().toISOString(),
          });

          await this.state.vectorDB.addMessage({
            content: response,
            sender: 'assistant',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('存储消息到向量数据库失败:', error);
        }
      }

      // 滚动到底部
      this.scrollToBottom();

      // 自动朗读
      if (this.state.autoSpeakEnabled) {
        this.speakLastAIMessage();
      }

      // 触发消息事件
      this.dispatchEvent('message', {
        userMessage: message,
        aiResponse: response,
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      this.handleError(error);
    } finally {
      // 重置处理状态
      this.state.isProcessing = false;
    }
  }

  // 处理消息
  async processMessage(message) {
    console.log('处理消息:', message);

    try {
      // 检查是否有向量数据库
      if (this.state.vectorDB) {
        try {
          // 查询相关消息
          const relatedMessages = await this.state.vectorDB.querySimilarMessages(message, 3);

          if (relatedMessages.length > 0) {
            console.log('找到相关消息:', relatedMessages);

            // 构建上下文
            const context = relatedMessages.map(msg =>
              `${msg.sender === 'user' ? '用户' : '助手'}: ${msg.content}`,
            ).join('\n');

            // 使用上下文处理消息
            return await this.processMessageWithContext(message, context);
          }
        } catch (error) {
          console.error('查询相关消息失败:', error);
        }
      }

      // 没有向量数据库或查询失败，直接处理消息
      return await this.processMessageDirectly(message);
    } catch (error) {
      console.error('处理消息失败:', error);
      throw new NextChatError(`处理消息失败: ${error.message}`);
    }
  }

  // 直接处理消息
  async processMessageDirectly(message) {
    console.log('直接处理消息:', message);

    // 检查预设回复 - 添加更详细的调试
    console.log('=== processMessageDirectly 开始 ===');
    console.log('1. NEXTCHAT_CONFIG存在:', !!NEXTCHAT_CONFIG);
    console.log('2. NEXTCHAT_CONFIG类型:', typeof NEXTCHAT_CONFIG);

    if (NEXTCHAT_CONFIG) {
      console.log('3. AI_RESPONSES存在:', !!NEXTCHAT_CONFIG.AI_RESPONSES);
      console.log('4. AI_RESPONSES类型:', typeof NEXTCHAT_CONFIG.AI_RESPONSES);
      console.log('5. AI_RESPONSES为null:', NEXTCHAT_CONFIG.AI_RESPONSES === null);
      console.log('6. AI_RESPONSES为undefined:', NEXTCHAT_CONFIG.AI_RESPONSES === undefined);

      // 在访问前再次验证
      const currentAiResponses = NEXTCHAT_CONFIG.AI_RESPONSES;
      console.log('7. 当前AI_RESPONSES:', currentAiResponses);
      console.log('8. 当前AI_RESPONSES类型:', typeof currentAiResponses);

      // 添加更严格的检查
      if (NEXTCHAT_CONFIG &&
        currentAiResponses &&
        typeof currentAiResponses === 'object' &&
        currentAiResponses !== null) {
        console.log('AI_RESPONSES验证通过，准备遍历');
        console.log('AI_RESPONSES键数量:', Object.keys(currentAiResponses).length);

        try {
          // 使用本地变量确保一致性
          const aiResponses = currentAiResponses;
          console.log('开始Object.entries遍历，aiResponses类型:', typeof aiResponses);
          console.log('aiResponses为null:', aiResponses === null);

          for (const [keyword, response] of Object.entries(aiResponses)) {
            if (message.toLowerCase().includes(keyword.toLowerCase())) {
              console.log('使用预设回复:', keyword);
              return response;
            }
          }
          console.log('预设回复遍历完成，未找到匹配');
        } catch (error) {
          console.error('遍历AI_RESPONSES时出错:', error);
          console.error('错误时的aiResponses:', aiResponses);
          console.error('错误时的aiResponses类型:', typeof aiResponses);
          throw error;
        }
      } else {
        console.warn('AI_RESPONSES验证失败，跳过预设回复检查');
        console.warn('条件检查结果:', {
          hasConfig: !!NEXTCHAT_CONFIG,
          hasAiResponses: !!currentAiResponses,
          isObject: typeof currentAiResponses === 'object',
          notNull: currentAiResponses !== null,
        });
      }
    } else {
      console.warn('NEXTCHAT_CONFIG不存在，跳过预设回复检查');
    }

    console.log('=== 使用默认回复逻辑 ===');

    // 模拟AI处理延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 生成回复
    const responses = [
      '我理解您的问题。让我为您提供一些相关信息。',
      '这是一个很好的问题。根据我的分析，我可以告诉您...',
      '感谢您的提问。基于现有信息，我的回答是...',
      '我明白了您的需求。以下是我的建议...',
      '这是一个复杂的问题，我会尽力为您提供准确的答案。',
    ];

    // 随机选择一个回复
    const response = responses[Math.floor(Math.random() * responses.length)];

    // 添加消息内容
    return `${response}\n\n关于"${message}"，我建议您可以进一步了解相关细节。如果您有更多问题，请随时告诉我。`;
  }

  // 使用上下文处理消息
  async processMessageWithContext(message, context) {
    console.log('使用上下文处理消息:', message, context);

    // 模拟AI处理延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 生成回复
    const responses = [
      '基于我们的对话历史，我认为...',
      '考虑到之前的交流，我的回答是...',
      '结合我们之前讨论的内容，我可以告诉您...',
      '根据上下文信息，我的分析结果是...',
    ];

    // 随机选择一个回复
    const response = responses[Math.floor(Math.random() * responses.length)];

    // 添加消息内容和上下文
    return `${response}\n\n关于"${message}"，结合我们之前的讨论，我建议您可以进一步了解相关细节。如果您有更多问题，请随时告诉我。`;
  }

  // 添加消息到UI
  addMessageToUI(role, content) {
    if (!this.elements.chatMessages) {
      return null;
    }

    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = `nextchat-message nextchat-${role}-message`;
    messageElement.setAttribute('role', role === 'user' ? 'user' : 'assistant');

    // 创建消息内容
    const messageContent = document.createElement('div');
    messageContent.className = 'nextchat-message-content';
    messageContent.textContent = content;
    messageElement.appendChild(messageContent);

    // 创建时间戳
    const timestamp = document.createElement('div');
    timestamp.className = 'nextchat-message-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    messageElement.appendChild(timestamp);

    // 添加到消息容器
    this.elements.chatMessages.appendChild(messageElement);

    // 返回消息ID
    return Date.now().toString();
  }

  // 添加处理中消息到UI
  addProcessingMessageToUI() {
    if (!this.elements.chatMessages) {
      return null;
    }

    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = 'nextchat-message nextchat-processing-message';
    messageElement.setAttribute('role', 'status');

    // 创建消息内容
    const messageContent = document.createElement('div');
    messageContent.className = 'nextchat-message-content';

    // 创建加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'nextchat-loading-indicator';
    loadingIndicator.innerHTML = `
      <div class="nextchat-loading-dot"></div>
      <div class="nextchat-loading-dot"></div>
      <div class="nextchat-loading-dot"></div>
    `;
    messageContent.appendChild(loadingIndicator);

    // 创建文本
    const text = document.createElement('div');
    text.textContent = '正在思考中...';
    messageContent.appendChild(text);

    messageElement.appendChild(messageContent);

    // 添加到消息容器
    this.elements.chatMessages.appendChild(messageElement);

    // 返回消息ID
    return Date.now().toString();
  }

  // 从UI移除消息
  removeMessageFromUI() {
    if (!this.elements.chatMessages) {
      return;
    }

    // 查找消息元素
    const messageElements = this.elements.chatMessages.querySelectorAll('.nextchat-message');

    for (const messageElement of messageElements) {
      // 简单实现：移除最后一个处理中消息
      if (messageElement.classList.contains('nextchat-processing-message')) {
        messageElement.remove();
        break;
      }
    }
  }

  // 切换语音录制
  toggleVoiceRecording() {
    if (!this.state.isInitialized) {
      console.warn('NextChatAdvanced未初始化');
      return;
    }

    if (this.state.isRecording) {
      this.stopVoiceRecording();
    } else {
      this.startVoiceRecording();
    }
  }

  // 开始语音录制
  startVoiceRecording() {
    if (!this.state.recognition) {
      this.showNotification('语音识别不可用', 'error');
      return;
    }

    try {
      // 开始语音识别
      this.state.recognition.start();
      console.log('开始语音录制');
    } catch (error) {
      console.error('开始语音录制失败:', error);
      this.showNotification('开始语音录制失败', 'error');
    }
  }

  // 停止语音录制
  stopVoiceRecording() {
    if (!this.state.recognition) {
      return;
    }

    try {
      // 停止语音识别
      this.state.recognition.stop();
      console.log('停止语音录制');
    } catch (error) {
      console.error('停止语音录制失败:', error);
    }
  }

  // 更新语音按钮UI
  updateVoiceButtonUI() {
    if (!this.elements.voiceButton) {
      return;
    }

    if (this.state.isRecording) {
      this.elements.voiceButton.classList.add('nextchat-recording');
    } else {
      this.elements.voiceButton.classList.remove('nextchat-recording');
    }
  }

  // 切换图片上传
  toggleImageUpload() {
    if (!this.state.isInitialized) {
      console.warn('NextChatAdvanced未初始化');
      return;
    }

    this.state.imageUploadVisible = !this.state.imageUploadVisible;

    if (this.state.imageUploadVisible) {
      // 显示图片上传区域
      this.elements.imageUpload.style.display = 'block';

      // 添加动画类
      setTimeout(() => {
        this.elements.imageUpload.classList.add('nextchat-visible');
      }, 10);
    } else {
      // 隐藏图片上传区域
      this.elements.imageUpload.classList.remove('nextchat-visible');

      // 清空预览
      if (this.elements.imagePreviewContainer) {
        this.elements.imagePreviewContainer.innerHTML = '';
      }

      setTimeout(() => {
        this.elements.imageUpload.style.display = 'none';
      }, 300);
    }

    // 更新图片按钮UI
    this.updateImageButtonUI();
  }

  // 更新图片按钮UI
  updateImageButtonUI() {
    if (!this.elements.imageButton) {
      return;
    }

    if (this.state.imageUploadVisible) {
      this.elements.imageButton.classList.add('nextchat-active');
    } else {
      this.elements.imageButton.classList.remove('nextchat-active');
    }
  }

  // 设置图片上传事件
  setupImageUploadEvents() {
    if (!this.elements.imageUpload) {
      return;
    }

    // 获取上传区域
    const uploadArea = this.elements.imageUpload.querySelector('.nextchat-image-upload-area');

    if (!uploadArea) {
      return;
    }

    // 点击上传
    uploadArea.addEventListener('click', () => {
      if (this.elements.fileInput) {
        this.elements.fileInput.click();
      }
    });

    // 拖拽事件
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('nextchat-drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('nextchat-drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('nextchat-drag-over');

      // 处理文件
      const files = e.dataTransfer.files;
      this.handleImageFiles(files);
    });
  }

  // 处理图片文件
  async handleImageFiles(files) {
    if (!files || files.length === 0) {
      return;
    }

    try {
      // 验证文件
      const validFiles = this.validateImageFiles(files);

      if (validFiles.length === 0) {
        this.showNotification('没有有效的图片文件', 'error');
        return;
      }

      // 处理每个文件
      for (const file of validFiles) {
        await this.processImageFile(file);
      }
    } catch (error) {
      console.error('处理图片文件失败:', error);
      this.showNotification(`处理图片文件失败: ${error.message}`, 'error');
    }
  }

  // 验证图片文件
  validateImageFiles(files) {
    const validFiles = [];
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = NEXTCHAT_CONFIG.MAX_FILE_SIZE;

    for (const file of files) {
      // 检查文件类型
      if (!validTypes.includes(file.type)) {
        console.warn(`不支持的文件类型: ${file.type}`);
        continue;
      }

      // 检查文件大小
      if (file.size > maxSize) {
        console.warn(`文件过大: ${file.size} bytes`);
        continue;
      }

      validFiles.push(file);
    }

    return validFiles;
  }

  // 处理图片文件
  async processImageFile(file) {
    console.log('处理图片文件:', file.name);

    try {
      // 读取文件
      const dataUrl = await this.readFileAsDataURL(file);

      // 创建预览
      const previewElement = this.createImagePreview(dataUrl, file.name);

      // 添加到预览容器
      if (this.elements.imagePreviewContainer) {
        this.elements.imagePreviewContainer.appendChild(previewElement);
      }

      // 处理图片
      await this.processAndSendImage(dataUrl, file.name);
    } catch (error) {
      console.error('处理图片文件失败:', error);
      throw new NextChatError(`处理图片文件失败: ${error.message}`);
    }
  }

  // 读取文件为DataURL
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target.result);
      };

      reader.onerror = () => {
        reject(new NextChatError('读取文件失败'));
      };

      reader.readAsDataURL(file);
    });
  }

  // 创建图片预览
  createImagePreview(dataUrl, fileName) {
    // 创建预览元素
    const previewElement = document.createElement('div');
    previewElement.className = 'nextchat-image-preview';

    // 创建图片元素
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = fileName;
    img.className = 'nextchat-preview-image';

    // 创建加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'nextchat-loading-indicator';
    loadingIndicator.innerHTML = `
      <div class="nextchat-loading-dot"></div>
      <div class="nextchat-loading-dot"></div>
      <div class="nextchat-loading-dot"></div>
    `;

    // 创建文件名标签
    const fileNameLabel = document.createElement('div');
    fileNameLabel.className = 'nextchat-preview-filename';
    fileNameLabel.textContent = fileName;

    // 创建操作按钮
    const actions = document.createElement('div');
    actions.className = 'nextchat-preview-actions';

    // 创建发送按钮
    const sendButton = document.createElement('button');
    sendButton.className = 'nextchat-button nextchat-preview-send';
    sendButton.setAttribute('role', 'button');
    sendButton.setAttribute('aria-label', '发送图片');
    sendButton.setAttribute('title', '发送');
    sendButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.01 21L23 12L2.01 3V10L17 12L2.01 14V21Z" fill="currentColor"/>
      </svg>
    `;

    // 创建删除按钮
    const deleteButton = document.createElement('button');
    deleteButton.className = 'nextchat-button nextchat-preview-delete';
    deleteButton.setAttribute('role', 'button');
    deleteButton.setAttribute('aria-label', '删除图片');
    deleteButton.setAttribute('title', '删除');
    deleteButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
      </svg>
    `;

    // 添加按钮到操作容器
    actions.appendChild(sendButton);
    actions.appendChild(deleteButton);

    // 添加元素到预览容器
    previewElement.appendChild(img);
    previewElement.appendChild(loadingIndicator);
    previewElement.appendChild(fileNameLabel);
    previewElement.appendChild(actions);

    // 添加事件监听器
    sendButton.addEventListener('click', () => {
      this.processAndSendImage(dataUrl, fileName);
    });

    deleteButton.addEventListener('click', () => {
      previewElement.remove();
    });

    // 图片加载完成事件
    img.onload = () => {
      loadingIndicator.style.display = 'none';
    };

    // 图片加载错误事件
    img.onerror = () => {
      loadingIndicator.innerHTML = '<div class="nextchat-error-message">加载失败</div>';
    };

    return previewElement;
  }

  // 处理并发送图片
  async processAndSendImage(dataUrl, fileName) {
    if (!this.state.isInitialized) {
      console.warn('NextChatAdvanced未初始化');
      return;
    }

    try {
      // 检查是否正在处理
      if (this.state.isProcessing) {
        this.showNotification('正在处理中，请稍候...', 'info');
        return;
      }

      // 设置处理状态
      this.state.isProcessing = true;

      // 添加处理中消息
      const processingMessageId = this.addProcessingMessageToUI();

      // 滚动到底部
      this.scrollToBottom();

      // 添加图片消息到UI
      this.addImageMessageToUI(dataUrl, fileName);

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 分析图片
      const analysisResult = await this.analyzeImage(dataUrl, fileName);

      // 移除处理中消息
      this.removeMessageFromUI();

      // 添加AI回复到UI
      this.addMessageToUI('ai', analysisResult);

      // 添加到消息历史
      this.state.messageHistory.push({
        role: 'user',
        content: `[图片: ${fileName}]`,
        timestamp: new Date().toISOString(),
        type: 'image',
        dataUrl: dataUrl,
      });

      this.state.messageHistory.push({
        role: 'assistant',
        content: analysisResult,
        timestamp: new Date().toISOString(),
      });

      // 存储到向量数据库
      if (this.state.vectorDB) {
        try {
          await this.state.vectorDB.addMessage({
            content: `[图片: ${fileName}]`,
            sender: 'user',
            timestamp: new Date().toISOString(),
            type: 'image',
            dataUrl: dataUrl,
          });

          await this.state.vectorDB.addMessage({
            content: analysisResult,
            sender: 'assistant',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('存储消息到向量数据库失败:', error);
        }
      }

      // 滚动到底部
      this.scrollToBottom();

      // 自动朗读
      if (this.state.autoSpeakEnabled) {
        this.speakLastAIMessage();
      }

      // 触发消息事件
      this.dispatchEvent('message', {
        userMessage: `[图片: ${fileName}]`,
        aiResponse: analysisResult,
        messageType: 'image',
      });
    } catch (error) {
      console.error('处理图片失败:', error);
      this.handleError(error);
    } finally {
      // 重置处理状态
      this.state.isProcessing = false;
    }
  }

  // 分析图片
  async analyzeImage(dataUrl, fileName) {
    console.log('分析图片:', fileName);

    try {
      // 模拟AI分析延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 生成分析结果
      const analysisResults = [
        `我看到了您上传的图片"${fileName}"。这是一张很有趣的图片，我可以从中提取一些信息。`,
        `感谢您分享图片"${fileName}"。我已经分析了这张图片，以下是我的观察结果。`,
        `您上传的图片"${fileName}"已经处理完成。根据我的分析，这张图片包含了一些有价值的信息。`,
      ];

      // 随机选择一个分析结果
      const analysisResult = analysisResults[Math.floor(Math.random() * analysisResults.length)];

      // 添加详细分析
      return `${analysisResult}\n\n图片分析结果显示，这张图片可能包含一些重要信息。如果您有关于这张图片的具体问题，请告诉我，我会尽力为您提供更详细的分析。`;
    } catch (error) {
      console.error('分析图片失败:', error);
      throw new NextChatError(`分析图片失败: ${error.message}`);
    }
  }

  // 添加图片消息到UI
  addImageMessageToUI(dataUrl, fileName) {
    if (!this.elements.chatMessages) {
      return null;
    }

    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = 'nextchat-message nextchat-user-message';
    messageElement.setAttribute('role', 'user');

    // 创建消息内容
    const messageContent = document.createElement('div');
    messageContent.className = 'nextchat-message-content';

    // 创建图片容器
    const imageContainer = document.createElement('div');
    imageContainer.className = 'nextchat-message-image-container';

    // 创建图片元素
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = fileName;
    img.className = 'nextchat-message-image';

    // 创建加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'nextchat-loading-indicator';
    loadingIndicator.innerHTML = `
      <div class="nextchat-loading-dot"></div>
      <div class="nextchat-loading-dot"></div>
      <div class="nextchat-loading-dot"></div>
    `;

    // 创建文件名标签
    const fileNameLabel = document.createElement('div');
    fileNameLabel.className = 'nextchat-message-filename';
    fileNameLabel.textContent = fileName;

    // 创建操作按钮
    const actions = document.createElement('div');
    actions.className = 'nextchat-message-actions';

    // 创建下载按钮
    const downloadButton = document.createElement('button');
    downloadButton.className = 'nextchat-button nextchat-message-download';
    downloadButton.setAttribute('role', 'button');
    downloadButton.setAttribute('aria-label', '下载图片');
    downloadButton.setAttribute('title', '下载');
    downloadButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 9H15V3H9V9H5L12 16L19 9Z" fill="currentColor"/>
        <path d="M5 18V20H19V18H5Z" fill="currentColor"/>
      </svg>
    `;

    // 添加按钮到操作容器
    actions.appendChild(downloadButton);

    // 添加元素到图片容器
    imageContainer.appendChild(img);
    imageContainer.appendChild(loadingIndicator);
    imageContainer.appendChild(fileNameLabel);
    imageContainer.appendChild(actions);

    // 添加图片容器到消息内容
    messageContent.appendChild(imageContainer);

    // 创建时间戳
    const timestamp = document.createElement('div');
    timestamp.className = 'nextchat-message-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();

    // 添加元素到消息元素
    messageElement.appendChild(messageContent);
    messageElement.appendChild(timestamp);

    // 添加到消息容器
    this.elements.chatMessages.appendChild(messageElement);

    // 添加事件监听器
    downloadButton.addEventListener('click', () => {
      this.downloadImage(dataUrl, fileName);
    });

    // 图片加载完成事件
    img.onload = () => {
      loadingIndicator.style.display = 'none';
    };

    // 图片加载错误事件
    img.onerror = () => {
      loadingIndicator.innerHTML = '<div class="nextchat-error-message">加载失败</div>';
    };

    // 返回消息ID
    return Date.now().toString();
  }

  // 下载图片
  downloadImage(dataUrl, fileName) {
    try {
      // 创建下载链接
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.target = '_blank';

      // 触发点击
      document.body.appendChild(link);
      link.click();

      // 清理
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    } catch (error) {
      console.error('下载图片失败:', error);
      this.showNotification('下载图片失败', 'error');
    }
  }

  // 朗读最后一条AI消息
  speakLastAIMessage() {
    if (!this.state.lastAIResponse) {
      console.warn('没有可朗读的AI消息');
      return;
    }

    this.speakText(this.state.lastAIResponse);
  }

  // 朗读文本
  speakText(text) {
    if (!this.state.speechSynthesis) {
      console.warn('语音合成不可用');
      return;
    }

    try {
      // 停止当前朗读
      this.stopSpeaking();

      // 创建语音合成对象
      const utterance = new SpeechSynthesisUtterance(text);

      // 设置语音
      if (this.state.currentVoice) {
        utterance.voice = this.state.currentVoice;
      }

      // 设置语速
      utterance.rate = this.state.currentSpeechRate;

      // 设置语言
      utterance.lang = 'zh-CN';

      // 设置事件处理
      utterance.onstart = () => {
        console.log('开始朗读');
        this.state.isSpeaking = true;
      };

      utterance.onend = () => {
        console.log('朗读结束');
        this.state.isSpeaking = false;
      };

      utterance.onerror = (event) => {
        console.error('朗读错误:', event.error);
        this.state.isSpeaking = false;
        this.showNotification('朗读失败', 'error');
      };

      // 开始朗读
      this.state.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('朗读失败:', error);
      this.showNotification('朗读失败', 'error');
    }
  }

  // 停止朗读
  stopSpeaking() {
    if (!this.state.speechSynthesis) {
      return;
    }

    try {
      // 停止所有朗读
      this.state.speechSynthesis.cancel();
      this.state.isSpeaking = false;
      console.log('停止朗读');
    } catch (error) {
      console.error('停止朗读失败:', error);
    }
  }

  // 切换自动朗读
  toggleAutoSpeak() {
    this.state.autoSpeakEnabled = !this.state.autoSpeakEnabled;

    // 更新UI
    if (this.elements.autoSpeakToggle) {
      this.elements.autoSpeakToggle.checked = this.state.autoSpeakEnabled;
    }

    // 显示通知
    this.showNotification(
      this.state.autoSpeakEnabled ? '自动朗读已开启' : '自动朗读已关闭',
      'info',
    );

    // 触发事件
    this.dispatchEvent('autoSpeakChanged', {
      enabled: this.state.autoSpeakEnabled,
    });
  }

  // 设置语音
  setVoice(voiceUri) {
    if (!this.state.voices || this.state.voices.length === 0) {
      console.warn('没有可用的语音');
      return;
    }

    try {
      // 查找语音
      const voice = this.state.voices.find(v => v.voiceURI === voiceUri);

      if (voice) {
        this.state.currentVoice = voice;
        console.log('设置语音:', voice.name);

        // 触发事件
        this.dispatchEvent('voiceChanged', {
          voice: voice,
        });
      } else {
        console.warn('未找到语音:', voiceUri);
      }
    } catch (error) {
      console.error('设置语音失败:', error);
    }
  }

  // 设置语速
  setSpeechRate(rate) {
    try {
      // 验证语速范围
      rate = Math.max(0.5, Math.min(2.0, rate));

      this.state.currentSpeechRate = rate;
      console.log('设置语速:', rate);

      // 更新UI
      if (this.elements.speechRateSlider) {
        this.elements.speechRateSlider.value = rate;
      }

      // 触发事件
      this.dispatchEvent('speechRateChanged', {
        rate: rate,
      });
    } catch (error) {
      console.error('设置语速失败:', error);
    }
  }

  // 创建语音控制面板
  createVoiceControlPanel() {
    // 创建控制面板容器
    const controlPanel = document.createElement('div');
    controlPanel.className = 'nextchat-voice-control-panel';
    controlPanel.style.display = 'none';

    // 创建标题
    const title = document.createElement('div');
    title.className = 'nextchat-voice-control-title';
    title.textContent = '语音设置';
    controlPanel.appendChild(title);

    // 创建语音选择
    const voiceSelectContainer = document.createElement('div');
    voiceSelectContainer.className = 'nextchat-voice-select-container';

    const voiceSelectLabel = document.createElement('label');
    voiceSelectLabel.className = 'nextchat-voice-select-label';
    voiceSelectLabel.textContent = '选择语音:';
    voiceSelectLabel.setAttribute('for', 'nextchat-voice-select');
    voiceSelectContainer.appendChild(voiceSelectLabel);

    const voiceSelect = document.createElement('select');
    voiceSelect.id = 'nextchat-voice-select';
    voiceSelect.className = 'nextchat-voice-select';
    voiceSelect.setAttribute('aria-label', '选择语音');

    // 添加语音选项
    if (this.state.voices && this.state.voices.length > 0) {
      this.state.voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})`;

        // 设置当前选中的语音
        if (this.state.currentVoice && voice.voiceURI === this.state.currentVoice.voiceURI) {
          option.selected = true;
        }

        voiceSelect.appendChild(option);
      });
    }

    voiceSelectContainer.appendChild(voiceSelect);
    controlPanel.appendChild(voiceSelectContainer);
    this.elements.voiceSelect = voiceSelect;

    // 创建语速控制
    const speechRateContainer = document.createElement('div');
    speechRateContainer.className = 'nextchat-speech-rate-container';

    const speechRateLabel = document.createElement('label');
    speechRateLabel.className = 'nextchat-speech-rate-label';
    speechRateLabel.textContent = '语速:';
    speechRateLabel.setAttribute('for', 'nextchat-speech-rate');
    speechRateContainer.appendChild(speechRateLabel);

    const speechRateSlider = document.createElement('input');
    speechRateSlider.id = 'nextchat-speech-rate';
    speechRateSlider.type = 'range';
    speechRateSlider.className = 'nextchat-speech-rate-slider';
    speechRateSlider.min = '0.5';
    speechRateSlider.max = '2.0';
    speechRateSlider.step = '0.1';
    speechRateSlider.value = this.state.currentSpeechRate;
    speechRateSlider.setAttribute('aria-label', '语速控制');
    speechRateContainer.appendChild(speechRateSlider);

    const speechRateValue = document.createElement('span');
    speechRateValue.className = 'nextchat-speech-rate-value';
    speechRateValue.textContent = this.state.currentSpeechRate.toFixed(1);
    speechRateContainer.appendChild(speechRateValue);

    controlPanel.appendChild(speechRateContainer);
    this.elements.speechRateSlider = speechRateSlider;

    // 创建自动朗读开关
    const autoSpeakContainer = document.createElement('div');
    autoSpeakContainer.className = 'nextchat-auto-speak-container';

    const autoSpeakToggle = document.createElement('input');
    autoSpeakToggle.id = 'nextchat-auto-speak';
    autoSpeakToggle.type = 'checkbox';
    autoSpeakToggle.className = 'nextchat-auto-speak-toggle';
    autoSpeakToggle.checked = this.state.autoSpeakEnabled;
    autoSpeakToggle.setAttribute('aria-label', '自动朗读开关');
    autoSpeakContainer.appendChild(autoSpeakToggle);

    const autoSpeakLabel = document.createElement('label');
    autoSpeakLabel.className = 'nextchat-auto-speak-label';
    autoSpeakLabel.textContent = '自动朗读AI回复';
    autoSpeakLabel.setAttribute('for', 'nextchat-auto-speak');
    autoSpeakContainer.appendChild(autoSpeakLabel);

    controlPanel.appendChild(autoSpeakContainer);
    this.elements.autoSpeakToggle = autoSpeakToggle;

    // 创建操作按钮
    const actions = document.createElement('div');
    actions.className = 'nextchat-voice-control-actions';

    // 创建朗读按钮
    const speakButton = document.createElement('button');
    speakButton.className = 'nextchat-button nextchat-speak-button';
    speakButton.setAttribute('role', 'button');
    speakButton.setAttribute('aria-label', '朗读最后一条AI回复');
    speakButton.setAttribute('title', '朗读');
    speakButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9V15H7L12 20V4L7 9H3Z" fill="currentColor"/>
        <path d="M16.5 12C16.5 10.23 15.5 8.71 14 7.97V16C15.5 15.29 16.5 13.76 16.5 12Z" fill="currentColor"/>
        <path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.84 14 18.7V20.77C18.19 19.86 21 16.28 21 12C21 7.72 18.19 4.14 14 3.23Z" fill="currentColor"/>
      </svg>
    `;
    actions.appendChild(speakButton);
    this.elements.speakButton = speakButton;

    // 创建停止按钮
    const stopButton = document.createElement('button');
    stopButton.className = 'nextchat-button nextchat-stop-button';
    stopButton.setAttribute('role', 'button');
    stopButton.setAttribute('aria-label', '停止朗读');
    stopButton.setAttribute('title', '停止');
    stopButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6H18V18H6V6Z" fill="currentColor"/>
      </svg>
    `;
    actions.appendChild(stopButton);
    this.elements.stopButton = stopButton;

    controlPanel.appendChild(actions);

    // 添加事件监听器
    voiceSelect.addEventListener('change', () => {
      this.setVoice(voiceSelect.value);
    });

    speechRateSlider.addEventListener('input', () => {
      const rate = parseFloat(speechRateSlider.value);
      this.setSpeechRate(rate);
      speechRateValue.textContent = rate.toFixed(1);
    });

    autoSpeakToggle.addEventListener('change', () => {
      this.toggleAutoSpeak();
    });

    speakButton.addEventListener('click', () => {
      this.speakLastAIMessage();
    });

    stopButton.addEventListener('click', () => {
      this.stopSpeaking();
    });

    // 添加到容器
    this.config.container.appendChild(controlPanel);
    this.elements.voiceControlContainer = controlPanel;

    return controlPanel;
  }

  // 切换语音控制面板
  toggleVoiceControlPanel() {
    if (!this.state.isInitialized) {
      console.warn('NextChatAdvanced未初始化');
      return;
    }

    // 如果控制面板不存在，创建它
    if (!this.elements.voiceControlContainer) {
      this.createVoiceControlPanel();
    }

    this.state.voiceControlVisible = !this.state.voiceControlVisible;

    if (this.state.voiceControlVisible) {
      // 显示控制面板
      this.elements.voiceControlContainer.style.display = 'block';

      // 添加动画类
      setTimeout(() => {
        this.elements.voiceControlContainer.classList.add('nextchat-visible');
      }, 10);
    } else {
      // 隐藏控制面板
      this.elements.voiceControlContainer.classList.remove('nextchat-visible');

      setTimeout(() => {
        this.elements.voiceControlContainer.style.display = 'none';
      }, 300);
    }
  }

  // 清理资源
  destroy() {
    console.log('清理NextChatAdvanced资源...');

    // 停止录音
    if (this.state.isRecording) {
      this.stopVoiceRecording();
    }

    // 停止朗读
    if (this.state.isSpeaking) {
      this.stopSpeaking();
    }

    // 清理DOM元素
    if (this.elements.launcher) {
      this.elements.launcher.remove();
    }

    if (this.elements.chatWindow) {
      this.elements.chatWindow.remove();
    }

    if (this.elements.voiceControlContainer) {
      this.elements.voiceControlContainer.remove();
    }

    if (this.elements.fileInput) {
      this.elements.fileInput.remove();
    }

    // 清理状态
    this.state.isInitialized = false;
    this.state.chatWindowVisible = false;
    this.state.voiceControlVisible = false;
    this.state.imageUploadVisible = false;

    // 触发销毁事件
    this.dispatchEvent('destroyed', { instance: this });

    console.log('NextChatAdvanced资源清理完成');
  }
}

// 导出NextChatAdvanced类
window.NextChatAdvanced = NextChatAdvanced;