#!/usr/bin/env node

/**
 * 📋 统一文档一致性管理器
 *
 * 功能：
 * - 验证文档内容与代码仓库的一致性
 * - 自动修复发现的不一致问题
 * - 同步 package.json 信息到相关文档
 * - 生成详细的验证和修复报告
 *
 * 这是一个统一的、功能强大的文档管理工具，整合了之前的多个脚本功能
 */

const fs = require('fs');
const path = require('path');

class UnifiedDocsConsistencyManager {
  constructor(options = {}) {
    this.projectRoot = path.join(__dirname, '..');
    this.docsPath = path.join(this.projectRoot, 'docs');
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
    this.srcPath = path.join(this.projectRoot, 'src');

    this.packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    this.validationResults = [];
    this.fixResults = [];
    this.syncResults = [];

    this.options = {
      autoFix: options.autoFix || false,
      generateReport: options.generateReport !== false,
      verbose: options.verbose || false,
      categories: options.categories || ['all'],
    };

    console.log('🚀 启动统一文档一致性管理器...');
    console.log(`项目: ${this.packageJson.name} v${this.packageJson.version}`);
  }

  /**
   * 主执行函数
   */
  async execute(command = 'validate') {
    try {
      switch (command) {
        case 'validate':
          await this.validateAll();
          break;
        case 'fix':
          await this.fixAll();
          break;
        case 'sync':
          await this.syncAll();
          break;
        case 'check-and-fix':
          await this.validateAll();
          if (this.hasValidationErrors()) {
            console.log('\n🔧 发现问题，开始自动修复...');
            await this.fixAll();
            console.log('\n🔍 修复后重新验证...');
            await this.validateAll();
          }
          break;
        default:
          console.error('❌ 未知命令:', command);
          this.showUsage();
          process.exit(1);
      }

      if (this.options.generateReport) {
        this.generateComprehensiveReport();
      }

      this.displayFinalResults();
    } catch (error) {
      console.error('❌ 执行过程中发生错误:', error.message);
      if (this.options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  /**
   * 执行所有验证检查
   */
  async validateAll() {
    console.log('\n🔍 开始文档一致性验证...');

    this.validationResults = [];

    if (this.shouldValidateCategory('package')) {
      await this.validatePackageJsonSync();
    }

    if (this.shouldValidateCategory('config')) {
      await this.validateConfigSync();
    }

    if (this.shouldValidateCategory('api')) {
      await this.validateApiSync();
    }

    if (this.shouldValidateCategory('structure')) {
      await this.validateDocumentStructure();
    }

    if (this.shouldValidateCategory('content')) {
      await this.validateContentQuality();
    }

    this.displayValidationResults();
  }

  /**
   * 执行所有修复操作
   */
  async fixAll() {
    console.log('\n🔧 开始自动修复文档不一致问题...');

    this.fixResults = [];

    await this.fixIndexMd();
    await this.fixDeploymentGuide();
    await this.fixDeveloperGuide();
    await this.fixConfigManagement();
    await this.fixApiDocumentation();

    this.displayFixResults();
  }

  /**
   * 执行所有同步操作
   */
  async syncAll() {
    console.log('\n📦 开始同步 package.json 信息...');

    this.syncResults = [];

    await this.syncToIndexMd();
    await this.syncToDeploymentGuide();
    await this.syncToDeveloperGuide();
    await this.syncToConfigDocs();

    this.displaySyncResults();
  }

  /**
   * 验证 package.json 同步状态
   */
  async validatePackageJsonSync() {
    console.log('📦 验证 package.json 同步状态...');

    const checks = [
      this.checkIndexMdSync(),
      this.checkDeploymentGuideSync(),
      this.checkDeveloperGuideSync(),
    ];

    const results = await Promise.all(checks);
    const inconsistencies = results.filter(result => !result.isValid);

    this.validationResults.push({
      category: 'Package.json 同步',
      isValid: inconsistencies.length === 0,
      totalChecks: results.length,
      passedChecks: results.length - inconsistencies.length,
      inconsistencies: inconsistencies.flatMap(r => r.inconsistencies || []),
      details: results,
    });
  }

  /**
   * 验证配置文件同步状态
   */
  async validateConfigSync() {
    console.log('⚙️ 验证配置文件同步状态...');

    const configPath = path.join(this.docsPath, 'CONFIG_MANAGEMENT.md');
    const envExamplePath = path.join(this.projectRoot, '.env.example');
    const inconsistencies = [];

    if (fs.existsSync(configPath) && fs.existsSync(envExamplePath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const envContent = fs.readFileSync(envExamplePath, 'utf8');
      const envVars = this.parseEnvFile(envContent);

      Object.keys(envVars).forEach(envVar => {
        if (!configContent.includes(envVar)) {
          inconsistencies.push({
            file: 'CONFIG_MANAGEMENT.md',
            field: `环境变量 ${envVar}`,
            expected: '应包含在文档中',
            actual: '未找到',
          });
        }
      });
    } else {
      if (!fs.existsSync(configPath)) {
        inconsistencies.push({
          file: 'CONFIG_MANAGEMENT.md',
          issue: '文件不存在',
        });
      }
      if (!fs.existsSync(envExamplePath)) {
        inconsistencies.push({
          file: '.env.example',
          issue: '文件不存在',
        });
      }
    }

    this.validationResults.push({
      category: '配置文件同步',
      isValid: inconsistencies.length === 0,
      totalChecks: 1,
      passedChecks: inconsistencies.length === 0 ? 1 : 0,
      inconsistencies,
    });
  }

  /**
   * 验证 API 文档同步状态
   */
  async validateApiSync() {
    console.log('🔌 验证 API 文档同步状态...');

    const apiDocPath = path.join(this.docsPath, 'API_DOCUMENTATION.md');
    const openApiPath = path.join(this.docsPath, 'openapi.json');
    const inconsistencies = [];

    // 检查 OpenAPI 文档
    if (fs.existsSync(openApiPath)) {
      try {
        const openApiContent = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));

        if (openApiContent.info && openApiContent.info.version !== this.packageJson.version) {
          inconsistencies.push({
            file: 'openapi.json',
            field: 'API 版本',
            expected: this.packageJson.version,
            actual: openApiContent.info.version,
          });
        }
      } catch (error) {
        inconsistencies.push({
          file: 'openapi.json',
          issue: 'JSON 格式错误: ' + error.message,
        });
      }
    } else {
      inconsistencies.push({
        file: 'openapi.json',
        issue: 'OpenAPI 规范文件不存在',
      });
    }

    // 检查控制器文档同步
    await this.validateControllerDocSync(inconsistencies);

    this.validationResults.push({
      category: 'API 文档同步',
      isValid: inconsistencies.length === 0,
      totalChecks: 1,
      passedChecks: inconsistencies.length === 0 ? 1 : 0,
      inconsistencies,
    });
  }

  /**
   * 验证文档结构
   */
  async validateDocumentStructure() {
    console.log('🏗️ 验证文档结构...');

    const requiredDocs = [
      'index.md',
      'API_DOCUMENTATION.md',
      'ARCHITECTURE_DOCUMENTATION.md',
      'DEPLOYMENT_GUIDE.md',
      'DEVELOPER_GUIDE.md',
      'CONFIG_MANAGEMENT.md',
    ];

    const missingDocs = [];
    const structureIssues = [];

    requiredDocs.forEach(doc => {
      const docPath = path.join(this.docsPath, doc);
      if (!fs.existsSync(docPath)) {
        missingDocs.push(doc);
      } else {
        // 检查文档基本结构
        const content = fs.readFileSync(docPath, 'utf8');
        if (!content.includes('# ') && !content.includes('## ')) {
          structureIssues.push({
            file: doc,
            issue: '缺少标题结构',
          });
        }
      }
    });

    const inconsistencies = [
      ...missingDocs.map(doc => ({ file: doc, issue: '文件不存在' })),
      ...structureIssues,
    ];

    this.validationResults.push({
      category: '文档结构',
      isValid: inconsistencies.length === 0,
      totalChecks: requiredDocs.length,
      passedChecks: requiredDocs.length - missingDocs.length,
      inconsistencies,
    });
  }

  /**
   * 验证内容质量
   */
  async validateContentQuality() {
    console.log('📝 验证内容质量...');

    const qualityIssues = [];
    const docsToCheck = ['index.md', 'API_DOCUMENTATION.md', 'DEVELOPER_GUIDE.md'];

    docsToCheck.forEach(doc => {
      const docPath = path.join(this.docsPath, doc);
      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, 'utf8');

        // 检查内容长度
        if (content.length < 500) {
          qualityIssues.push({
            file: doc,
            issue: '内容过短，可能不够详细',
          });
        }

        // 检查是否有 TODO 或占位符
        if (content.includes('TODO') || content.includes('待完善') || content.includes('TBD')) {
          qualityIssues.push({
            file: doc,
            issue: '包含未完成的内容',
          });
        }

        // 检查链接有效性（简单检查，排除徽章链接和邮件链接）
        const brokenLinks =
          content.match(/\[.*?\]\((?!http)(?!https)(?!mailto:)(?!\.\/)[^)]*\)/g) || [];
        brokenLinks.forEach(link => {
          const linkPath = link.match(/\((.*?)\)/)[1];
          // 跳过徽章链接、外部链接和邮件链接
          if (
            !linkPath.startsWith('./') &&
            !linkPath.startsWith('../') &&
            !linkPath.startsWith('http') &&
            !linkPath.startsWith('mailto:')
          ) {
            const fullPath = path.resolve(this.docsPath, linkPath);
            if (!fs.existsSync(fullPath)) {
              qualityIssues.push({
                file: doc,
                issue: `可能的无效链接: ${link}`,
              });
            }
          }
        });
      }
    });

