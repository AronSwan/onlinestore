#!/usr/bin/env node
/**
 * OpenObserve简单连接测试脚本
 * 用于验证OpenObserve服务是否可用
 */

const axios = require('axios');

// 配置参数
const CONFIG = {
    openobserveUrl: 'http://localhost:5080',
    organization: 'default',
    requestTimeout: 10000,
    username: 'admin@example.com',
    password: 'ComplexPass#123'
};

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

// 获取认证令牌
async function getAuthToken() {
    try {
        log('获取认证令牌...', colors.blue);
        const response = await axios.post(
            `${CONFIG.openobserveUrl}/api/${CONFIG.organization}/login`,
            {
                email: CONFIG.username,
                password: CONFIG.password
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: CONFIG.requestTimeout
            }
        );
        
        if (response.status === 200 && response.data.data) {
            const token = response.data.data.token;
            log('✅ 认证令牌获取成功', colors.green);
            return token;
        } else {
            log('❌ 认证令牌获取失败', colors.red);
            return null;
        }
    } catch (error) {
        log(`❌ 认证令牌获取失败: ${error.message}`, colors.red);
        return null;
    }
}

// 测试基本连接
async function testBasicConnection() {
    try {
        log('1. 测试基本连接...', colors.blue);
        const response = await axios.get(`${CONFIG.openobserveUrl}/`, {
            timeout: CONFIG.requestTimeout
        });
        
        if (response.status === 200) {
            log('✅ 基本连接成功', colors.green);
            return true;
        } else {
            log(`❌ 基本连接失败，状态码: ${response.status}`, colors.red);
            return false;
        }
    } catch (error) {
        log(`❌ 基本连接失败: ${error.message}`, colors.red);
        return false;
    }
}

// 测试API连接
async function testApiConnection(token) {
    try {
        log('2. 测试API连接...', colors.blue);
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await axios.get(`${CONFIG.openobserveUrl}/api/${CONFIG.organization}/streams`, {
            headers,
            timeout: CONFIG.requestTimeout
        });
        
        if (response.status === 200) {
            log('✅ API连接成功', colors.green);
            const streams = response.data.list || [];
            log(`   发现数据流: ${streams.length}个`, colors.cyan);
            streams.forEach(stream => {
                log(`   - ${stream.name} (${stream.type})`, colors.cyan);
            });
            return true;
        } else {
            log(`❌ API连接失败，状态码: ${response.status}`, colors.red);
            return false;
        }
    } catch (error) {
        log(`❌ API连接失败: ${error.message}`, colors.red);
        return false;
    }
}

// 测试数据写入
async function testDataWrite(token) {
    try {
        log('3. 测试数据写入...', colors.blue);
        
        const testData = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            service: 'test-service',
            message: 'Simple connectivity test',
            test_id: 'test_' + Date.now()
        };
        
        const headers = token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const response = await axios.post(
            `${CONFIG.openobserveUrl}/api/${CONFIG.organization}/application-logs/_json`,
            { logs: [testData] },
            {
                headers,
                timeout: CONFIG.requestTimeout
            }
        );
        
        if (response.status === 200) {
            log('✅ 数据写入成功', colors.green);
            return true;
        } else {
            log(`❌ 数据写入失败，状态码: ${response.status}`, colors.red);
            return false;
        }
    } catch (error) {
        log(`❌ 数据写入失败: ${error.message}`, colors.red);
        return false;
    }
}

// 主测试函数
async function runSimpleConnectivityTests() {
    log('=== OpenObserve简单连接测试 ===', colors.cyan);
    log(`测试目标: ${CONFIG.openobserveUrl}`);
    log(`组织: ${CONFIG.organization}`);
    log(`用户: ${CONFIG.username}`);
    log('');
    
    const results = [];
    
    // 1. 基本连接测试
    results.push(await testBasicConnection());
    
    // 2. 获取认证令牌
    const token = await getAuthToken();
    
    // 3. API连接测试
    if (token) {
        results.push(await testApiConnection(token));
    } else {
        log('⚠️  跳过API连接测试（无认证令牌）', colors.yellow);
        results.push(false);
    }
    
    // 4. 数据写入测试
    if (token) {
        results.push(await testDataWrite(token));
    } else {
        log('⚠️  跳过数据写入测试（无认证令牌）', colors.yellow);
        results.push(false);
    }
    
    // 最终评估
    log('\n=== 测试结果 ===', colors.cyan);
    const passedTests = results.filter(r => r).length;
    const totalTests = results.length;
    
    if (passedTests === totalTests) {
        log(`🎉 所有测试通过！(${passedTests}/${totalTests})`, colors.green);
        log('OpenObserve服务正常运行，可以进行性能测试。', colors.green);
    } else if (passedTests >= totalTests / 2) {
        log(`⚠️  部分测试通过(${passedTests}/${totalTests})`, colors.yellow);
        log('OpenObserve服务基本可用，但可能存在一些问题。', colors.yellow);
    } else {
        log(`❌ 大部分测试失败(${passedTests}/${totalTests})`, colors.red);
        log('OpenObserve服务存在问题，需要检查配置。', colors.red);
    }
    
    return passedTests === totalTests;
}

// 执行测试
if (require.main === module) {
    runSimpleConnectivityTests().catch(error => {
        log(`简单连接测试执行失败: ${error.message}`, colors.red);
        process.exit(1);
    });
}

module.exports = {
    runSimpleConnectivityTests,
    CONFIG
};