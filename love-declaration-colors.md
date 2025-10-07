# 爱心表白网页背景和配色方案

## 背景设计
- **背景类型**：粉色系渐变
- **颜色方案**：从浅粉色(#FFE4E6)到深粉色(#FECDD3)的柔和渐变
- **渐变方向**：135度对角线渐变

## 背景CSS代码
```css
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
```

## 配色方案
### 主色调
- **浅粉色**：#FFE4E6（用于背景起始色）
- **深粉色**：#FECDD3（用于背景结束色）
- **玫瑰红**：#DC143C（用于爱心轮廓）
- **热粉色**：#FF69B4（用于爱心渐变中间色）
- **深玫瑰红**：#C71585（用于爱心渐变结束色）

### 辅助色
- **白色**：#FFFFFF（用于文字和爱心高光）
- **文字粉色**：#d63384（用于表白文字）

### 阴影和高光
- **爱心阴影**：rgba(255, 105, 180, 0.5)（粉红色半透明阴影）
- **文字阴影**：rgba(255, 105, 180, 0.3)（粉红色半透明文字阴影）

## 完整背景和配色CSS
```css
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
}

.heart-icon:hover {
    transform: scale(1.1);
}

.heart-icon:active {
    animation: pulse 0.5s ease-in-out;
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

@keyframes pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.2);
    }
    100% {
        transform: scale(1);
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
```

## 配色方案说明
1. **背景渐变**：使用浅粉色到深粉色的柔和渐变，营造温馨浪漫的氛围
2. **爱心颜色**：保留原有的玫瑰红渐变，与背景形成和谐的色彩搭配
3. **文字颜色**：使用深粉色作为文字颜色，确保在背景上有良好的对比度和可读性
4. **阴影效果**：使用粉红色半透明阴影，增强元素的立体感和层次感
5. **整体效果**：统一的粉色系配色方案，传达出温柔、浪漫的情感