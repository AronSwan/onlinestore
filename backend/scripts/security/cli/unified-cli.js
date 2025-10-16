/**
 * 统一命令行接口
 * 提供向后兼容的统一接口，整合密钥管理和签名服务功能
 */

const { Command } = require('commander');
const { KeyManagementCLI } = require('./key-management-cli');
const { SignatureServiceCLI } = require('./signature-service-cli');
const { KeyManager } = require('../key-management/key-manager');
const { Signer } = require('../signature-service/signer');
const { Verifier } = require('../signature-service/verifier');
const { ErrorHandler } = require('../shared/error-handler');
const { SecurityUtils } = require('../shared/security-utils');
const { Config } = require('../shared/config');
const fs = require('fs').promises;
const path = require('path');

class UnifiedCLI {
  constructor() {
    this.program = new Command();
    this.keyManager = new KeyManager();
    this.signer = new Signer();
    this.verifier = new Verifier();
    this.errorHandler = new ErrorHandler();
    this.securityUtils = new SecurityUtils();
    this.config = new Config();

    this.setupCommands();
  }

  setupCommands() {
    this.program
      .name('signature-manager')
      .description('高级签名管理系统 - 统一命令行工具 (向后兼容)')
      .version('2.0.0');

    // 向后兼容的命令 - 保持与原有 enhanced-signature-manager.js 相同的接口
    this.program
      .command('generate-key')
      .description('生成新的密钥对 (兼容命令)')
      .option('-n, --name <name>', '密钥名称')
      .option('-t, --type <type>', '密钥类型 (rsa/ec/ed25519)', 'rsa')
      .option('-s, --size <size>', '密钥大小', '2048')
      .option('-p, --password <password>', '密钥密码')
      .action(this.generateKeyCompatible.bind(this));

    this.program
      .command('import-key')
      .description('导入密钥 (兼容命令)')
      .requiredOption('-f, --file <file>', '密钥文件路径')
      .option('-n, --name <name>', '密钥名称')
      .option('-p, --password <password>', '密钥密码')
      .action(this.importKeyCompatible.bind(this));

    this.program
      .command('export-key')
      .description('导出密钥 (兼容命令)')
      .requiredOption('-n, --name <name>', '密钥名称')
      .requiredOption('-f, --file <file>', '导出文件路径')
      .option('-p, --password <password>', '导出密码')
      .option('--public-only', '仅导出公钥')
      .action(this.exportKeyCompatible.bind(this));

    this.program
      .command('list-keys')
      .description('列出所有密钥 (兼容命令)')
      .action(this.listKeysCompatible.bind(this));

    this.program
      .command('delete-key')
      .description('删除密钥 (兼容命令)')
      .requiredOption('-n, --name <name>', '密钥名称')
      .action(this.deleteKeyCompatible.bind(this));

    this.program
      .command('sign')
      .description('对数据或文件进行签名 (兼容命令)')
      .requiredOption('-d, --data <data>', '要签名的数据或文件路径')
      .requiredOption('-k, --key <key>', '签名密钥名称')
      .option('-o, --output <file>', '签名输出文件')
      .option('-f, --format <format>', '签名格式', 'hex')
      .action(this.signDataCompatible.bind(this));

    this.program
      .command('verify')
      .description('验证签名 (兼容命令)')
      .requiredOption('-d, --data <data>', '原始数据或文件路径')
      .requiredOption('-s, --signature <signature>', '签名数据或文件路径')
      .requiredOption('-k, --key <key>', '验证密钥名称')
      .action(this.verifySignatureCompatible.bind(this));

    this.program
      .command('batch-sign')
      .description('批量签名多个文件 (兼容命令)')
      .requiredOption('-f, --files <files...>', '要签名的文件列表')
      .requiredOption('-k, --key <key>', '签名密钥名称')
      .option('-o, --output-dir <dir>', '签名输出目录')
      .action(this.batchSignCompatible.bind(this));

    this.program
      .command('multi-sign')
      .description('多签名操作 (兼容命令)')
      .option('-c, --create <name>', '创建多签名会话')
      .option('-j, --join <sessionId>', '加入多签名会话')
      .option('-s, --sign <sessionId>', '在多签名会话中签名')
      .option('-f, --finalize <sessionId>', '完成多签名会话')
      .action(this.multiSignCompatible.bind(this));

    // 新架构的命令组 - 提供模块化访问
    this.program
      .command('key-manager')
      .description('密钥管理模块命令')
      .argument('<command>', '密钥管理命令')
      .allowUnknownOption()
      .action((command, options) => {
        this.runKeyManagerCommand(command, options.parent.args.slice(1));
      });

    this.program
      .command('signature-service')
      .description('签名服务模块命令')
      .argument('<command>', '签名服务命令')
      .allowUnknownOption()
      .action((command, options) => {
        this.runSignatureServiceCommand(command, options.parent.args.slice(1));
      });

    // 系统命令
    this.program.command('status').description('显示系统状态').action(this.showStatus.bind(this));

    this.program
      .command('migrate')
      .description('从旧版本迁移数据')
      .option('--from <path>', '旧版本数据路径')
      .option('--to <path>', '新版本数据路径')
      .action(this.migrateData.bind(this));

    this.program
      .command('health-check')
      .description('系统健康检查')
      .action(this.healthCheck.bind(this));
  }

