import { Injectable, Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

/**
 * 队列处理器 - 统一的队列处理逻辑
 */
@Injectable()
@Processor('default')
export class QueueProcessorService {
  private readonly logger = new Logger(QueueProcessorService.name);

  /**
   * 处理订单相关任务
   */
  @Process('order')
  async processOrderJob(job: Job) {
    const { type, data } = job.data;

    try {
      this.logger.log(`处理订单任务: ${type}, ID: ${job.id}`);

      switch (type) {
        case 'create':
          await this.handleOrderCreate(data);
          break;
        case 'payment':
          await this.handleOrderPayment(data);
          break;
        case 'cancel':
          await this.handleOrderCancel(data);
          break;
        default:
          throw new Error(`未知的订单任务类型: ${type}`);
      }

      this.logger.log(`订单任务完成: ${type}, ID: ${job.id}`);
    } catch (error) {
      this.logger.error(`订单任务失败: ${type}, ID: ${job.id}`, error.stack);
      throw error; // 重新抛出错误以触发重试机制
    }
  }

  /**
   * 处理产品相关任务
   */
  @Process('product')
  async processProductJob(job: Job) {
    const { type, data } = job.data;

    try {
      this.logger.log(`处理产品任务: ${type}, ID: ${job.id}`);

      switch (type) {
        case 'sync':
          await this.handleProductSync(data);
          break;
        case 'index':
          await this.handleProductIndex(data);
          break;
        case 'cache-refresh':
          await this.handleProductCacheRefresh(data);
          break;
        default:
          throw new Error(`未知的产品任务类型: ${type}`);
      }

      this.logger.log(`产品任务完成: ${type}, ID: ${job.id}`);
    } catch (error) {
      this.logger.error(`产品任务失败: ${type}, ID: ${job.id}`, error.stack);
      throw error;
    }
  }

  /**
   * 处理通知任务
   */
  @Process('notification')
  async processNotificationJob(job: Job) {
    const { type, data } = job.data;

    try {
      this.logger.log(`处理通知任务: ${type}, ID: ${job.id}`);

      switch (type) {
        case 'email':
          await this.handleEmailNotification(data);
          break;
        case 'sms':
          await this.handleSmsNotification(data);
          break;
        case 'push':
          await this.handlePushNotification(data);
          break;
        default:
          throw new Error(`未知的通知任务类型: ${type}`);
      }

      this.logger.log(`通知任务完成: ${type}, ID: ${job.id}`);
    } catch (error) {
      this.logger.error(`通知任务失败: ${type}, ID: ${job.id}`, error.stack);
      throw error;
    }
  }

  // 订单处理方法
  private async handleOrderCreate(data: any) {
    // 实现订单创建逻辑
    await this.simulateAsyncWork(1000);
  }

  private async handleOrderPayment(data: any) {
    // 实现订单支付逻辑
    await this.simulateAsyncWork(2000);
  }

  private async handleOrderCancel(data: any) {
    // 实现订单取消逻辑
    await this.simulateAsyncWork(500);
  }

  // 产品处理方法
  private async handleProductSync(data: any) {
    // 实现产品同步逻辑
    await this.simulateAsyncWork(3000);
  }

  private async handleProductIndex(data: any) {
    // 实现产品索引逻辑
    await this.simulateAsyncWork(1500);
  }

  private async handleProductCacheRefresh(data: any) {
    // 实现产品缓存刷新逻辑
    await this.simulateAsyncWork(800);
  }

  // 通知处理方法
  private async handleEmailNotification(data: any) {
    // 实现邮件通知逻辑
    await this.simulateAsyncWork(2000);
  }

  private async handleSmsNotification(data: any) {
    // 实现短信通知逻辑
    await this.simulateAsyncWork(1000);
  }

  private async handlePushNotification(data: any) {
    // 实现推送通知逻辑
    await this.simulateAsyncWork(500);
  }

  // 模拟异步工作
  private async simulateAsyncWork(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 队列配置服务
 */
@Injectable()
export class QueueConfigService {
  private readonly logger = new Logger(QueueConfigService.name);

  /**
   * 获取队列配置
   */
  getQueueConfig(queueName: string) {
    const baseConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.QUEUE_REDIS_DB || '3'),
      },
      defaultJobOptions: {
        removeOnComplete: 100, // 保留最近100个完成的任务
        removeOnFail: 50, // 保留最近50个失败的任务
        attempts: 3, // 重试3次
        backoff: {
          type: 'exponential',
          delay: 2000, // 初始延迟2秒
        },
      },
    };

    // 根据队列类型调整配置
    switch (queueName) {
      case 'order':
        return {
          ...baseConfig,
          defaultJobOptions: {
            ...baseConfig.defaultJobOptions,
            attempts: 5, // 订单任务重试5次
            priority: 10, // 高优先级
          },
        };

      case 'notification':
        return {
          ...baseConfig,
          defaultJobOptions: {
            ...baseConfig.defaultJobOptions,
            attempts: 2, // 通知任务重试2次
            delay: 1000, // 延迟1秒执行
          },
        };

      case 'product':
        return {
          ...baseConfig,
          defaultJobOptions: {
            ...baseConfig.defaultJobOptions,
            attempts: 3,
            priority: 5, // 中等优先级
          },
        };

      default:
        return baseConfig;
    }
  }

  /**
   * 获取死信队列配置
   */
  getDLQConfig() {
    return {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.DLQ_REDIS_DB || '4'),
      },
      defaultJobOptions: {
        removeOnComplete: false, // 死信队列不自动删除
        removeOnFail: false,
        attempts: 1, // 死信队列不重试
      },
    };
  }
}
