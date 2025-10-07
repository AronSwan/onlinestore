/**
 * NextChat Advanced AI Assistant - Improved Version
 * Enhanced with better architecture, performance, and security
 * Features: Text, Image, Voice interaction with Vector Database integration
 * Version: 3.0.0
 * Date: 2025-09-18
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
}

/**
 * 主要的NextChat Advanced类
 */
class NextChatAdvanced {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || '',
      model: config.model || 'gpt-4-vision-preview',
      voiceEnabled: config.voiceEnabled !== false,
      autoSpeakEnabled: config.autoSpeakEnabled !== false,
      imageEnabled: config.imageEnabled !== false,
      vectorDBEnabled: config.vectorDBEnabled !== false,
      cdnBase: this.validateCdnBase(config.cdnBase),
      ...config,
    };

    // 状态管理
    this.state = {
      isInitialized: false,
      isRecording: false,
      currentMode: 'text', // text, voice, image
      messageCount: 0,
    };

    // 组件引用
    this.elements = {};
    this.resourceLoader = new ResourceLoader();
    this.voiceRecognizer = null;
    this.vectorDB = null;
    this.messageHistory = [];

    // 绑定方法上下文
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleGlobalKeydown = this.handleGlobalKeydown.bind(this);

    // Auto-init unless disabled by config
    // Inserted by AI assistant; Timestamp: 2025-09-19 22:22:43 Asia/Shanghai; Source: Trae AI Pair Programming
    if (!this.config || this.config.disableAutoInit !== true) {
      this.init();
    } else {
      console.log('NextChat Advanced: Auto-init disabled by config');
    }
  }

  validateCdnBase(cdnBase) {
    if (typeof cdnBase === 'string' && /^https?:\/\//.test(cdnBase)) {
      return cdnBase;
    }
    return 'https://cdnjs.cloudflare.com/ajax/libs';
  }

  async init() {
    try {
      await this.loadExternalResources();
      await this.initializeComponents();
      this.setupEventListeners();
      this.state.isInitialized = true;

      console.log('NextChat Advanced AI Assistant initialized successfully');
      this.notifyReady();
    } catch (error) {
      console.error('Failed to initialize NextChat Advanced:', error);
      this.createFallbackInterface();
    }
  }

  async loadExternalResources() {
    const cdnBase = this.config.cdnBase;

    // 并行加载CSS
    const cssPromises = [
      this.resourceLoader.loadResourceWithFallback('link', {
        href: `${cdnBase}/nextchat/1.0.0/nextchat.min.css`,
        rel: 'stylesheet',
      }, {
        href: 'css/nextchat-advanced.css',
        rel: 'stylesheet',
      }, 'NextChat CSS'),
    ];

    // 根据配置加载功能模块
    const jsPromises = [];

    if (this.config.voiceEnabled) {
      console.log('Voice recognition is enabled, loading Recorder.js...');
      jsPromises.push(
        this.resourceLoader.loadResourceWithMultipleFallbacks('script', {
          src: NEXTCHAT_CONFIG.CDN_RESOURCES.recorder,
        }, NEXTCHAT_CONFIG.FALLBACK_CDN_RESOURCES.recorder, 'Recorder.js'),
      );
    }

    if (this.config.imageEnabled) {
      console.log('Image recognition is enabled, loading Heic2Any...');
      jsPromises.push(
        this.resourceLoader.loadResourceWithMultipleFallbacks('script', {
          src: NEXTCHAT_CONFIG.CDN_RESOURCES.heic2any,
        }, NEXTCHAT_CONFIG.FALLBACK_CDN_RESOURCES.heic2any, 'Heic2Any'),
      );
    }

    if (this.config.vectorDBEnabled) {
      console.log('Vector database is enabled, loading ChromaDB...');
      jsPromises.push(
        this.resourceLoader.loadResourceWithMultipleFallbacks('script', {
          src: NEXTCHAT_CONFIG.CDN_RESOURCES.chromadb,
        }, NEXTCHAT_CONFIG.FALLBACK_CDN_RESOURCES.chromadb, 'ChromaDB'),
      );
    }

    // 等待所有资源加载完成
    const allPromises = [...cssPromises, ...jsPromises];
    console.log(`Waiting for ${allPromises.length} resources to load...`);
    
    const results = await Promise.allSettled(allPromises);
    
    // 检查每个资源的加载状态
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Resource ${index} failed to load:`, result.reason);
      } else {
        console.log(`Resource ${index} loaded successfully`);
      }
    });
    
    // 检查是否有资源加载失败
    const failedResources = results.filter(result => result.status === 'rejected');
    if (failedResources.length > 0) {
      console.warn('Some resources failed to load:', failedResources.map(f => f.reason));
      // 不抛出错误，允许系统继续运行，只是部分功能可能不可用
    } else {
      console.log('All resources loaded successfully');
    }
  }

  async initializeComponents() {
    console.log('Initializing NextChat components...');
    try {
      this.createChatInterface();
      console.log('Chat interface created');

      if (this.config.voiceEnabled) {
        console.log('Voice recognition is enabled, setting up...');
        await this.setupVoiceRecognition();
        console.log('Voice recognition setup completed');
        
        // 初始化语音合成功能
        console.log('Text-to-speech is enabled, setting up...');
        this.setupTextToSpeech();
        console.log('Text-to-speech setup completed');
      } else {
        console.log('Voice recognition is disabled');
      }

      if (this.config.imageEnabled) {
        console.log('Image upload is enabled, initializing...');
        this.initializeImageUpload();
        console.log('Image upload initialized');
      } else {
        console.log('Image upload is disabled');
      }

      if (this.config.vectorDBEnabled) {
        console.log('Vector database is enabled, initializing...');
        await this.initializeVectorDatabase();
        console.log('Vector database initialized');
      } else {
        console.log('Vector database is disabled');
      }
      
      console.log('All components initialized successfully');
    } catch (error) {
      console.error('Failed to initialize components:', error);
    }
  }

  createChatInterface() {
    // 创建主容器 - 非内嵌式悬浮设计
    const container = this.createElement('div', {
      id: 'nextchat-advanced-container',
      className: 'nextchat-advanced-container',
    });

    // 创建启动器
    const launcher = this.createLauncher();
    container.appendChild(launcher);

    // 创建聊天窗口
    const chatWindow = this.createChatWindow();
    container.appendChild(chatWindow);

    // 附加到body，并确保z-index正确
    document.body.appendChild(container);

    // 保存元素引用
    this.elements.container = container;
    this.elements.launcher = launcher;
    this.elements.chatWindow = chatWindow;
  }

  createLauncher() {
    const launcher = this.createElement('div', {
      className: 'nextchat-launcher',
      id: 'nextchat-launcher',
    });

    const button = this.createElement('button', {
      className: 'launcher-button',
      'aria-label': '打开AI助手',
      innerHTML: this.getSVGIcon('chat'),
    });

    launcher.appendChild(button);
    return launcher;
  }

  createChatWindow() {
    const window = this.createElement('div', {
      className: 'nextchat-window',
      id: 'nextchat-window',
    });

    // 创建头部
    const header = this.createChatHeader();
    window.appendChild(header);

    // 创建消息区域
    const messages = this.createElement('div', {
      className: 'chat-messages',
      id: 'chat-messages',
    });

    // 添加欢迎消息
    messages.appendChild(this.createWelcomeMessage());
    window.appendChild(messages);

    // 创建输入区域
    const inputContainer = this.createInputContainer();
    window.appendChild(inputContainer);

    // 创建语音录制区域
    if (this.config.voiceEnabled) {
      const voiceRecorder = this.createVoiceRecorder();
      window.appendChild(voiceRecorder);
    }

    // 创建图片上传区域
    if (this.config.imageEnabled) {
      const imageUpload = this.createImageUploadArea();
      window.appendChild(imageUpload);
    }

    return window;
  }

  createChatHeader() {
    const header = this.createElement('div', {
      className: 'chat-header',
    });

    const content = this.createElement('div', {
      className: 'header-content',
    });

    const avatar = this.createElement('div', {
      className: 'avatar',
      innerHTML: '<img src="https://via.placeholder.com/40x40/8c1c13/ffffff?text=R" alt="Reich AI">',
    });

    const info = this.createElement('div', {
      className: 'header-info',
      innerHTML: '<div class="assistant-name">Reich AI 助手</div><span class="status online">在线</span>',
    });

    content.appendChild(avatar);
    content.appendChild(info);

    const actions = this.createHeaderActions();

    header.appendChild(content);
    header.appendChild(actions);

    return header;
  }

  createHeaderActions() {
    const actions = this.createElement('div', {
      className: 'header-actions',
    });

    const buttons = [
      { id: 'voice-toggle', title: '语音输入', icon: 'microphone', condition: this.config.voiceEnabled },
      { id: 'image-upload', title: '图片识别', icon: 'image', condition: this.config.imageEnabled },
      { id: 'close-chat', title: '关闭', icon: 'close', condition: true },
    ];

    buttons.forEach(({ id, title, icon, condition }) => {
      if (condition) {
        const button = this.createElement('button', {
          className: 'action-btn',
          id: id,
          title: title,
          innerHTML: this.getSVGIcon(icon),
        });
        actions.appendChild(button);
      }
    });

    return actions;
  }

  createInputContainer() {
    const container = this.createElement('div', {
      className: 'chat-input-container',
    });

    const wrapper = this.createElement('div', {
      className: 'input-wrapper',
    });

    const input = this.createElement('input', {
      type: 'text',
      id: 'chat-input',
      className: 'chat-input',
      placeholder: '输入消息，或点击语音/图片按钮...',
      autocomplete: 'off',
      maxLength: NEXTCHAT_CONFIG.MAX_MESSAGE_LENGTH,
    });

    const sendBtn = this.createElement('button', {
      className: 'send-btn',
      id: 'send-btn',
      title: '发送消息',
      innerHTML: this.getSVGIcon('send'),
    });

    wrapper.appendChild(input);
    wrapper.appendChild(sendBtn);
    container.appendChild(wrapper);

    return container;
  }

  createVoiceRecorder() {
    const recorder = this.createElement('div', {
      className: 'voice-recorder',
      id: 'voice-recorder',
      style: 'display: none;',
    });

    const controls = this.createElement('div', {
      className: 'recorder-controls',
    });

    const recordBtn = this.createElement('button', {
      className: 'record-btn',
      id: 'record-btn',
      innerHTML: this.getSVGIcon('record'),
    });

    const status = this.createElement('span', {
      className: 'recording-status',
      textContent: '点击开始录音',
    });

    controls.appendChild(recordBtn);
    controls.appendChild(status);
    recorder.appendChild(controls);

    return recorder;
  }

  createImageUploadArea() {
    const area = this.createElement('div', {
      className: 'image-upload-area',
      id: 'image-upload-area',
      style: 'display: none;',
    });

    const zone = this.createElement('div', {
      className: 'upload-zone',
      id: 'upload-zone',
    });

    const placeholder = this.createElement('div', {
      className: 'upload-placeholder',
      innerHTML: `
        ${this.getSVGIcon('upload')}
        <p>拖拽图片到此处或点击选择</p>
        <p class="upload-hint">支持 JPG、PNG、GIF、WebP 格式，最大 ${Math.round(NEXTCHAT_CONFIG.MAX_IMAGE_SIZE / 1024)}KB</p>
      `,
    });

    const input = this.createElement('input', {
      type: 'file',
      id: 'image-input',
      accept: NEXTCHAT_CONFIG.SUPPORTED_IMAGE_FORMATS.join(','),
      multiple: true,
      style: 'display: none;',
    });

    const preview = this.createElement('div', {
      className: 'image-preview',
      id: 'image-preview',
    });

    zone.appendChild(placeholder);
    zone.appendChild(input);
    area.appendChild(zone);
    area.appendChild(preview);

    return area;
  }

  createWelcomeMessage() {
    return this.createMessageElement(
      '您好！我是Reich AI助手，支持文字、图片和语音交互。有什么可以帮助您的吗？',
      'ai',
    );
  }

  setupEventListeners() {
    console.log('Setting up event listeners...');
    try {
      // 使用事件委托优化性能
      if (this.elements.container) {
        this.elements.container.addEventListener('click', this.handleContainerClick.bind(this));
        console.log('Container click event listener added');
      } else {
        console.error('Container element not found');
      }

      // 输入框事件
      const chatInput = document.getElementById('chat-input');
      if (chatInput) {
        chatInput.addEventListener('keypress', this.handleKeyPress);
        chatInput.addEventListener('input', this.handleInputChange.bind(this));
        console.log('Chat input event listeners added');
      } else {
        console.error('Chat input element not found');
      }

      // 全局键盘事件
      document.addEventListener('keydown', this.handleGlobalKeydown);
      console.log('Global keydown event listener added');

      // 图片拖拽事件
      if (this.config.imageEnabled) {
        console.log('Setting up image drag events...');
        this.setupImageDragEvents();
        console.log('Image drag events set up');
      } else {
        console.log('Image upload is disabled, skipping drag events');
      }
      
      console.log('All event listeners set up successfully');
    } catch (error) {
      console.error('Failed to set up event listeners:', error);
    }
  }

  handleContainerClick(event) {
    console.log('Container click event triggered:', event.target);
    try {
      const { target } = event;
      const { id, className } = target;

      // 启动器点击
      if (target.closest('.launcher-button')) {
        console.log('Launcher button clicked');
        this.toggleChatWindow();
        return;
      }

      // 头部按钮点击
      switch (id) {
        case 'close-chat':
          console.log('Close chat button clicked');
          this.closeChatWindow();
          break;
        case 'send-btn':
          console.log('Send button clicked');
          this.handleSendMessage();
          break;
        case 'voice-toggle':
          console.log('Voice toggle button clicked');
          this.toggleVoiceRecorder();
          break;
        case 'image-upload':
          console.log('Image upload button clicked');
          this.toggleImageUpload();
          break;
        case 'record-btn':
          console.log('Record button clicked');
          this.toggleRecording();
          break;
        default:
          console.log('Unknown button clicked:', id);
      }

      // 上传区域点击
      if (target.closest('.upload-zone')) {
        console.log('Upload zone clicked');
        const imageInput = document.getElementById('image-input');
        if (imageInput) {
          imageInput.click();
        } else {
          console.error('Image input element not found');
        }
      }
    } catch (error) {
      console.error('Error handling container click:', error);
    }
  }

  handleKeyPress(event) {
    console.log('Key press event triggered:', event.key);
    try {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        console.log('Enter key pressed, sending message');
        this.handleSendMessage();
      }
    } catch (error) {
      console.error('Error handling key press:', error);
    }
  }

  handleGlobalKeydown(event) {
    console.log('Global keydown event triggered:', event.key);
    try {
      const launcher = this.elements.launcher;

      if (launcher?.classList.contains('keyboard-active') && event.key === 'Enter') {
        console.log('Enter key pressed on keyboard-active launcher');
        event.preventDefault();
        this.toggleChatWindow();
      }

      // ESC键关闭聊天窗口
      if (event.key === 'Escape') {
        console.log('Escape key pressed, closing chat window');
        this.closeChatWindow();
      }
    } catch (error) {
      console.error('Error handling global keydown:', error);
    }
  }

  handleInputChange(event) {
    console.log('Input change event triggered');
    try {
      const input = event.target;
      const remaining = NEXTCHAT_CONFIG.MAX_MESSAGE_LENGTH - input.value.length;
      console.log('Remaining characters:', remaining);

      // 可以添加字符计数显示
      if (remaining < 50) {
        input.style.borderColor = remaining < 10 ? '#dc3545' : '#ffc107';
        console.log('Input border color changed due to low remaining characters');
      } else {
        input.style.borderColor = '';
      }
    } catch (error) {
      console.error('Error handling input change:', error);
    }
  }

  async handleSendMessage() {
    // 使用更明显的方式输出调试信息
    const debugMessage = '=== handleSendMessage方法被调用 ===';
    console.log(debugMessage);
    // 强制输出到原始控制台
    window.originalConsoleLog && window.originalConsoleLog(debugMessage);
    
    const input = document.getElementById('chat-input');
    if (!input) {
      console.error('未找到聊天输入框');
      return;
    }

    try {
      const message = NextChatUtils.validateMessage(input.value);
      console.log('用户消息:', message);
      window.originalConsoleLog && window.originalConsoleLog('用户消息:', message);

      this.addMessageToUI(message, 'user');
      input.value = '';
      console.log('Message added to UI and input cleared');

      // 存储到向量数据库
      if (this.config.vectorDBEnabled && this.vectorDB) {
        console.log('Storing message in vector database...');
        await this.storeMessageInVectorDB(message, 'user');
        console.log('Message stored in vector database');
      }

      // 获取AI回复
      console.log('Getting AI response...');
      const response = await this.getAIResponse(message);
      console.log('AI回复:', response);
      window.originalConsoleLog && window.originalConsoleLog('AI回复:', response);
      this.addMessageToUI(response, 'ai');
      console.log('AI response added to UI');

      // 存储AI回复
      if (this.config.vectorDBEnabled && this.vectorDB) {
        console.log('Storing AI response in vector database...');
        await this.storeMessageInVectorDB(response, 'ai');
        console.log('AI response stored in vector database');
      }

    } catch (error) {
      console.error('发送消息失败:', error);
      window.originalConsoleError && window.originalConsoleError('发送消息失败:', error);
      this.addMessageToUI('抱歉，我遇到了一些问题。请稍后重试。', 'ai');
    }
  }

  toggleChatWindow() {
    console.log('Toggling chat window');
    try {
      const chatWindow = this.elements.chatWindow;
      if (chatWindow) {
        chatWindow.classList.toggle('active');
        console.log('Chat window toggled, active state:', chatWindow.classList.contains('active'));

        if (chatWindow.classList.contains('active')) {
          // 聚焦到输入框
          console.log('Focusing on chat input');
          setTimeout(() => {
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
              chatInput.focus();
              console.log('Chat input focused');
            } else {
              console.error('Chat input element not found');
            }
          }, NEXTCHAT_CONFIG.ANIMATION_DURATION);
        }
      } else {
        console.error('Chat window element not found');
      }
    } catch (error) {
      console.error('Error toggling chat window:', error);
    }
  }

  closeChatWindow() {
    console.log('Closing chat window');
    try {
      const chatWindow = this.elements.chatWindow;
      if (chatWindow) {
        chatWindow.classList.remove('active');
        console.log('Chat window closed');
      } else {
        console.error('Chat window element not found');
      }
    } catch (error) {
      console.error('Error closing chat window:', error);
    }
  }

  addMessageToUI(message, sender) {
    console.log(`Adding ${sender} message to UI:`, message);
    try {
      const messagesContainer = document.getElementById('chat-messages');
      if (!messagesContainer) {
        console.error('Messages container not found');
        return;
      }

      const messageElement = this.createMessageElement(message, sender);
      if (!messageElement) {
        console.error('Failed to create message element');
        return;
      }

      messagesContainer.appendChild(messageElement);
      console.log('Message element added to container');

      // 滚动到底部
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      console.log('Scrolled to bottom');

      // 添加到历史记录
      const messageId = NextChatUtils.generateId();
      this.messageHistory.push({
        id: messageId,
        sender,
        message,
        timestamp: new Date(),
      });
      console.log(`Message added to history with ID: ${messageId}`);

      this.state.messageCount++;
      console.log(`Message count increased to: ${this.state.messageCount}`);
      
      // 如果是AI消息且启用了自动朗读，则自动朗读
      if (sender === 'ai' && this.autoSpeakEnabled) {
        console.log('Auto-speaking AI message...');
        this.autoSpeakAIMessage(message);
      }
    } catch (error) {
      console.error('Error adding message to UI:', error);
    }
  }

  createMessageElement(message, sender) {
    console.log(`Creating message element for ${sender}:`, message);
    try {
      const messageDiv = this.createElement('div', {
        className: `message ${sender}-message`,
      });
      console.log('Message div created');

      const avatar = this.createElement('div', {
        className: 'message-avatar',
        innerHTML: `<img src="https://via.placeholder.com/32x32/${sender === 'user' ? '007bff' : '8c1c13'}/ffffff?text=${sender === 'user' ? 'U' : 'G'}" alt="${sender}">`,
      });
      console.log('Avatar created');

      const content = this.createElement('div', {
        className: 'message-content',
      });
      console.log('Content div created');

      const bubble = this.createElement('div', {
        className: 'message-bubble',
        innerHTML: `<p>${NextChatUtils.escapeHtml(message)}</p>`,
      });
      console.log('Message bubble created');

      const time = this.createElement('div', {
        className: 'message-time',
        textContent: NextChatUtils.formatTime(),
      });
      console.log('Time element created');

      content.appendChild(bubble);
      content.appendChild(time);
      messageDiv.appendChild(avatar);
      messageDiv.appendChild(content);
      console.log('Message element assembled');

      return messageDiv;
    } catch (error) {
      console.error('Error creating message element:', error);
      return null;
    }
  }

  async getAIResponse(message) {
    try {
      // 添加明显的调试信息
      const debugMessage = '=== getAIResponse方法被调用 ===';
      console.log(debugMessage);
      window.originalConsoleLog && window.originalConsoleLog(debugMessage);
      
      // 检查消息是否有效
      if (!message || typeof message !== 'string' || message.trim() === '') {
        console.error('Invalid message provided to getAIResponse:', message);
        window.originalConsoleError && window.originalConsoleError('Invalid message provided to getAIResponse:', message);
        return '抱歉，我无法处理空消息。请提供有效的问题。';
      }
      
      // 搜索预设回复（不区分大小写）
      const lowerMessage = message.toLowerCase();
      console.log('原始消息:', message);
      console.log('小写消息:', lowerMessage);
      window.originalConsoleLog && window.originalConsoleLog('原始消息:', message);
      window.originalConsoleLog && window.originalConsoleLog('小写消息:', lowerMessage);
      
      // 添加一个明显的分隔线
      const separatorMessage = '--- 开始检查关键字 ---';
      console.log(separatorMessage);
      window.originalConsoleLog && window.originalConsoleLog(separatorMessage);
      
      // 检查AI_RESPONSES配置是否存在
      if (!NEXTCHAT_CONFIG.AI_RESPONSES || typeof NEXTCHAT_CONFIG.AI_RESPONSES !== 'object') {
        console.error('AI_RESPONSES configuration is missing or invalid:', NEXTCHAT_CONFIG.AI_RESPONSES);
        window.originalConsoleError && window.originalConsoleError('AI_RESPONSES configuration is missing or invalid:', NEXTCHAT_CONFIG.AI_RESPONSES);
        return '抱歉，AI回复配置出现问题，请稍后再试。';
      }
      
      const responseCount = Object.keys(NEXTCHAT_CONFIG.AI_RESPONSES).length;
      console.log('AI_RESPONSES配置中的回复数量:', responseCount);
      window.originalConsoleLog && window.originalConsoleLog('AI_RESPONSES配置中的回复数量:', responseCount);
      
      for (const [key, response] of Object.entries(NEXTCHAT_CONFIG.AI_RESPONSES)) {
        const lowerKey = key.toLowerCase();
        const isMatch = lowerMessage.includes(lowerKey);
        console.log('检查关键字:', key, '小写:', lowerKey, '是否包含:', isMatch);
        window.originalConsoleLog && window.originalConsoleLog('检查关键字:', key, '小写:', lowerKey, '是否包含:', isMatch);
        if (isMatch) {
          console.log('找到匹配的关键字:', key, '回复:', response);
          window.originalConsoleLog && window.originalConsoleLog('找到匹配的关键字:', key, '回复:', response);
          const endMessage = '--- 关键字匹配结束 ---';
          console.log(endMessage);
          window.originalConsoleLog && window.originalConsoleLog(endMessage);
          return response;
        }
      }

      // 添加一个明显的分隔线
      const noMatchMessage = '--- 没有找到匹配的关键字 ---';
      console.log(noMatchMessage);
      window.originalConsoleLog && window.originalConsoleLog(noMatchMessage);

      // 向量数据库查询
      if (this.config.vectorDBEnabled && this.vectorDB) {
        console.log('开始向量数据库查询...');
        window.originalConsoleLog && window.originalConsoleLog('开始向量数据库查询...');
        try {
          const similarMessages = await this.searchVectorDB(message);
          console.log('向量数据库查询结果:', similarMessages);
          window.originalConsoleLog && window.originalConsoleLog('向量数据库查询结果:', similarMessages);
          if (similarMessages && similarMessages.length > 0) {
            return `根据您的问题，我为您找到了相关信息：${similarMessages[0].message}`;
          } else {
            console.log('向量数据库中没有找到相似消息');
            window.originalConsoleLog && window.originalConsoleLog('向量数据库中没有找到相似消息');
          }
        } catch (error) {
          console.warn('向量数据库查询失败:', error);
          window.originalConsoleWarn && window.originalConsoleWarn('向量数据库查询失败:', error);
        }
      } else {
        console.log('向量数据库未启用或未初始化:', {
          vectorDBEnabled: this.config.vectorDBEnabled,
          vectorDB: !!this.vectorDB,
        });
        window.originalConsoleLog && window.originalConsoleLog('向量数据库未启用或未初始化:', {
          vectorDBEnabled: this.config.vectorDBEnabled,
          vectorDB: !!this.vectorDB,
        });
      }

      const defaultMessage = '没有找到匹配的关键字，使用默认回复';
      console.log(defaultMessage);
      window.originalConsoleLog && window.originalConsoleLog(defaultMessage);
      return '感谢您的咨询！我是Reich AI助手，很高兴为您服务。如需更详细的信息，建议您联系我们的客服团队或访问官方网站。';
    } catch (error) {
      console.error('getAIResponse方法发生错误:', error);
      window.originalConsoleError && window.originalConsoleError('getAIResponse方法发生错误:', error);
      return '抱歉，处理您的请求时出现了错误，请稍后再试。';
    }
  }

  // 语音识别相关方法
  async setupVoiceRecognition() {
    console.log('Setting up voice recognition...');
    window.originalConsoleLog && window.originalConsoleLog('Setting up voice recognition...');
    
    try {
      // 检查浏览器API支持
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      console.log('SpeechRecognition API check:', {
        SpeechRecognition: !!SpeechRecognition,
        webkitSpeechRecognition: !!window.webkitSpeechRecognition,
      });
      window.originalConsoleLog && window.originalConsoleLog('SpeechRecognition API check:', {
        SpeechRecognition: !!SpeechRecognition,
        webkitSpeechRecognition: !!window.webkitSpeechRecognition,
      });

      if (!SpeechRecognition) {
        console.error('SpeechRecognition API not available');
        window.originalConsoleError && window.originalConsoleError('SpeechRecognition API not available');
        throw new VoiceRecognitionError('当前浏览器不支持语音识别功能');
      }

      console.log('SpeechRecognition API available, creating recognizer');
      window.originalConsoleLog && window.originalConsoleLog('SpeechRecognition API available, creating recognizer');
      
      // 创建语音识别器实例
      this.voiceRecognizer = new SpeechRecognition();
      console.log('Voice recognizer created:', !!this.voiceRecognizer);
      window.originalConsoleLog && window.originalConsoleLog('Voice recognizer created:', !!this.voiceRecognizer);
      
      // 配置语音识别器
      this.voiceRecognizer.continuous = false;
      this.voiceRecognizer.interimResults = true; // 启用中间结果
      this.voiceRecognizer.lang = 'zh-CN';
      
      console.log('Voice recognizer configured:', {
        continuous: this.voiceRecognizer.continuous,
        interimResults: this.voiceRecognizer.interimResults,
        lang: this.voiceRecognizer.lang,
      });
      window.originalConsoleLog && window.originalConsoleLog('Voice recognizer configured:', {
        continuous: this.voiceRecognizer.continuous,
        interimResults: this.voiceRecognizer.interimResults,
        lang: this.voiceRecognizer.lang,
      });

      // 存储识别的中间结果
      let interimTranscript = '';

      // 设置结果处理回调
      this.voiceRecognizer.onresult = (event) => {
        console.log('Voice recognition result received:', event);
        window.originalConsoleLog && window.originalConsoleLog('Voice recognition result received:', event);
        
        let finalTranscript = '';

        // 处理所有结果
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;
          console.log(`Processing result ${i}: transcript="${transcript}", isFinal=${isFinal}`);
          window.originalConsoleLog && window.originalConsoleLog(`Processing result ${i}: transcript="${transcript}", isFinal=${isFinal}`);
          
          if (isFinal) {
            finalTranscript += transcript;
            // 清空中间结果
            interimTranscript = '';
          } else {
            interimTranscript = transcript;
          }
        }

        // 显示临时结果
        const interimResult = document.querySelector('.interim-result');
        console.log('Interim result element found:', !!interimResult);
        window.originalConsoleLog && window.originalConsoleLog('Interim result element found:', !!interimResult);
        
        if (interimResult) {
          interimResult.textContent = interimTranscript;
          console.log('Interim result updated:', interimTranscript);
          window.originalConsoleLog && window.originalConsoleLog('Interim result updated:', interimTranscript);
        } else {
          console.warn('Interim result element not found');
          window.originalConsoleWarn && window.originalConsoleWarn('Interim result element not found');
        }

        // 处理最终结果
        if (finalTranscript) {
          console.log('语音识别最终结果:', finalTranscript);
          window.originalConsoleLog && window.originalConsoleLog('语音识别最终结果:', finalTranscript);

          const input = document.getElementById('chat-input');
          console.log('Chat input element found:', !!input);
          window.originalConsoleLog && window.originalConsoleLog('Chat input element found:', !!input);
          
          if (input) {
            input.value = finalTranscript;
            input.focus();
            console.log('Input value set and focused');
            window.originalConsoleLog && window.originalConsoleLog('Input value set and focused');
          } else {
            console.error('Chat input element not found');
            window.originalConsoleError && window.originalConsoleError('Chat input element not found');
          }

          // 清空临时结果显示
          if (interimResult) {
            interimResult.textContent = '';
            console.log('Interim result cleared');
            window.originalConsoleLog && window.originalConsoleLog('Interim result cleared');
          }

          // 自动发送（可选功能）
          if (this.config.autoSendVoiceMessage) {
            console.log('Auto-send enabled, scheduling message send');
            window.originalConsoleLog && window.originalConsoleLog('Auto-send enabled, scheduling message send');
            setTimeout(() => this.handleSendMessage(), 1000);
          }
        }
      };

      // 设置错误处理回调
      this.voiceRecognizer.onerror = (error) => {
        console.error('语音识别错误:', error);
        window.originalConsoleError && window.originalConsoleError('语音识别错误:', error);
        this.stopVoiceRecording();

        let errorMessage = '语音识别遇到问题，请重试。';
        if (error.error === 'no-speech') {
          errorMessage = '未检测到语音，请靠近麦克风说话。';
        } else if (error.error === 'audio-capture') {
          errorMessage = '未找到麦克风设备，请检查您的设备设置。';
        } else if (error.error === 'not-allowed') {
          errorMessage = '麦克风访问被拒绝，请在浏览器设置中允许访问。';
        }
        
        console.log('Error message to display:', errorMessage);
        window.originalConsoleLog && window.originalConsoleLog('Error message to display:', errorMessage);
        this.addMessageToUI(errorMessage, 'ai');
      };

      // 设置结束处理回调
      this.voiceRecognizer.onend = () => {
        console.log('Voice recognition ended');
        window.originalConsoleLog && window.originalConsoleLog('Voice recognition ended');
        
        // 如果有中间结果但没有最终结果，使用中间结果
        if (interimTranscript && !this.state.isRecording) {
          console.log('Using interim transcript as final result:', interimTranscript);
          window.originalConsoleLog && window.originalConsoleLog('Using interim transcript as final result:', interimTranscript);
          
          const input = document.getElementById('chat-input');
          if (input) {
            input.value = interimTranscript;
            input.focus();
            console.log('Input set with interim transcript');
            window.originalConsoleLog && window.originalConsoleLog('Input set with interim transcript');
          }
        }
        this.stopVoiceRecording();
      };

      console.log('语音识别功能已设置完成');
      window.originalConsoleLog && window.originalConsoleLog('语音识别功能已设置完成');
    } catch (error) {
      console.error('设置语音识别功能失败:', error);
      window.originalConsoleError && window.originalConsoleError('设置语音识别功能失败:', error);
      this.addMessageToUI('抱歉，无法初始化语音识别功能。', 'ai');
    }
  }

  toggleVoiceRecorder() {
    try {
      console.log('toggleVoiceRecorder called');
      window.originalConsoleLog && window.originalConsoleLog('toggleVoiceRecorder called');
      
      const voiceRecorder = document.getElementById('voice-recorder');
      const chatInput = document.querySelector('.chat-input-container');
      
      console.log('Elements found:', {
        voiceRecorder: !!voiceRecorder,
        chatInput: !!chatInput,
      });
      window.originalConsoleLog && window.originalConsoleLog('Elements found:', {
        voiceRecorder: !!voiceRecorder,
        chatInput: !!chatInput,
      });

      if (!voiceRecorder || !chatInput) {
        console.error('Required elements not found:', { 
          voiceRecorder: !!voiceRecorder, 
          chatInput: !!chatInput, 
        });
        window.originalConsoleError && window.originalConsoleError('Required elements not found:', { 
          voiceRecorder: !!voiceRecorder, 
          chatInput: !!chatInput, 
        });
        return;
      }

      const isVisible = voiceRecorder.style.display !== 'none';
      console.log('Voice recorder visible:', isVisible);
      window.originalConsoleLog && window.originalConsoleLog('Voice recorder visible:', isVisible);

      if (isVisible) {
        console.log('Hiding voice recorder, showing chat input');
        window.originalConsoleLog && window.originalConsoleLog('Hiding voice recorder, showing chat input');
        
        voiceRecorder.style.display = 'none';
        chatInput.style.display = 'flex';
        this.stopVoiceRecording();
      } else {
        console.log('Showing voice recorder, hiding chat input');
        window.originalConsoleLog && window.originalConsoleLog('Showing voice recorder, hiding chat input');
        
        voiceRecorder.style.display = 'block';
        chatInput.style.display = 'none';

        // 检测麦克风权限
        console.log('Checking microphone API availability...');
        window.originalConsoleLog && window.originalConsoleLog('Checking microphone API availability...');
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          console.log('MediaDevices API available, checking microphone permissions');
          window.originalConsoleLog && window.originalConsoleLog('MediaDevices API available, checking microphone permissions');
          
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
              console.log('Microphone permission granted');
              window.originalConsoleLog && window.originalConsoleLog('Microphone permission granted');
              this.addMessageToUI('麦克风已授权，请点击录音按钮开始语音输入。', 'ai');
            })
            .catch((error) => {
              console.error('Microphone permission denied:', error);
              window.originalConsoleError && window.originalConsoleError('Microphone permission denied:', error);
              
              let errorMessage = '请在浏览器设置中允许麦克风访问权限以使用语音功能。';
              if (error.name === 'NotAllowedError') {
                errorMessage = '麦克风访问被拒绝，请在浏览器设置中允许访问。';
              } else if (error.name === 'NotFoundError') {
                errorMessage = '未找到麦克风设备，请检查您的设备设置。';
              } else if (error.name === 'NotReadableError') {
                errorMessage = '麦克风设备被其他应用占用，请关闭其他使用麦克风的应用。';
              }
              
              console.log('Error message to display:', errorMessage);
              window.originalConsoleLog && window.originalConsoleLog('Error message to display:', errorMessage);
              this.addMessageToUI(errorMessage, 'ai');
            });
        } else {
          console.error('MediaDevices API not available:', {
            mediaDevices: !!navigator.mediaDevices,
            getUserMedia: navigator.mediaDevices ? !!navigator.mediaDevices.getUserMedia : false,
          });
          window.originalConsoleError && window.originalConsoleError('MediaDevices API not available:', {
            mediaDevices: !!navigator.mediaDevices,
            getUserMedia: navigator.mediaDevices ? !!navigator.mediaDevices.getUserMedia : false,
          });
          this.addMessageToUI('您的浏览器不支持语音识别功能。', 'ai');
        }
      }
    } catch (error) {
      console.error('Error in toggleVoiceRecorder:', error);
      window.originalConsoleError && window.originalConsoleError('Error in toggleVoiceRecorder:', error);
      this.addMessageToUI('切换语音记录器时发生错误，请刷新页面重试。', 'ai');
    }
  }

  toggleRecording() {
    try {
      console.log('toggleRecording called');
      window.originalConsoleLog && window.originalConsoleLog('toggleRecording called');
      
      console.log('Current recording state:', this.state.isRecording);
      window.originalConsoleLog && window.originalConsoleLog('Current recording state:', this.state.isRecording);

      if (this.state.isRecording) {
        console.log('Stopping voice recording');
        window.originalConsoleLog && window.originalConsoleLog('Stopping voice recording');
        this.stopVoiceRecording();
      } else {
        console.log('Starting voice recording');
        window.originalConsoleLog && window.originalConsoleLog('Starting voice recording');
        this.startVoiceRecording();
      }
    } catch (error) {
      console.error('Error in toggleRecording:', error);
      window.originalConsoleError && window.originalConsoleError('Error in toggleRecording:', error);
      this.addMessageToUI('切换录音状态时发生错误，请刷新页面重试。', 'ai');
    }
  }

  startVoiceRecording() {
    try {
      console.log('startVoiceRecording called');
      window.originalConsoleLog && window.originalConsoleLog('startVoiceRecording called');
      
      console.log('Checking voice recognizer availability...');
      window.originalConsoleLog && window.originalConsoleLog('Checking voice recognizer availability...');
      
      if (!this.voiceRecognizer) {
        console.error('Voice recognizer not initialized');
        window.originalConsoleError && window.originalConsoleError('Voice recognizer not initialized');
        this.addMessageToUI('语音识别功能未初始化。', 'ai');
        return;
      }

      console.log('Setting recording state to true');
      window.originalConsoleLog && window.originalConsoleLog('Setting recording state to true');
      this.state.isRecording = true;

      console.log('Finding UI elements...');
      window.originalConsoleLog && window.originalConsoleLog('Finding UI elements...');
      
      const recordBtn = document.getElementById('record-btn');
      const status = document.querySelector('.recording-status');
      const waveform = document.querySelector('.audio-waveform');

      console.log('UI elements found:', {
        recordBtn: !!recordBtn,
        status: !!status,
        waveform: !!waveform,
      });
      window.originalConsoleLog && window.originalConsoleLog('UI elements found:', {
        recordBtn: !!recordBtn,
        status: !!status,
        waveform: !!waveform,
      });

      if (recordBtn) {
        console.log('Updating record button UI');
        window.originalConsoleLog && window.originalConsoleLog('Updating record button UI');
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = this.getSVGIcon('stop');
        recordBtn.setAttribute('aria-label', '停止录音');
      }

      if (status) {
        console.log('Updating status text');
        window.originalConsoleLog && window.originalConsoleLog('Updating status text');
        status.textContent = '正在录音...点击停止';
      }

      if (waveform) {
        console.log('Showing waveform and starting animation');
        window.originalConsoleLog && window.originalConsoleLog('Showing waveform and starting animation');
        waveform.style.display = 'flex';
        // 启动波形动画
        this.animateWaveform(waveform);
      }

      // 开始语音识别
      console.log('Starting voice recognition...');
      window.originalConsoleLog && window.originalConsoleLog('Starting voice recognition...');
      this.voiceRecognizer.start();
      console.log('Voice recognition started');
      window.originalConsoleLog && window.originalConsoleLog('Voice recognition started');

      // 设置超时
      console.log('Setting recording timeout:', NEXTCHAT_CONFIG.VOICE_RECOGNITION_TIMEOUT);
      window.originalConsoleLog && window.originalConsoleLog('Setting recording timeout:', NEXTCHAT_CONFIG.VOICE_RECOGNITION_TIMEOUT);
      
      this.recordingTimeout = setTimeout(() => {
        if (this.state.isRecording) {
          console.log('Recording timeout reached, stopping automatically');
          window.originalConsoleLog && window.originalConsoleLog('Recording timeout reached, stopping automatically');
          this.stopVoiceRecording();
          this.addMessageToUI('录音时间过长，已自动停止。', 'ai');
        }
      }, NEXTCHAT_CONFIG.VOICE_RECOGNITION_TIMEOUT);

      // 开始音频可视化（如果支持）
      console.log('Starting audio visualization...');
      window.originalConsoleLog && window.originalConsoleLog('Starting audio visualization...');
      this.startAudioVisualization();

    } catch (error) {
      console.error('Error starting voice recording:', error);
      window.originalConsoleError && window.originalConsoleError('Error starting voice recording:', error);
      this.state.isRecording = false;
      this.addMessageToUI('启动录音失败，请确保已授权麦克风访问权限。', 'ai');
    }
  }

  stopVoiceRecording() {
    try {
      console.log('stopVoiceRecording called');
      window.originalConsoleLog && window.originalConsoleLog('stopVoiceRecording called');
      
      console.log('Checking voice recognizer and recording state:', {
        voiceRecognizer: !!this.voiceRecognizer,
        isRecording: this.state.isRecording,
      });
      window.originalConsoleLog && window.originalConsoleLog('Checking voice recognizer and recording state:', {
        voiceRecognizer: !!this.voiceRecognizer,
        isRecording: this.state.isRecording,
      });

      if (this.voiceRecognizer && this.state.isRecording) {
        console.log('Stopping voice recording...');
        window.originalConsoleLog && window.originalConsoleLog('Stopping voice recording...');
        
        this.state.isRecording = false;

        // 清除超时
        console.log('Clearing recording timeout...');
        window.originalConsoleLog && window.originalConsoleLog('Clearing recording timeout...');
        
        if (this.recordingTimeout) {
          clearTimeout(this.recordingTimeout);
          this.recordingTimeout = null;
          console.log('Recording timeout cleared');
          window.originalConsoleLog && window.originalConsoleLog('Recording timeout cleared');
        }

        console.log('Finding UI elements...');
        window.originalConsoleLog && window.originalConsoleLog('Finding UI elements...');
        
        const recordBtn = document.getElementById('record-btn');
        const status = document.querySelector('.recording-status');
        const waveform = document.querySelector('.audio-waveform');
        const interimResult = document.querySelector('.interim-result');

        console.log('UI elements found:', {
          recordBtn: !!recordBtn,
          status: !!status,
          waveform: !!waveform,
          interimResult: !!interimResult,
        });
        window.originalConsoleLog && window.originalConsoleLog('UI elements found:', {
          recordBtn: !!recordBtn,
          status: !!status,
          waveform: !!waveform,
          interimResult: !!interimResult,
        });

        if (recordBtn) {
          console.log('Updating record button UI');
          window.originalConsoleLog && window.originalConsoleLog('Updating record button UI');
          recordBtn.classList.remove('recording');
          recordBtn.innerHTML = this.getSVGIcon('record');
          recordBtn.setAttribute('aria-label', '开始录音');
        }

        if (status) {
          console.log('Updating status text');
          window.originalConsoleLog && window.originalConsoleLog('Updating status text');
          status.textContent = '点击开始录音';
        }

        if (waveform) {
          console.log('Hiding waveform and stopping animation');
          window.originalConsoleLog && window.originalConsoleLog('Hiding waveform and stopping animation');
          waveform.style.display = 'none';
          // 停止波形动画
          this.stopWaveformAnimation();
        }

        if (interimResult) {
          console.log('Clearing interim result text');
          window.originalConsoleLog && window.originalConsoleLog('Clearing interim result text');
          interimResult.textContent = '';
        }

        console.log('Voice recognizer state before stopping:', this.voiceRecognizer.state);
        window.originalConsoleLog && window.originalConsoleLog('Voice recognizer state before stopping:', this.voiceRecognizer.state);
        
        if (this.voiceRecognizer.state !== 'inactive') {
          console.log('Stopping voice recognizer');
          window.originalConsoleLog && window.originalConsoleLog('Stopping voice recognizer');
          this.voiceRecognizer.stop();
          console.log('Voice recognizer stopped');
          window.originalConsoleLog && window.originalConsoleLog('Voice recognizer stopped');
        }

        // 停止音频可视化
        console.log('Stopping audio visualization...');
        window.originalConsoleLog && window.originalConsoleLog('Stopping audio visualization...');
        this.stopAudioVisualization();

        console.log('Voice recording stopped successfully');
        window.originalConsoleLog && window.originalConsoleLog('Voice recording stopped successfully');
      } else {
        console.log('No active recording to stop');
        window.originalConsoleLog && window.originalConsoleLog('No active recording to stop');
      }
    } catch (error) {
      console.error('Error stopping voice recording:', error);
      window.originalConsoleError && window.originalConsoleError('Error stopping voice recording:', error);
      this.addMessageToUI('停止录音时发生错误，请刷新页面重试。', 'ai');
    }
  }

  // 波形动画效果
  animateWaveform(waveform) {
    try {
      console.log('animateWaveform called');
      window.originalConsoleLog && window.originalConsoleLog('animateWaveform called');
      
      console.log('Waveform element:', !!waveform);
      window.originalConsoleLog && window.originalConsoleLog('Waveform element:', !!waveform);
      
      if (!waveform) {
        console.error('Waveform element not provided');
        window.originalConsoleError && window.originalConsoleError('Waveform element not provided');
        return;
      }

      // 清除之前的动画
      console.log('Stopping previous waveform animation...');
      window.originalConsoleLog && window.originalConsoleLog('Stopping previous waveform animation...');
      this.stopWaveformAnimation();

      // 创建波形条形
      console.log('Creating waveform bars...');
      window.originalConsoleLog && window.originalConsoleLog('Creating waveform bars...');
      
      waveform.innerHTML = '';
      const barCount = 12;
      
      console.log('Creating', barCount, 'waveform bars');
      window.originalConsoleLog && window.originalConsoleLog('Creating', barCount, 'waveform bars');
      
      for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'waveform-bar';
        waveform.appendChild(bar);
      }

      console.log('Waveform bars created successfully');
      window.originalConsoleLog && window.originalConsoleLog('Waveform bars created successfully');

      // 设置动画
      console.log('Starting waveform animation interval...');
      window.originalConsoleLog && window.originalConsoleLog('Starting waveform animation interval...');
      
      this.waveformAnimation = setInterval(() => {
        try {
          const bars = waveform.querySelectorAll('.waveform-bar');
          if (bars.length === 0) {
            console.warn('No waveform bars found during animation');
            window.originalConsoleWarn && window.originalConsoleWarn('No waveform bars found during animation');
            return;
          }
          
          bars.forEach((bar, index) => {
            const height = Math.random() * 100;
            bar.style.height = `${height}%`;
          });
        } catch (error) {
          console.error('Error in waveform animation interval:', error);
          window.originalConsoleError && window.originalConsoleError('Error in waveform animation interval:', error);
        }
      }, 100);
      
      console.log('Waveform animation started');
      window.originalConsoleLog && window.originalConsoleLog('Waveform animation started');
    } catch (error) {
      console.error('Error animating waveform:', error);
      window.originalConsoleError && window.originalConsoleError('Error animating waveform:', error);
    }
  }

  stopWaveformAnimation() {
    try {
      console.log('stopWaveformAnimation called');
      window.originalConsoleLog && window.originalConsoleLog('stopWaveformAnimation called');
      
      console.log('Current waveform animation:', !!this.waveformAnimation);
      window.originalConsoleLog && window.originalConsoleLog('Current waveform animation:', !!this.waveformAnimation);
      
      if (this.waveformAnimation) {
        console.log('Clearing waveform animation interval');
        window.originalConsoleLog && window.originalConsoleLog('Clearing waveform animation interval');
        clearInterval(this.waveformAnimation);
        this.waveformAnimation = null;
        console.log('Waveform animation stopped');
        window.originalConsoleLog && window.originalConsoleLog('Waveform animation stopped');
      } else {
        console.log('No active waveform animation to stop');
        window.originalConsoleLog && window.originalConsoleLog('No active waveform animation to stop');
      }
    } catch (error) {
      console.error('Error stopping waveform animation:', error);
      window.originalConsoleError && window.originalConsoleError('Error stopping waveform animation:', error);
    }
  }

  // 音频可视化（如果浏览器支持）
  startAudioVisualization() {
    try {
      console.log('startAudioVisualization called');
      window.originalConsoleLog && window.originalConsoleLog('startAudioVisualization called');
      
      console.log('Checking browser API support:', {
        mediaDevices: !!navigator.mediaDevices,
        audioContext: !!window.AudioContext,
        webkitAudioContext: !!window.webkitAudioContext,
      });
      window.originalConsoleLog && window.originalConsoleLog('Checking browser API support:', {
        mediaDevices: !!navigator.mediaDevices,
        audioContext: !!window.AudioContext,
        webkitAudioContext: !!window.webkitAudioContext,
      });
      
      if (!navigator.mediaDevices || !window.AudioContext) {
        console.log('Browser does not support required APIs for audio visualization');
        window.originalConsoleLog && window.originalConsoleLog('Browser does not support required APIs for audio visualization');
        return;
      }

      console.log('Creating AudioContext...');
      window.originalConsoleLog && window.originalConsoleLog('Creating AudioContext...');
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('AudioContext created successfully');
      window.originalConsoleLog && window.originalConsoleLog('AudioContext created successfully');

      console.log('Requesting microphone access...');
      window.originalConsoleLog && window.originalConsoleLog('Requesting microphone access...');
      
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log('Microphone access granted, setting up audio visualization');
          window.originalConsoleLog && window.originalConsoleLog('Microphone access granted, setting up audio visualization');
          
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          source.connect(analyser);

          console.log('Audio visualization components created:', {
            source: !!source,
            analyser: !!analyser,
            stream: !!stream,
          });
          window.originalConsoleLog && window.originalConsoleLog('Audio visualization components created:', {
            source: !!source,
            analyser: !!analyser,
            stream: !!stream,
          });

          this.audioVisualization = {
            audioContext,
            analyser,
            stream,
          };

          console.log('Audio visualization initialized successfully');
          window.originalConsoleLog && window.originalConsoleLog('Audio visualization initialized successfully');

          // 这里可以实现更高级的音频可视化
        })
        .catch(error => {
          console.error('Error accessing microphone for audio visualization:', error);
          window.originalConsoleError && window.originalConsoleError('Error accessing microphone for audio visualization:', error);
          
          let errorMessage = '无法启用音频可视化';
          if (error.name === 'NotAllowedError') {
            errorMessage = '麦克风访问被拒绝，无法启用音频可视化';
          } else if (error.name === 'NotFoundError') {
            errorMessage = '未找到麦克风设备，无法启用音频可视化';
          } else if (error.name === 'NotReadableError') {
            errorMessage = '麦克风设备被其他应用占用，无法启用音频可视化';
          }
          
          console.warn(errorMessage, error);
          window.originalConsoleWarn && window.originalConsoleWarn(errorMessage, error);
        });
    } catch (error) {
      console.error('Error initializing audio visualization:', error);
      window.originalConsoleError && window.originalConsoleError('Error initializing audio visualization:', error);
    }
  }

  stopAudioVisualization() {
    try {
      console.log('stopAudioVisualization called');
      window.originalConsoleLog && window.originalConsoleLog('stopAudioVisualization called');
      
      console.log('Current audio visualization:', !!this.audioVisualization);
      window.originalConsoleLog && window.originalConsoleLog('Current audio visualization:', !!this.audioVisualization);
      
      if (this.audioVisualization) {
        console.log('Stopping audio visualization, components:', {
          audioContext: !!this.audioVisualization.audioContext,
          analyser: !!this.audioVisualization.analyser,
          stream: !!this.audioVisualization.stream,
        });
        window.originalConsoleLog && window.originalConsoleLog('Stopping audio visualization, components:', {
          audioContext: !!this.audioVisualization.audioContext,
          analyser: !!this.audioVisualization.analyser,
          stream: !!this.audioVisualization.stream,
        });
        
        // 停止音频流
        if (this.audioVisualization.stream) {
          console.log('Stopping audio tracks...');
          window.originalConsoleLog && window.originalConsoleLog('Stopping audio tracks...');
          this.audioVisualization.stream.getTracks().forEach(track => {
            console.log('Stopping track:', track.kind, track.label);
            window.originalConsoleLog && window.originalConsoleLog('Stopping track:', track.kind, track.label);
            track.stop();
          });
          console.log('All audio tracks stopped');
          window.originalConsoleLog && window.originalConsoleLog('All audio tracks stopped');
        }
        
        // 关闭音频上下文
        if (this.audioVisualization.audioContext) {
          console.log('Closing audio context...');
          window.originalConsoleLog && window.originalConsoleLog('Closing audio context...');
          
          if (this.audioVisualization.audioContext.state !== 'closed') {
            this.audioVisualization.audioContext.close();
            console.log('Audio context closed');
            window.originalConsoleLog && window.originalConsoleLog('Audio context closed');
          } else {
            console.log('Audio context already closed');
            window.originalConsoleLog && window.originalConsoleLog('Audio context already closed');
          }
        }
        
        // 清理引用
        console.log('Clearing audio visualization references...');
        window.originalConsoleLog && window.originalConsoleLog('Clearing audio visualization references...');
        this.audioVisualization = null;
        console.log('Audio visualization stopped successfully');
        window.originalConsoleLog && window.originalConsoleLog('Audio visualization stopped successfully');
      } else {
        console.log('No active audio visualization to stop');
        window.originalConsoleLog && window.originalConsoleLog('No active audio visualization to stop');
      }
    } catch (error) {
      console.error('Error stopping audio visualization:', error);
      window.originalConsoleError && window.originalConsoleError('Error stopping audio visualization:', error);
    }
  }

  // 图片处理相关方法
  initializeImageUpload() {
    console.log('Initializing image upload...');
    const imageInput = document.getElementById('image-input');
    if (imageInput) {
      console.log('Image input element found, adding event listener');
      imageInput.addEventListener('change', (e) => {
        console.log('Image input change event triggered', e.target.files);
        this.handleImageFiles(e.target.files);
      });

      // 存储对元素的引用，以便后续操作
      this.elements.imageInput = imageInput;
    } else {
      console.error('Image input element not found');
    }
  }

  setupImageDragEvents() {
    console.log('Setting up image drag events...');
    const uploadZone = document.getElementById('upload-zone');
    if (!uploadZone) {
      console.error('Upload zone element not found');
      return;
    }

    console.log('Upload zone element found, setting up drag events');
    // 添加ARIA属性提升可访问性
    uploadZone.setAttribute('aria-label', '拖放图片到这里上传');
    uploadZone.setAttribute('tabindex', '0');
    uploadZone.setAttribute('role', 'dropzone');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.add('drag-over');
        uploadZone.setAttribute('aria-describedby', 'drag-over-message');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.remove('drag-over');
        uploadZone.removeAttribute('aria-describedby');
      });
    });

    uploadZone.addEventListener('drop', (e) => {
      console.log('Files dropped:', e.dataTransfer.files);
      this.handleImageFiles(e.dataTransfer.files);
    });

    // 键盘支持
    uploadZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (this.elements.imageInput) {
          this.elements.imageInput.click();
        }
      }
    });

    // 存储引用
    this.elements.uploadZone = uploadZone;
    console.log('Image drag events setup complete');
  }

  toggleImageUpload() {
    console.log('toggleImageUpload called');
    const imageUploadArea = document.getElementById('image-upload-area');
    const chatInput = document.querySelector('.chat-input-container');
    const imageInput = document.getElementById('image-input');

    if (!imageUploadArea || !chatInput) {
      console.error('Required elements not found:', { imageUploadArea: !!imageUploadArea, chatInput: !!chatInput });
      return;
    }

    const isVisible = imageUploadArea.style.display !== 'none';
    console.log('Image upload area visible:', isVisible);

    if (isVisible) {
      imageUploadArea.style.display = 'none';
      chatInput.style.display = 'flex';
      chatInput.setAttribute('aria-hidden', 'false');
      imageUploadArea.setAttribute('aria-hidden', 'true');
      // 如果有全局键盘快捷键，切换焦点回输入框
      if (this.elements.messageInput) {
        this.elements.messageInput.focus();
      }
    } else {
      imageUploadArea.style.display = 'block';
      chatInput.style.display = 'none';
      chatInput.setAttribute('aria-hidden', 'true');
      imageUploadArea.setAttribute('aria-hidden', 'false');
      // 聚焦上传区域提升可访问性
      if (this.elements.uploadZone) {
        this.elements.uploadZone.focus();
      }
      
      // 自动触发文件选择对话框
      if (imageInput) {
        console.log('Triggering file selection dialog');
        // 使用setTimeout确保DOM更新完成后再触发点击事件
        setTimeout(() => {
          try {
            imageInput.click();
            console.log('File selection dialog triggered');
          } catch (error) {
            console.error('Failed to trigger file selection:', error);
          }
        }, 100);
      } else {
        console.error('Image input element not found');
      }
    }
  }

  async handleImageFiles(files) {
    console.log('Handling image files:', files);
    const previewContainer = document.getElementById('image-preview');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');

    if (!previewContainer) {
      console.error('Preview container not found');
      return;
    }

    // 初始化进度条
    if (progressContainer) {
      progressContainer.style.display = 'block';
      if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
      }
    }

    // 清空预览容器
    previewContainer.innerHTML = '';

    const totalFiles = files.length;
    let processedCount = 0;

    const validFiles = Array.from(files).filter(file => {
      try {
        NextChatUtils.validateImageFile(file);
        return true;
      } catch (error) {
        console.error('File validation failed:', file.name, error);
        this.addMessageToUI(`文件 ${file.name}: ${error.message}`, 'ai');
        return false;
      }
    });

    console.log('Valid files:', validFiles);

    // 更新进度显示
    const updateProgress = (fileProgress) => {
      const overallProgress = Math.floor(((processedCount + fileProgress) / totalFiles) * 100);
      if (progressBar) {
        progressBar.style.width = `${overallProgress}%`;
        progressBar.setAttribute('aria-valuenow', overallProgress);
        progressBar.textContent = `${overallProgress}%`;
      }
    };

    // 如果没有有效文件，隐藏进度条
    if (validFiles.length === 0) {
      console.log('No valid files to process');
      if (progressContainer) {
        setTimeout(() => {
          progressContainer.style.display = 'none';
        }, 1000);
      }
      return;
    }

    for (const file of validFiles) {
      try {
        console.log('Processing file:', file.name);
        // 显示加载中的消息
        const loadingId = `loading-${Date.now()}`;
        this.addMessageToUI(`正在处理图片: ${file.name}...`, 'ai', true, loadingId);

        // 读取文件并更新进度
        updateProgress(0);
        const imageData = await this.readFileAsDataURL(file);
        console.log('File read as data URL, size:', imageData.length);

        // 压缩图片并更新进度
        updateProgress(0.3);
        const compressedImage = await this.compressImage(imageData, (compressProgress) => {
          updateProgress(0.3 + (compressProgress * 0.4)); // 压缩过程占40%进度
        });
        console.log('Image compressed, size:', compressedImage.length);

        // 显示预览
        updateProgress(0.7);
        const preview = this.createImagePreview(compressedImage, file.name);
        previewContainer.appendChild(preview);

        // 处理图片并更新进度
        updateProgress(0.8);
        await this.processAndSendImage(compressedImage, file.name, () => {
          updateProgress(1);
        });

        // 移除加载消息
        this.removeLoadingMessage(loadingId);

      } catch (error) {
        console.error('图片处理失败:', error);
        this.addMessageToUI(`处理图片 ${file.name} 时出错: ${error.message}`, 'ai');
      } finally {
        processedCount++;

        // 所有文件处理完成后隐藏进度条
        if (processedCount >= validFiles.length) {
          console.log('All files processed');
          if (progressContainer) {
            setTimeout(() => {
              progressContainer.style.display = 'none';
              // 清空预览容器
              previewContainer.innerHTML = '';
            }, 1000);
          }
        }
      }
    }
  }

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      // 添加进度事件监听
      if (reader.addEventListener) {
        reader.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = e.loaded / e.total;
            console.log(`文件读取进度: ${Math.round(progress * 100)}%`);
          }
        });
      }

      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => {
        let errorMessage = '文件读取失败';
        switch (reader.error.code) {
          case reader.error.NOT_FOUND_ERR:
            errorMessage = '文件未找到';
            break;
          case reader.error.NOT_READABLE_ERR:
            errorMessage = '文件无法读取';
            break;
          case reader.error.SECURITY_ERR:
            errorMessage = '安全错误';
            break;
          default:
            errorMessage = '未知错误';
        }
        reject(new ImageProcessingError(errorMessage));
      };
      reader.readAsDataURL(file);
    });
  }

  createImagePreview(imageData, fileName) {
    const previewWrapper = this.createElement('div', {
      className: 'image-preview-wrapper',
      style: 'position: relative; display: inline-block; margin: 8px;',
    });

    const img = this.createElement('img', {
      src: imageData,
      className: 'preview-image',
      style: 'width: 60px; height: 60px; object-fit: cover; border-radius: 8px;',
      alt: `预览: ${fileName}`,
      loading: 'lazy',
    });

    // 添加加载指示器
    const loadingIndicator = this.createElement('div', {
      className: 'preview-loading',
      style: 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.8); border-radius: 8px; display: flex; align-items: center; justify-content: center;',
      'aria-label': `${fileName} 加载中`,
    });
    loadingIndicator.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="50.27 50.27" stroke-dashoffset="25.135" style="animation: spin 1s linear infinite;"></circle></svg>';

    // 图片加载完成后隐藏加载指示器
    img.onload = () => {
      loadingIndicator.style.display = 'none';
    };

    // 图片加载失败时显示错误图标
    img.onerror = () => {
      loadingIndicator.style.display = 'none';
      img.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 24 24%22 fill%3D%22none%22 stroke%3D%22%23ff4757%22 stroke-width%3D%222%22 stroke-linecap%3D%22round%22 stroke-linejoin%3D%22round%22%3E%3Crect x%3D%223%22 y%3D%223%22 width%3D%2218%22 height%3D%2218%22 rx%3D%222%22%3E%3C%2Frect%3E%3Cline x1%3D%2218%22 y1%3D%223%22 x2%3D%223%22 y2%3D%2218%22%3E%3C%2Fline%3E%3Cline x1%3D%223%22 y1%3D%223%22 x2%3D%2218%22 y2%3D%2218%22%3E%3C%2Fline%3E%3C%2Fsvg%3E';
      img.alt = '预览加载失败';
      img.title = '预览加载失败';
    };

    // 添加文件名标签
    const fileNameTag = this.createElement('div', {
      className: 'preview-filename',
      style: 'position: absolute; bottom: -20px; left: 0; right: 0; text-align: center; font-size: 10px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
      title: fileName,
      textContent: fileName,
    });

    previewWrapper.appendChild(img);
    previewWrapper.appendChild(loadingIndicator);
    previewWrapper.appendChild(fileNameTag);

    // 添加动画样式
    if (!document.getElementById('preview-loading-style')) {
      const style = document.createElement('style');
      style.id = 'preview-loading-style';
      style.textContent = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .preview-loading svg { animation: spin 1s linear infinite; }
      `;
      document.head.appendChild(style);
    }

    return previewWrapper;
  }

  async processAndSendImage(imageData, fileName = '图片', progressCallback = null) {
    console.log('Processing and sending image:', fileName, 'size:', imageData.length);
    try {
      // 显示处理开始的消息
      const processingId = `processing-${Date.now()}`;
      console.log('Adding processing message with ID:', processingId);
      this.addMessageToUI(`正在准备发送图片: ${fileName}...`, 'ai', true, processingId);

      // 添加图片消息到UI
      console.log('Adding image message to UI');
      this.addImageMessageToUI(imageData, 'user', fileName);

      // 模拟网络延迟
      console.log('Simulating network delay');
      await new Promise(resolve => setTimeout(resolve, 300));

      // 更新进度
      if (progressCallback) {
        console.log('Updating progress to 0.5');
        progressCallback(0.5);
      }

      // 获取AI对图片的分析
      const analyzingId = `analyzing-${Date.now()}`;
      console.log('Adding analyzing message with ID:', analyzingId);
      this.addMessageToUI('正在分析图片内容...', 'ai', true, analyzingId);

      // 更新进度
      if (progressCallback) {
        console.log('Updating progress to 0.7');
        progressCallback(0.7);
      }

      console.log('Calling analyzeImage method');
      const response = await this.analyzeImage(imageData, fileName);
      console.log('Image analysis response:', response);

      // 更新进度
      if (progressCallback) {
        console.log('Updating progress to 0.9');
        progressCallback(0.9);
      }

      // 移除处理中的消息
      console.log('Removing processing messages');
      this.removeLoadingMessage(processingId);
      this.removeLoadingMessage(analyzingId);

      // 添加AI回复
      console.log('Adding AI response to UI');
      this.addMessageToUI(response, 'ai');

      // 完全完成
      if (progressCallback) {
        console.log('Updating progress to 1.0 (complete)');
        progressCallback(1);
      }

      console.log('Image processing and sending completed successfully');

    } catch (error) {
      console.error('图片处理失败:', error);
      // 提供更具体的错误信息
      let errorMessage = '抱歉，图片处理遇到了问题。';
      if (error instanceof ImageProcessingError) {
        errorMessage = `图片处理失败: ${error.message}`;
      } else if (error.name === 'NetworkError') {
        errorMessage = '网络连接异常，请检查网络后重试。';
      }
      console.log('Adding error message to UI:', errorMessage);
      this.addMessageToUI(errorMessage, 'ai');
    }
  }

  async compressImage(imageData, progressCallback = null, maxSizeKB = (NEXTCHAT_CONFIG.MAX_IMAGE_SIZE || 5) * 1024) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();

        // 添加超时处理
        const timeout = setTimeout(() => {
          reject(new ImageProcessingError('图片加载超时'));
        }, 10000); // 10秒超时

        img.onload = () => {
          clearTimeout(timeout);

          try {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            // 智能调整尺寸 - 根据原始图片大小动态决定最大尺寸
            let maxDimension = 1200;
            if (width < 800 && height < 800) {
              maxDimension = 800; // 小图保持较高质量
            } else if (width > 2000 || height > 2000) {
              maxDimension = 1600; // 超大型图片适当压缩更多
            }

            // 计算缩放比例
            const scale = Math.min(maxDimension / width, maxDimension / height);

            // 如果图片已经很小，不需要缩放
            if (scale < 1) {
              width = Math.floor(width * scale);
              height = Math.floor(height * scale);
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');

            // 启用高质量渲染
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // 绘制图片
            ctx.drawImage(img, 0, 0, width, height);

            // 智能选择输出格式
            let outputFormat = 'image/webp';
            let quality = 0.85;

            // 检测浏览器是否支持WebP
            if (!this.supportsWebP()) {
              outputFormat = 'image/jpeg';
            }

            // 创建一个函数来获取压缩数据URL
            const getDataUrl = (format, q) => {
              return canvas.toDataURL(format, q);
            };

            // 智能调整压缩质量
            let compressedDataUrl = getDataUrl(outputFormat, quality);

            // 计算数据URL的大小（字节）
            const getDataUrlSize = (dataUrl) => {
              // 移除数据URL头部
              const padding = (dataUrl.length % 4) === 0 ? 0 : (4 - (dataUrl.length % 4));
              return ((dataUrl.length / 4) * 3) - padding;
            };

            // 迭代压缩直到达到目标大小或最低质量
            const maxIterations = 10;
            let iterations = 0;

            while (getDataUrlSize(compressedDataUrl) > maxSizeKB * 1024 && quality > 0.1 && iterations < maxIterations) {
              // 根据当前大小和目标大小智能调整质量减少幅度
              const currentSize = getDataUrlSize(compressedDataUrl);
              const targetSize = maxSizeKB * 1024;
              const sizeRatio = targetSize / currentSize;

              // 质量调整幅度随当前质量降低而减小
              const qualityDecrease = Math.max(0.05, sizeRatio * 0.2);
              quality = Math.max(0.1, quality - qualityDecrease);

              compressedDataUrl = getDataUrl(outputFormat, quality);
              iterations++;

              // 更新进度
              if (progressCallback) {
                progressCallback(0.5 + (iterations / maxIterations) * 0.5);
              }
            }

            // 更新进度为完成
            if (progressCallback) {
              progressCallback(1);
            }

            resolve(compressedDataUrl);

          } catch (error) {
            reject(new ImageProcessingError(`图片处理失败: ${error.message}`));
          }
        };

        img.onerror = () => {
          clearTimeout(timeout);
          reject(new ImageProcessingError('图片加载失败，可能是无效的图片格式'));
        };

        img.src = imageData;

      } catch (error) {
        reject(new ImageProcessingError(`压缩图片时出错: ${error.message}`));
      }
    });
  }

  // 检测浏览器是否支持WebP格式
  supportsWebP() {
    if (typeof this.webpSupport !== 'undefined') {
      return this.webpSupport;
    }

    try {
      const canvas = document.createElement('canvas');
      if (canvas.getContext && canvas.getContext('2d')) {
        this.webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      } else {
        this.webpSupport = false;
      }
    } catch (e) {
      this.webpSupport = false;
    }

    return this.webpSupport;
  }

  addImageMessageToUI(imageData, sender, fileName = '图片') {
    console.log('Adding image message to UI:', fileName, 'sender:', sender);
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) {
      console.error('Messages container not found');
      return;
    }

    const messageId = `message-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log('Creating message with ID:', messageId);
    
    const messageDiv = this.createElement('div', {
      id: messageId,
      className: `message ${sender}-message`,
      'data-message-type': 'image',
      'data-timestamp': Date.now(),
    });

    const avatar = this.createElement('div', {
      className: 'message-avatar',
      innerHTML: `<img src="https://via.placeholder.com/32x32/${sender === 'user' ? '007bff' : '8c1c13'}/ffffff?text=${sender === 'user' ? 'U' : 'G'}" alt="${sender}" loading="lazy">`,
    });

    const content = this.createElement('div', {
      className: 'message-content',
    });

    const bubble = this.createElement('div', {
      className: 'message-bubble',
    });

    // 创建图片容器
    const imageContainer = this.createElement('div', {
      className: 'message-image-container',
      style: 'position: relative; display: inline-block;',
    });

    // 添加图片加载指示器
    const loadingIndicator = this.createElement('div', {
      className: 'message-image-loading',
      style: 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255, 255, 255, 0.8); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; z-index: 10;',
      'aria-label': '图片加载中',
    });
    loadingIndicator.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="50.27 50.27" stroke-dashoffset="25.135" style="animation: spin 1s linear infinite;"></circle></svg>';

    const img = this.createElement('img', {
      src: imageData,
      style: 'max-width: 200px; border-radius: 8px; cursor: pointer; transition: opacity 0.3s;',
      alt: `由${sender === 'user' ? '您' : 'AI'}发送的图片: ${fileName}`,
      title: fileName,
      loading: 'lazy',
      onclick: `window.open('${imageData}', '_blank')`,
    });

    // 图片加载完成后隐藏加载指示器
    img.onload = () => {
      console.log('Image loaded successfully:', fileName);
      loadingIndicator.style.display = 'none';
      img.style.opacity = '1';
    };

    // 图片加载失败时显示错误状态
    img.onerror = () => {
      console.error('Failed to load image:', fileName);
      loadingIndicator.style.display = 'none';
      img.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 24 24%22 fill%3D%22none%22 stroke%3D%22%23ff4757%22 stroke-width%3D%222%22 stroke-linecap%3D%22round%22 stroke-linejoin%3D%22round%22%3E%3Crect x%3D%223%22 y%3D%223%22 width%3D%2218%22 height%3D%2218%22 rx%3D%222%22%3E%3C%2Frect%3E%3Cline x1%3D%2218%22 y1%3D%223%22 x2%3D%223%22 y2%3D%2218%22%3E%3C%2Fline%3E%3Cline x1%3D%223%22 y1%3D%223%22 x2%3D%2218%22 y2%3D%2218%22%3E%3C%2Fline%3E%3C%2Fsvg%3E';
      img.alt = '图片加载失败';
      img.title = '图片加载失败';
    };

    // 添加图片信息
    const imageInfo = this.createElement('div', {
      className: 'message-image-info',
      style: 'font-size: 12px; color: #657786; margin-top: 4px; text-align: left; word-break: break-word;',
      textContent: fileName,
      title: fileName,
    });

    // 添加图片操作按钮
    const imageActions = this.createElement('div', {
      className: 'message-image-actions',
      style: 'position: absolute; top: 4px; right: 4px; display: none; gap: 4px; background: rgba(0, 0, 0, 0.5); padding: 2px; border-radius: 4px;',
    });

    const downloadBtn = this.createElement('button', {
      className: 'message-image-action-btn',
      style: 'width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.8); border: none; border-radius: 3px; cursor: pointer;',
      'aria-label': '下载图片',
      title: '下载图片',
      innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/></svg>',
      onclick: (e) => {
        e.stopPropagation();
        console.log('Download button clicked for image:', fileName);
        this.downloadImage(imageData, fileName);
      },
    });

    // 悬停显示操作按钮
    imageContainer.addEventListener('mouseenter', () => {
      imageActions.style.display = 'flex';
    });

    imageContainer.addEventListener('mouseleave', () => {
      imageActions.style.display = 'none';
    });

    imageActions.appendChild(downloadBtn);
    imageContainer.appendChild(img);
    imageContainer.appendChild(loadingIndicator);
    imageContainer.appendChild(imageActions);
    bubble.appendChild(imageContainer);
    content.appendChild(bubble);
    content.appendChild(imageInfo);
    content.appendChild(this.createElement('div', {
      className: 'message-time',
      textContent: NextChatUtils.formatTime(),
    }));

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messagesContainer.appendChild(messageDiv);
    console.log('Image message added to DOM');

    // 添加加载动画样式
    if (!document.getElementById('message-image-loading-style')) {
      const style = document.createElement('style');
      style.id = 'message-image-loading-style';
      style.textContent = `
        @keyframes spin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
        .message-image-loading svg { animation: spin 1s linear infinite; }
      `;
      document.head.appendChild(style);
    }

    // 滚动到底部
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // 存储消息历史
    this.messageHistory.push({
      id: messageId,
      type: 'image',
      sender: sender,
      content: imageData,
      fileName: fileName,
      timestamp: Date.now(),
    });
    console.log('Image message added to history');

    // 保存到本地存储
    NextChatUtils.saveHistoryToStorage(this.messageHistory);
  }

  // 下载图片功能
  downloadImage(imageData, fileName) {
    console.log('Downloading image:', fileName);
    try {
      // 提取文件扩展名或使用默认
      const fileExt = fileName.split('.').pop() || 'jpg';
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9-_\.]/g, '_');
      console.log('File extension:', fileExt, 'Cleaned file name:', cleanFileName);

      // 创建下载链接
      const link = document.createElement('a');
      link.href = imageData;
      link.download = cleanFileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // 触发下载
      document.body.appendChild(link);
      link.click();
      console.log('Download link clicked');

      // 清理
      setTimeout(() => {
        document.body.removeChild(link);
        console.log('Download link removed from DOM');
      }, 100);

      console.log('图片下载开始:', cleanFileName);
      return true;
    } catch (error) {
      console.error('下载图片失败:', error);
      this.addMessageToUI('图片下载失败，请稍后重试。', 'ai');
      return false;
    }
  }

  async analyzeImage(imageData, fileName = '图片') {
    console.log('Analyzing image:', fileName, 'size:', imageData.length);
    // 模拟图片分析过程
    return new Promise((resolve) => {
      console.log('Starting image analysis simulation');
      // 根据文件类型或名称提供不同的分析结果
      setTimeout(() => {
        console.log('Image analysis timeout completed, generating response');
        // 智能检测图片类型（简单实现）
        let analysisResponse = '我看到您上传了一张图片。作为Reich AI助手，我可以帮您分析产品细节、材质、颜色等信息。请告诉我您想了解图片中的什么内容？';

        // 检查文件名中的关键词来提供更有针对性的回复
        const lowerFileName = fileName.toLowerCase();
        console.log('Checking filename keywords:', lowerFileName);

        if (lowerFileName.includes('dress') || lowerFileName.includes('gown')) {
          analysisResponse = '这是一件精美的服装！从图片中，我可以看到它具有优雅的线条和设计。我可以帮您分析它的风格特点、适合的场合，或者推荐搭配的配饰。您想了解哪方面的信息？';
        } else if (lowerFileName.includes('bag') || lowerFileName.includes('handbag')) {
          analysisResponse = '这个手袋看起来很精致！Reich以其高品质的手袋而闻名。我可以帮您分析它的设计元素、材质特点，或者推荐搭配的服装风格。您想了解什么？';
        } else if (lowerFileName.includes('shoes') || lowerFileName.includes('boot')) {
          analysisResponse = '这双鞋的设计很独特！鞋子是整体造型的重要组成部分。我可以帮您分析它的风格、材质，或者推荐搭配的服装和场合。您想知道些什么？';
        } else if (lowerFileName.includes('jewelry') || lowerFileName.includes('ring') || lowerFileName.includes('necklace')) {
          analysisResponse = '这些珠宝饰品非常精美！Reich的珠宝以其独特的设计和精湛的工艺著称。我可以帮您分析它们的材质、设计灵感，或者推荐搭配方式。您感兴趣的是什么？';
        } else if (lowerFileName.includes('fashion') || lowerFileName.includes('style')) {
          analysisResponse = '这张时尚图片展示了很好的搭配灵感！时尚是一种自我表达的方式。我可以帮您分析其中的风格元素、色彩搭配，或者提供类似风格的搭配建议。您想了解哪方面的信息？';
        }

        console.log('Generated analysis response:', analysisResponse);
        resolve(analysisResponse);
      }, 2000); // 模拟2秒的分析时间
    });
  }

  // 向量数据库相关方法
  async initializeVectorDatabase() {
    try {
      if (window.ChromaDB) {
        this.vectorDB = new window.ChromaDB.Client({
          path: 'http://localhost:8000',
        });

        await this.vectorDB.createCollection({
          name: 'gucci_chat_history',
          metadata: { "hnsw:space": "cosine" },
        });

        console.log('向量数据库初始化成功');
      }
    } catch (error) {
      console.warn('向量数据库初始化失败:', error);
    }
  }

  async storeMessageInVectorDB(message, sender) {
    if (!this.vectorDB) return;

    try {
      const embedding = this.simpleTextEmbedding(message);

      await this.vectorDB.add({
        ids: [NextChatUtils.generateId()],
        embeddings: [embedding],
        metadatas: [{
          sender: sender,
          timestamp: new Date().toISOString(),
          message: message,
        }],
      });
    } catch (error) {
      console.error('存储消息到向量数据库失败:', error);
    }
  }

  async searchVectorDB(query, limit = 5) {
    if (!this.vectorDB) return [];

    try {
      const queryEmbedding = this.simpleTextEmbedding(query);

      const results = await this.vectorDB.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
      });

      return results.metadatas[0] || [];
    } catch (error) {
      console.error('向量数据库查询失败:', error);
      return [];
    }
  }

  simpleTextEmbedding(text) {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(NEXTCHAT_CONFIG.VECTOR_EMBEDDING_SIZE).fill(0);

    words.forEach((word, index) => {
      if (index < NEXTCHAT_CONFIG.VECTOR_EMBEDDING_SIZE) {
        embedding[index] = word.length / 10;
      }
    });

    return embedding;
  }

  // 语音合成功能
  setupTextToSpeech() {
    try {
      console.log('Setting up text-to-speech functionality...');
      
      // 检查浏览器是否支持语音合成
      if ('speechSynthesis' in window) {
        console.log('Speech synthesis API is supported');
        this.speechSynthesis = window.speechSynthesis;
        
        // 获取可用的语音列表
        this.loadVoices();
        
        // 当语音列表加载完成时重新加载
        if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = () => {
            this.loadVoices();
          };
        }
        
        // 创建语音合成UI控件
        this.createSpeechControls();
        
        console.log('Text-to-speech setup completed successfully');
      } else {
        console.warn('Speech synthesis API is not supported in this browser');
        this.addMessageToUI('您的浏览器不支持语音合成功能，无法使用语音朗读功能。', 'ai');
      }
    } catch (error) {
      console.error('Error setting up text-to-speech:', error);
      this.addMessageToUI('初始化语音合成功能时发生错误。', 'ai');
    }
  }

  // 加载可用的语音列表
  loadVoices() {
    try {
      console.log('Loading available voices...');
      this.availableVoices = speechSynthesis.getVoices();
      console.log(`Loaded ${this.availableVoices.length} voices`);
      
      // 优先选择中文语音
      this.preferredVoice = this.availableVoices.find(voice => 
        voice.lang.includes('zh') || voice.name.includes('Chinese'),
      );
      
      // 如果没有中文语音，选择英语语音
      if (!this.preferredVoice) {
        this.preferredVoice = this.availableVoices.find(voice => 
          voice.lang.includes('en') || voice.name.includes('English'),
        );
      }
      
      // 如果仍然没有，使用默认语音
      if (!this.preferredVoice && this.availableVoices.length > 0) {
        this.preferredVoice = this.availableVoices[0];
      }
      
      if (this.preferredVoice) {
        console.log('Selected preferred voice:', this.preferredVoice.name, this.preferredVoice.lang);
      } else {
        console.warn('No suitable voice found');
      }
    } catch (error) {
      console.error('Error loading voices:', error);
    }
  }

  // 创建语音控制UI
  createSpeechControls() {
    try {
      console.log('Creating speech control UI...');
      
      // 检查是否已经创建了语音控制
      if (document.getElementById('speech-controls')) {
        console.log('Speech controls already exist');
        return;
      }
      
      // 创建语音控制容器
      const speechControls = document.createElement('div');
      speechControls.id = 'speech-controls';
      speechControls.className = 'speech-controls';
      speechControls.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        padding: 8px;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 8px;
      `;
      
      // 创建朗读按钮
      const speakButton = document.createElement('button');
      speakButton.id = 'speak-button';
      speakButton.className = 'speech-button';
      speakButton.innerHTML = this.getSVGIcon('speaker');
      speakButton.title = '朗读AI回复';
      speakButton.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      speakButton.addEventListener('click', () => {
        this.speakLastAIMessage();
      });
      
      // 创建停止按钮
      const stopButton = document.createElement('button');
      stopButton.id = 'stop-speech-button';
      stopButton.className = 'speech-button';
      stopButton.innerHTML = this.getSVGIcon('stop');
      stopButton.title = '停止朗读';
      stopButton.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      stopButton.addEventListener('click', () => {
        this.stopSpeaking();
      });
      
      // 创建语音选择下拉菜单
      const voiceSelect = document.createElement('select');
      voiceSelect.id = 'voice-select';
      voiceSelect.className = 'voice-select';
      voiceSelect.title = '选择语音';
      voiceSelect.style.cssText = `
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
      `;
      
      // 填充语音选项
      this.populateVoiceSelect(voiceSelect);
      
      // 创建语速控制
      const rateContainer = document.createElement('div');
      rateContainer.className = 'rate-control';
      rateContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
      `;
      
      const rateLabel = document.createElement('label');
      rateLabel.textContent = '语速:';
      rateLabel.style.cssText = `
        font-size: 12px;
        color: #666;
      `;
      
      const rateInput = document.createElement('input');
      rateInput.id = 'speech-rate';
      rateInput.type = 'range';
      rateInput.min = '0.5';
      rateInput.max = '2';
      rateInput.step = '0.1';
      rateInput.value = '1';
      rateInput.style.cssText = `
        width: 60px;
      `;
      
      rateInput.addEventListener('input', (e) => {
        this.speechRate = parseFloat(e.target.value);
      });
      
      // 组装UI元素
      rateContainer.appendChild(rateLabel);
      rateContainer.appendChild(rateInput);
      speechControls.appendChild(speakButton);
      speechControls.appendChild(stopButton);
      speechControls.appendChild(voiceSelect);
      speechControls.appendChild(rateContainer);
      
      // 将语音控制添加到聊天输入区域
      const chatInputContainer = document.querySelector('.chat-input-container');
      if (chatInputContainer) {
        chatInputContainer.appendChild(speechControls);
        console.log('Speech controls added to chat input container');
      } else {
        console.warn('Chat input container not found, speech controls not added');
      }
      
      // 存储对元素的引用
      this.elements.speechControls = speechControls;
      this.elements.speakButton = speakButton;
      this.elements.stopButton = stopButton;
      this.elements.voiceSelect = voiceSelect;
      this.elements.rateInput = rateInput;
      
      // 初始化语音设置
      this.speechRate = 1;
      
      console.log('Speech control UI created successfully');
    } catch (error) {
      console.error('Error creating speech control UI:', error);
    }
  }

  // 填充语音选择下拉菜单
  populateVoiceSelect(selectElement) {
    try {
      console.log('Populating voice select dropdown...');
      
      // 清空现有选项
      selectElement.innerHTML = '';
      
      // 添加默认选项
      const defaultOption = document.createElement('option');
      defaultOption.textContent = '默认语音';
      defaultOption.value = '';
      selectElement.appendChild(defaultOption);
      
      // 添加可用语音选项
      if (this.availableVoices && this.availableVoices.length > 0) {
        this.availableVoices.forEach((voice, index) => {
          const option = document.createElement('option');
          option.textContent = `${voice.name} (${voice.lang})`;
          option.value = index;
          
          // 如果是首选语音，设置为选中状态
          if (this.preferredVoice && voice === this.preferredVoice) {
            option.selected = true;
          }
          
          selectElement.appendChild(option);
        });
      }
      
      // 添加事件监听器
      selectElement.addEventListener('change', (e) => {
        const selectedIndex = parseInt(e.target.value);
        if (selectedIndex >= 0 && selectedIndex < this.availableVoices.length) {
          this.selectedVoice = this.availableVoices[selectedIndex];
          console.log('Selected voice:', this.selectedVoice.name);
        } else {
          this.selectedVoice = null;
          console.log('Using default voice');
        }
      });
      
      console.log('Voice select dropdown populated successfully');
    } catch (error) {
      console.error('Error populating voice select dropdown:', error);
    }
  }

  // 朗读最后一条AI消息
  speakLastAIMessage() {
    try {
      console.log('Speaking last AI message...');
      
      // 检查是否正在朗读
      if (this.speechSynthesis.speaking) {
        console.log('Already speaking, stopping current speech');
        this.speechSynthesis.cancel();
      }
      
      // 获取最后一条AI消息
      const lastAIMessage = this.messageHistory
        .slice()
        .reverse()
        .find(msg => msg.sender === 'ai' && msg.type === 'text');
      
      if (!lastAIMessage) {
        console.log('No AI message found to speak');
        this.addMessageToUI('没有找到可以朗读的AI回复。', 'ai');
        return;
      }
      
      console.log('Found AI message to speak:', lastAIMessage.content.substring(0, 50) + '...');
      
      // 创建语音合成请求
      const utterance = new SpeechSynthesisUtterance(lastAIMessage.content);
      
      // 设置语音参数
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      } else if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }
      
      utterance.rate = this.speechRate || 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // 设置事件监听器
      utterance.onstart = () => {
        console.log('Speech synthesis started');
        if (this.elements.speakButton) {
          this.elements.speakButton.style.opacity = '0.5';
          this.elements.speakButton.disabled = true;
        }
      };
      
      utterance.onend = () => {
        console.log('Speech synthesis ended');
        if (this.elements.speakButton) {
          this.elements.speakButton.style.opacity = '1';
          this.elements.speakButton.disabled = false;
        }
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        if (this.elements.speakButton) {
          this.elements.speakButton.style.opacity = '1';
          this.elements.speakButton.disabled = false;
        }
        this.addMessageToUI(`语音朗读出错: ${event.error}`, 'ai');
      };
      
      // 开始朗读
      this.speechSynthesis.speak(utterance);
      console.log('Speech synthesis started successfully');
    } catch (error) {
      console.error('Error speaking last AI message:', error);
      this.addMessageToUI('朗读AI回复时发生错误。', 'ai');
    }
  }

  // 停止朗读
  stopSpeaking() {
    try {
      console.log('Stopping speech synthesis...');
      
      if (this.speechSynthesis && this.speechSynthesis.speaking) {
        this.speechSynthesis.cancel();
        console.log('Speech synthesis cancelled');
        
        if (this.elements.speakButton) {
          this.elements.speakButton.style.opacity = '1';
          this.elements.speakButton.disabled = false;
        }
      } else {
        console.log('No speech synthesis in progress');
      }
    } catch (error) {
      console.error('Error stopping speech synthesis:', error);
    }
  }

  // 自动朗读AI回复
  autoSpeakAIMessage(message) {
    try {
      // 检查是否启用了自动朗读
      if (!this.autoSpeakEnabled) {
        return;
      }
      
      console.log('Auto-speaking AI message...');
      
      // 检查是否正在朗读
      if (this.speechSynthesis.speaking) {
        console.log('Already speaking, cancelling current speech');
        this.speechSynthesis.cancel();
      }
      
      // 创建语音合成请求
      const utterance = new SpeechSynthesisUtterance(message);
      
      // 设置语音参数
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      } else if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }
      
      utterance.rate = this.speechRate || 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // 开始朗读
      this.speechSynthesis.speak(utterance);
      console.log('Auto speech synthesis started successfully');
    } catch (error) {
      console.error('Error auto-speaking AI message:', error);
    }
  }

  // 切换自动朗读功能
  toggleAutoSpeak() {
    try {
      console.log('Toggling auto-speak feature...');
      
      this.autoSpeakEnabled = !this.autoSpeakEnabled;
      console.log('Auto-speak enabled:', this.autoSpeakEnabled);
      
      // 更新UI状态
      const autoSpeakToggle = document.getElementById('auto-speak-toggle');
      if (autoSpeakToggle) {
        autoSpeakToggle.checked = this.autoSpeakEnabled;
      }
      
      // 保存用户偏好
      localStorage.setItem('nextchat_auto_speak', this.autoSpeakEnabled);
      
      // 通知用户
      const message = this.autoSpeakEnabled ? '已启用自动朗读功能' : '已禁用自动朗读功能';
      this.addMessageToUI(message, 'ai');
    } catch (error) {
      console.error('Error toggling auto-speak:', error);
    }
  }

  // 工具方法
  createElement(tag, attributes = {}) {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'innerHTML') {
        element.innerHTML = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else if (key === 'onclick') {
        element.setAttribute('onclick', value);
      } else {
        element.setAttribute(key, value);
      }
    });

    return element;
  }

  getSVGIcon(type) {
    const icons = {
      chat: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/><path d="M8.5 9h7c.28 0 .5.22.5.5s-.22.5-.5.5h-7c-.28 0-.5-.22-.5-.5s.22-.5.5-.5zm0 3h7c.28 0 .5.22.5.5s-.22.5-.5.5h-7c-.28 0-.5-.22-.5-.5s.22-.5.5-.5zm0 3h4c.28 0 .5.22.5.5s-.22.5-.5.5h-4c-.28 0-.5-.22.5-.5s.22-.5.5-.5z" fill="currentColor"/></svg>',
      microphone: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="currentColor"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="currentColor"/></svg>',
      image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/></svg>',
      close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>',
      send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>',
      record: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>',
      stop: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
      upload: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" fill="currentColor"/></svg>',
      speaker: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/></svg>',
    };

    return icons[type] || '';
  }

  notifyReady() {
    // 触发自定义事件
    const event = new CustomEvent('nextchat:ready', {
      detail: { instance: this },
    });
    document.dispatchEvent(event);

    // 设置全局实例
    window.setChatInstance?.(this);
  }

  createFallbackInterface() {
    console.log('创建简化版AI助手界面');
    this.createChatInterface();
    this.setupEventListeners();
  }

  // 公共API
  getState() {
    return { ...this.state };
  }

  getMessageHistory() {
    return [...this.messageHistory];
  }

  clearHistory() {
    this.messageHistory = [];
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
      messagesContainer.appendChild(this.createWelcomeMessage());
    }
  }

  destroy() {
    // 清理事件监听器
    document.removeEventListener('keydown', this.handleGlobalKeydown);

    // 停止语音识别
    if (this.voiceRecognizer) {
      this.stopVoiceRecording();
    }

    // 移除DOM元素
    if (this.elements.container) {
      this.elements.container.remove();
    }

    console.log('NextChat Advanced 已销毁');
  }
}

// 初始化函数
function initNextChatAdvanced(config = {}) {
  return new NextChatAdvanced(config);
}

// 全局暴露
window.NextChatAdvanced = NextChatAdvanced;
window.initNextChatAdvanced = initNextChatAdvanced;

// 全局语音控制函数
let globalChatInstance = null;

window.startVoiceRecording = function () {
  try {
    if (globalChatInstance?.startVoiceRecording) {
      console.log('Starting voice recording through global function');
      return globalChatInstance.startVoiceRecording();
    }
    console.warn('Global chat instance not available');
    return false;
  } catch (error) {
    console.error('Error in startVoiceRecording:', error);
    return false;
  }
};

window.stopVoiceRecording = function () {
  try {
    if (globalChatInstance?.stopVoiceRecording) {
      console.log('Stopping voice recording through global function');
      return globalChatInstance.stopVoiceRecording();
    }
    console.warn('Global chat instance not available');
    return false;
  } catch (error) {
    console.error('Error in stopVoiceRecording:', error);
    return false;
  }
};

window.setChatInstance = function (instance) {
  try {
    console.log('Setting global chat instance');
    globalChatInstance = instance;
    return true;
  } catch (error) {
    console.error('Error in setChatInstance:', error);
    return false;
  }
};

// 导出（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NextChatAdvanced, initNextChatAdvanced };
}

// Gucci AI助手初始化函数
function initGucciAIAssistant(config = {}) {
  console.log('Initializing Gucci AI Assistant with config:', config);
  
  try {
    // 合并默认配置
    const defaultConfig = {
      brandName: 'Reich',
      welcomeMessage: '您好！我是Reich AI购物助手，很高兴为您服务。我可以帮您查找产品、提供搭配建议、解答问题等。请问有什么可以帮您的吗？',
      primaryColor: '#D4AF37', // 奢华金色
      position: 'bottom-right',
      suggestions: [
        '查看最新手袋系列',
        '推荐适合我的鞋履',
        '搭配建议',
        '查看促销活动'
      ]
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    // 创建或获取NextChat实例
    let chatInstance;
    
    // 如果已有全局实例，则使用它
    if (window.NextChatAdvanced && globalChatInstance) {
      chatInstance = globalChatInstance;
      console.log('Using existing NextChat Advanced instance');
    } else {
      // 否则创建新实例
      chatInstance = new NextChatAdvanced(finalConfig);
      globalChatInstance = chatInstance;
      console.log('Created new NextChat Advanced instance');
    }
    
    // 应用Gucci特定配置
    if (finalConfig.brandName) {
      // 更新品牌名称
      const brandElements = document.querySelectorAll('.chat-brand, .ai-assistant-brand');
      brandElements.forEach(el => {
        if (el) el.textContent = finalConfig.brandName;
      });
    }
    
    // 更新欢迎消息
    if (finalConfig.welcomeMessage && chatInstance.addMessageToUI) {
      // 清空现有消息
      chatInstance.clearHistory();
      // 添加新的欢迎消息
      chatInstance.addMessageToUI(finalConfig.welcomeMessage, 'ai');
    }
    
    // 更新建议按钮
    if (finalConfig.suggestions && Array.isArray(finalConfig.suggestions)) {
      const suggestionsContainer = document.getElementById('chat-suggestions');
      if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
        finalConfig.suggestions.forEach(suggestion => {
          const button = document.createElement('button');
          button.className = 'suggestion-btn';
          button.textContent = suggestion;
          button.addEventListener('click', () => {
            if (chatInstance.handleUserMessage) {
              chatInstance.handleUserMessage(suggestion);
            }
          });
          suggestionsContainer.appendChild(button);
        });
      }
    }
    
    // 设置位置
    if (finalConfig.position) {
      const chatContainer = document.getElementById('chat-container');
      if (chatContainer) {
        chatContainer.className = chatContainer.className.replace(/position-\w+-\w+/, '');
        chatContainer.classList.add(`position-${finalConfig.position}`);
      }
    }
    
    // 设置主色调
    if (finalConfig.primaryColor) {
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --brand-primary: ${finalConfig.primaryColor};
        }
        .chat-primary-btn, .ai-send-btn {
          background-color: ${finalConfig.primaryColor} !important;
        }
        .chat-primary-btn:hover, .ai-send-btn:hover {
          background-color: ${adjustColor(finalConfig.primaryColor, -20)} !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    console.log('Gucci AI Assistant initialized successfully');
    return chatInstance;
  } catch (error) {
    console.error('Error initializing Gucci AI Assistant:', error);
    return null;
  }
}

// 辅助函数：调整颜色亮度
function adjustColor(color, amount) {
  let usePound = false;
  if (color[0] === "#") {
    color = color.slice(1);
    usePound = true;
  }
  
  const num = parseInt(color, 16);
  let r = (num >> 16) + amount;
  let g = (num >> 8 & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  
  return (usePound ? "#" : "") + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

// 全局暴露Gucci AI助手初始化函数
window.initGucciAIAssistant = initGucciAIAssistant;