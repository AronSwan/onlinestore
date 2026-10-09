export { createMockedFunction } from './typed-mock-factory';
export { createMockRepository, createMockDataSource, createMockQueryRunner, createMockConfigService, } from '../test-helpers';
export declare const createMockHttpService: () => any;
export declare const asMocked: <T>(obj: T) => jest.Mocked<T>;
export declare const createMockQueryBuilder: <T = any>() => any;
