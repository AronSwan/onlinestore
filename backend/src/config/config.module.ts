// 用途：统一配置模块，集中管理所有配置
// 依赖文件：unified.config.ts, unified-master.config.ts, performance.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 12:25:00

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createMasterConfiguration, validateMasterConfiguration } from './unified-master.config';
import performanceConfig from './performance.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [createMasterConfiguration, performanceConfig],
      validate: validateMasterConfiguration,
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
      // 生产环境禁用详细错误信息
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
