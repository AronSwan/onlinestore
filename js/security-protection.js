// 前端安全保护模块
// 作者：AI助手
// 时间：2025-09-27

class SecurityProtection {
  constructor() {
    this.initTime = Date.now();
    this.apiToken = this.generateAPIToken();
    this.initProtection();
  }

  // 初始化保护措施
  initProtection() {
    this.preventDevTools();
    this.obfuscateDOM();
    this.monitorUserActions();
    this.protectAPIRequests();
    this.detectAutomation();
  }

  // 生成API令牌
  generateAPIToken() {
    const timestamp = Math.floor(Date.now() / 60000); // 每分钟变化一次
    const domain = window.location.hostname;
    const userAgent = navigator.userAgent;
    
    const data = `${timestamp}:${domain}:${userAgent}`;
    return btoa(data).replace(/=/g, '').slice(0, 32);
  }

  // 阻止开发者工具
  preventDevTools() {
    // 方法1：检测控制台打开
    const devToolsCheck = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        document.body.innerHTML = '<div style="padding: 20px; text-align: center;">检测到开发者工具，页面访问受限</div>';
        throw new Error('Developer Tools Detected');
      }
    };

    // 方法2：重写console方法
    ['log', 'debug', 'info', 'warn', 'error'].forEach(method => {
      const original = console[method];
      console[method] = function(...args) {
        // 记录控制台使用（可选上报）
        SecurityProtection.reportConsoleUsage(method, args);
        original.apply(console, args);
      };
    });

    // 定期检查
    setInterval(devToolsCheck, 1000);
  }

  // DOM结构混淆
  obfuscateDOM() {
    // 为敏感元素添加随机ID
    const sensitiveElements = document.querySelectorAll('[data-sensitive]');
    sensitiveElements.forEach(el => {
      const randomId = 'el_' + Math.random().toString(36).substr(2, 12);
      el.id = randomId;
      el.removeAttribute('data-sensitive');
      
      // 添加混淆类名
      const obfuscatedClass = 'obf_' + Math.random().toString(36).substr(2, 8);
      el.classList.add(obfuscatedClass);
    });

    // 动态修改CSS选择器
    this.obfuscateCSSSelectors();
  }

  // CSS选择器混淆
  obfuscateCSSSelectors() {
    const styleSheets = document.styleSheets;
    for (let i = 0; i < styleSheets.length; i++) {
      try {
        const rules = styleSheets[i].cssRules || styleSheets[i].rules;
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (rule.selectorText && rule.selectorText.includes('[data-protected]')) {
            // 替换保护选择器
            rule.selectorText = rule.selectorText.replace(
              /\[data-protected\]/g, 
              '.protected_' + Math.random().toString(36).substr(2, 6)
            );
          }
        }
      } catch (e) {
        // 跨域样式表可能无法访问
      }
    }
  }

  // 监控用户行为
  monitorUserActions() {
    // 复制保护
    document.addEventListener('copy', (e) => {
      const selection = window.getSelection().toString();
      if (selection.length > 500) {
        e.preventDefault();
        this.showWarning('复制内容过长，请分段复制');
      }
    });

    // 右键菜单保护
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('[data-no-context]')) {
        e.preventDefault();
        this.showWarning('此区域禁止右键操作');
      }
    });

    // 键盘事件监控
    document.addEventListener('keydown', (e) => {
      // 阻止F12和Ctrl+Shift+I
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        return false;
      }
    });
  }

  // API请求保护
  protectAPIRequests() {
    // 重写fetch方法
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      // 添加安全头
      if (args[1]) {
        args[1].headers = {
          ...args[1].headers,
          'X-Security-Token': SecurityProtection.getInstance().apiToken,
          'X-Request-Time': Date.now(),
          'X-Client-Signature': SecurityProtection.generateClientSignature()
        };
      }
      
      return originalFetch.apply(this, args);
    };

    // 重写XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args) {
      this.addEventListener('loadstart', function() {
        this.setRequestHeader('X-Security-Token', SecurityProtection.getInstance().apiToken);
        this.setRequestHeader('X-Request-Time', Date.now());
      });
      return originalOpen.apply(this, args);
    };
  }

  // 检测自动化工具
  detectAutomation() {
    // 检测Headless浏览器
    if (navigator.webdriver || 
        navigator.languages.length === 0 ||
        !window.chrome ||
        window.outerWidth === 0 ||
        window.outerHeight === 0) {
      this.handleAutomationDetection();
    }

    // 检测鼠标移动模式（机器人通常有规律的移动）
    let mouseMovements = [];
    document.addEventListener('mousemove', (e) => {
      mouseMovements.push({
        x: e.clientX,
        y: e.clientY,
        time: Date.now()
      });
      
      // 保留最近10次移动
      if (mouseMovements.length > 10) {
        mouseMovements = mouseMovements.slice(-10);
      }
      
      // 检测规律性移动（机器人特征）
      if (mouseMovements.length === 10) {
        this.analyzeMousePattern(mouseMovements);
      }
    });
  }

  // 分析鼠标移动模式
  analyzeMousePattern(movements) {
    const intervals = [];
    for (let i = 1; i < movements.length; i++) {
      intervals.push(movements[i].time - movements[i-1].time);
    }
    
    // 计算间隔的标准差（机器人间隔通常很规律）
    const avg = intervals.reduce((a, b) => a + b) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev < 10) { // 标准差很小说明很规律
      this.reportSuspiciousBehavior('regular_mouse_movement');
    }
  }

  // 显示警告
  showWarning(message) {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    warning.textContent = message;
    document.body.appendChild(warning);
    
    setTimeout(() => {
      document.body.removeChild(warning);
    }, 3000);
  }

  // 处理自动化检测
  handleAutomationDetection() {
    // 可以采取的措施：
    // 1. 限制功能
    // 2. 要求验证码
    // 3. 记录日志
    // 4. 上报服务器
    
    this.reportSuspiciousBehavior('automation_tool_detected');
  }

  // 上报可疑行为
  static reportSuspiciousBehavior(type, data = {}) {
    // 可以上报到服务器进行记录
    const reportData = {
      type,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...data
    };
    
    // 使用navigator.sendBeacon进行异步上报（页面关闭时也能发送）
    navigator.sendBeacon('/api/security/report', JSON.stringify(reportData));
  }

  // 上报控制台使用
  static reportConsoleUsage(method, args) {
    const data = {
      method,
      args: args.map(arg => typeof arg === 'string' ? arg.substring(0, 100) : typeof arg),
      timestamp: Date.now()
    };
    
    navigator.sendBeacon('/api/security/console', JSON.stringify(data));
  }

  // 生成客户端签名
  static generateClientSignature() {
    const data = `${navigator.userAgent}:${screen.width}x${screen.height}:${navigator.language}`;
    return btoa(data).replace(/=/g, '').slice(0, 16);
  }

  // 单例模式
  static getInstance() {
    if (!SecurityProtection.instance) {
      SecurityProtection.instance = new SecurityProtection();
    }
    return SecurityProtection.instance;
  }
}

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  SecurityProtection.getInstance();
});

// 导出供其他模块使用
window.SecurityProtection = SecurityProtection;