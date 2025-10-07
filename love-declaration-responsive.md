# 爱心表白网页响应式设计优化

## 响应式设计概述
- **目标**：确保页面在不同设备上都有良好的显示效果
- **设备覆盖**：桌面电脑、平板电脑、手机
- **断点设置**：768px（平板）、480px（手机）

## 响应式CSS代码
```css
/* 基础样式 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%);
    font-family: 'Arial', sans-serif;
    margin: 0;
    padding: 0;
    overflow: hidden;
}

.container {
    text-align: center;
    padding: 20px;
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 800px;
}

.heart-container {
    animation: float 3s ease-in-out infinite;
    margin-bottom: 2rem;
}

.heart-icon {
    width: 200px;
    height: 200px;
    display: block;
    margin: 0 auto;
    filter: drop-shadow(0 0 10px rgba(255, 105, 180, 0.5));
    transition: transform 0.3s ease;
    cursor: pointer;
}

.heart-icon:hover {
    transform: scale(1.1);
}

.message-container h1 {
    font-family: 'serif';
    font-size: 3rem;
    color: #d63384;
    text-align: center;
    margin-top: 2rem;
    animation: fadeIn 2s ease-in-out;
    text-shadow: 0 0 10px rgba(255, 105, 180, 0.3);
    word-break: break-word;
    padding: 0 15px;
}

/* 小爱心样式 */
.small-heart {
    position: absolute;
    width: 20px;
    height: 20px;
    background-image: url('heart-icon.svg');
    background-size: contain;
    background-repeat: no-repeat;
    pointer-events: none;
    opacity: 0;
    z-index: 100;
}

/* 小爱心动画 */
@keyframes heart-explode {
    0% {
        transform: translate(0, 0) scale(0);
        opacity: 1;
    }
    50% {
        opacity: 1;
    }
    100% {
        transform: translate(var(--tx), var(--ty)) scale(1);
        opacity: 0;
    }
}

/* 应用小爱心动画 */
.small-heart.animate {
    animation: heart-explode 1s ease-out forwards;
}

/* 动画关键帧 */
@keyframes float {
    0% {
        transform: translateY(0px);
    }
    50% {
        transform: translateY(-20px);
    }
    100% {
        transform: translateY(0px);
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 平板设备响应式样式 */
@media (max-width: 768px) {
    .container {
        padding: 15px;
    }
    
    .heart-icon {
        width: 150px;
        height: 150px;
    }
    
    .message-container h1 {
        font-size: 2rem;
        margin-top: 1.5rem;
    }
    
    .heart-container {
        margin-bottom: 1.5rem;
    }
    
    /* 调整漂浮动画幅度 */
    @keyframes float {
        0% {
            transform: translateY(0px);
        }
        50% {
            transform: translateY(-15px);
        }
        100% {
            transform: translateY(0px);
        }
    }
}

/* 手机设备响应式样式 */
@media (max-width: 480px) {
    .container {
        padding: 10px;
    }
    
    .heart-icon {
        width: 100px;
        height: 100px;
    }
    
    .message-container h1 {
        font-size: 1.5rem;
        margin-top: 1rem;
        line-height: 1.3;
    }
    
    .heart-container {
        margin-bottom: 1rem;
    }
    
    /* 调整漂浮动画幅度 */
    @keyframes float {
        0% {
            transform: translateY(0px);
        }
        50% {
            transform: translateY(-10px);
        }
        100% {
            transform: translateY(0px);
        }
    }
    
    /* 调整小爱心大小 */
    .small-heart {
        width: 15px;
        height: 15px;
    }
}

/* 横屏模式优化 */
@media (max-height: 500px) and (orientation: landscape) {
    .container {
        flex-direction: row;
        justify-content: space-around;
        align-items: center;
    }
    
    .heart-container {
        margin-bottom: 0;
        margin-right: 2rem;
    }
    
    .message-container h1 {
        margin-top: 0;
        font-size: 2rem;
    }
    
    @media (max-width: 768px) {
        .heart-container {
            margin-right: 1rem;
        }
        
        .message-container h1 {
            font-size: 1.5rem;
        }
    }
    
    @media (max-width: 480px) {
        .container {
            flex-direction: column;
        }
        
        .heart-container {
            margin-right: 0;
            margin-bottom: 1rem;
        }
        
        .message-container h1 {
            margin-top: 0.5rem;
            font-size: 1.2rem;
        }
    }
}

/* 高分辨率设备优化 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .heart-icon {
        filter: drop-shadow(0 0 15px rgba(255, 105, 180, 0.7));
    }
    
    .message-container h1 {
        text-shadow: 0 0 15px rgba(255, 105, 180, 0.5);
    }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
    body {
        background: linear-gradient(135deg, #2d1b2e 0%, #4a2c4a 100%);
    }
    
    .message-container h1 {
        color: #ff9eb5;
        text-shadow: 0 0 10px rgba(255, 105, 180, 0.5);
    }
}
```

