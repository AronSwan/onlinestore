import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenObserveService } from './openobserve.service';

@Module({
  imports: [ConfigModule],
  providers: [OpenObserveService],
  exports: [OpenObserveService],
})
export class OpenObserveModule {
  constructor() {
    // 添加安全警告和弃用警告
    console.error(
      '[SECURITY WARNING] OpenObserveModule contains critical security vulnerabilities (SQL injection, unsafe string interpolation). ' +
      'This module is deprecated and will be removed in a future version. ' +
      'IMMEDIATELY migrate to OpenObserveModuleV2 for better security and features. ' +
      'See MIGRATION_GUIDE.md for detailed migration steps.'
    );
  }
}