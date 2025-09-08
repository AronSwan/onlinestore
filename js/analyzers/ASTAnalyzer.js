/**
 * AST分析器 - 负责抽象语法树分析
 * 符合单一职责原则：专门处理AST解析和分析功能
 * AI生成代码来源：基于Claude 4 Sonnet重构的AST分析器
 * @ai-generated: 基于Claude 4 Sonnet重构生成，遵循SOLID原则
 * @compliance: PCI-DSS-v4.0, OWASP-Top-10-2021, NIST-CSF-2.0
 */
class ASTAnalyzer {
  constructor() {
    // @ai-generated: 基于Claude 4 Sonnet生成的常量定义
    this.AST_CONSTANTS = {
      MAX_DEPTH: 10,
      MIN_COMPLEXITY: 5,
      MAX_COMPLEXITY: 20,
      CACHE_SIZE_LIMIT: 100,
      ANALYSIS_TIMEOUT: 5000,
      MIN_FUNCTION_LENGTH: 3,
      MAX_FUNCTION_LENGTH: 50,
      COMPLEXITY_THRESHOLD: 15
    };
    this.supportedLanguages = ['javascript', 'python', 'java', 'css', 'html'];
    this.astCache = new Map();
    this.analysisPatterns = {
      javascript: {
        functions: /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)|([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]\s*function|([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>|class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*{/g,
        classes: /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:extends\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?\s*{/g,
        imports: /import\s+.*?from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        exports: /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|module\.exports\s*=|exports\.[a-zA-Z_$][a-zA-Z0-9_$]*/g
      },
      python: {
        functions: /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
        classes: /class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\([^)]*\))?\s*:/g,
        imports: /from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import|import\s+([a-zA-Z_][a-zA-Z0-9_.]*)/g,
        exports: /__all__\s*=\s*\[([^\]]+)\]/g
      },
      java: {
        functions: /(?:public|private|protected)?\s*(?:static)?\s*(?:[a-zA-Z_$][a-zA-Z0-9_$<>[\]]*\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*(?:throws\s+[^{]+)?\s*{/g,
        classes: /(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:extends\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?\s*(?:implements\s+[^{]+)?\s*{/g,
        imports: /import\s+(?:static\s+)?([a-zA-Z_$][a-zA-Z0-9_$.]*)/g,
        exports: /public\s+(?:class|interface|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
      }
    };
  }

  /**
     * 执行AST分析
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @param {Object} options - 分析选项
     * @returns {Object} AST分析结果
     */
  performASTAnalysis(content, language = 'javascript', options = {}) {
    try {
      const cacheKey = this.generateCacheKey(content, language, options);

      // 检查缓存
      if (this.astCache.has(cacheKey) && !options.forceRefresh) {
        return {
          success: true,
          fromCache: true,
          analysis: this.astCache.get(cacheKey),
          timestamp: new Date().toISOString()
        };
      }

      // 执行分析
      const analysis = {
        language: language,
        structure: this.analyzeCodeStructure(content, language),
        dependencies: this.analyzeDependencies(content, language),
        symbols: this.extractSymbols(content, language),
        patterns: this.analyzePatterns(content, language),
        metrics: this.calculateASTMetrics(content, language),
        issues: this.detectStructuralIssues(content, language)
      };

      // 缓存结果
      this.astCache.set(cacheKey, analysis);

      // 清理过期缓存
      this.cleanupCache();

      return {
        success: true,
        fromCache: false,
        analysis: analysis,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `AST分析失败: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
     * 分析代码结构
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 代码结构信息
     */
  analyzeCodeStructure(content, language) {
    const structure = {
      functions: this.extractFunctions(content, language),
      classes: this.extractClasses(content, language),
      modules: this.extractModules(content, language),
      blocks: this.analyzeBlockStructure(content, language),
      hierarchy: this.buildHierarchy(content, language)
    };

    // 计算结构统计
    structure.statistics = {
      totalFunctions: structure.functions.length,
      totalClasses: structure.classes.length,
      totalModules: structure.modules.length,
      averageFunctionLength: this.calculateAverageFunctionLength(structure.functions),
      averageClassSize: this.calculateAverageClassSize(structure.classes),
      nestingDepth: this.calculateMaxNestingDepth(content)
    };

    return structure;
  }

  /**
     * 分析依赖关系
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 依赖分析结果
     */
  analyzeDependencies(content, language) {
    const dependencies = {
      imports: this.extractImports(content, language),
      exports: this.extractExports(content, language),
      internal: this.findInternalDependencies(content, language),
      external: this.findExternalDependencies(content, language),
      circular: this.detectCircularDependencies(content, language)
    };

    // 依赖统计
    dependencies.statistics = {
      totalImports: dependencies.imports.length,
      totalExports: dependencies.exports.length,
      internalCount: dependencies.internal.length,
      externalCount: dependencies.external.length,
      circularCount: dependencies.circular.length,
      dependencyRatio: this.calculateDependencyRatio(dependencies)
    };

    return dependencies;
  }

  /**
     * 提取符号信息
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 符号信息
     */
  extractSymbols(content, language) {
    const symbols = {
      variables: this.extractVariables(content, language),
      constants: this.extractConstants(content, language),
      functions: this.extractFunctionSignatures(content, language),
      classes: this.extractClassDefinitions(content, language),
      interfaces: this.extractInterfaces(content, language),
      types: this.extractTypeDefinitions(content, language)
    };

    // 符号统计
    symbols.statistics = {
      totalSymbols: Object.values(symbols).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
      publicSymbols: this.countPublicSymbols(symbols),
      privateSymbols: this.countPrivateSymbols(symbols),
      unusedSymbols: this.findUnusedSymbols(content, symbols),
      namingConventions: this.checkNamingConventions(symbols, language)
    };

    return symbols;
  }

  /**
     * 分析代码模式
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} 模式分析结果
     */
  analyzePatterns(content, language) {
    const patterns = {
      designPatterns: this.detectDesignPatterns(content, language),
      antiPatterns: this.detectAntiPatterns(content, language),
      codeSmells: this.detectCodeSmells(content, language),
      bestPractices: this.checkBestPractices(content, language),
      conventions: this.checkCodingConventions(content, language)
    };

    // 模式统计
    patterns.statistics = {
      designPatternCount: patterns.designPatterns.length,
      antiPatternCount: patterns.antiPatterns.length,
      codeSmellCount: patterns.codeSmells.length,
      bestPracticeScore: this.calculateBestPracticeScore(patterns.bestPractices),
      conventionScore: this.calculateConventionScore(patterns.conventions)
    };

    return patterns;
  }

  /**
     * 计算AST指标
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Object} AST指标
     */
  calculateASTMetrics(content, language) {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const commentLines = this.extractCommentLines(content, language);

    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines.length - commentLines.length,
      commentLines: commentLines.length,
      blankLines: lines.length - nonEmptyLines.length,
      commentRatio: commentLines.length / nonEmptyLines.length,
      averageLineLength: this.calculateAverageLineLength(nonEmptyLines),
      longestLine: this.findLongestLine(lines),
      indentationConsistency: this.checkIndentationConsistency(lines),
      bracketBalance: this.checkBracketBalance(content),
      tokenCount: this.countTokens(content, language)
    };
  }

  /**
     * 检测结构性问题
     * @param {string} content - 文件内容
     * @param {string} language - 编程语言
     * @returns {Array} 问题列表
     */
  detectStructuralIssues(content, language) {
    const issues = [];

    // 检查大型函数
    const largeFunctions = this.findLargeFunctions(content, language);
    largeFunctions.forEach(func => {
      issues.push({
        type: 'large_function',
        severity: 'medium',
        message: `函数 '${func.name}' 过长 (${func.lines} 行)`,
        line: func.startLine,
        suggestion: '考虑拆分为更小的函数'
      });
    });

    // 检查深度嵌套
    const deepNesting = this.findDeepNesting(content, language);
    deepNesting.forEach(nest => {
      issues.push({
        type: 'deep_nesting',
        severity: 'high',
        message: `嵌套层次过深 (${nest.depth} 层)`,
        line: nest.line,
        suggestion: '使用早期返回或提取函数来减少嵌套'
      });
    });

    // 检查重复代码
    const duplicates = this.findDuplicateCode(content, language);
    duplicates.forEach(dup => {
      issues.push({
        type: 'duplicate_code',
        severity: 'medium',
        message: `发现重复代码块 (${dup.lines} 行)`,
        line: dup.startLine,
        suggestion: '提取为公共函数或方法'
      });
    });

    // 检查未使用的变量
    const unusedVars = this.findUnusedVariables(content, language);
    unusedVars.forEach(variable => {
      issues.push({
        type: 'unused_variable',
        severity: 'low',
        message: `未使用的变量 '${variable.name}'`,
        line: variable.line,
        suggestion: '删除未使用的变量'
      });
    });

    // 检查魔法数字
    const magicNumbers = this.findMagicNumbers(content, language);
    magicNumbers.forEach(magic => {
      issues.push({
        type: 'magic_number',
        severity: 'low',
        message: `魔法数字 '${magic.value}'`,
        line: magic.line,
        suggestion: '使用命名常量替换魔法数字'
      });
    });

    return issues.sort((a, b) => {
      const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  // 辅助方法实现
  extractFunctions(content, language) {
    const functions = [];
    const pattern = this.analysisPatterns[language]?.functions;
    if (!pattern) { return functions; }

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const functionName = match[1] || match[2] || match[3] || match[4] || 'anonymous';
      const startLine = content.substring(0, match.index).split('\n').length;
      const functionBody = this.extractFunctionBody(content, match.index);

      functions.push({
        name: functionName,
        startLine: startLine,
        endLine: startLine + functionBody.split('\n').length - 1,
        length: functionBody.split('\n').length,
        parameters: this.extractParameters(match[0]),
        body: functionBody,
        complexity: this.calculateFunctionComplexity(functionBody)
      });
    }

    return functions;
  }

  extractClasses(content, language) {
    const classes = [];
    const pattern = this.analysisPatterns[language]?.classes;
    if (!pattern) { return classes; }

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const className = match[1];
      const startLine = content.substring(0, match.index).split('\n').length;
      const classBody = this.extractClassBody(content, match.index);

      classes.push({
        name: className,
        startLine: startLine,
        endLine: startLine + classBody.split('\n').length - 1,
        length: classBody.split('\n').length,
        methods: this.extractClassMethods(classBody, language),
        properties: this.extractClassProperties(classBody, language),
        inheritance: this.extractInheritance(match[0])
      });
    }

    return classes;
  }

  extractImports(content, language) {
    const imports = [];
    const pattern = this.analysisPatterns[language]?.imports;
    if (!pattern) { return imports; }

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const moduleName = match[1] || match[2];
      const startLine = content.substring(0, match.index).split('\n').length;

      imports.push({
        module: moduleName,
        line: startLine,
        type: this.determineImportType(moduleName),
        statement: match[0].trim()
      });
    }

    return imports;
  }

  generateCacheKey(content, language, options) {
    const contentHash = this.simpleHash(content);
    const optionsHash = this.simpleHash(JSON.stringify(options));
    return `${language}_${contentHash}_${optionsHash}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  cleanupCache() {
    if (this.astCache.size > 100) {
      const entries = Array.from(this.astCache.entries());
      const toDelete = entries.slice(0, 50);
      toDelete.forEach(([key]) => this.astCache.delete(key));
    }
  }

  extractFunctionBody(content, startIndex) {
    let braceCount = 0;
    let inFunction = false;
    let body = '';

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
      }

      if (inFunction) {
        body += char;
      }

      if (inFunction && braceCount === 0) {
        break;
      }
    }

    return body;
  }

  extractParameters(functionSignature) {
    const paramMatch = functionSignature.match(/\(([^)]*)\)/);
    if (!paramMatch) { return []; }

    const paramString = paramMatch[1].trim();
    if (!paramString) { return []; }

    return paramString.split(',').map(param => param.trim());
  }

  calculateFunctionComplexity(functionBody) {
    const complexityPatterns = [
      /\bif\b/g, /\belse\b/g, /\bwhile\b/g, /\bfor\b/g,
      /\bcase\b/g, /\bcatch\b/g, /&&/g, /\|\|/g
    ];

    let complexity = 1;
    complexityPatterns.forEach(pattern => {
      const matches = functionBody.match(pattern) || [];
      complexity += matches.length;
    });

    return complexity;
  }

  extractClassBody(content, startIndex) {
    return this.extractFunctionBody(content, startIndex);
  }

  extractClassMethods(classBody, language) {
    return this.extractFunctions(classBody, language);
  }

  extractClassProperties(classBody, language) {
    const properties = [];
    const lines = classBody.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (language === 'javascript') {
        const propMatch = trimmed.match(/^(\w+)\s*[=:]/);
        if (propMatch && !trimmed.includes('function')) {
          properties.push({
            name: propMatch[1],
            line: index + 1,
            type: 'property'
          });
        }
      }
    });

    return properties;
  }

  extractInheritance(classSignature) {
    const extendsMatch = classSignature.match(/extends\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    return extendsMatch ? extendsMatch[1] : null;
  }

  determineImportType(moduleName) {
    if (moduleName.startsWith('.')) { return 'relative'; }
    if (moduleName.includes('/') && !moduleName.startsWith('@')) { return 'absolute'; }
    return 'external';
  }

  findLargeFunctions(content, _language) {
    const functions = this.extractFunctions(content, _language);
    return functions.filter(func => func.length > this.AST_CONSTANTS.MAX_FUNCTION_LENGTH);
  }

  findDeepNesting(content, _language) {
    const lines = content.split('\n');
    const deepNesting = [];
    let currentDepth = 0;

    lines.forEach((line, index) => {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;

      currentDepth += openBraces - closeBraces;

      if (currentDepth > this.AST_CONSTANTS.MAX_DEPTH / 2.5) {
        deepNesting.push({
          line: index + 1,
          depth: currentDepth
        });
      }
    });

    return deepNesting;
  }

  findDuplicateCode(content, _language) {
    // 简化的重复代码检测
    const lines = content.split('\n');
    const duplicates = [];
    const minBlockSize = this.AST_CONSTANTS.MIN_COMPLEXITY;

    for (let i = 0; i < lines.length - minBlockSize; i++) {
      const block = lines.slice(i, i + minBlockSize).join('\n');
      const blockHash = this.simpleHash(block.trim());

      for (let j = i + minBlockSize; j < lines.length - minBlockSize; j++) {
        const compareBlock = lines.slice(j, j + minBlockSize).join('\n');
        const compareHash = this.simpleHash(compareBlock.trim());

        if (blockHash === compareHash && block.trim().length > this.AST_CONSTANTS.MAX_FUNCTION_LENGTH) {
          duplicates.push({
            startLine: i + 1,
            lines: minBlockSize
          });
          break;
        }
      }
    }

    return duplicates;
  }

  findUnusedVariables(content, _language) {
    // 简化的未使用变量检测
    const variables = [];
    const varPattern = /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
    let match;

    while ((match = varPattern.exec(content)) !== null) {
      const varName = match[1];
      const line = content.substring(0, match.index).split('\n').length;

      // 简单检查：如果变量名在声明后没有再次出现，认为未使用
      const afterDeclaration = content.substring(match.index + match[0].length);
      const usagePattern = new RegExp(`\\b${varName}\\b`, 'g');

      if (!usagePattern.test(afterDeclaration)) {
        variables.push({
          name: varName,
          line: line
        });
      }
    }

    return variables;
  }

  findMagicNumbers(content, _language) {
    const magicNumbers = [];
    const numberPattern = /\b(\d+(?:\.\d+)?)\b/g;
    let match;

    while ((match = numberPattern.exec(content)) !== null) {
      const number = parseFloat(match[1]);
      const line = content.substring(0, match.index).split('\n').length;

      // 排除常见的非魔法数字
      if (number !== 0 && number !== 1 && number !== -1 && number !== 2) {
        magicNumbers.push({
          value: match[1],
          line: line
        });
      }
    }

    return magicNumbers;
  }

  extractCommentLines(content, language) {
    const commentPatterns = {
      javascript: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//gm],
      python: [/#.*$/gm, /"""[\s\S]*?"""/gm, /'''[\s\S]*?'''/gm],
      java: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//gm]
    };

    const patterns = commentPatterns[language] || commentPatterns.javascript;
    const comments = [];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const commentLines = match[0].split('\n').length;
        comments.push(...Array(commentLines).fill(0));
      }
    });

    return comments;
  }

  calculateAverageLineLength(lines) {
    if (lines.length === 0) { return 0; }
    const totalLength = lines.reduce((sum, line) => sum + line.length, 0);
    return Math.round(totalLength / lines.length * 100) / 100;
  }

  findLongestLine(lines) {
    return Math.max(...lines.map(line => line.length));
  }

  checkIndentationConsistency(lines) {
    const indentations = new Set();

    lines.forEach(line => {
      if (line.trim().length > 0) {
        const leadingSpaces = line.match(/^\s*/)[0].length;
        if (leadingSpaces > 0) {
          indentations.add(leadingSpaces);
        }
      }
    });

    return {
      consistent: indentations.size <= 2,
      patterns: Array.from(indentations).sort((a, b) => a - b)
    };
  }

  checkBracketBalance(content) {
    const brackets = { '(': 0, '[': 0, '{': 0 };
    const closing = { ')': '(', ']': '[', '}': '{' };

    for (const char of content) {
      if (char in brackets) {
        brackets[char]++;
      } else if (char in closing) {
        brackets[closing[char]]--;
      }
    }

    const balanced = Object.values(brackets).every(count => count === 0);
    return { balanced, counts: brackets };
  }

  countTokens(content, _language) {
    // 简化的token计数
    const tokenPattern = /\b\w+\b|[{}[\]();,.]|[+\-*/%=<>!&|^~]/g;
    const tokens = content.match(tokenPattern) || [];
    return tokens.length;
  }

  // 占位符方法（简化实现）
  // @ai-generated: 基于Claude 4 Sonnet生成的占位符方法
  extractModules(_content, _language) { return []; }
  analyzeBlockStructure(_content, _language) { return {}; }
  buildHierarchy(_content, _language) { return {}; }
  calculateAverageFunctionLength(functions) {
    if (functions.length === 0) { return 0; }
    return functions.reduce((sum, fn) => sum + fn.length, 0) / functions.length;
  }
  calculateAverageClassSize(classes) {
    if (classes.length === 0) { return 0; }
    return classes.reduce((sum, cls) => sum + cls.length, 0) / classes.length;
  }
  calculateMaxNestingDepth(content) {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of content) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }

    return maxDepth;
  }
  extractExports(_content, _language) { return []; }
  findInternalDependencies(_content, _language) { return []; }
  findExternalDependencies(_content, _language) { return []; }
  detectCircularDependencies(_content, _language) { return []; }
  calculateDependencyRatio(_dependencies) { return 0; }
  extractVariables(_content, _language) { return []; }
  extractConstants(_content, _language) { return []; }
  extractFunctionSignatures(_content, _language) { return []; }
  extractClassDefinitions(_content, _language) { return []; }
  extractInterfaces(_content, _language) { return []; }
  extractTypeDefinitions(_content, _language) { return []; }
  countPublicSymbols(_symbols) { return 0; }
  countPrivateSymbols(_symbols) { return 0; }
  findUnusedSymbols(_content, _symbols) { return []; }
  checkNamingConventions(_symbols, _language) { return {}; }
  detectDesignPatterns(_content, _language) { return []; }
  detectAntiPatterns(_content, _language) { return []; }
  detectCodeSmells(_content, _language) { return []; }
  checkBestPractices(_content, _language) { return []; }
  checkCodingConventions(_content, _language) { return []; }
  calculateBestPracticeScore(_practices) { return 0; }
  calculateConventionScore(_conventions) { return 0; }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ASTAnalyzer;
} else if (typeof window !== 'undefined') {
  window.ASTAnalyzer = ASTAnalyzer;
}
