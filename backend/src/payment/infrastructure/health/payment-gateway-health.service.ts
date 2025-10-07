import { Injectable } from '@nestjs/common';

/**
 * 支付网关健康检查服务
 */
@Injectable()
export class PaymentGatewayHealthService {
  async check(): Promise<{ status: string; details?: any }> {
    try {
      // 这里应该实际检查各个支付网关的状态
      // 例如调用网关的健康检查接口
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }
}
