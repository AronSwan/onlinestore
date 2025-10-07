#!/usr/bin/env node
/**
 * OpenObserve无认证连接测试脚本
 * 用于验证OpenObserve服务是否可用（禁用认证）
 */

const axios = require('axios');

// 配置参数
const CONFIG = {
    openobserveUrl: 'http://localhost:5080',
    organization: 'default',
    requestTimeout: 10000
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
async function testApiConnection() {
    try {
        log('2. 测试API连接...', colors.blue);
        const response = await axios.get(`${CONFIG.openobserveUrl}/api/${CONFIG.organization}/streams`, {
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
async function testDataWrite() {
    try {
        log('3. 测试数据写入...', colors.blue);
        
        const testData = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            service: 'test-service',
            message: 'No-auth connectivity test',
            test_id: 'test_' + Date.now()
        };
        
        const response = await axios.post(
            `${CONFIG.openobserveUrl}/api/${CONFIG.organization}/application-logs/_json`,
            { logs: [testData] },
            {
                headers: { 'Content-Type': 'application/json' },
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

// 测试数据查询
async function testDataQuery() {
    try {
        log('4. 测试数据查询...', colors.blue);
        
        const response = await axios.post(
            `${CONFIG.openobserveUrl}/api/${CONFIG.organization}/_search`,
            {
                query: {
                    sql: 'SELECT * FROM application-logs WHERE timestamp >= now() - INTERVAL \'1 hour\' LIMIT 10',
                    start_time: new Date(Date.now() - 3600000).toISOString(),
                    end_time: new Date().toISOString(),
                    size: 10
                }
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: CONFIG.requestTimeout
            }
        );
        
        if (response.status === 200) {
            log('✅ 数据查询成功', colors.green);
            const hits = response.data.hits || [];
            log(`   查询结果: ${hits.length}条记录`, colors.cyan);
            return true;
        } else {
            log(`❌ 数据查询失败，状态码: ${response.status}`, colors.red);
            return false;
        }
    } catch (error) {
        log(`❌ 数据查询失败: ${error.message}`, colors.red);
        return false;
    }
}

// 主测试函数
async function runNoAuthConnectivityTests() {
    log('=== OpenObserve无认证连接测试 ===', colors.cyan);
    log(`测试目标: ${CONFIG.openobserveUrl}`);
    log(`组织: ${CONFIG.organization}`);
    log('');
    
    const results = [];
    
    // 1. 基本连接测试
    results.push(await testBasicConnection());
    
    // 2. API连接测试
    results.push(await testApiConnection());
    
    // 3. 数据写入测试
    results.push(await testDataWrite());
    
    // 4. 数据查询测试
    results.push(await testDataQuery());
    
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
    runNoAuthConnectivityTests().catch(error => {
        log(`无认证连接测试执行失败: ${error.message}`, colors.red);
        process.exit(1);
    });
}

module.exports = {
    runNoAuthConnectivityTests,
    CONFIG
};