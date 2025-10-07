// 用途：Winston日志系统配置，支持结构化日志
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 11:25:00

import { Injectable } from '@nestjs/common';
import { WinstonModuleOptions, WinstonModuleOptionsFactory } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { createMasterConfiguration } from '../../config/unified-master.config';

// Create configuration instance
const masterConfig = createMasterConfiguration();

@Injectable()
export class WinstonConfigService implements WinstonModuleOptionsFactory {
  createWinstonModuleOptions(): WinstonModuleOptions {
    const isDevelopment = masterConfig.app.env === 'development';
    const isProduction = masterConfig.app.env === 'production';

    // 日志格式
    const consoleFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context, trace }) => {
        return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
      }),
    );

    const fileFormat = winston.format.combine(winston.format.timestamp(), winston.format.json());

    // 日志级别映射
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      debug: 5,
      silly: 6,
    };

    const transports: winston.transport[] = [
      // 控制台输出（开发环境）
      new winston.transports.Console({
        level: isDevelopment ? 'debug' : 'info',
        format: consoleFormat,
      }),

      // 错误日志文件 - 优化归档策略
      new winston.transports.DailyRotateFile({
        level: 'error',
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD-HH', // 每小时一个文件
        zippedArchive: true,
        maxSize: '50m', // 增加到50MB
        maxFiles: '14d', // 保留14天
        format: fileFormat,
        createSymlink: true, // 创建当前错误日志的符号链接
        symlinkName: 'error-current.log',
        auditFile: 'logs/.error-audit.json', // 审计文件
        // 日志追踪由maxFiles/maxSize实现
      }),

      // 所有日志文件 - 优化归档策略
      new winston.transports.DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '100m', // 增加到100MB
        maxFiles: '7d', // 保留7天
        format: fileFormat,
        createSymlink: true, // 创建当前日志的符号链接
        symlinkName: 'combined-current.log',
        auditFile: 'logs/.combined-audit.json', // 审计文件
        // 日志追踪由maxFiles/maxSize实现
      }),
    ];

    // 生产环境添加HTTP访问日志
    if (isProduction) {
      transports.push(
        new winston.transports.DailyRotateFile({
          level: 'http',
          filename: 'logs/http-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          format: fileFormat,
        }),
      );
    }

    return {
      levels,
      level: isDevelopment ? 'debug' : 'info',
      transports,
      // 异常处理 - 使用轮转文件
      exceptionHandlers: [
        new winston.transports.DailyRotateFile({
          filename: 'logs/exceptions-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
        }),
      ],
      // 拒绝处理 - 使用轮转文件
      rejectionHandlers: [
        new winston.transports.DailyRotateFile({
          filename: 'logs/rejections-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
        }),
      ],
      // 日志轮转事件通过maxFiles/maxSize控制
    };
  }
}
