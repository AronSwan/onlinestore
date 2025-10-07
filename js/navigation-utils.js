/**
 * 导航系统工具类
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：提供导航系统所需的工具函数，包括节流、ID生成和安全DOM操作
// 依赖文件：无
class NavigationUtils {
    // 节流函数
    static throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        }
    }

    // 生成唯一ID
    static generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // 安全DOM操作
    static safeDOMOperation(operation) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                try {
                    const result = operation();
                    resolve(result);
                } catch (error) {
                    console.error('DOM operation failed:', error);
                    resolve(null);
                }
            });
        });
    }
}

export default NavigationUtils;