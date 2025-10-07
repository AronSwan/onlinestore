// 触摸优化脚本
// 作者: AI助手
// 时间: 2025-09-25 16:02:15
// 用途：优化移动设备上的触摸交互体验
// 依赖文件：无

// 存储事件监听器引用，以便后续移除
const touchListeners = new Map();

/**
 * 初始化触摸优化功能
 */
function initTouchOptimization() {
    try {
        console.log('初始化触摸优化功能');
        
        // 添加触摸监听器
        addTouchListeners();
        
        // 优化按钮触摸区域
        optimizeButtonTouchAreas();
        
        // 添加触摸反馈效果
        addTouchFeedbackEffects();
        
        // 优化手势操作
        optimizeGestures();
        
        // 检测设备并应用优化
        detectDeviceAndApplyOptimizations();
    } catch (error) {
        console.error('触摸优化初始化错误:', error);
    }
}

// 清理函数
function cleanupTouchOptimization() {
    removeTouchListeners();
    console.log('触摸优化功能已清理');
}

/**
 * 添加触摸监听器
 */
function addTouchListeners() {
    // 为所有交互元素添加触摸监听器
    const interactiveElements = document.querySelectorAll('button, a, [role="button"], .swipeable, .draggable');
    
    interactiveElements.forEach(element => {
        // 存储监听器引用
        const listeners = {
            touchstart: handleTouchStart,
            touchend: handleTouchEnd,
            touchmove: handleTouchMove,
        };
        
        // 添加监听器
        element.addEventListener('touchstart', listeners.touchstart, { passive: true });
        element.addEventListener('touchend', listeners.touchend, { passive: true });
        element.addEventListener('touchmove', listeners.touchmove, { passive: true });
        
        // 存储引用
        touchListeners.set(element, listeners);
    });
}

/**
 * 移除触摸监听器
 */
function removeTouchListeners() {
    touchListeners.forEach((listeners, element) => {
        if (element) {
            element.removeEventListener('touchstart', listeners.touchstart, { passive: true });
            element.removeEventListener('touchend', listeners.touchend, { passive: true });
            element.removeEventListener('touchmove', listeners.touchmove, { passive: true });
        }
    });
    
    // 清空Map
    touchListeners.clear();
}

/**
 * 处理触摸开始事件
 */
function handleTouchStart(e) {
    // 添加触摸反馈
    triggerHapticFeedback();
    
    // 添加视觉反馈
    if (e.target.classList.contains('touch-feedback')) {
        e.target.classList.add('touch-active');
    }
}

/**
 * 处理触摸结束事件
 */
function handleTouchEnd(e) {
    // 移除视觉反馈
    if (e.target.classList.contains('touch-active')) {
        e.target.classList.remove('touch-active');
    }
}

/**
 * 处理触摸移动事件
 */
function handleTouchMove(e) {
    // 可以在这里添加滑动检测逻辑
}

// 使用防抖函数优化性能
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// 缓存已处理的元素
const processedElements = new WeakSet();

/**
 * 优化按钮触摸区域
 */
const optimizeButtonTouchAreas = debounce(() => {
    const buttons = document.querySelectorAll('button, a, [role="button"]');
    
    buttons.forEach(button => {
        // 跳过已处理的元素
        if (processedElements.has(button)) return;
        
        const computedStyle = window.getComputedStyle(button);
        const padding = 
            parseInt(computedStyle.paddingTop) +
            parseInt(computedStyle.paddingBottom) +
            parseInt(computedStyle.paddingLeft) +
            parseInt(computedStyle.paddingRight);
        
        // 确保触摸区域至少为48x48像素
        if (button.offsetWidth < 48 || button.offsetHeight < 48) {
            // 添加样式以增加触摸区域
            if (!button.classList.contains('touch-optimized')) {
                button.classList.add('touch-optimized');
            }
        }
        
        // 标记为已处理
        processedElements.add(button);
    });
}, 100); // 100ms防抖延迟

/**
 * 添加触摸反馈效果
 */
function addTouchFeedbackEffects() {
    // 添加触摸反馈效果
    const feedbackElements = document.querySelectorAll('.touch-feedback, button, a');
    
    feedbackElements.forEach(element => {
        element.classList.add('touch-feedback');
    });
}

/**
 * 优化手势操作
 */
