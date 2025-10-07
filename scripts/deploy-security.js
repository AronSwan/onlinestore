// 安全部署脚本
// 作者：AI助手
// 时间：2025-09-27

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityDeployer {
  constructor() {
    this.projectRoot = process.cwd();
    this.distPath = path.join(this.projectRoot, 'dist');
  }

  // 执行构建
  build() {
    console.log('🚀 开始构建保护版本...');
    
    try {
      // 设置生产环境变量
      process.env.NODE_ENV = 'production';
      
      // 执行Vite构建
      execSync('npm run build', { 
        stdio: 'inherit',
        cwd: this.projectRoot
      });
      
      console.log('✅ 构建完成');
      return true;
    } catch (error) {
      console.error('❌ 构建失败:', error.message);
      return false;
    }
  }

  // 验证构建结果
  validateBuild() {
    console.log('🔍 验证构建结果...');
    
    const requiredFiles = [
      'index.html',
      'assets/js/main-',
      'assets/css/main-'
    ];
    
    let allValid = true;
    
    requiredFiles.forEach(filePattern => {
      const files = this.findFiles(this.distPath, filePattern);
      if (files.length === 0) {
        console.error(`❌ 缺少必要文件: ${filePattern}`);
        allValid = false;
      } else {
        console.log(`✅ 找到文件: ${files[0]}`);
      }
    });
    
    // 检查安全模块是否包含
    const securityFiles = this.findFiles(this.distPath, 'security-protection');
    if (securityFiles.length === 0) {
      console.error('❌ 安全保护模块未包含在构建中');
      allValid = false;
    } else {
      console.log('✅ 安全保护模块已包含');
    }
    
    return allValid;
  }

  // 查找文件
  findFiles(dir, pattern) {
    const results = [];
    
    function walk(directory) {
      const files = fs.readdirSync(directory);
      
      files.forEach(file => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walk(filePath);
        } else if (file.includes(pattern)) {
          results.push(filePath);
        }
      });
    }
    
    walk(dir);
    return results;
  }

  // 生成安全报告
  generateSecurityReport() {
    console.log('📊 生成安全报告...');
    
    const report = {
      timestamp: new Date().toISOString(),
      buildStatus: 'completed',
      securityFeatures: [
        '代码混淆和压缩',
        '开发者工具防护',
        'API请求保护',
        'DOM结构混淆',
        '用户行为监控'
      ],
      files: this.getFileList(this.distPath),
      recommendations: [
        '配置Nginx安全头',
        '启用HTTPS',
        '定期更新安全配置',
        '监控安全事件'
      ]
    };
    
    const reportPath = path.join(this.projectRoot, 'security-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ 安全报告已生成: ${reportPath}`);
    
    return report;
  }

  // 获取文件列表
  getFileList(dir) {
    const files = [];
    
    function walk(directory, relativePath = '') {
      const items = fs.readdirSync(directory);
      
      items.forEach(item => {
        const fullPath = path.join(directory, item);
        const relPath = path.join(relativePath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push({
            type: 'directory',
            path: relPath,
            size: '-'
          });
          walk(fullPath, relPath);
        } else {
          files.push({
            type: 'file',
            path: relPath,
            size: this.formatFileSize(stat.size)
          });
        }
      });
    }
    
    walk(dir);
    return files;
  }

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 部署到服务器（模拟）
  deployToServer() {
    console.log('🌐 准备部署到服务器...');
    
    // 这里可以添加实际的部署逻辑
    // 例如：SCP上传、Kubernetes部署等
    
    console.log('✅ 部署准备完成');
    console.log('💡 请手动执行以下命令完成部署:');
    console.log('   scp -r dist/ user@server:/path/to/webroot/');
    console.log('   或使用CI/CD工具自动部署');
  }

  // 主部署流程
  async deploy() {
    console.log('🛡️ 开始安全部署流程...\n');
    
    // 步骤1: 构建
    if (!this.build()) {
      process.exit(1);
    }
    
    // 步骤2: 验证
    if (!this.validateBuild()) {
      console.error('❌ 构建验证失败，请检查配置');
      process.exit(1);
    }
    
    // 步骤3: 生成报告
    this.generateSecurityReport();
    
    // 步骤4: 部署准备
    this.deployToServer();
    
    console.log('\n🎉 安全部署流程完成！');
    console.log('📋 下一步操作:');
    console.log('   1. 配置Nginx安全设置');
    console.log('   2. 启用HTTPS证书');
    console.log('   3. 设置监控和告警');
    console.log('   4. 定期安全审计');
  }
}

// 命令行接口
if (require.main === module) {
  const deployer = new SecurityDeployer();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'build':
      deployer.build();
      break;
    case 'validate':
      deployer.validateBuild();
      break;
    case 'report':
      deployer.generateSecurityReport();
      break;
    case 'deploy':
      deployer.deploy();
      break;
    default:
      console.log('使用方法:');
      console.log('  node scripts/deploy-security.js build    - 仅构建');
      console.log('  node scripts/deploy-security.js validate - 验证构建');
      console.log('  node scripts/deploy-security.js report   - 生成报告');
      console.log('  node scripts/deploy-security.js deploy   - 完整部署');
      break;
  }
}

module.exports = SecurityDeployer;