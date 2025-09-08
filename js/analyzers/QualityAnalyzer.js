/**
 * 质量分析器 - 负责代码质量评估
 * 符合单一职责原则：专门处理代码质量分析和评分功能
 * @ai-generated: 基于Claude 4 Sonnet增强，集成AI代码审计规范v2.6
 * @compliance: PCI-DSS-v4.0, OWASP-Top-10-2021, NIST-CSF-2.0
 */
class QualityAnalyzer {
  constructor() {
    // 常量定义 - 符合AI代码审计规范
    this.QUALITY_THRESHOLDS = {
      GOOD_QUALITY_SCORE: 70,
      MAX_LINE_LENGTH: 120,
      // AI代码审计新增阈值
      AI_HALLUCINATION_THRESHOLD: 0.8,
      SECURITY_SCORE_MIN: 80,
      COMPLIANCE_SCORE_MIN: 90,
      CVSS_BLOCK_THRESHOLD: 7.0
    };

    // 初始化SecurityScanner
    this.securityScanner = null;
    this.initializeSecurityScanner();

    this.qualityMetrics = {
      maintainability: {
        weight: 0.3,
        factors: ['complexity', 'duplication', 'size', 'cohesion']
      },
      reliability: {
        weight: 0.25,
        factors: ['testCoverage', 'errorHandling', 'nullChecks', 'typeChecking']
      },
      security: {
        weight: 0.2,
        factors: ['inputValidation', 'outputEncoding', 'authentication', 'authorization']
      },
      performance: {
        weight: 0.15,
        factors: ['algorithmComplexity', 'memoryUsage', 'ioOperations', 'caching']
      },
      readability: {
        weight: 0.1,
        factors: ['naming', 'comments', 'formatting', 'structure']
      }
    };

    this.thresholds = {
      excellent: 90,
      good: 75,
      fair: 60,
      poor: 40
    };

    this.analysisCache = new Map();

    // AI代码审计配置
    this.auditConfig = {
      enableAIDetection: true,
      enableComplianceCheck: true,
      enableAdvancedSecurity: true,
      reportFormat: 'sarif',
      profile: 'balanced' // strict|balanced|lenient
    };
  }

  /**
   * 初始化安全扫描器
   * @ai-generated: 基于Claude 4 Sonnet生成的安全集成逻辑
   */
  initializeSecurityScanner() {
    try {
      // 动态加载SecurityScanner
      if (typeof window !== 'undefined' && window.SecurityScanner) {
        this.securityScanner = new window.SecurityScanner({
          enableAIDetection: this.auditConfig.enableAIDetection,
          enableComplianceCheck: this.auditConfig.enableComplianceCheck,
          reportFormat: this.auditConfig.reportFormat
        });
      } else {
        console.warn('SecurityScanner not available, using fallback security analysis');
      }
    } catch (error) {
      console.error('Failed to initialize SecurityScanner:', error.message);
    }
  }

