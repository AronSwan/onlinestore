# 爱心表白网页动画设计

## 爱心动画效果
- **动画类型**：漂浮动画
- **效果描述**：爱心轻柔地上下浮动，营造梦幻感
- **实现方式**：CSS动画

## CSS动画代码
```css
.heart-container {
    animation: float 3s ease-in-out infinite;
}

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
```

## 爱心样式设计
```css
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
```

## 文字动画效果
```css
.message-container h1 {
    font-family: 'serif';
    font-size: 3rem;
    color: #d63384;
    text-align: center;
    margin-top: 2rem;
    animation: fadeIn 2s ease-in-out;
    text-shadow: 0 0 10px rgba(255, 105, 180, 0.3);
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
```

## 交互效果设计
```css
.heart-icon:active {
    animation: pulse 0.5s ease-in-out;
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
```

## 响应式设计
```css
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

## 完整CSS示例
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
    background: linear-gradient(135deg, #ffeef8 0%, #f8c8d4 100%);
    font-family: 'Arial', sans-serif;
}

.container {
    text-align: center;
}

.heart-container {
    animation: float 3s ease-in-out infinite;
    margin-bottom: 2rem;
}

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

.message-container h1 {
    font-family: 'serif';
    font-size: 3rem;
    color: #d63384;
    text-align: center;
    margin-top: 2rem;
    animation: fadeIn 2s ease-in-out;
    text-shadow: 0 0 10px rgba(255, 105, 180, 0.3);
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