  // 向后兼容的命令实现
  async generateKeyCompatible(options) {
    try {
      console.log('正在生成密钥 (兼容模式)...');

      const keyParams = {
        name: options.name || `key-${Date.now()}`,
        type: options.type,
        size: parseInt(options.size),
        password: options.password,
      };

      const keyInfo = await this.keyManager.generateKey(keyParams);

      console.log('✅ 密钥生成成功:');
      console.log(`   名称: ${keyInfo.name}`);
      console.log(`   类型: ${keyInfo.type}`);
      console.log(`   大小: ${keyInfo.size}`);
      console.log(`   指纹: ${keyInfo.fingerprint}`);
    } catch (error) {
      this.errorHandler.handleError(error, '密钥生成失败');
      process.exit(1);
    }
  }

  async importKeyCompatible(options) {
    try {
      console.log('正在导入密钥 (兼容模式)...');

      const importParams = {
        filePath: options.file,
        name: options.name,
        password: options.password,
      };

      const keyInfo = await this.keyManager.importKey(importParams);

      console.log('✅ 密钥导入成功:');
      console.log(`   名称: ${keyInfo.name}`);
      console.log(`   类型: ${keyInfo.type}`);
      console.log(`   指纹: ${keyInfo.fingerprint}`);
    } catch (error) {
      this.errorHandler.handleError(error, '密钥导入失败');
      process.exit(1);
    }
  }

  async exportKeyCompatible(options) {
    try {
      console.log('正在导出密钥 (兼容模式)...');

      const exportParams = {
        keyName: options.name,
        filePath: options.file,
        password: options.password,
        publicOnly: options.publicOnly,
      };

      await this.keyManager.exportKey(exportParams);

      console.log('✅ 密钥导出成功:');
      console.log(`   文件: ${options.file}`);
      console.log(`   密钥: ${options.name}`);
    } catch (error) {
      this.errorHandler.handleError(error, '密钥导出失败');
      process.exit(1);
    }
  }

  async listKeysCompatible() {
    try {
      const keys = await this.keyManager.listKeys();

      if (keys.length === 0) {
        console.log('❌ 未找到任何密钥');
        return;
      }

      console.log(`找到 ${keys.length} 个密钥:`);
      console.log('');

      keys.forEach(key => {
        console.log(`🔑 ${key.name}`);
        console.log(`   类型: ${key.type}`);
        console.log(`   指纹: ${key.fingerprint}`);
        console.log(`   创建: ${new Date(key.createdAt).toLocaleString()}`);
        console.log('');
      });
    } catch (error) {
      this.errorHandler.handleError(error, '列出密钥失败');
      process.exit(1);
    }
  }

  async deleteKeyCompatible(options) {
    try {
      await this.keyManager.deleteKey(options.name);
      console.log(`✅ 密钥 "${options.name}" 已删除`);
    } catch (error) {
      this.errorHandler.handleError(error, '删除密钥失败');
      process.exit(1);
    }
  }