function optimizeGestures() {
    // 检测可滑动元素
    const swipeableElements = document.querySelectorAll('.swipeable, .horizontal-scroll, .carousel');
    
    // 设置滑动阈值
    const SWIPE_THRESHOLD = 50;
    const DRAG_THRESHOLD = 20;
    
    swipeableElements.forEach(element => {
        let startX, startY;
        let currentX, currentY;
        let isDragging = false;
        
        element.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isDragging = false;
        }, { passive: true });
        
        element.addEventListener('touchmove', function(e) {
            if (!startX || !startY) return;
            
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
            
            const diffX = startX - currentX;
            const diffY = startY - currentY;
            
            // 判断是否开始拖动
            if (Math.abs(diffX) > DRAG_THRESHOLD || Math.abs(diffY) > DRAG_THRESHOLD) {
                isDragging = true;
            }
            
            // 产品卡片左滑拖拽效果
            if (element.classList.contains('product-card') && Math.abs(diffX) > Math.abs(diffY)) {
                // 只允许向左滑动，最大滑动距离为150px或宽度的40%
                const maxSwipeDistance = Math.min(150, element.offsetWidth * 0.4);
                const swipeDistance = Math.max(-maxSwipeDistance, Math.min(0, -diffX));
                
                element.style.transform = `translateX(${swipeDistance}px)`;
                e.preventDefault();
            }
        }, { passive: false });
        
        element.addEventListener('touchend', function() {
            if (!isDragging) return;
            
            const diffX = startX - currentX;
            
            // 如果是产品卡片，恢复位置
            if (element.classList.contains('product-card')) {
                element.style.transform = 'translateX(0)';
                element.style.transition = 'transform 0.3s ease-out';
                
                // 重置过渡效果
                setTimeout(() => {
                    element.style.transition = '';
                }, 300);
            }
            
            // 重置起始位置
            startX = null;
            startY = null;
            currentX = null;
            currentY = null;
            isDragging = false;
        }, { passive: true });
    });
}

/**
 * 检测设备并应用优化
 */
function detectDeviceAndApplyOptimizations() {
    const isMobile = isTouchDevice();
    
    if (isMobile) {
        // 移动设备优化
        document.body.classList.add('mobile-device');
        
        // 增强产品卡片滑动删除功能
        enhanceProductCardSwipeDelete();
        
        // 添加长按功能
        addLongPress();
        
        // 添加双击缩放
        addDoubleTapZoom();
        
        // 添加捏合缩放
        addPinchZoom();
        
        // 添加滑动导航
        addSwipeNavigation();
    } else {
        // 桌面设备优化
        document.body.classList.add('desktop-device');
    }
}

/**
 * 增强产品卡片滑动删除功能
 */
function enhanceProductCardSwipeDelete() {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        let startX, currentX;
        let isDragging = false;
        
        // 为产品卡片添加收藏/删除按钮
        if (!card.querySelector('.card-actions')) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'card-actions';
            actionsContainer.innerHTML = `
                <button class="btn-wishlist">收藏</button>
                <button class="btn-delete">删除</button>
            `;
            
            card.appendChild(actionsContainer);
        }
        
        card.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            currentX = startX;
            isDragging = false;
        }, { passive: true });
        
        card.addEventListener('touchmove', function(e) {
            if (!startX) return;
            
            currentX = e.touches[0].clientX;
            const diffX = startX - currentX;
            
            // 只允许向左滑动
            if (diffX > 0) {
                // 最大滑动距离为150px
                const swipeDistance = Math.min(150, diffX);
                card.style.transform = `translateX(-${swipeDistance}px)`;
                e.preventDefault();
                isDragging = true;
            }
        }, { passive: false });
        
        card.addEventListener('touchend', function() {
            if (!isDragging) return;
            
            const diffX = startX - currentX;
            
            // 如果滑动距离超过阈值，显示操作按钮
            if (diffX > 80) {
                card.style.transform = 'translateX(-150px)';
            } else {
                // 否则恢复位置
                card.style.transform = 'translateX(0)';
            }
            
            card.style.transition = 'transform 0.3s ease-out';
            
            // 重置过渡效果
            setTimeout(() => {
                card.style.transition = '';
            }, 300);
            
            startX = null;
            currentX = null;
            isDragging = false;
        }, { passive: true });
        
        // 点击关闭操作按钮
        const closeActions = () => {
            card.style.transform = 'translateX(0)';
            card.style.transition = 'transform 0.3s ease-out';
            
            setTimeout(() => {
                card.style.transition = '';
            }, 300);
        };
        
        // 为操作按钮添加点击事件
        const actionButtons = card.querySelectorAll('.card-actions button');
        actionButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                closeActions();
            });
        });
        
        // 为产品卡片添加点击事件，关闭操作按钮
        card.addEventListener('click', function() {
            if (card.style.transform.includes('-150px')) {
                closeActions();
            }
        });
    });
}

/**
 * 为产品图片添加双击缩放
 */
