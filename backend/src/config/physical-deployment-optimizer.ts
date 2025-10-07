// 用途：物理机部署优化，PM2配置和系统调优
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 11:30:00

import { createMasterConfiguration } from './unified-master.config';
import os from 'os';

// Create configuration instance
const masterConfig = createMasterConfiguration();

export class PhysicalDeploymentOptimizer {
  /**
   * 验证物理机部署配置
   */
  static validateDeploymentConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 系统资源检查
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpus = os.cpus().length;

    if (totalMemory < 8 * 1024 * 1024 * 1024) {
      // 8GB
      warnings.push('物理机内存不足8GB，可能影响性能');
    }

    if (freeMemory < 2 * 1024 * 1024 * 1024) {
      // 2GB
      warnings.push('可用内存不足2GB，建议释放内存');
    }

    if (cpus < 4) {
      warnings.push('CPU核心数少于4个，可能成为性能瓶颈');
    }

    // PM2配置检查
    if (!process.env.PM2_HOME && masterConfig.app.env === 'production') {
      warnings.push('生产环境建议设置PM2_HOME环境变量');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 获取物理机优化配置
   */
  static getDeploymentOptimizationConfig() {
    const cpus = os.cpus().length;
    const totalMemory = os.totalmem();
    const availableMemory = Math.floor(totalMemory * 0.7); // 使用70%内存

    return {
      // PM2集群配置
      pm2: {
        instances: Math.max(1, Math.floor(cpus * 0.8)), // 使用80% CPU核心
        exec_mode: 'cluster',
        max_memory_restart: `${Math.floor(availableMemory / (1024 * 1024))}M`,
        node_args: [
          '--max-old-space-size=' + Math.floor((availableMemory * 0.6) / (1024 * 1024)),
          '--max-semi-space-size=128',
          '--optimize-for-size',
          '--gc-interval=100',
        ],
        env: {
          NODE_ENV: masterConfig.app.env,
          UV_THREADPOOL_SIZE: Math.max(4, cpus * 2),
          NODE_OPTIONS: '--max-http-header-size=16384',
        },
        error_file: './logs/pm2-err.log',
        out_file: './logs/pm2-out.log',
        log_file: './logs/pm2-combined.log',
        time: true,
        restart_delay: 3000,
        max_restarts: 10,
        min_uptime: '10s',
        listen_timeout: 5000,
        kill_timeout: 5000,
      },

      // 系统优化配置
      system: {
        // 文件描述符限制
        fileDescriptors: {
          softLimit: 65536,
          hardLimit: 65536,
        },

        // 网络优化
        network: {
          tcpKeepaliveTime: 7200,
          tcpKeepaliveIntvl: 75,
          tcpKeepaliveProbes: 9,
          tcpMaxSynBacklog: 1024,
          somaxconn: 1024,
        },

        // 内存优化
        memory: {
          swappiness: 10,
          dirtyRatio: 10,
          dirtyBackgroundRatio: 5,
        },
      },

      // 监控配置
      monitoring: {
        enabled: true,
        interval: 30000, // 30秒
        metrics: ['cpu', 'memory', 'event_loop', 'active_handles', 'active_requests'],
        alerts: {
          memory: 0.8, // 80%内存使用告警
          cpu: 0.9, // 90% CPU使用告警
          eventLoopDelay: 100, // 100ms事件循环延迟告警
        },
      },
    };
  }

  /**
   * 生成部署优化脚本
   */
  static generateDeploymentScripts() {
    const config = this.getDeploymentOptimizationConfig();

    return {
      // 系统优化脚本
      systemOptimization: `
#!/bin/bash
# 系统优化脚本

# 设置文件描述符限制
echo "* soft nofile ${config.system.fileDescriptors.softLimit}" >> /etc/security/limits.conf
echo "* hard nofile ${config.system.fileDescriptors.hardLimit}" >> /etc/security/limits.conf

# 网络优化
echo "net.ipv4.tcp_keepalive_time = ${config.system.network.tcpKeepaliveTime}" >> /etc/sysctl.conf
echo "net.ipv4.tcp_keepalive_intvl = ${config.system.network.tcpKeepaliveIntvl}" >> /etc/sysctl.conf
echo "net.ipv4.tcp_keepalive_probes = ${config.system.network.tcpKeepaliveProbes}" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = ${config.system.network.tcpMaxSynBacklog}" >> /etc/sysctl.conf
echo "net.core.somaxconn = ${config.system.network.somaxconn}" >> /etc/sysctl.conf

# 内存优化
echo "vm.swappiness = ${config.system.memory.swappiness}" >> /etc/sysctl.conf
echo "vm.dirty_ratio = ${config.system.memory.dirtyRatio}" >> /etc/sysctl.conf
echo "vm.dirty_background_ratio = ${config.system.memory.dirtyBackgroundRatio}" >> /etc/sysctl.conf

# 应用配置
sysctl -p
      `.trim(),

      // PM2启动脚本
      pm2StartScript: `
#!/bin/bash
# PM2启动脚本

export NODE_ENV=${masterConfig.app.env}
export UV_THREADPOOL_SIZE=${config.pm2.env.UV_THREADPOOL_SIZE}
export PM2_HOME=/home/\${USER}/.pm2

# 创建日志目录
mkdir -p ./logs

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "应用启动完成，实例数: ${config.pm2.instances}"
      `.trim(),
    };
  }

  /**
   * 生成部署优化报告
   */
  static generateDeploymentReport(): string {
    const validation = this.validateDeploymentConfig();
    const optimization = this.getDeploymentOptimizationConfig();
    const scripts = this.generateDeploymentScripts();

    let report = `📊 物理机部署优化报告 (环境: ${masterConfig.app.env})\n\n`;

    if (validation.errors.length > 0) {
      report += '❌ 错误:\n';
      validation.errors.forEach(error => (report += `  - ${error}\n`));
      report += '\n';
    }

    if (validation.warnings.length > 0) {
      report += '⚠️  警告:\n';
      validation.warnings.forEach(warning => (report += `  - ${warning}\n`));
      report += '\n';
    }

    report += '🔧 系统资源:\n';
    report += `  - CPU核心: ${os.cpus().length}\n`;
    report += `  - 总内存: ${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(1)}GB\n`;
    report += `  - 可用内存: ${(os.freemem() / (1024 * 1024 * 1024)).toFixed(1)}GB\n`;

    report += '\n🚀 PM2集群配置:\n';
    report += `  - 实例数: ${optimization.pm2.instances}\n`;
    report += `  - 执行模式: ${optimization.pm2.exec_mode}\n`;
    report += `  - 内存限制: ${optimization.pm2.max_memory_restart}\n`;
    report += `  - 线程池大小: ${optimization.pm2.env.UV_THREADPOOL_SIZE}\n`;

    report += '\n💡 生产环境部署建议:\n';
    report += '  - 使用负载均衡器分发流量\n';
    report += '  - 配置健康检查和自动恢复\n';
    report += '  - 设置监控和告警系统\n';
    report += '  - 定期备份应用和数据\n';
    report += '  - 实施安全加固措施\n';

    return report;
  }
}
