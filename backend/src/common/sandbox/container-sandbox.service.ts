import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';

/**
 * 容器沙箱配置
 */
export interface ContainerSandboxConfig {
  /**
   * 容器镜像
   */
  image: string;

  /**
   * 容器名称前缀
   */
  namePrefix?: string;

  /**
   * 资源限制
   */
  resources?: {
    /**
     * 内存限制（MB）
     */
    memory?: number;

    /**
     * CPU限制（核数）
     */
    cpu?: number;

    /**
     * 磁盘空间限制（MB）
     */
    disk?: number;
  };

  /**
   * 网络配置
   */
  network?: {
    /**
     * 是否禁用网络
     */
    disabled?: boolean;

    /**
     * 允许的主机名
     */
    allowedHostnames?: string[];

    /**
     * 允许的IP地址
     */
    allowedIPs?: string[];
  };

  /**
   * 安全配置
   */
  security?: {
    /**
     * 是否以非root用户运行
     */
    nonRoot?: boolean;

    /**
     * 只读文件系统
     */
    readOnly?: boolean;

    /**
     * 允许的设备
     */
    allowedDevices?: string[];

    /**
     * 禁用的能力
     */
    dropCapabilities?: string[];
  };

  /**
   * 超时配置
   */
  timeout?: {
    /**
     * 执行超时（毫秒）
     */
    execution?: number;

    /**
     * 启动超时（毫秒）
     */
    startup?: number;
  };

  /**
   * 环境变量
   */
  env?: Record<string, string>;

  /**
   * 工作目录
   */
  workdir?: string;

  /**
   * 卷挂载
   */
  volumes?: {
    /**
     * 主机路径
     */
    host: string;

    /**
     * 容器路径
     */
    container: string;

    /**
     * 是否只读
     */
    readOnly?: boolean;
  }[];
}

/**
 * 容器执行结果
 */
export interface ContainerExecutionResult {
  /**
   * 退出代码
   */
  exitCode: number;

  /**
   * 标准输出
   */
  stdout: string;

  /**
   * 标准错误
   */
  stderr: string;

  /**
   * 执行时间（毫秒）
   */
  duration: number;

  /**
   * 内存使用峰值（MB）
   */
  memoryPeak?: number;

  /**
   * CPU使用峰值（百分比）
   */
  cpuPeak?: number;
}

/**
 * 容器实例
 */
export interface ContainerInstance {
  /**
   * 容器ID
   */
  id: string;

  /**
   * 容器名称
   */
  name: string;

  /**
   * 容器状态
   */
  status: 'running' | 'stopped' | 'paused' | 'exited';

  /**
   * 执行命令
   */
  exec(command: string, args?: string[]): Promise<ContainerExecutionResult>;

  /**
   * 停止容器
   */
  stop(): Promise<void>;

  /**
   * 删除容器
   */
  remove(): Promise<void>;

  /**
   * 获取容器日志
   */
  logs(): Promise<string>;

  /**
   * 获取容器统计信息
   */
  stats(): Promise<{
    memory: {
      usage: number;
      limit: number;
      peak: number;
    };
    cpu: {
      usage: number;
      limit: number;
      peak: number;
    };
    network?: {
      rx: number;
      tx: number;
    };
    disk?: {
      read: number;
      write: number;
    };
  }>;
}

/**
 * 基于Docker的容器沙箱实现
 */
