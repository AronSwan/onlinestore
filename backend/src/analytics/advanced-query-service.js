/**
 * 高级查询服务
 * 提供复杂的数据查询、分析和聚合功能
 */

const axios = require('axios');
const { EventEmitter } = require('events');

class AdvancedQueryService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      openobserveUrl: config.openobserveUrl || 'http://localhost:5080',
      organization: config.organization || 'default',
      token: config.token || '',
      enableCaching: config.enableCaching !== false,
      cacheTimeout: config.cacheTimeout || 300000, // 5分钟
      maxQueryResults: config.maxQueryResults || 10000,
      queryTimeout: config.queryTimeout || 30000,
      enableQueryOptimization: config.enableQueryOptimization !== false,
      ...config
    };
    
    this.queryCache = new Map();
    this.queryHistory = [];
    this.queryTemplates = new Map();
    this.savedQueries = new Map();
    
    this.isInitialized = false;
    
    // 初始化查询模板
    this.initializeQueryTemplates();
  }

  /**
   * 初始化高级查询服务
   */
  async initialize() {
    try {
      // 验证OpenObserve连接
      await this.verifyConnection();
      
      // 加载保存的查询
      await this.loadSavedQueries();
      
      // 启动缓存清理
      if (this.config.enableCaching) {
        this.startCacheCleanup();
      }
      
      this.isInitialized = true;
      console.log('🔍 高级查询服务已初始化');
      
    } catch (error) {
      console.error('高级查询服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证OpenObserve连接
   */
  async verifyConnection() {
    const response = await axios.get(`${this.config.openobserveUrl}/health`, {
      timeout: 5000
    });
    
    if (response.status !== 200) {
      throw new Error(`OpenObserve连接失败: ${response.status}`);
    }
  }

  /**
   * 执行高级查询
   */
  async executeQuery(queryOptions) {
    const {
      query,
      streams = [],
      timeRange = { start: 'now-1h', end: 'now' },
      aggregation = {},
      filters = [],
      orderBy = [],
      limit = this.config.maxQueryResults,
      useCache = this.config.enableCaching
    } = queryOptions;

    try {
      // 生成查询缓存键
      const cacheKey = this.generateCacheKey(queryOptions);
      
      // 检查缓存
      if (useCache) {
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
          return cachedResult;
        }
      }

      // 构建查询
      const builtQuery = this.buildQuery(queryOptions);
      
      // 执行查询
      const result = await this.performQuery(builtQuery);
      
      // 应用聚合
      const aggregatedResult = this.applyAggregation(result, aggregation);
      
      // 缓存结果
      if (useCache) {
        this.setCache(cacheKey, aggregatedResult);
      }
      
      // 记录查询历史
      this.recordQuery(queryOptions, aggregatedResult);
      
      // 发出事件
      this.emit('queryExecuted', {
        query: queryOptions,
        result: aggregatedResult,
        timestamp: Date.now()
      });
      
      return aggregatedResult;
      
    } catch (error) {
      this.emit('queryError', {
        query: queryOptions,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * 构建查询
   */
  buildQuery(queryOptions) {
    const {
      query,
      streams,
      timeRange,
      filters,
      orderBy,
      limit
    } = queryOptions;

    let builtQuery = query;
    
    // 添加时间范围过滤
    if (timeRange) {
      const timeFilter = this.buildTimeFilter(timeRange);
      builtQuery = this.addFilterToQuery(builtQuery, timeFilter);
    }
    
    // 添加流过滤
    if (streams.length > 0) {
      const streamFilter = `stream IN (${streams.map(s => `'${s}'`).join(', ')})`;
      builtQuery = this.addFilterToQuery(builtQuery, streamFilter);
    }
    
    // 添加自定义过滤
    filters.forEach(filter => {
      const filterClause = this.buildFilterClause(filter);
      builtQuery = this.addFilterToQuery(builtQuery, filterClause);
    });
    
    // 添加排序
    if (orderBy.length > 0) {
      const orderClause = orderBy.map(order => `${order.field} ${order.direction}`).join(', ');
      builtQuery += ` ORDER BY ${orderClause}`;
    }
    
    // 添加限制
    if (limit) {
      builtQuery += ` LIMIT ${limit}`;
    }
    
    return builtQuery;
  }

  /**
   * 构建时间过滤
   */
  buildTimeFilter(timeRange) {
    if (typeof timeRange.start === 'string' && timeRange.start.startsWith('now')) {
      return `timestamp >= ${timeRange.start} AND timestamp <= ${timeRange.end}`;
    } else {
      const startTime = new Date(timeRange.start).getTime();
      const endTime = new Date(timeRange.end).getTime();
      return `timestamp >= ${startTime} AND timestamp <= ${endTime}`;
    }
  }

  /**
   * 构建过滤子句
   */
  buildFilterClause(filter) {
    const { field, operator, value } = filter;
    
    switch (operator) {
      case 'equals':
        return `${field} = '${value}'`;
      case 'not_equals':
        return `${field} != '${value}'`;
      case 'contains':
        return `${field} LIKE '%${value}%'`;
      case 'not_contains':
        return `${field} NOT LIKE '%${value}%'`;
      case 'greater_than':
        return `${field} > ${value}`;
      case 'less_than':
        return `${field} < ${value}`;
      case 'greater_equal':
        return `${field} >= ${value}`;
      case 'less_equal':
        return `${field} <= ${value}`;
      case 'in':
        return `${field} IN (${value.map(v => `'${v}'`).join(', ')})`;
      case 'not_in':
        return `${field} NOT IN (${value.map(v => `'${v}'`).join(', ')})`;
      case 'is_null':
        return `${field} IS NULL`;
      case 'is_not_null':
        return `${field} IS NOT NULL`;
      default:
        throw new Error(`不支持的过滤操作符: ${operator}`);
    }
  }

  /**
   * 添加过滤到查询
   */
  addFilterToQuery(query, filter) {
    if (query.includes('WHERE')) {
      return query.replace('WHERE', `WHERE ${filter} AND`);
    } else {
      return query.replace('FROM', `FROM WHERE ${filter}`);
    }
  }

  /**
   * 执行查询
   */
  async performQuery(query) {
    const response = await axios.post(
      `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
      {
        query: { sql: query },
        start_time: new Date(Date.now() - 3600000).toISOString(),
        end_time: new Date().toISOString()
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        timeout: this.config.queryTimeout
      }
    );
    
    return response.data;
  }

  /**
   * 应用聚合
   */
  applyAggregation(result, aggregation) {
    if (!aggregation || Object.keys(aggregation).length === 0) {
      return result;
    }

    const { type, field, groupBy, timeBucket } = aggregation;
    const data = result.hits || [];
    
    switch (type) {
      case 'sum':
        return this.aggregateSum(data, field, groupBy);
      case 'avg':
        return this.aggregateAvg(data, field, groupBy);
      case 'min':
        return this.aggregateMin(data, field, groupBy);
      case 'max':
        return this.aggregateMax(data, field, groupBy);
      case 'count':
        return this.aggregateCount(data, field, groupBy);
      case 'time_series':
        return this.aggregateTimeSeries(data, field, timeBucket);
      case 'percentile':
        return this.aggregatePercentile(data, field, aggregation.percentile || 50);
      default:
        return result;
    }
  }

  /**
   * 聚合求和
   */
  aggregateSum(data, field, groupBy) {
    if (!groupBy) {
      const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
      return { hits: [{ [field]: sum }] };
    }
    
    const grouped = {};
    data.forEach(item => {
      const key = item[groupBy];
      if (!grouped[key]) {
        grouped[key] = 0;
      }
      grouped[key] += item[field] || 0;
    });
    
    const hits = Object.entries(grouped).map(([key, value]) => ({
      [groupBy]: key,
      [field]: value
    }));
    
    return { hits };
  }

  /**
   * 聚合平均值
   */
  aggregateAvg(data, field, groupBy) {
    if (!groupBy) {
      const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
      const avg = sum / data.length;
      return { hits: [{ [field]: avg }] };
    }
    
    const grouped = {};
    data.forEach(item => {
      const key = item[groupBy];
      if (!grouped[key]) {
        grouped[key] = { sum: 0, count: 0 };
      }
      grouped[key].sum += item[field] || 0;
      grouped[key].count++;
    });
    
    const hits = Object.entries(grouped).map(([key, value]) => ({
      [groupBy]: key,
      [field]: value.sum / value.count
    }));
    
    return { hits };
  }

  /**
   * 聚合最小值
   */
  aggregateMin(data, field, groupBy) {
    if (!groupBy) {
      const min = Math.min(...data.map(item => item[field] || 0));
      return { hits: [{ [field]: min }] };
    }
    
    const grouped = {};
    data.forEach(item => {
      const key = item[groupBy];
      if (!grouped[key]) {
        grouped[key] = Infinity;
      }
      grouped[key] = Math.min(grouped[key], item[field] || 0);
    });
    
    const hits = Object.entries(grouped).map(([key, value]) => ({
      [groupBy]: key,
      [field]: value
    }));
    
    return { hits };
  }

  /**
   * 聚合最大值
   */
  aggregateMax(data, field, groupBy) {
    if (!groupBy) {
      const max = Math.max(...data.map(item => item[field] || 0));
      return { hits: [{ [field]: max }] };
    }
    
    const grouped = {};
    data.forEach(item => {
      const key = item[groupBy];
      if (!grouped[key]) {
        grouped[key] = -Infinity;
      }
      grouped[key] = Math.max(grouped[key], item[field] || 0);
    });
    
    const hits = Object.entries(grouped).map(([key, value]) => ({
      [groupBy]: key,
      [field]: value
    }));
    
    return { hits };
  }

  /**
   * 聚合计数
   */
  aggregateCount(data, field, groupBy) {
    if (!groupBy) {
      return { hits: [{ count: data.length }] };
    }
    
    const grouped = {};
    data.forEach(item => {
      const key = item[groupBy];
      if (!grouped[key]) {
        grouped[key] = 0;
      }
      grouped[key]++;
    });
    
    const hits = Object.entries(grouped).map(([key, value]) => ({
      [groupBy]: key,
      count: value
    }));
    
    return { hits };
  }

  /**
   * 聚合时间序列
   */
  aggregateTimeSeries(data, field, timeBucket) {
    const bucketSize = this.parseTimeBucket(timeBucket);
    const grouped = {};
    
    data.forEach(item => {
      const timestamp = item.timestamp || Date.now();
      const bucket = Math.floor(timestamp / bucketSize) * bucketSize;
      
      if (!grouped[bucket]) {
        grouped[bucket] = { sum: 0, count: 0 };
      }
      grouped[bucket].sum += item[field] || 0;
      grouped[bucket].count++;
    });
    
    const hits = Object.entries(grouped).map(([timestamp, value]) => ({
      timestamp: parseInt(timestamp),
      [field]: value.sum / value.count
    })).sort((a, b) => a.timestamp - b.timestamp);
    
    return { hits };
  }

  /**
   * 聚合百分位数
   */
  aggregatePercentile(data, field, percentile) {
    const values = data.map(item => item[field] || 0).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    const value = values[Math.max(0, index)];
    
    return { hits: [{ [field]: value, percentile }] };
  }

  /**
   * 解析时间桶大小
   */
  parseTimeBucket(timeBucket) {
    const buckets = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    
    return buckets[timeBucket] || buckets['1h'];
  }

  /**
   * 创建查询模板
   */
  createQueryTemplate(name, template, description = '') {
    const queryTemplate = {
      name,
      description,
      template,
      parameters: this.extractParameters(template),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.queryTemplates.set(name, queryTemplate);
    return queryTemplate;
  }

  /**
   * 提取查询参数
   */
  extractParameters(template) {
    const parameterRegex = /\{\{(\w+)\}\}/g;
    const parameters = [];
    let match;
    
    while ((match = parameterRegex.exec(template)) !== null) {
      parameters.push({
        name: match[1],
        type: 'string',
        required: true
      });
    }
    
    return parameters;
  }

  /**
   * 使用查询模板
   */
  useQueryTemplate(name, parameters = {}) {
    const template = this.queryTemplates.get(name);
    if (!template) {
      throw new Error(`查询模板不存在: ${name}`);
    }
    
    let query = template.template;
    
    // 替换参数
    Object.entries(parameters).forEach(([key, value]) => {
      query = query.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    
    return query;
  }

  /**
   * 保存查询
   */
  async saveQuery(name, queryOptions, description = '') {
    const savedQuery = {
      name,
      description,
      queryOptions,
      createdAt: Date.now(),
      updatedAt: Date.now
    };
    
    this.savedQueries.set(name, savedQuery);
    
    // 发出事件
    this.emit('querySaved', savedQuery);
    
    return savedQuery;
  }

  /**
   * 获取保存的查询
   */
  getSavedQuery(name) {
    return this.savedQueries.get(name);
  }

  /**
   * 获取所有保存的查询
   */
  getAllSavedQueries() {
    return Array.from(this.savedQueries.values());
  }

  /**
   * 删除保存的查询
   */
  deleteSavedQuery(name) {
    const deleted = this.savedQueries.delete(name);
    if (deleted) {
      this.emit('queryDeleted', { name, timestamp: Date.now() });
    }
    return deleted;
  }

  /**
   * 执行保存的查询
   */
  async executeSavedQuery(name, overrides = {}) {
    const savedQuery = this.getSavedQuery(name);
    if (!savedQuery) {
      throw new Error(`保存的查询不存在: ${name}`);
    }
    
    const queryOptions = { ...savedQuery.queryOptions, ...overrides };
    return await this.executeQuery(queryOptions);
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(queryOptions) {
    const key = JSON.stringify(queryOptions);
    return Buffer.from(key).toString('base64');
  }

  /**
   * 从缓存获取
   */
  getFromCache(key) {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.data;
    }
    
    if (cached) {
      this.queryCache.delete(key);
    }
    
    return null;
  }

  /**
   * 设置缓存
   */
  setCache(key, data) {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 启动缓存清理
   */
  startCacheCleanup() {
    setInterval(() => {
      this.cleanCache();
    }, this.config.cacheTimeout);
  }

  /**
   * 清理过期缓存
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp > this.config.cacheTimeout) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * 记录查询历史
   */
  recordQuery(queryOptions, result) {
    const historyEntry = {
      queryOptions,
      resultCount: result.hits?.length || 0,
      timestamp: Date.now()
    };
    
    this.queryHistory.unshift(historyEntry);
    
    // 保持历史记录大小
    if (this.queryHistory.length > 1000) {
      this.queryHistory = this.queryHistory.slice(0, 500);
    }
  }

  /**
   * 获取查询历史
   */
  getQueryHistory(limit = 100) {
    return this.queryHistory.slice(0, limit);
  }

  /**
   * 获取查询统计
   */
  getQueryStats() {
    const totalQueries = this.queryHistory.length;
    const recentQueries = this.queryHistory.filter(q => 
      Date.now() - q.timestamp < 3600000 // 最近1小时
    );
    
    const avgResultCount = totalQueries > 0 
      ? this.queryHistory.reduce((sum, q) => sum + q.resultCount, 0) / totalQueries
      : 0;
    
    return {
      totalQueries,
      recentQueries: recentQueries.length,
      avgResultCount,
      cacheSize: this.queryCache.size,
      savedQueries: this.savedQueries.size,
      queryTemplates: this.queryTemplates.size
    };
  }

  /**
   * 初始化查询模板
   */
  initializeQueryTemplates() {
    // 页面浏览统计模板
    this.createQueryTemplate(
      'page_view_stats',
      `SELECT pageUrl, COUNT(*) as page_views FROM {{stream}} WHERE timestamp >= {{startTime}} AND timestamp <= {{endTime}} GROUP BY pageUrl ORDER BY page_views DESC LIMIT {{limit}}`,
      '页面浏览统计查询模板'
    );
    
    // 用户会话分析模板
    this.createQueryTemplate(
      'user_session_analysis',
      `SELECT sessionId, MIN(timestamp) as session_start, MAX(timestamp) as session_end, COUNT(*) as events FROM {{stream}} WHERE timestamp >= {{startTime}} AND timestamp <= {{endTime}} GROUP BY sessionId ORDER BY session_start DESC LIMIT {{limit}}`,
      '用户会话分析查询模板'
    );
    
    // 错误分析模板
    this.createQueryTemplate(
      'error_analysis',
      `SELECT level, COUNT(*) as error_count FROM {{stream}} WHERE level = 'ERROR' AND timestamp >= {{startTime}} AND timestamp <= {{endTime}} GROUP BY level ORDER BY error_count DESC`,
      '错误分析查询模板'
    );
    
    // 性能分析模板
    this.createQueryTemplate(
      'performance_analysis',
      `SELECT AVG(duration) as avg_duration, percentile_cont(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration FROM {{stream}} WHERE timestamp >= {{startTime}} AND timestamp <= {{endTime}}`,
      '性能分析查询模板'
    );
    
    // 转化漏斗分析模板
    this.createQueryTemplate(
      'conversion_funnel',
      `SELECT conversionType, COUNT(*) as conversions, SUM(conversionValue) as total_value FROM {{stream}} WHERE eventType = 'conversion' AND timestamp >= {{startTime}} AND timestamp <= {{endTime}} GROUP BY conversionType ORDER BY conversions DESC`,
      '转化漏斗分析查询模板'
    );
  }

  /**
   * 加载保存的查询
   */
  async loadSavedQueries() {
    // 这里可以从文件或数据库加载保存的查询
    // 简化实现，使用内存存储
    console.log('📝 已加载保存的查询');
  }

  /**
   * 导出查询结果
   */
  async exportQueryResult(queryOptions, format = 'json') {
    const result = await this.executeQuery(queryOptions);
    
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'csv':
        return this.convertToCSV(result.hits || []);
      case 'xlsx':
        return this.convertToExcel(result.hits || []);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 转换为CSV
   */
  convertToCSV(data) {
    if (data.length === 0) {
      return '';
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * 转换为Excel
   */
  convertToExcel(data) {
    // 这里需要实现Excel转换逻辑
    // 简化实现，返回JSON格式
    return JSON.stringify(data, null, 2);
  }

  /**
   * 停止服务
   */
  stop() {
    this.queryCache.clear();
    this.queryHistory = [];
    this.queryTemplates.clear();
    this.savedQueries.clear();
    
    this.isInitialized = false;
    console.log('🔍 高级查询服务已停止');
  }
}

module.exports = AdvancedQueryService;