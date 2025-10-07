const fs = require('fs');
const path = require('path');

// 测试文件读取功能
function testFileReading() {
    console.log('开始测试安全仪表板文件读取功能...\n');
    
    try {
        // 读取漏洞数据文件
        const filePath = path.join(__dirname, 'data/security-vulnerabilities.json');
        console.log(`读取文件: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            console.error('❌ 错误: 漏洞数据文件不存在');
            return false;
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        // 验证文件结构
        console.log('✅ 成功读取文件');
        console.log(`文件版本: ${data.metadata.version}`);
        console.log(`最后更新: ${data.metadata.lastUpdated}`);
        console.log(`维护者: ${data.metadata.maintainer}`);
        console.log(`漏洞总数: ${data.vulnerabilities.length}`);
        
        // 统计各严重级别的漏洞数量
        const severityCounts = {
            '严重': 0,
            '高': 0,
            '中': 0,
            '低': 0
        };
        
        data.vulnerabilities.forEach(vuln => {
            if (severityCounts.hasOwnProperty(vuln.severity)) {
                severityCounts[vuln.severity]++;
            }
        });
        
        console.log('\n漏洞严重度分布:');
        console.log(`  严重: ${severityCounts['严重']}`);
        console.log(`  高: ${severityCounts['高']}`);
        console.log(`  中: ${severityCounts['中']}`);
        console.log(`  低: ${severityCounts['低']}`);
        
        // 统计各状态的漏洞数量
        const statusCounts = {};
        data.vulnerabilities.forEach(vuln => {
            statusCounts[vuln.status] = (statusCounts[vuln.status] || 0) + 1;
        });
        
        console.log('\n漏洞状态分布:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });
        
        // 统计各系统的漏洞数量
        const systemCounts = {};
        data.vulnerabilities.forEach(vuln => {
            const system = getSystemFromRuleId(vuln.ruleId);
            systemCounts[system] = (systemCounts[system] || 0) + 1;
        });
        
        console.log('\n漏洞系统分布:');
        Object.entries(systemCounts).forEach(([system, count]) => {
            console.log(`  ${system}: ${count}`);
        });
        
        // 显示最近发现的漏洞
        const recentVulns = data.vulnerabilities
            .sort((a, b) => new Date(b.firstFound) - new Date(a.firstFound))
            .slice(0, 3);
            
        console.log('\n最近发现的漏洞:');
        recentVulns.forEach(vuln => {
            console.log(`  ${vuln.id}: ${vuln.title} (${vuln.severity}, ${vuln.status})`);
        });
        
        console.log('\n✅ 文件读取测试成功完成');
        return true;
        
    } catch (error) {
        console.error('❌ 文件读取测试失败:', error.message);
        return false;
    }
}

// 从规则ID获取系统名称
function getSystemFromRuleId(ruleId) {
    const systemMapping = {
        'jwt-format-validation': '认证授权',
        'roles-guard': '认证授权',
        'input-validation': '支付系统',
        'input-length-validation': '支付系统',
        'password-field-exclusion': '数据安全',
        'database-indexes': '订单系统',
        'transaction-usage': '支付系统',
        'transaction-rollback': '订单系统'
    };
    return systemMapping[ruleId] || '其他系统';
}

// 执行测试
testFileReading();