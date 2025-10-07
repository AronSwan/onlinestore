import {
  Repository,
  EntityTarget,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
  SaveOptions,
  RemoveOptions,
  UpdateResult,
  DeleteResult,
  InsertResult,
  QueryRunner,
  SelectQueryBuilder,
  ObjectLiteral,
  DeepPartial,
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { ReadWriteSeparationService, DatabaseOperationType } from './read-write-separation.service';
import { TracingService } from '../tracing/tracing.service';
import {
  ReadOperation,
  WriteOperation,
  FindOperation,
  FindOneOperation,
  CountOperation,
  ExistsOperation,
  SaveOperation,
  InsertOperation,
  UpdateOperation,
  DeleteOperation,
  TransactionOperation,
} from '../decorators/read-write.decorator';

/**
 * 支持读写分离的Repository基类
 */
@Injectable()
export abstract class BaseRepository<Entity extends ObjectLiteral> {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly entityTarget: EntityTarget<Entity>;

  constructor(
    entityTarget: EntityTarget<Entity>,
    protected readonly readWriteService: ReadWriteSeparationService,
    protected readonly tracingService: TracingService,
  ) {
    this.entityTarget = entityTarget;
  }

  /**
   * 获取读操作的Repository
   */
  protected async getReadRepository(): Promise<Repository<Entity>> {
    return this.readWriteService.getRepository(this.entityTarget, DatabaseOperationType.READ);
  }

  /**
   * 获取写操作的Repository
   */
  protected async getWriteRepository(): Promise<Repository<Entity>> {
    return this.readWriteService.getRepository(this.entityTarget, DatabaseOperationType.WRITE);
  }

  /**
   * 获取指定类型的Repository
   */
  protected async getRepository(operationType: DatabaseOperationType): Promise<Repository<Entity>> {
    return this.readWriteService.getRepository(this.entityTarget, operationType);
  }

  /**
   * 获取读操作的QueryBuilder
   */
  protected async getReadQueryBuilder(alias?: string): Promise<SelectQueryBuilder<Entity>> {
    return this.readWriteService.getQueryBuilder(
      this.entityTarget,
      alias || 'entity',
      DatabaseOperationType.READ,
    );
  }

  /**
   * 获取写操作的QueryBuilder
   */
  protected async getWriteQueryBuilder(alias?: string): Promise<SelectQueryBuilder<Entity>> {
    return this.readWriteService.getQueryBuilder(
      this.entityTarget,
      alias || 'entity',
      DatabaseOperationType.WRITE,
    );
  }

  // === 读操作方�?===

  /**
   * 查找多个实体
   */
  @FindOperation()
  async find(options?: FindManyOptions<Entity>): Promise<Entity[]> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Finding entities with options:`, options);

    try {
      const repository = await this.getReadRepository();
      const result = await repository.find(options);

      this.logger.debug(`[${traceId}] Found ${result.length} entities`);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Find operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 查找单个实体
   */
  @FindOneOperation()
  async findOne(options: FindOneOptions<Entity>): Promise<Entity | null> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Finding one entity with options:`, options);

    try {
      const repository = await this.getReadRepository();
      const result = await repository.findOne(options);

      this.logger.debug(`[${traceId}] Found entity:`, !!result);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] FindOne operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 根据ID查找实体
   */
  @FindOneOperation()
  async findById(id: any): Promise<Entity | null> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Finding entity by ID:`, id);

    try {
      const repository = await this.getReadRepository();
      const result = await repository.findOne({ where: { id } as FindOptionsWhere<Entity> });

      this.logger.debug(`[${traceId}] Found entity by ID:`, !!result);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] FindById operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 查找并计�?   */
  @FindOperation()
  async findAndCount(options?: FindManyOptions<Entity>): Promise<[Entity[], number]> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Finding and counting entities with options:`, options);

    try {
      const repository = await this.getReadRepository();
      const result = await repository.findAndCount(options);

      this.logger.debug(
        `[${traceId}] Found ${result[0].length} entities, total count: ${result[1]}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] FindAndCount operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 计数
   */
  @CountOperation()
  async count(options?: FindManyOptions<Entity>): Promise<number> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Counting entities with options:`, options);

    try {
      const repository = await this.getReadRepository();
      const result = await repository.count(options);

      this.logger.debug(`[${traceId}] Count result:`, result);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Count operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 检查实体是否存�?   */
  @ExistsOperation()
  async exists(options: FindOptionsWhere<Entity>): Promise<boolean> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Checking if entity exists with options:`, options);

    try {
      const repository = await this.getReadRepository();
      const result = await repository.exist({ where: options });

      this.logger.debug(`[${traceId}] Entity exists:`, result);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Exists operation failed:`, error.message);
      throw error;
    }
  }

  // === 写操作方�?===

  /**
   * 保存实体
   */
  @SaveOperation()
  async save(entity: Entity, options?: SaveOptions): Promise<Entity> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Saving entity:`, entity);

    try {
      const repository = await this.getWriteRepository();
      const result = await repository.save(entity, options);

      this.logger.debug(`[${traceId}] Entity saved successfully`);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Save operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 批量保存实体
   */
  @SaveOperation()
  async saveMany(entities: Entity[], options?: SaveOptions): Promise<Entity[]> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Saving ${entities.length} entities`);

    try {
      const repository = await this.getWriteRepository();
      const result = await repository.save(entities, options);

      this.logger.debug(`[${traceId}] ${entities.length} entities saved successfully`);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] SaveMany operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 插入实体
   */
  @InsertOperation()
  async insert(entity: Entity): Promise<InsertResult> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Inserting entity:`, entity);

    try {
      const repository = await this.getWriteRepository();
      const result = await repository.insert(entity);

      this.logger.debug(`[${traceId}] Entity inserted successfully`);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Insert operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 更新实体
   */
  @UpdateOperation()
  async update(
    criteria: FindOptionsWhere<Entity>,
    partialEntity: DeepPartial<Entity>,
  ): Promise<UpdateResult> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Updating entity with criteria:`, criteria);

    try {
      const repository = await this.getWriteRepository();
      const result = await repository.update(criteria, partialEntity as any);

      this.logger.debug(`[${traceId}] Entity updated successfully, affected: ${result.affected}`);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Update operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 删除实体
   */
  @DeleteOperation()
  async delete(criteria: FindOptionsWhere<Entity>): Promise<DeleteResult> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Deleting entity with criteria:`, criteria);

    try {
      const repository = await this.getWriteRepository();
      const result = await repository.delete(criteria);

      this.logger.debug(`[${traceId}] Entity deleted successfully, affected: ${result.affected}`);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Delete operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 移除实体
   */
  @DeleteOperation()
  async remove(entity: Entity, options?: RemoveOptions): Promise<Entity> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Removing entity:`, entity);

    try {
      const repository = await this.getWriteRepository();
      const result = await repository.remove(entity, options);

      this.logger.debug(`[${traceId}] Entity removed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Remove operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 软删除实�?   */
  @DeleteOperation()
  async softDelete(criteria: FindOptionsWhere<Entity>): Promise<UpdateResult> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Soft deleting entity with criteria:`, criteria);

    try {
      const repository = await this.getWriteRepository();
      const result = await repository.softDelete(criteria);

      this.logger.debug(
        `[${traceId}] Entity soft deleted successfully, affected: ${result.affected}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] SoftDelete operation failed:`, error.message);
      throw error;
    }
  }

  /**
   * 恢复软删除的实体
   */
  @UpdateOperation()
  async restore(criteria: FindOptionsWhere<Entity>): Promise<UpdateResult> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Restoring entity with criteria:`, criteria);

    try {
      const repository = await this.getWriteRepository();
      const result = await repository.restore(criteria);

      this.logger.debug(`[${traceId}] Entity restored successfully, affected: ${result.affected}`);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Restore operation failed:`, error.message);
      throw error;
    }
  }

  // === 事务操作方法 ===

  /**
   * 执行事务
   */
  @TransactionOperation()
  async transaction<T>(operation: (queryRunner: QueryRunner) => Promise<T>): Promise<T> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Starting transaction`);

    try {
      const result = await this.readWriteService.executeTransaction(operation);

      this.logger.debug(`[${traceId}] Transaction completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Transaction failed:`, error.message);
      throw error;
    }
  }

  // === 高级查询方法 ===

  /**
   * 创建查询构建器（读操作）
   */
  @ReadOperation()
  async createReadQueryBuilder(alias?: string): Promise<SelectQueryBuilder<Entity>> {
    return this.getReadQueryBuilder(alias);
  }

  /**
   * 创建查询构建器（写操作）
   */
  @WriteOperation()
  async createWriteQueryBuilder(alias?: string): Promise<SelectQueryBuilder<Entity>> {
    return this.getWriteQueryBuilder(alias);
  }

  /**
   * 执行原生查询（读操作�?   */
  @ReadOperation()
  async query(sql: string, parameters?: any[]): Promise<any> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Executing read query:`, sql);

    try {
      const dataSource = await this.readWriteService.getDataSource(DatabaseOperationType.READ);
      const result = await dataSource.query(sql, parameters);

      this.logger.debug(`[${traceId}] Read query executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Read query failed:`, error.message);
      throw error;
    }
  }

  /**
   * 执行原生命令（写操作�?   */
  @WriteOperation()
  async execute(sql: string, parameters?: any[]): Promise<any> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Executing write command:`, sql);

    try {
      const dataSource = await this.readWriteService.getDataSource(DatabaseOperationType.WRITE);
      const result = await dataSource.query(sql, parameters);

      this.logger.debug(`[${traceId}] Write command executed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Write command failed:`, error.message);
      throw error;
    }
  }

  // === 批量操作方法 ===

  /**
   * 批量插入
   */
  @InsertOperation()
  async bulkInsert(entities: Entity[], chunkSize: number = 1000): Promise<void> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(
      `[${traceId}] Bulk inserting ${entities.length} entities with chunk size ${chunkSize}`,
    );

    try {
      const repository = await this.getWriteRepository();

      for (let i = 0; i < entities.length; i += chunkSize) {
        const chunk = entities.slice(i, i + chunkSize);
        await repository.insert(chunk);
        this.logger.debug(
          `[${traceId}] Inserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(entities.length / chunkSize)}`,
        );
      }

      this.logger.debug(`[${traceId}] Bulk insert completed successfully`);
    } catch (error) {
      this.logger.error(`[${traceId}] Bulk insert failed:`, error.message);
      throw error;
    }
  }

  /**
   * 批量更新
   */
  @UpdateOperation()
  async bulkUpdate(
    criteria: FindOptionsWhere<Entity>,
    partialEntity: DeepPartial<Entity>,
  ): Promise<UpdateResult> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Bulk updating entities with criteria:`, criteria);

    try {
      const repository = await this.getWriteRepository();
      const result = await repository.update(criteria, partialEntity as any);

      this.logger.debug(
        `[${traceId}] Bulk update completed successfully, affected: ${result.affected}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Bulk update failed:`, error.message);
      throw error;
    }
  }

  /**
   * 批量删除
   */
  @DeleteOperation()
  async bulkDelete(criteria: FindOptionsWhere<Entity>): Promise<DeleteResult> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Bulk deleting entities with criteria:`, criteria);

    try {
      const repository = await this.getWriteRepository();
      const result = await repository.delete(criteria);

      this.logger.debug(
        `[${traceId}] Bulk delete completed successfully, affected: ${result.affected}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Bulk delete failed:`, error.message);
      throw error;
    }
  }

  // === 缓存相关方法 ===

  /**
   * 清除查询缓存
   */
  async clearCache(id?: string | string[]): Promise<void> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Clearing cache for ID:`, id);

    try {
      const dataSource = await this.readWriteService.getDataSource(DatabaseOperationType.READ);
      await dataSource.queryResultCache?.clear();

      this.logger.debug(`[${traceId}] Cache cleared successfully`);
    } catch (error) {
      this.logger.error(`[${traceId}] Clear cache failed:`, error.message);
      throw error;
    }
  }

  // === 健康检查方�?===

  /**
   * 检查数据库连接健康状�?   */
  @ReadOperation()
  async healthCheck(): Promise<{ read: boolean; write: boolean }> {
    const traceId = this.tracingService.getTraceId();
    this.logger.debug(`[${traceId}] Performing health check`);

    try {
      const readHealth = await this.checkReadHealth();
      const writeHealth = await this.checkWriteHealth();

      const result = { read: readHealth, write: writeHealth };
      this.logger.debug(`[${traceId}] Health check result:`, result);
      return result;
    } catch (error) {
      this.logger.error(`[${traceId}] Health check failed:`, error.message);
      throw error;
    }
  }

  private async checkReadHealth(): Promise<boolean> {
    try {
      const dataSource = await this.readWriteService.getDataSource(DatabaseOperationType.READ);
      await dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkWriteHealth(): Promise<boolean> {
    try {
      const dataSource = await this.readWriteService.getDataSource(DatabaseOperationType.WRITE);
      await dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
