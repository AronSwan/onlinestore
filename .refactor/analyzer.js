const fs = require('fs');
const path = require('path');

// 静态分析规则
const rules = {
    // 安全相关
    'eval-usage': /\beval\s*\(/g,
    'innerHTML-usage': /\.innerHTML\s*=/g,
    'document-write': /document\.write\s*\(/g,
    'console-log': /console\.log\s*\(/g,
    
    // 代码质量
    'var-declaration': /\bvar\s+/g,
    'function-length': null, // 特殊处理
    'magic-numbers': /\b\d{2,}\b/g,
    
    // 性能相关
    'jquery-usage': /\$\s*\(/g,
    'global-variables': /window\./g
};

const issues = [];
let fileCount = 0;

function analyzeFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        fileCount++;
        
        // 检查每个规则
        Object.entries(rules).forEach(([ruleName, pattern]) => {
            if (pattern === null) {
                // 特殊处理函数长度
                if (ruleName === 'function-length') {
                    const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g) || [];
                    functionMatches.forEach(func => {
                        const funcLines = func.split('\n').length;
                        if (funcLines > 50) {
                            issues.push({
                                file: filePath,
                                rule: ruleName,
                                severity: 'warning',
                                message: `函数过长 (${funcLines} 行)`,
                                line: 0
                            });
                        }
                    });
                }
                return;
            }
            
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const lineNumber = content.substring(0, match.index).split('\n').length;
                const severity = getSeverity(ruleName);
                
                issues.push({
                    file: filePath,
                    rule: ruleName,
                    severity: severity,
                    message: getRuleMessage(ruleName),
                    line: lineNumber,
                    column: match.index - content.lastIndexOf('\n', match.index)
                });
            }
        });
        
    } catch (error) {
        console.error(`分析文件失败: ${filePath}`, error.message);
    }
}

function getSeverity(ruleName) {
    const errorRules = ['eval-usage', 'innerHTML-usage', 'document-write'];
    return errorRules.includes(ruleName) ? 'error' : 'warning';
}

function getRuleMessage(ruleName) {
    const messages = {
        'eval-usage': '使用eval()存在安全风险',
        'innerHTML-usage': '使用innerHTML可能导致XSS攻击',
        'document-write': 'document.write()已过时且存在安全风险',
        'console-log': '生产代码中不应包含console.log',
        'var-declaration': '建议使用let/const替代var',
        'function-length': '函数过长，建议拆分',
        'magic-numbers': '避免使用魔法数字',
        'jquery-usage': '考虑使用原生JavaScript替代jQuery',
        'global-variables': '避免使用全局变量'
    };
    return messages[ruleName] || '代码质量问题';
}

// 扫描JavaScript文件
function scanDirectory(dir) {
    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                scanDirectory(filePath);
            } else if (file.endsWith('.js') && !file.includes('.min.')) {
                analyzeFile(filePath);
            }
        });
    } catch (error) {
        console.error(`扫描目录失败: ${dir}`, error.message);
    }
}

// 开始分析
console.log('开始静态代码分析...');
scanDirectory('.');

// 生成报告
const report = {
    summary: {
        filesScanned: fileCount,
        totalIssues: issues.length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length
    },
    issues: issues
};

// 保存JSON报告
fs.writeFileSync('.refactor/static-analysis.json', JSON.stringify(report, null, 2));

// 生成Markdown报告
const mdReport = `# 静态分析报告
生成时间: ${new Date().toLocaleString()}

## 摘要
- 扫描文件数: ${report.summary.filesScanned}
- 总问题数: ${report.summary.totalIssues}
- 错误: ${report.summary.errors}
- 警告: ${report.summary.warnings}

## 问题详情
${issues.map(issue => `### ${issue.severity.toUpperCase()}: ${issue.rule}
- **文件**: ${issue.file}
- **行号**: ${issue.line}
- **消息**: ${issue.message}
`).join('\n')}

## 建议
1. 优先修复所有错误级别的问题
2. 逐步改进警告级别的问题
3. 建立代码审查流程防止问题重现
`;

fs.writeFileSync('.refactor/static-analysis.md', mdReport);

console.log(`静态分析完成，发现 ${report.summary.totalIssues} 个问题`);
console.log(`错误: ${report.summary.errors}, 警告: ${report.summary.warnings}`);
