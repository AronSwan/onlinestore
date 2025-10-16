/**
 * 密钥管理命令行接口
 * 提供密钥生成、导入、导出、列表、删除等操作的命令行界面
 */

const { Command } = require('commander');
const { KeyManager } = require('../key-management/key-manager');
const { TrustManager } = require('../key-management/trust-manager');
const { KeyCache } = require('../key-management/key-cache');
const { ErrorHandler } = require('../shared/error-handler');
const { SecurityUtils } = require('../shared/security-utils');
const { Config } = require('../shared/config');

class KeyManagementCLI {
  constructor() {
    this.program = new Command();
    this.keyManager = new KeyManager();
    this.trustManager = new TrustManager();
    this.keyCache = new KeyCache();
    this.errorHandler = new ErrorHandler();
    this.securityUtils = new SecurityUtils();
    this.config = new Config();

    this.setupCommands();
  }

  setupCommands() {
    this.program
      .name('key-manager')
      .description('高级密钥管理系统 - 密钥管理命令行工具')
      .version('1.0.0');

    // 密钥生成命令
    this.program
      .command('generate')
      .description('生成新的密钥对')
      .option('-n, --name <name>', '密钥名称')
      .option('-t, --type <type>', '密钥类型 (rsa/ec/ed25519)', 'rsa')
      .option('-s, --size <size>', '密钥大小 (2048/3072/4096 for RSA)', '2048')
      .option('-p, --password <password>', '密钥密码')
      .option('--no-password', '生成无密码保护的密钥')
      .action(this.generateKey.bind(this));

    // 密钥导入命令
    this.program
      .command('import')
      .description('导入密钥')
      .requiredOption('-f, --file <file>', '密钥文件路径')
      .option('-n, --name <name>', '密钥名称')
      .option('-p, --password <password>', '密钥密码')
      .option('--trusted', '标记为受信任密钥')
      .action(this.importKey.bind(this));

    // 密钥导出命令
    this.program
      .command('export')
      .description('导出密钥')
      .requiredOption('-n, --name <name>', '密钥名称')
      .requiredOption('-f, --file <file>', '导出文件路径')
      .option('-p, --password <password>', '导出密码')
      .option('--public-only', '仅导出公钥')
      .action(this.exportKey.bind(this));

    // 密钥列表命令
    this.program
      .command('list')
      .description('列出所有密钥')
      .option('--trusted-only', '仅显示受信任密钥')
      .option('--expired-only', '仅显示过期密钥')
      .option('--verbose', '显示详细信息')
      .action(this.listKeys.bind(this));

    // 密钥删除命令
    this.program
      .command('delete')
      .description('删除密钥')
      .requiredOption('-n, --name <name>', '密钥名称')
      .option('--force', '强制删除，不确认')
      .action(this.deleteKey.bind(this));

    // 密钥信息命令
    this.program
      .command('info')
      .description('显示密钥详细信息')
      .requiredOption('-n, --name <name>', '密钥名称')
      .option('--fingerprint', '显示指纹信息')
      .action(this.keyInfo.bind(this));

    // 信任管理命令
    this.program
      .command('trust')
      .description('管理密钥信任')
      .option('-a, --add <name>', '添加受信任密钥')
      .option('-r, --remove <name>', '移除受信任密钥')
      .option('-l, --list', '列出所有受信任密钥')
      .option('--fingerprint <fingerprint>', '通过指纹管理信任')
      .action(this.manageTrust.bind(this));

    // 缓存管理命令
    this.program
      .command('cache')
      .description('管理密钥缓存')
      .option('--clear', '清空缓存')
      .option('--stats', '显示缓存统计')
      .option('--size <size>', '设置缓存大小')
      .action(this.manageCache.bind(this));

    // 配置命令
    this.program
      .command('config')
      .description('管理配置')
      .option('--show', '显示当前配置')
      .option('--reset', '重置为默认配置')
      .option('--set <key=value>', '设置配置值')
      .action(this.manageConfig.bind(this));
  }

