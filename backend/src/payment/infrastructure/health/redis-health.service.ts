import { Injectable } from '@nestjs/common';

/**
 * Redis健康检查服务
 */
@Injectable()
export class RedisHealthService {
  async check(): Promise<{ status: string; details?: any }> {
    try {
      // 这里应该实际检查Redis连接
      // 例如执行一个ping命令
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }
}
