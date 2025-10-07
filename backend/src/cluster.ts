// 用途：集群启动文件，支持多进程处理高并发请求
// 依赖文件：main.ts, performance.config.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:28:00

import * as cluster from 'cluster';
import * as os from 'os';
import * as net from 'net';
import { Logger } from '@nestjs/common';

const logger = new Logger('Cluster');
const defaultWorkers = parseInt(process.env.CLUSTER_WORKERS || '') || 6;
const numCPUs = os.cpus().length;
const workersCount = Math.min(defaultWorkers, numCPUs) || defaultWorkers;
const stickyEnabled = (process.env.CLUSTER_STICKY || 'false') === 'true';
const port = parseInt(process.env.PORT || process.env.NODE_PORT || '3000', 10);

// Node.js 版本兼容性处理
const clusterModule = cluster as any;
const isPrimary = clusterModule.isPrimary || clusterModule.isMaster;

if (isPrimary) {
  logger.log(`主进程启动，PID: ${process.pid}`);
  logger.log(`计划启动 ${workersCount} 个工作进程，sticky=${stickyEnabled}，端口=${port}`);

  const workers: any[] = [];
  // 创建工作进程
  for (let i = 0; i < workersCount; i++) {
    const w = clusterModule.fork({ ...process.env, CLUSTER_MODE: 'true' });
    workers.push(w);
  }

  // 启用RR调度以提升公平性
  if (clusterModule.SCHED_RR) {
    clusterModule.schedulingPolicy = clusterModule.SCHED_RR;
  }

  // 若启用粘性连接（适用于WebSocket），在主进程使用net服务器进行连接分发
  if (stickyEnabled) {
    // 一致性哈希实现，确保当工作进程数量变化时，只有部分连接需要重新分配
    class ConsistentHash {
      private ring: number[] = [];
      private ringMap: { [key: number]: any } = {};
      private virtualNodes = 150; // 每个物理节点的虚拟节点数，提高分布均匀性

      constructor(private workers: any[]) {
        this.generateRing();
      }

      // 生成哈希环
      private generateRing() {
        this.ring = [];
        this.ringMap = {};

        for (let i = 0; i < this.workers.length; i++) {
          for (let j = 0; j < this.virtualNodes; j++) {
            const virtualNodeKey = `${i}-${j}`;
            const hash = this.hash(virtualNodeKey);
            this.ring.push(hash);
            this.ringMap[hash] = this.workers[i];
          }
        }

        // 排序哈希环
        this.ring.sort((a, b) => a - b);
      }

      // 哈希函数
      private hash(key: string): number {
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
          const char = key.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash);
      }

      // 获取目标工作进程
      getWorker(key: string): any {
        if (this.workers.length === 0) return null;
        if (this.workers.length === 1) return this.workers[0];

        const hash = this.hash(key);

        // 在环上找到第一个大于等于hash的节点
        for (let i = 0; i < this.ring.length; i++) {
          if (this.ring[i] >= hash) {
            return this.ringMap[this.ring[i]];
          }
        }

        // 如果没有找到，则返回环上的第一个节点
        return this.ringMap[this.ring[0]];
      }

      // 添加工作进程
      addWorker(worker: any) {
        this.workers.push(worker);
        this.generateRing();
      }

      // 移除工作进程
      removeWorker(worker: any) {
        const index = this.workers.indexOf(worker);
        if (index !== -1) {
          this.workers.splice(index, 1);
          this.generateRing();
        }
      }
    }

    const consistentHash = new ConsistentHash(workers);

    const server = net.createServer({ pauseOnConnect: true }, socket => {
      // 使用一致性哈希算法选择工作进程，基于客户端IP
      const ip = socket.remoteAddress || '127.0.0.1';
      const worker = consistentHash.getWorker(ip);

      if (worker) {
        worker.send('sticky-connection', socket);
      } else {
        socket.destroy();
      }
    });

    server.listen(port, () => {
      logger.log(`主进程粘性连接服务器已监听端口 ${port}`);
      logger.log(`使用一致性哈希算法分配连接，支持工作进程动态变化`);
    });
  }

  // 监听工作进程退出事件
  clusterModule.on('exit', (worker: any, code: number, signal: string) => {
    logger.warn(`工作进程 ${worker.process.pid} 退出，信号: ${signal}，代码: ${code}`);

    // 如果不是正常退出，重启工作进程
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      logger.log(`重启工作进程...`);
      clusterModule.fork();
    }
  });

  // 优雅关闭处理
  process.on('SIGTERM', () => {
    logger.log('收到 SIGTERM 信号，开始优雅关闭...');

    // 通知所有工作进程关闭
    const workers = clusterModule.workers || {};
    for (const id in workers) {
      workers[id]?.kill('SIGTERM');
    }

    // 等待所有工作进程退出
    setTimeout(() => {
      logger.log('所有工作进程已关闭，主进程退出');
      process.exit(0);
    }, 5000);
  });

  // 进程异常处理
  process.on('uncaughtException', error => {
    logger.error('主进程未捕获异常:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('主进程未处理的 Promise 拒绝:', reason);
    process.exit(1);
  });
} else {
  // 工作进程启动应用
  import('./main').then(({ bootstrap }) => {
    bootstrap().catch(error => {
      logger.error('工作进程启动失败:', error);
      process.exit(1);
    });
  });

  // 工作进程异常处理
  process.on('uncaughtException', error => {
    logger.error(`工作进程 ${process.pid} 未捕获异常:`, error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`工作进程 ${process.pid} 未处理的 Promise 拒绝:`, reason);
    process.exit(1);
  });
}
