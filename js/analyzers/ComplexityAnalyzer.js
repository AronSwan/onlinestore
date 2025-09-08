/**
 * AI生成代码来源：基于Claude 4 Sonnet重构的复杂度分析器
 * 复杂度分析器 - 负责各种复杂度计算
 * 符合单一职责原则：专门处理复杂度分析功能
 * @ai-generated: 基于Claude 4 Sonnet重构生成，遵循SOLID原则
 */
class ComplexityAnalyzer {
  constructor() {
    // 复杂度描述常量
    this.DESCRIPTION_THRESHOLDS = {
      CYCLOMATIC_LOW: 10,
      CYCLOMATIC_MEDIUM: 20,
      CYCLOMATIC_HIGH: 30,
      COGNITIVE_LOW: 15,
      COGNITIVE_MEDIUM: 25,
      COGNITIVE_HIGH: 40,
      NESTING_LOW: 3,
      NESTING_MEDIUM: 5,
      NESTING_HIGH: 7,
      MAINTAINABILITY_GOOD: 50,
      MAINTAINABILITY_FAIR: 20,
      OVERALL_LOW: 0.4,
      OVERALL_MEDIUM: 0.7
    };

    // 可维护性指数计算常量
    this.MAINTAINABILITY_CONSTANTS = {
      BASE_VALUE: 171,
      VOLUME_COEFFICIENT: 5.2,
      CYCLOMATIC_COEFFICIENT: 0.23,
      LINES_COEFFICIENT: 16.2
    };

    // 复杂度评分常量
    this.COMPLEXITY_SCORING = {
      LOW_THRESHOLD: 0.3,
      MEDIUM_THRESHOLD: 0.4,
      HIGH_THRESHOLD: 0.7,
      MAX_BONUS: 0.3
    };

    // Halstead复杂度常量
    this.HALSTEAD_CONSTANTS = {
      DIFFICULTY_ADJUSTMENT: -5,
      OPERATORS_THRESHOLD: 18,
      MAX_DEPTH_DETAILS: 5,
      TIME_DIVISOR: 18
    };

    this.complexityThresholds = {
      cyclomatic: {
        low: 10,
        medium: 20,
        high: 30
      },
      cognitive: {
        low: 15,
        medium: 25,
        high: 40
      },
      nesting: {
        low: 3,
        medium: 5,
        high: 7
      }
    };

    this.complexityWeights = {
      cyclomatic: 0.4,
      cognitive: 0.4,
      nesting: 0.2
    };
  }

