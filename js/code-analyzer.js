/**
 * 统一代码分析工具
 * 整合AST生成、代码解析和分析功能
 */

class CodeAnalyzer {
  constructor() {
    this.config = window.config?.getModule('codeAnalysis') || {
      SUPPORTED_EXTENSIONS: ['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'],
      MAX_FILE_SIZE: window.MAGIC_NUMBERS?.FILE_SIZES?.MAX_FILE_SIZE || 1024 * 1024,
      ANALYSIS_TIMEOUT: window.MAGIC_NUMBERS?.ANALYSIS?.ANALYSIS_TIMEOUT || 30000,
      COMPLEXITY_THRESHOLDS: {
        LOW: window.MAGIC_NUMBERS?.COMPLEXITY?.LOW || 10,
        MEDIUM: window.MAGIC_NUMBERS?.COMPLEXITY?.MEDIUM || 20,
        HIGH: window.MAGIC_NUMBERS?.COMPLEXITY?.HIGH || 30
      }
    };

    this.parsedFiles = new Map();
    this.analysisCache = new Map();
    this.statistics = {
      totalFiles: 0,
      totalLines: 0,
      totalFunctions: 0,
      totalClasses: 0,
      complexityDistribution: { low: 0, medium: 0, high: 0 }
    };
  }

