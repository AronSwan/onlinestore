// NextChat Advanced - 统一版本
// 统一品牌为Reich AI购物助手，简化初始化流程

// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：提供统一的AI聊天界面，集成Reich AI购物助手功能，用于电商网站智能客服
// 依赖文件：无

class NextChatAdvanced {
  constructor(config = {}) {
    // 统一品牌配置
    this.brandName = config.brandName || "Reich AI购物助手";
    this.brandConfig = {
      name: this.brandName,
      welcomeMessage: config.welcomeMessage || "您好！欢迎来到Reich官方商城！我是您的专属AI购物助手，可以为您提供产品推荐、尺码建议、购买咨询等服务。请问有什么可以帮您的吗？",
      primaryColor: config.primaryColor || "#D4AF37", // 奢华金色
      secondaryColor: config.secondaryColor || "#1A1A1A", // 黑色
      accentColor: config.accentColor || "#800000", // 暗红色
      position: config.position || "bottom-right",
      autoOpen: config.autoOpen || false,
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
    
    // 初始化
    this.init();
  }
  
  init() {
    console.log(`[${this.brandName}] 初始化中...`);
    
    try {
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
      console.log(`[${this.brandName}] 初始化完成`);
    } catch (error) {
      console.error(`[${this.brandName}] 初始化失败:`, error);
      this.isInitialized = false;
    }
  }
  
  createContainer() {
    // 检查是否已存在容器
    if (document.getElementById('nextchat-advanced-container')) {
      this.container = document.getElementById('nextchat-advanced-container');
      return;
    }
    
    this.container = document.createElement('div');
    this.container.id = 'nextchat-advanced-container';
    document.body.appendChild(this.container);
  }
  
  createLauncher() {
    // 检查是否已存在启动器
    if (document.getElementById('nextchat-advanced-launcher')) {
      this.launcher = document.getElementById('nextchat-advanced-launcher');
      return;
    }
    
    this.launcher = document.createElement('div');
    this.launcher.id = 'nextchat-advanced-launcher';
    this.launcher.className = 'nextchat-advanced-launcher';
    
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
    this.container.appendChild(this.launcher);
  }
  
  createChatWindow() {
    // 检查是否已存在聊天窗口
    if (document.getElementById('nextchat-advanced-chat-window')) {
      this.chatWindow = document.getElementById('nextchat-advanced-chat-window');
      this.messagesContainer = this.chatWindow.querySelector('.nextchat-advanced-messages');
      this.inputField = this.chatWindow.querySelector('.nextchat-advanced-input');
      this.sendButton = this.chatWindow.querySelector('.nextchat-advanced-send-button');
      return;
    }
    
    this.chatWindow = document.createElement('div');
    this.chatWindow.id = 'nextchat-advanced-chat-window';
    this.chatWindow.className = 'nextchat-advanced-chat-window';
    
    // 创建头部
    const header = document.createElement('div');
    header.className = 'nextchat-advanced-header';
    
    const brand = document.createElement('div');
    brand.className = 'nextchat-advanced-brand';
    
    const logo = document.createElement('div');
    logo.className = 'nextchat-advanced-logo';
    logo.textContent = 'R';
    
    const title = document.createElement('h3');
    title.textContent = this.brandConfig.name;
    
    brand.appendChild(logo);
    brand.appendChild(title);
    
    const closeButton = document.createElement('button');
    closeButton.className = 'nextchat-advanced-close-button';
    closeButton.innerHTML = '&ndash;';
    
    header.appendChild(brand);
    header.appendChild(closeButton);
    
    // 创建主体
    const body = document.createElement('div');
    body.className = 'nextchat-advanced-body';
    
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'nextchat-advanced-messages';
    
    body.appendChild(this.messagesContainer);
    
    // 创建底部
    const footer = document.createElement('div');
    footer.className = 'nextchat-advanced-footer';
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'nextchat-advanced-input-container';
    
    this.inputField = document.createElement('input');
    this.inputField.type = 'text';
    this.inputField.className = 'nextchat-advanced-input';
    this.inputField.placeholder = '输入您的问题...';
    
    this.sendButton = document.createElement('button');
    this.sendButton.className = 'nextchat-advanced-send-button';
    this.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
    
    inputContainer.appendChild(this.inputField);
    inputContainer.appendChild(this.sendButton);
    
    const poweredBy = document.createElement('div');
    poweredBy.className = 'nextchat-advanced-powered-by';
    poweredBy.innerHTML = '<span>Powered by Reich AI</span>';
    
    footer.appendChild(inputContainer);
    footer.appendChild(poweredBy);
    
    // 组装聊天窗口
    this.chatWindow.appendChild(header);
    this.chatWindow.appendChild(body);
    this.chatWindow.appendChild(footer);
    
    this.container.appendChild(this.chatWindow);
  }
  
  setupEventListeners() {
    // 启动器点击事件
    this.launcher.addEventListener('click', () => {
      this.toggle();
    });
    
    // 关闭按钮点击事件
    const closeButton = this.chatWindow.querySelector('.nextchat-advanced-close-button');
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
  }
  
  addWelcomeMessage() {
    const messageElement = document.createElement('div');
    messageElement.className = 'nextchat-advanced-message ai';
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
    if (message) {
      // 添加用户消息
      this.addMessage(message, 'user');
      
      // 清空输入框
      this.inputField.value = '';
      
      // 模拟AI回复
      this.simulateResponse(message);
    }
  }
  
  addMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.className = `nextchat-advanced-message ${sender}`;
    messageElement.textContent = message;
    this.messagesContainer.appendChild(messageElement);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
  
  simulateResponse(userMessage) {
    // 显示输入状态
    const typingElement = document.createElement('div');
    typingElement.className = 'nextchat-advanced-message ai typing';
    typingElement.textContent = '正在输入...';
    this.messagesContainer.appendChild(typingElement);
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
    }, 1500);
  }
  
  // 显示用户引导
  showUserGuide() {
    if (!this.isInitialized) return;
    
    // 检查是否已显示过引导
    if (localStorage.getItem('nextchat-advanced-guide-shown')) {
      return;
    }
    
    // 创建引导提示
    const guide = document.createElement('div');
    guide.id = 'nextchat-advanced-guide';
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
      <button id="nextchat-guide-close" style="background: none; border: none; color: ${this.brandConfig.primaryColor}; cursor: pointer; margin-top: 10px; padding: 0; font-size: 14px;">知道了</button>
    `;
    
    document.body.appendChild(guide);
    
    // 关闭按钮事件
    document.getElementById('nextchat-guide-close').addEventListener('click', () => {
      guide.remove();
      localStorage.setItem('nextchat-advanced-guide-shown', 'true');
    });
    
    // 5秒后自动关闭
    setTimeout(() => {
      if (document.getElementById('nextchat-advanced-guide')) {
        guide.remove();
        localStorage.setItem('nextchat-advanced-guide-shown', 'true');
      }
    }, 5000);
  }
  
  // 销毁助手
  destroy() {
    if (this.container) {
      this.container.remove();
    }
    
    const guide = document.getElementById('nextchat-advanced-guide');
    if (guide) {
      guide.remove();
    }
    
    this.isInitialized = false;
    console.log(`[${this.brandName}] 已销毁`);
  }
}

// 统一初始化函数
function initReichAIAssistant(config = {}) {
  console.log('Initializing Reich AI Assistant with config:', config);
  
  try {
    // 创建或获取NextChatAdvanced实例
    let assistantInstance;
    
    // 如果已有全局实例，则使用它
    if (window.reichAIAssistant) {
      assistantInstance = window.reichAIAssistant;
      console.log('Using existing Reich AI Assistant instance');
    } else {
      // 否则创建新实例
      assistantInstance = new NextChatAdvanced(config);
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
function initNextChatAdvanced(config = {}) {
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
window.NextChatAdvanced = NextChatAdvanced;
window.initReichAIAssistant = initReichAIAssistant;
window.initNextChatAdvanced = initNextChatAdvanced;
window.toggleVoiceControl = toggleVoiceControl;

// 自动初始化
document.addEventListener('DOMContentLoaded', function() {
  // 延迟初始化，确保所有资源加载完成
  setTimeout(() => {
    initReichAIAssistant();
  }, 1000);
});