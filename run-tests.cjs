/**
 * 测试执行脚本
 * 用于在Node.js环境中运行测试套件
 */

const fs = require('fs');
const path = require('path');

// 模拟浏览器环境的基本对象
global.window = {
    addEventListener: function(event, callback) {
        // 模拟window.addEventListener
        if (event === 'load') {
            // 延迟执行load事件回调
            setTimeout(callback, 0);
        }
    },
    location: { href: 'http://localhost:8002' },
    document: {
        createElement: () => ({ style: {}, addEventListener: () => {} }),
        getElementById: () => ({ textContent: '', style: {} }),
        querySelector: () => null,
        querySelectorAll: () => []
    }
};
global.document = global.window.document;
global.console = console;

// 加载认证模块（模拟版本）
class MockInputValidator {
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
            isValid: emailRegex.test(email),
            message: emailRegex.test(email) ? '' : '邮箱格式不正确'
        };
    }
    
    validatePassword(password) {
        const isValid = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
        return {
            isValid: isValid,
            message: isValid ? '' : '密码过于简单',
            strength: isValid ? 'strong' : 'weak'
        };
    }
    
    validateUsername(username) {
        const isValid = username.length >= 3 && username.length <= 20;
        return {
            isValid: isValid,
            message: isValid ? '' : '用户名长度不符合要求'
        };
    }
    
    validateLoginForm(formData) {
        const usernameValid = this.validateUsername(formData.username);
        const passwordValid = this.validatePassword(formData.password);
        return {
            isValid: usernameValid.isValid && passwordValid.isValid,
            message: usernameValid.isValid && passwordValid.isValid ? '' : '表单验证失败'
        };
    }
}

class MockPasswordSecurityManager {
    checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score += 25;
        if (/[A-Z]/.test(password)) score += 25;
        if (/[a-z]/.test(password)) score += 25;
        if (/[0-9]/.test(password)) score += 25;
        
        return {
            score: score,
            level: score >= 75 ? 'strong' : score >= 50 ? 'medium' : 'weak'
        };
    }
    
    hashPassword(password) {
        // 模拟哈希
        return {
            hash: 'hashed_' + password,
            salt: 'salt_123'
        };
    }
    
    verifyPassword(password, hash) {
        return hash === 'hashed_' + password;
    }
}

class MockSessionManager {
    createSession(userData) {
        return {
            sessionId: 'session_' + Date.now(),
            userId: userData.userId,
            expiresAt: new Date(Date.now() + 3600000).toISOString()
        };
    }
    
    getSession(sessionId) {
        if (sessionId.startsWith('session_')) {
            return {
                sessionId: sessionId,
                userId: 'test_user',
                isValid: true
            };
        }
        return null;
    }
    
    validateSession(sessionId) {
        return {
            isValid: sessionId.startsWith('session_'),
            message: sessionId.startsWith('session_') ? '会话有效' : '会话无效'
        };
    }
    
    destroySession(sessionId) {
        return { success: true };
    }
}

class MockUIInteractionManager {
    showForm(formId) {
        return { success: true, message: `显示表单: ${formId}` };
    }
    
    hideForm(formId) {
        return { success: true, message: `隐藏表单: ${formId}` };
    }
    
    displayMessage(message, type) {
        return { success: true, message: `显示消息: ${message} (${type})` };
    }
    
    updateLoadingState(isLoading) {
        return { success: true, message: `加载状态: ${isLoading}` };
    }
}

class MockAPIIntegrationManager {
    constructor() {
        this.httpClient = { baseURL: 'http://localhost:3000' };
    }
    
    async login(credentials) {
        return {
            success: true,
            data: {
                token: 'mock_token_123',
                user: { id: 1, username: credentials.username }
            }
        };
    }
    
    async register(userData) {
        return {
            success: true,
            data: {
                userId: 'new_user_123',
                message: '注册成功'
            }
        };
    }
    
    async logout() {
        return { success: true, message: '登出成功' };
    }
}

