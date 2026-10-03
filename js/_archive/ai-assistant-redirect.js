// AI助手重定向脚本 - Gucci风格改进版
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：提供AI助手重定向功能，创建交互式对话框和导航按钮，引导用户访问不同服务
// 依赖文件：无

document.addEventListener('DOMContentLoaded', function() {
    // 创建AI助手容器
    const aiContainer = document.createElement('div');
    aiContainer.className = 'ai-assistant-container';
    aiContainer.innerHTML = `
        <div class="ai-dialog">
            <div class="ai-header">
                <span>个人购物助手</span>
                <button class="ai-close">×</button>
            </div>
            <div class="ai-content">
                <button class="ai-option">
                    <svg class="ai-icon" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12,3C7.03,3 3,7.03 3,12C3,16.97 7.03,21 12,21C16.97,21 21,16.97 21,12C21,7.03 16.97,3 12,3M12,19C8.14,19 5,15.86 5,12C5,8.14 8.14,5 12,5C15.86,5 19,8.14 19,12C19,15.86 15.86,19 12,19M13,17V15H11V17H13M13,13V7H11V13H13Z"/>
                    </svg>
                    <span>产品咨询</span>
                </button>
                <button class="ai-option">
                    <svg class="ai-icon" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M3,3H21V7H3V3M9,8H15V13H9V8M3,14H21V18H3V14M9,19H15V21H9V19Z"/>
                    </svg>
                    <span>订单查询</span>
                </button>
                <button class="ai-option">
                    <svg class="ai-icon" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12,3L2,12H5V20H19V12H22L12,3M12,7.7L16,11.2V18H15V14H9V18H8V11.2L12,7.7M12,8.8L9.3,11H14.7L12,8.8Z"/>
                    </svg>
                    <span>专属服务</span>
                </button>
            </div>
        </div>
        <button class="ai-toggle-button">
            <svg class="ai-main-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,10.5A1.5,1.5 0 0,0 10.5,12A1.5,1.5 0 0,0 12,13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 12,10.5M7.5,10.5A1.5,1.5 0 0,0 6,12A1.5,1.5 0 0,0 7.5,13.5A1.5,1.5 0 0,0 9,12A1.5,1.5 0 0,0 7.5,10.5M16.5,10.5A1.5,1.5 0 0,0 15,12A1.5,1.5 0 0,0 16.5,13.5A1.5,1.5 0 0,0 18,12A1.5,1.5 0 0,0 16.5,10.5Z"/>
            </svg>
        </button>
    `;
    document.body.appendChild(aiContainer);

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .ai-assistant-container {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 1000;
            font-family: var(--brand-font-secondary);
        }
        .ai-toggle-button {
            background: #000;
            color: #d4af37;
            border: none;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            /* 确保触摸区域足够大 */
            min-width: 60px;
            min-height: 60px;
            /* 优化触摸性能 */
            touch-action: manipulation;
            -webkit-tap-highlight-color: rgba(212, 175, 55, 0.5);
        }
        .ai-toggle-button:hover {
            transform: scale(1.1);
        }
        .ai-toggle-button:active {
            transform: scale(0.95);
        }
        .ai-dialog {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            width: 280px;
            overflow: hidden;
            transform: translateY(100%);
            opacity: 0;
            transition: all 0.3s ease;
            position: absolute;
            bottom: 70px;
            right: 0;
        }
        .ai-assistant-container.active .ai-dialog {
            transform: translateY(0);
            opacity: 1;
        }
        .ai-header {
            background: #000;
            color: #d4af37;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
        }
        .ai-close {
            background: none;
            border: none;
            color: #d4af37;
            font-size: 1.5rem;
            cursor: pointer;
            line-height: 1;
            /* 确保触摸区域足够大 */
            min-width: 44px;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            /* 优化触摸性能 */
            touch-action: manipulation;
            -webkit-tap-highlight-color: rgba(212, 175, 55, 0.3);
        }
        .ai-close:active {
            transform: scale(0.9);
        }
        .ai-content {
            padding: 15px;
        }
        .ai-option {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            margin-bottom: 10px;
            background: none;
            border: 1px solid #eee;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            /* 确保触摸区域足够大 */
            min-height: 44px;
            /* 优化触摸性能 */
            touch-action: manipulation;
            -webkit-tap-highlight-color: rgba(212, 175, 55, 0.3);
        }
        .ai-option:hover {
            background: #f9f9f9;
            border-color: #ddd;
        }
        .ai-option:active {
            background: rgba(212, 175, 55, 0.1);
            border-color: #d4af37;
            transform: scale(0.98);
        }
        .ai-option:last-child {
            margin-bottom: 0;
        }
        .ai-icon {
            width: 20px;
            height: 20px;
            color: #d4af37;
        }
        .ai-main-icon {
            width: 24px;
            height: 24px;
        }
        @media (max-width: 768px) {
            .ai-assistant-container {
                bottom: 20px;
                right: 20px;
            }
            .ai-toggle-button {
                width: 50px;
                height: 50px;
                min-width: 50px;
                min-height: 50px;
            }
            .ai-dialog {
                width: 260px;
            }
            .ai-option {
                padding: 14px;
                min-height: 48px;
            }
        }
        
        @media (max-width: 575px) {
            .ai-assistant-container {
                bottom: 15px;
                right: 15px;
            }
            .ai-toggle-button {
                width: 56px;
                height: 56px;
                min-width: 56px;
                min-height: 56px;
            }
            .ai-dialog {
                width: 280px;
                right: -10px;
            }
            .ai-option {
                padding: 16px;
                min-height: 52px;
            }
        }
    `;
    document.head.appendChild(style);

    // 添加交互逻辑
    const toggleBtn = document.querySelector('.ai-toggle-button');
    const closeBtn = document.querySelector('.ai-close');
    const options = document.querySelectorAll('.ai-option');
    
    // 确保元素存在后再添加事件监听器
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault(); // 阻止默认行为
            e.stopPropagation(); // 阻止事件冒泡
            aiContainer.classList.toggle('active');
        });
        
        // 添加触摸事件支持
        toggleBtn.addEventListener('touchstart', function(e) {
            e.preventDefault(); // 阻止默认行为
        }, { passive: false });
        
        toggleBtn.addEventListener('touchend', function(e) {
            e.preventDefault(); // 阻止默认行为
            e.stopPropagation(); // 阻止事件冒泡
            aiContainer.classList.toggle('active');
        }, { passive: false });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault(); // 阻止默认行为
            e.stopPropagation(); // 阻止事件冒泡
            aiContainer.classList.remove('active');
        });
        
        // 添加触摸事件支持
        closeBtn.addEventListener('touchstart', function(e) {
            e.preventDefault(); // 阻止默认行为
        }, { passive: false });
        
        closeBtn.addEventListener('touchend', function(e) {
            e.preventDefault(); // 阻止默认行为
            e.stopPropagation(); // 阻止事件冒泡
            aiContainer.classList.remove('active');
        }, { passive: false });
    }
    
    // 为选项按钮添加事件监听器
    options.forEach(option => {
        if (option) {
            option.addEventListener('click', function(e) {
                e.preventDefault(); // 阻止默认行为
                e.stopPropagation(); // 阻止事件冒泡
                // 获取服务类型
                const serviceType = this.querySelector('span').textContent;
                // 使用更可靠的方式导航
                if (serviceType) {
                    const url = '/ai-assistant?service=' + encodeURIComponent(serviceType);
                    // 使用 window.location.replace 而不是 href，以避免历史记录问题
                    window.location.replace(url);
                }
            });
            
            // 添加触摸事件支持
            option.addEventListener('touchstart', function(e) {
                e.preventDefault(); // 阻止默认行为
            }, { passive: false });
            
            option.addEventListener('touchend', function(e) {
                e.preventDefault(); // 阻止默认行为
                e.stopPropagation(); // 阻止事件冒泡
                // 获取服务类型
                const serviceType = this.querySelector('span').textContent;
                // 使用更可靠的方式导航
                if (serviceType) {
                    const url = '/ai-assistant?service=' + encodeURIComponent(serviceType);
                    // 使用 window.location.replace 而不是 href，以避免历史记录问题
                    window.location.replace(url);
                }
            }, { passive: false });
        }
    });
    
    // 添加点击外部关闭功能
    document.addEventListener('click', function(e) {
        if (aiContainer && !aiContainer.contains(e.target)) {
            aiContainer.classList.remove('active');
        }
    });
    
    // 添加触摸外部关闭功能
    document.addEventListener('touchstart', function(e) {
        if (aiContainer && !aiContainer.contains(e.target)) {
            aiContainer.classList.remove('active');
        }
    }, { passive: false });
});