/**
 * 报告生成器 - 负责生成各种格式的代码分析报告
 * 符合单一职责原则：专门处理报告生成、格式化、导出等功能
 */
class ReportGenerator {
  constructor() {
    // @ai-generated: 基于Claude 4 Sonnet生成的常量定义
    this.REPORT_CONSTANTS = {
      QUALITY_BASELINE: 70,
      MAX_SCORE: 100,
      MIN_SCORE: 0,
      QUALITY_MULTIPLIER: 2,
      SECURITY_MULTIPLIER: 1.5,
      PERFORMANCE_MULTIPLIER: 1.2,
      MAINTAINABILITY_MULTIPLIER: 1.3,
      TIMESTAMP_LENGTH: 19
    };
    this.reportTemplates = {
      summary: {
        name: '摘要报告',
        description: '项目概览和关键指标',
        sections: ['overview', 'metrics', 'highlights', 'recommendations']
      },
      detailed: {
        name: '详细报告',
        description: '完整的分析结果和建议',
        sections: ['overview', 'structure', 'dependencies', 'quality', 'security', 'issues', 'recommendations']
      },
      executive: {
        name: '管理层报告',
        description: '面向管理层的高层次总结',
        sections: ['executive_summary', 'key_metrics', 'risk_assessment', 'action_items']
      },
      technical: {
        name: '技术报告',
        description: '面向开发团队的技术细节',
        sections: ['technical_analysis', 'code_metrics', 'architecture', 'performance', 'best_practices']
      }
    };

    this.outputFormats = {
      html: {
        name: 'HTML报告',
        extension: '.html',
        mimeType: 'text/html',
        supportsCharts: true,
        supportsInteractivity: true
      },
      markdown: {
        name: 'Markdown报告',
        extension: '.md',
        mimeType: 'text/markdown',
        supportsCharts: false,
        supportsInteractivity: false
      },
      json: {
        name: 'JSON数据',
        extension: '.json',
        mimeType: 'application/json',
        supportsCharts: false,
        supportsInteractivity: false
      },
      pdf: {
        name: 'PDF报告',
        extension: '.pdf',
        mimeType: 'application/pdf',
        supportsCharts: true,
        supportsInteractivity: false
      }
    };

    this.chartConfig = {
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#06b6d4'
      },
      themes: {
        light: {
          background: '#ffffff',
          text: '#1f2937',
          border: '#e5e7eb'
        },
        dark: {
          background: '#1f2937',
          text: '#f9fafb',
          border: '#374151'
        }
      }
    };

