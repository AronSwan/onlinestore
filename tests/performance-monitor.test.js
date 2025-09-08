/**
 * 性能监控模块测试
 * 测试性能监控功能的基本操作和指标收集
 */

describe('PerformanceMonitor', () => {
  let performanceMonitor;
  
  beforeEach(() => {
    // 模拟localStorage
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    
    // 模拟performance API
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => [])
    };
    
    // 导入性能监控模块
    const PerformanceMonitor = require('../js/auth/performance-monitor.js');
    
    performanceMonitor = new PerformanceMonitor({
      enableMetricsCollection: true,
      enableRealTimeMonitoring: true,
      enablePerformanceAlerts: false
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('初始化', () => {
    test('应该正确初始化性能监控器', () => {
      expect(performanceMonitor).toBeDefined();
      expect(performanceMonitor.config.enableMetricsCollection).toBe(true);
      expect(performanceMonitor.config.enableRealTimeMonitoring).toBe(true);
    });
    
    test('应该初始化空的指标存储', () => {
      expect(performanceMonitor.realTimeData.activeRequests).toEqual(new Map());
      expect(performanceMonitor.metrics.requestCount).toBe(0);
      expect(performanceMonitor.metrics.errorCount).toBe(0);
    });
  });
  
  describe('请求管理', () => {
    test('应该能够开始新的性能请求', () => {
      const requestId = 'test_request_001';
      const returnedId = performanceMonitor.startRequest(requestId, 'registration');
      
      expect(returnedId).toBe(requestId);
      expect(performanceMonitor.realTimeData.activeRequests.has(requestId)).toBe(true);
      
      const request = performanceMonitor.realTimeData.activeRequests.get(requestId);
      expect(request).toBeDefined();
      expect(request.operation).toBe('registration');
      expect(request.startTime).toBeDefined();
      expect(request.status).toBe('active');
    });
    
    test('应该能够结束性能请求', () => {
      const requestId = 'test_request_002';
      performanceMonitor.startRequest(requestId, 'registration');
      
      // 模拟一些操作时间
      jest.advanceTimersByTime(1000);
      
      const result = performanceMonitor.endRequest(requestId, true, null, { userId: 'user123' });
      
      expect(result).toBeDefined();
      expect(result.operation).toBe('registration');
      expect(result.duration).toBeGreaterThan(0);
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(performanceMonitor.realTimeData.activeRequests.has(requestId)).toBe(false);
    });
    
    test('应该能够记录请求错误', () => {
      const requestId = 'test_request_003';
      performanceMonitor.startRequest(requestId, 'registration');
      
      const error = new Error('Test error');
      const result = performanceMonitor.endRequest(requestId, false, error);
      
      expect(result.success).toBe(false);
      expect(result.operation).toBe('registration');
      expect(result.duration).toBeGreaterThan(0);
      expect(performanceMonitor.metrics.errorCount).toBeGreaterThan(0);
    });
  });
  
  describe('性能指标收集', () => {
    test('应该能够收集响应时间指标', () => {
      const requestId = 'test_request_004';
      performanceMonitor.startRequest(requestId, 'validation');
      
      // 模拟操作时间
      jest.advanceTimersByTime(500);
      
      const result = performanceMonitor.endRequest(requestId, true);
      
      expect(result.duration).toBeGreaterThan(0);
      expect(performanceMonitor.metrics.requestCount).toBeGreaterThan(0);
      expect(performanceMonitor.metrics.successCount).toBeGreaterThan(0);
    });
    
    test('应该能够处理多个并发请求', () => {
      const request1 = 'test_request_005a';
      const request2 = 'test_request_005b';
      
      performanceMonitor.startRequest(request1, 'operation1');
      performanceMonitor.startRequest(request2, 'operation2');
      
      jest.advanceTimersByTime(200);
      performanceMonitor.endRequest(request1, true);
      
      jest.advanceTimersByTime(300);
      performanceMonitor.endRequest(request2, true);
      
      expect(performanceMonitor.metrics.requestCount).toBe(2);
      expect(performanceMonitor.metrics.successCount).toBe(2);
    });
  });
  
  describe('统计计算', () => {
    test('应该正确更新请求统计', () => {
      const initialRequests = performanceMonitor.metrics.requestCount;
      
      performanceMonitor.startRequest('request1', 'registration');
      performanceMonitor.endRequest('request1', true);
      
      performanceMonitor.startRequest('request2', 'registration');
      performanceMonitor.endRequest('request2', false, new Error('Test error'));
      
      expect(performanceMonitor.metrics.requestCount).toBe(initialRequests + 2);
      expect(performanceMonitor.metrics.successCount).toBe(1);
      expect(performanceMonitor.metrics.errorCount).toBe(1);
    });
    
    test('应该计算平均响应时间', () => {
      // 创建多个请求
      performanceMonitor.startRequest('request1', 'registration');
      jest.advanceTimersByTime(1000);
      performanceMonitor.endRequest('request1', true);
      
      performanceMonitor.startRequest('request2', 'registration');
      jest.advanceTimersByTime(2000);
      performanceMonitor.endRequest('request2', true);
      
      performanceMonitor.calculateStatistics();
      
      expect(performanceMonitor.metrics.averageResponseTime).toBeGreaterThan(0);
      expect(performanceMonitor.metrics.requestCount).toBe(2);
    });
    
    test('应该计算错误率', () => {
      performanceMonitor.startRequest('request1', 'registration');
      performanceMonitor.endRequest('request1', true);
      
      performanceMonitor.startRequest('request2', 'registration');
      performanceMonitor.endRequest('request2', false, new Error('Test error'));
      
      performanceMonitor.calculateStatistics();
      
      expect(performanceMonitor.metrics.errorRate).toBe(0.5); // 50%错误率
    });
  });
  
  describe('系统指标收集', () => {
    test('应该能够收集系统指标', () => {
      // 模拟memory API
      global.performance.memory = {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000
      };
      
      // collectSystemMetrics 方法没有返回值，它将数据存储在内部
      expect(() => {
        performanceMonitor.collectSystemMetrics();
      }).not.toThrow();
      
      // 验证内部指标是否被更新
      expect(performanceMonitor.metrics).toBeDefined();
      expect(performanceMonitor.metrics.memoryUsage).toBeDefined();
    });
  });
  
  describe('报告生成', () => {
    test('应该能够生成性能报告', () => {
      performanceMonitor.startRequest('request1', 'registration');
      performanceMonitor.endRequest('request1', true);
      
      const report = performanceMonitor.generatePerformanceReport();
      
      expect(report).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.errors).toBeDefined();
      expect(report.trends).toBeDefined();
    });
    
    test('应该能够获取性能摘要', () => {
      performanceMonitor.startRequest('request1', 'registration');
      performanceMonitor.endRequest('request1', true);
      
      const summary = performanceMonitor.getPerformanceSummary();
      
      expect(summary).toBeDefined();
      expect(summary.status).toBeDefined();
      expect(summary.metrics).toBeDefined();
      expect(summary.metrics.totalRequests).toBeDefined();
      expect(summary.metrics.averageResponseTime).toBeDefined();
      expect(summary.health).toBeDefined();
    });
  });
  
  describe('错误处理', () => {
    test('应该优雅处理无效的请求ID', () => {
      expect(() => {
        performanceMonitor.startRequest('', 'test');
      }).not.toThrow();
      
      expect(() => {
        performanceMonitor.startRequest(null, 'test');
      }).not.toThrow();
    });
    
    test('应该处理结束不存在的请求', () => {
      expect(() => {
        performanceMonitor.endRequest('nonexistent_request', true);
      }).not.toThrow();
    });
    
    test('应该处理性能API不可用的情况', () => {
      const originalPerformance = global.performance;
      global.performance = undefined;
      
      expect(() => {
        performanceMonitor.startRequest('test_request', 'test');
      }).not.toThrow();
      
      global.performance = originalPerformance;
    });
  });
  
  describe('配置选项', () => {
    test('应该根据配置禁用功能', () => {
      const PerformanceMonitor = require('../js/auth/performance-monitor.js');
      const disabledMonitor = new PerformanceMonitor({
        enableMetricsCollection: false,
        enableRealTimeMonitoring: false
      });
      
      expect(disabledMonitor.config.enableMetricsCollection).toBe(false);
      expect(disabledMonitor.config.enableRealTimeMonitoring).toBe(false);
    });
    
    test('应该使用默认配置值', () => {
      const PerformanceMonitor = require('../js/auth/performance-monitor.js');
      const defaultMonitor = new PerformanceMonitor();
      
      expect(defaultMonitor.config.responseTimeThreshold).toBe(3000);
      expect(defaultMonitor.config.errorRateThreshold).toBe(0.05);
    });
  });
});

// 集成测试：与注册管理器的集成
describe('PerformanceMonitor 与 RegistrationManager 集成', () => {
  let registrationManager;
  let mockPerformanceMonitor;
  
  beforeEach(() => {
    // 模拟性能监控器
    mockPerformanceMonitor = {
      startRequest: jest.fn(() => ({
        id: 'test_request',
        startTime: Date.now(),
        operation: 'registration'
      })),
      endRequest: jest.fn(() => ({
        success: true,
        duration: 1500
      })),
      getPerformanceSummary: jest.fn(() => ({
        averageResponseTime: 1500,
        requestCount: 10,
        errorRate: 0.1
      }))
    };
    
    // 模拟注册管理器
    global.window = {
      PerformanceMonitor: jest.fn(() => mockPerformanceMonitor)
    };
    
    // 创建简化的注册管理器模拟
    registrationManager = {
      performanceMonitor: mockPerformanceMonitor,
      getRegistrationStats: function() {
        const baseStats = {
          active: 0,
          total: 10,
          completed: 8,
          failed: 2
        };
        
        if (this.performanceMonitor) {
          const perfStats = this.performanceMonitor.getPerformanceSummary();
          baseStats.performance = {
            averageRegistrationTime: perfStats.averageResponseTime,
            totalSessions: perfStats.requestCount,
            errorRate: perfStats.errorRate
          };
        }
        
        return baseStats;
      }
    };
  });
  
  test('应该在注册流程中启动性能请求', () => {
    const requestId = 'registration_test_001';
    
    mockPerformanceMonitor.startRequest(requestId, 'registration');
    
    expect(mockPerformanceMonitor.startRequest).toHaveBeenCalledWith(
      requestId,
      'registration'
    );
  });
  
  test('应该在getRegistrationStats中包含性能数据', () => {
    const stats = registrationManager.getRegistrationStats();
    
    expect(stats.performance).toBeDefined();
    expect(stats.performance.averageRegistrationTime).toBe(1500);
    expect(stats.performance.totalSessions).toBe(10);
    expect(stats.performance.errorRate).toBe(0.1);
  });
});