  async generateKey(options) {
    try {
      console.log('正在生成密钥...');

      const keyParams = {
        name: options.name || `key-${Date.now()}`,
        type: options.type,
        size: parseInt(options.size),
        password: options.password || undefined,
      };

      const keyInfo = await this.keyManager.generateKey(keyParams);

      console.log('✅ 密钥生成成功:');
      console.log(`   名称: ${keyInfo.name}`);
      console.log(`   类型: ${keyInfo.type}`);
      console.log(`   大小: ${keyInfo.size}`);
      console.log(`   指纹: ${keyInfo.fingerprint}`);
      console.log(`   创建时间: ${new Date(keyInfo.createdAt).toLocaleString()}`);

      if (options.trusted) {
        await this.trustManager.addTrustedKey(keyInfo.fingerprint, keyInfo.name);
        console.log('✅ 密钥已标记为受信任');
      }
    } catch (error) {
      this.errorHandler.handleError(error, '密钥生成失败');
      process.exit(1);
    }
  }

  async importKey(options) {
    try {
      console.log('正在导入密钥...');

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

      if (options.trusted) {
        await this.trustManager.addTrustedKey(keyInfo.fingerprint, keyInfo.name);
        console.log('✅ 密钥已标记为受信任');
      }
    } catch (error) {
      this.errorHandler.handleError(error, '密钥导入失败');
      process.exit(1);
    }
  }

  async exportKey(options) {
    try {
      console.log('正在导出密钥...');

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
      console.log(`   类型: ${options.publicOnly ? '公钥' : '完整密钥对'}`);
    } catch (error) {
      this.errorHandler.handleError(error, '密钥导出失败');
      process.exit(1);
    }
  }

  async listKeys(options) {
    try {
      const keys = await this.keyManager.listKeys();

      if (keys.length === 0) {
        console.log('❌ 未找到任何密钥');
        return;
      }

      let filteredKeys = keys;

      if (options.trustedOnly) {
        const trustedFingerprints = await this.trustManager.getTrustedKeys();
        filteredKeys = keys.filter(key =>
          trustedFingerprints.some(trusted => trusted.fingerprint === key.fingerprint),
        );
      }

      if (options.expiredOnly) {
        filteredKeys = filteredKeys.filter(
          key => key.expiresAt && new Date(key.expiresAt) < new Date(),
        );
      }

      console.log(`找到 ${filteredKeys.length} 个密钥:`);
      console.log('');

      filteredKeys.forEach(key => {
        console.log(`🔑 ${key.name}`);
        if (options.verbose) {
          console.log(`   类型: ${key.type}`);
          console.log(`   指纹: ${key.fingerprint}`);
          console.log(`   创建: ${new Date(key.createdAt).toLocaleString()}`);
          if (key.expiresAt) {
            const expired = new Date(key.expiresAt) < new Date();
            console.log(
              `   过期: ${new Date(key.expiresAt).toLocaleString()} ${expired ? '❌ 已过期' : '✅ 有效'}`,
            );
          }
          console.log('');
        }
      });
    } catch (error) {
      this.errorHandler.handleError(error, '列出密钥失败');
      process.exit(1);
    }
  }