function addProductImageZoom() {
    const productImages = document.querySelectorAll('.product-image, .product-card img');
    
    productImages.forEach(image => {
        let lastTap = 0;
        
        image.addEventListener('touchstart', function(e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            // 判断是否为双击
            if (tapLength < 300 && tapLength > 0) {
                // 切换缩放状态
                if (this.style.transform === 'scale(1.5)') {
                    this.style.transform = 'scale(1)';
                } else {
                    this.style.transform = 'scale(1.5)';
                }
                
                this.style.transition = 'transform 0.3s ease-out';
                this.style.zIndex = '1000';
                this.style.position = 'relative';
                
                e.preventDefault();
            }
            
            lastTap = currentTime;
        }, { passive: false });
    });
}

/**
 * 添加捏合缩放功能
 */
function addPinchZoom() {
    const zoomableElements = document.querySelectorAll('.zoomable, .product-image, .product-card img');
    
    zoomableElements.forEach(element => {
        let initialDistance = null;
        let initialScale = 1;
        let currentScale = 1;
        let lastTouch = null;
        
        element.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                // 计算两指之间的距离
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                initialDistance = Math.sqrt(dx * dx + dy * dy);
                initialScale = currentScale;
                
                // 阻止默认行为
                e.preventDefault();
            } else if (e.touches.length === 1) {
                lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        }, { passive: false });
        
        element.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2 && initialDistance) {
                // 计算当前两指之间的距离
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                
                // 计算缩放比例
                const scale = initialScale * (currentDistance / initialDistance);
                
                // 限制缩放范围
                currentScale = Math.max(1, Math.min(3, scale));
                
                // 应用缩放
                element.style.transform = `scale(${currentScale})`;
                element.style.transition = 'transform 0.1s ease-out';
                element.style.zIndex = '1000';
                element.style.position = 'relative';
                
                // 阻止默认行为
                e.preventDefault();
            } else if (e.touches.length === 1 && currentScale > 1 && lastTouch) {
                // 单指拖动
                const currentTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                const deltaX = currentTouch.x - lastTouch.x;
                const deltaY = currentTouch.y - lastTouch.y;
                
                // 获取当前位置
                const currentTransform = window.getComputedStyle(element).transform;
                let translateX = 0;
                let translateY = 0;
                
                if (currentTransform !== 'none') {
                    const matrix = new DOMMatrix(currentTransform);
                    translateX = matrix.e;
                    translateY = matrix.f;
                }
                
                // 应用新位置
                element.style.transform = `translate(${translateX + deltaX}px, ${translateY + deltaY}px) scale(${currentScale})`;
                
                // 更新最后触摸位置
                lastTouch = currentTouch;
                
                // 阻止默认行为
                e.preventDefault();
            }
        }, { passive: false });
        
        element.addEventListener('touchend', function(e) {
            if (e.touches.length === 0) {
                // 重置初始距离
                initialDistance = null;
                lastTouch = null;
            }
        }, { passive: true });
    });
}

/**
 * 添加长按功能
 */
function addLongPress() {
    const longPressElements = document.querySelectorAll('.long-press, .product-card, .wishlist-item');
    
    longPressElements.forEach(element => {
        let pressTimer;
        let isLongPress = false;
        
        element.addEventListener('touchstart', function() {
            pressTimer = setTimeout(() => {
                isLongPress = true;
                
                // 显示长按菜单或执行长按操作
                if (element.classList.contains('product-card')) {
                    showGestureHint('长按可查看更多选项');
                    triggerHapticFeedback();
                }
            }, 500); // 长按阈值为500ms
        }, { passive: true });
        
        element.addEventListener('touchend', function() {
            clearTimeout(pressTimer);
            
            if (!isLongPress) {
                // 如果不是长按，允许正常的点击操作
            }
            
            isLongPress = false;
        }, { passive: true });
        
        element.addEventListener('touchmove', function() {
            clearTimeout(pressTimer);
            isLongPress = false;
        }, { passive: true });
        
        element.addEventListener('touchcancel', function() {
            clearTimeout(pressTimer);
            isLongPress = false;
        }, { passive: true });
    });
}

/**
 * 添加双击缩放
 */
