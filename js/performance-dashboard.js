/* global Utils */
/**
 * 性能监控仪表板
 * 提供性能数据的可视化展示和实时监控界面
 * 支持实时数据更新、图表展示、性能指标分析和报告导出
 *
 * @class PerformanceDashboard
 * @description 集成性能监控数据的可视化仪表板，提供直观的性能分析界面
 */
class PerformanceDashboard {
  /**
     * 创建性能监控仪表板实例
     *
     * @param {PerformanceMonitor} performanceMonitor - 性能监控器实例
     * @param {Object} [options={}] - 仪表板配置选项
     * @param {string} [options.containerId='performance-dashboard'] - 仪表板容器ID
     * @param {number} [options.updateInterval=5000] - 数据更新间隔(毫秒)
     * @param {boolean} [options.showCharts=true] - 是否显示图表
     * @param {boolean} [options.showAlerts=true] - 是否显示警告
     * @param {number} [options.maxDataPoints=50] - 历史数据最大保存点数
     */
  constructor(performanceMonitor, options = {}) {
    /** @type {PerformanceMonitor} 关联的性能监控器实例 */
    this.monitor = performanceMonitor;

    // 使用统一配置模块
    const config = window.config?.getModule('performanceDashboard') || window.CONSTANTS?.PERFORMANCE_DASHBOARD || {};

    /** @type {Object} 仪表板配置选项 */
    this.options = {
      containerId: config.containerId || window.DOM_SELECTORS?.PERFORMANCE_DASHBOARD_CONTAINER || 'performance-dashboard',  // 仪表板DOM容器ID
      updateInterval: config.updateInterval || window.MAGIC_NUMBERS?.PERFORMANCE_UPDATE_INTERVAL || 5000,              // 数据更新间隔（毫秒）
      showCharts: typeof config.showCharts !== 'undefined' ? config.showCharts : true,  // 是否显示性能图表
      showAlerts: typeof config.showAlerts !== 'undefined' ? config.showAlerts : true,  // 是否显示性能警告
      maxDataPoints: config.maxDataPoints || window.MAGIC_NUMBERS?.MAX_DATA_POINTS || 50,                  // 历史数据最大保存点数
      ...options
    };

    /** @type {HTMLElement|null} 仪表板主容器DOM元素 */
    this.container = null;

    /** @type {Object} 图表实例集合 */
    this.charts = {};

    /** @type {number|null} 定时更新器ID */
    this.updateTimer = null;

    /** @type {boolean} 仪表板是否可见 */
    this.isVisible = false;

    /** @type {Object} 历史性能数据存储 */
    this.historicalData = {
      pageLoad: [],    // 页面加载时间历史数据
      errors: [],      // 错误记录历史数据
      resources: [],   // 资源加载历史数据
      vitals: []       // 核心性能指标历史数据
    };

    // 初始化仪表板
    this.init();
  }

  /**
     * 初始化仪表板
     * 创建界面、绑定事件、启动数据更新
     * @private
     */
  init() {
    // 创建仪表板DOM结构
    this.createDashboard();

    // 绑定用户交互事件
    this.bindEvents();

    // 启动定时数据更新
    this.startUpdating();
  }

  /**
     * 创建仪表板界面
     * 构建完整的仪表板DOM结构并添加到页面中
     * @private
     */
  createDashboard() {
    // 创建仪表板主容器元素
    this.container = document.createElement('div');
    this.container.id = this.options.containerId;
    this.container.className = 'performance-dashboard';

    // 设置仪表板的HTML内容结构
    const dashboardHTML = this.getDashboardHTML();
    Utils.setElementHTML(this.container, dashboardHTML, true); // 内部生成的安全HTML

    // 添加仪表板专用CSS样式
    this.addStyles();

    // 默认隐藏仪表板，等待用户主动打开
    this.container.style.display = 'none';
    document.body.appendChild(this.container);

    // 绑定仪表板内部控件的事件处理
    this.bindInternalEvents();
  }