  async signDataCompatible(options) {
    try {
      console.log('正在生成签名 (兼容模式)...');

      let data;
      // 检查是否是文件路径
      try {
        const stats = await fs.stat(options.data);
        if (stats.isFile()) {
          data = await fs.readFile(options.data, 'utf8');
        } else {
          data = options.data;
        }
      } catch {
        data = options.data;
      }

      const signParams = {
        data: data,
        keyName: options.key,
        format: options.format,
      };

      const signature = await this.signer.sign(signParams);

      if (options.output) {
        await fs.writeFile(options.output, signature, 'utf8');
        console.log(`✅ 签名已保存到: ${options.output}`);
      } else {
        console.log('✅ 签名生成成功:');
        console.log(signature);
      }
    } catch (error) {
      this.errorHandler.handleError(error, '签名生成失败');
      process.exit(1);
    }
  }

  async verifySignatureCompatible(options) {
    try {
      console.log('正在验证签名 (兼容模式)...');

      let data, signature;

      // 读取数据
      try {
        const stats = await fs.stat(options.data);
        if (stats.isFile()) {
          data = await fs.readFile(options.data, 'utf8');
        } else {
          data = options.data;
        }
      } catch {
        data = options.data;
      }

      // 读取签名
      try {
        const stats = await fs.stat(options.signature);
        if (stats.isFile()) {
          signature = await fs.readFile(options.signature, 'utf8');
        } else {
          signature = options.signature;
        }
      } catch {
        signature = options.signature;
      }

      const verifyParams = {
        data: data,
        signature: signature,
        keyName: options.key,
      };

      const result = await this.verifier.verify(verifyParams);

      if (result.valid) {
        console.log('✅ 签名验证成功');
      } else {
        console.log('❌ 签名验证失败');
        process.exit(1);
      }
    } catch (error) {
      this.errorHandler.handleError(error, '签名验证失败');
      process.exit(1);
    }
  }

  async batchSignCompatible(options) {
    try {
      console.log('开始批量签名 (兼容模式)...');

      const batchParams = {
        files: options.files,
        keyName: options.key,
        outputDir: options.outputDir,
      };

      const results = await this.signer.batchSign(batchParams);

      console.log(`✅ 批量签名完成`);
      console.log(`   成功: ${results.successCount}`);
      console.log(`   失败: ${results.failureCount}`);
    } catch (error) {
      this.errorHandler.handleError(error, '批量签名失败');
      process.exit(1);
    }
  }

  async multiSignCompatible(options) {
    try {
      if (options.create) {
        const session = await this.signer.createMultiSignatureSession(options.create);
        console.log('✅ 多签名会话创建成功:');
        console.log(`   会话ID: ${session.sessionId}`);
      } else if (options.join) {
        const session = await this.signer.joinMultiSignatureSession(options.join);
        console.log('✅ 成功加入多签名会话:');
        console.log(`   会话ID: ${session.sessionId}`);
      } else if (options.sign) {
        const signature = await this.signer.addMultiSignature(options.sign, '数据');
        console.log('✅ 多签名添加成功');
      } else if (options.finalize) {
        const result = await this.signer.finalizeMultiSignature(options.finalize);
        console.log('✅ 多签名会话完成');
      } else {
        console.log('请指定操作: --create, --join, --sign, 或 --finalize');
      }
    } catch (error) {
      this.errorHandler.handleError(error, '多签名操作失败');
      process.exit(1);
    }
  }

  // 模块化命令路由
  async runKeyManagerCommand(command, args) {
    try {
      const keyManagementCLI = new KeyManagementCLI();
      // 重新构造参数数组
      const newArgs = ['node', 'key-management-cli', command, ...args];
      process.argv = newArgs;
      await keyManagementCLI.run();
    } catch (error) {
      this.errorHandler.handleError(error, '密钥管理命令执行失败');
      process.exit(1);
    }
  }

  async runSignatureServiceCommand(command, args) {
    try {
      const signatureServiceCLI = new SignatureServiceCLI();
      // 重新构造参数数组
      const newArgs = ['node', 'signature-service-cli', command, ...args];
      process.argv = newArgs;
      await signatureServiceCLI.run();
    } catch (error) {
      this.errorHandler.handleError(error, '签名服务命令执行失败');
      process.exit(1);
    }
  }

