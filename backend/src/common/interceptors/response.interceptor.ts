import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 统一响应格式拦截器
 * 借鉴 Snowy-Cloud 的响应格式设计
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // 如果已经是标准格式，直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // 统一包装响应格式
        return {
          success: true,
          code: 'SUCCESS',
          message: '操作成功',
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
