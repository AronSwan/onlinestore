// 用途：监控中间件，自动收集HTTP请求指标
// 依赖文件：monitoring.service.ts
// 作者：后端开发团队
// 时间：2025-09-29 22:23:00

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from './monitoring.service';

@Injectable()
export class MonitoringMiddleware implements NestMiddleware {
  constructor(private readonly monitoringService: MonitoringService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl } = req;

    // 增加活跃连接数
    this.monitoringService.incrementActiveConnections();

    // 监听响应完成事件
    res.on('finish', () => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // 转换为秒
      const statusCode = res.statusCode;

      // 记录HTTP请求指标
      this.monitoringService.incrementHttpRequest(method, originalUrl, statusCode);
      this.monitoringService.observeHttpRequestDuration(method, originalUrl, duration);

      // 减少活跃连接数
      this.monitoringService.decrementActiveConnections();
    });

    next();
  }
}
