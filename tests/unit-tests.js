/**
 * 认证系统单元测试
 * 生成时间: 2025-01-07 19:02:00
 * 测试覆盖: 所有核心认证模块
 */

class AuthTestSuite {
    constructor() {
        this.testResults = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }

    // 测试结果记录
    recordTest(testName, passed, message = '') {
        this.testResults.push({
            name: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        if (passed) {
            this.passedTests++;
            console.log(`✅ ${testName}: ${message}`);
        } else {
            this.failedTests++;
            console.error(`❌ ${testName}: ${message}`);
        }
    }

    // 断言函数
    assert(condition, testName, message) {
        this.recordTest(testName, condition, message);
        return condition;
    }

    assertEqual(actual, expected, testName) {
        const passed = actual === expected;
        const message = passed ? 
            `期望: ${expected}, 实际: ${actual}` : 
            `期望: ${expected}, 但得到: ${actual}`;
        this.recordTest(testName, passed, message);
        return passed;
    }

    assertNotNull(value, testName) {
        const passed = value !== null && value !== undefined;
        const message = passed ? '值不为空' : '值为空或未定义';
        this.recordTest(testName, passed, message);
        return passed;
    }

    // 1. 输入验证模块测试
    testInputValidator() {
        console.log('\n=== 输入验证模块测试 ===');
        
        try {
            const validator = new InputValidator();
            this.assertNotNull(validator, 'InputValidator实例化', 'InputValidator成功创建');

            // 邮箱验证测试
            const validEmail = validator.validateEmail('test@example.com');
            this.assert(validEmail.isValid, '有效邮箱验证', '正确的邮箱格式应该通过验证');

            const invalidEmail = validator.validateEmail('invalid-email');
            this.assert(!invalidEmail.isValid, '无效邮箱验证', '错误的邮箱格式应该被拒绝');

            // 密码验证测试
            const validPassword = validator.validatePassword('ValidPass123!');
            this.assert(validPassword.isValid, '有效密码验证', '符合要求的密码应该通过验证');

            const weakPassword = validator.validatePassword('123');
            this.assert(!weakPassword.isValid, '弱密码验证', '过于简单的密码应该被拒绝');

            // 用户名验证测试
            const validUsername = validator.validateUsername('testuser123');
            this.assert(validUsername.isValid, '有效用户名验证', '符合要求的用户名应该通过验证');

            const invalidUsername = validator.validateUsername('ab');
            this.assert(!invalidUsername.isValid, '无效用户名验证', '过短的用户名应该被拒绝');

            // 表单验证测试
            const validLoginForm = validator.validateLoginForm({
                username: 'testuser',
                password: 'ValidPass123!'
            });
            this.assert(validLoginForm.isValid, '登录表单验证', '有效的登录表单应该通过验证');

        } catch (error) {
            this.recordTest('InputValidator测试异常', false, error.message);
        }
    }

    // 2. 密码安全模块测试
    testPasswordSecurity() {
        console.log('\n=== 密码安全模块测试 ===');
        
        try {
            const passwordSecurity = new PasswordSecurityManager();
            this.assertNotNull(passwordSecurity, 'PasswordSecurityManager实例化', 'PasswordSecurityManager成功创建');

            // 密码强度测试
            const weakStrength = passwordSecurity.checkPasswordStrength('123456');
            this.assert(weakStrength.level === 'weak', '弱密码强度检测', '简单密码应该被识别为弱密码');

            const strongStrength = passwordSecurity.checkPasswordStrength('StrongPass123!@#');
            this.assert(strongStrength.level === 'strong' || strongStrength.level === 'very_strong', 
                '强密码强度检测', '复杂密码应该被识别为强密码');

            // 密码哈希测试
            const password = 'TestPassword123!';
            const hashedPassword = passwordSecurity.hashPassword(password);
            this.assertNotNull(hashedPassword, '密码哈希生成', '密码哈希应该成功生成');
            this.assert(hashedPassword !== password, '密码哈希不同', '哈希后的密码应该与原密码不同');

            // 密码验证测试
            const isValidPassword = passwordSecurity.verifyPassword(password, hashedPassword);
            this.assert(isValidPassword, '密码验证', '正确的密码应该通过验证');

            const isInvalidPassword = passwordSecurity.verifyPassword('WrongPassword', hashedPassword);
            this.assert(!isInvalidPassword, '错误密码验证', '错误的密码应该被拒绝');

        } catch (error) {
            this.recordTest('PasswordSecurity测试异常', false, error.message);
        }
    }

    // 3. 会话管理模块测试
    testSessionManager() {
        console.log('\n=== 会话管理模块测试 ===');
        
        try {
            const sessionManager = new SessionManager();
            this.assertNotNull(sessionManager, 'SessionManager实例化', 'SessionManager成功创建');

            // 会话创建测试
            const sessionData = {
                userId: 'test-user-123',
                username: 'testuser',
                email: 'test@example.com'
            };
            
            const session = sessionManager.createSession(sessionData);
            this.assertNotNull(session, '会话创建', '会话应该成功创建');
            this.assertNotNull(session.sessionId, '会话ID生成', '会话ID应该被生成');
            this.assertNotNull(session.expiresAt, '会话过期时间', '会话过期时间应该被设置');

            // 会话获取测试
            const retrievedSession = sessionManager.getCurrentSession();
            this.assertNotNull(retrievedSession, '会话获取', '应该能够获取当前会话');
            this.assertEqual(retrievedSession.sessionId, session.sessionId, '会话ID匹配', '获取的会话ID应该匹配');

            // 会话验证测试
            const isValidSession = sessionManager.validateSession(session.sessionId);
            this.assert(isValidSession, '会话验证', '有效的会话应该通过验证');

            // 会话更新测试
            const updatedSession = sessionManager.updateSession(session.sessionId, {
                lastActivity: new Date().toISOString()
            });
            this.assertNotNull(updatedSession, '会话更新', '会话应该成功更新');

            // 会话销毁测试
            const destroyResult = sessionManager.destroySession(session.sessionId);
            this.assert(destroyResult, '会话销毁', '会话应该成功销毁');

            // 验证会话已被销毁
            const destroyedSession = sessionManager.getCurrentSession();
            this.assert(!destroyedSession, '会话销毁验证', '销毁后应该无法获取会话');

        } catch (error) {
            this.recordTest('SessionManager测试异常', false, error.message);
        }
    }

    // 4. UI交互模块测试
    testUIInteraction() {
        console.log('\n=== UI交互模块测试 ===');
        
        try {
            const uiManager = new UIInteractionManager();
            this.assertNotNull(uiManager, 'UIInteractionManager实例化', 'UIInteractionManager成功创建');

            // 创建测试DOM元素
            const testContainer = document.createElement('div');
            testContainer.innerHTML = `
                <form id="test-login-form">
                    <input type="text" id="test-username" name="username">
                    <input type="password" id="test-password" name="password">
                    <button type="submit">登录</button>
                </form>
                <div id="test-message-container"></div>
                <div id="test-loading-indicator" style="display: none;">加载中...</div>
            `;
            document.body.appendChild(testContainer);

            // 表单显示/隐藏测试
            uiManager.showForm('test-login-form');
            const form = document.getElementById('test-login-form');
            this.assert(form.style.display !== 'none', '表单显示', '表单应该被显示');

            uiManager.hideForm('test-login-form');
            this.assert(form.style.display === 'none', '表单隐藏', '表单应该被隐藏');

            // 加载状态测试
            uiManager.showLoading('test-loading-indicator');
            const loadingIndicator = document.getElementById('test-loading-indicator');
            this.assert(loadingIndicator.style.display !== 'none', '加载状态显示', '加载指示器应该被显示');

            uiManager.hideLoading('test-loading-indicator');
            this.assert(loadingIndicator.style.display === 'none', '加载状态隐藏', '加载指示器应该被隐藏');

            // 消息显示测试
            uiManager.showMessage('test-message-container', '测试消息', 'success');
            const messageContainer = document.getElementById('test-message-container');
            this.assert(messageContainer.innerHTML.includes('测试消息'), '消息显示', '消息应该被显示');

            // 清理测试DOM
            document.body.removeChild(testContainer);

        } catch (error) {
            this.recordTest('UIInteraction测试异常', false, error.message);
        }
    }

    // 5. API集成模块测试
    testAPIIntegration() {
        console.log('\n=== API集成模块测试 ===');
        
        try {
            const apiManager = new APIIntegrationManager();
            this.assertNotNull(apiManager, 'APIIntegrationManager实例化', 'APIIntegrationManager成功创建');

            // HTTP客户端测试
            const httpClient = apiManager.httpClient;
            this.assertNotNull(httpClient, 'HTTPClient获取', 'HTTPClient应该可用');

            // 请求拦截器测试
            const requestInterceptor = apiManager.requestInterceptor;
            this.assertNotNull(requestInterceptor, 'RequestInterceptor获取', 'RequestInterceptor应该可用');

            // 响应拦截器测试
            const responseInterceptor = apiManager.responseInterceptor;
            this.assertNotNull(responseInterceptor, 'ResponseInterceptor获取', 'ResponseInterceptor应该可用');

            // 缓存管理器测试
            const cacheManager = apiManager.cacheManager;
            this.assertNotNull(cacheManager, 'CacheManager获取', 'CacheManager应该可用');

            // 速率限制器测试
            const rateLimiter = apiManager.rateLimiter;
            this.assertNotNull(rateLimiter, 'RateLimiter获取', 'RateLimiter应该可用');

            // 模拟API调用测试（不实际发送请求）
            this.assert(typeof apiManager.login === 'function', 'login方法存在', 'login方法应该存在');
            this.assert(typeof apiManager.register === 'function', 'register方法存在', 'register方法应该存在');
            this.assert(typeof apiManager.logout === 'function', 'logout方法存在', 'logout方法应该存在');
            this.assert(typeof apiManager.refreshToken === 'function', 'refreshToken方法存在', 'refreshToken方法应该存在');

        } catch (error) {
            this.recordTest('APIIntegration测试异常', false, error.message);
        }
    }

    // 6. 主认证管理器测试
    testAuthManager() {
        console.log('\n=== 主认证管理器测试 ===');
        
        try {
            const authManager = new AuthManager();
            this.assertNotNull(authManager, 'AuthManager实例化', 'AuthManager成功创建');

            // 模块初始化测试
            this.assertNotNull(authManager.inputValidator, '输入验证器初始化', '输入验证器应该被初始化');
            this.assertNotNull(authManager.passwordSecurity, '密码安全管理器初始化', '密码安全管理器应该被初始化');
            this.assertNotNull(authManager.sessionManager, '会话管理器初始化', '会话管理器应该被初始化');
            this.assertNotNull(authManager.uiManager, 'UI管理器初始化', 'UI管理器应该被初始化');
            this.assertNotNull(authManager.apiManager, 'API管理器初始化', 'API管理器应该被初始化');

            // 核心方法存在性测试
            this.assert(typeof authManager.login === 'function', 'login方法存在', 'login方法应该存在');
            this.assert(typeof authManager.register === 'function', 'register方法存在', 'register方法应该存在');
            this.assert(typeof authManager.logout === 'function', 'logout方法存在', 'logout方法应该存在');
            this.assert(typeof authManager.checkExistingSession === 'function', 'checkExistingSession方法存在', 'checkExistingSession方法应该存在');

            // 事件处理方法测试
            this.assert(typeof authManager.handleSessionExpired === 'function', 'handleSessionExpired方法存在', 'handleSessionExpired方法应该存在');
            this.assert(typeof authManager.handleTokenRefreshed === 'function', 'handleTokenRefreshed方法存在', 'handleTokenRefreshed方法应该存在');

            // 工具方法测试
            this.assert(typeof authManager.getDeviceInfo === 'function', 'getDeviceInfo方法存在', 'getDeviceInfo方法应该存在');
            this.assert(typeof authManager.generateSessionId === 'function', 'generateSessionId方法存在', 'generateSessionId方法应该存在');

            // 设备信息获取测试
            const deviceInfo = authManager.getDeviceInfo();
            this.assertNotNull(deviceInfo, '设备信息获取', '设备信息应该被获取');
            this.assertNotNull(deviceInfo.userAgent, '用户代理获取', '用户代理信息应该存在');

            // 会话ID生成测试
            const sessionId = authManager.generateSessionId();
            this.assertNotNull(sessionId, '会话ID生成', '会话ID应该被生成');
            this.assert(sessionId.length > 10, '会话ID长度', '会话ID应该有足够的长度');

        } catch (error) {
            this.recordTest('AuthManager测试异常', false, error.message);
        }
    }

    // 7. 集成测试
    testIntegration() {
        console.log('\n=== 集成测试 ===');
        
        try {
            // 完整认证流程模拟测试
            const authManager = new AuthManager();
            
            // 模拟用户注册流程
            const registerData = {
                username: 'testuser123',
                email: 'test@example.com',
                password: 'TestPassword123!',
                confirmPassword: 'TestPassword123!'
            };
            
            // 验证注册数据
            const usernameValid = authManager.inputValidator.validateUsername(registerData.username);
            const emailValid = authManager.inputValidator.validateEmail(registerData.email);
            const passwordValid = authManager.inputValidator.validatePassword(registerData.password);
            
            this.assert(usernameValid.isValid && emailValid.isValid && passwordValid.isValid, 
                '注册数据验证', '所有注册数据应该通过验证');
            
            // 密码强度检查
            const passwordStrength = authManager.passwordSecurity.checkPasswordStrength(registerData.password);
            this.assert(passwordStrength.score >= 60, '注册密码强度', '注册密码应该有足够的强度');
            
            // 模拟会话创建
            const sessionData = {
                userId: 'user-123',
                username: registerData.username,
                email: registerData.email
            };
            
            const session = authManager.sessionManager.createSession(sessionData);
            this.assertNotNull(session, '集成会话创建', '集成测试中会话应该成功创建');
            
            // 验证会话
            const isValidSession = authManager.sessionManager.validateSession(session.sessionId);
            this.assert(isValidSession, '集成会话验证', '集成测试中会话应该有效');
            
            // 清理会话
            authManager.sessionManager.destroySession(session.sessionId);
            
        } catch (error) {
            this.recordTest('集成测试异常', false, error.message);
        }
    }

    // 运行所有测试
    runAllTests() {
        console.log('🚀 开始运行认证系统单元测试');
        console.log('='.repeat(50));
        
        const startTime = Date.now();
        
        // 重置测试计数器
        this.testResults = [];
        this.passedTests = 0;
        this.failedTests = 0;
        
        // 运行各个测试模块
        this.testInputValidator();
        this.testPasswordSecurity();
        this.testSessionManager();
        this.testUIInteraction();
        this.testAPIIntegration();
        this.testAuthManager();
        this.testIntegration();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // 输出测试结果
        console.log('\n' + '='.repeat(50));
        console.log('📊 测试结果汇总');
        console.log('='.repeat(50));
        console.log(`总测试数: ${this.passedTests + this.failedTests}`);
        console.log(`✅ 通过: ${this.passedTests}`);
        console.log(`❌ 失败: ${this.failedTests}`);
        console.log(`⏱️ 耗时: ${duration}ms`);
        console.log(`📈 通过率: ${((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(2)}%`);
        
        if (this.failedTests > 0) {
            console.log('\n❌ 失败的测试:');
            this.testResults.filter(test => !test.passed).forEach(test => {
                console.log(`  - ${test.name}: ${test.message}`);
            });
        }
        
        console.log('\n🎉 测试完成!');
        
        return {
            total: this.passedTests + this.failedTests,
            passed: this.passedTests,
            failed: this.failedTests,
            duration: duration,
            passRate: (this.passedTests / (this.passedTests + this.failedTests)) * 100,
            results: this.testResults
        };
    }

    // 生成测试报告
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.passedTests + this.failedTests,
                passed: this.passedTests,
                failed: this.failedTests,
                passRate: (this.passedTests / (this.passedTests + this.failedTests)) * 100
            },
            details: this.testResults
        };
        
        return JSON.stringify(report, null, 2);
    }
}

// 导出测试套件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthTestSuite;
}

// 浏览器环境下自动运行测试
if (typeof window !== 'undefined') {
    window.AuthTestSuite = AuthTestSuite;
    
    // 页面加载完成后运行测试
    window.addEventListener('load', function() {
        // 等待所有模块加载完成
        setTimeout(() => {
            if (typeof AuthManager !== 'undefined') {
                const testSuite = new AuthTestSuite();
                window.testResults = testSuite.runAllTests();
                
                // 将测试报告保存到全局变量
                window.testReport = testSuite.generateReport();
                
                console.log('\n📄 测试报告已保存到 window.testReport');
                console.log('💾 可以通过 console.log(window.testReport) 查看详细报告');
            } else {
                console.error('❌ AuthManager未加载，无法运行测试');
            }
        }, 1000);
    });
}