  /**
     * 获取仪表板的HTML模板
     * 生成完整的仪表板界面结构，包括头部控制区和内容展示区
     *
     * @returns {string} 仪表板的HTML字符串
     * @private
     */
  getDashboardHTML() {
    return `
            <div class="dashboard-header">
                <h3>性能监控仪表板</h3>
                <div class="dashboard-controls">
                    <button id="refresh-btn" class="btn btn-primary">刷新</button>
                    <button id="clear-btn" class="btn btn-secondary">清除数据</button>
                    <button id="export-btn" class="btn btn-info">导出报告</button>
                    <button id="close-btn" class="btn btn-close">×</button>
                </div>
            </div>
            
            <div class="dashboard-content">
                <!-- 性能概览 -->
                <div class="performance-overview">
                    <div class="metric-card">
                        <h4>页面加载时间</h4>
                        <div class="metric-value" id="load-time">--</div>
                        <div class="metric-unit">ms</div>
                    </div>
                    <div class="metric-card">
                        <h4>性能评分</h4>
                        <div class="metric-value" id="performance-score">--</div>
                        <div class="metric-unit">/100</div>
                    </div>
                    <div class="metric-card">
                        <h4>错误数量</h4>
                        <div class="metric-value" id="error-count">--</div>
                        <div class="metric-unit">个</div>
                    </div>
                    <div class="metric-card">
                        <h4>内存使用</h4>
                        <div class="metric-value" id="memory-usage">--</div>
                        <div class="metric-unit">MB</div>
                    </div>
                </div>

                <!-- Web Vitals -->
                <div class="vitals-section">
                    <h4>Core Web Vitals</h4>
                    <div class="vitals-grid">
                        <div class="vital-item">
                            <span class="vital-label">LCP</span>
                            <span class="vital-value" id="lcp-value">--</span>
                            <span class="vital-status" id="lcp-status"></span>
                        </div>
                        <div class="vital-item">
                            <span class="vital-label">FID</span>
                            <span class="vital-value" id="fid-value">--</span>
                            <span class="vital-status" id="fid-status"></span>
                        </div>
                        <div class="vital-item">
                            <span class="vital-label">CLS</span>
                            <span class="vital-value" id="cls-value">--</span>
                            <span class="vital-status" id="cls-status"></span>
                        </div>
                    </div>
                </div>

                <!-- 图表区域 -->
                <div class="charts-section">
                    <div class="chart-container">
                        <h4>页面加载时间趋势</h4>
                        <canvas id="load-time-chart" width="400" height="200"></canvas>
                    </div>
                    <div class="chart-container">
                        <h4>资源加载分析</h4>
                        <canvas id="resource-chart" width="400" height="200"></canvas>
                    </div>
                </div>

                <!-- 错误列表 -->
                <div class="errors-section">
                    <h4>最近错误</h4>
                    <div class="error-list" id="error-list">
                        <div class="no-errors">暂无错误</div>
                    </div>
                </div>

                <!-- 资源列表 -->
                <div class="resources-section">
                    <h4>慢资源 (>1s)</h4>
                    <div class="resource-list" id="resource-list">
                        <div class="no-resources">暂无慢资源</div>
                    </div>
                </div>

                <!-- 用户行为 -->
                <div class="behavior-section">
                    <h4>用户行为统计</h4>
                    <div class="behavior-stats" id="behavior-stats">
                        <div class="stat-item">
                            <span class="stat-label">点击次数:</span>
                            <span class="stat-value" id="click-count">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">滚动次数:</span>
                            <span class="stat-value" id="scroll-count">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">页面停留:</span>
                            <span class="stat-value" id="stay-time">0s</span>
                        </div>
                    </div>
                </div>

                <!-- 用户行为分析 -->
                <div class="behavior-analysis-section">
                    <h4>用户行为分析</h4>
                    <div id="behavior-analysis">
                        <div class="behavior-analysis-stats">
                            <div class="analysis-stat-item">
                                <span class="analysis-stat-label">参与度评分:</span>
                                <span class="analysis-stat-value" id="engagement-score">--</span>
                            </div>
                            <div class="analysis-stat-item">
                                <span class="analysis-stat-label">页面停留时间:</span>
                                <span class="analysis-stat-value" id="time-on-page">--</span>
                            </div>
                            <div class="analysis-stat-item">
                                <span class="analysis-stat-label">总交互次数:</span>
                                <span class="analysis-stat-value" id="total-interactions">--</span>
                            </div>
                            <div class="analysis-stat-item">
                                <span class="analysis-stat-label">滚动深度:</span>
                                <span class="analysis-stat-value" id="scroll-depth">--</span>
                            </div>
                        </div>
                        <div class="behavior-breakdown">
                            <h5>交互类型分布</h5>
                            <div id="interaction-breakdown"></div>
                        </div>
                        <div class="behavior-patterns">
                            <h5>行为模式</h5>
                            <div id="behavior-patterns"></div>
                        </div>
                    </div>
                </div>

                <!-- 性能建议 -->
                <div class="suggestions-section">
                    <h4>性能优化建议</h4>
                    <div class="suggestions-list" id="suggestions-list">
                        <div class="no-suggestions">暂无建议</div>
                    </div>
                </div>
            </div>
        `;
  }

  /**
     * 添加仪表板专用CSS样式
     * 创建并注入仪表板界面所需的完整样式表
     * @private
     */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
            .performance-dashboard {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 800px;
                max-height: 90vh;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                overflow: hidden;
            }

            .dashboard-header {
                background: #f8f9fa;
                padding: 15px 20px;
                border-bottom: 1px solid #dee2e6;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .dashboard-header h3 {
                margin: 0;
                color: #333;
                font-size: 18px;
            }

            .dashboard-controls {
                display: flex;
                gap: 8px;
            }

