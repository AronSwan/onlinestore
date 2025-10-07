import NavigationConstants from './navigation-constants';
import NavigationUtils from './navigation-utils';

/**
 * 增强版导航状态机
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：管理导航状态转换，提供原子状态转换和队列处理功能
// 依赖文件：navigation-constants.js, navigation-utils.js
class NavigationStateMachine {
    constructor() {
        this._state = new Map();
        this._transitionLock = false;
        this._transitionQueue = [];
    }

    /**
     * 原子状态转换
     */
    async transition(button, newState) {
        if (this._transitionLock) {
            return new Promise(resolve => {
                this._transitionQueue.push({button, newState, resolve});
            });
        }

        this._transitionLock = true;
        
        try {
            const buttonId = NavigationUtils.getElementId(button);
            const currentState = this._state.get(buttonId) || NavigationConstants.STATES.INACTIVE;

            if (!NavigationUtils.isValidTransition(currentState, newState)) {
                console.warn(`Invalid state transition: ${currentState} -> ${newState}`);
                return false;
            }

            // 原子更新
            await NavigationUtils.safeDOMOperation(() => {
                this._state.set(buttonId, newState);
                NavigationUtils.updateElementState(button, currentState, newState);
            });

            return true;
        } finally {
            this._transitionLock = false;
            this._processQueue();
        }
    }

    /**
     * 处理转换队列
     */
    _processQueue() {
        if (this._transitionQueue.length > 0) {
            const {button, newState, resolve} = this._transitionQueue.shift();
            this.transition(button, newState).then(resolve);
        }
    }
}

export default NavigationStateMachine;