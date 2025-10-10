/**
 * 用户行为分析服务
 * 处理和分析用户行为数据，提供洞察和报告
 */

const axios = require('axios');
const { EventEmitter } = require('events');

class UserBehaviorService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 统一环境适配器桥接（优先 dist，失败则回退 env/config）
    let adapterOO = null;
    try {
      const { getOpenObserve } = require('../config/environment-adapter.js');
      adapterOO = getOpenObserve();
    } catch (_) {}
    
    this.config = {
      openobserveUrl: (adapterOO && adapterOO.baseUrl) || (config.openobserveUrl || 'http://localhost:5080'),
      organization: (adapterOO && adapterOO.organization) || (config.organization || 'default'),
      token: (adapterOO && adapterOO.token) || (config.token || ''),
      userBehaviorStream: config.userBehaviorStream || 'user-behavior',
      businessEventsStream: config.businessEventsStream || 'business-events',
      analyticsRetention: config.analyticsRetention || '90d',
      enableRealTimeProcessing: config.enableRealTimeProcessing !== false,
      enableAggregation: config.enableAggregation !== false,
      aggregationInterval: config.aggregationInterval || 60000, // 1分钟
      ...config
    };
    
    this.isInitialized = false;
    this.aggregationTimer = null;
    this.cachedAnalytics = new Map();
    this.realTimeEvents = [];
    
    // 分析指标
    this.metrics = {
      activeUsers: new Set(),
      pageViews: 0,
      sessions: new Set(),
      conversions: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
      topPages: new Map(),
      userPaths: [],
      conversionFunnel: new Map()
    };
  }

  /**
   * 初始化用户行为分析服务
   */
  async initialize() {
    try {
      // 验证OpenObserve连接
      await this.verifyConnection();
      
      // 创建数据流
      await this.createStreams();
      
      // 启动实时处理
      if (this.config.enableRealTimeProcessing) {
        this.startRealTimeProcessing();
      }
      
      // 启动聚合处理
      if (this.config.enableAggregation) {
        this.startAggregationProcessing();
      }
      
      this.isInitialized = true;
      console.log('📊 用户行为分析服务已初始化');
      
    } catch (error) {
      console.error('用户行为分析服务初始化失败:', error);
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
   * 创建数据流
   */
  async createStreams() {
    const streams = [
      {
        name: this.config.userBehaviorStream,
        type: 'logs',
        retention: this.config.analyticsRetention,
        description: '用户行为数据'
      },
      {
        name: this.config.businessEventsStream,
        type: 'logs',
        retention: this.config.analyticsRetention,
        description: '业务事件数据'
      }
    ];

    for (const stream of streams) {
      try {
        await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
          stream,
          {
            headers: {
              'Authorization': `Bearer ${this.config.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`✅ 数据流创建成功: ${stream.name}`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`ℹ️ 数据流已存在: ${stream.name}`);
        } else {
          throw new Error(`创建数据流失败 ${stream.name}: ${error.message}`);
        }
      }
    }
  }

  /**
   * 处理用户行为事件
   */
  async processUserBehaviorEvent(event) {
    try {
      // 验证事件数据
      if (!this.validateEvent(event)) {
        throw new Error('无效的事件数据');
      }

      // 丰富事件数据
      const enrichedEvent = await this.enrichEvent(event);
      
      // 发送到OpenObserve
      await this.sendEvent(enrichedEvent);
      
      // 实时处理
      if (this.config.enableRealTimeProcessing) {
        this.processRealTimeEvent(enrichedEvent);
      }
      
      // 发出事件
      this.emit('userBehaviorEvent', enrichedEvent);
      
    } catch (error) {
      console.error('处理用户行为事件失败:', error);
      this.emit('error', error);
    }
  }

  /**
   * 验证事件数据
   */
  validateEvent(event) {
    const requiredFields = ['eventType', 'timestamp', 'sessionId'];
    
    for (const field of requiredFields) {
      if (!event[field]) {
        console.error(`缺少必需字段: ${field}`);
        return false;
      }
    }
    
    // 验证时间戳
    if (event.timestamp && typeof event.timestamp !== 'number') {
      console.error('无效的时间戳格式');
      return false;
    }
    
    return true;
  }

  /**
   * 丰富事件数据
   */
  async enrichEvent(event) {
    const enrichedEvent = {
      ...event,
      processedAt: Date.now(),
      serverTimestamp: new Date().toISOString(),
      geoLocation: await this.getGeoLocation(event),
      deviceInfo: this.getDeviceInfo(event),
      userAgent: this.parseUserAgent(event.userAgent)
    };
    
    return enrichedEvent;
  }

  /**
   * 发送事件到OpenObserve
   */
  async sendEvent(event) {
    const streamName = this.getStreamNameForEvent(event);
    
    await axios.post(
      `${this.config.openobserveUrl}/api/${this.config.organization}/${streamName}/_json`,
      { events: [event] },
      {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  /**
   * 获取事件对应的数据流
   */
  getStreamNameForEvent(event) {
    if (['conversion', 'custom_event'].includes(event.eventType)) {
      return this.config.businessEventsStream;
    }
    return this.config.userBehaviorStream;
  }

  /**
   * 获取地理位置信息
   */
  async getGeoLocation(event) {
    // 这里可以集成IP地理位置服务
    // 简化实现，返回默认值
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      timezone: event.timezone || 'Unknown'
    };
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo(event) {
    const userAgent = event.userAgent || '';
    
    return {
      isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
      isTablet: /iPad|Tablet/.test(userAgent),
      isDesktop: !/Mobile|Android|iPhone|iPad|Tablet/.test(userAgent),
      browser: this.extractBrowser(userAgent),
      os: this.extractOS(userAgent)
    };
  }

  /**
   * 解析用户代理
   */
  parseUserAgent(userAgent) {
    return {
      original: userAgent,
      browser: this.extractBrowser(userAgent),
      version: this.extractBrowserVersion(userAgent),
      os: this.extractOS(userAgent),
      device: this.extractDevice(userAgent)
    };
  }

  /**
   * 提取浏览器信息
   */
  extractBrowser(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * 提取浏览器版本
   */
  extractBrowserVersion(userAgent) {
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+\.\d+)/);
    return match ? match[2] : 'Unknown';
  }

  /**
   * 提取操作系统
   */
  extractOS(userAgent) {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * 提取设备信息
   */
  extractDevice(userAgent) {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('Mobile')) return 'Mobile';
    return 'Desktop';
  }

  /**
   * 启动实时处理
   */
  startRealTimeProcessing() {
    // 定期查询新的事件
    setInterval(async () => {
      try {
        await this.queryNewEvents();
      } catch (error) {
        console.error('查询新事件失败:', error);
      }
    }, 5000); // 每5秒查询一次
  }

  /**
   * 查询新事件
   */
  async queryNewEvents() {
    const lastQueryTime = this.lastQueryTime || (Date.now() - 60000);
    const currentTime = Date.now();
    
    const query = `
      SELECT * FROM ${this.config.userBehaviorStream} 
      WHERE timestamp >= ${lastQueryTime} AND timestamp < ${currentTime}
      ORDER BY timestamp DESC
      LIMIT 100
    `;
    
    try {
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
          start_time: new Date(lastQueryTime).toISOString(),
          end_time: new Date(currentTime).toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const events = response.data.hits || [];
      events.forEach(event => this.processRealTimeEvent(event));
      
      this.lastQueryTime = currentTime;
    } catch (error) {
      console.error('查询事件失败:', error);
    }
  }

  /**
   * 实时处理事件
   */
  processRealTimeEvent(event) {
    this.realTimeEvents.push(event);
    
    // 更新实时指标
    this.updateRealTimeMetrics(event);
    
    // 保持队列大小
    if (this.realTimeEvents.length > 1000) {
      this.realTimeEvents = this.realTimeEvents.slice(-500);
    }
  }

  /**
   * 更新实时指标
   */
  updateRealTimeMetrics(event) {
    switch (event.eventType) {
      case 'page_view':
        this.metrics.pageViews++;
        this.metrics.sessions.add(event.sessionId);
        if (event.userId) {
          this.metrics.activeUsers.add(event.userId);
        }
        
        // 更新热门页面
        const pageUrl = event.pageUrl;
        this.metrics.topPages.set(pageUrl, (this.metrics.topPages.get(pageUrl) || 0) + 1);
        break;
        
      case 'conversion':
        this.metrics.conversions++;
        break;
        
      case 'user_path':
        this.metrics.userPaths.push({
          sessionId: event.sessionId,
          action: event.action,
          target: event.target,
          timestamp: event.timestamp
        });
        break;
    }
  }

  /**
   * 启动聚合处理
   */
  startAggregationProcessing() {
    this.aggregationTimer = setInterval(async () => {
      try {
        await this.performAggregation();
      } catch (error) {
        console.error('聚合处理失败:', error);
      }
    }, this.config.aggregationInterval);
  }

  /**
   * 执行聚合处理
   */
  async performAggregation() {
    const endTime = Date.now();
    const startTime = endTime - this.config.aggregationInterval;
    
    // 聚合各种指标
    await this.aggregatePageViews(startTime, endTime);
    await this.aggregateUserSessions(startTime, endTime);
    await this.aggregateConversions(startTime, endTime);
    await this.aggregateUserPaths(startTime, endTime);
    
    // 清理缓存
    this.cleanCache();
  }

  /**
   * 聚合页面浏览数据
   */
  async aggregatePageViews(startTime, endTime) {
    const query = `
      SELECT 
        pageUrl,
        COUNT(*) as pageViews,
        COUNT(DISTINCT sessionId) as uniqueSessions,
        COUNT(DISTINCT userId) as uniqueUsers
      FROM ${this.config.userBehaviorStream}
      WHERE eventType = 'page_view' 
        AND timestamp >= ${startTime} 
        AND timestamp < ${endTime}
      GROUP BY pageUrl
      ORDER BY pageViews DESC
      LIMIT 20
    `;
    
    try {
      const response = await this.executeQuery(query);
      const cacheKey = `pageViews_${Math.floor(startTime / this.config.aggregationInterval)}`;
      this.cachedAnalytics.set(cacheKey, response.data.hits || []);
    } catch (error) {
      console.error('聚合页面浏览数据失败:', error);
    }
  }

  /**
   * 聚合用户会话数据
   */
  async aggregateUserSessions(startTime, endTime) {
    const query = `
      SELECT 
        sessionId,
        userId,
        MIN(timestamp) as sessionStart,
        MAX(timestamp) as sessionEnd,
        COUNT(*) as events,
        COUNT(DISTINCT pageUrl) as pageViews
      FROM ${this.config.userBehaviorStream}
      WHERE timestamp >= ${startTime} 
        AND timestamp < ${endTime}
      GROUP BY sessionId, userId
    `;
    
    try {
      const response = await this.executeQuery(query);
      const sessions = response.data.hits || [];
      
      // 计算平均会话时长
      const totalDuration = sessions.reduce((sum, session) => {
        return sum + (session.sessionEnd - session.sessionStart);
      }, 0);
      
      this.metrics.avgSessionDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;
      
      const cacheKey = `sessions_${Math.floor(startTime / this.config.aggregationInterval)}`;
      this.cachedAnalytics.set(cacheKey, sessions);
    } catch (error) {
      console.error('聚合用户会话数据失败:', error);
    }
  }

  /**
   * 聚合转化数据
   */
  async aggregateConversions(startTime, endTime) {
    const query = `
      SELECT 
        conversionType,
        COUNT(*) as conversions,
        SUM(conversionValue) as totalValue,
        COUNT(DISTINCT sessionId) as convertingSessions
      FROM ${this.config.businessEventsStream}
      WHERE eventType = 'conversion' 
        AND timestamp >= ${startTime} 
        AND timestamp < ${endTime}
      GROUP BY conversionType
    `;
    
    try {
      const response = await this.executeQuery(query);
      const conversions = response.data.hits || [];
      
      const cacheKey = `conversions_${Math.floor(startTime / this.config.aggregationInterval)}`;
      this.cachedAnalytics.set(cacheKey, conversions);
    } catch (error) {
      console.error('聚合转化数据失败:', error);
    }
  }

  /**
   * 聚合用户路径数据
   */
  async aggregateUserPaths(startTime, endTime) {
    const query = `
      SELECT 
        sessionId,
        action,
        target,
        timestamp
      FROM ${this.config.userBehaviorStream}
      WHERE eventType = 'user_path' 
        AND timestamp >= ${startTime} 
        AND timestamp < ${endTime}
      ORDER BY sessionId, timestamp
    `;
    
    try {
      const response = await this.executeQuery(query);
      const paths = response.data.hits || [];
      
      // 分析用户路径
      const pathAnalysis = this.analyzeUserPaths(paths);
      
      const cacheKey = `paths_${Math.floor(startTime / this.config.aggregationInterval)}`;
      this.cachedAnalytics.set(cacheKey, pathAnalysis);
    } catch (error) {
      console.error('聚合用户路径数据失败:', error);
    }
  }

  /**
   * 分析用户路径
   */
  analyzeUserPaths(paths) {
    const pathMap = new Map();
    
    paths.forEach(path => {
      const key = `${path.action} -> ${path.target}`;
      pathMap.set(key, (pathMap.get(key) || 0) + 1);
    });
    
    // 返回最热门的路径
    return Array.from(pathMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([path, count]) => ({ path, count }));
  }

  /**
   * 执行查询
   */
  async executeQuery(query) {
    return await axios.post(
      `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
      {
        query: { sql: query }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  /**
   * 获取实时分析数据
   */
  getRealTimeAnalytics() {
    return {
      timestamp: Date.now(),
      activeUsers: this.metrics.activeUsers.size,
      pageViews: this.metrics.pageViews,
      sessions: this.metrics.sessions.size,
      conversions: this.metrics.conversions,
      avgSessionDuration: this.metrics.avgSessionDuration,
      topPages: Array.from(this.metrics.topPages.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      recentEvents: this.realTimeEvents.slice(-20)
    };
  }

  /**
   * 获取聚合分析数据
   */
  async getAggregatedAnalytics(timeRange = '1h') {
    const endTime = Date.now();
    const startTime = endTime - this.parseTimeRange(timeRange);
    
    const analytics = {
      timeRange,
      startTime,
      endTime,
      pageViews: await this.getPageViewsAnalytics(startTime, endTime),
      userSessions: await this.getUserSessionsAnalytics(startTime, endTime),
      conversions: await this.getConversionsAnalytics(startTime, endTime),
      userPaths: await this.getUserPathsAnalytics(startTime, endTime)
    };
    
    return analytics;
  }

  /**
   * 获取页面浏览分析
   */
  async getPageViewsAnalytics(startTime, endTime) {
    const query = `
      SELECT 
        pageUrl,
        pageTitle,
        COUNT(*) as pageViews,
        COUNT(DISTINCT sessionId) as uniqueSessions,
        COUNT(DISTINCT userId) as uniqueUsers,
        AVG(timestamp) as avgTimestamp
      FROM ${this.config.userBehaviorStream}
      WHERE eventType = 'page_view' 
        AND timestamp >= ${startTime} 
        AND timestamp < ${endTime}
      GROUP BY pageUrl, pageTitle
      ORDER BY pageViews DESC
    `;
    
    try {
      const response = await this.executeQuery(query);
      return response.data.hits || [];
    } catch (error) {
      console.error('获取页面浏览分析失败:', error);
      return [];
    }
  }

  /**
   * 获取用户会话分析
   */
  async getUserSessionsAnalytics(startTime, endTime) {
    const query = `
      SELECT 
        sessionId,
        userId,
        MIN(timestamp) as sessionStart,
        MAX(timestamp) as sessionEnd,
        COUNT(*) as events,
        COUNT(DISTINCT pageUrl) as pageViews,
        MAX(scrollDepth) as maxScrollDepth
      FROM ${this.config.userBehaviorStream}
      WHERE timestamp >= ${startTime} 
        AND timestamp < ${endTime}
      GROUP BY sessionId, userId
      ORDER BY sessionStart DESC
    `;
    
    try {
      const response = await this.executeQuery(query);
      return response.data.hits || [];
    } catch (error) {
      console.error('获取用户会话分析失败:', error);
      return [];
    }
  }

  /**
   * 获取转化分析
   */
  async getConversionsAnalytics(startTime, endTime) {
    const query = `
      SELECT 
        conversionType,
        COUNT(*) as conversions,
        SUM(conversionValue) as totalValue,
        AVG(conversionValue) as avgValue,
        COUNT(DISTINCT sessionId) as convertingSessions,
        COUNT(DISTINCT userId) as convertingUsers
      FROM ${this.config.businessEventsStream}
      WHERE eventType = 'conversion' 
        AND timestamp >= ${startTime} 
        AND timestamp < ${endTime}
      GROUP BY conversionType
      ORDER BY conversions DESC
    `;
    
    try {
      const response = await this.executeQuery(query);
      return response.data.hits || [];
    } catch (error) {
      console.error('获取转化分析失败:', error);
      return [];
    }
  }

  /**
   * 获取用户路径分析
   */
  async getUserPathsAnalytics(startTime, endTime) {
    const query = `
      SELECT 
        sessionId,
        action,
        target,
        timestamp,
        metadata
      FROM ${this.config.userBehaviorStream}
      WHERE eventType = 'user_path' 
        AND timestamp >= ${startTime} 
        AND timestamp < ${endTime}
      ORDER BY sessionId, timestamp
    `;
    
    try {
      const response = await this.executeQuery(query);
      const paths = response.data.hits || [];
      return this.analyzeUserPaths(paths);
    } catch (error) {
      console.error('获取用户路径分析失败:', error);
      return [];
    }
  }

  /**
   * 解析时间范围
   */
  parseTimeRange(timeRange) {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    return ranges[timeRange] || ranges['1h'];
  }

  /**
   * 清理缓存
   */
  cleanCache() {
    const currentTime = Date.now();
    const maxAge = this.config.aggregationInterval * 10; // 保留10个时间窗口的数据
    
    for (const [key, data] of this.cachedAnalytics.entries()) {
      const timestamp = parseInt(key.split('_')[1]) * this.config.aggregationInterval;
      if (currentTime - timestamp > maxAge) {
        this.cachedAnalytics.delete(key);
      }
    }
  }

  /**
   * 停止服务
   */
  stop() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    
    this.isInitialized = false;
    console.log('📊 用户行为分析服务已停止');
  }
}

module.exports = UserBehaviorService;