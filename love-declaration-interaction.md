# 爱心表白网页交互效果设计

## 交互效果概述
- **交互类型**：爱心爆炸效果
- **效果描述**：点击时爱心周围散发出多个小爱心，然后渐渐消失
- **实现方式**：JavaScript + CSS动画

## HTML结构
```html
<div class="container">
    <div class="heart-container">
        <img src="heart-icon.svg" alt="爱心" class="heart-icon" id="main-heart">
    </div>
    <div class="message-container">
        <h1>吴婷婷，我爱你</h1>
    </div>
</div>

<!-- 小爱心容器 -->
<div id="hearts-container"></div>
```

## CSS样式
```css
/* 主爱心样式 */
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
```

## JavaScript交互代码
```javascript
document.addEventListener('DOMContentLoaded', function() {
    const mainHeart = document.getElementById('main-heart');
    const heartsContainer = document.getElementById('hearts-container');
    
    // 点击爱心时触发爆炸效果
    mainHeart.addEventListener('click', function(e) {
        createHeartExplosion(e);
    });
    
    // 创建爱心爆炸效果
    function createHeartExplosion(e) {
        const heartRect = mainHeart.getBoundingClientRect();
        const centerX = heartRect.left + heartRect.width / 2;
        const centerY = heartRect.top + heartRect.height / 2;
        
        // 创建多个小爱心
        const heartCount = 12;
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
        const distance = 100 + Math.random() * 50; // 随机距离
        
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
});
```

## 完整交互效果代码
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>吴婷婷，我爱你</title>
    <style>
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

        /* 响应式设计 */
        @media (max-width: 768px) {
            .heart-icon {
                width: 150px;
                height: 150px;
            }
            
            .message-container h1 {
                font-size: 2rem;
            }
        }

        @media (max-width: 480px) {
            .heart-icon {
                width: 100px;
                height: 100px;
            }
            
            .message-container h1 {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="heart-container">
            <img src="heart-icon.svg" alt="爱心" class="heart-icon" id="main-heart">
        </div>
        <div class="message-container">
            <h1>吴婷婷，我爱你</h1>
        </div>
    </div>

    <!-- 小爱心容器 -->
    <div id="hearts-container"></div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const mainHeart = document.getElementById('main-heart');
            const heartsContainer = document.getElementById('hearts-container');
            
            // 点击爱心时触发爆炸效果
            mainHeart.addEventListener('click', function(e) {
                createHeartExplosion(e);
            });
            
            // 创建爱心爆炸效果
            function createHeartExplosion(e) {
                const heartRect = mainHeart.getBoundingClientRect();
                const centerX = heartRect.left + heartRect.width / 2;
                const centerY = heartRect.top + heartRect.height / 2;
                
                // 创建多个小爱心
                const heartCount = 12;
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
                const distance = 100 + Math.random() * 50; // 随机距离
                
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
        });
    </script>
</body>
</html>
```

## 交互效果说明
1. **点击触发**：用户点击主爱心时，触发爱心爆炸效果
2. **小爱心生成**：在主爱心周围生成12个小爱心，均匀分布在360度范围内
3. **动画效果**：小爱心从中心点向外扩散，同时逐渐消失
4. **随机性**：每个小爱心的移动距离有轻微随机变化，使效果更自然
5. **性能优化**：动画结束后自动移除小爱心元素，避免DOM节点过多