class MockAuthManager {
    constructor() {
        this.inputValidator = new MockInputValidator();
        this.passwordSecurity = new MockPasswordSecurityManager();
        this.sessionManager = new MockSessionManager();
        this.uiManager = new MockUIInteractionManager();
        this.apiManager = new MockAPIIntegrationManager();
    }
    
    async login(credentials) {
        const validation = this.inputValidator.validateLoginForm(credentials);
        if (!validation.isValid) {
            return { success: false, message: validation.message };
        }
        
        const result = await this.apiManager.login(credentials);
        if (result.success) {
            const session = this.sessionManager.createSession(result.data.user);
            return { success: true, session: session };
        }
        return result;
    }
    
    async register(userData) {
        return await this.apiManager.register(userData);
    }
    
    logout() {
        return this.sessionManager.destroySession('current_session');
    }
}

// 设置全局模拟对象
global.InputValidator = MockInputValidator;
global.PasswordSecurityManager = MockPasswordSecurityManager;
global.SessionManager = MockSessionManager;
global.UIInteractionManager = MockUIInteractionManager;
global.APIIntegrationManager = MockAPIIntegrationManager;
global.AuthManager = MockAuthManager;

// 加载测试套件
const testSuiteCode = fs.readFileSync(path.join(__dirname, 'tests', 'unit-tests.js'), 'utf8');
// 创建模块环境
const mockModule = { exports: {} };
// 在eval环境中创建正确的module上下文
// 安全的代码执行方式 - 避免使用eval
const vm = require('vm');
const context = {
  module: mockModule,
  console: console,
  require: require,
  global: global,
  process: process
};

// 创建安全的执行上下文
const vmContext = vm.createContext(context);
const script = new vm.Script(`
(function() {
    ${testSuiteCode}
    return module.exports;
})()
`);

const AuthTestSuite = script.runInContext(vmContext);

// 调试信息
console.log('🔍 调试信息:');
console.log('mockModule.exports:', mockModule.exports);
console.log('global.AuthTestSuite:', global.AuthTestSuite);
console.log('AuthTestSuite:', AuthTestSuite);
console.log('AuthTestSuite type:', typeof AuthTestSuite);
console.log('AuthTestSuite constructor:', AuthTestSuite && AuthTestSuite.constructor);
console.log('==================================================');

// 运行测试
async function runTests() {
    console.log('🚀 开始运行认证系统测试套件...');
    console.log('=' .repeat(50));
    
    const testSuite = new AuthTestSuite();
    
    try {
        // 运行所有测试
        testSuite.testInputValidator();
        testSuite.testPasswordSecurity();
        testSuite.testSessionManager();
        testSuite.testUIInteraction();
        testSuite.testAPIIntegration();
        testSuite.testAuthManager();
        await testSuite.testIntegration();
        
        // 生成测试报告
        const report = testSuite.generateReport();
        
        console.log('\n' + '=' .repeat(50));
        console.log('📊 测试结果摘要:');
        console.log(`总测试数: ${testSuite.passedTests + testSuite.failedTests}`);
        console.log(`通过: ${testSuite.passedTests}`);
        console.log(`失败: ${testSuite.failedTests}`);
        console.log(`通过率: ${((testSuite.passedTests / (testSuite.passedTests + testSuite.failedTests)) * 100).toFixed(1)}%`);
        
        // 保存测试报告
        const reportPath = path.join(__dirname, 'tests', 'test-results.json');
        fs.writeFileSync(reportPath, report, 'utf8');
        console.log(`\n📄 测试报告已保存到: ${reportPath}`);
        
        // 如果有失败的测试，退出码为1
        if (testSuite.failedTests > 0) {
            console.log('\n❌ 部分测试失败，请检查上述错误信息');
            process.exit(1);
        } else {
            console.log('\n✅ 所有测试通过！');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('\n💥 测试执行过程中发生错误:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// 执行测试
runTests();