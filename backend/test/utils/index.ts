// Typed Mock 模板与常用工厂导出
// 为测试代码提供统一的类型化 Mock 能力与示例片段

import type { HttpService } from '@nestjs/axios';

export { createMockedFunction } from './typed-mock-factory';
export {
  createMockRepository,
  createMockDataSource,
  createMockQueryRunner,
  createMockConfigService,
} from '../test-helpers';

// HttpService 常用方法模板
export const createMockHttpService = () => {
  return {
    post: (jest.fn() as unknown) as jest.MockedFunction<HttpService['post']>,
    get: (jest.fn() as unknown) as jest.MockedFunction<HttpService['get']>,
    delete: (jest.fn() as unknown) as jest.MockedFunction<HttpService['delete']>,
    put: (jest.fn() as unknown) as jest.MockedFunction<HttpService['put']>,
    patch: (jest.fn() as unknown) as jest.MockedFunction<HttpService['patch']>,
  } as any;
};

// 类型断言辅助：将对象断言为 jest.Mocked<T>
export const asMocked = <T>(obj: T) => obj as unknown as jest.Mocked<T>;

// QueryBuilder 链式方法模板（保留 mockReturnThis），避免各文件重复定义
export const createMockQueryBuilder = <T = any>() => {
  const qb: any = {
    // 选择与连接
    leftJoinAndSelect: (jest.fn().mockReturnThis() as unknown) as jest.MockedFunction<
      (association: string, alias: string, condition?: string) => any
    >,
    // 过滤条件
    where: (jest.fn().mockReturnThis() as unknown) as jest.MockedFunction<
      (condition: string, parameters?: Record<string, any>) => any
    >,
    andWhere: (jest.fn().mockReturnThis() as unknown) as jest.MockedFunction<
      (condition: string, parameters?: Record<string, any>) => any
    >,
    // 排序与分页
    orderBy: (jest.fn().mockReturnThis() as unknown) as jest.MockedFunction<
      (sort: string, order?: 'ASC' | 'DESC') => any
    >,
    skip: (jest.fn().mockReturnThis() as unknown) as jest.MockedFunction<(count: number) => any>,
    take: (jest.fn().mockReturnThis() as unknown) as jest.MockedFunction<(count: number) => any>,
    // 更新链
    update: (jest.fn().mockReturnThis() as unknown) as jest.MockedFunction<
      (entity?: any, values?: Record<string, any>) => any
    >,
    set: (jest.fn().mockReturnThis() as unknown) as jest.MockedFunction<
      (values: Record<string, any>) => any
    >,
    // 选择字段
    select: (jest.fn().mockReturnThis() as unknown) as jest.MockedFunction<(fields: any) => any>,
    // 终结方法
    getManyAndCount: (jest.fn() as unknown) as jest.MockedFunction<() => Promise<[T[], number]>>,
    getMany: (jest.fn() as unknown) as jest.MockedFunction<() => Promise<T[]>>,
    getRawOne: (jest.fn() as unknown) as jest.MockedFunction<() => Promise<any>>,
    execute: (jest.fn() as unknown) as jest.MockedFunction<() => Promise<any>>,
  };
  return qb as any;
};

// 示例片段：复制使用
// 1) HttpService
// const http = createMockHttpService();
// http.post.mockResolvedValue(of({ data: { ok: true } }));
// provider: { provide: HttpService, useValue: http }

// 2) Repository 常用方法
// const repo = createMockRepository<Product>();
// repo.find.mockResolvedValue([product]);
// provider: { provide: getRepositoryToken(Product), useValue: repo }

// 3) 通用函数策略
// const handler = createMockedFunction<(payload: { id: string }) => Promise<{ ok: boolean }>>();
// handler.mockResolvedValue({ ok: true });

// 4) QueryBuilder 使用
// const qb = createMockQueryBuilder<Product>();
// qb.getManyAndCount.mockResolvedValue([[product], 1]);
// repo.createQueryBuilder.mockReturnValue(qb);