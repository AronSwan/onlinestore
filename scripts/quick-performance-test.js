#!/usr/bin/env node
/**
 * OpenObserve快速性能测试脚本 - 阶段四优化版本
 * 用于快速验证系统基本性能
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// 配置参数
const CONFIG = {
    openobserveUrl: 'http://localhost:5080',
    organization: 'default',
    testDuration: 60000, // 1分钟
    concurrentUsers: 10,
    rampUpTime: 10000, // 10秒
    requestTimeout: 5000,
    logStreams: ['application-logs', 'system-metrics']
};

// 测试结果收集
const testResults = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    errors: [],
    startTime: null,
    endTime: null,
    throughput: 0,
    errorRate: 0,
    avgResponseTime: 0,
    p95ResponseTime: 0
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

// 生成测试数据
function generateTestLogData() {
    const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
    const services = ['user-service', 'order-service', 'payment-service'];
    const messages = [
        'User login successful',
        'Order processed successfully',
        'Payment completed',
        'API request processed'
    ];

    return {
        timestamp: new Date().toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        service: services[Math.floor(Math.random() * services.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        duration: Math.floor(Math.random() * 500) + 10,
        user_id: `user_${Math.floor(Math.random() * 1000)}`,
        request_id: `req_${Math.random().toString(36).substr(2, 9)}`
    };
}

function generateTestMetricData() {
    const metrics = [
        'cpu_usage_percent',
        'memory_usage_percent',
        'http_requests_total',
        'http_request_duration_ms'
    ];

    return {
        timestamp: new Date().toISOString(),
        metric_name: metrics[Math.floor(Math.random() * metrics.length)],
        value: Math.random() * 100,
        labels: {
            instance: `server-${Math.floor(Math.random() * 3) + 1}`,
            job: 'application'
        }
    };
}

// 健康检查
async function healthCheck() {
    try {
        // OpenObserve使用根路径作为健康检查
        const response = await axios.get(`${CONFIG.openobserveUrl}/`, {
            timeout: 5000
        });
        
        // 进一步检查API是否可用
        const apiResponse = await axios.get(`${CONFIG.openobserveUrl}/api/${CONFIG.organization}/streams`, {
            timeout: 5000
        });
        
        return response.status === 200 && apiResponse.status === 200;
    } catch (error) {
        log(`健康检查失败: ${error.message}`, colors.red);
        return false;
    }
}

// 测试数据写入
async function testDataWrite(stream, data) {
    const startTime = performance.now();
    
    try {
        const response = await axios.post(
            `${CONFIG.openobserveUrl}/api/${CONFIG.organization}/${stream}/_json`,
            { logs: Array.isArray(data) ? data : [data] },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: CONFIG.requestTimeout
            }
        );
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        testResults.totalRequests++;
        testResults.successfulRequests++;
        testResults.responseTimes.push(responseTime);
        
        return {
            success: true,
            responseTime,
            status: response.status
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        testResults.totalRequests++;
        testResults.failedRequests++;
        testResults.responseTimes.push(responseTime);
        testResults.errors.push({
            error: error.message,
            responseTime,
            timestamp: new Date().toISOString()
        });
        
        return {
            success: false,
            responseTime,
            error: error.message
        };
    }
}

// 测试数据查询
async function testQuery(stream, query) {
    const startTime = performance.now();
    
    try {
        const response = await axios.post(
            `${CONFIG.openobserveUrl}/api/${CONFIG.organization}/_search`,
            {
                query: {
                    sql: query,
                    start_time: new Date(Date.now() - 3600000).toISOString(), // 1小时前
                    end_time: new Date().toISOString(),
                    size: 50
                }
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: CONFIG.requestTimeout
            }
        );
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        testResults.totalRequests++;
        testResults.successfulRequests++;
        testResults.responseTimes.push(responseTime);
        
        return {
            success: true,
            responseTime,
            resultCount: response.data.hits?.length || 0,
            status: response.status
        };
    } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        testResults.totalRequests++;
        testResults.failedRequests++;
        testResults.responseTimes.push(responseTime);
        testResults.errors.push({
            error: error.message,
            responseTime,
            timestamp: new Date().toISOString()
        });
        
        return {
            success: false,
            responseTime,
            error: error.message
        };
    }
}

// 并发测试执行器
async function runConcurrentTest(testFunction, concurrency, duration) {
    const promises = [];
    const startTime = Date.now();
    
    // 创建并发任务
    for (let i = 0; i < concurrency; i++) {
        promises.push(
            (async () => {
                const userStartTime = Date.now() + (i * CONFIG.rampUpTime / concurrency);
                
                while (Date.now() - startTime < duration) {
                    if (Date.now() >= userStartTime) {
                        await testFunction();
                    }
                    // 随机间隔 200-800ms
                    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 600));
                }
            })()
        );
    }
    
    await Promise.all(promises);
}

// 计算统计指标
function calculateStatistics() {
    if (testResults.responseTimes.length === 0) return;
    
    testResults.responseTimes.sort((a, b) => a - b);
    
    testResults.avgResponseTime = testResults.responseTimes.reduce((a, b) => a + b, 0) / testResults.responseTimes.length;
    testResults.p95ResponseTime = testResults.responseTimes[Math.floor(testResults.responseTimes.length * 0.95)];
    
    const durationInSeconds = (testResults.endTime - testResults.startTime) / 1000;
    testResults.throughput = testResults.totalRequests / durationInSeconds;
    testResults.errorRate = (testResults.failedRequests / testResults.totalRequests) * 100;
}

// 生成性能报告
function generateReport() {
    log('\n=== 快速性能测试报告 ===', colors.cyan);
    log(`测试开始时间: ${testResults.startTime.toISOString()}`);
    log(`测试结束时间: ${testResults.endTime.toISOString()}`);
    log(`测试持续时间: ${Math.round((testResults.endTime - testResults.startTime) / 1000)}秒`);
    log('');
    
    log('=== 请求统计 ===', colors.cyan);
    log(`总请求数: ${testResults.totalRequests}`);
    log(`成功请求数: ${testResults.successfulRequests}`);
    log(`失败请求数: ${testResults.failedRequests}`);
    log(`错误率: ${testResults.errorRate.toFixed(2)}%`);
    log('');
    
    log('=== 响应时间 ===', colors.cyan);
    log(`平均响应时间: ${testResults.avgResponseTime.toFixed(2)}ms`);
    log(`P95响应时间: ${testResults.p95ResponseTime.toFixed(2)}ms`);
    log('');
    
    log('=== 吞吐量 ===', colors.cyan);
    log(`吞吐量: ${testResults.throughput.toFixed(2)} 请求/秒`);
    log('');
    
    if (testResults.errors.length > 0) {
        log('=== 错误详情 ===', colors.red);
        testResults.errors.slice(0, 5).forEach(error => {
            log(`${error.timestamp}: ${error.error}`, colors.red);
        });
        if (testResults.errors.length > 5) {
            log(`... 还有 ${testResults.errors.length - 5} 个错误`, colors.red);
        }
    }
    
    // 性能评估
    log('\n=== 性能评估 ===', colors.cyan);
    if (testResults.errorRate < 5 && testResults.p95ResponseTime < 3000) {
        log('✅ 快速性能测试通过', colors.green);
    } else if (testResults.errorRate < 10 && testResults.p95ResponseTime < 5000) {
        log('⚠️  快速性能测试勉强通过', colors.yellow);
    } else {
        log('❌ 快速性能测试失败', colors.red);
    }
}

// 写入性能测试
async function runWritePerformanceTest() {
    log('\n=== 开始写入性能测试 ===', colors.blue);
    
    testResults.startTime = new Date();
    
    await runConcurrentTest(async () => {
        const stream = CONFIG.logStreams[Math.floor(Math.random() * CONFIG.logStreams.length)];
        const data = stream.includes('logs') ? generateTestLogData() : generateTestMetricData();
        await testDataWrite(stream, data);
    }, CONFIG.concurrentUsers, CONFIG.testDuration);
    
    testResults.endTime = new Date();
    
    calculateStatistics();
    generateReport();
    
    return testResults.errorRate < 5 && testResults.p95ResponseTime < 3000;
}

// 查询性能测试
async function runQueryPerformanceTest() {
    log('\n=== 开始查询性能测试 ===', colors.blue);
    
    const queryResults = { ...testResults };
    queryResults.totalRequests = 0;
    queryResults.successfulRequests = 0;
    queryResults.failedRequests = 0;
    queryResults.responseTimes = [];
    queryResults.errors = [];
    
    const queries = [
        'SELECT * FROM application-logs WHERE timestamp >= now() - INTERVAL \'1 hour\' LIMIT 50',
        'SELECT level, COUNT(*) FROM application-logs WHERE timestamp >= now() - INTERVAL \'1 day\' GROUP BY level',
        'SELECT * FROM system-metrics WHERE metric_name = \'cpu_usage_percent\' ORDER BY timestamp DESC LIMIT 50'
    ];
    
    queryResults.startTime = new Date();
    
    await runConcurrentTest(async () => {
        const query = queries[Math.floor(Math.random() * queries.length)];
        await testQuery('application-logs', query);
    }, Math.floor(CONFIG.concurrentUsers / 2), CONFIG.testDuration / 2);
    
    queryResults.endTime = new Date();
    
    // 计算查询统计
    if (queryResults.responseTimes.length > 0) {
        queryResults.responseTimes.sort((a, b) => a - b);
        const avgQueryTime = queryResults.responseTimes.reduce((a, b) => a + b, 0) / queryResults.responseTimes.length;
        const p95QueryTime = queryResults.responseTimes[Math.floor(queryResults.responseTimes.length * 0.95)];
        const queryErrorRate = (queryResults.failedRequests / queryResults.totalRequests) * 100;
        
        log('\n=== 查询性能结果 ===', colors.cyan);
        log(`查询平均响应时间: ${avgQueryTime.toFixed(2)}ms`);
        log(`查询P95响应时间: ${p95QueryTime.toFixed(2)}ms`);
        log(`查询错误率: ${queryErrorRate.toFixed(2)}%`);
        
        return queryErrorRate < 5 && p95QueryTime < 2000;
    }
    
    return false;
}

// 系统资源监控
async function monitorSystemResources() {
    log('\n=== 系统资源监控 ===', colors.blue);
    
    try {
        // 获取Docker容器统计信息
        const { execSync } = require('child_process');
        const stats = execSync('docker stats shopping-openobserve --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"', { encoding: 'utf8' });
        log('OpenObserve容器资源使用:', colors.cyan);
        log(stats);
        
        return true;
    } catch (error) {
        log(`系统资源监控失败: ${error.message}`, colors.red);
        return false;
    }
}

// 主测试函数
async function runQuickPerformanceTests() {
    log('=== OpenObserve快速性能测试 - 阶段四优化版本 ===', colors.cyan);
    log(`测试配置:`, colors.blue);
    log(`- 并发用户数: ${CONFIG.concurrentUsers}`);
    log(`- 测试持续时间: ${CONFIG.testDuration / 1000}秒`);
    log(`- 请求超时: ${CONFIG.requestTimeout}ms`);
    log('');
    
    // 1. 健康检查
    log('1. 执行健康检查...', colors.blue);
    const isHealthy = await healthCheck();
    if (!isHealthy) {
        log('❌ OpenObserve服务不健康，终止测试', colors.red);
        process.exit(1);
    }
    log('✅ 健康检查通过', colors.green);
    
    // 2. 系统资源监控
    await monitorSystemResources();
    
    // 3. 写入性能测试
    const writeTestPassed = await runWritePerformanceTest();
    
    // 4. 查询性能测试
    const queryTestPassed = await runQueryPerformanceTest();
    
    // 5. 最终评估
    log('\n=== 最终测试结果 ===', colors.cyan);
    if (writeTestPassed && queryTestPassed) {
        log('🎉 快速性能测试通过！', colors.green);
        log('系统基本性能符合预期。', colors.green);
    } else {
        log('❌ 快速性能测试未通过', colors.red);
        log('建议检查系统配置或资源分配。', colors.yellow);
    }
    
    // 6. 生成JSON报告
    const report = {
        timestamp: new Date().toISOString(),
        config: CONFIG,
        results: testResults,
        writeTestPassed,
        queryTestPassed
    };
    
    const reportFileName = `quick-performance-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    require('fs').writeFileSync(reportFileName, JSON.stringify(report, null, 2));
    log(`\n详细报告已保存到: ${reportFileName}`, colors.blue);
}

// 执行测试
if (require.main === module) {
    runQuickPerformanceTests().catch(error => {
        log(`快速性能测试执行失败: ${error.message}`, colors.red);
        process.exit(1);
    });
}

module.exports = {
    runQuickPerformanceTests,
    CONFIG,
    testResults
};