  /**
     * 执行质量分析 - 增强版，集成AI代码审计
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @param {Object} options - 分析选项
     * @returns {Object} 质量分析结果
     * @ai-generated: 基于Claude 4 Sonnet增强的质量分析逻辑
     */
  async analyzeQuality(content, language = 'javascript', options = {}) {
    try {
      const cacheKey = this.generateCacheKey(content, language, options);

      // 检查缓存
      if (this.analysisCache.has(cacheKey) && !options.forceRefresh) {
        return {
          success: true,
          fromCache: true,
          analysis: this.analysisCache.get(cacheKey),
          timestamp: new Date().toISOString()
        };
      }

      // 执行安全扫描（如果可用）
      let securityScanResult = null;
      if (this.securityScanner && this.auditConfig.enableAdvancedSecurity) {
        try {
          securityScanResult = await this.securityScanner.scanCode(content, options.filePath || '', {
            enableAIDetection: this.auditConfig.enableAIDetection,
            enableComplianceCheck: this.auditConfig.enableComplianceCheck
          });
        } catch (securityError) {
          console.warn('Security scan failed:', securityError.message);
        }
      }

      // 执行质量分析
      const analysis = {
        language: language,
        overallScore: 0,
        grade: '',
        metrics: this.calculateQualityMetrics(content, language),
        issues: this.identifyQualityIssues(content, language),
        recommendations: this.generateRecommendations(content, language),
        trends: this.analyzeTrends(content, language),
        benchmarks: this.compareToBenchmarks(content, language),
        // AI代码审计新增字段
        security: securityScanResult || this.performBasicSecurityAnalysis(content, language),
        aiCodeAnalysis: this.analyzeAIGeneratedCode(content, language),
        complianceStatus: this.checkComplianceStatus(content, language, securityScanResult)
      };

      // 计算总体评分（包含安全评分）
      analysis.overallScore = this.calculateEnhancedOverallScore(analysis.metrics, analysis.security);
      analysis.grade = this.determineGrade(analysis.overallScore);

      // 检查是否需要阻断
      analysis.blockingIssues = this.identifyBlockingIssues(analysis);
      analysis.shouldBlock = analysis.blockingIssues.length > 0;

      // 缓存结果
      this.analysisCache.set(cacheKey, analysis);
      this.cleanupCache();

      return {
        success: true,
        fromCache: false,
        analysis: analysis,
        timestamp: new Date().toISOString(),
        auditCompliance: {
          version: '2.6.0',
          standards: ['PCI-DSS-v4.0', 'OWASP-Top-10-2021', 'NIST-CSF-2.0'],
          profile: this.auditConfig.profile
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `质量分析失败: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
     * 计算质量指标
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 质量指标
     */
  calculateQualityMetrics(content, language) {
    const metrics = {};

    // 可维护性指标
    metrics.maintainability = {
      score: 0,
      details: {
        complexity: this.analyzeMaintainabilityComplexity(content, language),
        duplication: this.analyzeDuplication(content, language),
        size: this.analyzeSize(content, language),
        cohesion: this.analyzeCohesion(content, language)
      }
    };
    metrics.maintainability.score = this.calculateCategoryScore(metrics.maintainability.details);

    // 可靠性指标
    metrics.reliability = {
      score: 0,
      details: {
        testCoverage: this.analyzeTestCoverage(content, language),
        errorHandling: this.analyzeErrorHandling(content, language),
        nullChecks: this.analyzeNullChecks(content, language),
        typeChecking: this.analyzeTypeChecking(content, language)
      }
    };
    metrics.reliability.score = this.calculateCategoryScore(metrics.reliability.details);

    // 安全性指标
    metrics.security = {
      score: 0,
      details: {
        inputValidation: this.analyzeInputValidation(content, language),
        outputEncoding: this.analyzeOutputEncoding(content, language),
        authentication: this.analyzeAuthentication(content, language),
        authorization: this.analyzeAuthorization(content, language)
      }
    };
    metrics.security.score = this.calculateCategoryScore(metrics.security.details);

    // 性能指标
    metrics.performance = {
      score: 0,
      details: {
        algorithmComplexity: this.analyzeAlgorithmComplexity(content, language),
        memoryUsage: this.analyzeMemoryUsage(content, language),
        ioOperations: this.analyzeIOOperations(content, language),
        caching: this.analyzeCaching(content, language)
      }
    };
    metrics.performance.score = this.calculateCategoryScore(metrics.performance.details);

    // 可读性指标
    metrics.readability = {
      score: 0,
      details: {
        naming: this.analyzeNaming(content, language),
        comments: this.analyzeComments(content, language),
        formatting: this.analyzeFormatting(content, language),
        structure: this.analyzeStructure(content, language)
      }
    };
    metrics.readability.score = this.calculateCategoryScore(metrics.readability.details);

    return metrics;
  }

  /**
     * 识别质量问题
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Array} 质量问题列表
     */
  identifyQualityIssues(content, language) {
    const issues = [];

    // 可维护性问题
    issues.push(...this.findMaintainabilityIssues(content, language));

    // 可靠性问题
    issues.push(...this.findReliabilityIssues(content, language));

    // 安全性问题
    issues.push(...this.findSecurityIssues(content, language));

    // 性能问题
    issues.push(...this.findPerformanceIssues(content, language));

    // 可读性问题
    issues.push(...this.findReadabilityIssues(content, language));

    // 按严重程度排序
    return issues.sort((a, b) => {
      const severityOrder = { 'critical': 5, 'high': 4, 'medium': 3, 'low': 2, 'info': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
     * 生成改进建议
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Array} 建议列表
     */
  generateRecommendations(content, language) {
    const recommendations = [];
    const lines = content.split('\n');
    const fileSize = lines.length;

    // 基于文件大小的建议
    if (fileSize > 500) {
      recommendations.push({
        category: 'maintainability',
        priority: 'high',
        title: '文件过大',
        description: `文件有 ${fileSize} 行，建议拆分为更小的模块`,
        action: '按功能职责拆分文件，每个文件不超过300行',
        impact: '提高代码可维护性和可读性'
      });
    }

    // 基于复杂度的建议
    const complexity = this.calculateCyclomaticComplexity(content);
    if (complexity > 15) {
      recommendations.push({
        category: 'maintainability',
        priority: 'high',
        title: '圈复杂度过高',
        description: `代码圈复杂度为 ${complexity}，超过建议阈值15`,
        action: '拆分复杂函数，使用早期返回，减少嵌套层次',
        impact: '降低代码复杂度，提高可测试性'
      });
    }

    // 基于重复代码的建议
    const duplication = this.calculateDuplicationRatio(content);
    if (duplication > 0.1) {
      recommendations.push({
        category: 'maintainability',
        priority: 'medium',
        title: '代码重复率过高',
        description: `代码重复率为 ${(duplication * 100).toFixed(1)}%`,
        action: '提取公共函数或类，消除重复代码',
        impact: '减少维护成本，提高代码一致性'
      });
    }

    // 基于注释的建议
    const commentRatio = this.calculateCommentRatio(content, language);
    if (commentRatio < 0.05) {
      recommendations.push({
        category: 'readability',
        priority: 'low',
        title: '注释不足',
        description: `注释率仅为 ${(commentRatio * 100).toFixed(1)}%`,
        action: '为复杂逻辑添加必要的注释说明',
        impact: '提高代码可读性和可维护性'
      });
    } else if (commentRatio > 0.3) {
      recommendations.push({
        category: 'readability',
        priority: 'low',
        title: '注释过多',
        description: `注释率高达 ${(commentRatio * 100).toFixed(1)}%`,
        action: '移除冗余注释，让代码自解释',
        impact: '减少维护负担，提高代码简洁性'
      });
    }

    // 基于错误处理的建议
    const errorHandling = this.analyzeErrorHandlingCoverage(content, language);
    if (errorHandling < 0.5) {
      recommendations.push({
        category: 'reliability',
        priority: 'high',
        title: '错误处理不足',
        description: `错误处理覆盖率仅为 ${(errorHandling * 100).toFixed(1)}%`,
        action: '为可能失败的操作添加适当的错误处理',
        impact: '提高程序健壮性和用户体验'
      });
    }

    // 基于安全性的建议
    const securityIssues = this.findBasicSecurityIssues(content, language);
    if (securityIssues.length > 0) {
      recommendations.push({
        category: 'security',
        priority: 'critical',
        title: '安全漏洞',
        description: `发现 ${securityIssues.length} 个潜在安全问题`,
        action: '修复SQL注入、XSS等安全漏洞',
        impact: '保护应用和用户数据安全'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'critical': 5, 'high': 4, 'medium': 3, 'low': 2, 'info': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
     * 分析趋势
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 趋势分析
     */
  analyzeTrends(content, _language) {
    return {
      complexity: {
        current: this.calculateCyclomaticComplexity(content),
        trend: 'stable',
        recommendation: 'maintain'
      },
      size: {
        current: content.split('\n').length,
        trend: 'increasing',
        recommendation: 'monitor'
      },
      quality: {
        current: 75,
        trend: 'improving',
        recommendation: 'continue'
      }
    };
  }

  /**
     * 与基准对比
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 基准对比
     */
  compareToBenchmarks(content, language) {
    const benchmarks = {
      industry: {
        complexity: 10,
        duplication: 0.05,
        testCoverage: 0.8,
        commentRatio: 0.15
      },
      team: {
        complexity: 12,
        duplication: 0.08,
        testCoverage: 0.75,
        commentRatio: 0.12
      }
    };

    const current = {
      complexity: this.calculateCyclomaticComplexity(content),
      duplication: this.calculateDuplicationRatio(content),
      testCoverage: 0.6, // 模拟值
      commentRatio: this.calculateCommentRatio(content, language)
    };

    return {
      industry: this.compareMetrics(current, benchmarks.industry),
      team: this.compareMetrics(current, benchmarks.team)
    };
  }

  // 辅助方法实现
  calculateOverallScore(metrics) {
    let totalScore = 0;
    let totalWeight = 0;

    Object.keys(this.qualityMetrics).forEach(category => {
      const weight = this.qualityMetrics[category].weight;
      const score = metrics[category]?.score || 0;
      totalScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  determineGrade(score) {
    if (score >= this.thresholds.excellent) { return 'A'; }
    if (score >= this.thresholds.good) { return 'B'; }
    if (score >= this.thresholds.fair) { return 'C'; }
    if (score >= this.thresholds.poor) { return 'D'; }
    return 'F';
  }

  calculateCategoryScore(details) {
    const scores = Object.values(details).map(detail => detail.score || 0);
    return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  }

  // 可维护性分析方法
  analyzeMaintainabilityComplexity(content, _language) {
    const complexity = this.calculateCyclomaticComplexity(content);
    let score = 100;

    if (complexity > 20) { score = 20; }
    else if (complexity > 15) { score = 40; }
    else if (complexity > 10) { score = 60; }
    else if (complexity > 5) { score = 80; }

    return {
      score: score,
      value: complexity,
      threshold: 10,
      status: complexity <= 10 ? 'good' : 'needs_improvement'
    };
  }

  analyzeDuplication(content, _language) {
    const duplication = this.calculateDuplicationRatio(content);
    let score = 100;

    if (duplication > 0.2) { score = 20; }
    else if (duplication > 0.15) { score = 40; }
    else if (duplication > 0.1) { score = 60; }
    else if (duplication > 0.05) { score = 80; }

    return {
      score: score,
      value: duplication,
      threshold: 0.05,
      status: duplication <= 0.05 ? 'good' : 'needs_improvement'
    };
  }

  analyzeSize(content, _language) {
    const lines = content.split('\n').length;
    let score = 100;

    if (lines > 1000) { score = 20; }
    else if (lines > 500) { score = 40; }
    else if (lines > 300) { score = 60; }
    else if (lines > 200) { score = 80; }

    return {
      score: score,
      value: lines,
      threshold: 300,
      status: lines <= 300 ? 'good' : 'needs_improvement'
    };
  }

  analyzeCohesion(content, _language) {
    // 简化的内聚性分析
    const functions = this.extractFunctions(content, _language);
    const classes = this.extractClasses(content, _language);

    let score = 80; // 默认分数

    // 基于函数和类的数量评估内聚性
    if (functions.length > 20 || classes.length > 5) {
      score = 60;
    }

    return {
      score: score,
      value: { functions: functions.length, classes: classes.length },
      threshold: { functions: 15, classes: 3 },
      status: score >= this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE ? 'good' : 'needs_improvement'
    };
  }

  // 可靠性分析方法
  analyzeTestCoverage(content, _language) {
    // 模拟测试覆盖率分析
    const hasTests = content.includes('test') || content.includes('spec') || content.includes('describe');
    const score = hasTests ? this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE : 30;

    return {
      score: score,
      value: hasTests ? 0.7 : 0.3,
      threshold: 0.8,
      status: score >= 60 ? 'good' : 'needs_improvement'
    };
  }

  analyzeErrorHandling(content, language) {
    const errorPatterns = {
      javascript: [/try\s*{/, /catch\s*\(/, /throw\s+/, /\.catch\s*\(/],
      python: [/try\s*:/, /except\s+/, /raise\s+/, /finally\s*:/],
      java: [/try\s*{/, /catch\s*\(/, /throw\s+/, /throws\s+/]
    };

    const patterns = errorPatterns[language] || errorPatterns.javascript;
    const errorHandlingCount = patterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const lines = content.split('\n').length;
    const ratio = errorHandlingCount / (lines / 100); // 每100行的错误处理数量

    const score = Math.min(100, ratio * 20);

    return {
      score: score,
      value: errorHandlingCount,
      threshold: 5,
      status: score >= 60 ? 'good' : 'needs_improvement'
    };
  }

  analyzeNullChecks(content, language) {
    const nullPatterns = {
      javascript: [/!==\s*null/, /===\s*null/, /!=\s*null/, /==\s*null/, /\?\./],
      python: [/is\s+not\s+None/, /is\s+None/, /!=\s*None/, /==\s*None/],
      java: [/!=\s*null/, /==\s*null/, /Objects\.isNull/, /Objects\.nonNull/]
    };

    const patterns = nullPatterns[language] || nullPatterns.javascript;
    const nullCheckCount = patterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const score = Math.min(100, nullCheckCount * 10);

    return {
      score: score,
      value: nullCheckCount,
      threshold: 3,
      status: score >= 50 ? 'good' : 'needs_improvement'
    };
  }

  analyzeTypeChecking(content, language) {
    const typePatterns = {
      javascript: [/typeof\s+/, /instanceof\s+/, /Array\.isArray/, /:\s*\w+\s*[=;]/],
      python: [/isinstance\s*\(/, /type\s*\(/, /:\s*\w+\s*[=]/],
      java: [/instanceof\s+/, /\.getClass\s*\(/, /:\s*\w+\s*[=;]/]
    };

    const patterns = typePatterns[language] || typePatterns.javascript;
    const typeCheckCount = patterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const score = Math.min(100, typeCheckCount * 15);

    return {
      score: score,
      value: typeCheckCount,
      threshold: 2,
      status: score >= 50 ? 'good' : 'needs_improvement'
    };
  }

  // 安全性分析方法（简化实现）
  analyzeInputValidation(content, _language) {
    const validationPatterns = [/validate/, /sanitize/, /escape/, /filter/];
    const validationCount = validationPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const score = Math.min(100, validationCount * 20);

    return {
      score: score,
      value: validationCount,
      threshold: 2,
      status: score >= 60 ? 'good' : 'needs_improvement'
    };
  }

  analyzeOutputEncoding(content, _language) {
    const encodingPatterns = [/encode/, /escape/, /htmlspecialchars/, /encodeURIComponent/];
    const encodingCount = encodingPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const score = Math.min(100, encodingCount * 25);

    return {
      score: score,
      value: encodingCount,
      threshold: 1,
      status: score >= 50 ? 'good' : 'needs_improvement'
    };
  }

  analyzeAuthentication(content, _language) {
    const authPatterns = [/auth/, /login/, /password/, /token/, /session/];
    const authCount = authPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const score = authCount > 0 ? this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE : 90; // 如果没有认证相关代码，可能是好事

    return {
      score: score,
      value: authCount,
      threshold: 0,
      status: 'good'
    };
  }

  analyzeAuthorization(content, _language) {
    const authzPatterns = [/permission/, /role/, /access/, /authorize/, /canAccess/];
    const authzCount = authzPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const score = authzCount > 0 ? this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE : 90;

    return {
      score: score,
      value: authzCount,
      threshold: 0,
      status: 'good'
    };
  }

  // 性能分析方法（简化实现）
  analyzeAlgorithmComplexity(content, _language) {
    const nestedLoops = (content.match(/for\s*\([^}]*for\s*\(/g) || []).length;
    const recursion = (content.match(/function\s+\w+[^}]*\1\s*\(/g) || []).length;

    let score = 100;
    if (nestedLoops > 2) { score = 40; }
    else if (nestedLoops > 0) { score = this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE; }
    if (recursion > 3) { score = Math.min(score, 50); }

    return {
      score: score,
      value: { nestedLoops, recursion },
      threshold: { nestedLoops: 1, recursion: 2 },
      status: score >= this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE ? 'good' : 'needs_improvement'
    };
  }

  analyzeMemoryUsage(content, _language) {
    const memoryPatterns = [/new\s+/, /malloc/, /alloc/, /Array\s*\(/, /Object\s*\(/];
    const allocations = memoryPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const lines = content.split('\n').length;
    const ratio = allocations / lines;

    let score = 100;
    if (ratio > 0.1) { score = 40; }
    else if (ratio > 0.05) { score = this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE; }

    return {
      score: score,
      value: allocations,
      threshold: lines * 0.05,
      status: score >= this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE ? 'good' : 'needs_improvement'
    };
  }

  analyzeIOOperations(content, _language) {
    const ioPatterns = [/fs\./, /file/, /read/, /write/, /fetch/, /axios/, /request/];
    const ioCount = ioPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const asyncPatterns = [/async/, /await/, /Promise/, /then/, /catch/];
    const asyncCount = asyncPatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const score = ioCount > 0 ? Math.min(100, (asyncCount / ioCount) * 100) : 100;

    return {
      score: score,
      value: { io: ioCount, async: asyncCount },
      threshold: { asyncRatio: 0.8 },
      status: score >= this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE ? 'good' : 'needs_improvement'
    };
  }

  analyzeCaching(content, _language) {
    const cachePatterns = [/cache/, /memoize/, /store/, /redis/, /memcached/];
    const cacheCount = cachePatterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const score = cacheCount > 0 ? 80 : 60;

    return {
      score: score,
      value: cacheCount,
      threshold: 1,
      status: score >= this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE ? 'good' : 'fair'
    };
  }

  // 可读性分析方法（简化实现）
  analyzeNaming(content, _language) {
    let goodNames = 0;
    let totalNames = 0;

    const namePattern = /(?:var|let|const|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match;

    while ((match = namePattern.exec(content)) !== null) {
      totalNames++;
      const name = match[1];

      // 简单的命名质量检查
      if (name.length > 3 && !name.match(/^[a-z]+$/)) {
        goodNames++;
      }
    }

    const score = totalNames > 0 ? Math.round((goodNames / totalNames) * 100) : 80;

    return {
      score: score,
      value: { good: goodNames, total: totalNames },
      threshold: 0.8,
      status: score >= this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE ? 'good' : 'needs_improvement'
    };
  }

  analyzeComments(content, _language) {
    const commentRatio = this.calculateCommentRatio(content, _language);
    let score = 100;

    if (commentRatio < 0.05) { score = 40; }
    else if (commentRatio < 0.1) { score = 60; }
    else if (commentRatio > 0.3) { score = 50; }
    else if (commentRatio > 0.2) { score = this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE; }

    return {
      score: score,
      value: commentRatio,
      threshold: { min: 0.1, max: 0.2 },
      status: score >= this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE ? 'good' : 'needs_improvement'
    };
  }

  analyzeFormatting(content, _language) {
    const lines = content.split('\n');
    let wellFormatted = 0;

    lines.forEach(line => {
      // 简单的格式检查
      if (line.trim().length === 0 || // 空行
        line.match(/^\s*[a-zA-Z]/) || // 正确缩进
        line.match(/^\s*[{}[\]]\s*$/) // 括号行
      ) {
        wellFormatted++;
      }
    });

    const score = lines.length > 0 ? Math.round((wellFormatted / lines.length) * 100) : 80;

    return {
      score: score,
      value: { formatted: wellFormatted, total: lines.length },
      threshold: 0.8,
      status: score >= this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE ? 'good' : 'needs_improvement'
    };
  }

  analyzeStructure(content, _language) {
    const functions = this.extractFunctions(content, _language);
    const classes = this.extractClasses(content, _language);

    let score = 80;

    // 检查结构合理性
    if (functions.length > 20) { score -= 20; }
    if (classes.length > 5) { score -= 10; }

    return {
      score: Math.max(0, score),
      value: { functions: functions.length, classes: classes.length },
      threshold: { functions: 15, classes: 3 },
      status: score >= this.QUALITY_THRESHOLDS.GOOD_QUALITY_SCORE ? 'good' : 'needs_improvement'
    };
  }

  // 问题查找方法（简化实现）
  findMaintainabilityIssues(content, _language) {
    const issues = [];

    // 检查大型函数
    const functions = this.extractFunctions(content, _language);
    functions.forEach(func => {
      if (func.length > 50) {
        issues.push({
          category: 'maintainability',
          type: 'large_function',
          severity: 'medium',
          message: `函数 '${func.name}' 过长 (${func.length} 行)`,
          line: func.startLine,
          suggestion: '拆分为更小的函数'
        });
      }
    });

    return issues;
  }

  findReliabilityIssues(content, _language) {
    const issues = [];

    // 检查缺少错误处理
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('JSON.parse') && !content.includes('try')) {
        issues.push({
          category: 'reliability',
          type: 'missing_error_handling',
          severity: 'high',
          message: 'JSON.parse 缺少错误处理',
          line: index + 1,
          suggestion: '使用 try-catch 包装 JSON.parse'
        });
      }
    });

    return issues;
  }

  findSecurityIssues(content, _language) {
    const issues = [];

    // 检查潜在的SQL注入
    if (content.includes('SELECT') && content.includes('+')) {
      issues.push({
        category: 'security',
        type: 'sql_injection',
        severity: 'critical',
        message: '潜在的SQL注入风险',
        line: 0,
        suggestion: '使用参数化查询'
      });
    }

    return issues;
  }

  findPerformanceIssues(content, _language) {
    const issues = [];

    // 检查嵌套循环
    const nestedLoops = content.match(/for\s*\([^}]*for\s*\(/g);
    if (nestedLoops && nestedLoops.length > 0) {
      issues.push({
        category: 'performance',
        type: 'nested_loops',
        severity: 'medium',
        message: '嵌套循环可能影响性能',
        line: 0,
        suggestion: '考虑优化算法复杂度'
      });
    }

    return issues;
  }

  findReadabilityIssues(content, _language) {
    const issues = [];

    // 检查长行
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.length > this.QUALITY_THRESHOLDS.MAX_LINE_LENGTH) {
        issues.push({
          category: 'readability',
          type: 'long_line',
          severity: 'low',
          message: `行过长 (${line.length} 字符)`,
          line: index + 1,
          suggestion: '拆分长行，提高可读性'
        });
      }
    });

    return issues;
  }

  // 工具方法
  calculateCyclomaticComplexity(content) {
    const complexityPatterns = [
      /\bif\b/g, /\belse\b/g, /\bwhile\b/g, /\bfor\b/g,
      /\bcase\b/g, /\bcatch\b/g, /&&/g, /\|\|/g
    ];

    let complexity = 1;
    complexityPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      complexity += matches.length;
    });

    return complexity;
  }

  calculateDuplicationRatio(content) {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const lineHashes = new Map();
    let duplicateLines = 0;

    lines.forEach(line => {
      const hash = this.simpleHash(line.trim());
      if (lineHashes.has(hash)) {
        duplicateLines++;
      } else {
        lineHashes.set(hash, 1);
      }
    });

    return lines.length > 0 ? duplicateLines / lines.length : 0;
  }

  calculateCommentRatio(content, language) {
    const commentPatterns = {
      javascript: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//gm],
      python: [/#.*$/gm, /"""[\s\S]*?"""/gm],
      java: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//gm]
    };

    const patterns = commentPatterns[language] || commentPatterns.javascript;
    let commentChars = 0;

    patterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      commentChars += matches.reduce((sum, match) => sum + match.length, 0);
    });

    return content.length > 0 ? commentChars / content.length : 0;
  }

  analyzeErrorHandlingCoverage(content, _language) {
    const errorPatterns = {
      javascript: [/try\s*{/, /catch\s*\(/],
      python: [/try\s*:/, /except\s+/],
      java: [/try\s*{/, /catch\s*\(/]
    };

    const patterns = errorPatterns[_language] || errorPatterns.javascript;
    const errorHandlingCount = patterns.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    const riskyOperations = [
      /JSON\.parse/, /parseInt/, /parseFloat/, /fetch/, /axios/,
      /fs\./, /require/, /import/, /eval/
    ];

    const riskyCount = riskyOperations.reduce((count, pattern) => {
      return count + (content.match(pattern) || []).length;
    }, 0);

    return riskyCount > 0 ? errorHandlingCount / riskyCount : 1;
  }

  findBasicSecurityIssues(content, _language) {
    const issues = [];

    // 检查常见安全问题
    const securityPatterns = [
      { pattern: /eval\s*\(/, issue: 'eval usage' },
      { pattern: /innerHTML\s*=/, issue: 'innerHTML assignment' },
      { pattern: /document\.write/, issue: 'document.write usage' },
      { pattern: /\$\{[^}]*\}/, issue: 'template literal injection risk' }
    ];

    securityPatterns.forEach(({ pattern, issue }) => {
      if (pattern.test(content)) {
        issues.push(issue);
      }
    });

    return issues;
  }

  extractFunctions(content, _language) {
    const functions = [];
    const functionPattern = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let match;

    while ((match = functionPattern.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        startLine: startLine,
        length: 20 // 简化实现
      });
    }

    return functions;
  }

  extractClasses(content, _language) {
    const classes = [];
    const classPattern = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*{/g;
    let match;

    while ((match = classPattern.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      classes.push({
        name: match[1],
        startLine: startLine,
        length: 50 // 简化实现
      });
    }

    return classes;
  }

  compareMetrics(current, benchmark) {
    const comparison = {};

    Object.keys(benchmark).forEach(key => {
      const currentValue = current[key] || 0;
      const benchmarkValue = benchmark[key];
      const ratio = benchmarkValue > 0 ? currentValue / benchmarkValue : 1;

      comparison[key] = {
        current: currentValue,
        benchmark: benchmarkValue,
        ratio: ratio,
        status: ratio <= 1.1 ? 'good' : ratio <= 1.5 ? 'fair' : 'poor'
      };
    });

    return comparison;
  }

  generateCacheKey(content, language, options) {
    const contentHash = this.simpleHash(content);
    const optionsHash = this.simpleHash(JSON.stringify(options));
    return `quality_${language}_${contentHash}_${optionsHash}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  cleanupCache() {
    if (this.analysisCache.size > 50) {
      const entries = Array.from(this.analysisCache.entries());
      const toDelete = entries.slice(0, 25);
      toDelete.forEach(([key]) => this.analysisCache.delete(key));
    }
  }

  /**
   * 执行基础安全分析（SecurityScanner不可用时的后备方案）
   * @param {string} content - 代码内容
   * @param {string} language - 编程语言
   * @returns {Object} 基础安全分析结果
   * @ai-generated: 基于Claude 4 Sonnet生成的后备安全分析
   */
  performBasicSecurityAnalysis(content, _language) {
    const vulnerabilities = [];
    const securityPatterns = [
      { pattern: /eval\s*\(/gi, severity: 'critical', description: 'Code injection via eval()' },
      { pattern: /innerHTML\s*=\s*[^;]+\+/gi, severity: 'high', description: 'XSS via innerHTML concatenation' },
      { pattern: /document\.write\s*\(/gi, severity: 'high', description: 'XSS via document.write' },
      { pattern: /password\s*=\s*["'][^"']*["']/gi, severity: 'critical', description: 'Hardcoded password' },
      { pattern: /api[_-]?key\s*=\s*["'][^"']*["']/gi, severity: 'critical', description: 'Hardcoded API key' }
    ];

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      securityPatterns.forEach(pattern => {
        if (pattern.pattern.test(line)) {
          vulnerabilities.push({
            severity: pattern.severity,
            description: pattern.description,
            line: index + 1,
            snippet: line.trim()
          });
        }
      });
    });

    return {
      vulnerabilities,
      securityScore: Math.max(100 - vulnerabilities.length * 10, 0),
      riskLevel: vulnerabilities.some(v => v.severity === 'critical') ? 'critical' :
        vulnerabilities.some(v => v.severity === 'high') ? 'high' : 'low'
    };
  }

  /**
   * 分析AI生成代码
   * @param {string} content - 代码内容
   * @param {string} language - 编程语言
   * @returns {Object} AI代码分析结果
   * @ai-generated: 基于Claude 4 Sonnet生成的AI代码检测逻辑
   */
  analyzeAIGeneratedCode(content, _language) {
    const aiMarkers = [];
    const aiPatterns = [
      { pattern: /@ai-generated/gi, type: 'explicit_marker', confidence: 1.0 },
      { pattern: /@copilot/gi, type: 'copilot_marker', confidence: 0.9 },
      { pattern: /@cursor/gi, type: 'cursor_marker', confidence: 0.9 },
      { pattern: /\/\*\s*AI\s*generated/gi, type: 'ai_comment', confidence: 0.8 },
      { pattern: /\/\/\s*Generated\s*by\s*AI/gi, type: 'ai_comment', confidence: 0.8 }
    ];

    const lines = content.split('\n');
    let totalAILines = 0;

    lines.forEach((line, index) => {
      aiPatterns.forEach(pattern => {
        if (pattern.pattern.test(line)) {
          aiMarkers.push({
            type: pattern.type,
            line: index + 1,
            confidence: pattern.confidence,
            snippet: line.trim()
          });
          totalAILines++;
        }
      });
    });

    const aiCodeRatio = totalAILines / lines.length;
    const hallucinationRisk = this.assessHallucinationRisk(content);

    return {
      hasAICode: aiMarkers.length > 0,
      aiMarkers,
      aiCodeRatio,
      hallucinationRisk,
      trustScore: Math.max(1 - hallucinationRisk, 0),
      recommendations: this.generateAICodeRecommendations(aiMarkers, hallucinationRisk)
    };
  }

  /**
   * 评估AI幻觉风险
   * @param {string} content - 代码内容
   * @returns {number} 幻觉风险评分 (0-1)
   * @ai-generated: 基于Claude 4 Sonnet生成的幻觉风险评估
   */
  assessHallucinationRisk(content) {
    let riskScore = 0;
    const hallucinationIndicators = [
      { pattern: /placeholder/gi, weight: 0.3 },
      { pattern: /TODO.*implement/gi, weight: 0.2 },
      { pattern: /FIXME.*AI/gi, weight: 0.3 },
      { pattern: /example.*only/gi, weight: 0.2 },
      { pattern: /not.*implemented/gi, weight: 0.2 },
      { pattern: /function\s+placeholder/gi, weight: 0.4 }
    ];

    hallucinationIndicators.forEach(indicator => {
      const matches = content.match(indicator.pattern);
      if (matches) {
        riskScore += indicator.weight * matches.length;
      }
    });

    return Math.min(riskScore, 1.0);
  }

  /**
   * 生成AI代码建议
   * @param {Array} aiMarkers - AI标记
   * @param {number} hallucinationRisk - 幻觉风险
   * @returns {Array} 建议列表
   * @ai-generated: 基于Claude 4 Sonnet生成的AI代码建议逻辑
   */
  generateAICodeRecommendations(aiMarkers, hallucinationRisk) {
    const recommendations = [];

    if (aiMarkers.length === 0) {
      recommendations.push({
        type: 'missing_markers',
        priority: 'medium',
        message: '建议为AI生成的代码添加@ai-generated标记以提高可追溯性'
      });
    }

    if (hallucinationRisk > this.QUALITY_THRESHOLDS.AI_HALLUCINATION_THRESHOLD) {
      recommendations.push({
        type: 'high_hallucination_risk',
        priority: 'high',
        message: '检测到高AI幻觉风险，建议人工审查和测试'
      });
    }

    if (aiMarkers.some(marker => marker.confidence < 0.7)) {
      recommendations.push({
        type: 'low_confidence_markers',
        priority: 'medium',
        message: '部分AI代码标记置信度较低，建议明确标注来源'
      });
    }

    return recommendations;
  }

  /**
   * 检查合规性状态
   * @param {string} content - 代码内容
   * @param {string} language - 编程语言
   * @param {Object} securityScanResult - 安全扫描结果
   * @returns {Object} 合规性状态
   * @ai-generated: 基于Claude 4 Sonnet生成的合规性检查逻辑
   */
  checkComplianceStatus(content, language, securityScanResult) {
    const complianceChecks = {
      'PCI-DSS': this.checkPCIDSSCompliance(content, securityScanResult),
      'OWASP-Top-10': this.checkOWASPCompliance(content, securityScanResult),
      'NIST-CSF': this.checkNISTCompliance(content, securityScanResult)
    };

    const overallScore = Object.values(complianceChecks).reduce((sum, check) => sum + check.score, 0) / Object.keys(complianceChecks).length;
    const isCompliant = overallScore >= this.QUALITY_THRESHOLDS.COMPLIANCE_SCORE_MIN;

    return {
      isCompliant,
      overallScore,
      checks: complianceChecks,
      violations: this.extractComplianceViolations(complianceChecks),
      recommendations: this.generateComplianceRecommendations(complianceChecks)
    };
  }

  /**
   * 检查PCI-DSS合规性
   * @param {string} content - 代码内容
   * @param {Object} securityScanResult - 安全扫描结果
   * @returns {Object} PCI-DSS合规性检查结果
   * @ai-generated: 基于Claude 4 Sonnet生成的PCI-DSS检查逻辑
   */
  checkPCIDSSCompliance(content, securityScanResult) {
    let score = 100;
    const violations = [];

    // 检查信用卡数据暴露
    const cardPattern = /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g;
    if (cardPattern.test(content)) {
      score -= 50;
      violations.push('Potential credit card number exposure');
    }

    // 检查加密要求
    if (securityScanResult && securityScanResult.vulnerabilities) {
      const cryptoVulns = securityScanResult.vulnerabilities.filter(v => v.category === 'cryptographic');
      score -= cryptoVulns.length * 10;
      violations.push(...cryptoVulns.map(v => v.description));
    }

    return {
      standard: 'PCI-DSS-v4.0',
      score: Math.max(score, 0),
      violations,
      isCompliant: score >= 90
    };
  }

  /**
   * 检查OWASP合规性
   * @param {string} content - 代码内容
   * @param {Object} securityScanResult - 安全扫描结果
   * @returns {Object} OWASP合规性检查结果
   * @ai-generated: 基于Claude 4 Sonnet生成的OWASP检查逻辑
   */
  checkOWASPCompliance(content, securityScanResult) {
    let score = 100;
    const violations = [];

    if (securityScanResult && securityScanResult.vulnerabilities) {
      securityScanResult.vulnerabilities.forEach(vuln => {
        switch (vuln.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
        }
        violations.push(vuln.description);
      });
    }

    return {
      standard: 'OWASP-Top-10-2021',
      score: Math.max(score, 0),
      violations,
      isCompliant: score >= 80
    };
  }

  /**
   * 检查NIST合规性
   * @param {string} content - 代码内容
   * @param {Object} securityScanResult - 安全扫描结果
   * @returns {Object} NIST合规性检查结果
   * @ai-generated: 基于Claude 4 Sonnet生成的NIST检查逻辑
   */
  checkNISTCompliance(content, _securityScanResult) {
    let score = 100;
    const violations = [];

    // 检查日志记录
    const logPatterns = [
      /console\.log\s*\(/gi,
      /console\.error\s*\(/gi,
      /console\.warn\s*\(/gi
    ];

    let hasLogging = false;
    logPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        hasLogging = true;
      }
    });

    if (!hasLogging) {
      score -= 20;
      violations.push('Missing security logging and monitoring');
    }

    // 检查错误处理
    const errorHandlingPattern = /try\s*\{[^}]*\}\s*catch\s*\([^)]*\)\s*\{[^}]*\}/gi;
    if (!errorHandlingPattern.test(content)) {
      score -= 15;
      violations.push('Insufficient error handling');
    }

    return {
      standard: 'NIST-CSF-2.0',
      score: Math.max(score, 0),
      violations,
      isCompliant: score >= 85
    };
  }

  /**
   * 提取合规性违规
   * @param {Object} complianceChecks - 合规性检查结果
   * @returns {Array} 违规列表
   * @ai-generated: 基于Claude 4 Sonnet生成的违规提取逻辑
   */
  extractComplianceViolations(complianceChecks) {
    const allViolations = [];

    Object.entries(complianceChecks).forEach(([standard, check]) => {
      check.violations.forEach(violation => {
        allViolations.push({
          standard,
          violation,
          severity: check.score < 50 ? 'critical' : check.score < 80 ? 'high' : 'medium'
        });
      });
    });

    return allViolations;
  }

  /**
   * 生成合规性建议
   * @param {Object} complianceChecks - 合规性检查结果
   * @returns {Array} 建议列表
   * @ai-generated: 基于Claude 4 Sonnet生成的合规性建议逻辑
   */
  generateComplianceRecommendations(complianceChecks) {
    const recommendations = [];

    Object.entries(complianceChecks).forEach(([standard, check]) => {
      if (!check.isCompliant) {
        recommendations.push({
          standard,
          priority: check.score < 50 ? 'critical' : 'high',
          message: `${standard}合规性评分过低(${check.score})，需要立即修复违规项`,
          violations: check.violations
        });
      }
    });

    return recommendations;
  }

  /**
   * 识别阻断问题
   * @param {Object} analysis - 分析结果
   * @returns {Array} 阻断问题列表
   * @ai-generated: 基于Claude 4 Sonnet生成的阻断问题识别逻辑
   */
  identifyBlockingIssues(analysis) {
    const blockingIssues = [];

    // 检查CVSS评分
    if (analysis.security && analysis.security.vulnerabilities) {
      const criticalVulns = analysis.security.vulnerabilities.filter(v =>
        v.cvssScore >= this.QUALITY_THRESHOLDS.CVSS_BLOCK_THRESHOLD
      );

      if (criticalVulns.length > 0) {
        blockingIssues.push({
          type: 'critical_vulnerability',
          severity: 'critical',
          message: `发现${criticalVulns.length}个高危漏洞，CVSS评分≥${this.QUALITY_THRESHOLDS.CVSS_BLOCK_THRESHOLD}`,
          details: criticalVulns
        });
      }
    }

    // 检查安全评分
    if (analysis.security && analysis.security.securityScore < this.QUALITY_THRESHOLDS.SECURITY_SCORE_MIN) {
      blockingIssues.push({
        type: 'low_security_score',
        severity: 'high',
        message: `安全评分过低(${analysis.security.securityScore})，低于最低要求(${this.QUALITY_THRESHOLDS.SECURITY_SCORE_MIN})`,
        details: analysis.security
      });
    }

    // 检查合规性
    if (analysis.complianceStatus && !analysis.complianceStatus.isCompliant) {
      blockingIssues.push({
        type: 'compliance_violation',
        severity: 'high',
        message: '存在合规性违规，需要修复后才能继续',
        details: analysis.complianceStatus.violations
      });
    }

    // 检查AI幻觉风险
    if (analysis.aiCodeAnalysis && analysis.aiCodeAnalysis.hallucinationRisk > this.QUALITY_THRESHOLDS.AI_HALLUCINATION_THRESHOLD) {
      blockingIssues.push({
        type: 'high_ai_hallucination_risk',
        severity: 'medium',
        message: `AI幻觉风险过高(${analysis.aiCodeAnalysis.hallucinationRisk})，建议人工审查`,
        details: analysis.aiCodeAnalysis
      });
    }

    return blockingIssues;
  }

  /**
   * 计算增强的总体评分（包含安全评分）
   * @param {Object} metrics - 质量指标
   * @param {Object} security - 安全分析结果
   * @returns {number} 总体评分
   * @ai-generated: 基于Claude 4 Sonnet生成的增强评分逻辑
   */
  calculateEnhancedOverallScore(metrics, security) {
    // 原有质量评分
    const qualityScore = this.calculateOverallScore(metrics);

    // 安全评分权重
    const securityWeight = 0.3;
    const qualityWeight = 0.7;

    // 安全评分
    const securityScore = security ? (security.securityScore || 0) : 0;

    // 综合评分
    const enhancedScore = (qualityScore * qualityWeight) + (securityScore * securityWeight);

    return Math.round(enhancedScore);
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QualityAnalyzer;
} else if (typeof window !== 'undefined') {
  window.QualityAnalyzer = QualityAnalyzer;
}
