import { SetMetadata } from '@nestjs/common';
import { DatabaseOperationType } from '../database/read-write-separation.service';

/**
 * 读写操作元数据键
 */
export const READ_WRITE_OPERATION_KEY = 'read_write_operation';

/**
 * 读写操作选项
 */
export interface ReadWriteOptions {
  type: DatabaseOperationType;
  forceConnection?: string; // 强制使用特定连接
  timeout?: number; // 操作超时时间
  retries?: number; // 重试次数
  fallbackToMaster?: boolean; // 是否允许故障转移到主库
}

/**
 * 标记方法为读操作
 *
 * @param options 读操作选项
 */
export const ReadOperation = (options?: Partial<ReadWriteOptions>) =>
  SetMetadata(READ_WRITE_OPERATION_KEY, {
    type: DatabaseOperationType.READ,
    fallbackToMaster: true,
    ...options,
  });

/**
 * 标记方法为写操作
 *
 * @param options 写操作选项
 */
export const WriteOperation = (options?: Partial<ReadWriteOptions>) =>
  SetMetadata(READ_WRITE_OPERATION_KEY, {
    type: DatabaseOperationType.WRITE,
    fallbackToMaster: false,
    ...options,
  });

/**
 * 数据库查询装饰器（读操作）
 */
export const DatabaseQuery = (options?: Partial<ReadWriteOptions>) => ReadOperation(options);

/**
 * 数据库命令装饰器（写操作）
 */
export const DatabaseCommand = (options?: Partial<ReadWriteOptions>) => WriteOperation(options);

/**
 * 事务操作装饰器（强制主库）
 */
export const TransactionOperation = (options?: Partial<ReadWriteOptions>) =>
  SetMetadata(READ_WRITE_OPERATION_KEY, {
    type: DatabaseOperationType.WRITE,
    forceConnection: 'master',
    fallbackToMaster: false,
    ...options,
  });

/**
 * 只读操作装饰器（仅从库，不允许故障转移）
 */
export const ReadOnlyOperation = (options?: Partial<ReadWriteOptions>) =>
  SetMetadata(READ_WRITE_OPERATION_KEY, {
    type: DatabaseOperationType.READ,
    fallbackToMaster: false,
    ...options,
  });

/**
 * 主库操作装饰器（强制主库）
 */
export const MasterOperation = (options?: Partial<ReadWriteOptions>) =>
  SetMetadata(READ_WRITE_OPERATION_KEY, {
    type: DatabaseOperationType.WRITE,
    forceConnection: 'master',
    ...options,
  });

/**
 * 从库操作装饰器（强制从库）
 */
export const SlaveOperation = (slaveIndex?: number, options?: Partial<ReadWriteOptions>) =>
  SetMetadata(READ_WRITE_OPERATION_KEY, {
    type: DatabaseOperationType.READ,
    forceConnection: slaveIndex ? `slave_${slaveIndex}` : undefined,
    fallbackToMaster: true,
    ...options,
  });

// 常用的Repository方法装饰器

/**
 * 查找操作装饰器
 */
export const FindOperation = () => ReadOperation();

/**
 * 查找一个操作装饰器
 */
export const FindOneOperation = () => ReadOperation();

/**
 * 计数操作装饰器
 */
export const CountOperation = () => ReadOperation();

/**
 * 存在性检查操作装饰器
 */
export const ExistsOperation = () => ReadOperation();

/**
 * 保存操作装饰器
 */
export const SaveOperation = () => WriteOperation();

/**
 * 插入操作装饰器
 */
export const InsertOperation = () => WriteOperation();

/**
 * 更新操作装饰器
 */
export const UpdateOperation = () => WriteOperation();

/**
 * 删除操作装饰器
 */
export const DeleteOperation = () => WriteOperation();

/**
 * 软删除操作装饰器
 */
export const SoftDeleteOperation = () => WriteOperation();

/**
 * 恢复操作装饰器
 */
export const RestoreOperation = () => WriteOperation();

/**
 * 批量操作装饰器
 */
export const BulkOperation = () => WriteOperation();

// 业务场景装饰器

/**
 * 用户查询操作
 */
export const UserQuery = () => ReadOperation({ timeout: 5000 });

/**
 * 用户命令操作
 */
export const UserCommand = () => WriteOperation({ timeout: 10000, retries: 3 });

/**
 * 产品查询操作
 */
export const ProductQuery = () => ReadOperation({ timeout: 3000 });

/**
 * 产品命令操作
 */
export const ProductCommand = () => WriteOperation({ timeout: 8000, retries: 2 });

/**
 * 订单查询操作
 */
export const OrderQuery = () => ReadOperation({ timeout: 5000 });

/**
 * 订单命令操作
 */
export const OrderCommand = () => WriteOperation({ timeout: 15000, retries: 3 });

/**
 * 支付操作（强制主库，高重试）
 */
export const PaymentOperation = () =>
  WriteOperation({
    forceConnection: 'master',
    timeout: 30000,
    retries: 5,
  });

/**
 * 库存操作（强制主库，防止并发问题）
 */
export const InventoryOperation = () =>
  WriteOperation({
    forceConnection: 'master',
    timeout: 10000,
    retries: 3,
  });

/**
 * 审计日志操作（可以使用从库读取）
 */
export const AuditLogQuery = () => ReadOperation({ timeout: 8000 });

/**
 * 审计日志写入操作
 */
export const AuditLogCommand = () => WriteOperation({ timeout: 5000, retries: 2 });

/**
 * 缓存预热操作（可以使用从库）
 */
export const CacheWarmupOperation = () =>
  ReadOperation({
    fallbackToMaster: false,
    timeout: 10000,
  });

/**
 * 报表查询操作（优先从库，长超时）
 */
export const ReportQuery = () =>
  ReadOperation({
    timeout: 30000,
    fallbackToMaster: true,
  });

/**
 * 数据同步操作（强制主库）
 */
export const DataSyncOperation = () =>
  WriteOperation({
    forceConnection: 'master',
    timeout: 60000,
    retries: 1,
  });

/**
 * 健康检查操作（可以任意库）
 */
export const HealthCheckOperation = () =>
  ReadOperation({
    timeout: 2000,
    fallbackToMaster: true,
  });

/**
 * 统计查询操作（优先从库）
 */
export const StatisticsQuery = () =>
  ReadOperation({
    timeout: 15000,
    fallbackToMaster: true,
  });

/**
 * 搜索操作（优先从库）
 */
export const SearchOperation = () =>
  ReadOperation({
    timeout: 8000,
    fallbackToMaster: true,
  });

/**
 * 推荐查询操作（优先从库）
 */
export const RecommendationQuery = () =>
  ReadOperation({
    timeout: 5000,
    fallbackToMaster: false,
  });

/**
 * 获取读写操作元数据
 */
export function getReadWriteMetadata(
  target: any,
  propertyKey: string,
): ReadWriteOptions | undefined {
  return Reflect.getMetadata(READ_WRITE_OPERATION_KEY, target, propertyKey);
}