            .btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s;
            }

            .btn-primary { background: #007bff; color: white; }
            .btn-primary:hover { background: #0056b3; }
            .btn-secondary { background: #6c757d; color: white; }
            .btn-secondary:hover { background: #545b62; }
            .btn-info { background: #17a2b8; color: white; }
            .btn-info:hover { background: #117a8b; }
            .btn-close { background: #dc3545; color: white; width: 30px; height: 30px; }
            .btn-close:hover { background: #c82333; }

            .dashboard-content {
                padding: 20px;
                max-height: calc(90vh - 80px);
                overflow-y: auto;
            }

            .performance-overview {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                margin-bottom: 25px;
            }

            .metric-card {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                text-align: center;
                border: 1px solid #e9ecef;
            }

            .metric-card h4 {
                margin: 0 0 10px 0;
                font-size: 12px;
                color: #6c757d;
                text-transform: uppercase;
            }

            .metric-value {
                font-size: 24px;
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }

            .metric-unit {
                font-size: 12px;
                color: #6c757d;
            }

            .vitals-section {
                margin-bottom: 25px;
            }

            .vitals-section h4 {
                margin: 0 0 15px 0;
                color: #333;
            }

            .vitals-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
            }

            .vital-item {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border: 1px solid #e9ecef;
            }

            .vital-label {
                font-weight: bold;
                color: #333;
            }

            .vital-value {
                font-size: 18px;
                font-weight: bold;
            }

            .vital-status {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #28a745;
            }

            .vital-status.warning { background: #ffc107; }
            .vital-status.danger { background: #dc3545; }

            .charts-section {
                margin-bottom: 25px;
            }

            .chart-container {
                margin-bottom: 20px;
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                border: 1px solid #e9ecef;
            }

            .chart-container h4 {
                margin: 0 0 15px 0;
                color: #333;
            }

            .errors-section, .resources-section, .behavior-section, .suggestions-section {
                margin-bottom: 25px;
            }

            .errors-section h4, .resources-section h4, .behavior-section h4, .suggestions-section h4 {
                margin: 0 0 15px 0;
                color: #333;
            }

            .error-list, .resource-list {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                max-height: 200px;
                overflow-y: auto;
            }

            .error-item, .resource-item {
                padding: 10px 15px;
                border-bottom: 1px solid #e9ecef;
            }

            .error-item:last-child, .resource-item:last-child {
                border-bottom: none;
            }

            .error-type {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: bold;
                text-transform: uppercase;
                margin-right: 8px;
            }

            .error-type.javascript { background: #dc3545; color: white; }
            .error-type.promise { background: #ffc107; color: black; }
            .error-type.resource { background: #17a2b8; color: white; }

            .error-message {
                color: #333;
                margin-bottom: 5px;
            }

            .error-details {
                font-size: 12px;
                color: #6c757d;
            }

            .behavior-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
            }

            .stat-item {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                border: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
            }

            .stat-label {
                color: #6c757d;
            }

            .stat-value {
                font-weight: bold;
                color: #333;
            }

            .suggestions-list {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                padding: 15px;
            }

            .suggestion-item {
                padding: 10px;
                margin-bottom: 10px;
                background: white;
                border-radius: 4px;
                border-left: 4px solid #007bff;
            }

            .suggestion-item:last-child {
                margin-bottom: 0;
            }

            .suggestion-title {
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }

            .suggestion-description {
                color: #6c757d;
                font-size: 13px;
            }

            .no-errors, .no-resources, .no-suggestions {
                padding: 20px;
                text-align: center;
                color: #6c757d;
                font-style: italic;
            }

            .behavior-analysis-section {
                margin-bottom: 25px;
            }

            .behavior-analysis-section h4 {
                margin: 0 0 15px 0;
                color: #333;
            }

            .behavior-analysis-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }

            .analysis-stat-item {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                text-align: center;
                border: 1px solid #e9ecef;
            }

            .analysis-stat-label {
                display: block;
                font-size: 12px;
                color: #6c757d;
                margin-bottom: 5px;
                text-transform: uppercase;
            }

            .analysis-stat-value {
                display: block;
                font-size: 20px;
                font-weight: bold;
                color: #333;
            }

            .behavior-breakdown, .behavior-patterns {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 15px;
                border: 1px solid #e9ecef;
            }

            .behavior-breakdown h5, .behavior-patterns h5 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 14px;
            }

            .interaction-bar {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }

            .interaction-label {
                width: 80px;
                font-size: 12px;
                color: #666;
            }

            .interaction-progress {
                flex: 1;
                height: 20px;
                background: #e9ecef;
                border-radius: 10px;
                overflow: hidden;
                margin: 0 10px;
            }

            .interaction-fill {
                height: 100%;
                transition: width 0.3s ease;
            }

            .interaction-count {
                font-size: 12px;
                color: #333;
                min-width: 30px;
            }

            .pattern-item {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid #dee2e6;
                font-size: 12px;
            }

            .pattern-item:last-child {
                border-bottom: none;
            }

            .pattern-label {
                color: #666;
            }

            .pattern-value {
                color: #333;
                font-weight: 500;
            }

            @media (max-width: 1024px) {
                .performance-dashboard {
                    width: 95vw;
                    right: 2.5vw;
                }
                
                .performance-overview {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
        `;
    document.head.appendChild(style);
  }

  /**
     * 绑定全局事件监听器
     * 设置键盘快捷键和全局交互事件处理
     * @private
     */
  /**
     * 绑定仪表板切换按钮事件
     * 创建悬浮的切换按钮，用于显示/隐藏性能仪表板
     * 按钮包含悬停效果和点击切换功能
     * @private
     */
  bindEvents() {
    // 创建切换按钮
    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = '📊';
    toggleBtn.title = '性能监控';
    toggleBtn.style.cssText = `
            position: fixed;
            top: ${window.MAGIC_NUMBERS?.TOGGLE_BTN_TOP || 20}px;
            right: ${window.MAGIC_NUMBERS?.TOGGLE_BTN_RIGHT || 20}px;
            width: ${window.MAGIC_NUMBERS?.TOGGLE_BTN_SIZE || 50}px;
            height: ${window.MAGIC_NUMBERS?.TOGGLE_BTN_SIZE || 50}px;
            border: none;
            border-radius: 50%;
            background: #007bff;
            color: white;
            font-size: ${window.MAGIC_NUMBERS?.TOGGLE_BTN_FONT_SIZE || 20}px;
            cursor: pointer;
            z-index: ${window.MAGIC_NUMBERS?.TOGGLE_BTN_Z_INDEX || 9999};
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        `;

    toggleBtn.addEventListener('click', () => {
      this.toggle();
    });

    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.transform = 'scale(1.1)';
    });

    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.transform = 'scale(1)';
    });

    document.body.appendChild(toggleBtn);
    this.toggleBtn = toggleBtn;
  }

  /**
     * 绑定仪表板内部控件事件
     * 为仪表板内的按钮和交互元素添加事件监听器
     * @private
     */
  bindInternalEvents() {
    // 绑定关闭按钮事件
    const closeBtn = this.container.querySelector(window.DOM_SELECTORS?.CLOSE_BTN || '#close-btn');
    closeBtn.addEventListener('click', () => {
      this.hide();
    });

    // 绑定刷新按钮事件 - 手动更新仪表板数据
    const refreshBtn = this.container.querySelector(window.DOM_SELECTORS?.REFRESH_BTN || '#refresh-btn');
    refreshBtn.addEventListener('click', () => {
      this.updateDashboard();
    });

    // 绑定清除数据按钮事件 - 清空历史数据
    const clearBtn = this.container.querySelector(window.DOM_SELECTORS?.CLEAR_BTN || '#clear-btn');
    clearBtn.addEventListener('click', () => {
      this.clearData();
    });

    // 绑定导出报告按钮事件 - 生成性能报告
    const exportBtn = this.container.querySelector(window.DOM_SELECTORS?.EXPORT_BTN || '#export-btn');
    exportBtn.addEventListener('click', () => {
      this.exportReport();
    });
  }

  /**
     * 切换仪表板显示状态
     * 在显示和隐藏状态之间切换仪表板
     * @public
     */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
     * 显示仪表板
     * 将仪表板设为可见状态并开始数据更新
     * @public
     */
  show() {
    this.container.style.display = 'block';
    this.isVisible = true;
    this.updateDashboard(); // 立即更新数据显示

    // 调整切换按钮位置，避免与仪表板重叠
    this.toggleBtn.style.right = `${window.MAGIC_NUMBERS?.TOGGLE_BTN_OFFSET || 840}px`;
  }

  /**
     * 隐藏仪表板
     * 将仪表板设为隐藏状态并停止数据更新
     * @public
     */
  hide() {
    this.container.style.display = 'none';
    this.isVisible = false;

    // 恢复切换按钮到原始位置
    this.toggleBtn.style.right = `${window.MAGIC_NUMBERS?.TOGGLE_BTN_RIGHT || 20}px`;
  }

  /**
     * 启动定时更新机制
     * 创建定时器，定期从性能监控器获取最新数据并更新界面
     * 只有在仪表板可见时才执行更新，以节省系统资源
     * @private
     */
  startUpdating() {
    this.updateTimer = setInterval(() => {
      // 只有在仪表板可见时才更新数据，节省资源
      if (this.isVisible) {
        this.updateDashboard();
      }
    }, this.options.updateInterval);
  }

  /**
     * 更新仪表板数据
     * 从性能监控器获取最新数据并更新所有界面组件
     * 包括概览、Web Vitals、错误列表、资源列表等
     * @private
     */
  updateDashboard() {
    if (!this.monitor) {return;}

    const performanceData = this.monitor.getPerformanceData();
    const errors = this.monitor.getErrors();
    const userBehavior = this.monitor.getUserBehavior();
    const report = this.monitor.generateReport();

    this.updateOverview(report.summary);
    this.updateVitals(performanceData.vitals);
    this.updateErrors(errors);
    this.updateResources(performanceData.resources);
    this.updateBehaviorStats(userBehavior);
    this.updateSuggestions(report.summary);
    this.updateCharts(performanceData);
    this.updateBehaviorAnalysis();
  }

  /**
     * 更新性能概览数据
     * 更新页面加载时间、性能评分、错误数量等关键指标
     *
     * @param {Object} summary - 性能摘要数据
     * @param {number} summary.pageLoadTime - 页面加载时间（毫秒）
     * @param {number} summary.score - 性能评分（0-100）
     * @param {number} summary.errorCount - 错误数量
     * @param {number} summary.memoryUsage - 内存使用量（字节）
     * @private
     */
  /**
     * 更新性能概览数据
     * 更新仪表板顶部的关键性能指标显示
     * 包括页面加载时间、性能评分、错误数量和内存使用量
     *
     * @param {Object} summary - 性能摘要数据
     * @param {number} summary.pageLoadTime - 页面加载时间（毫秒）
     * @param {number} summary.score - 性能评分（0-100）
     * @param {number} summary.errorCount - 错误数量
     * @param {number} summary.memoryUsage - 内存使用量（字节）
     * @private
     */
  /**
     * 更新仪表板概览数据
     * 更新页面加载时间、性能评分、错误数量和内存使用量等关键指标
     *
     * @param {Object} summary - 性能摘要数据
     * @param {number} summary.pageLoadTime - 页面加载时间（毫秒）
     * @param {number} summary.score - 性能评分（0-100）
     * @param {number} summary.errorCount - 错误数量
     * @param {number} summary.memoryUsage - 内存使用量（字节）
     * @private
     */
  updateOverview(summary) {
    const loadTimeEl = this.container.querySelector('#load-time');
    const scoreEl = this.container.querySelector('#performance-score');
    const errorCountEl = this.container.querySelector('#error-count');
    const memoryEl = this.container.querySelector('#memory-usage');

    loadTimeEl.textContent = summary.pageLoadTime ? Math.round(summary.pageLoadTime) : '--';
    scoreEl.textContent = summary.score ? Math.round(summary.score) : '--';
    errorCountEl.textContent = summary.errorCount || 0;

    if (summary.memoryUsage) {
      memoryEl.textContent = (summary.memoryUsage / 1024 / 1024).toFixed(1);
    } else {
      memoryEl.textContent = '--';
    }

    // 更新颜色
    this.updateMetricColor(scoreEl, summary.score, [80, 60]);
    this.updateMetricColor(loadTimeEl, summary.pageLoadTime, [2000, 3000], true);
  }

  /**
     * 更新性能指标的颜色状态
     * 根据阈值设置指标的颜色，用于直观显示性能状态
     *
     * @param {HTMLElement} element - 要更新颜色的DOM元素
     * @param {number} value - 当前指标值
     * @param {Array<number>} thresholds - 阈值数组 [良好阈值, 较差阈值]
     * @param {boolean} [reverse=false] - 是否反转颜色逻辑（值越小越好）
     * @private
     */
  updateMetricColor(element, value, thresholds, reverse = false) {
    if (!value) {return;}

    let color = '#28a745'; // 绿色

    if (reverse) {
      if (value > thresholds[1]) {color = '#dc3545';} // 红色
      else if (value > thresholds[0]) {color = '#ffc107';} // 黄色
    } else {
      if (value < thresholds[1]) {color = '#dc3545';} // 红色
      else if (value < thresholds[0]) {color = '#ffc107';} // 黄色
    }

    element.style.color = color;
  }

  /**
     * 更新Core Web Vitals指标
     * 更新LCP、FID、CLS等核心性能指标的显示和状态
     *
     * @param {Object} vitals - Web Vitals数据
     * @param {Object} vitals.lcp - Largest Contentful Paint数据
     * @param {Object} vitals.fid - First Input Delay数据
     * @param {Object} vitals.cls - Cumulative Layout Shift数据
     * @private
     */
  updateVitals(vitals) {
    // LCP
    const lcpValue = this.container.querySelector('#lcp-value');
    const lcpStatus = this.container.querySelector('#lcp-status');
    if (vitals.lcp) {
      lcpValue.textContent = Math.round(vitals.lcp.value) + 'ms';
      lcpStatus.className = 'vital-status ' + this.getVitalStatus(vitals.lcp.value, [2500, 4000]);
    }

    // FID
    const fidValue = this.container.querySelector('#fid-value');
    const fidStatus = this.container.querySelector('#fid-status');
    if (vitals.fid) {
      fidValue.textContent = Math.round(vitals.fid.value) + 'ms';
      fidStatus.className = 'vital-status ' + this.getVitalStatus(vitals.fid.value, [100, 300]);
    }

    // CLS
    const clsValue = this.container.querySelector('#cls-value');
    const clsStatus = this.container.querySelector('#cls-status');
    if (vitals.cls) {
      clsValue.textContent = vitals.cls.value.toFixed(3);
      clsStatus.className = 'vital-status ' + this.getVitalStatus(vitals.cls.value, [0.1, 0.25]);
    }
  }

  /**
     * 获取Web Vital指标的状态等级
     * 根据Google标准判断指标是否达到良好、需要改进或较差的级别
     *
     * @param {number} value - 指标值
     * @param {Array<number>} thresholds - 阈值数组 [良好阈值, 较差阈值]
     * @returns {string} 状态等级：'good'、'warning'或'danger'
     * @private
     */
  getVitalStatus(value, thresholds) {
    if (value <= thresholds[0]) {return 'good';}
    if (value <= thresholds[1]) {return 'warning';}
    return 'danger';
  }

  /**
     * 更新错误列表显示
     * 显示最近发生的错误信息，包括错误类型、消息和详细信息
     *
     * @param {Array<Object>} errors - 错误数组
     * @param {string} errors[].type - 错误类型
     * @param {string} errors[].message - 错误消息
     * @param {string} errors[].filename - 错误文件名
     * @param {number} errors[].lineno - 错误行号
     * @param {number} errors[].timestamp - 错误时间戳
     * @private
     */
  updateErrors(errors) {
    const errorList = this.container.querySelector('#error-list');

    if (errors.length === 0) {
      Utils.setElementHTML(errorList, '<div class="no-errors">暂无错误</div>', true);
      return;
    }

    const recentErrors = errors.slice(-(window.MAGIC_NUMBERS?.MAX_RECENT_ERRORS || 10)); // 最近N个错误
    const errorHTML = recentErrors.map(error => `
            <div class="error-item">
                <div class="error-type ${error.type}">${error.type}</div>
                <div class="error-message">${this.escapeHtml(error.message)}</div>
                <div class="error-details">
                    ${error.filename ? `文件: ${error.filename}:${error.lineno}` : ''}
                    ${error.timestamp ? `时间: ${new Date(error.timestamp).toLocaleTimeString()}` : ''}
                </div>
            </div>
        `).join('');
    Utils.setElementHTML(errorList, errorHTML, true); // 内部生成的安全HTML
  }

  /**
     * 更新慢资源列表显示
     * 显示加载时间超过1秒的资源，帮助识别性能瓶颈
     *
     * @param {Array<Object>} resources - 资源数组
     * @param {string} resources[].name - 资源名称/URL
     * @param {string} resources[].type - 资源类型
     * @param {number} resources[].duration - 加载耗时（毫秒）
     * @param {number} resources[].size - 资源大小（字节）
     * @private
     */
  updateResources(resources) {
    const resourceList = this.container.querySelector('#resource-list');

    const slowResources = resources.filter(r => r.duration > (window.MAGIC_NUMBERS?.SLOW_RESOURCE_THRESHOLD || 1000));

    if (slowResources.length === 0) {
      Utils.setElementHTML(resourceList, '<div class="no-resources">暂无慢资源</div>', true);
      return;
    }

    const resourceHTML = slowResources.slice(-(window.MAGIC_NUMBERS?.MAX_SLOW_RESOURCES || 10)).map(resource => `
            <div class="resource-item">
                <div class="resource-name">${this.getResourceName(resource.name)}</div>
                <div class="resource-details">
                    类型: ${resource.type} | 
                    耗时: ${Math.round(resource.duration)}ms | 
                    大小: ${this.formatBytes(resource.size)}
                </div>
            </div>
        `).join('');
    Utils.setElementHTML(resourceList, resourceHTML, true); // 内部生成的安全HTML
  }

  /**
     * 更新用户行为统计数据
     * 统计并显示用户的点击、滚动等交互行为数据
     *
     * @param {Array<Object>} userBehavior - 用户行为数据数组
     * @param {string} userBehavior[].action - 行为类型（click、scroll等）
     * @param {number} userBehavior[].timestamp - 行为时间戳
     * @private
     */
  updateBehaviorStats(userBehavior) {
    const clickCount = userBehavior.filter(b => b.action === 'click').length;
    const scrollCount = userBehavior.filter(b => b.action === 'scroll').length;
    const stayTime = this.calculateStayTime();

    this.container.querySelector('#click-count').textContent = clickCount;
    this.container.querySelector('#scroll-count').textContent = scrollCount;
    this.container.querySelector('#stay-time').textContent = stayTime + 's';
  }

  /**
     * 更新性能优化建议
     * 根据当前性能数据生成针对性的优化建议
     *
     * @param {Object} summary - 性能摘要数据
     * @param {number} summary.pageLoadTime - 页面加载时间
     * @param {number} summary.errorCount - 错误数量
     * @param {number} summary.slowResourceCount - 慢资源数量
     * @param {Object} summary.vitals - Web Vitals数据
     * @private
     */
  updateSuggestions(summary) {
    const suggestionsList = this.container.querySelector('#suggestions-list');
    const suggestions = this.generateSuggestions(summary);

    if (suggestions.length === 0) {
      Utils.setElementHTML(suggestionsList, '<div class="no-suggestions">暂无建议</div>', true);
      return;
    }

    const suggestionsHTML = suggestions.map(suggestion => `
            <div class="suggestion-item">
                <div class="suggestion-title">${suggestion.title}</div>
                <div class="suggestion-description">${suggestion.description}</div>
            </div>
        `).join('');
    Utils.setElementHTML(suggestionsList, suggestionsHTML, true); // 内部生成的安全HTML
  }

  /**
     * 生成性能优化建议
     * 基于性能指标分析，生成具体的优化建议列表
     *
     * @param {Object} summary - 性能摘要数据
     * @returns {Array<Object>} 建议列表
     * @returns {string} returns[].title - 建议标题
     * @returns {string} returns[].description - 建议描述
     * @private
     */
  generateSuggestions(summary) {
    const suggestions = [];

    if (summary.pageLoadTime > 3000) {
      suggestions.push({
        title: '页面加载时间过长',
        description: '考虑优化图片大小、启用压缩、使用CDN或减少HTTP请求数量'
      });
    }

    if (summary.errorCount > 5) {
      suggestions.push({
        title: '错误数量较多',
        description: '检查JavaScript代码，修复常见错误，添加错误边界处理'
      });
    }

    if (summary.slowResourceCount > 3) {
      suggestions.push({
        title: '慢资源较多',
        description: '优化资源加载，考虑懒加载、预加载或资源压缩'
      });
    }

    if (summary.vitals.lcp && summary.vitals.lcp.value > 2500) {
      suggestions.push({
        title: 'LCP 需要优化',
        description: '优化最大内容绘制时间，检查主要内容的加载速度'
      });
    }

    if (summary.vitals.cls && summary.vitals.cls.value > 0.1) {
      suggestions.push({
        title: 'CLS 需要优化',
        description: '减少累积布局偏移，为图片和广告预留空间'
      });
    }

    return suggestions;
  }

  /**
     * 更新性能图表显示
     * 更新页面加载时间趋势图和资源加载分析图
     *
     * @param {Object} performanceData - 性能数据
     * @param {Array} performanceData.loadTimes - 加载时间历史数据
     * @param {Array} performanceData.resources - 资源加载数据
     * @private
     */
  /**
     * 更新性能图表显示
     * 使用图表库（如Chart.js）更新性能趋势图表
     * 当前为占位实现，等待图表库集成
     *
     * @param {Object} performanceData - 性能数据对象
     * @private
     */
  updateCharts(performanceData) {
    // 这里可以集成图表库如 Chart.js
    // 暂时使用简单的文本显示
    console.log('Charts updated with data:', performanceData);
  }

  /**
     * 清除所有历史数据
     * 重置仪表板的历史数据存储，清空图表和统计信息
     * @public
     */
  clearData() {
    if (this.monitor) {
      this.monitor.clearData();
    }
    this.historicalData = {
      pageLoad: [],
      errors: [],
      resources: [],
      vitals: []
    };
    this.updateDashboard();
  }

  /**
     * 导出性能分析报告
     * 生成包含当前性能数据和分析结果的JSON格式报告
     * @public
     * @returns {void}
     */
  exportReport() {
    if (!this.monitor) {return;}

    const report = this.monitor.generateReport();
    const reportData = {
      ...report,
      exportTime: new Date().toISOString(),
      dashboardVersion: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
     * HTML字符转义
     * 防止XSS攻击，转义HTML特殊字符
     *
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的安全文本
     * @private
     */
  /**
     * 转义HTML特殊字符
     * 防止XSS攻击，将文本中的HTML特殊字符转义为安全的HTML实体
     *
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的安全文本
     * @private
     */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
     * 从URL中提取资源名称
     * 提取URL的文件名部分用于显示
     *
     * @param {string} url - 完整的资源URL
     * @returns {string} 资源文件名
     * @private
     */
  getResourceName(url) {
    return url.split('/').pop() || url;
  }

  /**
     * 格式化字节数为可读格式
     * 将字节数转换为KB、MB等人类可读的格式
     *
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的大小字符串（如"1.5 MB"）
     * @private
     */
  formatBytes(bytes) {
    if (!bytes) {return '0 B';}
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
     * 计算页面停留时间
     * 计算从页面加载开始到当前时刻的停留时间
     *
     * @returns {number} 停留时间（秒）
     * @private
     */
  /**
     * 计算用户在页面的停留时间
     * 从页面导航开始计算到当前时间的秒数
     *
     * @returns {number} 停留时间（秒）
     * @private
     */
  calculateStayTime() {
    const startTime = performance.timing.navigationStart;
    return Math.round((Date.now() - startTime) / 1000);
  }

  /**
     * 更新用户行为分析数据
     * 获取并显示用户行为的深度分析结果，包括参与度评分、交互分布等
     * @private
     */
  /**
     * 更新用户行为分析数据
     * 获取并显示用户行为的深度分析结果，包括参与度评分、交互分布等
     * @private
     */
  updateBehaviorAnalysis() {
    if (typeof this.monitor.getUserBehaviorAnalysis !== 'function') {
      if (window.errorUtils) {
        window.errorUtils.handleError({
          type: 'warning',
          operation: 'updateBehaviorAnalysis',
          message: 'getUserBehaviorAnalysis method not available',
          context: { monitorType: typeof this.monitor }
        });
      } else {
        console.warn('Performance Dashboard: getUserBehaviorAnalysis method not available');
      }
      return;
    }

    const behaviorData = this.monitor.getUserBehaviorAnalysis();
    // const behaviorStats = this.monitor.getBehaviorStats(); // 暂时注释，未使用

    // 更新统计数据
    this.updateElement('engagement-score', `${behaviorData.summary.engagementScore}/100`);
    this.updateElement('time-on-page', `${behaviorData.summary.timeOnPage}分钟`);
    this.updateElement('total-interactions', behaviorData.summary.totalActions);
    this.updateElement('scroll-depth', `${behaviorData.summary.maxScrollDepth}%`);

    // 更新交互类型分布
    this.updateInteractionBreakdown(behaviorData.detailed);

    // 更新行为模式
    this.updateBehaviorPatterns(behaviorData.patterns);
  }

  /**
     * 更新交互类型分布图表
     * 显示不同类型用户交互的数量和比例分布
     *
     * @param {Object} detailed - 详细交互数据
     * @param {number} detailed.clicks - 点击次数
     * @param {number} detailed.scrolls - 滚动次数
     * @param {number} detailed.keystrokes - 键盘操作次数
     * @param {number} detailed.mouseMovements - 鼠标移动次数
     * @private
     */
  updateInteractionBreakdown(detailed) {
    const container = document.getElementById('interaction-breakdown');
    if (!container) {return;}

    const totalInteractions = detailed.clicks + detailed.scrolls + detailed.keystrokes + detailed.mouseMovements;

    const interactions = [
      { label: '点击', count: detailed.clicks, color: '#007bff' },
      { label: '滚动', count: detailed.scrolls, color: '#28a745' },
      { label: '键盘', count: detailed.keystrokes, color: '#ffc107' },
      { label: '鼠标', count: detailed.mouseMovements, color: '#6f42c1' }
    ];

    const interactionHTML = interactions.map(interaction => {
      const percentage = totalInteractions > 0 ? (interaction.count / totalInteractions * 100) : 0;
      return `
                <div class="interaction-bar">
                    <span class="interaction-label">${interaction.label}</span>
                    <div class="interaction-progress">
                        <div class="interaction-fill" style="width: ${percentage}%; background-color: ${interaction.color};"></div>
                    </div>
                    <span class="interaction-count">${interaction.count}</span>
                </div>
            `;
    }).join('');
    Utils.setElementHTML(container, interactionHTML, true); // 内部生成的安全HTML
  }

  /**
     * 更新用户行为模式分析
     * 显示用户行为的模式和趋势分析结果
     *
     * @param {Object} patterns - 行为模式数据
     * @param {string} patterns.mostActiveHour - 最活跃时间段
     * @param {string} patterns.preferredInteractionType - 偏好的交互类型
     * @param {Object} patterns.scrollingBehavior - 滚动行为数据
     * @private
     */
  updateBehaviorPatterns(patterns) {
    const container = document.getElementById('behavior-patterns');
    if (!container) {return;}

    const patternItems = [
      { label: '最活跃时间', value: patterns.mostActiveHour ? `${patterns.mostActiveHour}:00` : '暂无数据' },
      { label: '偏好交互类型', value: patterns.preferredInteractionType || '暂无数据' },
      { label: '滚动频率', value: patterns.scrollingBehavior ? `${patterns.scrollingBehavior.frequency}次` : '暂无数据' },
      { label: '平均滚动速度', value: patterns.scrollingBehavior ? `${Math.round(patterns.scrollingBehavior.speed)}px/s` : '暂无数据' }
    ];

    const patternsHTML = patternItems.map(item => `
            <div class="pattern-item">
                <span class="pattern-label">${item.label}:</span>
                <span class="pattern-value">${item.value}</span>
            </div>
        `).join('');
    Utils.setElementHTML(container, patternsHTML, true); // 内部生成的安全HTML
  }

  /**
     * 更新指定元素的内容
     * 安全地更新DOM元素的文本内容
     *
     * @param {string} id - 元素ID
     * @param {string|number} value - 要设置的值
     * @private
     */
  updateElement(id, value) {
    const element = this.container.querySelector(`#${id}`);
    if (element) {
      element.textContent = value;
    }
  }

  /**
     * 销毁仪表板实例
     * 清理所有事件监听器、定时器和DOM元素，释放内存
     * @public
     */
  destroy() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.container) {
      this.container.remove();
    }

    if (this.toggleBtn) {
      this.toggleBtn.remove();
    }
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceDashboard;
} else {
  window.PerformanceDashboard = PerformanceDashboard;
}

// 自动初始化（如果性能监控器存在）
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (window.performanceMonitor) {
      window.performanceDashboard = new PerformanceDashboard(window.performanceMonitor);
    }
  });
}