  /**
     * 分析代码复杂度
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 复杂度分析结果
     */
  analyzeComplexity(content, language = 'javascript') {
    try {
      const analysis = {
        language: language,
        cyclomatic: this.calculateCyclomaticComplexity(content, language),
        cognitive: this.calculateCognitiveComplexity(content, language),
        nesting: this.calculateNestingDepth(content, language),
        halstead: this.calculateHalsteadMetrics(content, language),
        maintainability: this.calculateMaintainabilityIndex(content, language)
      };

      // 计算综合复杂度分数
      analysis.overall = this.calculateOverallComplexity(analysis);

      // 生成复杂度建议
      analysis.suggestions = this.generateComplexitySuggestions(analysis);

      // 计算复杂度趋势
      analysis.trends = this.analyzeComplexityTrends(content, language);

      return {
        success: true,
        analysis: analysis,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `复杂度分析失败: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
     * 计算圈复杂度（Cyclomatic Complexity）
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 圈复杂度信息
     */
  calculateCyclomaticComplexity(content, language) {
    const patterns = this.getCyclomaticPatterns(language);
    let complexity = 1; // 基础复杂度为1
    const details = [];

    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex) || [];
      complexity += matches.length * pattern.weight;

      if (matches.length > 0) {
        details.push({
          type: pattern.type,
          count: matches.length,
          weight: pattern.weight,
          contribution: matches.length * pattern.weight
        });
      }
    });

    return {
      value: complexity,
      level: this.getComplexityLevel(complexity, 'cyclomatic'),
      details: details,
      description: this.getCyclomaticDescription(complexity)
    };
  }

  /**
     * 计算认知复杂度（Cognitive Complexity）
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 认知复杂度信息
     */
  calculateCognitiveComplexity(content, language) {
    const lines = content.split('\n');
    let complexity = 0;
    let nestingLevel = 0;
    const details = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) { return; }

      // 计算嵌套级别变化
      const openBraces = (trimmed.match(/{/g) || []).length;
      const closeBraces = (trimmed.match(/}/g) || []).length;

      // 检查认知复杂度增加的模式
      const cognitivePatterns = this.getCognitivePatterns(language);

      cognitivePatterns.forEach(pattern => {
        if (pattern.regex.test(trimmed)) {
          let increment = pattern.baseWeight;

          // 嵌套增加认知负担
          if (pattern.affectedByNesting && nestingLevel > 0) {
            increment += nestingLevel * pattern.nestingMultiplier;
          }

          complexity += increment;
          details.push({
            line: index + 1,
            type: pattern.type,
            nestingLevel: nestingLevel,
            increment: increment,
            code: trimmed.substring(0, 50) + (trimmed.length > 50 ? '...' : '')
          });
        }
      });

      // 更新嵌套级别
      nestingLevel += openBraces - closeBraces;
      nestingLevel = Math.max(0, nestingLevel);
    });

    return {
      value: complexity,
      level: this.getComplexityLevel(complexity, 'cognitive'),
      details: details,
      description: this.getCognitiveDescription(complexity)
    };
  }

  /**
     * 计算嵌套深度
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 嵌套深度信息
     */
  calculateNestingDepth(content, _language) {
    const lines = content.split('\n');
    let currentDepth = 0;
    let maxDepth = 0;
    let totalDepth = 0;
    let lineCount = 0;
    const depthDetails = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) { return; }

      lineCount++;

      // 计算当前行的嵌套深度变化
      const openBraces = (trimmed.match(/{/g) || []).length;
      const closeBraces = (trimmed.match(/}/g) || []).length;

      // 先处理闭合括号
      currentDepth -= closeBraces;
      currentDepth = Math.max(0, currentDepth);

      // 记录当前深度
      if (currentDepth > 0) {
        totalDepth += currentDepth;

        if (currentDepth > maxDepth) {
          maxDepth = currentDepth;
          depthDetails.push({
            line: index + 1,
            depth: currentDepth,
            code: trimmed.substring(0, 50) + (trimmed.length > 50 ? '...' : ''),
            isMaxDepth: true
          });
        }
      }

      // 再处理开放括号
      currentDepth += openBraces;
    });

    const averageDepth = lineCount > 0 ? (totalDepth / lineCount).toFixed(2) : 0;

    return {
      maximum: maxDepth,
      average: parseFloat(averageDepth),
      level: this.getComplexityLevel(maxDepth, 'nesting'),
      details: depthDetails.slice(-this.HALSTEAD_CONSTANTS.MAX_DEPTH_DETAILS), // 只保留最后几个最大深度点
      description: this.getNestingDescription(maxDepth)
    };
  }

  /**
     * 计算Halstead复杂度指标
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} Halstead指标
     */
  calculateHalsteadMetrics(content, language) {
    const operators = this.extractOperators(content, language);
    const operands = this.extractOperands(content, language);

    const n1 = operators.unique.length; // 不同操作符数量
    const n2 = operands.unique.length;  // 不同操作数数量
    const N1 = operators.total;         // 操作符总数
    const N2 = operands.total;          // 操作数总数

    const vocabulary = n1 + n2;         // 词汇表大小
    const length = N1 + N2;             // 程序长度
    const volume = length * Math.log2(vocabulary || 1); // 程序体积
    const difficulty = (n1 / 2) * (N2 / (n2 || 1)); // 程序难度
    const effort = difficulty * volume;  // 编程工作量
    const time = effort / this.HALSTEAD_CONSTANTS.TIME_DIVISOR;           // 编程时间（秒）
    const bugs = volume / 3000;         // 预期错误数

    return {
      vocabulary: vocabulary,
      length: length,
      volume: Math.round(volume),
      difficulty: Math.round(difficulty * 100) / 100,
      effort: Math.round(effort),
      time: Math.round(time * 100) / 100,
      bugs: Math.round(bugs * 100) / 100,
      operators: {
        unique: n1,
        total: N1,
        list: operators.unique.slice(0, 10) // 只显示前10个
      },
      operands: {
        unique: n2,
        total: N2,
        list: operands.unique.slice(0, 10) // 只显示前10个
      }
    };
  }

  /**
     * 计算可维护性指数
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 可维护性指数
     */
  calculateMaintainabilityIndex(content, language) {
    const lines = content.split('\n').filter(line => line.trim().length > 0).length;
    const cyclomatic = this.calculateCyclomaticComplexity(content, language).value;
    const halstead = this.calculateHalsteadMetrics(content, language);

    // 使用修改后的可维护性指数公式
    let mi = this.MAINTAINABILITY_CONSTANTS.BASE_VALUE -
      this.MAINTAINABILITY_CONSTANTS.VOLUME_COEFFICIENT * Math.log(halstead.volume) -
      this.MAINTAINABILITY_CONSTANTS.CYCLOMATIC_COEFFICIENT * cyclomatic -
      this.MAINTAINABILITY_CONSTANTS.LINES_COEFFICIENT * Math.log(lines);
    mi = Math.max(0, Math.min(100, mi)); // 限制在0-100范围内

    let level = 'high';
    if (mi < 20) { level = 'low'; }
    else if (mi < 50) { level = 'medium'; }

    return {
      value: Math.round(mi * 100) / 100,
      level: level,
      factors: {
        volume: halstead.volume,
        cyclomatic: cyclomatic,
        lines: lines
      },
      description: this.getMaintainabilityDescription(mi)
    };
  }

  /**
     * 计算综合复杂度分数
     * @param {Object} analysis - 复杂度分析结果
     * @returns {Object} 综合复杂度
     */
  calculateOverallComplexity(analysis) {
    const cyclomaticScore = this.normalizeComplexityScore(analysis.cyclomatic.value, 'cyclomatic');
    const cognitiveScore = this.normalizeComplexityScore(analysis.cognitive.value, 'cognitive');
    const nestingScore = this.normalizeComplexityScore(analysis.nesting.maximum, 'nesting');

    const weightedScore =
      cyclomaticScore * this.complexityWeights.cyclomatic +
      cognitiveScore * this.complexityWeights.cognitive +
      nestingScore * this.complexityWeights.nesting;

    let level = 'low';
    if (weightedScore > this.DESCRIPTION_THRESHOLDS.OVERALL_MEDIUM) { level = 'high'; }
    else if (weightedScore > this.DESCRIPTION_THRESHOLDS.OVERALL_LOW) { level = 'medium'; }

    return {
      score: Math.round(weightedScore * 100) / 100,
      level: level,
      components: {
        cyclomatic: cyclomaticScore,
        cognitive: cognitiveScore,
        nesting: nestingScore
      },
      description: this.getOverallComplexityDescription(weightedScore)
    };
  }

  /**
     * 生成复杂度改进建议
     * @param {Object} analysis - 复杂度分析结果
     * @returns {Array} 建议列表
     */
  generateComplexitySuggestions(analysis) {
    const suggestions = [];

    // 圈复杂度建议
    if (analysis.cyclomatic.level === 'high') {
      suggestions.push({
        type: 'cyclomatic',
        priority: 'high',
        title: '降低圈复杂度',
        description: '考虑拆分函数，减少条件分支和循环嵌套',
        techniques: ['提取方法', '使用策略模式', '简化条件表达式']
      });
    }

    // 认知复杂度建议
    if (analysis.cognitive.level === 'high') {
      suggestions.push({
        type: 'cognitive',
        priority: 'high',
        title: '降低认知复杂度',
        description: '减少嵌套层次，简化逻辑流程',
        techniques: ['早期返回', '提取子函数', '使用卫语句']
      });
    }

    // 嵌套深度建议
    if (analysis.nesting.level === 'high') {
      suggestions.push({
        type: 'nesting',
        priority: 'medium',
        title: '减少嵌套深度',
        description: '避免过深的嵌套结构',
        techniques: ['合并条件', '提取函数', '使用多态']
      });
    }

    // 可维护性建议
    if (analysis.maintainability.level === 'low') {
      suggestions.push({
        type: 'maintainability',
        priority: 'high',
        title: '提高可维护性',
        description: '代码可维护性较低，需要重构',
        techniques: ['重构大函数', '提高代码可读性', '增加注释']
      });
    }

    return suggestions;
  }

  /**
     * 分析复杂度趋势
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 趋势分析
     */
  analyzeComplexityTrends(content, language) {
    const functions = this.extractFunctionComplexities(content, language);

    if (functions.length === 0) {
      return {
        functionCount: 0,
        averageComplexity: 0,
        complexityDistribution: {},
        hotspots: []
      };
    }

    const complexities = functions.map(fn => fn.complexity);
    const averageComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;

    // 复杂度分布
    const distribution = {
      low: functions.filter(fn => fn.complexity <= 10).length,
      medium: functions.filter(fn => fn.complexity > 10 && fn.complexity <= 20).length,
      high: functions.filter(fn => fn.complexity > 20).length
    };

    // 复杂度热点（最复杂的函数）
    const hotspots = functions
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 5)
      .map(fn => ({
        name: fn.name,
        complexity: fn.complexity,
        line: fn.line,
        suggestion: this.getFunctionComplexitySuggestion(fn.complexity)
      }));

    return {
      functionCount: functions.length,
      averageComplexity: Math.round(averageComplexity * 100) / 100,
      complexityDistribution: distribution,
      hotspots: hotspots
    };
  }

  // 辅助方法
  getCyclomaticPatterns(language) {
    const basePatterns = [
      { type: 'if', regex: /\bif\b/g, weight: 1 },
      { type: 'else', regex: /\belse\b/g, weight: 1 },
      { type: 'while', regex: /\bwhile\b/g, weight: 1 },
      { type: 'for', regex: /\bfor\b/g, weight: 1 },
      { type: 'case', regex: /\bcase\b/g, weight: 1 },
      { type: 'catch', regex: /\bcatch\b/g, weight: 1 },
      { type: 'and', regex: /&&/g, weight: 1 },
      { type: 'or', regex: /\|\|/g, weight: 1 },
      { type: 'ternary', regex: /\?.*:/g, weight: 1 }
    ];

    if (language === 'python') {
      basePatterns.push(
        { type: 'elif', regex: /\belif\b/g, weight: 1 },
        { type: 'except', regex: /\bexcept\b/g, weight: 1 },
        { type: 'and', regex: /\band\b/g, weight: 1 },
        { type: 'or', regex: /\bor\b/g, weight: 1 }
      );
    }

    return basePatterns;
  }

  getCognitivePatterns(_language) {
    return [
      { type: 'if', regex: /\bif\b/, baseWeight: 1, affectedByNesting: true, nestingMultiplier: 1 },
      { type: 'else', regex: /\belse\b/, baseWeight: 1, affectedByNesting: false, nestingMultiplier: 0 },
      { type: 'switch', regex: /\bswitch\b/, baseWeight: 1, affectedByNesting: true, nestingMultiplier: 1 },
      { type: 'for', regex: /\bfor\b/, baseWeight: 1, affectedByNesting: true, nestingMultiplier: 1 },
      { type: 'while', regex: /\bwhile\b/, baseWeight: 1, affectedByNesting: true, nestingMultiplier: 1 },
      { type: 'catch', regex: /\bcatch\b/, baseWeight: 1, affectedByNesting: true, nestingMultiplier: 1 },
      { type: 'break', regex: /\bbreak\b/, baseWeight: 1, affectedByNesting: false, nestingMultiplier: 0 },
      { type: 'continue', regex: /\bcontinue\b/, baseWeight: 1, affectedByNesting: false, nestingMultiplier: 0 }
    ];
  }

  extractOperators(content, _language) {
    const operatorPatterns = [
      /[+\-*/%]/g, /[=!<>]=?/g, /&&|\|\|/g, /[&|^~]/g,
      /[{}[\]()]/g, /[;,.:]/g, /\?/g
    ];

    const operators = new Set();
    let totalCount = 0;

    operatorPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => operators.add(match));
      totalCount += matches.length;
    });

    return {
      unique: Array.from(operators),
      total: totalCount
    };
  }

  extractOperands(content, _language) {
    // 简化的操作数提取
    const operandPattern = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b|\b\d+(?:\.\d+)?\b|["'][^"']*["']/g;
    const matches = content.match(operandPattern) || [];
    const operands = new Set(matches);

    return {
      unique: Array.from(operands),
      total: matches.length
    };
  }

  extractFunctionComplexities(content, language) {
    // 简化的函数复杂度提取
    const functionPattern = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*{([^}]*)}/g;
    const functions = [];
    let match;

    while ((match = functionPattern.exec(content)) !== null) {
      const functionBody = match[2];
      const complexity = this.calculateCyclomaticComplexity(functionBody, language).value;
      const lineNumber = content.substring(0, match.index).split('\n').length;

      functions.push({
        name: match[1],
        complexity: complexity,
        line: lineNumber
      });
    }

    return functions;
  }

  getComplexityLevel(value, type) {
    const thresholds = this.complexityThresholds[type];
    if (value <= thresholds.low) { return 'low'; }
    if (value <= thresholds.medium) { return 'medium'; }
    return 'high';
  }

  normalizeComplexityScore(value, type) {
    const thresholds = this.complexityThresholds[type];
    if (value <= thresholds.low) { return value / thresholds.low * this.COMPLEXITY_SCORING.LOW_THRESHOLD; }
    if (value <= thresholds.medium) { return this.COMPLEXITY_SCORING.LOW_THRESHOLD + (value - thresholds.low) / (thresholds.medium - thresholds.low) * this.COMPLEXITY_SCORING.MEDIUM_THRESHOLD; }
    return this.COMPLEXITY_SCORING.HIGH_THRESHOLD + Math.min(this.COMPLEXITY_SCORING.MAX_BONUS, (value - thresholds.medium) / thresholds.medium * this.COMPLEXITY_SCORING.MAX_BONUS);
  }

  getCyclomaticDescription(complexity) {
    if (complexity <= this.DESCRIPTION_THRESHOLDS.CYCLOMATIC_LOW) { return '代码结构简单，易于理解和维护'; }
    if (complexity <= this.DESCRIPTION_THRESHOLDS.CYCLOMATIC_MEDIUM) { return '代码复杂度适中，需要注意维护'; }
    if (complexity <= this.DESCRIPTION_THRESHOLDS.CYCLOMATIC_HIGH) { return '代码复杂度较高，建议重构'; }
    return '代码复杂度过高，强烈建议重构';
  }

  getCognitiveDescription(complexity) {
    if (complexity <= this.DESCRIPTION_THRESHOLDS.COGNITIVE_LOW) { return '认知负担较低，代码易于理解'; }
    if (complexity <= this.DESCRIPTION_THRESHOLDS.COGNITIVE_MEDIUM) { return '认知负担适中，需要一定理解成本'; }
    if (complexity <= this.DESCRIPTION_THRESHOLDS.COGNITIVE_HIGH) { return '认知负担较高，理解困难'; }
    return '认知负担过高，极难理解';
  }

  getNestingDescription(depth) {
    if (depth <= this.DESCRIPTION_THRESHOLDS.NESTING_LOW) { return '嵌套层次合理'; }
    if (depth <= this.DESCRIPTION_THRESHOLDS.NESTING_MEDIUM) { return '嵌套层次较深，建议优化'; }
    if (depth <= this.DESCRIPTION_THRESHOLDS.NESTING_HIGH) { return '嵌套层次过深，影响可读性'; }
    return '嵌套层次极深，严重影响代码质量';
  }

  getMaintainabilityDescription(mi) {
    if (mi >= this.DESCRIPTION_THRESHOLDS.MAINTAINABILITY_GOOD) { return '可维护性良好'; }
    if (mi >= this.DESCRIPTION_THRESHOLDS.MAINTAINABILITY_FAIR) { return '可维护性一般，需要改进'; }
    return '可维护性较差，需要重构';
  }

  getOverallComplexityDescription(score) {
    if (score <= this.DESCRIPTION_THRESHOLDS.OVERALL_LOW) { return '整体复杂度较低，代码质量良好'; }
    if (score <= this.DESCRIPTION_THRESHOLDS.OVERALL_MEDIUM) { return '整体复杂度适中，有改进空间'; }
    return '整体复杂度较高，建议重构';
  }

  getFunctionComplexitySuggestion(complexity) {
    if (complexity <= this.DESCRIPTION_THRESHOLDS.CYCLOMATIC_LOW) { return '复杂度合理'; }
    if (complexity <= this.DESCRIPTION_THRESHOLDS.CYCLOMATIC_MEDIUM) { return '考虑拆分函数'; }
    return '强烈建议重构';
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComplexityAnalyzer;
} else if (typeof window !== 'undefined') {
  window.ComplexityAnalyzer = ComplexityAnalyzer;
}
