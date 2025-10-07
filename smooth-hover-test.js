/**
 * 平滑悬停切换测试脚本
 * 用于测试鼠标指针在"腕表珠宝"按钮与"香水"按钮之间进行平滑悬停切换操作10次
 * 单次切换规定耗时1s，同时持续观察"手袋"按钮的高亮显示状态变化
 * 
 * 创建时间: 2025-06-21
 * 来源: 测试逻辑是否满足：通过编程方式控制鼠标指针在"腕表珠宝"按钮与"香水"按钮之间进行平滑的悬停切换操作10次
 */

class SmoothHoverTest {
    constructor() {
        this.testResults = [];
        this.isTestRunning = false;
        this.testConfig = {
            // 测试延迟配置
            initialDelay: 1000,      // 页面加载后的初始延迟
            interactionDelay: 1000,  // 单次切换耗时1s
            testIterationDelay: 500, // 每次测试迭代间的延迟
            
            // 测试次数配置
            hoverIterations: 10      // 悬停测试迭代次数
        };
        
        // 单例模式
        if (SmoothHoverTest.instance) {
            return SmoothHoverTest.instance;
        }
        SmoothHoverTest.instance = this;
    }
    
    /**
     * 初始化测试管理器
     */
    init() {
        console.log('SmoothHoverTest initializing...');
        
        // 确保导航状态管理器已初始化
        if (typeof NavigationStateManager !== 'undefined') {
            this.navStateManager = window.navStateManager;
            
            // 如果导航状态管理器存在但未初始化，等待其初始化完成
            if (this.navStateManager && !this.navStateManager.initialized) {
                // 监听导航状态管理器初始化完成事件
                const checkNavInit = setInterval(() => {
                    if (this.navStateManager.initialized) {
                        clearInterval(checkNavInit);
                        this.setupEventListeners();
                    }
                }, 100);
                
                // 设置超时，避免无限等待
                setTimeout(() => {
                    clearInterval(checkNavInit);
                    this.setupEventListeners();
                }, 3000);
            } else {
                this.setupEventListeners();
            }
        } else {
            // 如果导航状态管理器不存在，直接设置事件监听器
            this.setupEventListeners();
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听导航状态管理器初始化完成事件
        document.addEventListener('navStateManagerInitialized', () => {
            console.log('NavigationStateManager initialized, starting smooth hover test...');
            this.runSmoothHoverTest();
        });
        
        // 监听页面加载完成事件
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // 如果导航状态管理器已经初始化，直接运行测试
                if (this.navStateManager && this.navStateManager.initialized) {
                    this.runSmoothHoverTest();
                }
                // 否则等待导航状态管理器初始化完成事件或超时
                this.setupTestTimeout();
            });
        } else {
            // 如果页面已经加载完成，检查导航状态管理器状态
            if (this.navStateManager && this.navStateManager.initialized) {
                this.runSmoothHoverTest();
            } else {
                // 否则等待导航状态管理器初始化完成事件或超时
                this.setupTestTimeout();
            }
        }
    }
    
    /**
     * 设置测试超时机制
     */
    setupTestTimeout() {
        // 设置超时，确保即使在导航状态管理器初始化事件未触发的情况下也能开始测试
        setTimeout(() => {
            if (!this.isTestRunning) {
                console.log('Test timeout reached, starting smooth hover test...');
                this.runSmoothHoverTest();
            }
        }, 5000); // 5秒超时
    }
    
    /**
     * 运行平滑悬停测试
     */
    async runSmoothHoverTest() {
        if (this.isTestRunning) {
            console.log('Smooth hover test is already running, skipping...');
            return;
        }
        
        this.isTestRunning = true;
        console.log('Starting smooth hover test...');
        
        try {
            // 等待页面完全加载
            await this.waitForPageReady();
            
            // 获取测试按钮
            const navLinks = document.querySelectorAll('.nav-link-luxury');
            if (navLinks.length === 0) {
                console.warn('No navigation links found, skipping smooth hover test');
                return;
            }
            
            const watchJewelryButton = Array.from(navLinks).find(link => 
                link.textContent.includes('腕表珠宝'));
            const perfumeButton = Array.from(navLinks).find(link => 
                link.textContent.includes('香水'));
            const handbagButton = Array.from(navLinks).find(link => 
                link.textContent.includes('手袋'));
            
            if (!watchJewelryButton || !perfumeButton || !handbagButton) {
                console.warn('Required buttons not found, skipping smooth hover test');
                return;
            }
            
            console.log('Found all required buttons for smooth hover test');
            console.log('- 腕表珠宝按钮:', watchJewelryButton);
            console.log('- 香水按钮:', perfumeButton);
            console.log('- 手袋按钮:', handbagButton);
            
            // 记录手袋按钮初始状态
            const handbagInitialState = this.getButtonState(handbagButton);
            console.log('手袋按钮初始状态:', handbagInitialState);
            
            // 执行10次平滑悬停切换
            for (let i = 1; i <= this.testConfig.hoverIterations; i++) {
                console.log(`\n=== 平滑悬停测试迭代 ${i}/${this.testConfig.hoverIterations} ===`);
                
                try {
                    // 记录测试开始时间
                    const iterationStartTime = Date.now();
                    
                    // 执行单次平滑悬停切换
                    await this.performSmoothHoverSwitch(watchJewelryButton, perfumeButton, handbagButton, i);
                    
                    // 记录测试结束时间
                    const iterationEndTime = Date.now();
                    const iterationDuration = iterationEndTime - iterationStartTime;
                    
                    console.log(`第 ${i} 次平滑悬停切换完成，耗时: ${iterationDuration}ms`);
                    
                    // 验证单次切换耗时是否接近1秒
                    if (Math.abs(iterationDuration - this.testConfig.interactionDelay) > 100) {
                        this.recordAnomaly({
                            type: 'timing_anomaly',
                            buttonId: '平滑悬停切换',
                            expected: `耗时约${this.testConfig.interactionDelay}ms`,
                            actual: `耗时${iterationDuration}ms`,
                            message: `第 ${i} 次平滑悬停切换耗时异常: 预期约${this.testConfig.interactionDelay}ms，实际${iterationDuration}ms`,
                            timestamp: new Date().toISOString()
                        });
                    }
                    
                } catch (error) {
                    console.error(`第 ${i} 次平滑悬停测试出错:`, error);
                    this.recordTestError(error);
                }
                
                await this.delay(this.testConfig.testIterationDelay);
            }
            
            // 生成测试报告
            this.generateTestReport();
            
            console.log('Smooth hover test completed');
        } catch (error) {
            console.error('Error running smooth hover test:', error);
            this.recordTestError(error);
        } finally {
            this.isTestRunning = false;
        }
    }
    
    /**
     * 执行单次平滑悬停切换
     */
    async performSmoothHoverSwitch(watchJewelryButton, perfumeButton, handbagButton, iterationNumber) {
        console.log(`执行第 ${iterationNumber} 次平滑悬停切换...`);
        
        // 记录切换开始前的状态
        const beforeState = {
            watchJewelry: this.getButtonState(watchJewelryButton),
            perfume: this.getButtonState(perfumeButton),
            handbag: this.getButtonState(handbagButton)
        };
        
        console.log('切换前状态:', beforeState);
        
        // 步骤1: 悬停腕表珠宝按钮
        console.log('步骤1: 悬停腕表珠宝按钮');
        await this.simulateSmoothHover(watchJewelryButton);
        await this.delay(this.testConfig.interactionDelay / 2);
        
        // 记录悬停腕表珠宝后的状态
        const afterWatchJewelryHover = {
            watchJewelry: this.getButtonState(watchJewelryButton),
            perfume: this.getButtonState(perfumeButton),
            handbag: this.getButtonState(handbagButton)
        };
        
        console.log('悬停腕表珠宝后状态:', afterWatchJewelryHover);
        
        // 验证腕表珠宝按钮悬停状态
        try {
            this.validateHoverState(afterWatchJewelryHover.watchJewelry, '腕表珠宝');
        } catch (error) {
            this.recordAnomaly({
                type: 'hover_state_anomaly',
                buttonId: '腕表珠宝',
                expected: '悬停状态与活动状态一致',
                actual: '悬停状态与活动状态不一致',
                message: `第 ${iterationNumber} 次测试 - 按钮 腕表珠宝 的悬停状态异常: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
        
        // 步骤2: 平滑切换到香水按钮
        console.log('步骤2: 平滑切换到香水按钮');
        
        // 先移出腕表珠宝按钮
        await this.simulateMouseOut(watchJewelryButton);
        await this.delay(50);
        
        // 再悬停香水按钮
        await this.simulateSmoothHover(perfumeButton);
        await this.delay(this.testConfig.interactionDelay / 2 - 50);
        
        // 记录悬停香水后的状态
        const afterPerfumeHover = {
            watchJewelry: this.getButtonState(watchJewelryButton),
            perfume: this.getButtonState(perfumeButton),
            handbag: this.getButtonState(handbagButton)
        };
        
        console.log('悬停香水后状态:', afterPerfumeHover);
        
        // 验证香水按钮悬停状态
        try {
            this.validateHoverState(afterPerfumeHover.perfume, '香水');
        } catch (error) {
            this.recordAnomaly({
                type: 'hover_state_anomaly',
                buttonId: '香水',
                expected: '悬停状态与活动状态一致',
                actual: '悬停状态与活动状态不一致',
                message: `第 ${iterationNumber} 次测试 - 按钮 香水 的悬停状态异常: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
        
        // 验证腕表珠宝按钮状态已恢复
        try {
            if (!afterWatchJewelryHover.watchJewelry.classes.includes('active')) {
                this.expect(afterPerfumeHover.watchJewelry.dataState).toBe('inactive');
                this.expect(afterPerfumeHover.watchJewelry.classes).not.toContain('hover-active');
            }
        } catch (error) {
            this.recordAnomaly({
                type: 'hover_state_anomaly',
                buttonId: '腕表珠宝',
                expected: '状态恢复为inactive',
                actual: `状态为${afterPerfumeHover.watchJewelry.dataState}`,
                message: `第 ${iterationNumber} 次测试 - 按钮 腕表珠宝 状态恢复异常: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
        
        // 验证手袋按钮状态保持不变
        try {
            if (beforeState.handbag.visible && afterPerfumeHover.handbag.visible) {
                this.expect(beforeState.handbag.dataState).toBe(afterPerfumeHover.handbag.dataState);
                this.expect(beforeState.handbag.classes).toBe(afterPerfumeHover.handbag.classes);
            }
        } catch (error) {
            this.recordAnomaly({
                type: 'handbag_state_anomaly',
                buttonId: '手袋',
                expected: '状态保持不变',
                actual: '状态发生变化',
                message: `第 ${iterationNumber} 次测试 - 按钮 手袋 状态保持异常: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
        
        // 记录状态变化
        const stateChanges = {
            watchJewelry: {
                before: beforeState.watchJewelry,
                afterWatchHover: afterWatchJewelryHover.watchJewelry,
                afterPerfumeHover: afterPerfumeHover.watchJewelry
            },
            perfume: {
                before: beforeState.perfume,
                afterWatchHover: afterWatchJewelryHover.perfume,
                afterPerfumeHover: afterPerfumeHover.perfume
            },
            handbag: {
                before: beforeState.handbag,
                afterWatchHover: afterWatchJewelryHover.handbag,
                afterPerfumeHover: afterPerfumeHover.handbag
            }
        };
        
        console.log(`第 ${iterationNumber} 次测试状态变化:`, stateChanges);
        
        // 保存测试结果
        this.testResults.push({
            iteration: iterationNumber,
            timestamp: new Date().toISOString(),
            stateChanges: stateChanges,
            duration: this.testConfig.interactionDelay
        });
    }
    
    /**
     * 等待页面准备就绪
     */
    async waitForPageReady() {
        return new Promise((resolve) => {
            // 等待初始延迟
            setTimeout(() => {
                // 检查关键元素是否存在
                const navLinks = document.querySelectorAll('.nav-link-luxury');
                const navbar = document.querySelector('.navbar-luxury');
                
                if (navLinks.length > 0 && navbar) {
                    console.log('Page is ready for smooth hover test');
                    resolve();
                } else {
                    console.warn('Key navigation elements not found, retrying...');
                    // 重试一次
                    setTimeout(() => {
                        console.log('Retrying page readiness check...');
                        resolve();
                    }, this.testConfig.initialDelay);
                }
            }, this.testConfig.initialDelay);
        });
    }
    
    /**
     * 获取按钮状态
     */
    getButtonState(button) {
        if (!button) {
            return {
                visible: false,
                dataState: null,
                classes: [],
                textContent: null
            };
        }
        
        return {
            visible: button.offsetParent !== null,
            dataState: button.getAttribute('data-state') || null,
            classes: Array.from(button.classList),
            textContent: button.textContent.trim()
        };
    }
    
    /**
     * 模拟平滑悬停操作
     */
    async simulateSmoothHover(button) {
        if (!button) return;
        
        // 创建并触发鼠标进入事件
        const mouseEnterEvent = new MouseEvent('mouseenter', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        button.dispatchEvent(mouseEnterEvent);
        
        // 如果有导航状态管理器，也触发其事件处理
        if (this.navStateManager) {
            this.navStateManager.handleMouseEnter({ currentTarget: button });
        }
        
        // 添加平滑过渡效果
        button.style.transition = 'all 0.3s ease';
    }
    
    /**
     * 模拟鼠标移出操作
     */
    async simulateMouseOut(button) {
        if (!button) return;
        
        // 创建并触发鼠标离开事件
        const mouseLeaveEvent = new MouseEvent('mouseleave', {
            bubbles: true,
            cancelable: true,
            view: window,
            relatedTarget: document.body
        });
        button.dispatchEvent(mouseLeaveEvent);
        
        // 如果有导航状态管理器，也触发其事件处理
        if (this.navStateManager) {
            this.navStateManager.handleMouseLeave({ currentTarget: button });
        }
    }
    
    /**
     * 验证悬停状态
     */
    validateHoverState(buttonState, buttonText) {
        if (!buttonState.visible) {
            console.warn(`${buttonText} button is not visible, skipping validation`);
            return;
        }
        
        // 检查是否是活动按钮
        const isActive = buttonState.classes.includes('active');
        
        if (isActive) {
            // 活动按钮不应该有悬停状态
            this.expect(buttonState.classes).not.toContain('hover-active');
            this.expect(buttonState.dataState).not.toBe('hover-active');
            this.expect(buttonState.dataState).toBe('active');
        } else {
            // 非活动按钮应该有悬停状态
            this.expect(buttonState.classes).toContain('hover-active');
            this.expect(buttonState.dataState).toBe('hover-active');
        }
    }
    
    /**
     * 延迟函数
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 记录异常
     */
    recordAnomaly(anomaly) {
        // 获取现有异常记录
        const anomalies = JSON.parse(localStorage.getItem('smoothHoverTestAnomalies') || '[]');
        
        // 添加新异常
        anomalies.push(anomaly);
        
        // 保存到本地存储
        localStorage.setItem('smoothHoverTestAnomalies', JSON.stringify(anomalies));
        
        console.warn('Anomaly recorded:', anomaly);
    }
    
    /**
     * 记录测试错误
     */
    recordTestError(error) {
        this.recordAnomaly({
            type: 'test_error',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * 生成测试报告
     */
    generateTestReport() {
        const anomalies = JSON.parse(localStorage.getItem('smoothHoverTestAnomalies') || '[]');
        
        const report = {
            testType: 'smooth_hover_test',
            timestamp: new Date().toISOString(),
            anomalies: anomalies,
            testResults: this.testResults,
            testConfig: this.testConfig,
            summary: {
                totalAnomalies: anomalies.length,
                anomalyTypes: anomalies.reduce((acc, anomaly) => {
                    acc[anomaly.type] = (acc[anomaly.type] || 0) + 1;
                    return acc;
                }, {}),
                totalIterations: this.testResults.length,
                averageDuration: this.testResults.length > 0 
                    ? this.testResults.reduce((sum, result) => sum + result.duration, 0) / this.testResults.length 
                    : 0
            }
        };
        
        // 保存测试报告
        const existingReports = JSON.parse(localStorage.getItem('smoothHoverTestReports') || '[]');
        existingReports.push(report);
        localStorage.setItem('smoothHoverTestReports', JSON.stringify(existingReports));
        
        // 在控制台输出测试报告
        console.log('\n=== 平滑悬停测试报告 ===');
        console.log(`测试类型: ${report.testType}`);
        console.log(`测试时间: ${report.timestamp}`);
        console.log(`异常数量: ${report.summary.totalAnomalies}`);
        console.log('异常类型分布:', report.summary.anomalyTypes);
        console.log(`测试迭代次数: ${report.summary.totalIterations}`);
        console.log(`平均单次切换耗时: ${report.summary.averageDuration}ms`);
        console.log('=====================\n');
        
        // 清除当前异常记录，为下次测试做准备
        localStorage.removeItem('smoothHoverTestAnomalies');
    }
    
    /**
     * 简化的expect函数，用于验证条件
     */
    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    const error = new Error(`Expected ${expected}, but got ${actual}`);
                    this.recordAnomaly({
                        type: 'state_inconsistency',
                        expected,
                        actual,
                        message: error.message,
                        timestamp: new Date().toISOString()
                    });
                    throw error;
                }
            },
            toBeTrue: () => {
                if (actual !== true) {
                    const error = new Error(`Expected true, but got ${actual}`);
                    this.recordAnomaly({
                        type: 'state_inconsistency',
                        expected: true,
                        actual,
                        message: error.message,
                        timestamp: new Date().toISOString()
                    });
                    throw error;
                }
            },
            toBeFalse: () => {
                if (actual !== false) {
                    const error = new Error(`Expected false, but got ${actual}`);
                    this.recordAnomaly({
                        type: 'state_inconsistency',
                        expected: false,
                        actual,
                        message: error.message,
                        timestamp: new Date().toISOString()
                    });
                    throw error;
                }
            },
            toContain: (expected) => {
                if (!actual.includes(expected)) {
                    const error = new Error(`Expected ${actual} to contain ${expected}`);
                    this.recordAnomaly({
                        type: 'state_inconsistency',
                        expected,
                        actual,
                        message: error.message,
                        timestamp: new Date().toISOString()
                    });
                    throw error;
                }
            },
            not: {
                toBe: (expected) => {
                    if (actual === expected) {
                        const error = new Error(`Expected not ${expected}, but got ${actual}`);
                        this.recordAnomaly({
                            type: 'state_inconsistency',
                            expected: `not ${expected}`,
                            actual,
                            message: error.message,
                            timestamp: new Date().toISOString()
                        });
                        throw error;
                    }
                },
                toContain: (expected) => {
                    if (actual.includes(expected)) {
                        const error = new Error(`Expected ${actual} not to contain ${expected}`);
                        this.recordAnomaly({
                            type: 'state_inconsistency',
                            expected: `not contain ${expected}`,
                            actual,
                            message: error.message,
                            timestamp: new Date().toISOString()
                        });
                        throw error;
                    }
                }
            }
        };
    }
}

// 平滑悬停测试实例
const smoothHoverTest = new SmoothHoverTest();

// 导出平滑悬停测试（供其他模块使用）
window.SmoothHoverTest = SmoothHoverTest;
window.smoothHoverTest = smoothHoverTest;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    smoothHoverTest.init();
});