// 用途：CQRS模块入口文件
// 作者：后端开发团队
// 时间：2025-10-05

export * from './commands/command.base';
export * from './queries/query.base';
export * from './events/event.base';
export * from './interfaces/command-handler.interface';
export * from './interfaces/query-handler.interface';
export * from './interfaces/event-handler.interface';
export * from './bus/command.bus';
export * from './bus/query.bus';
export * from './bus/event.bus';
export * from './decorators/command-handler.decorator';
export * from './decorators/query-handler.decorator';
export * from './decorators/event-handler.decorator';
export * from './cqrs.module';
export * from './tanstack-query.integration';
