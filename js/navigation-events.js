import NavigationUtils from './navigation-utils';

/**
 * 高性能事件系统
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：提供高性能的导航事件系统，支持优先级监听和异步事件派发
// 依赖文件：navigation-utils.js
class NavigationEventSystem {
    constructor() {
        this._listeners = new Map();
        this._queue = [];
        this._isProcessing = false;
    }

    /**
     * 添加优先级监听器
     */
    on(event, handler, priority = 0) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push({handler, priority});
        this._listeners.get(event).sort((a, b) => b.priority - a.priority);
    }

    /**
     * 异步事件派发
     */
    emit(event, data) {
        return new Promise(resolve => {
            this._queue.push({event, data, resolve});
            if (!this._isProcessing) {
                this._processQueue();
            }
        });
    }

    /**
     * 处理事件队列
     */
    async _processQueue() {
        this._isProcessing = true;
        while (this._queue.length > 0) {
            const {event, data, resolve} = this._queue.shift();
            try {
                const listeners = this._listeners.get(event) || [];
                for (const {handler} of listeners) {
                    await handler(data);
                }
                resolve(true);
            } catch (error) {
                console.error(`Event ${event} error:`, error);
                resolve(false);
            }
        }
        this._isProcessing = false;
    }
}

export default NavigationEventSystem;