import { Injectable, Logger } from '@nestjs/common';
import { OpenObserveConfigService } from '../config/openobserve-config.service';
import { MetricsCollector } from './metrics-collector';
import { OpenObserveError } from './error-handler';

/**
 * 批量写入配置
 */
export interface BatchConfig {
  batchSize: number;
  maxWaitTimeMs: number;
  maxRetries: number;
  retryDelayMs: number;
  compressionEnabled: boolean;
}

/**
 * 批量项目
 */
export interface BatchItem {
  id: string;
  stream: string;
  data: any[];
  timestamp: number;
  retryCount?: number;
  resolve?: (value: any) => void;
  reject?: (reason: any) => void;
}

/**
 * 批量写入器
 * 按配置切片批量提交，减少单请求负载与失败影响
 */
@Injectable()
export class BatchWriter {
  private readonly logger = new Logger(BatchWriter.name);
  private readonly configService: OpenObserveConfigService;
  private readonly metricsCollector: MetricsCollector;
  private readonly config: BatchConfig;
  
  private pendingItems: BatchItem[] = [];
  private batchesInProgress: Map<string, Promise<any>> = new Map();
  private flushTimer?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(
    configService: OpenObserveConfigService,
    metricsCollector: MetricsCollector
  ) {
    this.configService = configService;
    this.metricsCollector = metricsCollector;
    
    // 从配置服务获取批量配置
    const openObserveConfig = configService.getConfig();
    this.config = {
      batchSize: openObserveConfig.batchSize || 100,
      maxWaitTimeMs: 5000, // 5秒
      maxRetries: openObserveConfig.retryCount || 3,
      retryDelayMs: openObserveConfig.retryDelay || 1000,
      compressionEnabled: openObserveConfig.compression !== false,
    };
    
    this.logger.debug(`BatchWriter initialized with config: ${JSON.stringify(this.config)}`);
    
    // 注册进程退出处理
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
    process.on('beforeExit', () => this.shutdown());
  }

  /**
   * 添加数据到批量队列
   */
  async addData(stream: string, data: any[]): Promise<any> {
    if (this.isShuttingDown) {
      throw new OpenObserveError('BatchWriter is shutting down', 'BATCH_WRITER_SHUTTING_DOWN');
    }
    
    if (!data || data.length === 0) {
      return { success: true, message: 'No data to process' };
    }
    
    const itemId = this.generateItemId();
    const item: BatchItem = {
      id: itemId,
      stream,
      data: [...data], // 创建数据副本
      timestamp: Date.now(),
    };
    
    return new Promise((resolve, reject) => {
      item.resolve = resolve;
      item.reject = reject;
      
      this.pendingItems.push(item);
      
      // 记录指标
      this.metricsCollector.recordMetric('batch_items_added', 1, {
        stream,
        item_count: data.length.toString(),
      });
      
      // 检查是否需要立即处理
      if (this.pendingItems.length >= this.config.batchSize) {
        this.processBatch();
      } else if (!this.flushTimer) {
        // 设置定时器，确保数据不会等待太久
        this.flushTimer = global.setTimeout(() => {
          this.processBatch();
        }, this.config.maxWaitTimeMs);
      }
    });
  }

  /**
   * 处理批量数据
   */
  private async processBatch(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    if (this.pendingItems.length === 0) {
      return;
    }
    
    // 按流分组
    const itemsByStream = new Map<string, BatchItem[]>();
    
    for (const item of this.pendingItems) {
      if (!itemsByStream.has(item.stream)) {
        itemsByStream.set(item.stream, []);
      }
      itemsByStream.get(item.stream)!.push(item);
    }
    
    // 清空待处理队列
    this.pendingItems = [];
    
    // 处理每个流的批量数据
    for (const [stream, items] of itemsByStream.entries()) {
      this.processStreamBatch(stream, items);
    }
  }

