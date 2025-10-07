/**
 * AI助手管理器
 * 提供AI助手功能的统一管理
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：提供AI助手管理功能，包括聊天界面创建、样式应用和用户交互处理
// 依赖文件：无

class AIAssistantManager {
  constructor() {
    this.initStrategy = 'advanced-only'; // 只使用最全面的NextChat Advanced助手
    this.activeAssistant = null;
    this.availableAssistants = {
      advanced: {}, // 只保留advanced助手
    };
    this.initialized = false;
  }

  /**
   * 应用样式
   * @param {HTMLElement} element - 元素
   * @param {string} style - 样式
   */
  applyStyle(element, style) {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @media (max-width: 768px) {
          ${element.tagName.toLowerCase()}${element.id ? `#${  element.id}` : ''}${element.className ? `.${  element.className.split(' ').join('.')}` : ''} {
            width: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
            border: 0 !important;
          }
        }
        
        /* 金色渐变动画 */
        .gucci-gold-gradient-animate {
          animation: gucciGradient 3s ease infinite;
        }
        
        @keyframes gucciGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `;
    document.head.appendChild(styleElement);
  }

  /**
   * 显示备用聊天模态框（当主模态框创建失败时）
   */
  showFallbackChatModal() {
    try {
      console.log('🛠️ 尝试创建备用聊天模态框...');

      const fallbackModal = document.createElement('div');
      fallbackModal.id = 'gucci-fallback-chat-modal';
      fallbackModal.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        width: 90%;
        max-width: 320px;
        max-height: 400px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `;

      fallbackModal.innerHTML = `
        <div class="gucci-chat-modal-header">
          <div class="gucci-chat-header-brand">
            <i class="fas fa-gem"></i>
            <h3>Gucci AI 助手</h3>
          </div>
          <button class="gucci-chat-modal-close">&times;</button>
        </div>
        <div class="gucci-chat-modal-body">
          <div class="gucci-chat-welcome">
            <div class="gucci-chat-avatar">
              <i class="fas fa-user-tie"></i>
            </div>
            <h4>您好！我是您的专属Gucci AI顾问</h4>
            <p>我可以帮助您了解产品信息、查询订单状态、提供时尚建议等。</p>
            <div class="gucci-chat-suggestions">
              <button class="gucci-suggestion-btn" data-question="有什么新品推荐吗？">新品推荐</button>
              <button class="gucci-suggestion-btn" data-question="如何查询订单状态？">订单查询</button>
              <button class="gucci-suggestion-btn" data-question="有哪些优惠活动？">优惠活动</button>
            </div>
          </div>
          <div class="gucci-chat-messages"></div>
        </div>
        <div class="gucci-chat-modal-footer">
          <div class="gucci-chat-input-container">
            <button class="gucci-chat-voice-btn" id="gucci-chat-voice-btn">
              <i class="fas fa-microphone"></i>
            </button>
            <button class="gucci-chat-image-btn" id="gucci-chat-image-btn">
              <i class="fas fa-image"></i>
            </button>
            <input type="file" id="gucci-chat-image-input" accept="image/*" style="display: none;">
            <input type="text" class="gucci-chat-input" placeholder="输入您的问题..." />
            <button class="gucci-chat-send-btn">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
          <div class="gucci-chat-powered-by">
            <span>Powered by Reich AI</span>
          </div>
        </div>
      </div>
    `;

      // 添加样式
      const modalStyles = document.createElement('style');
      modalStyles.textContent = `
      .gucci-chat-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .gucci-chat-modal.show {
        opacity: 1;
        visibility: visible;
      }

      .gucci-chat-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(2px);
      }

      .gucci-chat-modal-content {
        position: relative;
        background: white;
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }

      .gucci-chat-modal.show .gucci-chat-modal-content {
        transform: scale(1);
      }

      .gucci-chat-modal-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
        border-radius: 12px 12px 0 0;
      }

      .gucci-chat-header-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .gucci-chat-header-brand i {
        color: #D4AF37;
        font-size: 1.2rem;
      }

      .gucci-chat-modal-header h3 {
        margin: 0;
        font-family: 'Playfair Display', serif;
        font-weight: 400;
        color: #D4AF37;
        font-size: 1.25rem;
        letter-spacing: 1px;
      }

      .gucci-chat-modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #D4AF37;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.3s ease;
      }

      .gucci-chat-modal-close:hover {
        background: rgba(212, 175, 55, 0.1);
        transform: scale(1.1);
      }

      .gucci-chat-modal-close:hover {
        color: #1A1A1A;
        transform: scale(1.1);
      }

      .gucci-chat-modal-body {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
      }

      .gucci-chat-welcome {
        text-align: center;
        margin-bottom: 20px;
        padding: 20px;
      }

      .gucci-chat-avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #D4AF37 0%, #F4E4BC 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 15px;
        font-size: 1.5rem;
        color: white;
        box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
      }

      .gucci-chat-welcome h4 {
        font-family: 'Playfair Display', serif;
        font-size: 1.1rem;
        color: #1A1A1A;
        margin: 0 0 10px 0;
        font-weight: 400;
      }

      .gucci-chat-welcome p {
        font-family: 'Arial', sans-serif;
        font-size: 0.9rem;
        color: #666;
        line-height: 1.5;
        margin: 0 0 20px 0;
      }

      .gucci-chat-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: center;
        margin-top: 20px;
      }

      .gucci-suggestion-btn {
        background: rgba(212, 175, 55, 0.1);
        border: 1px solid rgba(212, 175, 55, 0.3);
        color: #D4AF37;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: 'Arial', sans-serif;
      }

      .gucci-suggestion-btn:hover {
        background: rgba(212, 175, 55, 0.2);
        border-color: #D4AF37;
        transform: translateY(-1px);
      }

      .gucci-chat-welcome p {
        margin: 0 0 10px 0;
        color: #666;
        font-size: 0.9rem;
        line-height: 1.4;
      }

      .gucci-chat-welcome p:last-child {
        margin-bottom: 0;
      }

      .gucci-chat-modal-footer {
        padding: 20px;
        border-top: 1px solid #eee;
        background: #fafafa;
        border-radius: 0 0 12px 12px;
      }

      .gucci-chat-input-container {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
        align-items: center;
      }

      .gucci-chat-voice-btn, .gucci-chat-image-btn {
        background: rgba(212, 175, 55, 0.1);
        border: 1px solid rgba(212, 175, 55, 0.3);
        color: #D4AF37;
        padding: 10px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
      }

      .gucci-chat-voice-btn:hover, .gucci-chat-image-btn:hover {
        background: rgba(212, 175, 55, 0.2);
        border-color: #D4AF37;
        transform: translateY(-1px);
      }

      .gucci-chat-voice-btn.recording {
        background: rgba(220, 53, 69, 0.2);
        border-color: #dc3545;
        color: #dc3545;
        animation: pulse 1.5s infinite;
      }

      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
        100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
      }

      .gucci-chat-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid #ddd;
        border-radius: 25px;
        font-size: 0.9rem;
        outline: none;
        transition: all 0.3s ease;
        font-family: 'Arial', sans-serif;
        background: white;
      }

      .gucci-chat-input:focus {
        border-color: #D4AF37;
        box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
      }

      .gucci-chat-send-btn {
        background: linear-gradient(135deg, #D4AF37 0%, #F4E4BC 100%);
        color: white;
        border: none;
        padding: 12px 16px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        box-shadow: 0 2px 10px rgba(212, 175, 55, 0.3);
      }

      .gucci-chat-send-btn:hover {
        background: linear-gradient(135deg, #B8941F 0%, #D4AF37 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);
      }

      .gucci-chat-powered-by {
        text-align: center;
        font-size: 0.7rem;
        color: #999;
        font-family: 'Arial', sans-serif;
        letter-spacing: 0.5px;
      }

      /* 动画样式 */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes typingDot {
        0%, 60%, 100% {
          opacity: 0.3;
        }
        30% {
          opacity: 1;
        }
      }

      @media (max-width: 768px) {
        .gucci-chat-modal-content {
          width: 95%;
          max-height: 80vh;
          border-radius: 12px 12px 0 0;
          position: absolute;
          bottom: 0;
          left: 2.5%;
          right: 2.5%;
          top: auto;
          transform: translateY(100%);
        }

        .gucci-chat-modal.show .gucci-chat-modal-content {
          transform: translateY(0);
        }
      }
    `;
      document.head.appendChild(modalStyles);

      // 添加到页面
      document.body.appendChild(fallbackModal);

      // 显示模态框
      setTimeout(() => {
        fallbackModal.classList.add('show');
      }, 10);

      // 快捷问题按钮事件
      const suggestionBtns = fallbackModal.querySelectorAll('.gucci-suggestion-btn');
      suggestionBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const question = btn.getAttribute('data-question');
          this.handleUserMessage(question, fallbackModal);
        });
      });

      // 发送按钮事件
      const sendBtn = fallbackModal.querySelector('.gucci-chat-send-btn');
      const input = fallbackModal.querySelector('.gucci-chat-input');

      if (sendBtn && input) {
        sendBtn.addEventListener('click', () => {
          const message = input.value.trim();
          if (message) {
            this.handleUserMessage(message, fallbackModal);
            input.value = '';
          }
        });

        // 回车发送
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            sendBtn.click();
          }
        });
      }

      // 关闭事件
      const closeBtn = fallbackModal.querySelector('.gucci-chat-modal-close');
      const overlay = fallbackModal.querySelector('.gucci-chat-modal-overlay');

      const closeModal = () => {
        fallbackModal.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(fallbackModal);
          document.head.removeChild(modalStyles);
        }, 300);
      };

      closeBtn.addEventListener('click', closeModal);
      overlay.addEventListener('click', closeModal);

      // 聚焦输入框
      input.focus();
    } catch (error) {
      console.error('❌ 创建备用聊天模态框失败:', error);
      // 如果备用模态框创建也失败，显示错误处理
      this.showAssistantError();
    }
  }

  // 处理用户消息
  handleUserMessage(message, modal) {
    const messagesContainer = modal.querySelector('.gucci-chat-messages');

    // 添加用户消息
    const userMessage = document.createElement('div');
    userMessage.className = 'gucci-chat-message user-message';
    userMessage.innerHTML = `
      <div class="message-content">
        <p>${message}</p>
      </div>
    `;

    // 使用样式管理对象应用样式
    this.applyStyle(userMessage, 'userMessage');

    const userContent = userMessage.querySelector('.message-content');
    this.applyStyle(userContent, 'userMessageContent');

    messagesContainer.appendChild(userMessage);
    this.scrollToBottom(messagesContainer);

    // 显示输入指示器
    this.showTypingIndicator(messagesContainer);

    // 模拟AI回复
    setTimeout(() => {
      this.removeTypingIndicator(messagesContainer);
      // 使用完整的 addAIMessage 方法，传入 speak 参数
      this.addAIMessage(this.generateAIResponse(message), messagesContainer, true);
    }, 1500 + Math.random() * 1000);
  }

  // 显示输入指示器
  showTypingIndicator(container) {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;

    // 使用样式管理对象应用样式
    this.applyStyle(typingIndicator, 'typingIndicator');

    const dotsContainer = typingIndicator.querySelector('.typing-dots');
    this.applyStyle(dotsContainer, 'typingDotsContainer');

    const dots = dotsContainer.querySelectorAll('span');

    dots.forEach((dot, index) => {
    // 应用通用样式
      this.applyStyle(dot, 'typingDot');
      // 设置动态的动画延迟
      dot.style.animationDelay = `${index * 0.2}s`;
    });

    container.appendChild(typingIndicator);
    this.scrollToBottom(container);
  }

  // 移除输入指示器
  removeTypingIndicator(container) {
    const typingIndicator = container.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  // 添加AI消息
  // 复用上面定义的 addAIMessage 方法，该方法已包含完整的功能实现

  // 生成AI回复
  generateAIResponse(userMessage) {
    const responses = [
      '感谢您的咨询！我是Gucci专属AI助手，很高兴为您服务。我们的专业团队将为您提供最优质的购物体验。',
      '您好！感谢您选择Gucci。我们的客服团队将尽快为您提供详细的解答和个性化的服务。',
      '非常感谢您的关注！作为Gucci的AI助手，我将竭诚为您提供产品信息、购物指导和售后服务支持。',
      '您好！感谢您联系我们。我们的专业顾问团队随时为您提供帮助，确保您获得最佳的购物体验。',
      '感谢您的留言！Gucci致力于为您提供卓越的客户服务。我们将根据您的需求提供个性化的解决方案。',
    ];

    // 根据关键词提供特定回复
    const messageLower = userMessage.toLowerCase();
    if (messageLower.includes('新品') || messageLower.includes('新款')) {
      return '我们的2025春夏新品系列已经上市！包括经典的GG Marmont系列新款、Dionysus系列的限量版，以及全新的Ophidia系列。每款产品都体现了Gucci对奢华与创新的完美结合。您可以通过我们的官网查看最新款式，或预约私人购物体验。';
    } else if (messageLower.includes('价格') || messageLower.includes('多少钱')) {
      return 'Gucci的产品价格因系列、材质和工艺而异。我们的经典手袋系列价格从$1,500起，限量版和特殊材质的产品价格会相应调整。为了获得最准确的价格信息，我建议您浏览我们的官网或直接联系我们的销售顾问，他们将为您提供详细的产品和价格信息。';
    } else if (messageLower.includes('尺码') || messageLower.includes('尺寸')) {
      return 'Gucci提供多种尺码选择以满足不同客户的需求。我们的服装系列通常包括XS到XXL尺码，鞋履系列涵盖从34到44欧码。每款产品页面都有详细的尺码指南，您也可以联系我们的专业顾问，他们将根据您的具体需求提供个性化的尺码建议。';
    } else if (messageLower.includes('配送') || messageLower.includes('送货')) {
      return 'Gucci提供全球配送服务！标准配送通常需要3-5个工作日，加急配送可在1-2个工作日内送达。我们为所有订单提供免费的标准配送服务，加急配送会收取额外费用。所有包裹都会精心包装，确保您的奢侈品安全送达。';
    } else if (messageLower.includes('退换') || messageLower.includes('退货')) {
      return 'Gucci提供灵活的退换货政策。您可以在收到商品后的30天内申请退货或换货，商品必须保持原包装和标签完整。我们提供免费的退货服务，只需联系我们的客服团队，他们将指导您完成退换货流程。';
    }

    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
 * 显示助手错误信息
 */
  showAssistantError() {
    console.error('❌ AI助手初始化失败');

    // 添加调试信息
    console.log('调试信息 - activeAssistant:', this.activeAssistant);
    console.log('调试信息 - availableAssistants:', Object.keys(this.availableAssistants));
  
    // 由于我们只使用advanced助手，不需要创建最小化助手
    console.log('请检查NextChat Advanced助手配置是否正确');
  }

  /**
 * 设置错误处理
 */
  setupErrorHandling() {
  // 监听全局错误
    window.addEventListener('error', (event) => {
      console.error('AI助手全局错误:', event.error);
    });

    // 监听未捕获的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      console.error('AI助手Promise拒绝:', event.reason);
    });
  }

  /**
 * 获取当前活动的助手类型
 */
  getActiveAssistantType() {
    return this.activeAssistant;
  }

  /**
 * 获取助手状态
 */
  getStatus() {
    return {
      initialized: this.initialized,
      activeAssistant: this.activeAssistant,
      availableAssistants: Object.keys(this.availableAssistants),
    };
  }


}

