/**
 * 签名服务命令行接口
 * 提供数据签名、验证、批量操作、多签名等功能的命令行界面
 */

const { Command } = require('commander');
const { Signer } = require('../signature-service/signer');
const { Verifier } = require('../signature-service/verifier');
const { BatchSigner } = require('../signature-service/batch-signer');
const { MultiSignature } = require('../signature-service/multi-signature');
const { AutoSigner } = require('../signature-service/auto-signer');
const { ErrorHandler } = require('../shared/error-handler');
const { SecurityUtils } = require('../shared/security-utils');
const { Config } = require('../shared/config');
const fs = require('fs').promises;
const path = require('path');

class SignatureServiceCLI {
  constructor() {
    this.program = new Command();
    this.signer = new Signer();
    this.verifier = new Verifier();
    this.batchSigner = new BatchSigner();
    this.multiSignature = new MultiSignature();
    this.autoSigner = new AutoSigner();
    this.errorHandler = new ErrorHandler();
    this.securityUtils = new SecurityUtils();
    this.config = new Config();

    this.setupCommands();
  }

  setupCommands() {
    this.program
      .name('signature-service')
      .description('高级签名服务系统 - 签名和验证命令行工具')
      .version('1.0.0');

    // 数据签名命令
    this.program
      .command('sign')
      .description('对数据或文件进行签名')
      .requiredOption('-d, --data <data>', '要签名的数据或文件路径')
      .requiredOption('-k, --key <key>', '签名密钥名称')
      .option('-o, --output <file>', '签名输出文件')
      .option('-f, --format <format>', '签名格式 (hex/base64/json)', 'hex')
      .option('--detached', '生成分离签名')
      .option('--timestamp', '添加时间戳')
      .action(this.signData.bind(this));

    // 签名验证命令
    this.program
      .command('verify')
      .description('验证签名')
      .requiredOption('-d, --data <data>', '原始数据或文件路径')
      .requiredOption('-s, --signature <signature>', '签名数据或文件路径')
      .requiredOption('-k, --key <key>', '验证密钥名称')
      .option('--detached', '验证分离签名')
      .option('--trusted-only', '仅使用受信任密钥验证')
      .action(this.verifySignature.bind(this));

    // 批量签名命令
    this.program
      .command('batch-sign')
      .description('批量签名多个文件')
      .requiredOption('-f, --files <files...>', '要签名的文件列表')
      .requiredOption('-k, --key <key>', '签名密钥名称')
      .option('-o, --output-dir <dir>', '签名输出目录')
      .option('--concurrency <number>', '并发数量', '5')
      .option('--progress', '显示进度')
      .action(this.batchSign.bind(this));

    // 批量验证命令
    this.program
      .command('batch-verify')
      .description('批量验证多个签名')
      .requiredOption('-f, --files <files...>', '要验证的文件列表')
      .requiredOption('-k, --key <key>', '验证密钥名称')
      .option('--signature-dir <dir>', '签名文件目录')
      .option('--concurrency <number>', '并发数量', '5')
      .option('--progress', '显示进度')
      .action(this.batchVerify.bind(this));

    // 多签名会话命令
    this.program
      .command('multi-sign')
      .description('多签名会话管理')
      .option('-c, --create <name>', '创建多签名会话')
      .option('-j, --join <sessionId>', '加入多签名会话')
      .option('-s, --sign <sessionId>', '在多签名会话中签名')
      .option('-f, --finalize <sessionId>', '完成多签名会话')
      .option('-l, --list', '列出多签名会话')
      .option('--info <sessionId>', '显示会话信息')
      .option('--threshold <number>', '设置签名阈值')
      .option('--participants <participants...>', '设置参与者')
      .action(this.manageMultiSignature.bind(this));

    // 自动签名命令
    this.program
      .command('auto-sign')
      .description('自动签名监控')
      .option('-w, --watch <dir>', '监控目录路径')
      .option('-k, --key <key>', '自动签名密钥')
      .option('-p, --pattern <pattern>', '文件匹配模式', '*.{js,json,ts}')
      .option('--start', '启动自动签名服务')
      .option('--stop', '停止自动签名服务')
      .option('--status', '显示服务状态')
      .action(this.manageAutoSigner.bind(this));

    // 签名信息命令
    this.program
      .command('info')
      .description('显示签名信息')
      .requiredOption('-s, --signature <signature>', '签名数据或文件路径')
      .option('--verbose', '显示详细信息')
      .action(this.signatureInfo.bind(this));

    // 性能测试命令
    this.program
      .command('benchmark')
      .description('性能基准测试')
      .option('-k, --key <key>', '测试密钥名称')
      .option('-c, --count <count>', '测试次数', '100')
      .option('-s, --size <size>', '测试数据大小 (bytes)', '1024')
      .option('--concurrency <number>', '并发测试数量', '10')
      .action(this.runBenchmark.bind(this));

    // 配置命令
    this.program
      .command('config')
      .description('管理签名服务配置')
      .option('--show', '显示当前配置')
      .option('--reset', '重置为默认配置')
      .option('--set <key=value>', '设置配置值')
      .action(this.manageConfig.bind(this));
  }