function addDoubleTapZoom() {
    const zoomElements = document.querySelectorAll('.zoom-on-double-tap, .product-image');
    
    zoomElements.forEach(element => {
        let lastTapTime = 0;
        let currentZoom = 1;
        
        element.addEventListener('touchstart', function(e) {
            const currentTime = new Date().getTime();
            const tapInterval = currentTime - lastTapTime;
            
            // 判断是否为双击（间隔小于300ms）
            if (tapInterval < 300 && tapInterval > 0) {
                // 切换缩放状态
                if (currentZoom === 1) {
                    currentZoom = 1.5;
                } else {
                    currentZoom = 1;
                }
                
                // 应用缩放
                element.style.transform = `scale(${currentZoom})`;
                element.style.transition = 'transform 0.3s ease-out';
                element.style.zIndex = '1000';
                element.style.position = 'relative';
                
                // 设置变换原点为点击位置
                const rect = element.getBoundingClientRect();
                const x = (e.touches[0].clientX - rect.left) / rect.width;
                const y = (e.touches[0].clientY - rect.top) / rect.height;
                
                element.style.transformOrigin = `${x * 100}% ${y * 100}%`;
                
                // 阻止默认行为
                e.preventDefault();
            }
            
            lastTapTime = currentTime;
        }, { passive: false });
    });
}

/**
 * 添加滑动导航
 */
function addSwipeNavigation() {
    const containers = document.querySelectorAll('.swipe-navigation');
    
    containers.forEach(container => {
        let startX, startY, distX, distY;
        let currentIndex = 0;
        const items = container.querySelectorAll('.swipe-item');
        
        if (items.length <= 1) return;
        
        // 初始化显示
        items.forEach((item, index) => {
            item.style.display = index === 0 ? 'block' : 'none';
        });
        
        // 添加触摸开始事件
        container.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            distX = 0;
            distY = 0;
        }, { passive: true });
        
        // 添加触摸移动事件
        container.addEventListener('touchmove', function(e) {
            if (!startX || !startY) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            
            distX = currentX - startX;
            distY = currentY - startY;
            
            // 检测是否为水平滑动
            if (Math.abs(distX) > Math.abs(distY)) {
                // 阻止默认行为
                e.preventDefault();
            }
        }, { passive: false });
        
        // 添加触摸结束事件
        container.addEventListener('touchend', function() {
            // 如果是水平滑动且滑动距离超过阈值，则切换项目
            if (Math.abs(distX) > Math.abs(distY) && Math.abs(distX) > 50) {
                if (distX > 0 && currentIndex > 0) {
                    // 向右滑动，显示上一个项目
                    currentIndex--;
                } else if (distX < 0 && currentIndex < items.length - 1) {
                    // 向左滑动，显示下一个项目
                    currentIndex++;
                }
                
                // 更新项目显示
                items.forEach((item, index) => {
                    if (index === currentIndex) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
        });
    });
}

/**
 * 显示手势提示
 */
function showGestureHint(text) {
    // 检查是否已存在提示元素
    let hintElement = document.querySelector('.touch-gesture-hint');
    
    if (!hintElement) {
        // 创建提示元素
        hintElement = document.createElement('div');
        hintElement.className = 'touch-gesture-hint';
        document.body.appendChild(hintElement);
    }
    
    // 设置提示文本
    hintElement.textContent = text;
    
    // 显示提示
    hintElement.classList.add('show');
    
    // 3秒后隐藏提示
    setTimeout(() => {
        hintElement.classList.remove('show');
    }, 3000);
}

/**
 * 触发触觉反馈
 */
function triggerHapticFeedback() {
    // 检查是否支持触觉反馈
    if ('vibrate' in navigator) {
        // 触发短振动
        navigator.vibrate(50);
    }
}

/**
 * 检测是否为触摸设备
 */
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * 添加涟漪效果
 */
function addRippleEffect() {
    const rippleElements = document.querySelectorAll('.ripple, button, a');
    
    rippleElements.forEach(element => {
        // 如果元素已经包含ripple类，则跳过
        if (element.classList.contains('ripple')) return;
        
        element.classList.add('ripple');
        
        element.addEventListener('click', function(e) {
            // 阻止默认行为
            e.preventDefault();
            
            // 创建涟漪效果
            const circle = document.createElement('span');
            const diameter = Math.max(element.clientWidth, element.clientHeight);
            const radius = diameter / 2;
            
            // 设置涟漪位置
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left - radius;
            const y = e.clientY - rect.top - radius;
            
            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${x}px`;
            circle.style.top = `${y}px`;
            circle.classList.add('ripple-effect');
            
            // 添加涟漪元素
            const ripple = element.getElementsByClassName('ripple-effect')[0];
            if (ripple) {
                ripple.remove();
            }
            element.appendChild(circle);
            
            // 2秒后移除涟漪元素
            setTimeout(() => {
                circle.remove();
            }, 2000);
        }, { passive: false });
    });
}

// DOM加载完成后初始化触摸优化功能
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：在页面加载完成后初始化触摸优化功能
// 依赖文件：无
document.addEventListener('DOMContentLoaded', function() {
    initTouchOptimization();
});