## JavaScript响应式优化
```javascript
document.addEventListener('DOMContentLoaded', function() {
    const mainHeart = document.getElementById('main-heart');
    const heartsContainer = document.getElementById('hearts-container');
    
    // 根据屏幕大小调整爆炸效果
    function getHeartCount() {
        const width = window.innerWidth;
        if (width <= 480) {
            return 8; // 手机上减少小爱心数量
        } else if (width <= 768) {
            return 10; // 平板上适中数量
        } else {
            return 12; // 桌面上标准数量
        }
    }
    
    // 根据屏幕大小调整爆炸距离
    function getExplosionDistance() {
        const width = window.innerWidth;
        if (width <= 480) {
            return 60 + Math.random() * 30; // 手机上较短距离
        } else if (width <= 768) {
            return 80 + Math.random() * 40; // 平板上适中距离
        } else {
            return 100 + Math.random() * 50; // 桌面上标准距离
        }
    }
    
    // 点击爱心时触发爆炸效果
    mainHeart.addEventListener('click', function(e) {
        createHeartExplosion(e);
    });
    
    // 创建爱心爆炸效果
    function createHeartExplosion(e) {
        const heartRect = mainHeart.getBoundingClientRect();
        const centerX = heartRect.left + heartRect.width / 2;
        const centerY = heartRect.top + heartRect.height / 2;
        
        // 根据屏幕大小创建合适数量的小爱心
        const heartCount = getHeartCount();
        for (let i = 0; i < heartCount; i++) {
            createSmallHeart(centerX, centerY, i, heartCount);
        }
    }
    
    // 创建单个小爱心
    function createSmallHeart(x, y, index, total) {
        const smallHeart = document.createElement('div');
        smallHeart.className = 'small-heart';
        
        // 计算每个小爱心的方向（360度均匀分布）
        const angle = (index / total) * Math.PI * 2;
        const distance = getExplosionDistance(); // 根据屏幕大小调整距离
        
        // 设置CSS变量，用于动画中的位移
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        smallHeart.style.setProperty('--tx', `${tx}px`);
        smallHeart.style.setProperty('--ty', `${ty}px`);
        
        // 设置初始位置
        smallHeart.style.left = `${x}px`;
        smallHeart.style.top = `${y}px`;
        
        // 添加到容器
        heartsContainer.appendChild(smallHeart);
        
        // 触发动画
        setTimeout(() => {
            smallHeart.classList.add('animate');
        }, 10);
        
        // 动画结束后移除元素
        setTimeout(() => {
            smallHeart.remove();
        }, 1000);
    }
    
    // 窗口大小改变时重新计算
    window.addEventListener('resize', function() {
        // 可以在这里添加窗口大小改变时的处理逻辑
    });
});
```

## 响应式设计说明
1. **断点设置**：设置了768px和480px两个主要断点，分别针对平板和手机设备
2. **元素缩放**：爱心和文字大小根据屏幕尺寸自动调整
3. **间距优化**：不同设备上的间距和边距进行了适当调整
4. **动画调整**：漂浮动画的幅度根据屏幕大小进行了优化
5. **横屏模式**：特别针对横屏模式进行了布局优化
6. **高分辨率设备**：为高分辨率设备提供了更清晰的阴影效果
7. **暗色模式**：支持系统暗色模式，提供更好的用户体验
8. **JavaScript优化**：根据屏幕大小动态调整爆炸效果的小爱心数量和距离