  async signData(options) {
    try {
      console.log('正在生成签名...');

      let data;
      // 检查是否是文件路径
      try {
        const stats = await fs.stat(options.data);
        if (stats.isFile()) {
          data = await fs.readFile(options.data, 'utf8');
          console.log(`从文件读取数据: ${options.data}`);
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
        detached: options.detached,
        timestamp: options.timestamp,
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

  async verifySignature(options) {
    try {
      console.log('正在验证签名...');

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
        detached: options.detached,
        trustedOnly: options.trustedOnly,
      };

      const result = await this.verifier.verify(verifyParams);

      if (result.valid) {
        console.log('✅ 签名验证成功');
        if (result.timestamp) {
          console.log(`   时间戳: ${new Date(result.timestamp).toLocaleString()}`);
        }
        if (result.keyInfo) {
          console.log(`   签名密钥: ${result.keyInfo.name}`);
          console.log(`   密钥指纹: ${result.keyInfo.fingerprint}`);
        }
      } else {
        console.log('❌ 签名验证失败');
        if (result.reason) {
          console.log(`   原因: ${result.reason}`);
        }
        process.exit(1);
      }
    } catch (error) {
      this.errorHandler.handleError(error, '签名验证失败');
      process.exit(1);
    }
  }

  async batchSign(options) {
    try {
      console.log('开始批量签名...');

      const batchParams = {
        files: options.files,
        keyName: options.key,
        outputDir: options.outputDir,
        concurrency: parseInt(options.concurrency),
        showProgress: options.progress,
      };

      const results = await this.batchSigner.processBatch(batchParams);

      console.log(`✅ 批量签名完成`);
      console.log(`   成功: ${results.successCount}`);
      console.log(`   失败: ${results.failureCount}`);
      console.log(`   总耗时: ${results.totalTime}ms`);

      if (results.failures.length > 0) {
        console.log('\n失败文件:');
        results.failures.forEach(failure => {
          console.log(`   ❌ ${failure.file}: ${failure.error}`);
        });
      }
    } catch (error) {
      this.errorHandler.handleError(error, '批量签名失败');
      process.exit(1);
    }
  }

  async batchVerify(options) {
    try {
      console.log('开始批量验证...');

      const batchParams = {
        files: options.files,
        keyName: options.key,
        signatureDir: options.signatureDir,
        concurrency: parseInt(options.concurrency),
        showProgress: options.progress,
      };

      const results = await this.batchSigner.verifyBatch(batchParams);

      console.log(`✅ 批量验证完成`);
      console.log(`   有效签名: ${results.validCount}`);
      console.log(`   无效签名: ${results.invalidCount}`);
      console.log(`   总耗时: ${results.totalTime}ms`);

      if (results.invalidFiles.length > 0) {
        console.log('\n无效签名文件:');
        results.invalidFiles.forEach(invalid => {
          console.log(`   ❌ ${invalid.file}: ${invalid.reason}`);
        });
      }
    } catch (error) {
      this.errorHandler.handleError(error, '批量验证失败');
      process.exit(1);
    }
  }

  async manageMultiSignature(options) {
    try {
      if (options.create) {
        const sessionParams = {
          name: options.create,
          threshold: options.threshold ? parseInt(options.threshold) : 2,
          participants: options.participants || [],
        };

        const session = await this.multiSignature.createSession(sessionParams);
        console.log('✅ 多签名会话创建成功:');
        console.log(`   会话ID: ${session.sessionId}`);
        console.log(`   会话名称: ${session.name}`);
        console.log(`   签名阈值: ${session.threshold}`);
        console.log(`   当前签名: ${session.signatures.length}`);
        console.log(`   状态: ${session.status}`);
      } else if (options.join) {
        const session = await this.multiSignature.joinSession(options.join);
        console.log('✅ 成功加入多签名会话:');
        console.log(`   会话ID: ${session.sessionId}`);
        console.log(`   会话名称: ${session.name}`);
        console.log(`   当前参与者: ${session.participants.length}`);
      } else if (options.sign) {
        const data = '多签名数据示例'; // 实际应用中应该从参数获取
        const signature = await this.multiSignature.addSignature(options.sign, data);
        console.log('✅ 多签名添加成功:');
        console.log(`   签名者: ${signature.signer}`);
        console.log(`   签名时间: ${new Date(signature.timestamp).toLocaleString()}`);
      } else if (options.finalize) {
        const result = await this.multiSignature.finalizeSession(options.finalize);
        console.log('✅ 多签名会话完成:');
        console.log(`   最终签名: ${result.finalSignature}`);
        console.log(`   总签名数: ${result.totalSignatures}`);
        console.log(`   状态: ${result.status}`);
      } else if (options.list) {
        const sessions = await this.multiSignature.listSessions();

        if (sessions.length === 0) {
          console.log('❌ 未找到多签名会话');
          return;
        }

        console.log('多签名会话列表:');
        sessions.forEach(session => {
          console.log(`   📝 ${session.name} (${session.sessionId})`);
          console.log(`      状态: ${session.status}`);
          console.log(`      签名: ${session.signatures.length}/${session.threshold}`);
          console.log(`      创建时间: ${new Date(session.createdAt).toLocaleString()}`);
          console.log('');
        });
      } else if (options.info) {
        const session = await this.multiSignature.getSessionInfo(options.info);
        console.log(`多签名会话信息 - ${session.name}:`);
        console.log(`   会话ID: ${session.sessionId}`);
        console.log(`   状态: ${session.status}`);
        console.log(`   签名阈值: ${session.threshold}`);
        console.log(`   当前签名数: ${session.signatures.length}`);
        console.log(`   参与者: ${session.participants.join(', ')}`);
        console.log(`   创建时间: ${new Date(session.createdAt).toLocaleString()}`);

        if (session.signatures.length > 0) {
          console.log('\n签名列表:');
          session.signatures.forEach(sig => {
            console.log(`   👤 ${sig.signer} - ${new Date(sig.timestamp).toLocaleString()}`);
          });
        }
      } else {
        console.log('请指定操作: --create, --join, --sign, --finalize, --list, 或 --info');
      }
    } catch (error) {
      this.errorHandler.handleError(error, '多签名操作失败');
      process.exit(1);
    }
  }

  async manageAutoSigner(options) {
    try {
      if (options.start) {
        if (!options.watch || !options.key) {
          console.log('❌ 启动自动签名需要指定 --watch 和 --key 参数');
          return;
        }

        const autoSignParams = {
          watchDir: options.watch,
          keyName: options.key,
          pattern: options.pattern,
        };

        await this.autoSigner.start(autoSignParams);
        console.log('✅ 自动签名服务已启动');
        console.log(`   监控目录: ${options.watch}`);
        console.log(`   签名密钥: ${options.key}`);
        console.log(`   文件模式: ${options.pattern}`);
      } else if (options.stop) {
        await this.autoSigner.stop();
        console.log('✅ 自动签名服务已停止');
      } else if (options.status) {
        const status = await this.autoSigner.getStatus();
        console.log('自动签名服务状态:');
        console.log(`   运行状态: ${status.running ? '✅ 运行中' : '❌ 已停止'}`);
        if (status.running) {
          console.log(`   监控目录: ${status.watchDir}`);
          console.log(`   签名密钥: ${status.keyName}`);
          console.log(`   已处理文件: ${status.processedFiles}`);
          console.log(
            `   最后活动: ${status.lastActivity ? new Date(status.lastActivity).toLocaleString() : '无'}`,
          );
        }
      } else {
        console.log('请指定操作: --start, --stop, 或 --status');
      }
    } catch (error) {
      this.errorHandler.handleError(error, '自动签名操作失败');
      process.exit(1);
    }
  }

  async signatureInfo(options) {
    try {
      let signature;

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

      const info = await this.verifier.getSignatureInfo(signature);

      console.log('签名信息:');
      console.log(`   格式: ${info.format}`);
      console.log(`   算法: ${info.algorithm}`);
      console.log(
        `   时间戳: ${info.timestamp ? new Date(info.timestamp).toLocaleString() : '无'}`,
      );

      if (options.verbose && info.details) {
        console.log('\n详细信息:');
        console.log(JSON.stringify(info.details, null, 2));
      }
    } catch (error) {
      this.errorHandler.handleError(error, '获取签名信息失败');
      process.exit(1);
    }
  }

  async runBenchmark(options) {
    try {
      console.log('开始性能基准测试...');

      const benchmarkParams = {
        keyName: options.key || 'benchmark-key',
        iterations: parseInt(options.count),
        dataSize: parseInt(options.size),
        concurrency: parseInt(options.concurrency),
      };

      const results = await this.signer.runBenchmark(benchmarkParams);

      console.log('✅ 性能基准测试完成:');
      console.log(`   总测试次数: ${results.iterations}`);
      console.log(`   数据大小: ${results.dataSize} bytes`);
      console.log(`   并发数: ${results.concurrency}`);
      console.log(`   总耗时: ${results.totalTime}ms`);
      console.log(`   平均签名时间: ${results.avgSignTime}ms`);
      console.log(`   峰值内存使用: ${results.peakMemory} MB`);
      console.log(`   操作每秒: ${results.operationsPerSecond} ops/s`);
      console.log(`   成功率: ${((results.successCount / results.iterations) * 100).toFixed(2)}%`);
    } catch (error) {
      this.errorHandler.handleError(error, '性能测试失败');
      process.exit(1);
    }
  }

  async manageConfig(options) {
    try {
      if (options.show) {
        const config = this.config.getAll();
        console.log('当前签名服务配置:');
        console.log(JSON.stringify(config.signatureService || {}, null, 2));
      } else if (options.reset) {
        this.config.resetToDefaults();
        console.log('✅ 配置已重置为默认值');
      } else if (options.set) {
        const [key, value] = options.set.split('=');
        if (key && value) {
          this.config.set(`signatureService.${key.trim()}`, value.trim());
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
  const cli = new SignatureServiceCLI();
  cli.run();
}

module.exports = { SignatureServiceCLI };
