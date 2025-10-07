// 用途：请求范围的路由上下文服务，提供统一的 route 与 module 标签
// 依赖文件：async_hooks
// 作者：后端开发团队
// 时间：2025-09-29 23:20:00

import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

type RouteContext = { route?: string; module?: string };

@Injectable()
export class RouteContextService {
  private readonly als = new AsyncLocalStorage<RouteContext>();

  enter(route?: string, module?: string): void {
    this.als.enterWith({ route, module });
  }

  getRoute(): string | undefined {
    const store = this.als.getStore();
    return store?.route;
  }

  getModule(): string | undefined {
    const store = this.als.getStore();
    return store?.module;
  }
}