  /**
     * 解析单个文件
     * @param {string} filePath - 文件路径
     * @param {string} content - 文件内容
     * @returns {Promise<object>} 解析结果
     */
  async parseFile(filePath, content) {
    try {
      // 参数验证
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path provided');
      }

      if (!content || typeof content !== 'string') {
        throw new Error('Invalid file content provided');
      }

      // 文件大小检查
      if (content.length > this.config.MAX_FILE_SIZE) {
        throw new Error(`File too large: ${content.length} bytes exceeds limit of ${this.config.MAX_FILE_SIZE} bytes`);
      }

      // 检查文件扩展名
      const extension = this.getFileExtension(filePath);
      if (!this.config.SUPPORTED_EXTENSIONS.includes(extension)) {
        throw new Error(`Unsupported file extension: ${extension}`);
      }

      // 检查缓存
      const cacheKey = this.generateCacheKey(filePath, content);
      if (this.analysisCache.has(cacheKey)) {
        return this.analysisCache.get(cacheKey);
      }

      // 解析文件
      const parseResult = await this.performParsing(filePath, content);

      // 缓存结果
      this.analysisCache.set(cacheKey, parseResult);
      this.parsedFiles.set(filePath, parseResult);

      // 更新统计信息
      this.updateStatistics(parseResult);

      return parseResult;

    } catch (error) {
      console.error(`Failed to parse file ${filePath}:`, error);
      throw error;
    }
  }

  /**
     * 执行实际的解析工作
     * @param {string} filePath - 文件路径
     * @param {string} content - 文件内容
     * @returns {Promise<object>} 解析结果
     */
  async performParsing(filePath, content) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Parsing timeout for file: ${filePath}`));
      }, this.config.ANALYSIS_TIMEOUT);

      try {
        // 基础解析
        const basicAnalysis = this.performBasicAnalysis(content);

        // AST解析（如果可用）
        let astAnalysis = null;
        try {
          astAnalysis = this.performASTAnalysis(content, filePath);
        } catch (astError) {
          console.warn(`AST analysis failed for ${filePath}:`, astError);
        }

        // 复杂度分析
        const complexityAnalysis = this.analyzeComplexity(content);

        // 质量分析
        const qualityAnalysis = this.analyzeQuality(content);

        const result = {
          filePath,
          timestamp: Date.now(),
          basic: basicAnalysis,
          ast: astAnalysis,
          complexity: complexityAnalysis,
          quality: qualityAnalysis,
          metadata: {
            fileSize: content.length,
            extension: this.getFileExtension(filePath),
            encoding: 'utf-8'
          }
        };

        clearTimeout(timeout);
        resolve(result);

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
     * 基础代码分析
     * @param {string} content - 文件内容
     * @returns {object} 基础分析结果
     */
  performBasicAnalysis(content) {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const commentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    });

    // 函数检测
    const functionMatches = content.match(/function\s+\w+|\w+\s*[:=]\s*function|\w+\s*[:=]\s*\([^)]*\)\s*=>/g) || [];
    const classMatches = content.match(/class\s+\w+/g) || [];
    const importMatches = content.match(/import\s+.*?from|require\s*\(/g) || [];
    const exportMatches = content.match(/export\s+/g) || [];

    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines.length,
      commentLines: commentLines.length,
      blankLines: lines.length - nonEmptyLines.length,
      functions: functionMatches.length,
      classes: classMatches.length,
      imports: importMatches.length,
      exports: exportMatches.length,
      commentRatio: commentLines.length / Math.max(nonEmptyLines.length, 1)
    };
  }

  /**
     * AST分析（简化版）
     * @param {string} content - 文件内容
     * @param {string} filePath - 文件路径
     * @returns {object|null} AST分析结果
     */
  performASTAnalysis(content, filePath) {
    try {
      // 这里可以集成真正的AST解析器
      // 目前提供基础的语法结构分析

      const structure = {
        functions: this.extractFunctions(content),
        classes: this.extractClasses(content),
        variables: this.extractVariables(content),
        dependencies: this.extractDependencies(content)
      };

      return {
        type: 'simplified-ast',
        structure,
        nodeCount: this.estimateNodeCount(structure),
        depth: this.estimateDepth(content)
      };

    } catch (error) {
      console.warn(`AST analysis failed for ${filePath}:`, error);
      return null;
    }
  }

  /**
     * 复杂度分析
     * @param {string} content - 文件内容
     * @returns {object} 复杂度分析结果
     */
  analyzeComplexity(content) {
    // 圈复杂度估算
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(content);

    // 认知复杂度估算
    const cognitiveComplexity = this.calculateCognitiveComplexity(content);

    // 嵌套深度
    const nestingDepth = this.calculateNestingDepth(content);

    // 复杂度等级
    const complexityLevel = this.getComplexityLevel(cyclomaticComplexity);

    return {
      cyclomatic: cyclomaticComplexity,
      cognitive: cognitiveComplexity,
      nesting: nestingDepth,
      level: complexityLevel,
      score: this.calculateComplexityScore(cyclomaticComplexity, cognitiveComplexity, nestingDepth)
    };
  }

  /**
     * 代码质量分析
     * @param {string} content - 文件内容
     * @returns {object} 质量分析结果
     */
  analyzeQuality(content) {
    const issues = [];
    let score = 100;

    // 检查长函数
    const longFunctions = this.findLongFunctions(content);
    if (longFunctions.length > 0) {
      issues.push({ type: 'long-function', count: longFunctions.length, severity: 'medium' });
      score -= longFunctions.length * 5;
    }

    // 检查重复代码
    const duplicateBlocks = this.findDuplicateCode(content);
    if (duplicateBlocks.length > 0) {
      issues.push({ type: 'duplicate-code', count: duplicateBlocks.length, severity: 'high' });
      score -= duplicateBlocks.length * 10;
    }

    // 检查命名规范
    const namingIssues = this.checkNamingConventions(content);
    if (namingIssues.length > 0) {
      issues.push({ type: 'naming-convention', count: namingIssues.length, severity: 'low' });
      score -= namingIssues.length * 2;
    }

    // 检查错误处理
    const errorHandlingScore = this.analyzeErrorHandling(content);
    score = Math.max(score + errorHandlingScore - 100, 0);

    return {
      score: Math.max(score, 0),
      issues,
      suggestions: this.generateQualitySuggestions(issues)
    };
  }

  /**
     * 批量分析文件
     * @param {Array<{path: string, content: string}>} files - 文件列表
     * @returns {Promise<object>} 批量分析结果
     */
  async analyzeProject(files) {
    try {
      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          const result = await this.parseFile(file.path, file.content);
          results.push(result);
        } catch (error) {
          errors.push({ file: file.path, error: error.message });
        }
      }

      return {
        results,
        errors,
        summary: this.generateProjectSummary(results),
        statistics: this.getStatistics()
      };

    } catch (error) {
      console.error('Project analysis failed:', error);
      throw error;
    }
  }

  /**
     * 生成项目摘要
     * @param {Array} results - 分析结果数组
     * @returns {object} 项目摘要
     */
  generateProjectSummary(results) {
    const totalFiles = results.length;
    const totalLines = results.reduce((sum, r) => sum + (r.basic?.totalLines || 0), 0);
    const totalFunctions = results.reduce((sum, r) => sum + (r.basic?.functions || 0), 0);
    const totalClasses = results.reduce((sum, r) => sum + (r.basic?.classes || 0), 0);

    const avgComplexity = results.reduce((sum, r) => sum + (r.complexity?.cyclomatic || 0), 0) / totalFiles;
    const avgQuality = results.reduce((sum, r) => sum + (r.quality?.score || 0), 0) / totalFiles;

    const complexityDistribution = results.reduce((dist, r) => {
      const level = r.complexity?.level || 'low';
      dist[level] = (dist[level] || 0) + 1;
      return dist;
    }, { low: 0, medium: 0, high: 0 });

    return {
      totalFiles,
      totalLines,
      totalFunctions,
      totalClasses,
      averageComplexity: Math.round(avgComplexity * 100) / 100,
      averageQuality: Math.round(avgQuality * 100) / 100,
      complexityDistribution,
      recommendations: this.generateProjectRecommendations(results)
    };
  }

  // 辅助方法
  /**
     * 获取文件扩展名
     * @param {string} filePath - 文件路径
     * @returns {string} 文件扩展名
     */
  getFileExtension(filePath) {
    return filePath.substring(filePath.lastIndexOf('.'));
  }

  /**
     * 生成缓存键
     * @param {string} filePath - 文件路径
     * @param {string} content - 文件内容
     * @returns {string} 缓存键
     */
  generateCacheKey(filePath, content) {
    return `${filePath}:${this.simpleHash(content)}`;
  }

  /**
     * 简单哈希函数
     * @param {string} str - 输入字符串
     * @returns {string} 哈希值
     */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
     * 更新统计信息
     * @param {object} parseResult - 解析结果
     */
  updateStatistics(parseResult) {
    this.statistics.totalFiles++;
    this.statistics.totalLines += parseResult.basic?.totalLines || 0;
    this.statistics.totalFunctions += parseResult.basic?.functions || 0;
    this.statistics.totalClasses += parseResult.basic?.classes || 0;

    const level = parseResult.complexity?.level || 'low';
    this.statistics.complexityDistribution[level]++;
  }

  /**
     * 获取统计信息
     * @returns {object} 统计信息副本
     */
  getStatistics() {
    return { ...this.statistics };
  }

  // 复杂度计算方法
  /**
     * 计算圈复杂度
     * @param {string} content - 文件内容
     * @returns {number} 圈复杂度值
     */
  calculateCyclomaticComplexity(content) {
    const patterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /&&/g,
      /\|\|/g
    ];

    let complexity = 1; // 基础复杂度
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
     * 计算认知复杂度
     * @param {string} content - 文件内容
     * @returns {number} 认知复杂度值
     */
  calculateCognitiveComplexity(content) {
    // 简化的认知复杂度计算
    let complexity = 0;
    const lines = content.split('\n');
    let nestingLevel = 0;

    lines.forEach(line => {
      const trimmed = line.trim();

      // 增加嵌套级别
      if (trimmed.includes('{')) {nestingLevel++;}
      if (trimmed.includes('}')) {nestingLevel = Math.max(0, nestingLevel - 1);}

      // 控制结构
      if (/^(if|while|for|switch)\s*\(/.test(trimmed)) {
        complexity += 1 + nestingLevel;
      }

      // 逻辑运算符
      const logicalOps = (trimmed.match(/&&|\|\|/g) || []).length;
      complexity += logicalOps;
    });

    return complexity;
  }

  /**
     * 计算嵌套深度
     * @param {string} content - 文件内容
     * @returns {number} 最大嵌套深度
     */
  calculateNestingDepth(content) {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of content) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  /**
     * 获取复杂度等级
     * @param {number} complexity - 复杂度值
     * @returns {string} 复杂度等级 (low/medium/high)
     */
  getComplexityLevel(complexity) {
    if (complexity <= this.config.COMPLEXITY_THRESHOLDS.LOW) {return 'low';}
    if (complexity <= this.config.COMPLEXITY_THRESHOLDS.MEDIUM) {return 'medium';}
    return 'high';
  }

  /**
     * 计算综合复杂度分数
     * @param {number} cyclomatic - 圈复杂度
     * @param {number} cognitive - 认知复杂度
     * @param {number} nesting - 嵌套深度
     * @returns {number} 综合复杂度分数
     */
  calculateComplexityScore(cyclomatic, cognitive, nesting) {
    const cyclomaticScore = Math.max(0, 100 - cyclomatic * 2);
    const cognitiveScore = Math.max(0, 100 - cognitive * 1.5);
    const nestingScore = Math.max(0, 100 - nesting * 5);

    return Math.round((cyclomaticScore + cognitiveScore + nestingScore) / 3);
  }

  // 提取方法（简化版）
  /**
     * 提取函数信息
     * @param {string} content - 文件内容
     * @returns {Array<object>} 函数信息数组
     */
  extractFunctions(content) {
    const functions = [];
    const patterns = [
      /function\s+(\w+)\s*\(/g,
      /(\w+)\s*[:=]\s*function/g,
      /(\w+)\s*[:=]\s*\([^)]*\)\s*=>/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        functions.push({
          name: match[1],
          type: 'function',
          line: content.substring(0, match.index).split('\n').length
        });
      }
    });

    return functions;
  }

  /**
     * 提取类信息
     * @param {string} content - 文件内容
     * @returns {Array<object>} 类信息数组
     */
  extractClasses(content) {
    const classes = [];
    const pattern = /class\s+(\w+)/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      classes.push({
        name: match[1],
        type: 'class',
        line: content.substring(0, match.index).split('\n').length
      });
    }

    return classes;
  }

  /**
     * 提取变量信息
     * @param {string} content - 文件内容
     * @returns {Array<object>} 变量信息数组
     */
  extractVariables(content) {
    const variables = [];
    const patterns = [
      /(?:var|let|const)\s+(\w+)/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        variables.push({
          name: match[1],
          type: 'variable',
          line: content.substring(0, match.index).split('\n').length
        });
      }
    });

    return variables;
  }

  /**
     * 提取依赖关系
     * @param {string} content - 文件内容
     * @returns {Array<string>} 依赖模块数组
     */
  extractDependencies(content) {
    const dependencies = [];
    const patterns = [
      /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        dependencies.push(match[1]);
      }
    });

    return [...new Set(dependencies)];
  }

  /**
     * 估算AST节点数量
     * @param {object} structure - 代码结构信息
     * @returns {number} 节点数量估算值
     */
  estimateNodeCount(structure) {
    return (structure.functions?.length || 0) +
            (structure.classes?.length || 0) +
            (structure.variables?.length || 0);
  }

  /**
     * 估算代码深度
     * @param {string} content - 文件内容
     * @returns {number} 代码深度估算值
     */
  estimateDepth(content) {
    return this.calculateNestingDepth(content);
  }

  // 质量检查方法
  /**
     * 查找长函数
     * @param {string} content - 文件内容
     * @returns {Array<object>} 长函数信息数组
     */
  findLongFunctions(content) {
    const functions = [];
    const lines = content.split('\n');
    let inFunction = false;
    let functionStart = 0;
    let braceCount = 0;

    lines.forEach((line, index) => {
      if (/function\s+\w+|\w+\s*[:=]\s*function|\w+\s*[:=]\s*\([^)]*\)\s*=>/.test(line)) {
        inFunction = true;
        functionStart = index;
        braceCount = 0;
      }

      if (inFunction) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        if (braceCount === 0 && index > functionStart) {
          const functionLength = index - functionStart + 1;
          if (functionLength > (window.MAGIC_NUMBERS?.LIMITS?.MAX_FUNCTION_LINES || 50)) { // 超过配置行数认为是长函数
            functions.push({ start: functionStart, end: index, length: functionLength });
          }
          inFunction = false;
        }
      }
    });

    return functions;
  }

  /**
     * 查找重复代码
     * @param {string} content - 文件内容
     * @returns {Array<object>} 重复代码块信息数组
     */
  findDuplicateCode(content) {
    // 简化的重复代码检测
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const duplicates = [];
    const minBlockSize = window.MAGIC_NUMBERS?.LIMITS?.MIN_DUPLICATE_BLOCK_SIZE || 3;

    for (let i = 0; i < lines.length - minBlockSize; i++) {
      for (let j = i + minBlockSize; j < lines.length - minBlockSize; j++) {
        let matchLength = 0;
        while (i + matchLength < lines.length &&
                    j + matchLength < lines.length &&
                    lines[i + matchLength] === lines[j + matchLength]) {
          matchLength++;
        }

        if (matchLength >= minBlockSize) {
          duplicates.push({
            block1: { start: i, end: i + matchLength },
            block2: { start: j, end: j + matchLength },
            length: matchLength
          });
        }
      }
    }

    return duplicates;
  }

  /**
     * 检查命名规范
     * @param {string} content - 文件内容
     * @returns {Array<object>} 命名规范问题数组
     */
  checkNamingConventions(content) {
    const issues = [];

    // 检查变量命名
    const variablePattern = /(?:var|let|const)\s+(\w+)/g;
    let match;

    while ((match = variablePattern.exec(content)) !== null) {
      const varName = match[1];
      if (!/^[a-z][a-zA-Z0-9]*$/.test(varName) && !/^[A-Z_]+$/.test(varName)) {
        issues.push({ type: 'variable-naming', name: varName });
      }
    }

    return issues;
  }

  /**
     * 分析错误处理
     * @param {string} content - 文件内容
     * @returns {number} 错误处理分数
     */
  analyzeErrorHandling(content) {
    const tryBlocks = (content.match(/try\s*{/g) || []).length;
    const catchBlocks = (content.match(/catch\s*\(/g) || []).length;
    const throwStatements = (content.match(/throw\s+/g) || []).length;

    let score = 0;
    if (tryBlocks > 0) {score += 10;}
    if (catchBlocks >= tryBlocks) {score += 10;}
    if (throwStatements > 0) {score += 5;}

    return score;
  }

  /**
     * 生成质量改进建议
     * @param {Array<object>} issues - 质量问题数组
     * @returns {Array<string>} 改进建议数组
     */
  generateQualitySuggestions(issues) {
    const suggestions = [];

    issues.forEach(issue => {
      switch (issue.type) {
      case 'long-function':
        suggestions.push('考虑将长函数拆分为更小的函数');
        break;
      case 'duplicate-code':
        suggestions.push('提取重复代码到公共函数或模块');
        break;
      case 'naming-convention':
        suggestions.push('改进变量和函数的命名规范');
        break;
      }
    });

    return [...new Set(suggestions)];
  }

  /**
     * 生成项目改进建议
     * @param {Array<object>} results - 分析结果数组
     * @returns {Array<string>} 项目改进建议数组
     */
  generateProjectRecommendations(results) {
    const recommendations = [];

    const highComplexityFiles = results.filter(r => r.complexity?.level === 'high');
    if (highComplexityFiles.length > 0) {
      recommendations.push(`${highComplexityFiles.length} 个文件具有高复杂度，建议重构`);
    }

    const lowQualityFiles = results.filter(r => (r.quality?.score || 0) < 60);
    if (lowQualityFiles.length > 0) {
      recommendations.push(`${lowQualityFiles.length} 个文件质量较低，需要改进`);
    }

    const avgCommentRatio = results.reduce((sum, r) => sum + (r.basic?.commentRatio || 0), 0) / results.length;
    if (avgCommentRatio < 0.1) {
      recommendations.push('项目注释覆盖率较低，建议增加代码注释');
    }

    return recommendations;
  }

  /**
     * 清理缓存
     */
  clearCache() {
    this.analysisCache.clear();
    this.parsedFiles.clear();
  }

  /**
     * 获取缓存统计
     */
  /**
     * 获取缓存统计信息
     * @returns {object} 缓存统计信息
     */
  getCacheStats() {
    return {
      cacheSize: this.analysisCache.size,
      parsedFiles: this.parsedFiles.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
     * 估算内存使用量
     * @returns {number} 内存使用量估算值（字节）
     */
  estimateMemoryUsage() {
    // 简单的内存使用估算
    return (this.analysisCache.size + this.parsedFiles.size) * 1024; // 假设每个条目1KB
  }
}

// 创建全局实例
const codeAnalyzer = new CodeAnalyzer();

// 导出
if (typeof window !== 'undefined') {
  window.codeAnalyzer = codeAnalyzer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = codeAnalyzer;
}
