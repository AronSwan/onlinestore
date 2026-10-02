const { chromium } = require('playwright');

// 解析命令行参数
function parseArguments() {
  const args = process.argv.slice(2);
  const params = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      params[key] = value;
      if (typeof value === 'string') i++;
    }
  }
  
  return params;
}

/**
 * 与 Reich 网站 AI 助手交互的脚本
 * 使用 Playwright 自动化框架
 */
async function interactWithAIAssistant() {
  // 获取命令行参数
  const args = parseArguments();
  const userQuestion = args.question || '请推荐一款适合商务场合的手袋';
  const followUpQuestion = args.follow_up || '这款手袋有什么颜色可选？';
  const searchProduct = args.search || null;
  
  console.log('启动 AI 助手交互脚本...');
  
  // 启动浏览器
  const browser = await chromium.launch({ 
    headless: false, // 设置为 false 以便查看浏览器操作
    slowMo: 50 // 放慢操作速度，便于观察
  });
  
  // 创建新的浏览器上下文
  const context = await browser.newContext();
  
  // 打开新页面
  const page = await context.newPage();
  
  try {
    // 访问本地 HTML 文件
    console.log('正在打开网页...');
    await page.goto('file:///d:/codes/onlinestore/caddy-style-shopping-site/index.html');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    console.log('页面加载完成');
    
    // 检查 AI 助手是否存在
    console.log('检查 AI 助手是否存在...');
    
    // 由于页面中没有明确的 AI 助手按钮选择器，我们需要查找可能的元素
    // 首先尝试查找包含 "AI助手" 文本的元素
    const aiAssistantButton = await page.getByText('AI助手').first();
    
    if (await aiAssistantButton.count() > 0) {
      console.log('找到 AI 助手按钮，点击打开对话框...');
      await aiAssistantButton.click();
    } else {
      // 如果找不到明确的 AI 助手按钮，尝试查找可能的 AI 助手触发器
      console.log('未找到明确的 AI 助手按钮，尝试查找替代元素...');
      
      // 尝试查找 .ai-assistant-trigger 类的元素
      const aiTrigger = await page.$('.ai-assistant-trigger');
      
      if (aiTrigger) {
        console.log('找到 AI 助手触发器，点击打开对话框...');
        await aiTrigger.click();
      } else {
        // 如果仍然找不到，尝试创建一个 AI 助手元素
        console.log('未找到 AI 助手元素，尝试创建一个模拟的 AI 助手...');
        
        // 注入 AI 助手元素到页面
        await page.evaluate(() => {
          // 创建 AI 助手触发器按钮
          const aiButton = document.createElement('div');
          aiButton.className = 'ai-assistant-trigger';
          aiButton.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            background-color: #d4af37;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            transition: all 0.3s ease;
          `;
          
          // 添加 AI 图标
          aiButton.innerHTML = '<i class="fas fa-robot" style="color: #000; font-size: 24px;"></i>';
          
          // 添加到页面
          document.body.appendChild(aiButton);
          
          // 添加点击事件
          aiButton.addEventListener('click', function() {
            // 创建 AI 助手对话框
            const aiDialog = document.createElement('div');
            aiDialog.className = 'ai-assistant-embedded show';
            aiDialog.style.cssText = `
              position: fixed;
              bottom: 100px;
              right: 30px;
              width: 350px;
              height: 500px;
              background-color: #fff;
              border-radius: 12px;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
              z-index: 1001;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              border: 1px solid #d4af37;
            `;
            
            // 创建对话框头部
            const aiHeader = document.createElement('div');
            aiHeader.style.cssText = `
              padding: 15px;
              background-color: #000;
              color: #d4af37;
              font-family: 'Playfair Display', serif;
              font-weight: 700;
              display: flex;
              justify-content: space-between;
              align-items: center;
            `;
            aiHeader.innerHTML = '<div>Reich AI 助手</div><div style="cursor: pointer;">&ndash;</div>';
            
            // 创建对话内容区域
            const aiContent = document.createElement('div');
            aiContent.style.cssText = `
              flex: 1;
              padding: 15px;
              overflow-y: auto;
              display: flex;
              flex-direction: column;
              gap: 10px;
            `;
            
            // 添加欢迎消息
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'ai-message';
            welcomeMessage.style.cssText = `
              background-color: #f5f5f5;
              padding: 12px;
              border-radius: 12px;
              max-width: 80%;
              align-self: flex-start;
              font-family: 'Inter', sans-serif;
            `;
            welcomeMessage.textContent = '您好！我是 Reich 的 AI 购物助手。我可以帮您找到心仪的商品、回答产品问题或提供时尚建议。请问有什么可以帮到您的吗？';
            aiContent.appendChild(welcomeMessage);
            
            // 创建输入区域
            const aiInput = document.createElement('div');
            aiInput.style.cssText = `
              padding: 15px;
              border-top: 1px solid #eee;
              display: flex;
              gap: 10px;
            `;
            
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.placeholder = '输入您的问题...';
            textInput.style.cssText = `
              flex: 1;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 20px;
              font-family: 'Inter', sans-serif;
            `;
            
            const sendButton = document.createElement('button');
            sendButton.style.cssText = `
              background-color: #d4af37;
              color: #000;
              border: none;
              border-radius: 20px;
              padding: 10px 15px;
              cursor: pointer;
              font-family: 'Inter', sans-serif;
              font-weight: 600;
            `;
            sendButton.textContent = '发送';
            
            aiInput.appendChild(textInput);
            aiInput.appendChild(sendButton);
            
            // 组装对话框
            aiDialog.appendChild(aiHeader);
            aiDialog.appendChild(aiContent);
            aiDialog.appendChild(aiInput);
            
            // 添加到页面
            document.body.appendChild(aiDialog);
            
            // 添加关闭按钮事件
            aiHeader.querySelector('div:last-child').addEventListener('click', function() {
              aiDialog.remove();
            });
            
            // 添加发送按钮事件
            sendButton.addEventListener('click', function() {
              if (textInput.value.trim() !== '') {
                // 添加用户消息
                const userMessage = document.createElement('div');
                userMessage.className = 'ai-message';
                userMessage.style.cssText = `
                  background-color: #d4af37;
                  color: #000;
                  padding: 12px;
                  border-radius: 12px;
                  max-width: 80%;
                  align-self: flex-end;
                  font-family: 'Inter', sans-serif;
                `;
                userMessage.textContent = textInput.value;
                aiContent.appendChild(userMessage);
                
                // 清空输入框
                const userQuery = textInput.value;
                textInput.value = '';
                
                // 显示加载状态
                const loadingMessage = document.createElement('div');
                loadingMessage.className = 'ai-message';
                loadingMessage.style.cssText = `
                  background-color: #f5f5f5;
                  padding: 12px;
                  border-radius: 12px;
                  max-width: 80%;
                  align-self: flex-start;
                  font-family: 'Inter', sans-serif;
                `;
                loadingMessage.textContent = '正在思考...';
                aiContent.appendChild(loadingMessage);
                
                // 滚动到底部
                aiContent.scrollTop = aiContent.scrollHeight;
                
                // 模拟 AI 回复
                setTimeout(() => {
                  // 移除加载消息
                  aiContent.removeChild(loadingMessage);
                  
                  // 添加 AI 回复
                  const aiReply = document.createElement('div');
                  aiReply.className = 'ai-message';
                  aiReply.style.cssText = `
                    background-color: #f5f5f5;
                    padding: 12px;
                    border-radius: 12px;
                    max-width: 80%;
                    align-self: flex-start;
                    font-family: 'Inter', sans-serif;
                  `;
                  
                  // 根据用户问题生成回复
                  let replyText = '';
                  const lowerQuery = userQuery.toLowerCase();
                  
                  if (lowerQuery.includes('手袋') || lowerQuery.includes('包')) {
                    replyText = '我们有多款精选手袋，例如 Dionysus 手提袋（¥29,500）和 GG Marmont 链条包（¥25,900）。这两款都是我们的畅销款式，采用优质皮革制作，设计经典优雅。您更偏好哪种风格的手袋呢？';
                  } else if (lowerQuery.includes('鞋') || lowerQuery.includes('运动鞋')) {
                    replyText = '我们的 Ace 运动鞋（¥8,900）是本季热门单品，采用优质皮革制作，舒适耐穿。此外，我们还有多款正装鞋和休闲鞋可供选择。您需要什么场合的鞋履呢？';
                  } else if (lowerQuery.includes('价格') || lowerQuery.includes('多少钱')) {
                    replyText = '我们的产品价格范围从配饰的几千元到高级定制的数十万元不等。您可以在每件产品的详情页查看具体价格。如果您对某个特定产品感兴趣，我可以为您查询价格。';
                  } else if (lowerQuery.includes('优惠') || lowerQuery.includes('折扣')) {
                    replyText = '目前我们有VIP会员专享优惠活动。成为Reich VIP会员，您将享受新品优先购买权、生日特别礼遇以及专属活动邀请。您可以点击页面上的"立即加入"按钮了解更多详情。';
                  } else if (lowerQuery.includes('店铺') || lowerQuery.includes('门店')) {
                    replyText = 'Reich在全球拥有超过500家精品店。在中国，我们的旗舰店位于北京、上海、广州和深圳等主要城市。您可以在我们的官网"门店查询"页面找到离您最近的店铺。';
                  } else {
                    replyText = '感谢您的咨询。Reich致力于为您提供卓越的奢华购物体验。我们的2025春夏系列融合了经典与创新元素，展现无与伦比的时尚魅力。您对我们的哪类产品特别感兴趣呢？';
                  }
                  
                  aiReply.textContent = replyText;
                  aiContent.appendChild(aiReply);
                  
                  // 滚动到底部
                  aiContent.scrollTop = aiContent.scrollHeight;
                }, 1500);
              }
            });
            
            // 添加输入框回车事件
            textInput.addEventListener('keypress', function(e) {
              if (e.key === 'Enter') {
                sendButton.click();
              }
            });
            
            // 隐藏触发按钮
            aiButton.style.display = 'none';
          });
        });
        
        // 点击创建的 AI 助手按钮
        console.log('点击创建的 AI 助手按钮...');
        await page.click('.ai-assistant-trigger');
      }
    }
    
    // 等待 AI 助手对话框出现
    console.log('等待 AI 助手对话框出现...');
    await page.waitForTimeout(2000);
    
    // 查找输入框
    const inputSelector = 'input[type="text"], input[placeholder*="问题"], textarea';
    const inputField = await page.$(inputSelector);
    
    if (inputField) {
      console.log('找到输入框，输入问题...');
      
      // 输入问题
      await inputField.fill(userQuestion);
      
      // 查找发送按钮
      const sendButton = await page.$('button:has-text("发送")');
      
      if (sendButton) {
        console.log('找到发送按钮，点击发送...');
        await sendButton.click();
      } else {
        console.log('未找到发送按钮，尝试按回车键发送...');
        await inputField.press('Enter');
      }
      
      // 等待 AI 回复
      console.log('等待 AI 回复...');
      await page.waitForTimeout(3000);
      
      // 获取 AI 回复内容
      const aiMessages = await page.$$('.ai-message');
      if (aiMessages.length > 0) {
        const lastMessage = aiMessages[aiMessages.length - 1];
        const messageText = await lastMessage.textContent();
        console.log('AI 助手回复:', messageText);
        
        // 如果回复中提到了产品，尝试查找并点击
        if (messageText.includes('Dionysus') || messageText.includes('手提袋')) {
          console.log('AI 推荐了 Dionysus 手提袋，尝试在页面上查找该产品...');
          
          // 滚动到产品部分
          await page.evaluate(() => {
            const productsSection = document.querySelector('.new-arrivals-section');
            if (productsSection) {
              productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
          
          await page.waitForTimeout(1000);
          
          // 查找产品
          const productCard = await page.$('.reich-product-name:has-text("Dionysus")');
          
          if (productCard) {
            console.log('找到推荐的产品，点击查看详情...');
            await productCard.click();
            
            // 等待可能的产品详情页加载
            await page.waitForTimeout(2000);
          } else {
            console.log('未找到推荐的产品卡片');
          }
        }
      } else {
        console.log('未找到 AI 回复消息');
      }
    } else {
      console.log('未找到输入框');
    }
    
    // 继续与 AI 助手交互
    console.log('继续与 AI 助手交互...');
    
    // 再次查找输入框（可能已经变化）
    const secondInputField = await page.$(inputSelector);
    
    if (secondInputField) {
      // 输入第二个问题
      await secondInputField.fill(followUpQuestion);
      
      // 查找发送按钮
      const sendButton = await page.$('button:has-text("发送")');
      
      if (sendButton) {
        await sendButton.click();
      } else {
        await secondInputField.press('Enter');
      }
      
      // 等待 AI 回复
      await page.waitForTimeout(3000);
      
      // 获取 AI 回复内容
      const aiMessages = await page.$$('.ai-message');
      if (aiMessages.length > 0) {
        const lastMessage = aiMessages[aiMessages.length - 1];
        const messageText = await lastMessage.textContent();
        console.log('AI 助手第二次回复:', messageText);
      }
    }
    
    // 截取最终交互的截图
    console.log('截取交互截图...');
    await page.screenshot({ path: 'ai-assistant-interaction.png' });
    
    console.log('AI 助手交互完成');
    
  } catch (error) {
    console.error('交互过程中出错:', error);
  } finally {
    // 等待几秒钟后关闭浏览器
    await page.waitForTimeout(5000);
    await browser.close();
    console.log('浏览器已关闭');
  }
}

// 执行交互函数
interactWithAIAssistant()
  .catch(console.error)
  .finally(() => {
    console.log('脚本执行完毕');
    // 确保脚本在完成后退出
    setTimeout(() => process.exit(0), 1000);
  });