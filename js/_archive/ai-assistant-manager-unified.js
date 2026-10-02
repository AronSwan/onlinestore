// AI Assistant Manager - 统一版本
// 统一品牌为Reich AI购物助手，简化初始化流程

// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：提供统一的AI助手管理功能，包括聊天界面、消息处理和通知管理
// 依赖文件：无

class AIAssistantManager {
  constructor(config = {}) {
    // 统一品牌配置
    this.initStrategy = config.initStrategy || "reich-assistant";
    this.brandName = config.brandName || "Reich AI购物助手";
    this.brandConfig = {
      name: this.brandName,
      welcomeMessage: config.welcomeMessage || "您好！欢迎来到Reich官方商城！我是您的专属AI购物助手，可以为您提供产品推荐、尺码建议、购买咨询等服务。请问有什么可以帮您的吗？",
      primaryColor: config.primaryColor || "#D4AF37", // 奢华金色
      secondaryColor: config.secondaryColor || "#1A1A1A", // 黑色
      accentColor: config.accentColor || "#800000", // 暗红色
      position: config.position || "bottom-right",
      autoOpen: config.autoOpen || false,
      // 通知控制配置
      notifications: {
        enabled: config.notifications?.enabled ?? true, // 默认启用通知
        level: config.notifications?.level || 'essential', // 'essential' | 'important' | 'all'
        showInitialization: config.notifications?.showInitialization ?? false, // 默认不显示初始化通知
        showSuccess: config.notifications?.showSuccess ?? false, // 默认不显示成功通知
        showInfo: config.notifications?.showInfo ?? false, // 默认不显示信息通知
        showErrors: config.notifications?.showErrors ?? true, // 默认显示错误通知
        showWarnings: config.notifications?.showWarnings ?? true // 默认显示警告通知
      },
      suggestions: [
        '查看最新系列',
        '推荐适合我的产品',
        '尺码建议',
        '查看促销活动'
      ],
      presetResponses: {
        '最新': '我们最新推出的"都市探索者"系列融合了经典与现代设计，采用意大利高级面料制作，每件产品都体现了Reich的精湛工艺。您可以在我们的精品店或官网浏览完整系列。',
        '推荐': '根据您的需求，我推荐我们的"经典系列"产品。这个系列融合了低调的设计与现代功能，适合各种场合使用。如果您能提供更多关于您的喜好和需求的信息，我可以给您更精准的推荐。',
        '尺码': '我们的产品提供多种尺码选择。为了确保您选择合适的尺码，建议您参考我们官网上的尺码指南，或到我们的实体店进行试穿。我们的专业销售人员也会为您提供专业的尺码建议。',
        '促销': '目前我们正在进行"夏日特惠"活动，精选商品享受8折优惠。此外，会员还可以享受额外的9折优惠。活动时间有限，欢迎您到店选购或访问我们的官网了解更多详情。'
      }
    };
    
    this.container = null;
    this.launcher = null;
    this.chatWindow = null;
    this.messagesContainer = null;
    this.inputField = null;
    this.sendButton = null;
    this.isOpen = false;
    this.isInitialized = false;
    
    // 多输入功能变量初始化
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordingStatus = null;
    
    // 会话管理
    this.sessionId = this.generateSessionId();
    this.messageHistory = [];
    this.maxHistoryLength = 50; // 最大历史消息数
    
    // 初始化
    this.init();
    
    // 加载历史记录
    this.loadMessageHistory();
  }
  
  // 生成会话ID
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  init() {
    
    console.log(`[${this.brandName}] 初始化中...`);
    
    try {
      // 只在配置允许时显示初始化开始通知
      if (this.brandConfig.notifications.showInitialization) {
        this.showNotification('正在初始化AI助手...', 'info', 2000);
      }
      
      // 应用样式
      this.applyStyle();
      
      // 创建容器
      this.createContainer();
      
      // 创建启动器
      this.createLauncher();
      
      // 创建聊天窗口
      this.createChatWindow();
      
      // 设置事件监听
      this.setupEventListeners();
      
      // 添加欢迎消息
      this.addWelcomeMessage();
      
      // 如果配置了自动打开，则显示聊天窗口
      if (this.brandConfig.autoOpen) {
        this.open();
      }
      
      this.isInitialized = true;
      
      // 只在配置允许时显示初始化完成通知
      if (this.brandConfig.notifications.showInitialization) {
        this.showNotification('AI助手初始化完成，欢迎使用！', 'success', 3000);
      }
      console.log(`[${this.brandName}] 初始化完成`);
    } catch (error) {
      console.error(`[${this.brandName}] 初始化失败:`, error);
      this.isInitialized = false;
      
      // 显示初始化失败通知（错误通知默认显示）
      this.showNotification('AI助手初始化失败，请刷新页面重试', 'error', 5000);
    }
  }
  
