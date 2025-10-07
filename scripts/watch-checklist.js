// watch-checklist.js
// 检查清单文件监视脚本
// 作者: AI助手
// 创建时间: 2025-01-26 15:50:00
// 最后修改: 2025-01-26 15:50:00

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { DashboardUpdater } = require('./dashboard-updater');

class ChecklistWatcher {
    constructor() {
        this.checklistPath = path.join(__dirname, '..', 'navigation-design-improvement-checklist.md');
        this.updater = new DashboardUpdater(this.checklistPath);
        this.watcher = null;
    }

    // 初始化监视
    startWatching() {
        console.log('🚀 开始监视检查清单文件...');
        console.log('📁 监视文件:', this.checklistPath);
        
        this.watcher = chokidar.watch(this.checklistPath, {
            persistent: true,
            ignoreInitial: false,
            awaitWriteFinish: {
                stabilityThreshold: 1000,
                pollInterval: 100
            }
        });

        this.watcher
            .on('add', path => {
                console.log(`📄 文件添加: ${path}`);
                this.updateDashboard();
            })
            .on('change', path => {
                console.log('🔄 文件修改:', path);
                this.updateDashboard();
            })
            .on('unlink', path => {
                console.log('❌ 文件删除:', path);
            })
            .on('error', error => {
                console.error('❌ 监视错误:', error);
            });

        console.log('✅ 监视器已启动，等待文件变化...');
        console.log('💡 提示: 修改检查清单文件后，看板将自动更新');
    }

    // 更新看板
    updateDashboard() {
        console.log('\n📊 正在更新看板数据...');
        
        try {
            const success = this.updater.parseChecklist();
            if (success) {
                const dataPath = path.join(__dirname, '..', 'checklist-data.json');
                const dashboardPath = path.join(__dirname, '..', 'checklist-dashboard.html');
                
                this.updater.generateDataFile(dataPath);
                this.updater.generateDashboard(dashboardPath, dashboardPath);
                
                console.log('✅ 看板更新成功!');
                this.displayStats();
            }
        } catch (error) {
            console.error('❌ 更新失败:', error.message);
        }
    }

    // 显示统计信息
    displayStats() {
        const { totalItems, completed, inProgress, pending, blocked } = this.updater.data;
        const completionRate = ((completed / totalItems) * 100).toFixed(1);
        
        console.log('📈 当前进度统计:');
        console.log(`  总计任务: ${totalItems}项`);
        console.log(`  已完成: ${completed}项 (${completionRate}%)`);
        console.log(`  进行中: ${inProgress}项`);
        console.log(`  待开始: ${pending}项`);
        console.log(`  阻塞中: ${blocked}项`);
        
        // 显示分项进度
        console.log('\n📋 分项进度:');
        Object.entries(this.updater.data.sections).forEach(([section, data]) => {
            const sectionRate = data.total > 0 ? ((data.completed / data.total) * 100).toFixed(1) : '0.0';
            console.log(`  ${section}: ${data.completed}/${data.total} (${sectionRate}%)`);
        });
        
        console.log('\n' + '='.repeat(50));
    }

    // 停止监视
    stopWatching() {
        if (this.watcher) {
            this.watcher.close();
            console.log('🛑 监视器已停止');
        }
    }
}

// 处理退出信号
process.on('SIGINT', () => {
    console.log('\n👋 收到退出信号，正在停止监视...');
    const watcher = new ChecklistWatcher();
    watcher.stopWatching();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 收到终止信号，正在停止监视...');
    const watcher = new ChecklistWatcher();
    watcher.stopWatching();
    process.exit(0);
});

// 启动监视
if (require.main === module) {
    const watcher = new ChecklistWatcher();
    watcher.startWatching();
}

module.exports = ChecklistWatcher;