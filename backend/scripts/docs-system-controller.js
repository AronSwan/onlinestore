#!/usr/bin/env node

/**
 * 文档系统主控制器
 * 统一管理后端文档系统与 Paperless-NGX 的集成
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const DocsIntegration = require('./docs-paperless-integration');
const DocsSyncDaemon = require('./docs-sync-daemon');

class DocsSystemController {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.configFile = path.join(this.projectRoot, 'config', 'docs-integration.json');
    this.logFile = path.join(this.projectRoot, 'logs', 'docs-system.log');
    this.pidFile = path.join(this.projectRoot, 'logs', 'docs-daemon.pid');

    this.loadConfig();
    this.ensureDirectories();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        this.config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      } else {
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      this.log(`配置文件加载失败: ${error.message}`, 'ERROR');
      this.config = this.getDefaultConfig();
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      this.log(`配置文件保存失败: ${error.message}`, 'ERROR');
    }
  }

  getDefaultConfig() {
    return {
      integration: {
        name: 'Backend Documentation System Integration',
        version: '1.0.0',
        autoStart: false,
        enableMonitoring: true,
      },
      paperless: {
        url: 'http://localhost:8000',
        autoStartService: true,
      },
      monitoring: {
        syncInterval: 300000,
        healthCheckInterval: 120000,
      },
    };
  }

  ensureDirectories() {
    const dirs = [
      path.dirname(this.logFile),
      path.dirname(this.pidFile),
      path.join(this.projectRoot, 'paperless-ngx', 'consume'),
      path.join(this.projectRoot, 'paperless-ngx', 'export'),
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [CONTROLLER] [${level}] ${message}\n`;

    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }

  /**
   * 检查系统依赖
   */
  async checkDeps() {
    this.log('检查系统依赖');

    try {
      // 1. 创建必要目录
      this.createRequiredDirectories();

      // 2. 检查 Docker
      this.checkDockerInstallation();

      this.log('依赖检查完成');
    } catch (error) {
      this.log(`依赖检查失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * 创建必要目录
   */
  createRequiredDirectories() {
    const dirs = [
      path.join(this.projectRoot, 'logs'),
      path.join(this.projectRoot, 'config'),
      path.join(this.projectRoot, 'docs', 'archived'),
      path.join(this.projectRoot, 'docs', 'processed'),
      path.join(this.projectRoot, 'paperless-ngx', 'consume'),
      path.join(this.projectRoot, 'paperless-ngx', 'export'),
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`创建目录: ${path.relative(this.projectRoot, dir)}`);
      }
    });
  }

  /**
   * 检查 Docker 安装
   */
  checkDockerInstallation() {
    try {
      const { execSync } = require('child_process');
      execSync('docker --version', { stdio: 'ignore' });
      execSync('docker-compose --version', { stdio: 'ignore' });
      this.log('Docker 和 Docker Compose 已安装');
      return true;
    } catch (error) {
      this.log('警告: Docker 或 Docker Compose 未安装，Paperless-NGX 可能无法运行', 'WARN');
      return false;
    }
  }

  /**
   * 初始化文档系统
   */
  async init() {
    this.log('初始化文档系统集成');

    try {
      // 1. 检查依赖
      await this.checkDeps();

      // 2. 检查 Paperless-NGX 是否已部署
      const paperlessDir = path.join(this.projectRoot, 'paperless-ngx');
      if (!fs.existsSync(paperlessDir)) {
        this.log('Paperless-NGX 未部署，开始部署...');
        await this.deployPaperless();
      }

      // 2. 检查 Paperless-NGX 服务状态
      const integration = new DocsIntegration();
      const status = await integration.checkPaperlessStatus();

      if (!status.running) {
        this.log('启动 Paperless-NGX 服务...');
        await this.startPaperlessService();
      }

      // 3. 执行初始文档扫描和导入
      this.log('执行初始文档扫描...');
      const report = await integration.generateReport();
      this.log(`发现 ${report.summary.totalDocuments} 个文档文件`);

      // 4. 导入现有文档
      this.log('导入现有文档到 Paperless-NGX...');
      const importResult = await integration.importAllDocuments();
      this.log(`文档导入完成: 成功 ${importResult.success}, 失败 ${importResult.failed}`);

      // 5. 创建系统状态文件
      const statusFile = path.join(this.projectRoot, 'logs', 'docs-system-status.json');
      const systemStatus = {
        initialized: true,
        initTime: new Date().toISOString(),
        paperlessRunning: status.running,
        documentsImported: importResult.success,
        lastUpdate: new Date().toISOString(),
      };
      fs.writeFileSync(statusFile, JSON.stringify(systemStatus, null, 2));

      this.log('文档系统初始化完成');
      console.log('\n=== 文档系统初始化完成 ===');
      console.log(`Paperless-NGX 状态: ${status.running ? '运行中' : '未运行'}`);
      console.log(`文档导入: ${importResult.success} 成功, ${importResult.failed} 失败`);
      console.log(`访问地址: ${this.config.paperless.url}`);
    } catch (error) {
      this.log(`初始化失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * 部署 Paperless-NGX
   */
  async deployPaperless() {
    try {
      const deployScript = path.join(this.projectRoot, 'scripts', 'deploy-paperless-local.ps1');
      if (fs.existsSync(deployScript)) {
        execSync(`powershell -ExecutionPolicy Bypass -File "${deployScript}"`, {
          cwd: this.projectRoot,
          stdio: 'inherit',
        });
      } else {
        throw new Error('部署脚本不存在');
      }
    } catch (error) {
      this.log(`Paperless-NGX 部署失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * 启动 Paperless-NGX 服务
   */
  async startPaperlessService() {
    try {
      const paperlessDir = path.join(this.projectRoot, 'paperless-ngx');
      execSync('docker-compose up -d', {
        cwd: paperlessDir,
        stdio: 'inherit',
      });

      // 等待服务启动
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (error) {
      this.log(`Paperless-NGX 服务启动失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * 启动文档系统
   */
  async start() {
    this.log('启动文档系统');

    try {
      // 检查是否已经在运行
      if (this.isDaemonRunning()) {
        this.log('文档同步守护进程已在运行');
        return;
      }

      // 启动 Paperless-NGX 服务
      if (this.config.paperless.autoStartService) {
        await this.startPaperlessService();
      }

      // 启动文档同步守护进程
      const daemonScript = path.join(__dirname, 'docs-sync-daemon.js');
      const daemon = spawn('node', [daemonScript, 'start'], {
        detached: true,
        stdio: 'ignore',
      });

      daemon.unref();

      // 保存进程 ID
      fs.writeFileSync(this.pidFile, daemon.pid.toString());

      this.log(`文档同步守护进程已启动 (PID: ${daemon.pid})`);
      console.log('文档系统已启动');
      console.log(`守护进程 PID: ${daemon.pid}`);
      console.log(`Paperless-NGX 访问地址: ${this.config.paperless.url}`);
    } catch (error) {
      this.log(`启动失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * 停止文档系统
   */
  async stop() {
    this.log('停止文档系统');

    try {
      // 停止守护进程
      if (this.isDaemonRunning()) {
        const pid = this.getDaemonPid();
        if (pid) {
          try {
            process.kill(pid, 'SIGTERM');
            this.log(`已发送停止信号给守护进程 (PID: ${pid})`);

            // 等待进程停止
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 强制杀死进程（如果还在运行）
            try {
              process.kill(pid, 'SIGKILL');
            } catch (e) {
              // 进程已经停止
            }
          } catch (error) {
            this.log(`停止守护进程失败: ${error.message}`, 'ERROR');
          }
        }

        // 删除 PID 文件
        if (fs.existsSync(this.pidFile)) {
          fs.unlinkSync(this.pidFile);
        }
      }

      this.log('文档系统已停止');
      console.log('文档系统已停止');
    } catch (error) {
      this.log(`停止失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * 重启文档系统
   */
  async restart() {
    this.log('重启文档系统');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.start();
  }

  /**
   * 获取系统状态
   */
  async getStatus() {
    const integration = new DocsIntegration();
    const paperlessStatus = await integration.checkPaperlessStatus();
    const daemonRunning = this.isDaemonRunning();

    const status = {
      system: {
        running: daemonRunning,
        pid: daemonRunning ? this.getDaemonPid() : null,
        uptime: daemonRunning ? this.getDaemonUptime() : null,
      },
      paperless: paperlessStatus,
      lastCheck: new Date().toISOString(),
    };

    return status;
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    this.log('执行系统健康检查');

    const health = {
      overall: 'healthy',
      checks: {},
      timestamp: new Date().toISOString(),
    };

    try {
      // 检查守护进程
      health.checks.daemon = {
        status: this.isDaemonRunning() ? 'running' : 'stopped',
        healthy: this.isDaemonRunning(),
      };

      // 检查 Paperless-NGX
      const integration = new DocsIntegration();
      const paperlessStatus = await integration.checkPaperlessStatus();
      health.checks.paperless = {
        status: paperlessStatus.running ? 'running' : 'stopped',
        healthy: paperlessStatus.running && paperlessStatus.healthy !== false,
      };

      // 检查目录
      const dirs = [
        path.join(this.projectRoot, 'paperless-ngx', 'consume'),
        path.join(this.projectRoot, 'paperless-ngx', 'export'),
        path.join(this.projectRoot, 'docs'),
      ];

      health.checks.directories = {
        status: 'checking',
        healthy: true,
        details: {},
      };

      dirs.forEach(dir => {
        const exists = fs.existsSync(dir);
        health.checks.directories.details[path.basename(dir)] = exists;
        if (!exists) {
          health.checks.directories.healthy = false;
        }
      });

      health.checks.directories.status = health.checks.directories.healthy ? 'ok' : 'error';

      // 计算总体健康状态
      const allHealthy = Object.values(health.checks).every(check => check.healthy);
      health.overall = allHealthy ? 'healthy' : 'unhealthy';
    } catch (error) {
      health.overall = 'error';
      health.error = error.message;
      this.log(`健康检查失败: ${error.message}`, 'ERROR');
    }

    return health;
  }

  /**
   * 生成系统报告
   */
  async generateReport() {
    this.log('生成系统报告');

    const integration = new DocsIntegration();
    const docsReport = await integration.generateReport();
    const systemStatus = await this.getStatus();
    const healthCheck = await this.healthCheck();

    const report = {
      system: {
        name: this.config.integration.name,
        version: this.config.integration.version,
        reportTime: new Date().toISOString(),
      },
      status: systemStatus,
      health: healthCheck,
      documentation: docsReport,
      configuration: this.config,
    };

    // 保存报告
    const reportFile = path.join(this.projectRoot, 'logs', 'docs-system-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // 打印摘要
    console.log('\n=== 文档系统报告 ===');
    console.log(`系统状态: ${healthCheck.overall}`);
    console.log(`守护进程: ${systemStatus.system.running ? '运行中' : '已停止'}`);
    console.log(`Paperless-NGX: ${systemStatus.paperless.running ? '运行中' : '已停止'}`);
    console.log(`文档总数: ${docsReport.summary.totalDocuments}`);
    console.log(`文档分类: ${docsReport.summary.categories}`);
    console.log(`报告文件: ${reportFile}`);

    return report;
  }

  /**
   * 检查守护进程是否运行
   */
  isDaemonRunning() {
    if (!fs.existsSync(this.pidFile)) {
      return false;
    }

    try {
      const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8'));
      process.kill(pid, 0); // 检查进程是否存在
      return true;
    } catch (error) {
      // 进程不存在，删除 PID 文件
      fs.unlinkSync(this.pidFile);
      return false;
    }
  }

  /**
   * 获取守护进程 PID
   */
  getDaemonPid() {
    if (!fs.existsSync(this.pidFile)) {
      return null;
    }

    try {
      return parseInt(fs.readFileSync(this.pidFile, 'utf8'));
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取守护进程运行时间
   */
  getDaemonUptime() {
    if (!fs.existsSync(this.pidFile)) {
      return null;
    }

    try {
      const stat = fs.statSync(this.pidFile);
      const startTime = stat.mtime;
      const uptime = Date.now() - startTime.getTime();

      const hours = Math.floor(uptime / (1000 * 60 * 60));
      const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

      return `${hours}h ${minutes}m`;
    } catch (error) {
      return null;
    }
  }
}

// 命令行接口
if (require.main === module) {
  const controller = new DocsSystemController();

  const command = process.argv[2] || 'help';

  async function runCommand() {
    try {
      switch (command) {
        case 'init':
          await controller.init();
          break;

        case 'start':
          await controller.start();
          break;

        case 'stop':
          await controller.stop();
          break;

        case 'restart':
          await controller.restart();
          break;

        case 'status':
          const status = await controller.getStatus();
          console.log(JSON.stringify(status, null, 2));
          break;

        case 'health':
          const health = await controller.healthCheck();
          console.log(JSON.stringify(health, null, 2));
          break;

        case 'report':
          await controller.generateReport();
          break;

        case 'check-deps':
          await controller.checkDeps();
          break;

        case 'help':
        default:
          console.log('文档系统主控制器');
          console.log('');
          console.log('用法: node docs-system-controller.js <command>');
          console.log('');
          console.log('命令:');
          console.log('  init      - 初始化文档系统集成');
          console.log('  start     - 启动文档系统');
          console.log('  stop      - 停止文档系统');
          console.log('  restart   - 重启文档系统');
          console.log('  status    - 查看系统状态');
          console.log('  health    - 执行健康检查');
          console.log('  report    - 生成系统报告');
          console.log('  check-deps - 检查系统依赖');
          console.log('  help      - 显示此帮助信息');
      }
    } catch (error) {
      console.error(`命令执行失败: ${error.message}`);
      process.exit(1);
    }
  }

  runCommand();
}

module.exports = DocsSystemController;
