#!/usr/bin/env node

/**
 * 交互式配置向导 - 提供用户友好的配置生成和管理
 * 支持步骤式配置、验证和预设模板
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { EOL } = require('os');

// 配置向导配置
const WizardConfig = {
  // 界面配置
  ui: {
    title: '测试运行器配置向导',
    description: '通过交互式方式生成和配置测试运行器',
    width: 80,
    indent: '  ',
    colorEnabled: true
  },
  
  // 预设模板
  templates: {
    basic: {
      name: '基础配置',
      description: '适合基本测试需求的配置',
      config: {
        version: '3.3.0',
        name: 'test-runner-secure-basic',
        commandRateLimit: {
          maxExecutions: 10,
          timeWindow: 10000,
          cooldownPeriod: 2000
        },
        performance: {
          maxMemoryMB: 256,
          maxExecutionTime: 30000,
          gcInterval: 5000,
          monitorInterval: 1000
        },
        concurrency: {
          maxConcurrent: 2,
          lockTimeout: 10000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        logging: {
          enableConsole: true,
          level: 'info',
          filePath: null
        },
        sandbox: {
          enabled: false
        },
        audit: {
          enabled: false
        },
        security: {
          enabled: false
        },
        monitoring: {
          enabled: false
        }
      }
    },
    advanced: {
      name: '高级配置',
      description: '包含所有安全性和监控功能的高级配置',
      config: {
        version: '3.3.0',
        name: 'test-runner-secure-advanced',
        commandRateLimit: {
          maxExecutions: 50,
          timeWindow: 10000,
          cooldownPeriod: 2000
        },
        performance: {
          maxMemoryMB: 512,
          maxExecutionTime: 60000,
          gcInterval: 5000,
          monitorInterval: 1000
        },
        concurrency: {
          maxConcurrent: 8,
          lockTimeout: 10000,
          retryAttempts: 3,
          retryDelay: 1000
        },
        logging: {
          enableConsole: true,
          level: 'info',
          filePath: './logs/test-runner.log'
        },
        sandbox: {
          enabled: true,
          resourceLimits: {
            maxMemoryMB: 256,
            maxCpuTime: 30,
            maxFileSize: 10 * 1024 * 1024
          },
          securityLimits: {
            allowedPaths: ['/tmp', process.cwd()],
            blockedCommands: ['rm', 'sudo', 'chmod', 'kill']
          }
        },
        audit: {
          enabled: true,
          encryption: {
            enabled: true,
            algorithm: 'aes-256-gcm'
          },
          compression: {
            enabled: true,
            level: 6
          },
          integrity: {
            enabled: true,
            algorithm: 'sha256'
          },
          rotation: {
            maxFileSize: 10 * 1024 * 1024,
            maxFiles: 10
          }
        },
        security: {
          enabled: true,
          scanOnStartup: false,
          scanOnTestFailure: true,
          codeSecurity: {
            enabled: true,
            excludePatterns: ['**/node_modules/**', '**/dist/**', '**/coverage/**']
          },
          dependencySecurity: {
            enabled: true,
            checkVulnerabilities: true,
            checkLicenses: true
          },
          configSecurity: {
            enabled: true,
            checkFilePermissions: true
          }
        },
        monitoring: {
          enabled: true,
          openobserve: {
            enabled: true,
            endpoint: 'http://localhost:5080',
            organization: 'default',
            username: 'admin',
            password: process.env.OPENOBSERVE_PASSWORD || 'CHANGE_ME_openobserve_password',
            batching: {
              enabled: true,
              maxBatchSize: 100,
              maxBatchTime: 5000
            },
            streams: {
              logs: 'test-runner-logs',
              metrics: 'test-runner-metrics',
              traces: 'test-runner-traces'
            }
          }
        }
      }
    },
    custom: {
      name: '自定义配置',
      description: '根据您的需求逐步配置',
      config: {}
    }
  },
  
  // 步骤配置
  steps: [
    {
      id: 'welcome',
      title: '欢迎',
      description: '欢迎使用测试运行器配置向导',
      type: 'info'
    },
    {
      id: 'template',
      title: '选择配置模板',
      description: '选择一个预设模板作为起点',
      type: 'select',
      options: ['basic', 'advanced', 'custom'],
      required: true
    },
    {
      id: 'general',
      title: '基本配置',
      description: '配置基本参数',
      type: 'group',
      fields: [
        {
          id: 'name',
          title: '配置名称',
          description: '配置文件的名称',
          type: 'input',
          default: 'test-runner-secure',
          required: true
        },
        {
          id: 'maxExecutions',
          title: '最大执行次数',
          description: '时间窗口内的最大命令执行次数',
          type: 'number',
          default: 10,
          min: 1,
          max: 100,
          required: true
        },
        {
          id: 'maxMemoryMB',
          title: '最大内存使用',
          description: '最大内存使用量（MB）',
          type: 'number',
          default: 256,
          min: 64,
          max: 2048,
          required: true
        },
        {
          id: 'maxConcurrent',
          title: '最大并发数',
          description: '最大并发执行数',
          type: 'number',
          default: 2,
          min: 1,
          max: 16,
          required: true
        }
      ]
    },
    {
      id: 'features',
      title: '功能配置',
      description: '选择要启用的功能',
      type: 'group',
      fields: [
        {
          id: 'sandbox',
          title: '沙箱执行',
          description: '启用沙箱执行环境',
          type: 'confirm',
          default: false
        },
        {
          id: 'audit',
          title: '审计日志',
          description: '启用加密审计日志',
          type: 'confirm',
          default: false
        },
        {
          id: 'security',
          title: '安全扫描',
          description: '启用安全扫描功能',
          type: 'confirm',
          default: false
        },
        {
          id: 'monitoring',
          title: '监控集成',
          description: '启用 OpenObserve 监控集成',
          type: 'confirm',
          default: false
        }
      ]
    },
    {
      id: 'output',
      title: '输出配置',
      description: '配置输出文件路径',
      type: 'group',
      fields: [
        {
          id: 'outputPath',
          title: '配置文件路径',
          description: '配置文件的保存路径',
          type: 'input',
          default: './test-runner-secure.config.cjs',
          required: true
        },
        {
          id: 'createBackup',
          title: '创建备份',
          description: '如果配置文件已存在，是否创建备份',
          type: 'confirm',
          default: true
        }
      ]
    },
    {
      id: 'summary',
      title: '配置摘要',
      description: '查看并确认配置',
      type: 'summary'
    }
  ]
};

class InteractiveConfigWizard {
  constructor(options = {}) {
    this.options = {
      ...WizardConfig,
      ...options
    };
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.currentStep = 0;
    this.config = {};
    this.template = null;
    this.answers = {};
  }
  
  /**
   * 启动向导
   */
  async start() {
    try {
      this.displayHeader();
      
      // 执行所有步骤
      for (let i = 0; i < this.options.steps.length; i++) {
        this.currentStep = i;
        const step = this.options.steps[i];
        
        await this.executeStep(step);
        
        // 如果是模板选择步骤，加载模板
        if (step.id === 'template') {
          this.loadTemplate(this.answers.template);
        }
      }
      
      // 生成配置文件
      await this.generateConfigFile();
      
      this.displayFooter();
      
    } catch (error) {
      this.displayError(`配置向导出错: ${error.message}`);
    } finally {
      this.rl.close();
    }
  }
  
  /**
   * 显示页头
   */
  displayHeader() {
    const { ui } = this.options;
    
    console.log('');
    console.log(this.centerText(ui.title, ui.width));
    console.log(this.centerText('═'.repeat(ui.title.length), ui.width));
    console.log('');
    console.log(this.wrapText(ui.description, ui.width));
    console.log('');
  }
  
  /**
   * 执行步骤
   */
  async executeStep(step) {
    switch (step.type) {
      case 'info':
        await this.executeInfoStep(step);
        break;
      case 'select':
        await this.executeSelectStep(step);
        break;
      case 'group':
        await this.executeGroupStep(step);
        break;
      case 'summary':
        await this.executeSummaryStep(step);
        break;
      default:
        throw new Error(`未知步骤类型: ${step.type}`);
    }
  }
  
  /**
   * 执行信息步骤
   */
  async executeInfoStep(step) {
    console.log(`\n${this.options.ui.indent}📋 ${step.title}`);
    console.log(`${this.options.ui.indent}═${'═'.repeat(step.title.length)}`);
    console.log('');
    console.log(this.wrapText(step.description, this.options.ui.width - 4));
    console.log('');
    
    await this.prompt('按 Enter 键继续...');
  }
  
  /**
   * 执行选择步骤
   */
  async executeSelectStep(step) {
    console.log(`\n${this.options.ui.indent}📋 ${step.title}`);
    console.log(`${this.options.ui.indent}═${'═'.repeat(step.title.length)}`);
    console.log('');
    console.log(this.wrapText(step.description, this.options.ui.width - 4));
    console.log('');
    
    // 显示选项
    step.options.forEach((option, index) => {
      const template = this.options.templates[option];
      console.log(`${this.options.ui.indent}  ${index + 1}. ${template.name}`);
      console.log(`${this.options.ui.indent}     ${template.description}`);
      console.log('');
    });
    
    // 获取用户选择
    let choice;
    while (true) {
      const input = await this.prompt(`请选择一个选项 (1-${step.options.length}): `);
      choice = parseInt(input, 10);
      
      if (choice >= 1 && choice <= step.options.length) {
        break;
      }
      
      this.displayError(`无效选择，请输入 1-${step.options.length} 之间的数字`);
    }
    
    this.answers[step.id] = step.options[choice - 1];
  }
  
  /**
   * 执行组步骤
   */
  async executeGroupStep(step) {
    // 如果是自定义配置，显示所有字段
    // 否则只显示未在模板中定义的字段
    const fieldsToShow = this.getFieldsToShow(step.fields);
    
    if (fieldsToShow.length === 0) {
      // 没有字段需要配置，跳过
      return;
    }
    
    console.log(`\n${this.options.ui.indent}📋 ${step.title}`);
    console.log(`${this.options.ui.indent}═${'═'.repeat(step.title.length)}`);
    console.log('');
    console.log(this.wrapText(step.description, this.options.ui.width - 4));
    console.log('');
    
    // 处理每个字段
    for (const field of fieldsToShow) {
      await this.executeField(field);
    }
  }
  
  /**
   * 获取需要显示的字段
   */
  getFieldsToShow(fields) {
    if (this.answers.template === 'custom') {
      return fields;
    }
    
    // 对于预设模板，只显示未在模板中定义的字段
    return fields.filter(field => {
      const value = this.getNestedValue(this.template.config, field.id);
      return value === undefined;
    });
  }
  
  /**
   * 获取嵌套值
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
  
  /**
   * 设置嵌套值
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }
  
  /**
   * 执行字段
   */
  async executeField(field) {
    console.log(`${this.options.ui.indent}  🔧 ${field.title}`);
    
    if (field.description) {
      console.log(`${this.options.ui.indent}     ${field.description}`);
    }
    
    let value;
    
    switch (field.type) {
      case 'input':
        value = await this.executeInputField(field);
        break;
      case 'number':
        value = await this.executeNumberField(field);
        break;
      case 'confirm':
        value = await this.executeConfirmField(field);
        break;
      default:
        throw new Error(`未知字段类型: ${field.type}`);
    }
    
    this.answers[field.id] = value;
    console.log('');
  }
  
  /**
   * 执行输入字段
   */
  async executeInputField(field) {
    const defaultValue = field.default || '';
    const promptText = defaultValue ? 
      `${this.options.ui.indent}     请输入值 (默认: ${defaultValue}): ` :
      `${this.options.ui.indent}     请输入值: `;
    
    let value = await this.prompt(promptText);
    
    if (!value && defaultValue) {
      value = defaultValue;
    }
    
    // 验证必填字段
    if (field.required && !value) {
      this.displayError('此字段为必填项');
      return await this.executeInputField(field);
    }
    
    return value;
  }
  
  /**
   * 执行数字字段
   */
  async executeNumberField(field) {
    const promptText = `${this.options.ui.indent}     请输入数字 (默认: ${field.default}): `;
    
    let value;
    while (true) {
      const input = await this.prompt(promptText);
      value = input ? parseFloat(input) : field.default;
      
      if (isNaN(value)) {
        this.displayError('请输入有效的数字');
        continue;
      }
      
      if (field.min !== undefined && value < field.min) {
        this.displayError(`值不能小于 ${field.min}`);
        continue;
      }
      
      if (field.max !== undefined && value > field.max) {
        this.displayError(`值不能大于 ${field.max}`);
        continue;
      }
      
      break;
    }
    
    return value;
  }
  
  /**
   * 执行确认字段
   */
  async executeConfirmField(field) {
    const defaultValueText = field.default ? 'Y/n' : 'y/N';
    const promptText = `${this.options.ui.indent}     是否启用? (${defaultValueText}): `;
    
    const input = await this.prompt(promptText);
    
    if (!input) {
      return field.default;
    }
    
    return ['y', 'yes', 'true', '1'].includes(input.toLowerCase());
  }
  
  /**
   * 执行摘要步骤
   */
  async executeSummaryStep(step) {
    console.log(`\n${this.options.ui.indent}📋 ${step.title}`);
    console.log(`${this.options.ui.indent}═${'═'.repeat(step.title.length)}`);
    console.log('');
    
    // 构建最终配置
    this.buildFinalConfig();
    
    // 显示配置摘要
    this.displayConfigSummary();
    
    // 确认
    const confirmed = await this.prompt('\n确认生成配置文件? (Y/n): ');
    
    if (confirmed && !['n', 'no', 'false', '0'].includes(confirmed.toLowerCase())) {
      this.answers.confirmed = true;
    } else {
      this.answers.confirmed = false;
    }
  }
  
  /**
   * 加载模板
   */
  loadTemplate(templateId) {
    this.template = this.options.templates[templateId];
    this.config = JSON.parse(JSON.stringify(this.template.config));
  }
  
  /**
   * 构建最终配置
   */
  buildFinalConfig() {
    if (!this.template) {
      // 如果没有选择模板，使用基本配置
      this.template = this.options.templates.basic;
      this.config = JSON.parse(JSON.stringify(this.template.config));
    }
    
    // 应用用户答案
    for (const [key, value] of Object.entries(this.answers)) {
      if (key !== 'template' && key !== 'confirmed') {
        this.setNestedValue(this.config, key, value);
      }
    }
  }
  
  /**
   * 显示配置摘要
   */
  displayConfigSummary() {
    console.log(`${this.options.ui.indent}配置摘要:`);
    console.log('');
    
    // 基本信息
    console.log(`${this.options.ui.indent}  名称: ${this.config.name}`);
    console.log(`${this.options.ui.indent}  版本: ${this.config.version}`);
    console.log(`${this.options.ui.indent}  最大执行次数: ${this.config.commandRateLimit.maxExecutions}`);
    console.log(`${this.options.ui.indent}  最大内存: ${this.config.performance.maxMemoryMB}MB`);
    console.log(`${this.options.ui.indent}  最大并发数: ${this.config.concurrency.maxConcurrent}`);
    console.log('');
    
    // 功能状态
    console.log(`${this.options.ui.indent}功能状态:`);
    console.log(`${this.options.ui.indent}  沙箱执行: ${this.config.sandbox.enabled ? '启用' : '禁用'}`);
    console.log(`${this.options.ui.indent}  审计日志: ${this.config.audit.enabled ? '启用' : '禁用'}`);
    console.log(`${this.options.ui.indent}  安全扫描: ${this.config.security.enabled ? '启用' : '禁用'}`);
    console.log(`${this.options.ui.indent}  监控集成: ${this.config.monitoring.enabled ? '启用' : '禁用'}`);
    console.log('');
  }
  
  /**
   * 生成配置文件
   */
  async generateConfigFile() {
    if (!this.answers.confirmed) {
      console.log('\n配置已取消。');
      return;
    }
    
    const outputPath = this.answers.outputPath || './test-runner-secure.config.cjs';
    
    // 如果文件存在且需要备份
    if (fs.existsSync(outputPath) && this.answers.createBackup) {
      const backupPath = `${outputPath}.backup.${Date.now()}`;
      fs.copyFileSync(outputPath, backupPath);
      console.log(`\n已创建配置文件备份: ${backupPath}`);
    }
    
    // 生成配置文件内容
    const configContent = this.generateConfigFileContent();
    
    // 写入文件
    fs.writeFileSync(outputPath, configContent, 'utf8');
    
    console.log(`\n✅ 配置文件已生成: ${outputPath}`);
    console.log('\n使用方法:');
    console.log(`  node test-runner-secure.cjs --config ${outputPath}`);
  }
  
  /**
   * 生成配置文件内容
   */
  generateConfigFileContent() {
    return `/**
 * 测试运行器配置文件
 * 由交互式配置向导生成
 * 生成时间: ${new Date().toISOString()}
 */

const getConfig = () => {
  return ${JSON.stringify(this.config, null, 2)};
};

const validateConfig = (config) => {
  // 基本验证
  if (!config.version) {
    throw new Error('配置缺少版本信息');
  }
  
  if (!config.name) {
    throw new Error('配置缺少名称');
  }
  
  // 可以添加更多验证逻辑
  
  return true;
};

module.exports = {
  getConfig,
  validateConfig
};
`;
  }
  
  /**
   * 显示页脚
   */
  displayFooter() {
    console.log('');
    console.log(this.centerText('感谢使用测试运行器配置向导', this.options.ui.width));
    console.log('');
    console.log('如需帮助，请查看文档或访问 GitHub 项目页面');
    console.log('');
  }
  
  /**
   * 显示错误
   */
  displayError(message) {
    if (this.options.ui.colorEnabled) {
      console.log(`\x1b[31m${this.options.ui.indent}❌ ${message}\x1b[0m`);
    } else {
      console.log(`${this.options.ui.indent}❌ ${message}`);
    }
  }
  
  /**
   * 居中文本
   */
  centerText(text, width) {
    const padding = Math.max(0, width - text.length);
    const leftPadding = Math.floor(padding / 2);
    const rightPadding = padding - leftPadding;
    
    return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding);
  }
  
  /**
   * 包装文本
   */
  wrapText(text, width) {
    if (text.length <= width) {
      return text;
    }
    
    const lines = [];
    let currentLine = '';
    
    const words = text.split(' ');
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.join(EOL);
  }
  
  /**
   * 提示用户输入
   */
  prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

module.exports = {
  InteractiveConfigWizard,
  WizardConfig
};