// 显示LuxuryGPT助手
// Inserted by Trae AI (GPT-5) — purpose: Homepage config for LuxuryGPT; Timestamp: 2025-09-19 23:35:54 Asia/Shanghai
AIAssistantManager.prototype.showLuxuryAssistant = function() {
  try {
    // 如果已经存在LuxuryGPT助手，直接显示
    if (document.getElementById('luxury-gpt-assistant')) {
      const assistant = document.getElementById('luxury-gpt-assistant');
      assistant.style.display = 'block';
      console.log('✅ LuxuryGPT助手已显示');
      return;
    }
    
    // 创建LuxuryGPT助手容器
    const assistantContainer = document.createElement('div');
    assistantContainer.id = 'luxury-gpt-assistant';
    assistantContainer.style.position = 'fixed';
    assistantContainer.style.bottom = '20px';
    assistantContainer.style.right = '20px';
    assistantContainer.style.width = '350px';
    assistantContainer.style.height = '500px';
    assistantContainer.style.backgroundColor = '#1A1A1A';
    assistantContainer.style.border = '2px solid #D4AF37';
    assistantContainer.style.borderRadius = '10px';
    assistantContainer.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
    assistantContainer.style.zIndex = '9999';
    assistantContainer.style.display = 'flex';
    assistantContainer.style.flexDirection = 'column';
    assistantContainer.style.fontFamily = 'Playfair Display, serif';
    
    // 创建助手头部
    const header = document.createElement('div');
    header.style.backgroundColor = '#D4AF37';
    header.style.color = '#1A1A1A';
    header.style.padding = '10px 15px';
    header.style.borderRadius = '8px 8px 0 0';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    const title = document.createElement('div');
    title.textContent = 'Gucci AI 顾问';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '16px';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.color = '#1A1A1A';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = function() {
      assistantContainer.style.display = 'none';
      // 显示浮动按钮
      const floatingButton = document.getElementById('luxury-gpt-floating-button');
      if (floatingButton) {
        floatingButton.style.display = 'flex';
      }
    };
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // 创建助手身体
    const body = document.createElement('div');
    body.style.flex = '1';
    body.style.padding = '15px';
    body.style.overflowY = 'auto';
    body.style.color = '#fff';
    
    // 添加欢迎消息
    const welcomeMessage = document.createElement('div');
    welcomeMessage.style.marginBottom = '15px';
    welcomeMessage.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <div style="width: 40px; height: 40px; background-color: #D4AF37; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
          <span style="color: #1A1A1A; font-weight: bold;">G</span>
        </div>
        <div>
          <div style="font-weight: bold;">Gucci AI 顾问</div>
          <div style="font-size: 12px; opacity: 0.8;">在线</div>
        </div>
      </div>
      <div>欢迎来到Gucci官方商城！我是您的专属AI顾问，可以为您提供产品推荐、尺码建议、购买咨询等服务。</div>
    `;
    body.appendChild(welcomeMessage);
    
    // 创建助手输入区域
    const inputArea = document.createElement('div');
    inputArea.style.padding = '10px';
    inputArea.style.borderTop = '1px solid #333';
    inputArea.style.display = 'flex';
    inputArea.style.flexDirection = 'column';
    inputArea.style.gap = '10px';
    
    // 创建输入按钮区域
    const inputButtons = document.createElement('div');
    inputButtons.style.display = 'flex';
    inputButtons.style.gap = '5px';
    inputButtons.style.marginBottom = '5px';
    
    // 文件上传按钮
    const fileButton = document.createElement('button');
    fileButton.innerHTML = '<i class="fas fa-paperclip"></i>';
    fileButton.style.backgroundColor = '#333';
    fileButton.style.color = '#fff';
    fileButton.style.border = '1px solid #555';
    fileButton.style.borderRadius = '4px';
    fileButton.style.padding = '6px';
    fileButton.style.cursor = 'pointer';
    fileButton.style.fontSize = '14px';
    fileButton.title = '上传文件';
    fileButton.onclick = function() {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt';
      fileInput.style.display = 'none';
      fileInput.onchange = function(e) {
        const files = e.target.files;
        if (files.length > 0) {
          handleFileUpload(files[0]);
        }
      };
      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
    };
    
    // 语音输入按钮
    const voiceButton = document.createElement('button');
    voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
    voiceButton.style.backgroundColor = '#333';
    voiceButton.style.color = '#fff';
    voiceButton.style.border = '1px solid #555';
    voiceButton.style.borderRadius = '4px';
    voiceButton.style.padding = '6px';
    voiceButton.style.cursor = 'pointer';
    voiceButton.style.fontSize = '14px';
    voiceButton.title = '语音输入';
    voiceButton.onclick = function() {
      toggleVoiceRecording();
    };
    
    // 语音电话按钮
    const callButton = document.createElement('button');
    callButton.innerHTML = '<i class="fas fa-phone"></i>';
    callButton.style.backgroundColor = '#333';
    callButton.style.color = '#fff';
    callButton.style.border = '1px solid #555';
    callButton.style.borderRadius = '4px';
    callButton.style.padding = '6px';
    callButton.style.cursor = 'pointer';
    callButton.style.fontSize = '14px';
    callButton.title = '语音电话';
    callButton.onclick = function() {
      initiateVoiceCall();
    };
    
    inputButtons.appendChild(fileButton);
    inputButtons.appendChild(voiceButton);
    inputButtons.appendChild(callButton);
    inputArea.appendChild(inputButtons);
    
    // 主输入区域
    const inputContainer = document.createElement('div');
    inputContainer.style.display = 'flex';
    inputContainer.style.gap = '10px';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '输入您的问题...';
    input.style.flex = '1';
    input.style.padding = '8px';
    input.style.border = '1px solid #333';
    input.style.borderRadius = '4px';
    input.style.backgroundColor = '#333';
    input.style.color = '#fff';
    
    const sendButton = document.createElement('button');
    sendButton.textContent = '发送';
    sendButton.style.backgroundColor = '#D4AF37';
    sendButton.style.color = '#1A1A1A';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '4px';
    sendButton.style.padding = '8px 15px';
    sendButton.style.cursor = 'pointer';
    sendButton.style.fontWeight = 'bold';
    
    sendButton.onclick = function() {
      const message = input.value.trim();
      if (message) {
        handleTextMessage(message);
        input.value = '';
      }
    };
    
    // 添加回车发送功能
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendButton.click();
      }
    });
    
    inputContainer.appendChild(input);
    inputContainer.appendChild(sendButton);
    inputArea.appendChild(inputContainer);
    
    // 语音录制状态显示
    const recordingStatus = document.createElement('div');
    recordingStatus.id = 'voice-recording-status';
    recordingStatus.style.display = 'none';
    recordingStatus.style.color = '#D4AF37';
    recordingStatus.style.fontSize = '12px';
    recordingStatus.style.textAlign = 'center';
    recordingStatus.style.marginTop = '5px';
    recordingStatus.innerHTML = '<i class="fas fa-circle"></i> 正在录音...';
    inputArea.appendChild(recordingStatus);
    
    // 文件上传处理函数
    function handleFileUpload(file) {
      const fileType = file.type;
      const fileName = file.name;
      const fileSize = (file.size / 1024).toFixed(2);
      
      // 显示文件上传消息
      const fileMessage = document.createElement('div');
      fileMessage.style.marginBottom = '15px';
      fileMessage.style.textAlign = 'right';
      fileMessage.innerHTML = `
        <div style="display: inline-block; background-color: #D4AF37; color: #1A1A1A; padding: 8px 12px; border-radius: 10px; max-width: 80%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-paperclip" style="font-size: 14px;"></i>
            <div>
              <div style="font-weight: bold;">${fileName}</div>
              <div style="font-size: 11px; opacity: 0.8;">${fileSize} KB • ${fileType.split('/')[1]?.toUpperCase() || 'FILE'}</div>
            </div>
          </div>
        </div>
      `;
      body.appendChild(fileMessage);
      
      // 模拟AI处理文件
      setTimeout(() => {
        const replyMessage = document.createElement('div');
        replyMessage.style.marginBottom = '15px';
        replyMessage.innerHTML = `
          <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
            <div style="width: 30px; height: 30px; background-color: #D4AF37; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; flex-shrink: 0;">
              <span style="color: #1A1A1A; font-weight: bold; font-size: 12px;">G</span>
            </div>
            <div style="background-color: #333; color: #fff; padding: 8px 12px; border-radius: 10px; max-width: 80%;">
              已收到您上传的文件 <strong>${fileName}</strong>。我会分析文件内容并为您提供相关帮助。
            </div>
          </div>
        `;
        body.appendChild(replyMessage);
        body.scrollTop = body.scrollHeight;
      }, 1500);
      
      body.scrollTop = body.scrollHeight;
    }
    
    // 文本消息处理函数
    function handleTextMessage(message) {
      const userMessage = document.createElement('div');
      userMessage.style.marginBottom = '15px';
      userMessage.style.textAlign = 'right';
      userMessage.innerHTML = `
        <div style="display: inline-block; background-color: #D4AF37; color: #1A1A1A; padding: 8px 12px; border-radius: 10px; max-width: 80%;">
          ${message}
        </div>
      `;
      body.appendChild(userMessage);
      
      // 模拟AI回复
      setTimeout(() => {
        const replyMessage = document.createElement('div');
        replyMessage.style.marginBottom = '15px';
        replyMessage.innerHTML = `
          <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
            <div style="width: 30px; height: 30px; background-color: #D4AF37; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; flex-shrink: 0;">
              <span style="color: #1A1A1A; font-weight: bold; font-size: 12px;">G</span>
            </div>
            <div style="background-color: #333; color: #fff; padding: 8px 12px; border-radius: 10px; max-width: 80%;">
              感谢您的咨询！我们的Gucci专家将尽快为您提供专业解答。
            </div>
          </div>
        `;
        body.appendChild(replyMessage);
        body.scrollTop = body.scrollHeight;
      }, 1000);
      
      body.scrollTop = body.scrollHeight;
    }
    
    // 语音录制功能
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    
    function toggleVoiceRecording() {
      if (isRecording) {
        stopVoiceRecording();
      } else {
        startVoiceRecording();
      }
    }
    
    async function startVoiceRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          handleVoiceMessage(audioBlob);
        };
        
        mediaRecorder.start();
        isRecording = true;
        recordingStatus.style.display = 'block';
        voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
        voiceButton.style.color = '#ff4444';
        
      } catch (error) {
        console.error('语音录制失败:', error);
        alert('无法访问麦克风，请检查权限设置');
      }
    }
    
    function stopVoiceRecording() {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        recordingStatus.style.display = 'none';
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceButton.style.color = '#fff';
      }
    }
    
    function handleVoiceMessage(audioBlob) {
      // 显示语音消息
      const voiceMessage = document.createElement('div');
      voiceMessage.style.marginBottom = '15px';
      voiceMessage.style.textAlign = 'right';
      voiceMessage.innerHTML = `
        <div style="display: inline-block; background-color: #D4AF37; color: #1A1A1A; padding: 8px 12px; border-radius: 10px; max-width: 80%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-microphone" style="font-size: 14px;"></i>
            <div style="font-weight: bold;">语音消息</div>
            <audio controls style="height: 25px; margin-left: 10px;">
              <source src="${URL.createObjectURL(audioBlob)}" type="audio/wav">
            </audio>
          </div>
        </div>
      `;
      body.appendChild(voiceMessage);
      
      // 模拟AI处理语音
      setTimeout(() => {
        const replyMessage = document.createElement('div');
        replyMessage.style.marginBottom = '15px';
        replyMessage.innerHTML = `
          <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
            <div style="width: 30px; height: 30px; background-color: #D4AF37; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; flex-shrink: 0;">
              <span style="color: #1A1A1A; font-weight: bold; font-size: 12px;">G</span>
            </div>
            <div style="background-color: #333; color: #fff; padding: 8px 12px; border-radius: 10px; max-width: 80%;">
              已收到您的语音消息。我会尽快为您提供专业解答。
            </div>
          </div>
        `;
        body.appendChild(replyMessage);
        body.scrollTop = body.scrollHeight;
      }, 1000);
      
      body.scrollTop = body.scrollHeight;
    }
    
    // 语音电话功能
    function initiateVoiceCall() {
      const callMessage = document.createElement('div');
      callMessage.style.marginBottom = '15px';
      callMessage.style.textAlign = 'right';
      callMessage.innerHTML = `
        <div style="display: inline-block; background-color: #D4AF37; color: #1A1A1A; padding: 8px 12px; border-radius: 10px; max-width: 80%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-phone" style="font-size: 14px;"></i>
            <div style="font-weight: bold;">正在呼叫Gucci客服...</div>
          </div>
        </div>
      `;
      body.appendChild(callMessage);
      
      // 模拟电话接通
      setTimeout(() => {
        const replyMessage = document.createElement('div');
        replyMessage.style.marginBottom = '15px';
        replyMessage.innerHTML = `
          <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
            <div style="width: 30px; height: 30px; background-color: #D4AF37; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; flex-shrink: 0;">
              <span style="color: #1A1A1A; font-weight: bold; font-size: 12px;">G</span>
            </div>
            <div style="background-color: #333; color: #fff; padding: 8px 12px; border-radius: 10px; max-width: 80%;">
              电话已接通！Gucci客服专员将为您服务。如需转接人工客服，请拨打 400-888-1234。
            </div>
          </div>
        `;
        body.appendChild(replyMessage);
        body.scrollTop = body.scrollHeight;
      }, 2000);
      
      body.scrollTop = body.scrollHeight;
    }
    
    assistantContainer.appendChild(header);
    assistantContainer.appendChild(body);
    assistantContainer.appendChild(inputArea);
    
    document.body.appendChild(assistantContainer);
    
    // 隐藏浮动按钮
    const floatingButton = document.getElementById('luxury-gpt-floating-button');
    if (floatingButton) {
      floatingButton.style.display = 'none';
    }
    
    console.log('✅ LuxuryGPT助手已创建并显示');
    
  } catch (error) {
    console.error('❌ 创建LuxuryGPT助手失败:', error);
  }
};

// 创建LuxuryGPT浮动按钮
// Inserted by Trae AI (GPT-5) — purpose: Homepage config for LuxuryGPT; Timestamp: 2025-09-19 23:35:54 Asia/Shanghai
AIAssistantManager.prototype.createLuxuryFloatingButton = function() {
  try {
    // 如果已经存在浮动按钮，不重复创建
    if (document.getElementById('luxury-gpt-floating-button')) {
      return;
    }
    
    // 创建浮动按钮
    const floatingButton = document.createElement('div');
    floatingButton.id = 'luxury-gpt-floating-button';
    floatingButton.style.position = 'fixed';
    floatingButton.style.bottom = '20px';
    floatingButton.style.right = '20px';
    floatingButton.style.width = '60px';
    floatingButton.style.height = '60px';
    floatingButton.style.backgroundColor = '#D4AF37';
    floatingButton.style.borderRadius = '50%';
    floatingButton.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    floatingButton.style.zIndex = '9998';
    floatingButton.style.display = 'flex';
    floatingButton.style.flexDirection = 'column';
    floatingButton.style.alignItems = 'center';
    floatingButton.style.justifyContent = 'center';
    floatingButton.style.cursor = 'pointer';
    floatingButton.style.transition = 'all 0.3s ease';
    
    // 添加Gucci标志
    const logo = document.createElement('div');
    logo.style.width = '30px';
    logo.style.height = '30px';
    logo.style.backgroundColor = '#1A1A1A';
    logo.style.borderRadius = '50%';
    logo.style.display = 'flex';
    logo.style.alignItems = 'center';
    logo.style.justifyContent = 'center';
    logo.style.color = '#D4AF37';
    logo.style.fontWeight = 'bold';
    logo.style.fontSize = '16px';
    logo.textContent = 'G';
    
    // 添加标签
    const label = document.createElement('div');
    label.textContent = 'Gucci AI';
    label.style.color = '#1A1A1A';
    label.style.fontSize = '10px';
    label.style.fontWeight = 'bold';
    label.style.marginTop = '2px';
    
    // 添加悬停效果
    floatingButton.addEventListener('mouseenter', function() {
      floatingButton.style.transform = 'scale(1.1)';
    });
    
    floatingButton.addEventListener('mouseleave', function() {
      floatingButton.style.transform = 'scale(1)';
    });
    
    // 添加点击事件
    floatingButton.addEventListener('click', function() {
      window.aiAssistantManager.showLuxuryAssistant();
    });
    
    floatingButton.appendChild(logo);
    floatingButton.appendChild(label);
    
    // 添加到DOM
    document.body.appendChild(floatingButton);
    
    console.log('✅ LuxuryGPT浮动按钮已创建');
  } catch (error) {
    console.error('❌ 创建LuxuryGPT浮动按钮失败:', error);
  }
};

// 创建全局实例
window.aiAssistantManager = new AIAssistantManager();

// 导出类
window.AIAssistantManager = AIAssistantManager;

// 为 AIAssistantManager 补充初始化方法（advanced-only 策略）
// Inserted by Trae AI (GPT-5) — purpose: Homepage config for NextChat Advanced; Timestamp: 2025-09-19 23:35:54 Asia/Shanghai
AIAssistantManager.prototype.init = async function() {
  try {
    if (this.initialized) {
      return this.getStatus ? this.getStatus() : { initialized: true, activeAssistant: this.activeAssistant };
    }

    // 确保错误监听
    if (typeof this.setupErrorHandling === 'function') {
      this.setupErrorHandling();
    }

    // 统一策略：默认 advanced-only（如构造器未设置则补齐）
    if (!this.initStrategy) {
      this.initStrategy = 'advanced-only'; // Set by Trae AI (GPT-5); Timestamp: 2025-09-19 23:35:54 Asia/Shanghai
    }

    let advancedOk = false;

    if (this.initStrategy === 'advanced-only' && typeof window.initGucciAIAssistant === 'function') {
      console.log('🧭 按策略 advanced-only 初始化 NextChat Advanced...');
      try {
        // 为主页配置NextChat Advanced AI助手
        const advancedConfig = {
          name: 'Gucci AI',
          brand: 'Gucci',
          welcomeMessage: '欢迎来到Gucci官方商城！我是您的专属AI顾问，可以为您提供产品推荐、尺码建议、购买咨询等服务。',
          theme: 'gucci-luxury',
          primaryColor: '#D4AF37', // Gucci金色
          secondaryColor: '#1A1A1A', // 黑色
          accentColor: '#800000', // 暗红色
          avatar: 'https://placehold.co/120x120/D4AF37/1A1A1A?text=GUCCI',
          position: 'bottom-right',
          voiceEnabled: true,
          imageRecognitionEnabled: true,
          vectorDBEnabled: true,
          features: {
            productRecommendation: true,
            sizeRecommendation: true,
            styleConsultation: true,
            materialInformation: true,
            inventoryCheck: true,
            newCollectionInfo: true,
            personalShopping: true,
          },
          presetResponses: {
            greeting: '您好！欢迎来到Gucci官方商城。有什么我可以帮您的吗？',
            productInfo: '我们的产品均采用意大利精湛工艺制作，每件产品都体现了Gucci的品牌精神和创新设计。',
            returnPolicy: '我们提供30天无理由退货服务。请保持商品标签完整，并提供购买凭证。',
            shippingInfo: '我们提供全国免费配送服务，通常在1-3个工作日内发货，配送时间为3-7个工作日。',
            storeInfo: 'Gucci在中国各大城市均设有精品店，您可以通过我们的门店查询系统找到最近的店铺。',
            contactInfo: '如需更多帮助，请拨打我们的客服热线：400-888-1234。',
            newCollection: '我们的最新系列融合了经典与创新，展现了Gucci独特的时尚视角。您可以在我们的精品店或官网浏览完整系列。',
            personalStyling: '我们的AI顾问可以根据您的喜好和需求，为您提供个性化的搭配建议。只需告诉我您的需求，我将为您推荐最适合的产品。',
          },
          contactInfo: {
            email: 'service@gucci.cn',
            phone: '400-888-1234',
            hours: '周一至周日 9:00-21:00',
          },
          socialMedia: {
            weibo: 'https://weibo.com/gucci',
            wechat: 'GucciOfficial',
            instagram: 'https://instagram.com/gucci',
            tiktok: 'https://tiktok.com/@gucci',
          },
          fontFamily: 'Playfair Display, serif',
          customPrompt: '我是Gucci专属AI顾问，可以回答您关于Gucci产品、系列、门店等方面的问题。我可以为您提供产品推荐、尺码建议、风格咨询、新品信息等服务。',
          debugMode: false,
          homepageOptimized: true,
          autoShowDelay: 3000, // 3秒后自动显示欢迎消息
          proactiveSuggestions: true,
          // 主页特定配置
          homepageConfig: {
            autoShow: true, // 在主页自动显示
            showOnLoad: false, // 不在页面加载后自动显示，只在点击后显示
            showDelay: 2000, // 2秒后显示
            floatingButton: {
              visible: true,
              text: 'Gucci AI',
              position: 'bottom-right',
              offsetX: 20,
              offsetY: 20,
            },
          },
        };
        
        const maybe = window.initGucciAIAssistant(advancedConfig);
        if (maybe && typeof maybe.then === 'function') { await maybe; }
        advancedOk = true;
        this.activeAssistant = 'advanced';
        console.log('✅ NextChat Advanced 初始化完成（advanced-only）');
        
        // 如果配置了主页显示，则根据配置显示NextChat Advanced助手
        if (advancedConfig.homepageConfig && advancedConfig.homepageConfig.autoShow) {
          // 创建浮动按钮
          this.createLuxuryFloatingButton();
          
          // 如果配置了页面加载时自动显示
          if (advancedConfig.homepageConfig.showOnLoad) {
            const delay = advancedConfig.homepageConfig.showDelay || 3000;
            setTimeout(() => {
              this.showLuxuryAssistant();
            }, delay);
          }
        }
      } catch (err) {
        console.error('❌ NextChat Advanced 初始化失败:', err);
      }
    } else {
      console.error('❌ 未检测到 NextChat Advanced 初始化方法，或策略非 advanced-only');
    }

    // 使用advancedOk变量来记录初始化状态
    console.log(`NextChat Advanced 初始化状态: ${advancedOk ? '成功' : '失败'}`);

    this.initialized = true;
    return this.getStatus ? this.getStatus() : { initialized: true, activeAssistant: this.activeAssistant };
  } catch (e) {
    console.error('❌ aiAssistantManager.init 失败：', e);
    this.initialized = true;
    return this.getStatus ? this.getStatus() : { initialized: true, activeAssistant: this.activeAssistant || null };
  }
};

// 自动初始化（这个是统一的入口）
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 开始初始化统一AI助手管理...');
    await window.aiAssistantManager.init();
    console.log('✅ 统一AI助手管理初始化完成');
  } catch (error) {
    console.error('❌ 统一AI助手管理初始化失败:', error);
  }
});
