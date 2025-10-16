#!/usr/bin/env node

/**
 * 简化的OpenObserve测试脚本
 * 直接使用curl测试OpenObserve监控功能
 */

const { spawn } = require('child_process');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// 配置
const config = {
  openobserveUrl: 'http://localhost:5080',
  username: 'admin@example.com',
  password: 'Complexpass#123',
  organization: 'default',
  streamName: 'test-runner-metrics'
};

/**
 * 执行curl命令
 */
async function curlCommand(options) {
  return new Promise((resolve, reject) => {
    const args = [
      '-s', '-X', options.method || 'GET',
      '-H', `Content-Type: application/json`,
      '-H', `Authorization: Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`
    ];
    
    if (options.data) {
      args.push('-d', JSON.stringify(options.data));
    }
    
    args.push(options.url);
    
    const child = spawn('curl', args);
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`curl failed with code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 创建流
 */
async function createStream() {
  console.log('📝 创建测试流...');
  
  try {
    const response = await curlCommand({
      method: 'POST',
      url: `${config.openobserveUrl}/api/${config.organization}/streams`,
      data: {
        name: config.streamName,
        storage_type: 'local'
      }
    });
    
    console.log('✅ 测试流已创建');
    return true;
  } catch (error) {
    console.log('⚠️  流可能已存在:', error.message);
    return true;
  }
}

/**
 * 发送日志数据
 */
async function sendLogData() {
  console.log('📤 发送日志数据...');
  
  try {
    const logData = {
      '@timestamp': new Date().toISOString(),
      level: 'INFO',
      message: '测试日志消息',
      category: 'TEST',
      component: 'test-runner',
      test_id: 'openobserve-test'
    };
    
    const response = await curlCommand({
      method: 'POST',
      url: `${config.openobserveUrl}/api/${config.organization}/${config.streamName}/_json`,
      data: logData
    });
    
    const result = JSON.parse(response.stdout);
    if (result.code === 200) {
      console.log('✅ 日志数据发送成功');
      return true;
    } else {
      console.log('❌ 日志数据发送失败:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ 发送日志数据失败:', error.message);
    return false;
  }
}

/**
 * 发送指标数据
 */
async function sendMetricData() {
  console.log('📊 发送指标数据...');
  
  try {
    const metricData = {
      '@timestamp': new Date().toISOString(),
      metric_name: 'test_counter',
      metric_value: 42,
      metric_type: 'counter',
      labels: {
        component: 'test-runner',
        test_id: 'openobserve-test'
      }
    };
    
    const response = await curlCommand({
      method: 'POST',
      url: `${config.openobserveUrl}/api/${config.organization}/${config.streamName}/_json`,
      data: metricData
    });
    
    const result = JSON.parse(response.stdout);
    if (result.code === 200) {
      console.log('✅ 指标数据发送成功');
      return true;
    } else {
      console.log('❌ 指标数据发送失败:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ 发送指标数据失败:', error.message);
    return false;
  }
}

/**
 * 查询数据
 */
async function queryData() {
  console.log('🔍 查询发送的数据...');
  
  try {
    // 获取流信息以确定时间范围
    const streamResponse = await curlCommand({
      url: `${config.openobserveUrl}/api/${config.organization}/streams`
    });
    
    const streamResult = JSON.parse(streamResponse.stdout);
    let startTime, endTime;
    
    if (streamResult.list && streamResult.list.length > 0) {
      const stream = streamResult.list.find(s => s.name === config.streamName);
      if (stream && stream.stats.doc_time_min && stream.stats.doc_time_max) {
        startTime = stream.stats.doc_time_min;
        endTime = stream.stats.doc_time_max;
      }
    }
    
    // 如果无法从流信息获取时间范围，使用默认范围
    if (!startTime || !endTime) {
      startTime = (Date.now() - 300000) * 1000; // 5分钟前，转换为微秒
      endTime = Date.now() * 1000; // 当前时间，转换为微秒
    }
    
    const query = {
      query: {
        sql: `SELECT * FROM "${config.streamName}" ORDER BY "_timestamp" DESC LIMIT 10`,
        start_time: startTime.toString(),
        end_time: endTime.toString()
      }
    };
    
    const response = await curlCommand({
      method: 'POST',
      url: `${config.openobserveUrl}/api/${config.organization}/_search`,
      data: query
    });
    
    const result = JSON.parse(response.stdout);
    
    if (result.hits && result.hits.length > 0) {
      console.log(`✅ 找到 ${result.hits.length} 条记录`);
      
      // 显示最近的几条记录
      result.hits.slice(0, 3).forEach((hit, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log(`  时间戳: ${new Date(parseInt(hit.timestamp)).toISOString()}`);
        console.log(`  级别: ${hit.level}`);
        console.log(`  消息: ${hit.message}`);
        if (hit.metric_name) {
          console.log(`  指标: ${hit.metric_name} = ${hit.metric_value}`);
        }
      });
      
      return true;
    } else {
      console.log('❌ 未找到任何记录');
      return false;
    }
  } catch (error) {
    console.log('❌ 查询数据失败:', error.message);
    return false;
  }
}

/**
 * 显示访问信息
 */
function showAccessInfo() {
  console.log('\n🌐 访问信息:');
  console.log(`OpenObserve Web UI: ${config.openobserveUrl}`);
  console.log(`用户名: ${config.username}`);
  console.log(`密码: ${config.password}`);
  console.log(`组织: ${config.organization}`);
  
  console.log('\n📊 查看测试数据:');
  console.log(`1. 访问 Web UI: ${config.openobserveUrl}`);
  console.log(`2. 登录使用上述凭据`);
  console.log(`3. 选择组织: ${config.organization}`);
  console.log(`4. 在左侧菜单选择 "Streams"`);
  console.log(`5. 查找并点击流: ${config.streamName}`);
  console.log(`6. 查看接收到的测试数据`);
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 OpenObserve 简化测试脚本');
  
  try {
    // 创建流
    await createStream();
    
    // 发送日志数据
    const logSuccess = await sendLogData();
    
    // 发送指标数据
    const metricSuccess = await sendMetricData();
    
    // 等待数据索引
    console.log('\n⏳ 等待数据索引...');
    await sleep(5000);
    
    // 查询数据
    const querySuccess = await queryData();
    
    // 显示访问信息
    showAccessInfo();
    
    // 判断测试结果
    if (logSuccess && metricSuccess && querySuccess) {
      console.log('\n✅ 所有测试通过！');
      process.exit(0);
    } else {
      console.log('\n❌ 部分测试失败');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  createStream,
  sendLogData,
  sendMetricData,
  queryData
};