@Injectable()
export class ContainerSandboxService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(ContainerSandboxService.name);
  private readonly containers = new Map<
    string,
    { container: ContainerInstance; timeout?: NodeJS.Timeout }
  >();
  private readonly isDockerAvailable: boolean;

  constructor() {
    super();
    this.isDockerAvailable = this.checkDockerAvailability();
  }

  /**
   * 检查Docker是否可用
   */
  private checkDockerAvailability(): boolean {
    try {
      // 简单检查：尝试执行docker --version
      const { spawnSync } = require('child_process');
      const result = spawnSync('docker', ['--version'], { encoding: 'utf8' });
      return result.status === 0;
    } catch (error) {
      this.logger.error('Docker is not available:', error.message);
      return false;
    }
  }

  /**
   * 创建容器沙箱
   */
  async createContainer(config: ContainerSandboxConfig): Promise<ContainerInstance> {
    if (!this.isDockerAvailable) {
      throw new Error('Docker is not available. Please install Docker to use container sandbox.');
    }

    const containerId = this.generateContainerId();
    const containerName = `${config.namePrefix || 'sandbox'}-${containerId}`;

    this.logger.debug(`Creating container: ${containerName}`);

    try {
      // 构建Docker命令
      const dockerArgs = this.buildDockerRunArgs(config, containerName);

      // 创建容器但不启动
      const createResult = await this.executeDockerCommand('create', dockerArgs);

      if (createResult.exitCode !== 0) {
        throw new Error(`Failed to create container: ${createResult.stderr}`);
      }

      // 创建容器实例
      const container = this.createContainerInstance(containerId, containerName, config);

      // 存储容器引用
      this.containers.set(containerId, { container });

      // 设置超时
      if (config.timeout?.execution) {
        const timeout = setTimeout(async () => {
          try {
            this.logger.warn(`Container ${containerName} execution timeout, stopping...`);
            await container.stop();
          } catch (error) {
            this.logger.error(`Error stopping timed out container ${containerName}:`, error);
          }
        }, config.timeout.execution);

        this.containers.set(containerId, { container, timeout });
      }

      this.emit('containerCreated', { id: containerId, name: containerName });

      return container;
    } catch (error) {
      this.logger.error(`Error creating container ${containerName}:`, error);
      throw error;
    }
  }

  /**
   * 构建Docker运行参数
   */
  private buildDockerRunArgs(config: ContainerSandboxConfig, containerName: string): string[] {
    const args = [
      '--name',
      containerName,
      '--rm', // 容器退出后自动删除
    ];

    // 资源限制
    if (config.resources) {
      if (config.resources.memory) {
        args.push('--memory', `${config.resources.memory}m`);
      }

      if (config.resources.cpu) {
        args.push('--cpus', config.resources.cpu.toString());
      }

      if (config.resources.disk) {
        args.push('--storage-opt', `size=${config.resources.disk}m`);
      }
    }

    // 网络配置
    if (config.network) {
      if (config.network.disabled) {
        args.push('--network', 'none');
      }

      if (config.network.allowedHostnames || config.network.allowedIPs) {
        // 使用DNS配置限制网络访问
        const dnsConfig: string[] = [];

        if (config.network.allowedHostnames) {
          dnsConfig.push(...config.network.allowedHostnames);
        }

        if (config.network.allowedIPs) {
          dnsConfig.push(...config.network.allowedIPs);
        }

        if (dnsConfig.length > 0) {
          args.push('--dns', dnsConfig.join(','));
        }
      }
    }

    // 安全配置
    if (config.security) {
      if (config.security.nonRoot) {
        args.push('--user', '1000:1000');
      }

      if (config.security.readOnly) {
        args.push('--read-only');
      }

      if (config.security.dropCapabilities) {
        args.push('--cap-drop', ...config.security.dropCapabilities);
      }

      if (config.security.allowedDevices) {
        args.push('--device', ...config.security.allowedDevices);
      }
    }

    // 环境变量
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        args.push('--env', `${key}=${value}`);
      }
    }

    // 工作目录
    if (config.workdir) {
      args.push('--workdir', config.workdir);
    }

    // 卷挂载
    if (config.volumes) {
      for (const volume of config.volumes) {
        const mountOption = volume.readOnly ? ':ro' : '';
        args.push('--volume', `${volume.host}:${volume.container}${mountOption}`);
      }
    }

    // 镜像
    args.push(config.image);

    // 默认命令（保持容器运行）
    args.push('tail', '-f', '/dev/null');

    return args;
  }

  /**
   * 创建容器实例
   */
  private createContainerInstance(
    containerId: string,
    containerName: string,
    config: ContainerSandboxConfig,
  ): ContainerInstance {
    let status: 'running' | 'stopped' | 'paused' | 'exited' = 'stopped';
    let startTime = 0;

    return {
      id: containerId,
      name: containerName,
      get status() {
        return status;
      },

      async exec(command: string, args: string[] = []): Promise<ContainerExecutionResult> {
        this.logger.debug(
          `Executing command in container ${containerName}: ${command} ${args.join(' ')}`,
        );

        const startTime = Date.now();

        try {
          // 启动容器（如果尚未启动）
          if (status === 'stopped') {
            await this.executeDockerCommand('start', [containerName]);
            status = 'running';
          }

          // 执行命令
          const execArgs = ['--interactive', containerName, command, ...args];

          const result = await this.executeDockerCommand('exec', execArgs, {
            timeout: config.timeout?.execution || 30000,
          });

          const duration = Date.now() - startTime;

          // 获取容器统计信息
          let stats;
          try {
            stats = await this.getContainerStats(containerName);
          } catch (error) {
            this.logger.warn(`Failed to get container stats: ${error.message}`);
          }

          return {
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
            duration,
            memoryPeak: stats?.memory.peak,
            cpuPeak: stats?.cpu.peak,
          };
        } catch (error) {
          const duration = Date.now() - startTime;

          if (error.message.includes('timeout')) {
            throw new Error(`Command execution timeout after ${duration}ms: ${command}`);
          }

          throw new Error(`Command execution failed: ${error.message}`);
        }
      },

      async stop(): Promise<void> {
        if (status === 'stopped') {
          return;
        }

        this.logger.debug(`Stopping container: ${containerName}`);

        try {
          await this.executeDockerCommand('stop', [containerName]);
          status = 'stopped';
        } catch (error) {
          throw new Error(`Failed to stop container: ${error.message}`);
        }
      },

      async remove(): Promise<void> {
        this.logger.debug(`Removing container: ${containerName}`);

        try {
          // 先停止容器
          if (status === 'running') {
            await this.stop();
          }

          // 删除容器
          await this.executeDockerCommand('rm', [containerName]);

          // 清理引用
          this.containers.delete(containerId);
        } catch (error) {
          throw new Error(`Failed to remove container: ${error.message}`);
        }
      },

      async logs(): Promise<string> {
        try {
          const result = await this.executeDockerCommand('logs', [containerName]);
          return result.stdout;
        } catch (error) {
          throw new Error(`Failed to get container logs: ${error.message}`);
        }
      },

      async stats(): Promise<{
        memory: { usage: number; limit: number; peak: number };
        cpu: { usage: number; limit: number; peak: number };
        network?: { rx: number; tx: number };
        disk?: { read: number; write: number };
      }> {
        return this.getContainerStats(containerName);
      },
    };
  }

  /**
   * 获取容器统计信息
   */
  private async getContainerStats(containerName: string): Promise<{
    memory: { usage: number; limit: number; peak: number };
    cpu: { usage: number; limit: number; peak: number };
    network?: { rx: number; tx: number };
    disk?: { read: number; write: number };
  }> {
    try {
      const result = await this.executeDockerCommand('stats', [
        '--no-stream',
        '--format',
        'json',
        containerName,
      ]);

      if (result.exitCode !== 0 || !result.stdout) {
        throw new Error(`Failed to get container stats: ${result.stderr}`);
      }

      const stats = JSON.parse(result.stdout)[0];

      return {
        memory: {
          usage: Math.round(stats.MemoryStats.usage / 1024 / 1024), // MB
          limit: Math.round(stats.MemoryStats.limit / 1024 / 1024), // MB
          peak: Math.round((stats.MemoryStats.max_usage || 0) / 1024 / 1024), // MB
        },
        cpu: {
          usage: Math.round(stats.CPUPercpuUsage || 0), // 百分比
          limit: 100, // 百分比
          peak: Math.round(stats.CPUStats.system_usage || 0), // 百分比
        },
        network: stats.Networks
          ? {
              rx: Math.round(
                Object.values(stats.Networks as Record<string, any>).reduce(
                  (sum, net) => sum + (net.rx_bytes || 0),
                  0,
                ) / 1024,
              ), // KB
              tx: Math.round(
                Object.values(stats.Networks as Record<string, any>).reduce(
                  (sum, net) => sum + (net.tx_bytes || 0),
                  0,
                ) / 1024,
              ), // KB
            }
          : undefined,
        disk: stats.BlockIO
          ? {
              read: Math.round((stats.BlockIO.ioread_bytes || 0) / 1024), // KB
              write: Math.round((stats.BlockIO.iowrite_bytes || 0) / 1024), // KB
            }
          : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to parse container stats: ${error.message}`);
    }
  }

  /**
   * 执行Docker命令
   */
  private executeDockerCommand(
    command: string,
    args: string[],
    options: { timeout?: number } = {},
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const docker = spawn('docker', [command, ...args]);

      let stdout = '';
      let stderr = '';

      docker.stdout.on('data', data => {
        stdout += data.toString();
      });

      docker.stderr.on('data', data => {
        stderr += data.toString();
      });

      docker.on('close', code => {
        resolve({ exitCode: code || 0, stdout, stderr });
      });

      docker.on('error', error => {
        reject(error);
      });

      // 设置超时
      if (options.timeout) {
        const timeout = setTimeout(() => {
          docker.kill('SIGKILL');
          reject(new Error(`Docker command timeout: ${command} ${args.join(' ')}`));
        }, options.timeout);

        docker.on('close', () => {
          clearTimeout(timeout);
        });
      }
    });
  }

  /**
   * 生成容器ID
   */
  private generateContainerId(): string {
    return randomBytes(8).toString('hex');
  }

  /**
   * 列出所有容器
   */
  async listContainers(): Promise<
    Array<{ id: string; name: string; status: string; image: string }>
  > {
    if (!this.isDockerAvailable) {
      return [];
    }

    try {
      const result = await this.executeDockerCommand('ps', [
        '-a',
        '--format',
        '{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}',
      ]);

      if (result.exitCode !== 0) {
        return [];
      }

      const lines = result.stdout
        .trim()
        .split('\n')
        .filter(line => line);

      return lines.map(line => {
        const [id, name, status, image] = line.split('\t');
        return { id, name, status, image };
      });
    } catch (error) {
      this.logger.error('Failed to list containers:', error);
      return [];
    }
  }

  /**
   * 清理所有容器
   */
  async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up all containers...');

    // 停止并删除所有管理的容器
    for (const [containerId, { container, timeout }] of this.containers.entries()) {
      try {
        // 清除超时
        if (timeout) {
          clearTimeout(timeout);
        }

        // 停止并删除容器
        await container.remove();
      } catch (error) {
        this.logger.error(`Error cleaning up container ${containerId}:`, error);
      }
    }

    this.containers.clear();
    this.emit('cleanupComplete');
  }

  /**
   * 模块销毁时的清理
   */
  async onModuleDestroy(): Promise<void> {
    await this.cleanup();
  }
}
