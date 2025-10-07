/**
 * 导航栏设计整改项进度跟踪脚本
 * 用于实时更新和可视化检查清单进度
 * 创建时间: 2025-01-26
 * 作者: AI助手
 */

const fs = require('fs');
const path = require('path');

class ChecklistTracker {
    constructor(checklistPath) {
        this.checklistPath = checklistPath;
        this.checklistData = null;
    }

    // 读取检查清单文件
    readChecklist() {
        try {
            const content = fs.readFileSync(this.checklistPath, 'utf8');
            this.parseChecklist(content);
            return true;
        } catch (error) {
            console.error('读取检查清单失败:', error.message);
            return false;
        }
    }

    // 解析检查清单内容
    parseChecklist(content) {
        const sections = [
            '色彩对比度优化',
            '品牌识别度提升', 
            '间距与布局一致性',
            '图标与交互元素优化',
            '状态反馈明确性',
            '移动端导航优化',
            '可访问性增强'
        ];

        this.checklistData = {
            totalItems: 0,
            completed: 0,
            inProgress: 0,
            pending: 0,
            blocked: 0,
            sections: {},
            lastUpdated: new Date().toISOString()
        };

        sections.forEach(section => {
            this.checklistData.sections[section] = {
                total: 0,
                completed: 0,
                inProgress: 0,
                pending: 0
            };
        });

        // 简化的解析逻辑 - 实际应用中需要更复杂的解析
        const lines = content.split('\n');
        let currentSection = '';

        lines.forEach(line => {
            if (sections.includes(line.trim())) {
                currentSection = line.trim();
            }

            if (line.includes('|') && currentSection && !line.includes('---')) {
                const cells = line.split('|').filter(cell => cell.trim());
                if (cells.length >= 3) {
                    const status = cells[2].trim();
                    
                    this.checklistData.totalItems++;
                    this.checklistData.sections[currentSection].total++;

                    switch (status) {
                        case '✅':
                            this.checklistData.completed++;
                            this.checklistData.sections[currentSection].completed++;
                            break;
                        case '🔄':
                            this.checklistData.inProgress++;
                            this.checklistData.sections[currentSection].inProgress++;
                            break;
                        case '⏳':
                            this.checklistData.pending++;
                            this.checklistData.sections[currentSection].pending++;
                            break;
                        case '❌':
                            this.checklistData.blocked++;
                            break;
                    }
                }
            }
        });
    }

    // 生成进度报告
    generateProgressReport() {
        if (!this.checklistData) {
            return '暂无数据，请先读取检查清单';
        }

        const completionRate = ((this.checklistData.completed / this.checklistData.totalItems) * 100).toFixed(1);
        
        let report = `# 导航栏设计整改进度报告\n`;
        report += `## 📊 总体进度\n`;
        report += `- **总整改项**: ${this.checklistData.totalItems}项\n`;
        report += `- **已完成**: ${this.checklistData.completed}项 (${completionRate}%)\n`;
        report += `- **进行中**: ${this.checklistData.inProgress}项\n`;
        report += `- **待开始**: ${this.checklistData.pending}项\n`;
        report += `- **阻塞项**: ${this.checklistData.blocked}项\n`;
        report += `- **最后更新**: ${new Date(this.checklistData.lastUpdated).toLocaleString()}\n\n`;

        report += `## 📈 分项进度\n`;
        Object.entries(this.checklistData.sections).forEach(([section, data]) => {
            const sectionRate = data.total > 0 ? ((data.completed / data.total) * 100).toFixed(1) : '0.0';
            report += `### ${section}\n`;
            report += `- 完成率: ${sectionRate}% (${data.completed}/${data.total})\n`;
            report += `- 进行中: ${data.inProgress}项\n`;
            report += `- 待处理: ${data.pending}项\n\n`;
        });

        report += `## 🎯 下一步重点\n`;
        // 找出完成率最低的章节
        const lowestSection = Object.entries(this.checklistData.sections)
            .filter(([_, data]) => data.total > 0)
            .sort((a, b) => (a[1].completed / a[1].total) - (b[1].completed / b[1].total))[0];

        if (lowestSection) {
            report += `优先处理 **${lowestSection[0]}** 章节，当前完成率 ${((lowestSection[1].completed / lowestSection[1].total) * 100).toFixed(1)}%\n`;
        }

        report += `\n---\n*报告生成时间: ${new Date().toLocaleString()}*`;
        
        return report;
    }

    // 更新检查清单状态
    updateItemStatus(section, itemIndex, newStatus) {
        // 这里需要实现具体的Markdown文件更新逻辑
        // 由于Markdown表格解析和更新比较复杂，建议使用专门的Markdown解析库
        console.log(`更新状态: ${section} 第${itemIndex}项 -> ${newStatus}`);
        // 实际实现时会读取文件，更新对应行的状态，然后写回文件
    }

    // 导出进度数据为JSON
    exportToJson() {
        return {
            metadata: {
                generated: new Date().toISOString(),
                checklist: path.basename(this.checklistPath)
            },
            progress: this.checklistData
        };
    }
}

// 使用示例
if (require.main === module) {
    const tracker = new ChecklistTracker('../navigation-design-improvement-checklist.md');
    
    if (tracker.readChecklist()) {
        console.log(tracker.generateProgressReport());
        
        // 导出JSON数据
        const jsonData = tracker.exportToJson();
        fs.writeFileSync('../checklist-progress.json', JSON.stringify(jsonData, null, 2));
        console.log('进度数据已导出到 checklist-progress.json');
    }
}

module.exports = ChecklistTracker;