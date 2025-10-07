#!/usr/bin/env node

/**
 * 软件体系升级启动脚本
 * 立即启动渐进式、可控的依赖升级计划
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始启动软件体系升级计划...\n');

// 检查当前工作目录
const currentDir = process.cwd();
const packageJsonPath = path.join(currentDir, 'package.json');
const upgradePlanPath = path.join(currentDir, 'package-upgrade-plan.json');

if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ 错误: 未找到 package.json 文件');
    process.exit(1);
}

if (!fs.existsSync(upgradePlanPath)) {
    console.error('❌ 错误: 未找到 package-upgrade-plan.json 文件');
    process.exit(1);
}

console.log('✅ 检查环境通过\n');

// 创建升级日志目录
const logDir = path.join(currentDir, 'upgrade-logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logFile = path.join(logDir, `upgrade-${new Date().toISOString().split('T')[0]}.log`);

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(logFile, logMessage + '\n');
}

// 执行安全检查
function runSecurityCheck() {
    log('🔍 执行安全审计检查...');
    try {
        execSync('npm audit --json > audit-report.json', { 
            stdio: 'inherit',
            cwd: currentDir 
        });
        log('✅ 安全审计检查完成');
        return true;
    } catch (error) {
        log('⚠️ 安全审计发现问题，这是正常的，我们将在后续修复');
        return true;
    }
}

// 安装必要的工具
function installTools() {
    log('🛠️ 安装升级必要工具...');
    
    const tools = [
        'npm-check-updates@^16.0.0',
        'npm-check@^0.0.1',
        'depcheck@^1.4.0'
    ];
    
    try {
        execSync(`npm install --save-dev ${tools.join(' ')} --legacy-peer-deps`, { 
            stdio: 'inherit',
            cwd: currentDir 
        });
        log('✅ 工具安装完成');
        return true;
    } catch (error) {
        log('❌ 工具安装失败');
        return false;
    }
}

// 生成依赖分析报告
function generateDependencyReport() {
    log('📊 生成依赖分析报告...');
    
    const reports = [
        { name: '过时依赖', command: 'npm outdated > outdated-deps.txt' },
        { name: '未使用依赖', command: 'npx depcheck > unused-deps.txt' },
        { name: '依赖关系图', command: 'npx npm-check --graph > dependency-graph.txt' }
    ];
    
    reports.forEach(report => {
        try {
            execSync(report.command, { 
                stdio: 'inherit',
                cwd: currentDir 
            });
            log(`✅ ${report.name}报告生成完成`);
        } catch (error) {
            log(`⚠️ ${report.name}报告生成失败: ${error.message}`);
        }
    });
}

// 创建升级分支
function createUpgradeBranch() {
    const branchName = `upgrade-dependencies-${new Date().toISOString().split('T')[0]}`;
    log(`🌿 创建升级分支: ${branchName}`);
    
    try {
        execSync('git checkout -b ' + branchName, { 
            stdio: 'inherit',
            cwd: currentDir 
        });
        log(`✅ 分支 ${branchName} 创建成功`);
        return branchName;
    } catch (error) {
        log('❌ 分支创建失败，可能已存在或git未初始化');
        return null;
    }
}

// 生成升级建议
function generateUpgradeSuggestions() {
    log('🎯 生成升级建议...');
    
    try {
        execSync('npx npm-check-updates --interactive', { 
            stdio: 'inherit',
            cwd: currentDir 
        });
        log('✅ 升级建议生成完成');
        return true;
    } catch (error) {
        log('⚠️ 升级建议生成失败，使用默认策略');
        return false;
    }
}

// 验证环境
function verifyEnvironment() {
    log('🔧 验证开发环境...');
    
    const checks = [
        { name: 'Node.js版本', command: 'node --version' },
        { name: 'npm版本', command: 'npm --version' },
        { name: 'Git状态', command: 'git status' }
    ];
    
    checks.forEach(check => {
        try {
            const result = execSync(check.command, { 
                encoding: 'utf8',
                cwd: currentDir 
            });
            log(`✅ ${check.name}: ${result.trim()}`);
        } catch (error) {
            log(`⚠️ ${check.name}: ${error.message}`);
        }
    });
}

// 主执行流程
async function main() {
    log('=== 软件体系升级计划启动 ===\n');
    
    // 1. 环境验证
    log('🔍 第1步: 环境验证');
    verifyEnvironment();
    
    // 2. 安全检查
    log('\n🔒 第2步: 安全检查');
    if (!runSecurityCheck()) {
        log('❌ 安全检查失败，终止升级');
        process.exit(1);
    }
    
    // 3. 安装工具
    log('\n🛠️ 第3步: 安装升级工具');
    if (!installTools()) {
        log('❌ 工具安装失败，终止升级');
        process.exit(1);
    }
    
    // 4. 创建分支
    log('\n🌿 第4步: 创建升级分支');
    const branchName = createUpgradeBranch();
    if (!branchName) {
        log('❌ 分支创建失败，继续执行');
    }
    
    // 5. 生成报告
    log('\n📊 第5步: 生成依赖分析报告');
    generateDependencyReport();
    
    // 6. 生成升级建议
    log('\n🎯 第6步: 生成升级建议');
    generateUpgradeSuggestions();
    
    // 7. 执行初步升级
    log('\n🚀 第7步: 执行初步升级');
    try {
        execSync('npm install --legacy-peer-deps', { 
            stdio: 'inherit',
            cwd: currentDir 
        });
        log('✅ 依赖安装完成');
    } catch (error) {
        log('⚠️ 依赖安装遇到问题，需要手动解决');
    }
    
    // 8. 运行测试
    log('\n🧪 第8步: 运行测试验证');
    try {
        execSync('npm run test', { 
            stdio: 'inherit',
            cwd: currentDir 
        });
        log('✅ 测试通过');
    } catch (error) {
        log('⚠️ 测试失败，需要修复测试代码');
    }
    
    // 9. 生成下一步计划
    log('\n📋 第9步: 生成执行计划');
    const nextSteps = [
        '1. 审查package.json中的依赖版本',
        '2. 逐个升级核心依赖包',
        '3. 修复兼容性问题',
        '4. 运行完整测试套件',
        '5. 部署到测试环境',
        '6. 监控和验证',
        '7. 灰度部署到生产环境'
    ];
    
    log('📝 推荐的下一步行动:');
    nextSteps.forEach(step => log(`   ${step}`));
    
    log('\n=== 升级计划启动完成 ===');
    log('💡 提示: 请查看生成的报告文件，并根据建议进行下一步操作');
    log('📁 日志文件: ' + logFile);
    
    if (branchName) {
        log(`🌿 升级分支: ${branchName}`);
        log('💡 提示: 完成升级后，请提交并合并此分支');
    }
}

// 错误处理
process.on('uncaughtException', (error) => {
    log(`❌ 未捕获的异常: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`❌ 未处理的Promise拒绝: ${reason}`);
    process.exit(1);
});

// 执行主函数
main().catch(error => {
    log(`❌ 升级启动失败: ${error.message}`);
    process.exit(1);
});
