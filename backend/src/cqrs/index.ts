// 用途：CQRS模块入口文件
// 作者：后端开发团队
// 时间：2025-10-05

export * from './commands/command.base.js';
export * from './queries/query.base.js';
export * from './events/event.base.js';
export * from './interfaces/command-handler.interface.js';
export * from './interfaces/query-handler.interface.js';
export * from './interfaces/event-handler.interface.js';
export * from './bus/command.bus.js';
export * from './bus/query.bus.js';
export * from './bus/event.bus.js';
export * from './decorators/command-handler.decorator.js';
export * from './decorators/query-handler.decorator.js';
export * from './decorators/event-handler.decorator.js';
export * from './cqrs.module.js';
export * from './tanstack-query.integration.js';
