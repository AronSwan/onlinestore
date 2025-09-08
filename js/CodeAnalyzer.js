/**
 * 重构后的CodeAnalyzer主类
 * 采用门面模式，协调各个专职分析器的工作
 * 符合SOLID原则中的单一职责原则和开闭原则
 * AI生成代码来源：基于Claude 4 Sonnet重构的代码分析器
 * @ai-generated: 基于Claude 4 Sonnet重构生成，遵循SOLID原则
 * @compliance: PCI-DSS-v4.0, OWASP-Top-10-2021, NIST-CSF-2.0
 */

// 导入各个专职分析器
const AnalysisCache = require('./analyzers/AnalysisCache');
const FileParser = require('./analyzers/FileParser');
const BasicAnalyzer = require('./analyzers/BasicAnalyzer');
const ComplexityAnalyzer = require('./analyzers/ComplexityAnalyzer');
const ASTAnalyzer = require('./analyzers/ASTAnalyzer');
const QualityAnalyzer = require('./analyzers/QualityAnalyzer');
const ProjectAnalyzer = require('./analyzers/ProjectAnalyzer');
const ReportGenerator = require('./analyzers/ReportGenerator');

class CodeAnalyzer {
  constructor(options = {}) {
    // 初始化各个专职分析器
    this.cache = new AnalysisCache(options.cache);
    this.fileParser = new FileParser(options.parser);
    this.basicAnalyzer = new BasicAnalyzer(options.basic);
    this.complexityAnalyzer = new ComplexityAnalyzer(options.complexity);
    this.astAnalyzer = new ASTAnalyzer(options.ast);
    this.qualityAnalyzer = new QualityAnalyzer(options.quality);
    this.projectAnalyzer = new ProjectAnalyzer(options.project);
    this.reportGenerator = new ReportGenerator(options.report);

    // 配置选项
    this.options = {
      enableCache: options.enableCache !== false,
      enableParallel: options.enableParallel !== false,
      maxConcurrency: options.maxConcurrency || 4,
      timeout: options.timeout || 30000,
      ...options
    };

    // 分析历史
    this.analysisHistory = [];
  }

