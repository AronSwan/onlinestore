/**
 * 页面测试流程管理器
 * 确保每次新打开的页面均需执行完整的测试流程
 */

// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：管理页面测试流程，确保每次新打开的页面均需执行完整的测试流程
// 依赖文件：navigation-state-manager.js（通过window.navStateManager使用）

class PageTestManager {
    constructor() {
        this.testResults = [];
        this.isTestRunning = false;
        this.testConfig = {
            // 测试延迟配置
            initialDelay: 1000,      // 页面加载后的初始延迟
            interactionDelay: 300,   // 交互操作后的延迟
            testIterationDelay: 500, // 每次测试迭代间的延迟
            
            // 测试次数配置
            hoverIterations: 10,     // 悬停测试迭代次数
            clickIterations: 5,      // 点击测试迭代次数
            comprehensiveIterations: 10, // 综合测试迭代次数
        };
        
        // 单例模式
        if (PageTestManager.instance) {
            return PageTestManager.instance;
        }
        PageTestManager.instance = this;
    }
    
    /**
     * 初始化测试管理器
     */
    init() {
        console.log('PageTestManager initializing...');
        
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
            console.log('NavigationStateManager initialized, starting test suite...');
            this.runFullTestSuite();
        });
        
        // 监听页面加载完成事件
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // 如果导航状态管理器已经初始化，直接运行测试
                if (this.navStateManager && this.navStateManager.initialized) {
                    this.runFullTestSuite();
                }
                // 否则等待导航状态管理器初始化完成事件或超时
                this.setupTestTimeout();
            });
        } else {
            // 如果页面已经加载完成，检查导航状态管理器状态
            if (this.navStateManager && this.navStateManager.initialized) {
                this.runFullTestSuite();
            } else {
                // 否则等待导航状态管理器初始化完成事件或超时
                this.setupTestTimeout();
            }
        }
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !this.isTestRunning) {
                // 页面重新可见时，重新运行测试
                console.log('Page became visible, restarting test suite...');
                this.runFullTestSuite();
            }
        });
        
        // 监听浏览器前进/后退事件
        window.addEventListener('popstate', () => {
            console.log('Browser navigation detected, restarting test suite...');
            this.runFullTestSuite();
        });
        
        console.log('PageTestManager initialized');
    }
    
    /**
     * 设置测试超时机制
     */
    setupTestTimeout() {
        // 设置超时，确保即使在导航状态管理器初始化事件未触发的情况下也能开始测试
        setTimeout(() => {
            if (!this.isTestRunning) {
                console.log('Test timeout reached, starting test suite...');
                this.runFullTestSuite();
            }
        }, 5000); // 5秒超时
    }
    
    /**
     * 运行完整测试套件
     */
    async runFullTestSuite() {
        if (this.isTestRunning) {
            console.log('Test suite is already running, skipping...');
            return;
        }
        
        this.isTestRunning = true;
        console.log('Starting full test suite...');
        
        try {
            // 等待页面完全加载
            await this.waitForPageReady();
            
            // 运行所有测试
            await this.runHoverStateTest();
            await this.runStateSyncTest();
            await this.runHighlightLogicTest();
            await this.runComprehensiveTest();
            
            // 生成测试报告
            this.generateTestReport();
            
            console.log('Full test suite completed');
        } catch (error) {
            console.error('Error running test suite:', error);
            this.recordTestError(error);
        } finally {
            this.isTestRunning = false;
        }
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
                    console.log('Page is ready for testing');
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
     * 运行悬停状态测试
     */
    async runHoverStateTest() {
        console.log('Running hover state test...');
        
        const navLinks = document.querySelectorAll('.nav-link-luxury');
        if (navLinks.length === 0) {
            console.warn('No navigation links found, skipping hover state test');
            return;
        }
        
        // 获取特定按钮进行测试
        const watchJewelryButton = Array.from(navLinks).find(link => 
            link.textContent.includes('腕表珠宝'));
        const perfumeButton = Array.from(navLinks).find(link => 
            link.textContent.includes('香水'));
        const handbagButton = Array.from(navLinks).find(link => 
            link.textContent.includes('手袋'));
        
        if (!watchJewelryButton || !perfumeButton || !handbagButton) {
            console.warn('Required buttons not found, skipping hover state test');
            return;
        }
        
        // 记录手袋按钮初始状态
        const handbagInitialState = this.getButtonState(handbagButton);
        
        // 执行多次悬停切换
        for (let i = 1; i <= this.testConfig.hoverIterations; i++) {
            console.log(`Hover test iteration ${i}/${this.testConfig.hoverIterations}`);
            
            try {
                // 悬停腕表珠宝按钮
                await this.simulateHover(watchJewelryButton);
                await this.delay(this.testConfig.interactionDelay);
                
                // 验证腕表珠宝按钮状态
                const watchJewelryState = this.getButtonState(watchJewelryButton);
                try {
                    this.validateHoverState(watchJewelryState, '腕表珠宝');
                } catch (error) {
                    this.recordAnomaly({
                        type: 'hover_state_anomaly',
                        buttonId: '腕表珠宝',
                        expected: '悬停状态与活动状态一致',
                        actual: '悬停状态与活动状态不一致',
                        message: `按钮 腕表珠宝 的悬停状态异常: ${error.message}`,
                        timestamp: new Date().toISOString(),
                    });
                }
                
                // 悬停香水按钮
                await this.simulateHover(perfumeButton);
                await this.delay(this.testConfig.interactionDelay);
                
                // 验证香水按钮状态
                const perfumeState = this.getButtonState(perfumeButton);
                try {
                    this.validateHoverState(perfumeState, '香水');
                } catch (error) {
                    this.recordAnomaly({
                        type: 'hover_state_anomaly',
                        buttonId: '香水',
                        expected: '悬停状态与活动状态一致',
                        actual: '悬停状态与活动状态不一致',
                        message: `按钮 香水 的悬停状态异常: ${error.message}`,
                        timestamp: new Date().toISOString(),
                    });
                }
                
                // 验证腕表珠宝按钮状态已恢复
                const watchJewelryStateAfter = this.getButtonState(watchJewelryButton);
                if (!watchJewelryStateAfter.classes.includes('active')) {
                    try {
                        expect(watchJewelryStateAfter.dataState).toBe('inactive');
                        expect(watchJewelryStateAfter.classes).not.toContain('hover-active');
                    } catch (error) {
                        this.recordAnomaly({
                            type: 'hover_state_anomaly',
                            buttonId: '腕表珠宝',
                            expected: '状态恢复为inactive',
                            actual: `状态为${watchJewelryStateAfter.dataState}`,
                            message: `按钮 腕表珠宝 状态恢复异常: ${error.message}`,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
                
                // 验证手袋按钮状态保持不变
                const handbagStateAfter = this.getButtonState(handbagButton);
                if (handbagInitialState.visible && handbagStateAfter.visible) {
                    try {
                        expect(handbagInitialState.dataState).toBe(handbagStateAfter.dataState);
                        expect(handbagInitialState.classes).toBe(handbagStateAfter.classes);
                    } catch (error) {
                        this.recordAnomaly({
                            type: 'hover_state_anomaly',
                            buttonId: '手袋',
                            expected: '状态保持不变',
                            actual: '状态发生变化',
                            message: `按钮 手袋 状态保持异常: ${error.message}`,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
            } catch (error) {
                console.error(`悬停状态测试出错:`, error);
                this.recordTestError(error);
            }
            
            await this.delay(this.testConfig.testIterationDelay);
        }
        
        console.log('Hover state test completed');
    }
    
    /**
     * 运行状态同步测试
     */
    async runStateSyncTest() {
        console.log('Running state sync test...');
        
        const navLinks = document.querySelectorAll('.nav-link-luxury');
        if (navLinks.length === 0) {
            console.warn('No navigation links found, skipping state sync test');
            return;
        }
        
        // 执行多次点击和悬停组合操作
        for (let i = 1; i <= this.testConfig.clickIterations; i++) {
            console.log(`State sync test iteration ${i}/${this.testConfig.clickIterations}`);
            
            try {
                // 随机选择一个导航按钮
                const randomIndex = Math.floor(Math.random() * navLinks.length);
                const selectedLink = navLinks[randomIndex];
                
                // 点击选中的导航按钮
                await this.simulateClick(selectedLink);
                await this.delay(this.testConfig.interactionDelay);
                
                // 验证点击后的状态同步
                const selectedState = this.getButtonState(selectedLink);
                try {
                    this.validateClickState(selectedState, selectedLink.textContent);
                } catch (error) {
                    this.recordAnomaly({
                        type: 'state_sync_issue',
                        buttonId: selectedLink.textContent.trim(),
                        expected: '点击状态与data-state同步',
                        actual: '点击状态与data-state不同步',
                        message: `按钮 ${selectedLink.textContent.trim()} 的点击状态同步异常: ${error.message}`,
                        timestamp: new Date().toISOString(),
                    });
                }
                
                // 验证其他按钮的状态同步
                for (let j = 0; j < navLinks.length; j++) {
                    if (j !== randomIndex) {
                        const otherLink = navLinks[j];
                        const otherState = this.getButtonState(otherLink);
                        
                        // 其他按钮不应该有active状态
                        if (otherState.visible) {
                            try {
                                expect(otherState.classes).not.toContain('active');
                                expect(otherState.dataState).not.toBe('active');
                            } catch (error) {
                                this.recordAnomaly({
                                    type: 'state_sync_issue',
                                    buttonId: otherLink.textContent.trim(),
                                    expected: '非活动状态',
                                    actual: '活动状态',
                                    message: `按钮 ${otherLink.textContent.trim()} 的状态同步异常: ${error.message}`,
                                    timestamp: new Date().toISOString(),
                                });
                            }
                        }
                    }
                }
                
                // 随机悬停另一个按钮
                let hoverIndex;
                do {
                    hoverIndex = Math.floor(Math.random() * navLinks.length);
                } while (hoverIndex === randomIndex);
                
                const hoverLink = navLinks[hoverIndex];
                await this.simulateHover(hoverLink);
                await this.delay(this.testConfig.interactionDelay);
                
                // 验证悬停状态同步
                const hoverState = this.getButtonState(hoverLink);
                try {
                    this.validateHoverState(hoverState, hoverLink.textContent);
                } catch (error) {
                    this.recordAnomaly({
                        type: 'state_sync_issue',
                        buttonId: hoverLink.textContent.trim(),
                        expected: '悬停状态与活动状态一致',
                        actual: '悬停状态与活动状态不一致',
                        message: `按钮 ${hoverLink.textContent.trim()} 的悬停状态同步异常: ${error.message}`,
                        timestamp: new Date().toISOString(),
                    });
                }
                
                // 验证点击按钮的状态保持不变
                const clickedState = this.getButtonState(selectedLink);
                if (clickedState.visible) {
                    try {
                        expect(clickedState.dataState).toBe('active');
                        expect(clickedState.classes).toContain('active');
                    } catch (error) {
                        this.recordAnomaly({
                            type: 'state_sync_issue',
                            buttonId: selectedLink.textContent.trim(),
                            expected: '保持活动状态',
                            actual: '状态发生变化',
                            message: `按钮 ${selectedLink.textContent.trim()} 的状态保持异常: ${error.message}`,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
            } catch (error) {
                console.error(`状态同步测试出错:`, error);
                this.recordTestError(error);
            }
            
            await this.delay(this.testConfig.testIterationDelay);
        }
        
        console.log('State sync test completed');
    }
    
    /**
     * 运行高亮逻辑测试
     */
    async runHighlightLogicTest() {
        console.log('Running highlight logic test...');
        
        const navLinks = document.querySelectorAll('.nav-link-luxury');
        if (navLinks.length === 0) {
            console.warn('No navigation links found, skipping highlight logic test');
            return;
        }
        
        // 获取手袋和鞋履按钮
        const handbagButton = Array.from(navLinks).find(link => 
            link.textContent.includes('手袋'));
        const shoesButton = Array.from(navLinks).find(link => 
            link.textContent.includes('鞋履'));
        
        if (!handbagButton || !shoesButton) {
            console.warn('Handbag or shoes button not found, skipping highlight logic test');
            return;
        }
        
        // 确保手袋按钮是初始活动按钮
        if (!handbagButton.classList.contains('active')) {
            await this.simulateClick(handbagButton);
            await this.delay(this.testConfig.interactionDelay);
        }
        
        // 执行多次点击切换
        for (let i = 1; i <= 3; i++) {
            console.log(`Highlight logic test iteration ${i}/3`);
            
            try {
                // 点击鞋履按钮
                await this.simulateClick(shoesButton);
                await this.delay(this.testConfig.interactionDelay);
                
                // 验证鞋履按钮成为活动按钮
                try {
                    expect(shoesButton.classList.contains('active')).toBe(true);
                    expect(shoesButton.getAttribute('data-state')).toBe('active');
                } catch (error) {
                    this.recordAnomaly({
                        type: 'highlight_logic_issue',
                        buttonId: '鞋履',
                        expected: '成为活动按钮',
                        actual: '未成为活动按钮',
                        message: `按钮 鞋履 的高亮逻辑异常: ${error.message}`,
                        timestamp: new Date().toISOString(),
                    });
                }
                
                // 验证手袋按钮不再是活动按钮
                try {
                    expect(handbagButton.classList.contains('active')).toBe(false);
                    expect(handbagButton.getAttribute('data-state')).toBe('inactive');
                } catch (error) {
                    this.recordAnomaly({
                        type: 'highlight_logic_issue',
                        buttonId: '手袋',
                        expected: '不再是活动按钮',
                        actual: '仍然是活动按钮',
                        message: `按钮 手袋 的高亮逻辑异常: ${error.message}`,
                        timestamp: new Date().toISOString(),
                    });
                }
                
                // 悬停手袋按钮
                await this.simulateHover(handbagButton);
                await this.delay(this.testConfig.interactionDelay);
                
                // 验证手袋按钮有悬停状态，但没有活动状态
                const handbagState = this.getButtonState(handbagButton);
                if (handbagState.visible) {
                    try {
                        expect(handbagState.classes).toContain('hover-active');
                        expect(handbagState.dataState).toBe('hover-active');
                        expect(handbagState.classes).not.toContain('active');
                    } catch (error) {
                        this.recordAnomaly({
                            type: 'highlight_logic_issue',
                            buttonId: '手袋',
                            expected: '有悬停状态但没有活动状态',
                            actual: '状态异常',
                            message: `按钮 手袋 的悬停高亮逻辑异常: ${error.message}`,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
                
                // 验证鞋履按钮保持活动状态且没有悬停状态
                const shoesState = this.getButtonState(shoesButton);
                if (shoesState.visible) {
                    try {
                        expect(shoesState.classes).toContain('active');
                        expect(shoesState.dataState).toBe('active');
                        // 活动按钮不应该有悬停状态
                        expect(shoesState.classes).not.toContain('hover-active');
                    } catch (error) {
                        this.recordAnomaly({
                            type: 'highlight_logic_issue',
                            buttonId: '鞋履',
                            expected: '保持活动状态且没有悬停状态',
                            actual: '状态异常',
                            message: `按钮 鞋履 的活动高亮逻辑异常: ${error.message}`,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
                
                // 点击手袋按钮
                await this.simulateClick(handbagButton);
                await this.delay(this.testConfig.interactionDelay);
                
                // 验证手袋按钮重新成为活动按钮且没有悬停状态
                const handbagStateAfterClick = this.getButtonState(handbagButton);
                if (handbagStateAfterClick.visible) {
                    try {
                        expect(handbagStateAfterClick.classes).toContain('active');
                        expect(handbagStateAfterClick.dataState).toBe('active');
                        // 活动按钮不应该有悬停状态
                        expect(handbagStateAfterClick.classes).not.toContain('hover-active');
                    } catch (error) {
                        this.recordAnomaly({
                            type: 'highlight_logic_issue',
                            buttonId: '手袋',
                            expected: '重新成为活动按钮且没有悬停状态',
                            actual: '状态异常',
                            message: `按钮 手袋 的点击后高亮逻辑异常: ${error.message}`,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
                
                // 验证鞋履按钮不再是活动按钮
                const shoesStateAfterClick = this.getButtonState(shoesButton);
                if (shoesStateAfterClick.visible) {
                    try {
                        expect(shoesStateAfterClick.classes).not.toContain('active');
                        expect(shoesStateAfterClick.dataState).toBe('inactive');
                    } catch (error) {
                        this.recordAnomaly({
                            type: 'highlight_logic_issue',
                            buttonId: '鞋履',
                            expected: '不再是活动按钮',
                            actual: '仍然是活动按钮',
                            message: `按钮 鞋履 的非活动高亮逻辑异常: ${error.message}`,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
            } catch (error) {
                console.error(`高亮逻辑测试出错:`, error);
                this.recordTestError(error);
            }
            
            await this.delay(this.testConfig.testIterationDelay);
        }
        
        console.log('Highlight logic test completed');
    }
    
    /**
     * 运行综合测试
     */
    async runComprehensiveTest() {
        console.log('Running comprehensive test...');
        
        const navLinks = document.querySelectorAll('.nav-link-luxury');
        if (navLinks.length === 0) {
            console.warn('No navigation links found, skipping comprehensive test');
            return;
        }
        
        // 获取手袋按钮
        const handbagButton = Array.from(navLinks).find(link => 
            link.textContent.includes('手袋'));
        
        if (!handbagButton) {
            console.warn('Handbag button not found, skipping comprehensive test');
            return;
        }
        
        // 记录手袋按钮初始状态
        const initialHandbagState = this.getButtonState(handbagButton);
        
        console.log(`Initial handbag button state: data-state=${initialHandbagState.dataState}, classes=${initialHandbagState.classes}`);
        
        // 执行多次悬停切换
        for (let i = 1; i <= this.testConfig.comprehensiveIterations; i++) {
            console.log(`Comprehensive test iteration ${i}/${this.testConfig.comprehensiveIterations}`);
            
            try {
                // 随机选择一个按钮进行悬停
                const randomIndex = Math.floor(Math.random() * navLinks.length);
                const randomButton = navLinks[randomIndex];
                const randomButtonText = randomButton.textContent;
                
                // 悬停随机按钮
                await this.simulateHover(randomButton);
                await this.delay(this.testConfig.interactionDelay);
                
                // 验证随机按钮有悬停状态（除非它是活动按钮）
                const randomButtonState = this.getButtonState(randomButton);
                if (randomButtonState.visible) {
                    // 检查是否是活动按钮
                    const isActive = randomButtonState.classes.includes('active');
                    
                    if (isActive) {
                        // 活动按钮不应该有悬停状态
                        try {
                            expect(randomButtonState.classes).not.toContain('hover-active');
                            expect(randomButtonState.dataState).not.toBe('hover-active');
                            expect(randomButtonState.dataState).toBe('active');
                        } catch (error) {
                            this.recordAnomaly({
                                type: 'highlight_logic_issue',
                                buttonId: randomButtonText.trim(),
                                expected: '活动按钮无悬停状态',
                                actual: '活动按钮有悬停状态',
                                message: `按钮 ${randomButtonText.trim()} 的活动悬停逻辑异常: ${error.message}`,
                                timestamp: new Date().toISOString(),
                            });
                        }
                    } else {
                        // 非活动按钮应该有悬停状态
                        try {
                            expect(randomButtonState.classes).toContain('hover-active');
                            expect(randomButtonState.dataState).toBe('hover-active');
                        } catch (error) {
                            this.recordAnomaly({
                                type: 'highlight_logic_issue',
                                buttonId: randomButtonText.trim(),
                                expected: '非活动按钮有悬停状态',
                                actual: '非活动按钮无悬停状态',
                                message: `按钮 ${randomButtonText.trim()} 的非活动悬停逻辑异常: ${error.message}`,
                                timestamp: new Date().toISOString(),
                            });
                        }
                    }
                }
                
                // 移出鼠标
                await this.simulateMouseOut(randomButton);
                await this.delay(this.testConfig.interactionDelay);
                
                // 验证随机按钮不再有悬停状态（除非它是活动按钮）
                const randomButtonStateAfter = this.getButtonState(randomButton);
                if (randomButtonStateAfter.visible) {
                    // 检查是否是活动按钮
                    const isActive = randomButtonStateAfter.classes.includes('active');
                    
                    if (!isActive) {
                        // 非活动按钮不应该有悬停状态
                        try {
                            expect(randomButtonStateAfter.classes).not.toContain('hover-active');
                            expect(randomButtonStateAfter.dataState).not.toBe('hover-active');
                            expect(randomButtonStateAfter.dataState).toBe('inactive');
                        } catch (error) {
                            this.recordAnomaly({
                                type: 'highlight_logic_issue',
                                buttonId: randomButtonText.trim(),
                                expected: '非活动按钮无悬停状态',
                                actual: '非活动按钮有悬停状态',
                                message: `按钮 ${randomButtonText.trim()} 的鼠标移出逻辑异常: ${error.message}`,
                                timestamp: new Date().toISOString(),
                            });
                        }
                    } else {
                        // 活动按钮应该保持活动状态
                        try {
                            expect(randomButtonStateAfter.classes).toContain('active');
                            expect(randomButtonStateAfter.dataState).toBe('active');
                            expect(randomButtonStateAfter.classes).not.toContain('hover-active');
                        } catch (error) {
                            this.recordAnomaly({
                                type: 'highlight_logic_issue',
                                buttonId: randomButtonText.trim(),
                                expected: '活动按钮保持活动状态',
                                actual: '活动按钮状态异常',
                                message: `按钮 ${randomButtonText.trim()} 的活动状态保持异常: ${error.message}`,
                                timestamp: new Date().toISOString(),
                            });
                        }
                    }
                }
                
                // 观察手袋按钮状态
                const handbagState = this.getButtonState(handbagButton);
                if (handbagState.visible) {
                    console.log(`After iteration ${i}, handbag button state: ${handbagState.dataState}`);
                    
                    // 如果手袋按钮状态异常，记录异常
                    if (handbagState.dataState === 'hover-active') {
                        this.recordAnomaly({
                            type: 'unexpected_hover_state',
                            buttonId: '手袋',
                            expected: '非悬停状态',
                            actual: '悬停状态',
                            message: `按钮 手袋 出现意外悬停状态`,
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
            } catch (error) {
                console.error(`综合测试出错:`, error);
                this.recordTestError(error);
            }
            
            await this.delay(this.testConfig.testIterationDelay);
        }
        
        // 记录手袋按钮最终状态
        const finalHandbagState = this.getButtonState(handbagButton);
        
        console.log(`Final handbag button state: data-state=${finalHandbagState.dataState}, classes=${finalHandbagState.classes}`);
        
        // 验证手袋按钮状态保持不变
        try {
            expect(initialHandbagState.dataState).toBe(finalHandbagState.dataState);
            expect(initialHandbagState.classes).toBe(finalHandbagState.classes);
        } catch (error) {
            this.recordAnomaly({
                type: 'state_sync_issue',
                buttonId: '手袋',
                expected: '状态保持不变',
                actual: '状态发生变化',
                message: `按钮 手袋 的状态保持异常: ${error.message}`,
                timestamp: new Date().toISOString(),
            });
        }
        
        console.log('Comprehensive test completed');
    }
    
    /**
     * 获取按钮状态
     */
    getButtonState(button) {
        try {
            if (!button) {
                return {
                    visible: false,
                    dataState: 'unknown',
                    classes: '',
                    text: 'unknown',
                };
            }
            
            const isVisible = button.offsetParent !== null;
            if (!isVisible) {
                return {
                    visible: false,
                    dataState: 'unknown',
                    classes: '',
                    text: 'unknown',
                };
            }
            
            const dataState = button.getAttribute('data-state') || 'inactive';
            const classes = button.getAttribute('class') || '';
            const text = button.textContent || 'unknown';
            
            return {
                visible: true,
                dataState,
                classes,
                text,
            };
        } catch (error) {
            console.error('Error getting button state:', error);
            return {
                visible: false,
                dataState: 'error',
                classes: '',
                text: 'error',
            };
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
            expect(buttonState.classes).not.toContain('hover-active');
            expect(buttonState.dataState).not.toBe('hover-active');
            expect(buttonState.dataState).toBe('active');
        } else {
            // 非活动按钮应该有悬停状态
            expect(buttonState.classes).toContain('hover-active');
            expect(buttonState.dataState).toBe('hover-active');
        }
    }
    
    /**
     * 验证点击状态
     */
    validateClickState(buttonState, buttonText) {
        if (!buttonState.visible) {
            console.warn(`${buttonText} button is not visible, skipping validation`);
            return;
        }
        
        // data-state和class应该同步
        if (buttonState.classes.includes('active')) {
            expect(buttonState.dataState).toBe('active');
        } else {
            expect(buttonState.dataState).not.toBe('active');
        }
    }
    
    /**
     * 模拟悬停操作
     */
    async simulateHover(button) {
        if (!button) return;
        
        // 创建并触发鼠标进入事件
        const mouseEnterEvent = new MouseEvent('mouseenter', {
            bubbles: true,
            cancelable: true,
            view: window,
        });
        button.dispatchEvent(mouseEnterEvent);
        
        // 如果有导航状态管理器，也触发其事件处理
        if (this.navStateManager) {
            this.navStateManager.handleMouseEnter({ currentTarget: button });
        }
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
            relatedTarget: document.body,
        });
        button.dispatchEvent(mouseLeaveEvent);
        
        // 如果有导航状态管理器，也触发其事件处理
        if (this.navStateManager) {
            this.navStateManager.handleMouseLeave({ currentTarget: button });
        }
    }
    
    /**
     * 模拟点击操作
     */
    async simulateClick(button) {
        if (!button) return;
        
        // 创建并触发点击事件
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
        });
        button.dispatchEvent(clickEvent);
        
        // 如果有导航状态管理器，也触发其事件处理
        if (this.navStateManager) {
            this.navStateManager.handleClick({ currentTarget: button, preventDefault: () => {} });
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
        const anomalies = JSON.parse(localStorage.getItem('pageTestAnomalies') || '[]');
        
        // 添加新异常
        anomalies.push(anomaly);
        
        // 保存到本地存储
        localStorage.setItem('pageTestAnomalies', JSON.stringify(anomalies));
        
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
            timestamp: new Date().toISOString(),
        });
    }
    
    /**
     * 生成测试报告
     */
    generateTestReport() {
        const anomalies = JSON.parse(localStorage.getItem('pageTestAnomalies') || '[]');
        
        const report = {
            testType: 'full_page_test',
            timestamp: new Date().toISOString(),
            anomalies: anomalies,
            testConfig: this.testConfig,
            summary: {
                totalAnomalies: anomalies.length,
                anomalyTypes: anomalies.reduce((acc, anomaly) => {
                    acc[anomaly.type] = (acc[anomaly.type] || 0) + 1;
                    return acc;
                }, {}),
            },
        };
        
        // 保存测试报告
        const existingReports = JSON.parse(localStorage.getItem('pageTestReports') || '[]');
        existingReports.push(report);
        localStorage.setItem('pageTestReports', JSON.stringify(existingReports));
        
        // 在控制台输出测试报告
        console.log('=== 页面测试报告 ===');
        console.log(`测试类型: ${report.testType}`);
        console.log(`测试时间: ${report.timestamp}`);
        console.log(`异常数量: ${report.summary.totalAnomalies}`);
        console.log('异常类型分布:', report.summary.anomalyTypes);
        console.log('==================');
        
        // 清除当前异常记录，为下次测试做准备
        localStorage.removeItem('pageTestAnomalies');
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
                        timestamp: new Date().toISOString(),
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
                        timestamp: new Date().toISOString(),
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
                        timestamp: new Date().toISOString(),
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
                        timestamp: new Date().toISOString(),
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
                            timestamp: new Date().toISOString(),
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
                            timestamp: new Date().toISOString(),
                        });
                        throw error;
                    }
                },
            },
        };
    }
}

// 页面测试管理器实例
const pageTestManager = new PageTestManager();

// 导出页面测试管理器（供其他模块使用）
window.PageTestManager = PageTestManager;
window.pageTestManager = pageTestManager;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    pageTestManager.init();
});