  showNotification(message, type = 'info', duration = 3000) {
    
    // 检查通知是否启用
    if (!this.brandConfig.notifications.enabled) {
      return;
    }
    
    // 根据通知类型和配置决定是否显示
    const shouldShow = this.shouldShowNotification(type);
    if (!shouldShow) {
      return;
    }
    
    // 检查容器和内部包装器是否存在
    if (!this.container || !this.innerWrapper) {
      console.warn('AI助手容器未初始化，无法显示通知');
      return;
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `ai-assistant-manager-notification ${type}`;
    notification.textContent = message;
    
    // 添加到AI助手容器内部包装器中
    this.innerWrapper.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }
  
  shouldShowNotification(type) {
    const config = this.brandConfig.notifications;
    
    // 根据通知级别过滤
    switch (config.level) {
      case 'essential':
        // 只显示错误和关键警告
        return type === 'error' || type === 'warning';
      case 'important':
        // 显示错误、警告和重要信息
        return type === 'error' || type === 'warning' || type === 'info';
      case 'all':
        // 显示所有通知
        return true;
      default:
        return true;
    }
    
    // 根据具体类型配置过滤
    switch (type) {
      case 'info':
        return config.showInfo;
      case 'success':
        return config.showSuccess;
      case 'error':
        return config.showErrors;
      case 'warning':
        return config.showWarnings;
      default:
        return true;
    }
  }
  
  applyStyle() {
    // 检查是否已添加样式
    if (document.getElementById('ai-assistant-manager-style')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'ai-assistant-manager-style';
    style.textContent = `
      /* AI Assistant Manager - 统一品牌样式 */
      .ai-assistant-manager-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        font-family: 'Arial', sans-serif;
      }
      
      .ai-assistant-manager-launcher {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${this.brandConfig.primaryColor};
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .ai-assistant-manager-launcher:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      
      .ai-assistant-manager-launcher::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .ai-assistant-manager-launcher:hover::before {
        opacity: 1;
      }
      
      .ai-assistant-manager-chat-window {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 350px;
        height: 500px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
        pointer-events: none;
      }
      
      .ai-assistant-manager-chat-window.show {
        opacity: 1;
        transform: translateY(0);
        pointer-events: all;
      }
      
      .ai-assistant-manager-header {
        background-color: ${this.brandConfig.primaryColor};
        color: white;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .ai-assistant-manager-header-actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      
      .ai-assistant-manager-history-btn {
        background: none;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        padding: 5px;
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }
      
      .ai-assistant-manager-history-btn:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      .ai-assistant-manager-brand {
        display: flex;
        align-items: center;
      }
      
      .ai-assistant-manager-logo {
        width: 30px;
        height: 30px;
        background-color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${this.brandConfig.primaryColor};
        font-weight: bold;
        margin-right: 10px;
      }
      
      .ai-assistant-manager-brand h3 {
        margin: 0;
        font-size: 16px;
      }
      
      .ai-assistant-manager-close-button {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ai-assistant-manager-body {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
      }
      
      .ai-assistant-manager-messages {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .ai-assistant-manager-message {
        max-width: 80%;
        padding: 10px 15px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .ai-assistant-manager-message.user {
        align-self: flex-end;
        background-color: ${this.brandConfig.primaryColor};
        color: white;
        border-bottom-right-radius: 5px;
      }
      
      .ai-assistant-manager-message.ai {
        align-self: flex-start;
        background-color: #f1f1f1;
        color: #333;
        border-bottom-left-radius: 5px;
      }
      
      .ai-assistant-manager-message.typing {
        align-self: flex-start;
        background-color: #f1f1f1;
        color: #999;
        font-style: italic;
        border-bottom-left-radius: 5px;
      }
      
      .ai-assistant-manager-message-timestamp {
        font-size: 11px;
        color: #999;
        margin-top: 4px;
        text-align: right;
      }
      
      .ai-assistant-manager-message.ai .ai-assistant-manager-message-timestamp {
        text-align: left;
      }
      
      /* 通知样式 - 就地显示 */
      .ai-assistant-manager-notification {
        position: absolute;
        top: 10px;
        right: 10px;
        left: 10px;
        padding: 8px 12px;
        border-radius: 6px;
        color: white;
        font-size: 12px;
        font-weight: 500;
        z-index: 10001;
        transform: translateY(-100%);
        opacity: 0;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        pointer-events: none;
      }
      
      .ai-assistant-manager-notification.show {
        transform: translateX(0);
        opacity: 1;
      }
      
      .ai-assistant-manager-notification.info {
        background: linear-gradient(135deg, #3498db, #2980b9);
      }
      
      .ai-assistant-manager-notification.success {
        background: linear-gradient(135deg, #27ae60, #229954);
      }
      
      .ai-assistant-manager-notification.warning {
        background: linear-gradient(135deg, #f39c12, #e67e22);
      }
      
      .ai-assistant-manager-notification.error {
        background: linear-gradient(135deg, #e74c3c, #c0392b);
      }
      
      /* 历史记录管理模态框 */
      .ai-assistant-manager-history-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20000;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      
      .ai-assistant-manager-history-modal.show {
        opacity: 1;
        pointer-events: all;
      }
      
      .ai-assistant-manager-history-modal-content {
        background-color: white;
        border-radius: 10px;
        width: 400px;
        max-width: 90vw;
        max-height: 80vh;
        overflow: auto;
        transform: translateY(-20px);
        transition: transform 0.3s ease;
      }
      
      .ai-assistant-manager-history-modal.show .ai-assistant-manager-history-modal-content {
        transform: translateY(0);
      }
      
      .ai-assistant-manager-history-modal-header {
        background-color: ${this.brandConfig.primaryColor};
        color: white;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 10px 10px 0 0;
      }
      
      .ai-assistant-manager-history-modal-header h3 {
        margin: 0;
        font-size: 16px;
      }
      
      .ai-assistant-manager-history-modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s ease;
      }
      
      .ai-assistant-manager-history-modal-close:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      .ai-assistant-manager-history-modal-body {
        padding: 20px;
      }
      
      .ai-assistant-manager-history-stats {
        margin-bottom: 20px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid ${this.brandConfig.primaryColor};
      }
      
      .ai-assistant-manager-history-stats p {
        margin: 5px 0;
        font-size: 14px;
        color: #666;
      }
      
      .ai-assistant-manager-history-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .ai-assistant-manager-history-new-session-btn,
      .ai-assistant-manager-history-export-btn,
      .ai-assistant-manager-history-clear-btn,
      .ai-assistant-manager-history-close-btn {
        padding: 10px 15px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
      }
      
      .ai-assistant-manager-history-new-session-btn {
        background-color: #007bff;
        color: white;
      }
      
      .ai-assistant-manager-history-new-session-btn:hover {
        background-color: #0056b3;
      }
      
      .ai-assistant-manager-history-export-btn {
        background-color: ${this.brandConfig.primaryColor};
        color: white;
      }
      
      .ai-assistant-manager-history-export-btn:hover {
        background-color: ${this.brandConfig.accentColor};
      }
      
      .ai-assistant-manager-history-clear-btn {
        background-color: #dc3545;
        color: white;
      }
      
      .ai-assistant-manager-history-clear-btn:hover {
        background-color: #c82333;
      }
      
      .ai-assistant-manager-history-close-btn {
        background-color: #6c757d;
        color: white;
      }
      
      .ai-assistant-manager-history-close-btn:hover {
        background-color: #5a6268;
      }
      
      .ai-assistant-manager-footer {
        padding: 15px;
        border-top: 1px solid #eee;
      }
      
      /* 多输入功能按钮区域样式 */
      .ai-assistant-manager-input-buttons {
        display: flex;
        gap: 5px;
        margin-bottom: 10px;
      }
      
      .ai-assistant-manager-input-button {
        background-color: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        min-height: 32px;
      }
      
      .ai-assistant-manager-input-button:hover {
        background-color: #555;
        transform: translateY(-1px);
      }
      
      .ai-assistant-manager-input-button:active {
        transform: translateY(0);
      }
      
      .ai-assistant-manager-input-button.upload {
        background-color: #4CAF50;
        border-color: #45a049;
      }
      
      .ai-assistant-manager-input-button.upload:hover {
        background-color: #45a049;
      }
      
      .ai-assistant-manager-input-button.voice {
        background-color: #2196F3;
        border-color: #0b7dda;
      }
      
      .ai-assistant-manager-input-button.voice:hover {
        background-color: #0b7dda;
      }
      
      .ai-assistant-manager-input-button.voice.recording {
        background-color: #f44336;
        border-color: #d32f2f;
        animation: pulse 1.5s infinite;
      }
      
      .ai-assistant-manager-input-button.voice.recording::after {
        content: '● 录音中';
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
      }
      
      .ai-assistant-manager-input-button.call {
        background-color: #9C27B0;
        border-color: #7b1fa2;
      }
      
      .ai-assistant-manager-input-button.call:hover {
        background-color: #7b1fa2;
      }
      
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
      
      .ai-assistant-manager-input-container {
        display: flex;
        margin-bottom: 10px;
      }
      
      .ai-assistant-manager-input {
        flex: 1;
        padding: 10px 15px;
        border: 1px solid #ddd;
        border-radius: 20px;
        outline: none;
        font-size: 14px;
      }
      
      .ai-assistant-manager-input:focus {
        border-color: ${this.brandConfig.primaryColor};
      }
      
      .ai-assistant-manager-send-button {
        background-color: ${this.brandConfig.primaryColor};
        color: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        margin-left: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s ease;
      }
      
      .ai-assistant-manager-send-button:hover {
        background-color: ${this.brandConfig.accentColor};
      }
      
      /* 语音录制状态显示 */
      #voice-recording-status {
        color: ${this.brandConfig.primaryColor};
        font-size: 12px;
        text-align: center;
        margin-top: 5px;
        display: none;
      }
      
      #voice-recording-status.recording {
        display: block;
        animation: blink 1s infinite;
      }
      
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }
      
      .ai-assistant-manager-powered-by {
        text-align: center;
        font-size: 12px;
        color: #999;
      }
      
      .ai-assistant-manager-powered-by span {
        color: ${this.brandConfig.primaryColor};
        font-weight: bold;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .ai-assistant-manager-container {
          bottom: 15px;
          right: 15px;
        }
        
        .ai-assistant-manager-launcher {
          width: 50px;
          height: 50px;
        }
        
        .ai-assistant-manager-chat-window {
          width: calc(100vw - 30px);
          height: 70vh;
          right: -15px;
        }
        
        .ai-assistant-manager-input-buttons {
          justify-content: center;
        }
        
        .ai-assistant-manager-input-button {
          min-width: 28px;
          min-height: 28px;
          font-size: 12px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  createContainer() {
    // 作者：AI助手
    // 时间：2025-01-26 16:15:00
    // 用途：创建AI助手容器，支持就地通知显示
    // 依赖文件：无
    
    // 检查是否已存在容器
    if (document.getElementById('ai-assistant-manager-container')) {
      this.container = document.getElementById('ai-assistant-manager-container');
      return;
    }
    
    // 创建主容器
    this.container = document.createElement('div');
    this.container.id = 'ai-assistant-manager-container';
    this.container.className = 'ai-assistant-manager-container';
    
    // 创建内部包装器，用于支持相对定位的通知
    this.innerWrapper = document.createElement('div');
    this.innerWrapper.className = 'ai-assistant-manager-inner-wrapper';
    this.innerWrapper.style.position = 'relative';
    
    this.container.appendChild(this.innerWrapper);
    document.body.appendChild(this.container);
  }
  
  createLauncher() {
    // 检查是否已存在启动器
    if (document.getElementById('ai-assistant-manager-launcher')) {
      this.launcher = document.getElementById('ai-assistant-manager-launcher');
      return;
    }
    
    this.launcher = document.createElement('div');
    this.launcher.id = 'ai-assistant-manager-launcher';
    this.launcher.className = 'ai-assistant-manager-launcher';
    
    // 添加Reich标志
    const logo = document.createElement('div');
    logo.style.width = '30px';
    logo.style.height = '30px';
    logo.style.backgroundColor = this.brandConfig.secondaryColor;
    logo.style.borderRadius = '50%';
    logo.style.display = 'flex';
    logo.style.alignItems = 'center';
    logo.style.justifyContent = 'center';
    logo.style.color = this.brandConfig.primaryColor;
    logo.style.fontWeight = 'bold';
    logo.style.fontSize = '16px';
    logo.textContent = 'R';
    
    // 添加标签
    const label = document.createElement('div');
    label.textContent = 'Reich AI';
    label.style.color = this.brandConfig.secondaryColor;
    label.style.fontSize = '10px';
    label.style.fontWeight = 'bold';
    label.style.marginTop = '2px';
    label.style.maxWidth = '80px';
    label.style.textAlign = 'center';
    label.style.overflow = 'hidden';
    label.style.textOverflow = 'ellipsis';
    label.style.whiteSpace = 'nowrap';
    
    this.launcher.appendChild(logo);
    this.launcher.appendChild(label);
    this.innerWrapper.appendChild(this.launcher);
  }
  
  createChatWindow() {
    // 检查是否已存在聊天窗口
    if (document.getElementById('ai-assistant-manager-chat-window')) {
      this.chatWindow = document.getElementById('ai-assistant-manager-chat-window');
      this.messagesContainer = this.chatWindow.querySelector('.ai-assistant-manager-messages');
      this.inputField = this.chatWindow.querySelector('.ai-assistant-manager-input');
      this.sendButton = this.chatWindow.querySelector('.ai-assistant-manager-send-button');
      return;
    }
    
    this.chatWindow = document.createElement('div');
    this.chatWindow.id = 'ai-assistant-manager-chat-window';
    this.chatWindow.className = 'ai-assistant-manager-chat-window';
    
    // 创建头部
    const header = document.createElement('div');
    header.className = 'ai-assistant-manager-header';
    
    const brand = document.createElement('div');
    brand.className = 'ai-assistant-manager-brand';
    
    const logo = document.createElement('div');
    logo.className = 'ai-assistant-manager-logo';
    logo.textContent = 'R';
    
    const title = document.createElement('h3');
    title.textContent = this.brandConfig.name;
    
    brand.appendChild(logo);
    brand.appendChild(title);
    
    // 创建头部操作区域
    const headerActions = document.createElement('div');
    headerActions.className = 'ai-assistant-manager-header-actions';
    
    const historyButton = document.createElement('button');
    historyButton.className = 'ai-assistant-manager-history-btn';
    historyButton.title = '历史记录管理';
    historyButton.innerHTML = '📋';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'ai-assistant-manager-close-button';
    closeButton.innerHTML = '&ndash;';
    
    headerActions.appendChild(historyButton);
    headerActions.appendChild(closeButton);
    
    header.appendChild(brand);
    header.appendChild(headerActions);
    
    // 创建主体
    const body = document.createElement('div');
    body.className = 'ai-assistant-manager-body';
    
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'ai-assistant-manager-messages';
    
    body.appendChild(this.messagesContainer);
    
    // 创建底部
    const footer = document.createElement('div');
    footer.className = 'ai-assistant-manager-footer';
    
    // 创建输入按钮区域
    const inputButtons = document.createElement('div');
    inputButtons.className = 'ai-assistant-manager-input-buttons';
    
    // 文件上传按钮
    const fileButton = document.createElement('button');
    fileButton.innerHTML = '<i class="fas fa-paperclip"></i>';
    fileButton.className = 'ai-assistant-manager-input-button upload';
    fileButton.title = '上传文件';
    fileButton.onclick = () => this.handleFileUpload();
    
    // 语音输入按钮
    const voiceButton = document.createElement('button');
    voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceButton.className = 'ai-assistant-manager-input-button voice';
    voiceButton.title = '语音输入';
    voiceButton.onclick = () => this.toggleVoiceRecording();
    
    // 语音电话按钮
    const callButton = document.createElement('button');
    callButton.innerHTML = '<i class="fas fa-phone"></i>';
    callButton.className = 'ai-assistant-manager-input-button call';
    callButton.title = '语音电话';
    callButton.onclick = () => this.initiateVoiceCall();
    
    inputButtons.appendChild(fileButton);
    inputButtons.appendChild(voiceButton);
    inputButtons.appendChild(callButton);
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'ai-assistant-manager-input-container';
    
    this.inputField = document.createElement('input');
    this.inputField.type = 'text';
    this.inputField.className = 'ai-assistant-manager-input';
    this.inputField.placeholder = '输入您的问题...';
    
    this.sendButton = document.createElement('button');
    this.sendButton.className = 'ai-assistant-manager-send-button';
    this.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
    
    inputContainer.appendChild(this.inputField);
    inputContainer.appendChild(this.sendButton);
    
    // 语音录制状态显示
    this.recordingStatus = document.createElement('div');
    this.recordingStatus.id = 'voice-recording-status';
    this.recordingStatus.innerHTML = '<i class="fas fa-circle"></i> 正在录音...';
    
    const poweredBy = document.createElement('div');
    poweredBy.className = 'ai-assistant-manager-powered-by';
    poweredBy.innerHTML = '<span>Powered by Reich AI</span>';
    
    footer.appendChild(inputButtons);
    footer.appendChild(inputContainer);
    footer.appendChild(this.recordingStatus);
    footer.appendChild(poweredBy);
    
    // 组装聊天窗口
    this.chatWindow.appendChild(header);
    this.chatWindow.appendChild(body);
    this.chatWindow.appendChild(footer);
    
    this.innerWrapper.appendChild(this.chatWindow);
    
    // 初始化语音录制相关变量
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
  
  setupEventListeners() {
    // 启动器点击事件
    this.launcher.addEventListener('click', () => {
      this.toggle();
    });
    
    // 关闭按钮点击事件
    const closeButton = this.chatWindow.querySelector('.ai-assistant-manager-close-button');
    closeButton.addEventListener('click', () => {
      this.close();
    });
    
    // 发送按钮点击事件
    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });
    
    // 输入框回车事件
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
    
    // 历史记录管理按钮事件
    const historyButton = this.chatWindow.querySelector('.ai-assistant-manager-history-btn');
    historyButton.addEventListener('click', () => this.showHistoryManagement());
    
    // 文件上传按钮点击事件
    const uploadButton = this.chatWindow.querySelector('.input-button.upload');
    if (uploadButton) {
      uploadButton.addEventListener('click', () => {
        this.handleFileUpload();
      });
    }
    
    // 语音输入按钮点击事件
    const voiceButton = this.chatWindow.querySelector('.input-button.voice');
    if (voiceButton) {
      voiceButton.addEventListener('click', () => {
        this.toggleVoiceRecording();
      });
    }
    
    // 语音电话按钮点击事件
    const callButton = this.chatWindow.querySelector('.input-button.call');
    if (callButton) {
      callButton.addEventListener('click', () => {
        this.initiateVoiceCall();
      });
    }
  }
  
  addWelcomeMessage() {
    const messageElement = document.createElement('div');
    messageElement.className = 'ai-assistant-manager-message ai';
    messageElement.textContent = this.brandConfig.welcomeMessage;
    this.messagesContainer.appendChild(messageElement);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
  
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  open() {
    this.chatWindow.classList.add('show');
    this.isOpen = true;
  }
  
  close() {
    this.chatWindow.classList.remove('show');
    this.isOpen = false;
  }
  
  sendMessage() {
    const message = this.inputField.value.trim();
    
    // 输入验证
    if (!message) {
      this.showNotification('请输入消息', 'warning');
      return;
    }
    
    if (message.length > 500) {
      this.showNotification('消息长度不能超过500字符', 'warning');
      return;
    }
    
    // 添加用户消息
    this.addMessage(message, 'user');
    
    // 清空输入框
    this.inputField.value = '';
    
    // 禁用发送按钮
    this.sendButton.disabled = true;
    this.sendButton.textContent = '发送中...';
    
    // 模拟AI回复
    this.simulateResponse(message);
  }
  
  addMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.className = `ai-assistant-manager-message ${sender}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'ai-assistant-manager-message-content';
    messageContent.textContent = message;
    
    // 添加时间戳
    const timestamp = document.createElement('div');
    timestamp.className = 'ai-assistant-manager-message-timestamp';
    timestamp.textContent = this.getCurrentTime();
    
    messageElement.appendChild(messageContent);
    messageElement.appendChild(timestamp);
    this.messagesContainer.appendChild(messageElement);
    
    // 添加到消息历史记录
    this.addToMessageHistory(message, sender);
    
    // 滚动到底部
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
  
  // 添加到消息历史记录
  addToMessageHistory(message, sender) {
    const messageRecord = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      content: message,
      sender: sender,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };
    
    this.messageHistory.push(messageRecord);
    
    // 限制历史记录长度
    if (this.messageHistory.length > this.maxHistoryLength) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistoryLength);
    }
    
    // 保存到本地存储（可选）
    this.saveMessageHistory();
  }
  