  /**
   * 处理单个流的批量数据
   */
  private async processStreamBatch(stream: string, items: BatchItem[]): Promise<void> {
    const batchId = this.generateBatchId(stream);
    
    // 合并所有数据
    const allData: any[] = [];
    for (const item of items) {
      allData.push(...item.data);
    }
    
    // 如果数据量仍然很大，则分块处理
    if (allData.length > this.config.batchSize) {
      const chunks = this.chunkArray(allData, this.config.batchSize);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkItems = items.map(item => ({
          ...item,
          id: `${item.id}_chunk_${i}`,
          data: i === 0 ? chunks[i] : [], // 只有第一个块包含原始数据
        }));
        
        const chunkId = `${batchId}_chunk_${i}`;
        this.processStreamChunk(stream, chunkId, chunkItems, chunks[i]);
      }
    } else {
      this.processStreamChunk(stream, batchId, items, allData);
    }
  }

  /**
   * 处理流数据块
   */
  private async processStreamChunk(
    stream: string, 
    batchId: string, 
    items: BatchItem[], 
    data: any[]
  ): Promise<void> {
    // 检查是否已有相同的批次在进行中
    if (this.batchesInProgress.has(batchId)) {
      return;
    }
    
    const batchPromise = this.sendBatch(stream, batchId, items, data);
    this.batchesInProgress.set(batchId, batchPromise);
    
    try {
      const result = await batchPromise;
      
      // 解决所有项目的Promise
      for (const item of items) {
        if (item.resolve) {
          item.resolve(result);
        }
      }
      
      // 记录成功指标
      this.metricsCollector.recordMetric('batch_send_success', 1, {
        stream,
        item_count: items.length.toString(),
        data_count: data.length.toString(),
      });
      
    } catch (error) {
      // 处理重试逻辑
      const shouldRetry = this.shouldRetry(items, error);
      
      if (shouldRetry) {
        // 增加重试计数
        for (const item of items) {
          item.retryCount = (item.retryCount || 0) + 1;
        }
        
        // 延迟后重新加入队列
        global.setTimeout(() => {
          for (const item of items) {
            this.pendingItems.push(item);
          }
          this.processBatch();
        }, this.config.retryDelayMs);
        
        // 记录重试指标
        this.metricsCollector.recordMetric('batch_send_retry', 1, {
          stream,
          error_type: error.constructor.name,
        });
        
      } else {
        // 重试次数已用完，拒绝所有项目的Promise
        for (const item of items) {
          if (item.reject) {
            item.reject(error);
          }
        }
        
        // 记录失败指标
        this.metricsCollector.recordMetric('batch_send_failed', 1, {
          stream,
          error_type: error.constructor.name,
          max_retries_reached: 'true',
        });
      }
    } finally {
      // 清除进行中的批次
      this.batchesInProgress.delete(batchId);
    }
  }

  /**
   * 发送批量数据
   */
  private async sendBatch(
    stream: string, 
    batchId: string, 
    items: BatchItem[], 
    data: any[]
  ): Promise<any> {
    try {
      const config = this.configService.getConfig();
      
      // 准备请求数据
      let payload = data;
      let headers: Record<string, string> = {};
      
      // 添加认证头
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
      }
      
      // 处理压缩
      if (this.config.compressionEnabled) {
        const zlib = require('zlib');
        const jsonString = JSON.stringify(data);
        payload = await zlib.gzip(jsonString);
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Type'] = 'application/json';
      } else {
        headers['Content-Type'] = 'application/json';
      }
      
      // 发送请求
      const axios = require('axios');
      const url = `${config.url}/api/${config.organization}/${stream}/_json`;
      
      const response = await axios.post(url, payload, {
        headers,
        timeout: config.timeout || 10000,
        // 添加请求元数据
        metadata: {
          startTime: Date.now(),
          batchId,
          itemCount: items.length,
          dataCount: data.length,
          stream,
        },
      });
      
      // 记录请求指标
      const duration = response.config.metadata?.duration || 0;
      this.metricsCollector.recordRequest(
        response.status < 400,
        duration,
        response.status,
        {
          operation: 'batch_send',
          stream,
          batch_id: batchId,
        }
      );
      
      return {
        success: response.status < 400,
        status: response.status,
        message: 'Batch sent successfully',
        count: data.length,
        batchId,
        duration,
      };
      
    } catch (error) {
      // 记录错误指标
      this.metricsCollector.recordError('BatchSendError', error.message, {
        stream,
        batch_id: batchId,
      });
      
      throw OpenObserveError.fromAxiosError(error, {
        operation: 'batch_send',
        batchId,
        itemCount: items.length,
        stream,
      });
    }
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(items: BatchItem[], error: any): boolean {
    // 检查是否有项目超过最大重试次数
    for (const item of items) {
      if ((item.retryCount || 0) >= this.config.maxRetries) {
        return false;
      }
    }
    
    // 检查错误类型是否可重试
    if (error.response) {
      // HTTP错误
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408;
    }
    
    // 网络错误
    if (error.code) {
      const retryableCodes = [
        'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH',
        'EPIPE', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN'
      ];
      return retryableCodes.includes(error.code);
    }
    
    return true;
  }

  /**
   * 分块数组
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 生成项目ID
   */
  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成批次ID
   */
  private generateBatchId(stream: string): string {
    return `batch_${stream}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取批量写入状态
   */
  getStatus(): {
    pendingItems: number;
    batchesInProgress: number;
    config: BatchConfig;
  } {
    return {
      pendingItems: this.pendingItems.length,
      batchesInProgress: this.batchesInProgress.size,
      config: { ...this.config },
    };
  }

  /**
   * 强制刷新所有待处理项目
   */
  async flush(): Promise<void> {
    if (this.pendingItems.length > 0) {
      this.logger.log(`Flushing ${this.pendingItems.length} pending items`);
      await this.processBatch();
    }
    
    // 等待所有进行中的批次完成
    const batchPromises = Array.from(this.batchesInProgress.values());
    if (batchPromises.length > 0) {
      this.logger.log(`Waiting for ${batchPromises.length} batches to complete`);
      await Promise.all(batchPromises);
    }
  }

  /**
   * 关闭批量写入器
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    this.logger.log('Shutting down BatchWriter');
    
    // 清除定时器
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    // 刷新所有待处理项目
    await this.flush();
    
    this.logger.log('BatchWriter shutdown complete');
  }
}