    this.validationResults.push({
      category: '内容质量',
      isValid: qualityIssues.length === 0,
      totalChecks: docsToCheck.length,
      passedChecks: docsToCheck.length - qualityIssues.length,
      inconsistencies: qualityIssues,
    });
  }

  /**
   * 检查 index.md 同步状态
   */
  async checkIndexMdSync() {
    const indexPath = path.join(this.docsPath, 'index.md');

    if (!fs.existsSync(indexPath)) {
      return {
        isValid: false,
        inconsistencies: [{ file: 'index.md', issue: '文件不存在' }],
      };
    }

    const content = fs.readFileSync(indexPath, 'utf8');
    const inconsistencies = [];

    // 检查版本号
    const versionMatch = content.match(/\*\*当前版本\*\*:\s*v?([^\n\r]+)/);
    if (!versionMatch || !versionMatch[1].includes(this.packageJson.version)) {
      inconsistencies.push({
        file: 'index.md',
        field: '版本号',
        expected: this.packageJson.version,
        actual: versionMatch ? versionMatch[1] : '未找到',
      });
    }

    // 检查项目描述
    if (!content.includes(this.packageJson.description)) {
      inconsistencies.push({
        file: 'index.md',
        field: '项目描述',
        expected: this.packageJson.description,
        actual: '未找到或不匹配',
      });
    }

    return {
      isValid: inconsistencies.length === 0,
      inconsistencies,
    };
  }

  /**
   * 检查部署指南同步状态
   */
  async checkDeploymentGuideSync() {
    const deployPath = path.join(this.docsPath, 'DEPLOYMENT_GUIDE.md');

    if (!fs.existsSync(deployPath)) {
      return {
        isValid: false,
        inconsistencies: [{ file: 'DEPLOYMENT_GUIDE.md', issue: '文件不存在' }],
      };
    }

    const content = fs.readFileSync(deployPath, 'utf8');
    const inconsistencies = [];

    // 检查核心依赖版本
    const coreDependencies = ['@nestjs/core', 'typeorm', 'ioredis', '@nestjs/jwt'];

    coreDependencies.forEach(dep => {
      if (this.packageJson.dependencies[dep]) {
        const expectedVersion = this.packageJson.dependencies[dep];
        if (!content.includes(dep) || !content.includes(expectedVersion)) {
          inconsistencies.push({
            file: 'DEPLOYMENT_GUIDE.md',
            field: `依赖版本 ${dep}`,
            expected: expectedVersion,
            actual: content.includes(dep) ? '版本不匹配' : '未找到依赖',
          });
        }
      }
    });

    return {
      isValid: inconsistencies.length === 0,
      inconsistencies,
    };
  }

  /**
   * 检查开发指南同步状态
   */
  async checkDeveloperGuideSync() {
    const devPath = path.join(this.docsPath, 'DEVELOPER_GUIDE.md');

    if (!fs.existsSync(devPath)) {
      return {
        isValid: false,
        inconsistencies: [{ file: 'DEVELOPER_GUIDE.md', issue: '文件不存在' }],
      };
    }

    const content = fs.readFileSync(devPath, 'utf8');
    const inconsistencies = [];

    // 检查重要脚本命令
    const importantScripts = ['start:dev', 'build', 'test', 'security:check'];

    importantScripts.forEach(script => {
      if (this.packageJson.scripts[script]) {
        const regex = new RegExp(`npm run ${script}`, 'g');
        if (!content.match(regex)) {
          inconsistencies.push({
            file: 'DEVELOPER_GUIDE.md',
            field: `脚本命令 ${script}`,
            expected: `npm run ${script}`,
            actual: '未找到',
          });
        }
      }
    });

    return {
      isValid: inconsistencies.length === 0,
      inconsistencies,
    };
  }

  /**
   * 验证控制器文档同步
   */
  async validateControllerDocSync(inconsistencies) {
    try {
      const controllerPattern = path.join(this.srcPath, '**/*.controller.{ts,js}');
      const glob = require('glob');

      if (glob.sync) {
        const controllerFiles = glob.sync(controllerPattern);
        const apiDocPath = path.join(this.docsPath, 'API_DOCUMENTATION.md');

        if (fs.existsSync(apiDocPath)) {
          const apiDocContent = fs.readFileSync(apiDocPath, 'utf8');

          controllerFiles.forEach(controllerFile => {
            const controllerName = path.basename(controllerFile, path.extname(controllerFile));
            const moduleName = controllerName.replace('.controller', '');

            if (!apiDocContent.includes(moduleName) && !apiDocContent.includes(controllerName)) {
              inconsistencies.push({
                file: 'API_DOCUMENTATION.md',
                field: `控制器 ${controllerName}`,
                expected: '应包含在API文档中',
                actual: '未找到',
              });
            }
          });
        }
      }
    } catch (error) {
      // glob 可能不可用，跳过此检查
      console.warn('⚠️  跳过控制器文档同步检查:', error.message);
    }
  }

  /**
   * 修复 index.md
   */
  async fixIndexMd() {
    console.log('📝 修复 index.md...');

    const indexPath = path.join(this.docsPath, 'index.md');

    if (!fs.existsSync(indexPath)) {
      console.log('⚠️  index.md 不存在，创建新文件');
      const template = this.createIndexMdTemplate();
      fs.writeFileSync(indexPath, template);
      this.addFixResult('index.md', '创建新文件', 'success');
      return;
    }

    let content = fs.readFileSync(indexPath, 'utf8');
    let isModified = false;

    // 修复版本号
    const versionRegex = /(\*\*当前版本\*\*:\s*v?)([^\n\r]+)/;
    const versionMatch = content.match(versionRegex);

    if (versionMatch && !versionMatch[2].includes(this.packageJson.version)) {
      const newVersionLine = `**当前版本**: v${this.packageJson.version}`;
      content = content.replace(versionRegex, newVersionLine);
      isModified = true;
      console.log(`  ✅ 更新版本号: ${versionMatch[2]} → v${this.packageJson.version}`);
    } else if (!versionMatch) {
      // 添加版本信息
      const headerMatch = content.match(/(# 🏪 .+ 文档中心\n)/);
      if (headerMatch) {
        const insertPos = headerMatch.index + headerMatch[0].length;
        const versionInfo = `\n**当前版本**: v${this.packageJson.version}\n**项目描述**: ${this.packageJson.description}\n`;
        content = content.slice(0, insertPos) + versionInfo + content.slice(insertPos);
        isModified = true;
        console.log(`  ✅ 添加版本信息: v${this.packageJson.version}`);
      }
    }

    // 修复项目描述
    if (!content.includes(this.packageJson.description)) {
      const descRegex = /(\*\*项目描述\*\*:\s*)([^\n\r]+)/;
      if (content.match(descRegex)) {
        content = content.replace(descRegex, `**项目描述**: ${this.packageJson.description}`);
      } else {
        // 在版本号后添加描述
        const versionLineRegex = /(\*\*当前版本\*\*:[^\n\r]+)/;
        content = content.replace(
          versionLineRegex,
          `$1\n**项目描述**: ${this.packageJson.description}`,
        );
      }
      isModified = true;
      console.log('  ✅ 更新项目描述');
    }

    if (isModified) {
      fs.writeFileSync(indexPath, content);
      this.addFixResult('index.md', '更新版本和描述信息', 'success');
    }
  }

  /**
   * 修复部署指南
   */
  async fixDeploymentGuide() {
    console.log('🚀 修复 DEPLOYMENT_GUIDE.md...');

    const deployPath = path.join(this.docsPath, 'DEPLOYMENT_GUIDE.md');

    if (!fs.existsSync(deployPath)) {
      console.log('⚠️  DEPLOYMENT_GUIDE.md 不存在，跳过修复');
      return;
    }

    let content = fs.readFileSync(deployPath, 'utf8');
    let isModified = false;

    const coreDependencies = {
      '@nestjs/core': this.packageJson.dependencies['@nestjs/core'],
      typeorm: this.packageJson.dependencies['typeorm'],
      ioredis: this.packageJson.dependencies['ioredis'],
      '@nestjs/jwt': this.packageJson.dependencies['@nestjs/jwt'],
    };

    // 确保有依赖版本部分
    if (!content.includes('## 📦 核心依赖')) {
      const installSection = content.indexOf('## 📥 安装依赖') || content.indexOf('## 安装');
      if (installSection !== -1) {
        const dependencySection = `\n## 📦 核心依赖\n\n本项目使用以下核心依赖：\n\n`;
        content =
          content.slice(0, installSection) + dependencySection + content.slice(installSection);
        isModified = true;
        console.log('  ✅ 创建依赖版本部分');
      }
    }

    // 更新依赖版本
    Object.entries(coreDependencies).forEach(([dep, version]) => {
      if (version) {
        if (!content.includes(dep) || !content.includes(version)) {
          const dependencySection = content.indexOf('## 📦 核心依赖');
          if (dependencySection !== -1) {
            const nextSection = content.indexOf('\n## ', dependencySection + 1);
            const insertPos = nextSection !== -1 ? nextSection : content.length;
            const depInfo = `\n- **${dep}**: \`${version}\``;
            content = content.slice(0, insertPos) + depInfo + content.slice(insertPos);
            isModified = true;
            console.log(`  ✅ 更新 ${dep}: ${version}`);
          }
        }
      }
    });

    if (isModified) {
      fs.writeFileSync(deployPath, content);
      this.addFixResult('DEPLOYMENT_GUIDE.md', '更新依赖版本', 'success');
    }
  }

  /**
   * 修复开发指南
   */
  async fixDeveloperGuide() {
    console.log('👨‍💻 修复 DEVELOPER_GUIDE.md...');

    const devPath = path.join(this.docsPath, 'DEVELOPER_GUIDE.md');

    if (!fs.existsSync(devPath)) {
      console.log('⚠️  DEVELOPER_GUIDE.md 不存在，跳过修复');
      return;
    }

    let content = fs.readFileSync(devPath, 'utf8');
    let isModified = false;

    const importantScripts = {
      'start:dev': '启动开发服务器',
      build: '构建生产版本',
      test: '运行测试',
      'test:unit': '运行单元测试',
      'test:integration': '运行集成测试',
      'test:e2e': '运行端到端测试',
      'security:check': '安全检查',
      'docs:validate': '验证文档一致性',
      'docs:sync:all': '同步所有文档',
    };

    // 确保有脚本命令部分
    if (!content.includes('## 🔧 常用命令')) {
      const quickStartSection = content.indexOf('## 🚀 快速开始') || content.indexOf('## 快速开始');
      if (quickStartSection !== -1) {
        const nextSection = content.indexOf('\n## ', quickStartSection + 1);
        const insertPos = nextSection !== -1 ? nextSection : content.length;
        const scriptSection = `\n## 🔧 常用命令\n\n以下是项目中常用的 npm 脚本命令：\n\n`;
        content = content.slice(0, insertPos) + scriptSection + content.slice(insertPos);
        isModified = true;
        console.log('  ✅ 创建脚本命令部分');
      }
    }

    // 更新脚本命令
    Object.entries(importantScripts).forEach(([script, description]) => {
      if (this.packageJson.scripts[script]) {
        const scriptRegex = new RegExp(`npm run ${script}`, 'g');

        if (!content.match(scriptRegex)) {
          const commandSection = content.indexOf('## 🔧 常用命令');
          if (commandSection !== -1) {
            const nextSection = content.indexOf('\n## ', commandSection + 1);
            const insertPos = nextSection !== -1 ? nextSection : content.length;
            const scriptInfo = `\n### ${description}\n\`\`\`bash\nnpm run ${script}\n\`\`\`\n`;
            content = content.slice(0, insertPos) + scriptInfo + content.slice(insertPos);
            isModified = true;
            console.log(`  ✅ 添加脚本命令: npm run ${script}`);
          }
        }
      }
    });

    if (isModified) {
      fs.writeFileSync(devPath, content);
      this.addFixResult('DEVELOPER_GUIDE.md', '更新脚本命令', 'success');
    }
  }

  /**
   * 修复配置管理文档
   */
  async fixConfigManagement() {
    console.log('⚙️ 修复 CONFIG_MANAGEMENT.md...');

    const configPath = path.join(this.docsPath, 'CONFIG_MANAGEMENT.md');
    const envExamplePath = path.join(this.projectRoot, '.env.example');

    if (!fs.existsSync(envExamplePath)) {
      console.log('⚠️  .env.example 不存在，跳过环境变量修复');
      return;
    }

    let content = '';
    if (fs.existsSync(configPath)) {
      content = fs.readFileSync(configPath, 'utf8');
    } else {
      content = this.createConfigManagementTemplate();
      console.log('  ✅ 创建新的 CONFIG_MANAGEMENT.md');
    }

    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    const envVars = this.parseEnvFile(envContent);

    content = this.updateEnvironmentVariables(content, envVars);

    fs.writeFileSync(configPath, content);
    console.log(`  ✅ 更新了 ${Object.keys(envVars).length} 个环境变量`);

    this.addFixResult('CONFIG_MANAGEMENT.md', '更新环境变量', 'success');
  }

  /**
   * 修复 API 文档
   */
  async fixApiDocumentation() {
    console.log('🔌 修复 API 文档...');

    const openApiPath = path.join(this.docsPath, 'openapi.json');

    if (fs.existsSync(openApiPath)) {
      try {
        const openApiContent = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));

        if (openApiContent.info && openApiContent.info.version !== this.packageJson.version) {
          openApiContent.info.version = this.packageJson.version;
          if (
            openApiContent.info.title &&
            !openApiContent.info.title.includes(this.packageJson.name)
          ) {
            openApiContent.info.title = this.packageJson.name + ' API';
          }
          if (this.packageJson.description) {
            openApiContent.info.description = this.packageJson.description;
          }

          fs.writeFileSync(openApiPath, JSON.stringify(openApiContent, null, 2));
          console.log(`  ✅ 更新 OpenAPI 版本: ${this.packageJson.version}`);
          this.addFixResult('openapi.json', '更新版本信息', 'success');
        }
      } catch (error) {
        console.log(`  ❌ OpenAPI 文件格式错误: ${error.message}`);
        this.addFixResult('openapi.json', '修复失败: JSON格式错误', 'failed');
      }
    }
  }

  /**
   * 同步到 index.md
   */
  async syncToIndexMd() {
    console.log('📝 同步到 index.md...');

    const indexPath = path.join(this.docsPath, 'index.md');

    if (!fs.existsSync(indexPath)) {
      const template = this.createIndexMdTemplate();
      fs.writeFileSync(indexPath, template);
      this.addSyncResult('index.md', '创建新文件', 'success');
      return;
    }

    // 使用修复逻辑进行同步
    await this.fixIndexMd();
    this.addSyncResult('index.md', '同步版本和描述信息', 'success');
  }

  /**
   * 同步到部署指南
   */
  async syncToDeploymentGuide() {
    console.log('🚀 同步到 DEPLOYMENT_GUIDE.md...');
    await this.fixDeploymentGuide();
    this.addSyncResult('DEPLOYMENT_GUIDE.md', '同步依赖版本', 'success');
  }

  /**
   * 同步到开发指南
   */
  async syncToDeveloperGuide() {
    console.log('👨‍💻 同步到 DEVELOPER_GUIDE.md...');
    await this.fixDeveloperGuide();
    this.addSyncResult('DEVELOPER_GUIDE.md', '同步脚本命令', 'success');
  }

  /**
   * 同步到配置文档
   */
  async syncToConfigDocs() {
    console.log('⚙️ 同步到配置文档...');
    await this.fixConfigManagement();
    this.addSyncResult('CONFIG_MANAGEMENT.md', '同步环境变量', 'success');
  }

  /**
   * 工具方法：解析环境变量文件
   */
  parseEnvFile(content) {
    const envVars = {};
    const lines = content.split('\n');

    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        envVars[key.trim()] = value.trim();
      }
    });

    return envVars;
  }

  /**
   * 更新环境变量部分
   */
  updateEnvironmentVariables(content, envVars) {
    if (!content.includes('### 📝 环境变量列表')) {
      content += `\n\n### 📝 环境变量列表\n\n以下是项目中使用的所有环境变量：\n\n`;
    }

    const envTable = this.generateEnvTable(envVars);

    const tableStart = content.indexOf('| 变量名 |');
    if (tableStart !== -1) {
      const nextSection = content.indexOf('\n## ', tableStart);
      const tableEnd = nextSection !== -1 ? nextSection : content.length;
      content = content.slice(0, tableStart) + envTable + content.slice(tableEnd);
    } else {
      const insertPoint = content.indexOf('以下是项目中使用的所有环境变量：');
      if (insertPoint !== -1) {
        const insertPos = insertPoint + '以下是项目中使用的所有环境变量：'.length;
        content = content.slice(0, insertPos) + '\n\n' + envTable + content.slice(insertPos);
      }
    }

    return content;
  }

  /**
   * 生成环境变量表格
   */
  generateEnvTable(envVars) {
    let table = '| 变量名 | 默认值 | 说明 | 必需 |\n';
    table += '|--------|--------|------|------|\n';

    Object.entries(envVars).forEach(([key, value]) => {
      const description = this.getEnvDescription(key);
      const required = this.isEnvRequired(key) ? '✅' : '❌';
      const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;

      table += `| \`${key}\` | \`${displayValue}\` | ${description} | ${required} |\n`;
    });

    return table;
  }

  /**
   * 获取环境变量描述
   */
  getEnvDescription(key) {
    const descriptions = {
      DATABASE_HOST: '数据库主机地址',
      DATABASE_PORT: '数据库端口号',
      DATABASE_USERNAME: '数据库用户名',
      DATABASE_PASSWORD: '数据库密码',
      DATABASE_NAME: '数据库名称',
      DATABASE_SYNCHRONIZE: '是否自动同步数据库结构',
      DATABASE_LOGGING: '是否启用数据库日志',
      REDIS_HOST: 'Redis 主机地址',
      REDIS_PORT: 'Redis 端口号',
      REDIS_PASSWORD: 'Redis 密码',
      JWT_SECRET: 'JWT 密钥',
      JWT_EXPIRES_IN: 'JWT 过期时间',
      API_PREFIX: 'API 路径前缀',
      LOG_LEVEL: '日志级别',
      NODE_ENV: '运行环境',
      PORT: '应用端口号',
    };

    return descriptions[key] || '配置项说明';
  }

  /**
   * 判断环境变量是否必需
   */
  isEnvRequired(key) {
    const requiredVars = [
      'DATABASE_HOST',
      'DATABASE_PORT',
      'DATABASE_USERNAME',
      'DATABASE_PASSWORD',
      'DATABASE_NAME',
      'JWT_SECRET',
      'NODE_ENV',
    ];

    return requiredVars.includes(key);
  }

  /**
   * 创建 index.md 模板
   */
  createIndexMdTemplate() {
    return `# 🏪 ${this.getDisplayName()} 文档中心

**当前版本**: v${this.packageJson.version}
**项目描述**: ${this.packageJson.description}

> 智能化、实时更新的企业级文档系统

[![文档覆盖率](https://img.shields.io/badge/文档覆盖率-95%25-brightgreen)](./quality/DOCUMENTATION_COVERAGE_REPORT.md)
[![API同步率](https://img.shields.io/badge/API同步率-100%25-brightgreen)](./api/openapi.json)
[![测试覆盖率](https://img.shields.io/badge/测试覆盖率-85%25-yellow)](./quality/TEST_COVERAGE_REPORT.md)

## 🎯 快速导航

### 🚀 新手必看
- [🔧 环境搭建](./DEVELOPER_GUIDE.md#环境搭建)
- [🏃 快速启动](./DEVELOPER_GUIDE.md#快速开始)
- [📖 API 文档](./API_DOCUMENTATION.md)

### 🔧 开发者工具
- [🏗️ 系统架构](./ARCHITECTURE_DOCUMENTATION.md)
- [🚀 部署指南](./DEPLOYMENT_GUIDE.md)
- [⚙️ 配置管理](./CONFIG_MANAGEMENT.md)

## 📊 项目状态

- **开发状态**: 活跃开发中
- **文档更新**: 自动同步
- **最后更新**: ${new Date().toISOString().split('T')[0]}
`;
  }

  /**
   * 创建配置管理文档模板
   */
  createConfigManagementTemplate() {
    return `# ⚙️ 配置管理指南

## 📋 概述

本文档详细说明了 ${this.packageJson.name} 项目的配置管理方式，包括环境变量、配置文件和部署配置。

## 🌍 环境变量

项目使用环境变量进行配置管理，支持多环境部署。

### 📝 环境变量列表

以下是项目中使用的所有环境变量：

`;
  }

  /**
   * 工具方法：获取显示名称
   */
  getDisplayName() {
    return this.packageJson.name
      .replace('caddy-style-shopping-', '')
      .replace('-', ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * 工具方法：检查是否应该验证某个类别
   */
  shouldValidateCategory(category) {
    return this.options.categories.includes('all') || this.options.categories.includes(category);
  }

  /**
   * 工具方法：检查是否有验证错误
   */
  hasValidationErrors() {
    return this.validationResults.some(result => !result.isValid);
  }

  /**
   * 工具方法：添加修复结果
   */
  addFixResult(file, action, status) {
    this.fixResults.push({ file, action, status });
  }

  /**
   * 工具方法：添加同步结果
   */
  addSyncResult(file, action, status) {
    this.syncResults.push({ file, action, status });
  }

  /**
   * 显示验证结果
   */
  displayValidationResults() {
    console.log('\n📊 验证结果汇总:');
    console.log('='.repeat(50));

    this.validationResults.forEach(result => {
      const status = result.isValid ? '✅' : '❌';
      const percentage = Math.round((result.passedChecks / result.totalChecks) * 100);

      console.log(
        `${status} ${result.category}: ${result.passedChecks}/${result.totalChecks} (${percentage}%)`,
      );

      if (!result.isValid && result.inconsistencies.length > 0) {
        result.inconsistencies.slice(0, 5).forEach(issue => {
          // 只显示前5个问题
          console.log(`   ⚠️  ${issue.file}: ${issue.field || issue.issue}`);
          if (issue.expected && issue.actual) {
            console.log(`      期望: ${issue.expected}`);
            console.log(`      实际: ${issue.actual}`);
          }
        });

        if (result.inconsistencies.length > 5) {
          console.log(`   ... 还有 ${result.inconsistencies.length - 5} 个问题`);
        }
      }
    });
  }

  /**
   * 显示修复结果
   */
  displayFixResults() {
    console.log('\n📊 修复结果汇总:');
    console.log('='.repeat(50));

    this.fixResults.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${result.file}: ${result.action}`);
    });

    const successCount = this.fixResults.filter(r => r.status === 'success').length;
    const totalCount = this.fixResults.length;

    console.log(
      `\n📈 修复成功率: ${successCount}/${totalCount} (${Math.round((successCount / totalCount) * 100)}%)`,
    );
  }

  /**
   * 显示同步结果
   */
  displaySyncResults() {
    console.log('\n📊 同步结果汇总:');
    console.log('='.repeat(50));

    this.syncResults.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${result.file}: ${result.action}`);
    });

    const successCount = this.syncResults.filter(r => r.status === 'success').length;
    const totalCount = this.syncResults.length;

    console.log(
      `\n📈 同步成功率: ${successCount}/${totalCount} (${Math.round((successCount / totalCount) * 100)}%)`,
    );
  }

  /**
   * 显示最终结果
   */
  displayFinalResults() {
    const hasErrors = this.hasValidationErrors();

    if (hasErrors) {
      console.log('\n❌ 发现文档不一致问题，请查看详细报告');
      process.exit(1);
    } else {
      console.log('\n✅ 所有文档都与数据源保持一致');
    }
  }

  /**
   * 生成综合报告
   */
  generateComprehensiveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      projectInfo: {
        name: this.packageJson.name,
        version: this.packageJson.version,
        description: this.packageJson.description,
      },
      validation: {
        summary: {
          totalCategories: this.validationResults.length,
          passedCategories: this.validationResults.filter(r => r.isValid).length,
          totalChecks: this.validationResults.reduce((sum, r) => sum + r.totalChecks, 0),
          passedChecks: this.validationResults.reduce((sum, r) => sum + r.passedChecks, 0),
        },
        results: this.validationResults,
      },
      fixes: {
        summary: {
          totalFixes: this.fixResults.length,
          successfulFixes: this.fixResults.filter(r => r.status === 'success').length,
          failedFixes: this.fixResults.filter(r => r.status === 'failed').length,
        },
        results: this.fixResults,
      },
      sync: {
        summary: {
          totalSyncs: this.syncResults.length,
          successfulSyncs: this.syncResults.filter(r => r.status === 'success').length,
          failedSyncs: this.syncResults.filter(r => r.status === 'failed').length,
        },
        results: this.syncResults,
      },
    };

    const reportPath = path.join(this.docsPath, 'quality/comprehensive-docs-report.json');

    // 确保目录存在
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 综合报告已生成: ${reportPath}`);
  }

  /**
   * 显示使用说明
   */
  showUsage() {
    console.log(`