  // 保存消息历史到本地存储
  saveMessageHistory() {
    try {
      const historyData = {
        sessionId: this.sessionId,
        messages: this.messageHistory,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('reich-ai-assistant-history', JSON.stringify(historyData));
    } catch (error) {
      console.warn('无法保存消息历史:', error);
    }
  }
  
  // 从本地存储加载消息历史
  loadMessageHistory() {
    try {
      const savedData = localStorage.getItem('reich-ai-assistant-history');
      if (savedData) {
        const historyData = JSON.parse(savedData);
        
        // 检查是否是当前会话的历史记录
        if (historyData.sessionId === this.sessionId) {
          this.messageHistory = historyData.messages || [];
          
          // 重新渲染历史消息
          this.renderMessageHistory();
        }
      }
    } catch (error) {
      console.warn('无法加载消息历史:', error);
    }
  }
  
  // 渲染消息历史
  renderMessageHistory() {
    // 清空当前消息容器
    this.messagesContainer.innerHTML = '';
    
    // 重新添加所有历史消息
    this.messageHistory.forEach(message => {
      this.addMessageToContainer(message.content, message.sender, message.timestamp);
    });
  }
  
  // 添加消息到容器（不记录历史）
  addMessageToContainer(message, sender, timestamp) {
    const messageElement = document.createElement('div');
    messageElement.className = `ai-assistant-manager-message ${sender}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'ai-assistant-manager-message-content';
    messageContent.textContent = message;
    
    const timeElement = document.createElement('div');
    timeElement.className = 'ai-assistant-manager-message-timestamp';
    timeElement.textContent = this.formatTimestamp(timestamp);
    
    messageElement.appendChild(messageContent);
    messageElement.appendChild(timeElement);
    this.messagesContainer.appendChild(messageElement);
  }
  
  // 格式化时间戳
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 显示历史记录管理界面
  showHistoryManagement() {
    // 创建历史记录管理模态框
    const modal = document.createElement('div');
    modal.className = 'ai-assistant-manager-history-modal';
    modal.innerHTML = `
      <div class="ai-assistant-manager-history-modal-content">
        <div class="ai-assistant-manager-history-modal-header">
          <h3>历史记录管理</h3>
          <button class="ai-assistant-manager-history-modal-close">&ndash;</button>
        </div>
        <div class="ai-assistant-manager-history-modal-body">
          <div class="ai-assistant-manager-history-stats">
            <p>当前会话: ${this.sessionId}</p>
            <p>消息总数: ${this.messageHistory.length}</p>
            <p>存储状态: ${this.messageHistory.length > 0 ? '已保存' : '无记录'}</p>
          </div>
          <div class="ai-assistant-manager-history-actions">
            <button class="ai-assistant-manager-history-new-session-btn">开始新会话</button>
            <button class="ai-assistant-manager-history-export-btn">导出历史记录</button>
            <button class="ai-assistant-manager-history-clear-btn">清空历史记录</button>
            <button class="ai-assistant-manager-history-close-btn">关闭</button>
          </div>
        </div>
      </div>
    `;
    
    // 添加到页面
    document.body.appendChild(modal);
    
    // 显示模态框
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
    
    // 绑定事件
    const closeBtn = modal.querySelector('.ai-assistant-manager-history-modal-close');
    const newSessionBtn = modal.querySelector('.ai-assistant-manager-history-new-session-btn');
    const exportBtn = modal.querySelector('.ai-assistant-manager-history-export-btn');
    const clearBtn = modal.querySelector('.ai-assistant-manager-history-clear-btn');
    const closeActionBtn = modal.querySelector('.ai-assistant-manager-history-close-btn');
    
    // 作者：AI助手
    // 时间：2025-01-26 16:30:00
    // 用途：修复关闭操作需要两次点击的问题
    // 依赖文件：无
    let isClosing = false; // 防止重复关闭的标志
    
    const closeModal = () => {
      // 如果已经在关闭过程中，直接返回
      if (isClosing) return;
      
      isClosing = true;
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        isClosing = false; // 重置关闭状态
      }, 300);
    };
    
    // 使用事件捕获阶段绑定，防止事件冒泡导致重复触发
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      closeModal();
    }, true);
    
    closeActionBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      closeModal();
    }, true);
    
    newSessionBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      if (confirm('确定要开始新会话吗？当前会话将被存档。')) {
        this.startNewSession();
        closeModal();
      }
    }, true);
    
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      this.exportMessageHistory();
      closeModal();
    }, true);
    
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      if (confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
        this.clearMessageHistory();
        closeModal();
      }
    }, true);
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
  
  // 开始新会话
  startNewSession() {
    // 作者：AI助手
    // 时间：2025-01-26 15:53:00
    // 用途：开始新的AI助手会话
    // 依赖文件：无
    
    const oldSessionId = this.sessionId;
    this.sessionId = this.generateSessionId();
    this.messageHistory = [];
    this.messagesContainer.innerHTML = '';
    
    // 保存旧会话到存档
    this.archiveSession(oldSessionId);
    
    // 添加欢迎消息
    this.addWelcomeMessage();
    
    // 显示新会话通知
    this.showNotification('新会话已开始，欢迎继续咨询！', 'success', 3000);
    
    // 记录会话开始时间
    console.log(`新会话开始: ${this.sessionId}`);
  }
  
  // 存档会话
  archiveSession(sessionId) {
    // 作者：AI助手
    // 时间：2025-01-26 15:54:00
    // 用途：将当前会话存档到本地存储
    // 依赖文件：无
    
    if (this.messageHistory.length === 0) {
      console.log('没有消息需要存档');
      return;
    }
    
    try {
      const archiveData = {
        sessionId: sessionId,
        messages: this.messageHistory,
        archivedAt: new Date().toISOString(),
        messageCount: this.messageHistory.length
      };
      
      const archiveKey = `reich-ai-assistant-archive-${sessionId}`;
      localStorage.setItem(archiveKey, JSON.stringify(archiveData));
      
      // 显示存档成功通知
      this.showNotification(`会话已存档，共${this.messageHistory.length}条消息`, 'success', 3000);
      
      // 清理过期的存档（保留最近10个会话）
      this.cleanupOldArchives();
      
      console.log(`会话存档成功: ${sessionId}, 消息数: ${this.messageHistory.length}`);
    } catch (error) {
      console.warn('无法存档会话:', error);
      this.showNotification('会话存档失败，请检查存储空间', 'error', 4000);
    }
  }
  
  // 清理过期的存档
  cleanupOldArchives() {
    // 作者：AI助手
    // 时间：2025-01-26 15:55:00
    // 用途：清理过期的会话存档，保留最近10个
    // 依赖文件：无
    
    try {
      const archiveKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('reich-ai-assistant-archive-')
      );
      
      if (archiveKeys.length > 10) {
        // 按时间排序，删除最旧的
        const archives = archiveKeys.map(key => ({
          key,
          timestamp: new Date(JSON.parse(localStorage.getItem(key)).archivedAt)
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        const toDelete = archives.slice(0, archives.length - 10);
        const deletedCount = toDelete.length;
        
        toDelete.forEach(archive => {
          localStorage.removeItem(archive.key);
        });
        
        // 显示清理通知
        if (deletedCount > 0) {
          this.showNotification(`已清理${deletedCount}个过期会话存档`, 'info', 3000);
          console.log(`清理了${deletedCount}个过期存档`);
        }
      }
    } catch (error) {
      console.warn('清理存档失败:', error);
      this.showNotification('清理存档时发生错误', 'warning', 3000);
    }
  }
  
  // 清空消息历史记录
  clearMessageHistory() {
    this.messageHistory = [];
    this.messagesContainer.innerHTML = '';
    
    // 从本地存储中删除
    try {
      localStorage.removeItem('reich-ai-assistant-history');
      this.showNotification('历史记录已清空', 'success');
    } catch (error) {
      console.warn('无法清空历史记录:', error);
      this.showNotification('清空历史记录失败', 'error');
    }
  }
  
  // 导出消息历史记录
  exportMessageHistory() {
    if (this.messageHistory.length === 0) {
      this.showNotification('没有可导出的历史记录', 'warning');
      return;
    }
    
    try {
      const exportData = {
        sessionId: this.sessionId,
        messages: this.messageHistory,
        exportTime: new Date().toISOString(),
        totalMessages: this.messageHistory.length
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reich-ai-assistant-history-${this.sessionId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showNotification('历史记录导出成功', 'success');
    } catch (error) {
      console.error('导出历史记录失败:', error);
      this.showNotification('导出历史记录失败', 'error');
    }
  }
  
  getCurrentTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
  
  simulateResponse(userMessage) {
    // 显示输入状态
    const typingElement = document.createElement('div');
    typingElement.className = 'ai-assistant-manager-message ai typing';
    typingElement.textContent = 'AI助手正在输入...';
    this.messagesContainer.appendChild(typingElement);
    
    // 滚动到底部
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    
    // 模拟AI思考时间
    setTimeout(() => {
      // 移除输入状态
      typingElement.remove();
      
      // 生成回复
      let response = '';
      
      // 检查预设回复
      for (const [keyword, presetResponse] of Object.entries(this.brandConfig.presetResponses)) {
        if (userMessage.includes(keyword)) {
          response = presetResponse;
          break;
        }
      }
      
      // 如果没有匹配的预设回复，使用默认回复
      if (!response) {
        response = '感谢您的咨询。我们的产品均采用意大利奢华工艺制作，每件产品都体现了Reich的品质精髓和创新设计。如果您有更多具体问题，欢迎随时咨询，或拨打我们的客服热线：400-888-1234。';
      }
      
      // 添加AI回复
      this.addMessage(response, 'ai');
      
      // 恢复发送按钮状态
      if (this.sendButton) {
        this.sendButton.disabled = false;
        this.sendButton.textContent = '发送';
      }
    }, 2000);
  }
  
  // 显示用户引导
  showUserGuide() {
    if (!this.isInitialized) return;
    
    // 检查是否已显示过引导
    if (localStorage.getItem('ai-assistant-manager-guide-shown')) {
      return;
    }
    
    // 创建引导提示
    const guide = document.createElement('div');
    guide.id = 'ai-assistant-manager-guide';
    guide.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 250px;
      z-index: 10001;
    `;
    
    guide.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <div style="width: 24px; height: 24px; background: ${this.brandConfig.primaryColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 10px;">R</div>
        <h4 style="margin: 0; color: ${this.brandConfig.secondaryColor};">${this.brandConfig.name}</h4>
      </div>
      <p style="margin: 0; font-size: 14px; color: #333;">点击右下角的按钮，开始您的购物咨询体验！</p>
      <button id="ai-assistant-guide-close" style="background: none; border: none; color: ${this.brandConfig.primaryColor}; cursor: pointer; margin-top: 10px; padding: 0; font-size: 14px;">知道了</button>
    `;
    
    document.body.appendChild(guide);
    
    // 关闭按钮事件
    document.getElementById('ai-assistant-guide-close').addEventListener('click', () => {
      guide.remove();
      localStorage.setItem('ai-assistant-manager-guide-shown', 'true');
    });
    
    // 5秒后自动关闭
    setTimeout(() => {
      if (document.getElementById('ai-assistant-manager-guide')) {
        guide.remove();
        localStorage.setItem('ai-assistant-manager-guide-shown', 'true');
      }
    }, 5000);
  }
  

  
  // 销毁助手
  destroy() {
    if (this.container) {
      this.container.remove();
    }
    
    const style = document.getElementById('ai-assistant-manager-style');
    if (style) {
      style.remove();
    }
    
    const guide = document.getElementById('ai-assistant-manager-guide');
    if (guide) {
      guide.remove();
    }
    
    const notificationContainer = document.getElementById('ai-assistant-notification-container');
    if (notificationContainer) {
      notificationContainer.remove();
    }
    
    this.isInitialized = false;
    console.log(`[${this.brandName}] 已销毁`);
  }
  
  // 文件上传处理函数
  handleFileUpload() {
    // 作者：AI助手
    // 时间：2025-01-26 15:47:00
    // 用途：处理文件上传功能
    // 依赖文件：无
    
    // 创建文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt';
    fileInput.style.display = 'none';
    
    fileInput.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        // 检查文件大小（限制为10MB）
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          this.showNotification(`文件过大，请选择小于10MB的文件`, 'error', 4000);
          document.body.removeChild(fileInput);
          return;
        }
        
        // 检查文件类型
        const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/'];
        const isValidType = allowedTypes.some(type => file.type.startsWith(type));
        
        if (!isValidType) {
          this.showNotification(`不支持的文件类型: ${file.type}`, 'warning', 4000);
          document.body.removeChild(fileInput);
          return;
        }
        
        // 显示上传成功通知
        this.showNotification(`文件上传成功: ${file.name}`, 'success', 3000);
        
        // 显示文件信息
        const fileInfo = `📎 已上传: ${file.name} (${this.formatFileSize(file.size)})`;
        this.addMessage(fileInfo, 'user');
        
        // 模拟AI处理文件
        this.simulateFileResponse(file);
      } else {
        this.showNotification('文件选择已取消', 'info', 2000);
      }
      
      // 清理文件输入
      document.body.removeChild(fileInput);
    };
    
    // 触发文件选择
    document.body.appendChild(fileInput);
    fileInput.click();
  }
  
  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // 模拟文件处理回复
  simulateFileResponse(file) {
    // 显示输入状态
    const typingElement = document.createElement('div');
    typingElement.className = 'ai-assistant-manager-message ai typing';
    typingElement.textContent = '正在分析文件...';
    this.messagesContainer.appendChild(typingElement);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    
    // 根据文件类型生成不同的回复
    setTimeout(() => {
      typingElement.remove();
      
      let response = '';
      const fileType = file.type || '';
      
      if (fileType.startsWith('image/')) {
        response = '感谢您分享图片！我们的AI系统正在分析这张图片。如果您需要产品推荐或搭配建议，请告诉我您的具体需求。';
      } else if (fileType.startsWith('video/')) {
        response = '视频文件已收到！如果您需要产品演示或使用指导，我们的专家团队可以为您提供帮助。';
      } else if (fileType.includes('pdf') || fileType.includes('document')) {
        response = '文档已收到！如果您需要了解产品规格、使用说明或订购信息，我可以为您提供详细的帮助。';
      } else {
        response = '文件已成功上传！请问您需要我如何帮助您处理这个文件？';
      }
      
      this.addMessage(response, 'ai');
    }, 2000);
  }
  
  // 语音录制功能
  toggleVoiceRecording() {
    // 作者：AI助手
    // 时间：2025-01-26 15:49:00
    // 用途：切换语音录制状态
    // 依赖文件：无
    
    if (this.isRecording) {
      this.stopVoiceRecording();
    } else {
      this.startVoiceRecording();
    }
  }
  
  // 开始语音录制
  async startVoiceRecording() {
    // 作者：AI助手
    // 时间：2025-01-26 15:50:00
    // 用途：开始语音录制
    // 依赖文件：无
    
    try {
      // 显示录制准备通知
      this.showNotification('正在请求麦克风权限...', 'info', 2000);
      
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 创建媒体录制器
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.handleVoiceMessage(audioBlob);
        
        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop());
        
        // 恢复按钮状态
        this.updateVoiceButtonState(false);
        
        // 显示录制完成通知
        this.showNotification('语音录制完成，正在处理...', 'success', 3000);
      };
      
      // 开始录制
      this.mediaRecorder.start();
      this.isRecording = true;
      
      // 更新按钮状态
      this.updateVoiceButtonState(true);
      
      // 显示录制状态
      this.recordingStatus.style.display = 'block';
      
      // 显示录制开始通知
      this.showNotification('语音录制已开始，请开始说话...', 'success', 3000);
      
      console.log('语音录制已开始');
      
    } catch (error) {
      console.error('无法访问麦克风:', error);
      this.addMessage('❌ 无法访问麦克风，请检查权限设置', 'ai');
      this.showNotification('麦克风权限被拒绝，请检查浏览器设置', 'error', 5000);
    }
  }
  
  // 更新语音按钮状态
  updateVoiceButtonState(isRecording) {
    const voiceButton = this.chatWindow.querySelector('.ai-assistant-manager-input-button.voice');
    if (voiceButton) {
      if (isRecording) {
        voiceButton.classList.add('recording');
        voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
        voiceButton.title = '停止录音';
      } else {
        voiceButton.classList.remove('recording');
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceButton.title = '语音输入';
      }
    }
  }
  
  // 停止语音录制
  stopVoiceRecording() {
    // 作者：AI助手
    // 时间：2025-01-26 15:51:00
    // 用途：停止语音录制
    // 依赖文件：无
    
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.recordingStatus.style.display = 'none';
      
      // 显示停止录制通知
      this.showNotification('语音录制已停止', 'info', 2000);
      
      console.log('语音录制已停止');
    } else {
      this.showNotification('当前没有正在进行的录制', 'warning', 2000);
    }
  }
  
  // 处理语音消息
  handleVoiceMessage(audioBlob) {
    // 显示语音消息
    const voiceMessage = '🎤 语音消息';
    this.addMessage(voiceMessage, 'user');
    
    // 模拟语音识别和处理
    this.simulateVoiceResponse();
  }
  
  // 模拟语音回复
  simulateVoiceResponse() {
    const typingElement = document.createElement('div');
    typingElement.className = 'ai-assistant-manager-message ai typing';
    typingElement.textContent = '正在处理语音消息...';
    this.messagesContainer.appendChild(typingElement);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    
    setTimeout(() => {
      typingElement.remove();
      
      const responses = [
        '感谢您的语音消息！我理解您需要产品推荐，让我为您介绍我们的最新系列。',
        '语音消息已收到！根据您的声音，我建议您考虑我们的舒适系列产品。',
        '您的语音咨询已处理完毕。请问您是否需要更详细的产品信息？',
        '语音识别完成！我可以为您提供个性化的购物建议。'
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      this.addMessage(randomResponse, 'ai');
    }, 1500);
  }
  
  // 语音电话功能
  initiateVoiceCall() {
    // 作者：AI助手
    // 时间：2025-01-26 15:52:00
    // 用途：发起语音电话呼叫
    // 依赖文件：无
    
    // 显示呼叫状态
    const callMessage = '📞 正在呼叫客服专员...';
    this.addMessage(callMessage, 'user');
    
    // 显示呼叫通知
    this.showNotification('正在呼叫客服专员，请稍候...', 'info', 3000);
    
    // 模拟电话接通
    setTimeout(() => {
      const response = '✅ 电话已接通！我们的客服专员将为您提供一对一的服务。如需结束通话，请点击挂断按钮。';
      this.addMessage(response, 'ai');
      
      // 显示接通通知
      this.showNotification('电话已接通，客服专员正在为您服务', 'success', 5000);
      
      // 这里可以添加实际的电话功能集成
      console.log('语音电话功能已触发');
      
    }, 2000);
  }
 }

// 统一初始化函数
function initReichAIAssistant(config = {}) {
  console.log('Initializing Reich AI Assistant with config:', config);
  
  try {
    // 创建或获取AIAssistantManager实例
    let assistantInstance;
    
    // 如果已有全局实例，则使用它
    if (window.reichAIAssistant) {
      assistantInstance = window.reichAIAssistant;
      console.log('Using existing Reich AI Assistant instance');
    } else {
      // 否则创建新实例
      assistantInstance = new AIAssistantManager(config);
      window.reichAIAssistant = assistantInstance;
      console.log('Created new Reich AI Assistant instance');
    }
    
    // 显示用户引导（如果是第一次访问）
    if (assistantInstance.isInitialized) {
      assistantInstance.showUserGuide();
    }
    
    console.log('Reich AI Assistant initialized successfully');
    return assistantInstance;
  } catch (error) {
    console.error('Failed to initialize Reich AI Assistant:', error);
    return null;
  }
}

// 向后兼容的旧函数
function initAIAssistantManager(config = {}) {
  return initReichAIAssistant(config);
}

// 全局语音控制函数
function toggleVoiceControl() {
  if (window.reichAIAssistant && window.reichAIAssistant.isInitialized) {
    // 这里可以添加语音控制逻辑
    console.log('Voice control toggled for Reich AI Assistant');
    return true;
  }
  return false;
}

// 全局暴露
window.AIAssistantManager = AIAssistantManager;
window.initReichAIAssistant = initReichAIAssistant;
window.initAIAssistantManager = initAIAssistantManager;
window.toggleVoiceControl = toggleVoiceControl;

// 自动初始化
document.addEventListener('DOMContentLoaded', function() {
  // 延迟初始化，确保所有资源加载完成
  setTimeout(() => {
    initReichAIAssistant();
  }, 1000);
});