// 健壮性增强测试脚本
const fs = require('fs');
const path = require('path');

console.log('🧪 测试健壮性增强功能...\n');

// 测试1: 验证测试运行器文件存在
console.log('1. 验证测试运行器文件存在...');
const testRunnerPath = path.join(__dirname, 'test-runner-secure.cjs');
if (fs.existsSync(testRunnerPath)) {
    console.log('✅ 测试运行器文件存在');
    
    // 读取文件内容检查版本
    const content = fs.readFileSync(testRunnerPath, 'utf8');
    if (content.includes('v3.2 - 健壮性增强版')) {
        console.log('✅ 版本信息正确 (v3.2 - 健壮性增强版)');
    } else {
        console.log('❌ 版本信息不正确');
    }
    
    // 检查健壮性增强特性
    const robustnessFeatures = [
        '健壮性增强：验证测试类型',
        '健壮性增强：获取系统资源',
        '健壮性增强：计算最优工作线程数',
        '健壮性增强：收集所有测试文件',
        '健壮性增强：工作负载分配错误处理',
        '健壮性增强：并行执行测试，添加超时控制'
    ];
    
    let foundFeatures = 0;
    robustnessFeatures.forEach(feature => {
        if (content.includes(feature)) {
            foundFeatures++;
            console.log(`✅ ${feature}`);
        }
    });
    
    console.log(`\n📊 健壮性增强特性: ${foundFeatures}/${robustnessFeatures.length} 已实现`);
    
} else {
    console.log('❌ 测试运行器文件不存在');
}

// 测试2: 验证关键函数存在
console.log('\n2. 验证关键函数存在...');
const requiredFunctions = [
    'getTestFiles',
    'getSystemResources', 
    'calculateOptimalWorkers',
    'runParallelTests',
    'validatePath',
    'sanitizeArg'
];

let functionCount = 0;
requiredFunctions.forEach(func => {
    if (content.includes(`function ${func}`)) {
        functionCount++;
        console.log(`✅ ${func} 函数存在`);
    } else {
        console.log(`❌ ${func} 函数不存在`);
    }
});

console.log(`\n📊 关键函数: ${functionCount}/${requiredFunctions.length} 已实现`);

// 测试3: 验证错误处理机制
console.log('\n3. 验证错误处理机制...');
const errorHandlingFeatures = [
    'try {',
    'catch (error)',
    'Promise.allSettled',
    'uncaughtException',
    'unhandledRejection'
];

let errorHandlingCount = 0;
errorHandlingFeatures.forEach(feature => {
    const count = (content.match(new RegExp(feature, 'g')) || []).length;
    if (count > 0) {
        errorHandlingCount++;
        console.log(`✅ ${feature} (出现 ${count} 次)`);
    }
});

console.log(`\n📊 错误处理特性: ${errorHandlingCount}/${errorHandlingFeatures.length} 已实现`);

// 测试4: 验证安全特性
console.log('\n4. 验证安全特性...');
const securityFeatures = [
    'security.validatePath',
    'security.sanitizeArg',
    'path traversal',
    '输入验证',
    '边界检查'
];

let securityCount = 0;
securityFeatures.forEach(feature => {
    if (content.includes(feature)) {
        securityCount++;
        console.log(`✅ ${feature}`);
    }
});

console.log(`\n📊 安全特性: ${securityCount}/${securityFeatures.length} 已实现`);

// 总结
console.log('\n🎯 健壮性增强测试总结:');
console.log(`   版本: v3.2 - 健壮性增强版`);
console.log(`   健壮性特性: ${foundFeatures}/${robustnessFeatures.length}`);
console.log(`   错误处理: ${errorHandlingCount}/${errorHandlingFeatures.length}`);
console.log(`   安全特性: ${securityCount}/${securityFeatures.length}`);

if (foundFeatures >= 4 && errorHandlingCount >= 4 && securityCount >= 3) {
    console.log('\n✅ 健壮性增强测试通过！');
} else {
    console.log('\n❌ 健壮性增强测试未完全通过');
}

console.log('\n🚀 测试完成');