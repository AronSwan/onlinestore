#!/usr/bin/env node

/**
 * 测试环境隔离检查
 */

const os = require('os');
const { checkEnvironmentIsolation } = require('./redesigned-user-validation.js');

console.log('=== 测试环境隔离检查 ===\n');

// 检查当前环境隔离状态
const isolation = checkEnvironmentIsolation();

console.log('当前环境信息:');
console.log(`是否隔离: ${isolation.isIsolated}`);
console.log(`隔离类型: ${isolation.type}`);
console.log(`详细信息:`, isolation.details);

// 检查当前用户信息
const currentUser = os.userInfo();
console.log('\n当前用户信息:');
console.log(`用户名: ${currentUser.username}`);
console.log(`是否为特权用户: ${currentUser.username === 'root' || currentUser.username === 'Administrator'}`);

// 检查系统平台
console.log('\n系统平台信息:');
console.log(`平台: ${os.platform()}`);
console.log(`架构: ${os.arch()}`);
console.log(`主机名: ${os.hostname()}`);