/**
 * NextChat Advanced Integration Script
 * 用于将NextChat Advanced助手集成到主页
 * Version: 1.0.0
 * Date: 2025-09-19
 */

// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：将NextChat Advanced助手集成到网页中，提供内嵌式聊天界面
// 依赖文件：nextchat-advanced-optimized.js

// 导入NextChatAdvanced类
import { NextChatAdvanced } from './nextchat-advanced-optimized.js';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing NextChat Advanced Assistant...');
    
    // 配置NextChat Advanced
    const nextchatConfig = {
        apiKey: '', // 如果需要API密钥，请在此处设置
        model: 'gpt-4-vision-preview',
        voiceEnabled: true,
        autoSpeakEnabled: false,
        imageEnabled: true,
        vectorDBEnabled: true,
        cdnBase: 'https://cdnjs.cloudflare.com/ajax/libs',
        // 设置为默认可见
        autoShow: true,
        // 设置为内嵌模式
        embedded: true,
        // 指定容器元素
        containerId: 'nextchat-container',
    };
    
    // 创建NextChat容器元素
    const nextchatContainer = document.createElement('div');
    nextchatContainer.id = 'nextchat-container';
    nextchatContainer.className = 'nextchat-embedded-container';
    
    // 将容器添加到页面主体
    document.body.appendChild(nextchatContainer);
    
    // 初始化NextChat Advanced
    try {
        // 创建NextChat Advanced实例
        const nextchat = new NextChatAdvanced(nextchatConfig);
        
        // 等待初始化完成
        setTimeout(() => {
            if (nextchat.state && nextchat.state.isInitialized) {
                console.log('NextChat Advanced Assistant initialized successfully');
                
                // 显示聊天窗口
                if (nextchat.elements && nextchat.elements.launcher && nextchat.elements.chatWindow) {
                    // 模拟点击启动器按钮以显示聊天窗口
                    nextchat.elements.launcher.click();
                    
                    // 确保聊天窗口可见
                    nextchat.elements.chatWindow.style.display = 'block';
                    nextchat.elements.chatWindow.style.visibility = 'visible';
                    nextchat.elements.chatWindow.style.opacity = '1';
                    
                    // 隐藏启动器按钮，因为我们已经显示了聊天窗口
                    nextchat.elements.launcher.style.display = 'none';
                }
            } else {
                console.error('NextChat Advanced Assistant failed to initialize');
            }
        }, 2000); // 等待2秒以确保初始化完成
        
    } catch (error) {
        console.error('Error initializing NextChat Advanced:', error);
    }
});

// 添加自定义样式以确保NextChat Advanced在主页中正确显示
const customStyles = document.createElement('style');
customStyles.textContent = `
    /* NextChat Advanced容器样式 */
    .nextchat-embedded-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 380px;
        height: 600px;
        z-index: 9999;
        font-family: 'Helvetica Neue', Arial, sans-serif;
    }
    
    /* 确保NextChat Advanced聊天窗口可见 */
    #nextchat-advanced-container {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        bottom: auto !important;
        right: auto !important;
    }
    
    /* 调整NextChat Advanced聊天窗口样式 */
    #nextchat-advanced-container .nextchat-window {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        bottom: auto !important;
        right: auto !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        border-radius: 12px;
        overflow: hidden;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
    }
    
    /* 隐藏启动器按钮 */
    #nextchat-advanced-container .nextchat-launcher {
        display: none !important;
    }
    
    /* 响应式调整 */
    @media (max-width: 768px) {
        .nextchat-embedded-container {
            width: 90%;
            height: 70%;
            bottom: 10px;
            right: 5%;
            left: 5%;
        }
    }
    
    @media (max-width: 480px) {
        .nextchat-embedded-container {
            width: 95%;
            height: 80%;
            bottom: 5px;
            right: 2.5%;
            left: 2.5%;
        }
    }
`;
document.head.appendChild(customStyles);