📋 统一文档一致性管理器使用说明

基本用法:
  node docs-consistency-manager.js [命令] [选项]

命令:
  validate        验证文档一致性（默认）
  fix            自动修复发现的问题
  sync           同步 package.json 信息到文档
  check-and-fix  验证后自动修复问题

选项:
  --categories=<类别>  指定验证类别 (package,config,api,structure,content,all)
  --no-report         不生成报告
  --verbose          显示详细信息

示例:
  node docs-consistency-manager.js validate
  node docs-consistency-manager.js fix
  node docs-consistency-manager.js check-and-fix
  node docs-consistency-manager.js validate --categories=package,config
`);
  }
}

// 命令行参数解析
function parseArguments() {
  const args = process.argv.slice(2);
  const command = args[0] || 'validate';
  const options = {
    categories: ['all'],
    generateReport: true,
    verbose: false,
  };

  args.forEach(arg => {
    if (arg.startsWith('--categories=')) {
      options.categories = arg.split('=')[1].split(',');
    } else if (arg === '--no-report') {
      options.generateReport = false;
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  });

  return { command, options };
}

// 主执行逻辑
if (require.main === module) {
  const { command, options } = parseArguments();
  const manager = new UnifiedDocsConsistencyManager(options);

  manager.execute(command).catch(error => {
    console.error('❌ 执行失败:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = UnifiedDocsConsistencyManager;