  /**
     * 解析单个文件
     * @param {string} filePath - 文件路径
     * @param {Object} options - 解析选项
     * @returns {Promise<Object>} 解析结果
     */
  async parseFile(filePath, options = {}) {
    try {
      // 检查缓存
      if (this.options.enableCache) {
        const cached = this.cache.get(filePath);
        if (cached) {
          return cached;
        }
      }

      // 解析文件
      const fileData = await this.fileParser.parseFile(filePath, options);

      // 执行各种分析
      const analysisResult = {
        file: fileData,
        basic: await this.basicAnalyzer.performBasicAnalysis(fileData),
        complexity: await this.complexityAnalyzer.analyzeComplexity(fileData),
        ast: await this.astAnalyzer.performASTAnalysis(fileData),
        quality: await this.qualityAnalyzer.analyzeQuality(fileData),
        timestamp: new Date().toISOString()
      };

      // 缓存结果
      if (this.options.enableCache) {
        this.cache.set(filePath, analysisResult);
      }

      // 记录历史
      this.analysisHistory.push({
        type: 'file',
        target: filePath,
        timestamp: analysisResult.timestamp,
        success: true
      });

      return analysisResult;
    } catch (error) {
      // 记录错误历史
      this.analysisHistory.push({
        type: 'file',
        target: filePath,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  /**
     * 分析项目
     * @param {string} projectPath - 项目路径
     * @param {Object} options - 分析选项
     * @returns {Promise<Object>} 分析结果
     */
  async analyzeProject(projectPath, options = {}) {
    try {
      const startTime = Date.now();

      // 项目级分析
      const projectResult = await this.projectAnalyzer.analyzeProject(projectPath, {
        ...options,
        enableParallel: this.options.enableParallel,
        maxConcurrency: this.options.maxConcurrency,
        fileParser: this.fileParser,
        basicAnalyzer: this.basicAnalyzer,
        complexityAnalyzer: this.complexityAnalyzer,
        astAnalyzer: this.astAnalyzer,
        qualityAnalyzer: this.qualityAnalyzer
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 记录历史
      this.analysisHistory.push({
        type: 'project',
        target: projectPath,
        timestamp: new Date().toISOString(),
        success: true,
        duration: duration,
        fileCount: projectResult.summary?.fileCount || 0
      });

      return {
        ...projectResult,
        meta: {
          analysisTime: duration,
          timestamp: new Date().toISOString(),
          analyzer: 'CodeAnalyzer v2.0 (Refactored)'
        }
      };
    } catch (error) {
      // 记录错误历史
      this.analysisHistory.push({
        type: 'project',
        target: projectPath,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  /**
     * 生成分析报告
     * @param {Object} analysisData - 分析数据
     * @param {Object} options - 报告选项
     * @returns {Promise<string>} 报告内容
     */
  async generateReport(analysisData, options = {}) {
    return await this.reportGenerator.generateReport(analysisData, options);
  }

  /**
     * 批量分析文件
     * @param {Array<string>} filePaths - 文件路径数组
     * @param {Object} options - 分析选项
     * @returns {Promise<Array<Object>>} 分析结果数组
     */
  async analyzeFiles(filePaths, options = {}) {
    if (!this.options.enableParallel) {
      // 串行处理
      const results = [];
      for (const filePath of filePaths) {
        try {
          const result = await this.parseFile(filePath, options);
          results.push(result);
        } catch (error) {
          results.push({
            file: { path: filePath },
            error: error.message,
            success: false
          });
        }
      }
      return results;
    }
    // 并行处理
    const concurrency = Math.min(this.options.maxConcurrency, filePaths.length);
    const chunks = this.chunkArray(filePaths, concurrency);
    const results = [];

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (filePath) => {
        try {
          return await this.parseFile(filePath, options);
        } catch (error) {
          return {
            file: { path: filePath },
            error: error.message,
            success: false
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;

  }

  /**
     * 获取分析历史
     * @returns {Array} 分析历史记录
     */
  getAnalysisHistory() {
    return this.analysisHistory;
  }

  /**
     * 清理缓存
     */
  clearCache() {
    this.cache.clearCache();
    this.reportGenerator.clearCache();
  }

  /**
     * 获取缓存统计
     * @returns {Object} 缓存统计信息
     */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
     * 获取支持的文件类型
     * @returns {Array<string>} 支持的文件扩展名
     */
  getSupportedFileTypes() {
    return this.fileParser.getSupportedExtensions();
  }

  /**
     * 验证配置
     * @param {Object} config - 配置对象
     * @returns {Object} 验证结果
     */
  validateConfig(config) {
    const errors = [];

    if (config.maxConcurrency && (config.maxConcurrency < 1 || config.maxConcurrency > 16)) {
      errors.push('maxConcurrency must be between 1 and 16');
    }

    if (config.timeout && config.timeout < 1000) {
      errors.push('timeout must be at least 1000ms');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
     * 数组分块工具方法
     * @private
     */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
     * 获取版本信息
     * @returns {Object} 版本信息
     */
  getVersion() {
    return {
      version: '2.0.0',
      name: 'CodeAnalyzer (Refactored)',
      architecture: 'Modular with SOLID principles',
      components: [
        'AnalysisCache',
        'FileParser',
        'BasicAnalyzer',
        'ComplexityAnalyzer',
        'ASTAnalyzer',
        'QualityAnalyzer',
        'ProjectAnalyzer',
        'ReportGenerator'
      ]
    };
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CodeAnalyzer;
} else if (typeof window !== 'undefined') {
  window.CodeAnalyzer = CodeAnalyzer;
}