  async deleteKey(options) {
    try {
      if (!options.force) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise(resolve => {
          readline.question(`确认删除密钥 "${options.name}"? (y/N): `, resolve);
        });
        readline.close();

        if (answer.toLowerCase() !== 'y') {
          console.log('操作已取消');
          return;
        }
      }

      await this.keyManager.deleteKey(options.name);
      console.log(`✅ 密钥 "${options.name}" 已删除`);
    } catch (error) {
      this.errorHandler.handleError(error, '删除密钥失败');
      process.exit(1);
    }
  }

  async keyInfo(options) {
    try {
      const keyInfo = await this.keyManager.getKeyInfo(options.name);

      console.log(`🔑 密钥信息 - ${keyInfo.name}:`);
      console.log(`   类型: ${keyInfo.type}`);
      console.log(`   大小: ${keyInfo.size}`);
      console.log(`   创建时间: ${new Date(keyInfo.createdAt).toLocaleString()}`);

      if (keyInfo.expiresAt) {
        const expired = new Date(keyInfo.expiresAt) < new Date();
        console.log(
          `   过期时间: ${new Date(keyInfo.expiresAt).toLocaleString()} ${expired ? '❌ 已过期' : '✅ 有效'}`,
        );
      }

      if (options.fingerprint) {
        console.log(`   指纹: ${keyInfo.fingerprint}`);
      }

      // 检查信任状态
      const isTrusted = await this.trustManager.isKeyTrusted(keyInfo.fingerprint);
      console.log(`   信任状态: ${isTrusted ? '✅ 受信任' : '❌ 未受信任'}`);
    } catch (error) {
      this.errorHandler.handleError(error, '获取密钥信息失败');
      process.exit(1);
    }
  }

  async manageTrust(options) {
    try {
      if (options.add) {
        const keyInfo = await this.keyManager.getKeyInfo(options.add);
        await this.trustManager.addTrustedKey(keyInfo.fingerprint, keyInfo.name);
        console.log(`✅ 密钥 "${options.add}" 已添加到受信任列表`);
      } else if (options.remove) {
        await this.trustManager.removeTrustedKey(options.remove);
        console.log(`✅ 密钥 "${options.remove}" 已从受信任列表移除`);
      } else if (options.list) {
        const trustedKeys = await this.trustManager.getTrustedKeys();

        if (trustedKeys.length === 0) {
          console.log('❌ 未找到受信任密钥');
          return;
        }

        console.log('受信任密钥列表:');
        trustedKeys.forEach(trusted => {
          console.log(`   🔑 ${trusted.name || '未知'} - ${trusted.fingerprint}`);
        });
      } else if (options.fingerprint) {
        // 通过指纹管理信任
        if (options.add) {
          await this.trustManager.addTrustedKey(options.fingerprint, '通过指纹添加');
          console.log(`✅ 指纹 "${options.fingerprint}" 已添加到受信任列表`);
        } else if (options.remove) {
          await this.trustManager.removeTrustedKeyByFingerprint(options.fingerprint);
          console.log(`✅ 指纹 "${options.fingerprint}" 已从受信任列表移除`);
        }
      } else {
        console.log('请指定操作: --add, --remove, --list 或 --fingerprint');
      }
    } catch (error) {
      this.errorHandler.handleError(error, '信任管理操作失败');
      process.exit(1);
    }
  }

  async manageCache(options) {
    try {
      if (options.clear) {
        await this.keyCache.clear();
        console.log('✅ 缓存已清空');
      } else if (options.stats) {
        const stats = await this.keyCache.getStats();
        console.log('缓存统计:');
        console.log(`   命中次数: ${stats.hits}`);
        console.log(`   未命中次数: ${stats.misses}`);
        console.log(`   当前大小: ${stats.size}`);
        console.log(`   最大大小: ${stats.maxSize}`);
        console.log(`   命中率: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)}%`);
      } else if (options.size) {
        await this.keyCache.setMaxSize(parseInt(options.size));
        console.log(`✅ 缓存大小已设置为: ${options.size}`);
      } else {
        console.log('请指定操作: --clear, --stats, 或 --size');
      }
    } catch (error) {
      this.errorHandler.handleError(error, '缓存管理操作失败');
      process.exit(1);
    }
  }

  async manageConfig(options) {
    try {
      if (options.show) {
        const config = this.config.getAll();
        console.log('当前配置:');
        console.log(JSON.stringify(config, null, 2));
      } else if (options.reset) {
        this.config.resetToDefaults();
        console.log('✅ 配置已重置为默认值');
      } else if (options.set) {
        const [key, value] = options.set.split('=');
        if (key && value) {
          this.config.set(key.trim(), value.trim());
          console.log(`✅ 配置 "${key}" 已设置为: ${value}`);
        } else {
          console.log('❌ 无效的设置格式，请使用: --set key=value');
        }
      } else {
        console.log('请指定操作: --show, --reset, 或 --set');
      }
    } catch (error) {
      this.errorHandler.handleError(error, '配置管理操作失败');
      process.exit(1);
    }
  }

  async run() {
    try {
      await this.program.parseAsync(process.argv);
    } catch (error) {
      this.errorHandler.handleError(error, 'CLI执行失败');
      process.exit(1);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const cli = new KeyManagementCLI();
  cli.run();
}

module.exports = { KeyManagementCLI };
