import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OpenObserveError } from '../utils/error-handler';

/**
 * 字段白名单服务
 * 从远端schema或配置中拉取字段列表，降低维护成本
 */
@Injectable()
export class FieldWhitelistService {
  private readonly logger = new Logger(FieldWhitelistService.name);
  private readonly allowedFields: Set<string> = new Set();
  private readonly allowedOperators: Set<string> = new Set();
  private lastUpdated: number = 0;
  private readonly cacheTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.cacheTimeoutMs = this.configService.get<number>('OPENOBSERVE_FIELD_CACHE_TIMEOUT_MS', 300000); // 5分钟
    this.initializeDefaultWhitelist();
    
    // 如果启用了动态白名单，则启动时加载
    if (this.configService.get<boolean>('OPENOBSERVE_DYNAMIC_WHITELIST_ENABLED', false)) {
      this.loadWhitelistFromRemote().catch(error => {
        this.logger.warn('Failed to load whitelist from remote, using default whitelist', error.message);
      });
    }
  }

  /**
   * 初始化默认白名单
   */
  private initializeDefaultWhitelist(): void {
    // 默认允许的字段
    const defaultFields = [
      'id', '_id', 'timestamp', 'level', 'message', 'service', 'trace_id', 'span_id',
      'user_id', 'session_id', 'product_id', 'order_id', 'event_type', 'severity',
      'status_code', 'response_time', 'request_id', 'method', 'url', 'user_agent',
      'ip', 'country', 'city', 'device', 'browser', 'os', 'version', 'component',
      'environment', 'application', 'source', 'category', 'tags', 'metadata',
      'error_code', 'error_message', 'stack_trace', 'cause', 'context',
      'created_at', 'updated_at', 'deleted_at', 'expires_at', 'start_time', 'end_time',
      'duration', 'size', 'count', 'total', 'success', 'failure', 'retry_count',
      'parent_id', 'root_id', 'correlation_id', 'transaction_id', 'operation',
      'resource', 'action', 'target', 'actor', 'reason', 'result', 'outcome',
      'priority', 'urgency', 'impact', 'risk', 'threat', 'vulnerability',
      'compliance', 'regulation', 'policy', 'rule', 'condition', 'requirement',
      'metric', 'value', 'unit', 'type', 'format', 'encoding', 'schema',
      'namespace', 'cluster', 'node', 'pod', 'container', 'service_name',
      'deployment', 'replica', 'shard', 'partition', 'segment', 'bucket',
      'email', 'domain', 'username', 'firstname', 'lastname', 'fullname',
      'phone', 'address', 'postal_code', 'country_code', 'language', 'timezone',
      'latitude', 'longitude', 'altitude', 'accuracy', 'precision', 'heading',
      'speed', 'distance', 'area', 'volume', 'weight', 'height', 'width',
      'depth', 'thickness', 'diameter', 'radius', 'circumference', 'perimeter',
      'temperature', 'humidity', 'pressure', 'brightness', 'color', 'tone',
      'frequency', 'wavelength', 'amplitude', 'phase', 'angle', 'direction',
      'velocity', 'acceleration', 'force', 'energy', 'power', 'voltage', 'current',
      'resistance', 'capacitance', 'inductance', 'magnetic_field', 'electric_field',
      'charge', 'mass', 'density', 'concentration', 'pressure', 'viscosity',
      'flow_rate', 'rate', 'ratio', 'percentage', 'proportion', 'fraction',
      'score', 'rating', 'rank', 'position', 'index', 'offset', 'limit',
      'page', 'size', 'count', 'total', 'sum', 'average', 'min', 'max',
      'median', 'mode', 'stddev', 'variance', 'range', 'quartile', 'percentile',
      'histogram', 'distribution', 'probability', 'likelihood', 'odds', 'chance',
    ];
    
    defaultFields.forEach(field => this.allowedFields.add(field));
    
    // 默认允许的操作符
    const defaultOperators = [
      '=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'ILIKE', 'NOT LIKE', 'NOT ILIKE',
      'IN', 'NOT IN', 'IS', 'IS NOT', 'IS NULL', 'IS NOT NULL', 'BETWEEN', 'NOT BETWEEN',
      'AND', 'OR', 'NOT', 'EXISTS', 'NOT EXISTS', 'ANY', 'ALL', 'SOME', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
    ];
    
    defaultOperators.forEach(operator => this.allowedOperators.add(operator));
    
    this.logger.debug(`Initialized default whitelist with ${defaultFields.length} fields and ${defaultOperators.length} operators`);
  }

  /**
   * 从远端加载白名单
   */
  async loadWhitelistFromRemote(): Promise<void> {
    try {
      const schemaUrl = this.configService.get<string>('OPENOBSERVE_SCHEMA_URL');
      const authHeader = this.configService.get<string>('OPENOBSERVE_TOKEN');
      
      if (!schemaUrl) {
        this.logger.warn('OPENOBSERVE_SCHEMA_URL not configured, skipping remote whitelist loading');
        return;
      }
      
      this.logger.debug(`Loading whitelist from remote: ${schemaUrl}`);
      
      const headers: Record<string, string> = {};
      if (authHeader) {
        headers['Authorization'] = `Bearer ${authHeader}`;
      }
      
      const response = await axios.get(schemaUrl, {
        headers,
        timeout: 10000, // 10秒超时
      });
      
      if (response.data && response.data.fields) {
        this.allowedFields.clear();
        response.data.fields.forEach((field: string) => this.allowedFields.add(field));
        this.logger.log(`Loaded ${response.data.fields.length} fields from remote schema`);
      }
      
      if (response.data && response.data.operators) {
        this.allowedOperators.clear();
        response.data.operators.forEach((operator: string) => this.allowedOperators.add(operator));
        this.logger.log(`Loaded ${response.data.operators.length} operators from remote schema`);
      }
      
      this.lastUpdated = Date.now();
      
      // 记录环境切换提示
      const env = this.configService.get<string>('NODE_ENV', 'development');
      this.logger.log(`Field whitelist updated in ${env} environment at ${new Date().toISOString()}`);
      
    } catch (error) {
      this.logger.error('Failed to load whitelist from remote', error.message);
      
      // 记录可观测日志
      this.logWhitelistFailure(error);
      
      throw new OpenObserveError('Failed to load field whitelist from remote', 'WHITELIST_LOAD_ERROR');
    }
  }

  /**
   * 记录白名单加载失败的可观测日志
   */
  private logWhitelistFailure(error: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'whitelist_load_failure',
      error: {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
      },
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      service: 'openobserve',
      component: 'FieldWhitelistService',
    };
    
    this.logger.warn('Whitelist load failure observed', logEntry);
  }

  /**
   * 检查字段是否在白名单中
   */
  isFieldAllowed(field: string): boolean {
    // 检查缓存是否过期
    if (this.isCacheExpired()) {
      this.loadWhitelistFromRemote().catch(error => {
        this.logger.warn('Failed to refresh whitelist from remote', error.message);
      });
    }
    
    return this.allowedFields.has(field);
  }

  /**
   * 检查操作符是否在白名单中
   */
  isOperatorAllowed(operator: string): boolean {
    // 检查缓存是否过期
    if (this.isCacheExpired()) {
      this.loadWhitelistFromRemote().catch(error => {
        this.logger.warn('Failed to refresh whitelist from remote', error.message);
      });
    }
    
    return this.allowedOperators.has(operator.toUpperCase());
  }

  /**
   * 检查缓存是否过期
   */
  private isCacheExpired(): boolean {
    return Date.now() - this.lastUpdated > this.cacheTimeoutMs;
  }

  /**
   * 获取所有允许的字段
   */
  getAllowedFields(): string[] {
    return Array.from(this.allowedFields);
  }

  /**
   * 获取所有允许的操作符
   */
  getAllowedOperators(): string[] {
    return Array.from(this.allowedOperators);
  }

  /**
   * 手动添加字段到白名单
   */
  addFieldToWhitelist(field: string): void {
    this.allowedFields.add(field);
    this.logger.debug(`Added field to whitelist: ${field}`);
  }

  /**
   * 手动添加操作符到白名单
   */
  addOperatorToWhitelist(operator: string): void {
    this.allowedOperators.add(operator.toUpperCase());
    this.logger.debug(`Added operator to whitelist: ${operator}`);
  }

  /**
   * 从白名单中移除字段
   */
  removeFieldFromWhitelist(field: string): void {
    this.allowedFields.delete(field);
    this.logger.debug(`Removed field from whitelist: ${field}`);
  }

  /**
   * 从白名单中移除操作符
   */
  removeOperatorFromWhitelist(operator: string): void {
    this.allowedOperators.delete(operator.toUpperCase());
    this.logger.debug(`Removed operator from whitelist: ${operator}`);
  }

  /**
   * 获取白名单状态信息
   */
  getWhitelistStatus(): {
    fieldCount: number;
    operatorCount: number;
    lastUpdated: number;
    isCacheExpired: boolean;
    nextUpdateIn: number;
  } {
    return {
      fieldCount: this.allowedFields.size,
      operatorCount: this.allowedOperators.size,
      lastUpdated: this.lastUpdated,
      isCacheExpired: this.isCacheExpired(),
      nextUpdateIn: Math.max(0, this.cacheTimeoutMs - (Date.now() - this.lastUpdated)),
    };
  }

  /**
   * 刷新白名单（强制重新加载）
   */
  async refreshWhitelist(): Promise<void> {
    this.logger.log('Force refreshing field whitelist');
    await this.loadWhitelistFromRemote();
  }
}