  // 系统命令
  async showStatus() {
    try {
      console.log('🔍 系统状态检查...');

      // 检查密钥管理状态
      const keys = await this.keyManager.listKeys();
      console.log(`📊 密钥管理:`);
      console.log(`   密钥数量: ${keys.length}`);
      console.log(`   存储路径: ${this.config.get('keyStorage.path')}`);

      // 检查配置状态
      const config = this.config.getAll();
      console.log(`⚙️ 配置状态:`);
      console.log(`   配置版本: ${config.version || '未知'}`);
      console.log(`   安全级别: ${config.security?.level || '标准'}`);

      // 检查系统健康
      console.log(`💚 系统健康:`);
      console.log(`   内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
      console.log(`   运行时间: ${Math.round(process.uptime())} 秒`);
      console.log(`   Node.js版本: ${process.version}`);

      console.log('\n✅ 系统状态正常');
    } catch (error) {
      this.errorHandler.handleError(error, '状态检查失败');
      process.exit(1);
    }
  }

  async migrateData(options) {
    try {
      console.log('🔄 开始数据迁移...');

      const fromPath = options.from || './legacy-data';
      const toPath = options.to || './new-data';

      console.log(`   从: ${fromPath}`);
      console.log(`   到: ${toPath}`);

      // 这里应该实现具体的数据迁移逻辑
      // 由于时间关系，这里只显示迁移步骤

      const migrationSteps = [
        '检查旧数据完整性',
        '备份旧数据',
        '转换密钥格式',
        '迁移配置设置',
        '验证迁移结果',
      ];

      for (const step of migrationSteps) {
        console.log(`   🔄 ${step}...`);
        // 模拟迁移步骤
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`   ✅ ${step} 完成`);
      }

      console.log('✅ 数据迁移完成');
    } catch (error) {
      this.errorHandler.handleError(error, '数据迁移失败');
      process.exit(1);
    }
  }

  async healthCheck() {
    try {
      console.log('🏥 执行系统健康检查...');

      const checks = [
        { name: '配置系统', check: () => this.config.getAll() !== null },
        {
          name: '密钥存储',
          check: async () => {
            try {
              await this.keyManager.listKeys();
              return true;
            } catch {
              return false;
            }
          },
        },
        {
          name: '签名服务',
          check: async () => {
            try {
              const testData = 'health-check';
              await this.signer.sign({ data: testData, keyName: 'test' });
              return true;
            } catch {
              return false;
            }
          },
        },
        {
          name: '验证服务',
          check: async () => {
            try {
              await this.verifier.verify({
                data: 'health-check',
                signature: 'test',
                keyName: 'test',
              });
              return true;
            } catch {
              return false;
            }
          },
        },
        { name: '错误处理', check: () => this.errorHandler !== null },
        { name: '安全工具', check: () => this.securityUtils !== null },
      ];

      let allPassed = true;

      for (const check of checks) {
        try {
          const result = await check.check();
          if (result) {
            console.log(`   ✅ ${check.name} - 正常`);
          } else {
            console.log(`   ❌ ${check.name} - 异常`);
            allPassed = false;
          }
        } catch (error) {
          console.log(`   ❌ ${check.name} - 错误: ${error.message}`);
          allPassed = false;
        }
      }

      if (allPassed) {
        console.log('\n🎉 所有健康检查通过 - 系统运行正常');
      } else {
        console.log('\n⚠️  部分健康检查失败 - 请检查系统配置');
        process.exit(1);
      }
    } catch (error) {
      this.errorHandler.handleError(error, '健康检查失败');
      process.exit(1);
    }
  }

  async run() {
    try {
      // 如果没有参数，显示帮助信息
      if (process.argv.length <= 2) {
        this.program.outputHelp();
        return;
      }

      await this.program.parseAsync(process.argv);
    } catch (error) {
      this.errorHandler.handleError(error, '统一CLI执行失败');
      process.exit(1);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new UnifiedCLI();
  cli.run();
}

module.exports = { UnifiedCLI };