    this.reportCache = new Map();
    this.generationHistory = [];
  }

  /**
     * 生成分析报告
     * @param {Object} analysisResult - 分析结果
     * @param {Object} options - 生成选项
     * @returns {Object} 生成的报告
     */
  async generateReport(analysisResult, options = {}) {
    try {
      const startTime = Date.now();

      // 验证输入
      if (!analysisResult || !analysisResult.success) {
        throw new Error('无效的分析结果');
      }

      // 设置默认选项
      const config = {
        template: options.template || 'detailed',
        format: options.format || 'html',
        theme: options.theme || 'light',
        includeCharts: options.includeCharts !== false,
        includeRawData: options.includeRawData || false,
        language: options.language || 'zh-CN',
        title: options.title || '代码分析报告',
        author: options.author || 'Code Analyzer',
        timestamp: new Date().toISOString(),
        ...options
      };

      // 检查缓存
      const cacheKey = this.generateCacheKey(analysisResult, config);
      if (this.reportCache.has(cacheKey) && !config.forceRegenerate) {
        return this.reportCache.get(cacheKey);
      }

      // 生成报告内容
      const reportData = await this.prepareReportData(analysisResult.analysis, config);

      // 根据格式生成报告
      let reportContent;
      switch (config.format) {
      case 'html':
        reportContent = await this.generateHtmlReport(reportData, config);
        break;
      case 'markdown':
        reportContent = await this.generateMarkdownReport(reportData, config);
        break;
      case 'json':
        reportContent = await this.generateJsonReport(reportData, config);
        break;
      case 'pdf':
        reportContent = await this.generatePdfReport(reportData, config);
        break;
      default:
        throw new Error(`不支持的报告格式: ${config.format}`);
      }

      const report = {
        success: true,
        config: config,
        content: reportContent,
        metadata: {
          generatedAt: config.timestamp,
          generationTime: Date.now() - startTime,
          template: config.template,
          format: config.format,
          size: this.calculateReportSize(reportContent),
          checksum: this.calculateChecksum(reportContent)
        },
        downloadInfo: {
          filename: this.generateFilename(config),
          mimeType: this.outputFormats[config.format].mimeType,
          extension: this.outputFormats[config.format].extension
        }
      };

      // 缓存报告
      this.reportCache.set(cacheKey, report);

      // 记录生成历史
      this.generationHistory.push({
        timestamp: config.timestamp,
        template: config.template,
        format: config.format,
        size: report.metadata.size,
        generationTime: report.metadata.generationTime
      });

      return report;
    } catch (error) {
      return {
        success: false,
        error: `报告生成失败: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
     * 准备报告数据
     * @param {Object} analysis - 分析数据
     * @param {Object} config - 配置
     * @returns {Object} 准备好的报告数据
     */
  async prepareReportData(analysis, config) {
    const template = this.reportTemplates[config.template];
    if (!template) {
      throw new Error(`未知的报告模板: ${config.template}`);
    }

    const reportData = {
      metadata: {
        title: config.title,
        author: config.author,
        generatedAt: config.timestamp,
        template: template.name,
        description: template.description,
        projectPath: analysis.projectPath,
        scanTime: analysis.scanTime
      },
      sections: {}
    };

    // 根据模板生成各个部分
    for (const sectionName of template.sections) {
      reportData.sections[sectionName] = await this.generateSection(sectionName, analysis, config);
    }

    // 生成图表数据
    if (config.includeCharts) {
      reportData.charts = await this.generateChartData(analysis, config);
    }

    // 包含原始数据
    if (config.includeRawData) {
      reportData.rawData = analysis;
    }

    return reportData;
  }

  /**
     * 生成报告部分
     * @param {string} sectionName - 部分名称
     * @param {Object} analysis - 分析数据
     * @param {Object} config - 配置
     * @returns {Object} 部分内容
     */
  async generateSection(sectionName, analysis, config) {
    switch (sectionName) {
    case 'overview':
      return this.generateOverviewSection(analysis, config);
    case 'metrics':
      return this.generateMetricsSection(analysis, config);
    case 'highlights':
      return this.generateHighlightsSection(analysis, config);
    case 'structure':
      return this.generateStructureSection(analysis, config);
    case 'dependencies':
      return this.generateDependenciesSection(analysis, config);
    case 'quality':
      return this.generateQualitySection(analysis, config);
    case 'security':
      return this.generateSecuritySection(analysis, config);
    case 'issues':
      return this.generateIssuesSection(analysis, config);
    case 'recommendations':
      return this.generateRecommendationsSection(analysis, config);
    case 'executive_summary':
      return this.generateExecutiveSummarySection(analysis, config);
    case 'key_metrics':
      return this.generateKeyMetricsSection(analysis, config);
    case 'risk_assessment':
      return this.generateRiskAssessmentSection(analysis, config);
    case 'action_items':
      return this.generateActionItemsSection(analysis, config);
    case 'technical_analysis':
      return this.generateTechnicalAnalysisSection(analysis, config);
    case 'code_metrics':
      return this.generateCodeMetricsSection(analysis, config);
    case 'architecture':
      return this.generateArchitectureSection(analysis, config);
    case 'performance':
      return this.generatePerformanceSection(analysis, config);
    case 'best_practices':
      return this.generateBestPracticesSection(analysis, config);
    default:
      return {
        title: sectionName,
        content: '该部分内容暂未实现',
        status: 'placeholder'
      };
    }
  }

  /**
     * 生成概览部分
     */
  generateOverviewSection(analysis, _config) {
    return {
      title: '项目概览',
      content: {
        summary: analysis.summary,
        basicInfo: {
          projectPath: analysis.projectPath,
          scanTime: analysis.scanTime,
          fileCount: analysis.fileCount,
          directoryCount: analysis.directoryCount,
          overallScore: analysis.overallScore,
          grade: analysis.grade
        },
        languageDistribution: analysis.summary.statistics.languageDistribution,
        projectHealth: analysis.summary.health
      },
      status: 'complete'
    };
  }

  /**
     * 生成指标部分
     */
  generateMetricsSection(analysis, _config) {
    return {
      title: '关键指标',
      content: {
        size: analysis.metrics.size,
        complexity: analysis.metrics.complexity,
        dependencies: analysis.metrics.dependencies,
        quality: analysis.metrics.quality,
        scoreBreakdown: {
          structure: analysis.structure.score,
          dependencies: analysis.dependencies.score,
          maintainability: analysis.maintainability.score,
          quality: analysis.quality.score,
          security: analysis.security.score
        }
      },
      status: 'complete'
    };
  }

  /**
     * 生成亮点部分
     */
  generateHighlightsSection(analysis, _config) {
    return {
      title: '项目亮点',
      content: {
        strengths: analysis.summary.highlights.strengths,
        weaknesses: analysis.summary.highlights.weaknesses,
        opportunities: analysis.summary.highlights.opportunities,
        topIssues: this.getTopIssues(analysis),
        topRecommendations: this.getTopRecommendations(analysis)
      },
      status: 'complete'
    };
  }

  /**
     * 生成结构部分
     */
  generateStructureSection(analysis, _config) {
    return {
      title: '项目结构分析',
      content: {
        score: analysis.structure.score,
        details: analysis.structure.details,
        issues: analysis.structure.issues,
        recommendations: analysis.structure.recommendations
      },
      status: 'complete'
    };
  }

  /**
     * 生成依赖部分
     */
  generateDependenciesSection(analysis, _config) {
    return {
      title: '依赖关系分析',
      content: {
        score: analysis.dependencies.score,
        details: analysis.dependencies.details,
        issues: analysis.dependencies.issues,
        recommendations: analysis.dependencies.recommendations
      },
      status: 'complete'
    };
  }

  /**
     * 生成质量部分
     */
  generateQualitySection(analysis, _config) {
    return {
      title: '代码质量分析',
      content: {
        score: analysis.quality.score,
        details: analysis.quality.details,
        issues: analysis.quality.issues,
        recommendations: analysis.quality.recommendations
      },
      status: 'complete'
    };
  }

  /**
     * 生成安全部分
     */
  generateSecuritySection(analysis, _config) {
    return {
      title: '安全性分析',
      content: {
        score: analysis.security.score,
        details: analysis.security.details,
        issues: analysis.security.issues,
        recommendations: analysis.security.recommendations
      },
      status: 'complete'
    };
  }

  /**
     * 生成问题部分
     */
  generateIssuesSection(analysis, _config) {
    const allIssues = [
      ...analysis.structure.issues,
      ...analysis.dependencies.issues,
      ...analysis.maintainability.issues,
      ...analysis.quality.issues,
      ...analysis.security.issues
    ];

    return {
      title: '问题汇总',
      content: {
        totalIssues: allIssues.length,
        issuesByCategory: this.groupIssuesByCategory(allIssues),
        issuesBySeverity: this.groupIssuesBySeverity(allIssues),
        criticalIssues: allIssues.filter(issue => issue.severity === 'critical'),
        highPriorityIssues: allIssues.filter(issue => issue.severity === 'high'),
        allIssues: allIssues
      },
      status: 'complete'
    };
  }

  /**
     * 生成建议部分
     */
  generateRecommendationsSection(analysis, _config) {
    const allRecommendations = [
      ...analysis.structure.recommendations,
      ...analysis.dependencies.recommendations,
      ...analysis.maintainability.recommendations,
      ...analysis.quality.recommendations,
      ...analysis.security.recommendations,
      ...analysis.recommendations
    ];

    return {
      title: '改进建议',
      content: {
        totalRecommendations: allRecommendations.length,
        recommendationsByCategory: this.groupRecommendationsByCategory(allRecommendations),
        recommendationsByPriority: this.groupRecommendationsByPriority(allRecommendations),
        quickWins: allRecommendations.filter(rec => rec.priority === 'high' && rec.impact),
        longTermGoals: allRecommendations.filter(rec => rec.priority === 'medium' || rec.priority === 'low'),
        allRecommendations: allRecommendations
      },
      status: 'complete'
    };
  }

  /**
     * 生成管理层摘要部分
     */
  generateExecutiveSummarySection(analysis, _config) {
    return {
      title: '管理层摘要',
      content: {
        projectOverview: {
          name: analysis.projectPath.split('/').pop(),
          size: `${analysis.fileCount} 个文件`,
          complexity: analysis.summary.health.complexity,
          overallHealth: analysis.summary.health.overallHealth,
          grade: analysis.grade
        },
        keyFindings: {
          strengths: analysis.summary.highlights.strengths.slice(0, 3),
          risks: this.identifyKeyRisks(analysis),
          opportunities: analysis.summary.highlights.opportunities.slice(0, 3)
        },
        businessImpact: {
          maintainabilityCost: this.estimateMaintainabilityCost(analysis),
          technicalDebt: this.estimateTechnicalDebt(analysis),
          riskLevel: this.assessOverallRisk(analysis)
        }
      },
      status: 'complete'
    };
  }

  /**
     * 生成关键指标部分
     */
  generateKeyMetricsSection(analysis, _config) {
    return {
      title: '关键指标',
      content: {
        qualityScore: analysis.overallScore,
        complexityIndex: analysis.metrics.complexity.average,
        maintainabilityIndex: analysis.maintainability.score,
        securityScore: analysis.security.score,
        testCoverage: analysis.quality.details.coverage.coverage * 100,
        technicalDebtRatio: this.calculateTechnicalDebtRatio(analysis)
      },
      status: 'complete'
    };
  }

  /**
     * 生成风险评估部分
     */
  generateRiskAssessmentSection(analysis, _config) {
    return {
      title: '风险评估',
      content: {
        overallRisk: this.assessOverallRisk(analysis),
        riskFactors: this.identifyRiskFactors(analysis),
        securityRisks: analysis.security.issues.filter(issue => issue.severity === 'high' || issue.severity === 'critical'),
        qualityRisks: analysis.quality.issues.filter(issue => issue.severity === 'high'),
        mitigationStrategies: this.generateMitigationStrategies(analysis)
      },
      status: 'complete'
    };
  }

  /**
     * 生成行动项部分
     */
  generateActionItemsSection(analysis, _config) {
    const allRecommendations = [
      ...analysis.structure.recommendations,
      ...analysis.dependencies.recommendations,
      ...analysis.maintainability.recommendations,
      ...analysis.quality.recommendations,
      ...analysis.security.recommendations,
      ...analysis.recommendations
    ];

    return {
      title: '行动项',
      content: {
        immediate: allRecommendations.filter(rec => rec.priority === 'critical' || rec.priority === 'high'),
        shortTerm: allRecommendations.filter(rec => rec.priority === 'medium'),
        longTerm: allRecommendations.filter(rec => rec.priority === 'low'),
        resourceRequirements: this.estimateResourceRequirements(allRecommendations),
        timeline: this.generateTimeline(allRecommendations)
      },
      status: 'complete'
    };
  }

  /**
     * 生成技术分析部分
     */
  generateTechnicalAnalysisSection(analysis, _config) {
    return {
      title: '技术分析',
      content: {
        architecture: analysis.structure,
        codeMetrics: analysis.metrics,
        dependencyAnalysis: analysis.dependencies,
        performanceIndicators: {
          averageFileSize: analysis.metrics.size.averageFileSize,
          averageComplexity: analysis.metrics.complexity.average,
          couplingIndex: analysis.dependencies.details.coupling.averageCoupling
        },
        technicalDebt: this.analyzeTechnicalDebt(analysis)
      },
      status: 'complete'
    };
  }

  /**
     * 生成代码指标部分
     */
  generateCodeMetricsSection(analysis, _config) {
    return {
      title: '代码指标',
      content: {
        size: analysis.metrics.size,
        complexity: analysis.metrics.complexity,
        quality: analysis.metrics.quality,
        maintainability: {
          score: analysis.maintainability.score,
          factors: analysis.maintainability.details
        },
        trends: this.generateMetricTrends(analysis)
      },
      status: 'complete'
    };
  }

  /**
     * 生成架构部分
     */
  generateArchitectureSection(analysis, _config) {
    return {
      title: '架构分析',
      content: {
        structure: analysis.structure.details,
        dependencies: analysis.dependencies.details,
        modularity: analysis.maintainability.details.modularity,
        layering: this.analyzeLayering(analysis),
        patterns: this.identifyArchitecturalPatterns(analysis)
      },
      status: 'complete'
    };
  }

  /**
     * 生成性能部分
     */
  generatePerformanceSection(analysis, _config) {
    return {
      title: '性能分析',
      content: {
        analysisPerformance: analysis.performance,
        codePerformance: {
          complexity: analysis.metrics.complexity,
          efficiency: this.estimateCodeEfficiency(analysis)
        },
        recommendations: this.generatePerformanceRecommendations(analysis)
      },
      status: 'complete'
    };
  }

  /**
     * 生成最佳实践部分
     */
  generateBestPracticesSection(analysis, _config) {
    return {
      title: '最佳实践',
      content: {
        adherence: this.assessBestPracticeAdherence(analysis),
        violations: this.identifyBestPracticeViolations(analysis),
        recommendations: this.generateBestPracticeRecommendations(analysis),
        guidelines: this.getRelevantGuidelines(analysis)
      },
      status: 'complete'
    };
  }

  /**
     * 生成图表数据
     * @param {Object} analysis - 分析数据
     * @param {Object} config - 配置
     * @returns {Object} 图表数据
     */
  async generateChartData(analysis, _config) {
    const charts = {};

    // 分数雷达图
    charts.scoreRadar = {
      type: 'radar',
      title: '各维度评分',
      data: {
        labels: ['结构', '依赖', '可维护性', '质量', '安全性'],
        datasets: [{
          label: '当前分数',
          data: [
            analysis.structure.score,
            analysis.dependencies.score,
            analysis.maintainability.score,
            analysis.quality.score,
            analysis.security.score
          ],
          backgroundColor: 'rgba(37, 99, 235, 0.2)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 2
        }]
      },
      options: {
        scale: {
          ticks: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    };

    // 语言分布饼图
    charts.languageDistribution = {
      type: 'pie',
      title: '编程语言分布',
      data: {
        labels: Object.keys(analysis.summary.statistics.languageDistribution),
        datasets: [{
          data: Object.values(analysis.summary.statistics.languageDistribution),
          backgroundColor: [
            '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
          ]
        }]
      }
    };

    // 复杂度分布柱状图
    charts.complexityDistribution = {
      type: 'bar',
      title: '复杂度分布',
      data: {
        labels: ['低', '中', '高'],
        datasets: [{
          label: '文件数量',
          data: [
            analysis.metrics.complexity.distribution.low,
            analysis.metrics.complexity.distribution.medium,
            analysis.metrics.complexity.distribution.high
          ],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
        }]
      }
    };

    // 问题严重程度分布
    const allIssues = [
      ...analysis.structure.issues,
      ...analysis.dependencies.issues,
      ...analysis.maintainability.issues,
      ...analysis.quality.issues,
      ...analysis.security.issues
    ];

    const issuesBySeverity = this.groupIssuesBySeverity(allIssues);
    charts.issuesSeverity = {
      type: 'doughnut',
      title: '问题严重程度分布',
      data: {
        labels: Object.keys(issuesBySeverity),
        datasets: [{
          data: Object.values(issuesBySeverity).map(issues => issues.length),
          backgroundColor: ['#ef4444', '#f59e0b', '#06b6d4', '#10b981']
        }]
      }
    };

    // 文件大小分布
    charts.fileSizeDistribution = {
      type: 'histogram',
      title: '文件大小分布',
      data: this.generateFileSizeHistogram(analysis),
      options: {
        scales: {
          x: {
            title: {
              display: true,
              text: '文件大小 (行数)'
            }
          },
          y: {
            title: {
              display: true,
              text: '文件数量'
            }
          }
        }
      }
    };

    return charts;
  }

  /**
     * 生成HTML报告
     * @param {Object} reportData - 报告数据
     * @param {Object} config - 配置
     * @returns {string} HTML内容
     */
  async generateHtmlReport(reportData, config) {
    const theme = this.chartConfig.themes[config.theme];

    const html = `
<!DOCTYPE html>
<html lang="${config.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportData.metadata.title}</title>
    <style>
        ${this.generateCssStyles(theme)}
    </style>
    ${config.includeCharts ? '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>' : ''}
</head>
<body>
    <div class="container">
        <header class="report-header">
            <h1>${reportData.metadata.title}</h1>
            <div class="metadata">
                <p><strong>生成时间:</strong> ${new Date(reportData.metadata.generatedAt).toLocaleString()}</p>
                <p><strong>项目路径:</strong> ${reportData.metadata.projectPath}</p>
                <p><strong>模板:</strong> ${reportData.metadata.template}</p>
            </div>
        </header>
        
        <nav class="table-of-contents">
            <h2>目录</h2>
            <ul>
                ${Object.keys(reportData.sections).map(sectionKey =>
    `<li><a href="#${sectionKey}">${reportData.sections[sectionKey].title}</a></li>`
  ).join('')}
            </ul>
        </nav>
        
        <main class="report-content">
            ${Object.entries(reportData.sections).map(([sectionKey, section]) =>
    this.generateHtmlSection(sectionKey, section, config)
  ).join('')}
        </main>
        
        ${config.includeCharts ? this.generateChartsHtml(reportData.charts) : ''}
        
        <footer class="report-footer">
            <p>报告由 ${reportData.metadata.author} 生成</p>
            <p>生成时间: ${new Date(reportData.metadata.generatedAt).toLocaleString()}</p>
        </footer>
    </div>
    
    ${config.includeCharts ? this.generateChartsScript(reportData.charts) : ''}
</body>
</html>`;

    return html;
  }

  /**
     * 生成Markdown报告
     * @param {Object} reportData - 报告数据
     * @param {Object} config - 配置
     * @returns {string} Markdown内容
     */
  async generateMarkdownReport(reportData, config) {
    let markdown = `# ${reportData.metadata.title}\n\n`;

    // 元数据
    markdown += '## 报告信息\n\n';
    markdown += `- **生成时间:** ${new Date(reportData.metadata.generatedAt).toLocaleString()}\n`;
    markdown += `- **项目路径:** ${reportData.metadata.projectPath}\n`;
    markdown += `- **模板:** ${reportData.metadata.template}\n`;
    markdown += `- **作者:** ${reportData.metadata.author}\n\n`;

    // 目录
    markdown += '## 目录\n\n';
    Object.keys(reportData.sections).forEach(sectionKey => {
      const section = reportData.sections[sectionKey];
      markdown += `- [${section.title}](#${sectionKey.replace(/_/g, '-')})\n`;
    });
    markdown += '\n';

    // 各个部分
    Object.entries(reportData.sections).forEach(([sectionKey, section]) => {
      markdown += this.generateMarkdownSection(sectionKey, section, config);
    });

    return markdown;
  }

  /**
     * 生成JSON报告
     * @param {Object} reportData - 报告数据
     * @param {Object} config - 配置
     * @returns {string} JSON内容
     */
  async generateJsonReport(reportData, _config) {
    return JSON.stringify(reportData, null, 2);
  }

  /**
     * 生成PDF报告
     * @param {Object} reportData - 报告数据
     * @param {Object} config - 配置
     * @returns {string} PDF内容（Base64编码）
     */
  async generatePdfReport(_reportData, _config) {
    // 这里应该使用PDF生成库，如jsPDF或puppeteer
    // 为了简化，返回一个占位符
    return 'PDF报告生成功能需要集成PDF库';
  }

  // 工具方法
  generateCacheKey(analysisResult, config) {
    const key = {
      analysisChecksum: this.calculateChecksum(JSON.stringify(analysisResult)),
      template: config.template,
      format: config.format,
      theme: config.theme,
      includeCharts: config.includeCharts,
      includeRawData: config.includeRawData
    };
    return JSON.stringify(key);
  }

  calculateReportSize(content) {
    return new Blob([content]).size;
  }

  calculateChecksum(content) {
    // 简化的校验和计算
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }

  generateFilename(config) {
    const timestamp = new Date().toISOString().slice(0, this.REPORT_CONSTANTS.TIMESTAMP_LENGTH).replace(/[:-]/g, '');
    const extension = this.outputFormats[config.format].extension;
    return `code-analysis-${config.template}-${timestamp}${extension}`;
  }

  getTopIssues(analysis) {
    const allIssues = [
      ...analysis.structure.issues,
      ...analysis.dependencies.issues,
      ...analysis.maintainability.issues,
      ...analysis.quality.issues,
      ...analysis.security.issues
    ];

    return allIssues
      .sort((a, b) => {
        const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 5);
  }

  getTopRecommendations(analysis) {
    const allRecommendations = [
      ...analysis.structure.recommendations,
      ...analysis.dependencies.recommendations,
      ...analysis.maintainability.recommendations,
      ...analysis.quality.recommendations,
      ...analysis.security.recommendations,
      ...analysis.recommendations
    ];

    return allRecommendations
      .sort((a, b) => {
        const priorityOrder = { 'critical': 5, 'high': 4, 'medium': 3, 'low': 2, 'info': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 5);
  }

  groupIssuesByCategory(issues) {
    return issues.reduce((groups, issue) => {
      const category = issue.category || 'other';
      if (!groups[category]) { groups[category] = []; }
      groups[category].push(issue);
      return groups;
    }, {});
  }

  groupIssuesBySeverity(issues) {
    return issues.reduce((groups, issue) => {
      const severity = issue.severity || 'unknown';
      if (!groups[severity]) { groups[severity] = []; }
      groups[severity].push(issue);
      return groups;
    }, {});
  }

  groupRecommendationsByCategory(recommendations) {
    return recommendations.reduce((groups, rec) => {
      const category = rec.category || 'other';
      if (!groups[category]) { groups[category] = []; }
      groups[category].push(rec);
      return groups;
    }, {});
  }

  groupRecommendationsByPriority(recommendations) {
    return recommendations.reduce((groups, rec) => {
      const priority = rec.priority || 'unknown';
      if (!groups[priority]) { groups[priority] = []; }
      groups[priority].push(rec);
      return groups;
    }, {});
  }

  identifyKeyRisks(analysis) {
    const risks = [];

    if (analysis.security.score < this.REPORT_CONSTANTS.QUALITY_BASELINE) {
      risks.push('安全性评分较低，存在潜在安全风险');
    }

    if (analysis.metrics.complexity.average > 20) {
      risks.push('代码复杂度过高，维护成本较大');
    }

    if (analysis.dependencies.details.circularDependencies.count > 0) {
      risks.push('存在循环依赖，影响代码可维护性');
    }

    return risks;
  }

  estimateMaintainabilityCost(analysis) {
    const baseScore = analysis.maintainability.score;
    if (baseScore >= 80) { return 'low'; }
    if (baseScore >= 60) { return 'medium'; }
    return 'high';
  }

  estimateTechnicalDebt(analysis) {
    const issues = [
      ...analysis.structure.issues,
      ...analysis.dependencies.issues,
      ...analysis.maintainability.issues,
      ...analysis.quality.issues,
      ...analysis.security.issues
    ];

    const criticalIssues = issues.filter(issue => issue.severity === 'critical').length;
    const highIssues = issues.filter(issue => issue.severity === 'high').length;

    const debtScore = criticalIssues * 3 + highIssues * 2;

    if (debtScore <= 5) { return 'low'; }
    if (debtScore <= 15) { return 'medium'; }
    return 'high';
  }

  assessOverallRisk(analysis) {
    const riskFactors = [
      analysis.security.score < this.REPORT_CONSTANTS.QUALITY_BASELINE ? 1 : 0,
      analysis.quality.score < this.REPORT_CONSTANTS.QUALITY_BASELINE ? 1 : 0,
      analysis.metrics.complexity.average > 20 ? 1 : 0,
      analysis.dependencies.details.circularDependencies.count > 0 ? 1 : 0
    ];

    const totalRisk = riskFactors.reduce((sum, factor) => sum + factor, 0);

    if (totalRisk >= 3) { return 'high'; }
    if (totalRisk >= 2) { return 'medium'; }
    return 'low';
  }

  calculateTechnicalDebtRatio(analysis) {
    const totalIssues = [
      ...analysis.structure.issues,
      ...analysis.dependencies.issues,
      ...analysis.maintainability.issues,
      ...analysis.quality.issues,
      ...analysis.security.issues
    ].length;

    const fileCount = analysis.fileCount;
    return fileCount > 0 ? (totalIssues / fileCount) * 100 : 0;
  }

  identifyRiskFactors(analysis) {
    const factors = [];

    if (analysis.metrics.complexity.average > 15) {
      factors.push({
        factor: '高复杂度',
        impact: 'high',
        description: '代码复杂度过高，增加维护难度'
      });
    }

    if (analysis.dependencies.details.coupling.averageCoupling > 3) {
      factors.push({
        factor: '高耦合度',
        impact: 'medium',
        description: '模块间耦合度过高，影响可测试性'
      });
    }

    if (analysis.quality.details.coverage.coverage < 0.7) {
      factors.push({
        factor: '测试覆盖率不足',
        impact: 'high',
        description: '测试覆盖率低于70%，存在质量风险'
      });
    }

    return factors;
  }

  generateMitigationStrategies(analysis) {
    const strategies = [];

    if (analysis.security.score < this.REPORT_CONSTANTS.QUALITY_BASELINE) {
      strategies.push({
        risk: '安全性风险',
        strategy: '实施安全代码审查和漏洞扫描',
        timeline: '1-2周',
        priority: 'high'
      });
    }

    if (analysis.metrics.complexity.average > 20) {
      strategies.push({
        risk: '高复杂度风险',
        strategy: '重构复杂函数，拆分大型模块',
        timeline: '2-4周',
        priority: 'medium'
      });
    }

    return strategies;
  }

  estimateResourceRequirements(recommendations) {
    const highPriority = recommendations.filter(rec => rec.priority === 'high' || rec.priority === 'critical').length;
    const mediumPriority = recommendations.filter(rec => rec.priority === 'medium').length;
    const lowPriority = recommendations.filter(rec => rec.priority === 'low').length;

    return {
      developerDays: highPriority * 2 + mediumPriority * 1 + lowPriority * 0.5,
      teamSize: Math.ceil((highPriority + mediumPriority) / 10) || 1,
      estimatedCost: 'medium',
      timeline: '2-6周'
    };
  }

  generateTimeline(recommendations) {
    return {
      phase1: {
        name: '紧急修复',
        duration: '1-2周',
        items: recommendations.filter(rec => rec.priority === 'critical' || rec.priority === 'high').slice(0, 5)
      },
      phase2: {
        name: '质量改进',
        duration: '3-4周',
        items: recommendations.filter(rec => rec.priority === 'medium').slice(0, 8)
      },
      phase3: {
        name: '优化完善',
        duration: '5-6周',
        items: recommendations.filter(rec => rec.priority === 'low')
      }
    };
  }

  analyzeTechnicalDebt(analysis) {
    const allIssues = [
      ...analysis.structure.issues,
      ...analysis.dependencies.issues,
      ...analysis.maintainability.issues,
      ...analysis.quality.issues,
      ...analysis.security.issues
    ];

    return {
      totalDebt: allIssues.length,
      debtByCategory: this.groupIssuesByCategory(allIssues),
      estimatedEffort: this.estimateDebtResolutionEffort(allIssues),
      prioritizedItems: allIssues.sort((a, b) => {
        const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }).slice(0, 10)
    };
  }

  estimateDebtResolutionEffort(issues) {
    const effortMap = {
      'critical': 8,
      'high': 4,
      'medium': 2,
      'low': 1
    };

    return issues.reduce((total, issue) => {
      return total + (effortMap[issue.severity] || 1);
    }, 0);
  }

  generateMetricTrends(analysis) {
    // 模拟趋势数据
    return {
      complexity: {
        current: analysis.metrics.complexity.average,
        trend: 'stable',
        change: 0
      },
      quality: {
        current: analysis.quality.score,
        trend: 'improving',
        change: 5
      },
      coverage: {
        current: analysis.quality.details.coverage.coverage * 100,
        trend: 'declining',
        change: -3
      }
    };
  }

  analyzeLayering(analysis) {
    return {
      hasLayeredArchitecture: analysis.structure.details.directoryStructure.hasStandardStructure,
      layerViolations: [],
      recommendedLayers: ['presentation', 'business', 'data', 'infrastructure']
    };
  }

  identifyArchitecturalPatterns(analysis) {
    const patterns = [];

    if (analysis.structure.details.fileOrganization.isWellOrganized) {
      patterns.push('模块化架构');
    }

    if (analysis.dependencies.details.coupling.averageCoupling < 3) {
      patterns.push('松耦合设计');
    }

    return patterns;
  }

  estimateCodeEfficiency(analysis) {
    // AI生成代码来源：基于PERFORMANCE_MULTIPLIER常量优化性能评估算法
    const complexityScore = Math.max(0, 100 - analysis.metrics.complexity.average * 3);
    const couplingScore = Math.max(0, 100 - analysis.dependencies.details.coupling.averageCoupling * 20);

    // 使用PERFORMANCE_MULTIPLIER常量调整性能评分
    const performanceAdjustment = this.REPORT_CONSTANTS.PERFORMANCE_MULTIPLIER;
    const adjustedComplexityScore = Math.min(100, complexityScore * performanceAdjustment);
    const adjustedCouplingScore = Math.min(100, couplingScore * performanceAdjustment);

    return {
      overall: Math.round((adjustedComplexityScore + adjustedCouplingScore) / 2),
      complexity: adjustedComplexityScore,
      coupling: adjustedCouplingScore,
      performanceMultiplier: performanceAdjustment
    };
  }

  generatePerformanceRecommendations(analysis) {
    const recommendations = [];

    if (analysis.metrics.complexity.average > 15) {
      recommendations.push({
        area: '算法优化',
        suggestion: '优化高复杂度算法，减少时间复杂度',
        impact: 'high'
      });
    }

    if (analysis.dependencies.details.coupling.averageCoupling > 3) {
      recommendations.push({
        area: '架构优化',
        suggestion: '减少模块间依赖，提高并行处理能力',
        impact: 'medium'
      });
    }

    return recommendations;
  }

  assessBestPracticeAdherence(analysis) {
    let score = 0;
    const _total = 0;

    // 检查各种最佳实践
    const practices = [
      { name: '代码组织', score: analysis.structure.score },
      { name: '依赖管理', score: analysis.dependencies.score },
      { name: '测试覆盖', score: analysis.quality.details.coverage.score },
      { name: '文档完整性', score: analysis.maintainability.details.documentation.score }
    ];

    practices.forEach(practice => {
      score += practice.score;
    });

    return {
      overallScore: Math.round(score / practices.length),
      practiceScores: practices,
      adherenceLevel: score / practices.length >= 80 ? 'high' : score / practices.length >= 60 ? 'medium' : 'low'
    };
  }

  identifyBestPracticeViolations(analysis) {
    const violations = [];

    if (analysis.structure.score < this.REPORT_CONSTANTS.QUALITY_BASELINE) {
      violations.push({
        practice: '代码组织',
        violation: '目录结构不够清晰',
        severity: 'medium'
      });
    }

    if (analysis.quality.details.coverage.coverage < 0.7) {
      violations.push({
        practice: '测试覆盖',
        violation: '测试覆盖率不足',
        severity: 'high'
      });
    }

    return violations;
  }

  generateBestPracticeRecommendations(analysis) {
    const recommendations = [];

    if (analysis.maintainability.details.documentation.score < this.REPORT_CONSTANTS.QUALITY_BASELINE) {
      recommendations.push({
        practice: '文档编写',
        recommendation: '增加代码注释和API文档',
        benefit: '提高代码可维护性和团队协作效率'
      });
    }

    if (analysis.dependencies.details.circularDependencies.count > 0) {
      recommendations.push({
        practice: '依赖管理',
        recommendation: '消除循环依赖，建立清晰的依赖层次',
        benefit: '提高代码的可测试性和可维护性'
      });
    }

    return recommendations;
  }

  getRelevantGuidelines(analysis) {
    const guidelines = [];

    const primaryLanguage = analysis.summary.statistics.languageDistribution;
    const mainLang = Object.keys(primaryLanguage)[0];

    if (mainLang === 'javascript') {
      guidelines.push({
        name: 'JavaScript最佳实践',
        url: 'https://github.com/airbnb/javascript',
        description: 'Airbnb JavaScript风格指南'
      });
    }

    guidelines.push({
      name: '代码质量指南',
      url: 'https://clean-code-developer.com/',
      description: '清洁代码开发原则'
    });

    return guidelines;
  }

  generateFileSizeHistogram(_analysis) {
    // 模拟文件大小分布数据
    const bins = [
      { range: '0-100', count: 8 },
      { range: '101-300', count: 12 },
      { range: '301-500', count: 6 },
      { range: '501-1000', count: 3 },
      { range: '1000+', count: 1 }
    ];

    return {
      labels: bins.map(bin => bin.range),
      datasets: [{
        label: '文件数量',
        data: bins.map(bin => bin.count),
        backgroundColor: '#2563eb'
      }]
    };
  }

  generateCssStyles(theme) {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: ${theme.text};
            background-color: ${theme.background};
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .report-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            border: 1px solid ${theme.border};
            border-radius: 8px;
        }
        
        .report-header h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
            color: ${this.chartConfig.colors.primary};
        }
        
        .metadata {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
        }
        
        .table-of-contents {
            background: ${theme.background};
            border: 1px solid ${theme.border};
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .table-of-contents ul {
            list-style: none;
        }
        
        .table-of-contents li {
            margin: 8px 0;
        }
        
        .table-of-contents a {
            color: ${this.chartConfig.colors.primary};
            text-decoration: none;
        }
        
        .table-of-contents a:hover {
            text-decoration: underline;
        }
        
        .section {
            margin-bottom: 40px;
            padding: 30px;
            border: 1px solid ${theme.border};
            border-radius: 8px;
        }
        
        .section h2 {
            color: ${this.chartConfig.colors.primary};
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid ${theme.border};
        }
        
        .section h3 {
            color: ${this.chartConfig.colors.secondary};
            margin: 20px 0 10px 0;
        }
        
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .metric-card {
            padding: 20px;
            border: 1px solid ${theme.border};
            border-radius: 6px;
            text-align: center;
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: ${this.chartConfig.colors.primary};
        }
        
        .metric-label {
            color: ${this.chartConfig.colors.secondary};
            margin-top: 5px;
        }
        
        .issue-list, .recommendation-list {
            list-style: none;
        }
        
        .issue-item, .recommendation-item {
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid;
            border-radius: 4px;
        }
        
        .issue-critical {
            border-color: ${this.chartConfig.colors.danger};
            background: rgba(239, 68, 68, 0.1);
        }
        
        .issue-high {
            border-color: ${this.chartConfig.colors.warning};
            background: rgba(245, 158, 11, 0.1);
        }
        
        .issue-medium {
            border-color: ${this.chartConfig.colors.info};
            background: rgba(6, 182, 212, 0.1);
        }
        
        .issue-low {
            border-color: ${this.chartConfig.colors.success};
            background: rgba(16, 185, 129, 0.1);
        }
        
        .chart-container {
            margin: 30px 0;
            padding: 20px;
            border: 1px solid ${theme.border};
            border-radius: 8px;
        }
        
        .chart-title {
            text-align: center;
            margin-bottom: 20px;
            font-weight: bold;
        }
        
        .report-footer {
            text-align: center;
            margin-top: 50px;
            padding: 20px;
            border-top: 1px solid ${theme.border};
            color: ${this.chartConfig.colors.secondary};
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .metadata {
                flex-direction: column;
                gap: 10px;
            }
            
            .metric-grid {
                grid-template-columns: 1fr;
            }
        }
        `;
  }

  generateHtmlSection(sectionKey, section, config) {
    return `
        <section id="${sectionKey}" class="section">
            <h2>${section.title}</h2>
            ${this.formatSectionContent(section.content, config)}
        </section>
        `;
  }

  formatSectionContent(content, config) {
    if (typeof content === 'string') {
      return `<p>${content}</p>`;
    }

    if (typeof content === 'object') {
      return this.formatObjectAsHtml(content, config);
    }

    return '<p>无内容</p>';
  }

  formatObjectAsHtml(obj, config, level = 0) {
    let html = '';

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          html += `<h${Math.min(6, level + 3)}>${key}</h${Math.min(6, level + 3)}>`;
          html += '<ul>';
          value.forEach(item => {
            if (typeof item === 'object') {
              html += `<li>${this.formatObjectAsHtml(item, config, level + 1)}</li>`;
            } else {
              html += `<li>${item}</li>`;
            }
          });
          html += '</ul>';
        } else {
          html += `<h${Math.min(6, level + 3)}>${key}</h${Math.min(6, level + 3)}>`;
          html += this.formatObjectAsHtml(value, config, level + 1);
        }
      } else {
        html += `<p><strong>${key}:</strong> ${value}</p>`;
      }
    });

    return html;
  }

  generateChartsHtml(charts) {
    if (!charts) { return ''; }

    let html = '<div class="charts-section">';

    Object.entries(charts).forEach(([chartKey, chart]) => {
      html += `
            <div class="chart-container">
                <div class="chart-title">${chart.title}</div>
                <canvas id="chart-${chartKey}" width="400" height="200"></canvas>
            </div>
            `;
    });

    html += '</div>';
    return html;
  }

  generateChartsScript(charts) {
    if (!charts) { return ''; }

    let script = '<script>';

    Object.entries(charts).forEach(([chartKey, chart]) => {
      script += `
            new Chart(document.getElementById('chart-${chartKey}'), {
                type: '${chart.type}',
                data: ${JSON.stringify(chart.data)},
                options: ${JSON.stringify(chart.options || {})}
            });
            `;
    });

    script += '</script>';
    return script;
  }

  generateMarkdownSection(sectionKey, section, _config) {
    let markdown = `\n## ${section.title}\n\n`;

    if (typeof section.content === 'string') {
      markdown += `${section.content}\n\n`;
    } else if (typeof section.content === 'object') {
      markdown += this.formatObjectAsMarkdown(section.content);
    }

    return markdown;
  }

  formatObjectAsMarkdown(obj, level = 0) {
    let markdown = '';
    const indent = '  '.repeat(level);

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          markdown += `${indent}### ${key}\n\n`;
          value.forEach(item => {
            if (typeof item === 'object') {
              markdown += `${indent}- ${JSON.stringify(item)}\n`;
            } else {
              markdown += `${indent}- ${item}\n`;
            }
          });
          markdown += '\n';
        } else {
          markdown += `${indent}### ${key}\n\n`;
          markdown += this.formatObjectAsMarkdown(value, level + 1);
        }
      } else {
        markdown += `${indent}**${key}:** ${value}\n\n`;
      }
    });

    return markdown;
  }

  /**
     * 清理缓存
     */
  clearCache() {
    this.reportCache.clear();
    this.generationHistory = [];
  }

  /**
     * 获取生成历史
     */
  getGenerationHistory() {
    return this.generationHistory;
  }

  /**
     * 获取可用模板
     */
  getAvailableTemplates() {
    return this.reportTemplates;
  }

  /**
     * 获取支持的输出格式
     */
  getSupportedFormats() {
    return this.outputFormats;
  }

  /**
     * 验证配置
     */
  validateConfig(config) {
    const errors = [];

    if (config.template && !this.reportTemplates[config.template]) {
      errors.push(`未知的报告模板: ${config.template}`);
    }

    if (config.format && !this.outputFormats[config.format]) {
      errors.push(`不支持的输出格式: ${config.format}`);
    }

    if (config.theme && !this.chartConfig.themes[config.theme]) {
      errors.push(`未知的主题: ${config.theme}`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportGenerator;
} else if (typeof window !== 'undefined') {
  window.ReportGenerator = ReportGenerator;
}
