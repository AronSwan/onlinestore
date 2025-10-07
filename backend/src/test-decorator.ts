// 用途：测试装饰器配置
// 作者：后端开发团队
// 时间：2025-09-30 00:00:00

import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class TestService {
  constructor(@Inject('TEST_TOKEN') private testValue: string) {}

  getValue() {
    return this.testValue;
  }
}
