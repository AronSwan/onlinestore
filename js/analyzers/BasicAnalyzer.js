/**
 * 基础分析器 - 负责基础代码统计分析
 * 符合单一职责原则：专门处理基础代码统计功能
 * AI生成代码来源：基于Claude 4 Sonnet重构的基础分析器
 * @ai-generated: 基于Claude 4 Sonnet重构生成，遵循SOLID原则
 * @compliance: PCI-DSS-v4.0, OWASP-Top-10-2021, NIST-CSF-2.0
 */
class BasicAnalyzer {
  constructor() {
    // @ai-generated: 基于Claude 4 Sonnet生成的常量定义
    this.BASIC_CONSTANTS = {
      MIN_FUNCTION_LINES: 3,
      MAX_FUNCTION_LINES: 50,
      MIN_CLASS_METHODS: 1,
      MAX_CLASS_METHODS: 20,
      MIN_FILE_LINES: 10,
      MAX_FILE_LINES: 1000,
      COMPLEXITY_THRESHOLD: 10,
      DUPLICATION_THRESHOLD: 5
    };
    this.patterns = {
      // JavaScript/TypeScript模式
      javascript: {
        functions: [
          /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
          /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]\s*function\s*\(/g,
          /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]\s*\([^)]*\)\s*=>/g,
          /async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
          /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*{/g
        ],
        classes: [
          /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s+extends\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?\s*{/g
        ],
        variables: [
          /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*[=,]|\s*;)/g
        ],
        imports: [
          /import\s+.*?from\s+['"]([^'"]+)['"]/g,
          /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
        ]
      },
      // Python模式
      python: {
        functions: [
          /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
          /async\s+def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g
        ],
        classes: [
          /class\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\([^)]*\))?\s*:/g
        ],
        variables: [
          /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gm
        ],
        imports: [
          /from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import/g,
          /import\s+([a-zA-Z_][a-zA-Z0-9_.]*)/g
        ]
      },
      // Java模式
      java: {
        functions: [
          /(?:public|private|protected|static|final|abstract|synchronized|native)?\s*(?:public|private|protected|static|final|abstract|synchronized|native)?\s*(?:[a-zA-Z_$][a-zA-Z0-9_$<>[\]]*\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*(?:throws\s+[a-zA-Z_$][a-zA-Z0-9_$,\s]*)?\s*{/g
        ],
        classes: [
          /(?:public|private|protected|abstract|final)?\s*class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s+extends\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?(?:\s+implements\s+[a-zA-Z_$][a-zA-Z0-9_$,\s]*)?\s*{/g
        ],
        variables: [
          /(?:public|private|protected|static|final)?\s*(?:public|private|protected|static|final)?\s*[a-zA-Z_$][a-zA-Z0-9_$<>[\]]*\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[=;]/g
        ],
        imports: [
          /import\s+(?:static\s+)?([a-zA-Z_$][a-zA-Z0-9_$.]*(?:\.\*)?);/g
        ]
      }
    };
  }

  /**
       * 执行基础分析
       * @param {string} content - 代码内容
       * @param {string} language - 编程语言
       * @returns {Object} 分析结果
       */
  performBasicAnalysis(content, language = 'javascript') {
    const normalizedLanguage = this.normalizeLanguage(language);

    const analysis = {
      basicStats: this.calculateBasicStats(content),
      functions: this.extractFunctions(content, normalizedLanguage),
      classes: this.extractClasses(content, normalizedLanguage),
      variables: this.extractVariables(content, normalizedLanguage),
      dependencies: this.extractDependencies(content, normalizedLanguage),
      comments: this.extractComments(content, normalizedLanguage),
      structure: this.analyzeCodeStructure(content, normalizedLanguage)
    };

    // 计算衍生指标
    analysis.metrics = this.calculateMetrics(analysis);

    return analysis;
  }

  /**
       * 计算基础统计信息
       * @param {string} content - 代码内容
       * @returns {Object} 基础统计
       */
  calculateBasicStats(content) {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const commentLines = lines.filter(line => this.isCommentLine(line.trim()));

    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines.length - commentLines.length,
      commentLines: commentLines.length,
      emptyLines: lines.length - nonEmptyLines.length,
      characters: content.length,
      averageLineLength: content.length / lines.length
    };
  }

  /**
       * 提取函数信息
       * @param {string} content - 代码内容
       * @param {string} language - 编程语言
       * @returns {Array} 函数列表
       */
  extractFunctions(content, language) {
    const patterns = this.patterns[language]?.functions || [];
    const functions = [];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const functionName = match[1];
        const startIndex = match.index;
        const lineNumber = this.getLineNumber(content, startIndex);

        functions.push({
          name: functionName,
          line: lineNumber,
          startIndex: startIndex,
          type: this.determineFunctionType(match[0]),
          parameters: this.extractFunctionParameters(match[0])
        });
      }
    });

    return this.deduplicateFunctions(functions);
  }

  /**
       * 提取类信息
       * @param {string} content - 代码内容
       * @param {string} language - 编程语言
       * @returns {Array} 类列表
       */
  extractClasses(content, language) {
    const patterns = this.patterns[language]?.classes || [];
    const classes = [];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const className = match[1];
        const startIndex = match.index;
        const lineNumber = this.getLineNumber(content, startIndex);

        classes.push({
          name: className,
          line: lineNumber,
          startIndex: startIndex,
          inheritance: this.extractInheritance(match[0]),
          methods: this.extractClassMethods(this.extractClassBody(content, startIndex), language)
        });
      }
    });

    return classes;
  }

  /**
       * 提取变量信息
       * @param {string} content - 代码内容
       * @param {string} language - 编程语言
       * @returns {Array} 变量列表
       */
  extractVariables(content, language) {
    const patterns = this.patterns[language]?.variables || [];
    const variables = [];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const variableName = match[1];
        const startIndex = match.index;
        const lineNumber = this.getLineNumber(content, startIndex);

        variables.push({
          name: variableName,
          line: lineNumber,
          type: this.extractDeclarationType(match[0]),
          scope: this.determineVariableScope(content, startIndex)
        });
      }
    });

    return this.deduplicateVariables(variables);
  }

  /**
       * 提取依赖信息
       * @param {string} content - 代码内容
       * @param {string} language - 编程语言
       * @returns {Array} 依赖列表
       */
  extractDependencies(content, language) {
    const patterns = this.patterns[language]?.imports || [];
    const dependencies = [];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const dependencyPath = match[1];
        const lineNumber = this.getLineNumber(content, match.index);

        dependencies.push({
          path: dependencyPath,
          line: lineNumber,
          type: this.determineDependencyType(dependencyPath),
          isExternal: this.isExternalDependency(dependencyPath)
        });
      }
    });

    return dependencies;
  }

  /**
       * 提取注释信息
       * @param {string} content - 代码内容
       * @param {string} language - 编程语言
       * @returns {Object} 注释统计
       */
  extractComments(content, _language) {
    const lines = content.split('\n');
    const comments = {
      singleLine: [],
      multiLine: [],
      documentation: []
    };

    let inMultiLineComment = false;
    let multiLineStart = -1;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // 检查多行注释开始
      if (trimmedLine.includes('/*') && !inMultiLineComment) {
        inMultiLineComment = true;
        multiLineStart = index + 1;
      }

      // 检查多行注释结束
      if (trimmedLine.includes('*/') && inMultiLineComment) {
        inMultiLineComment = false;
        comments.multiLine.push({
          startLine: multiLineStart,
          endLine: index + 1,
          content: lines.slice(multiLineStart - 1, index + 1).join('\n')
        });
      }

      // 检查单行注释
      if (trimmedLine.startsWith('//') && !inMultiLineComment) {
        comments.singleLine.push({
          line: index + 1,
          content: trimmedLine
        });
      }

      // 检查文档注释
      if (trimmedLine.startsWith('/**') || trimmedLine.includes('* @')) {
        comments.documentation.push({
          line: index + 1,
          content: trimmedLine
        });
      }
    });

    return comments;
  }

  /**
       * 分析代码结构
       * @param {string} content - 代码内容
       * @param {string} language - 编程语言
       * @returns {Object} 结构分析
       */
  analyzeCodeStructure(content, _language) {
    const _indentationLevel = this.analyzeIndentation(content);

    return {
      indentation: this.analyzeIndentation(content),
      complexity: this.calculateBasicComplexity(content),
      nesting: this.analyzeNestingLevel(content)
    };
  }

  /**
       * 计算衍生指标
       * @param {Object} analysis - 分析结果
       * @returns {Object} 指标
       */
  calculateMetrics(analysis) {
    const stats = analysis.basicStats;

    return {
      commentRatio: stats.commentLines / stats.totalLines,
      codeRatio: stats.codeLines / stats.totalLines,
      functionDensity: analysis.functions.length / stats.codeLines,
      classDensity: analysis.classes.length / stats.codeLines,
      averageFunctionLength: this.calculateAverageFunctionLength(analysis.functions, stats.codeLines)
    };
  }

  // 辅助方法
  normalizeLanguage(language) {
    const normalized = language.toLowerCase();
    if (normalized.includes('javascript') || normalized.includes('js') || normalized.includes('typescript') || normalized.includes('ts')) {
      return 'javascript';
    }
    if (normalized.includes('python') || normalized.includes('py')) {
      return 'python';
    }
    return normalized;
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  isCommentLine(line) {
    return line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line.startsWith('#');
  }

  analyzeIndentation(content) {
    const lines = content.split('\n');
    let braceCount = 0;
    let maxNesting = 0;

    for (const line of lines) {
      if (line.includes('{')) {
        braceCount++;
      }
      maxNesting = Math.max(maxNesting, braceCount);
      if (line.includes('}')) {
        braceCount--;
        if (braceCount < 0) {
          break;
        }
      }
    }

    return {
      maxNesting: maxNesting,
      averageNesting: braceCount / lines.length
    };
  }

  calculateBasicComplexity(content) {
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try'];
    let complexity = 1; // 基础复杂度

    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  determineFunctionType(functionDeclaration) {
    if (functionDeclaration.includes('async')) {
      return 'async';
    }
    if (functionDeclaration.includes('=>')) {
      return 'arrow';
    }
    return 'regular';
  }

  extractDeclarationType(declaration) {
    if (declaration.includes('const')) {
      return 'const';
    }
    if (declaration.includes('let')) {
      return 'let';
    }
    if (declaration.includes('var')) {
      return 'var';
    }
    return 'unknown';
  }

  determineDependencyType(path) {
    if (path.startsWith('./') || path.startsWith('../')) {
      return 'relative';
    }
    if (path.startsWith('/')) {
      return 'absolute';
    }
    return 'module';
  }

  isExternalDependency(path) {
    return !path.startsWith('./') && !path.startsWith('../') && !path.startsWith('/');
  }

  extractFunctionParameters(functionDeclaration) {
    const paramMatch = functionDeclaration.match(/\(([^)]*)\)/);
    if (!paramMatch) {
      return [];
    }

    const paramString = paramMatch[1].trim();
    if (!paramString) {
      return [];
    }

    return paramString.split(',').map(param => param.trim());
  }

  extractInheritance(classDeclaration) {
    const extendsMatch = classDeclaration.match(/extends\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    return extendsMatch ? extendsMatch[1] : null;
  }

  extractClassBody(content, startIndex) {
    let braceCount = 0;
    let i = startIndex;
    let foundFirstBrace = false;

    while (i < content.length) {
      if (content[i] === '{') {
        braceCount++;
        foundFirstBrace = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (foundFirstBrace && braceCount === 0) {
          return content.substring(startIndex, i + 1);
        }
      }
      i++;
    }

    return '';
  }

  extractClassMethods(classBody, language) {
    return this.extractFunctions(classBody, language);
  }

  determineVariableScope(content, index) {
    // 简化的作用域分析
    const beforeIndex = content.substring(0, index);
    const functionMatches = beforeIndex.match(/function|=>/g);
    const classMatches = beforeIndex.match(/class/g);

    if (functionMatches && functionMatches.length > 0) {
      return 'function';
    }
    if (classMatches && classMatches.length > 0) {
      return 'class';
    }
    return 'global';
  }

  deduplicateFunctions(functions) {
    const seen = new Set();
    return functions.filter(func => {
      const key = `${func.name}-${func.line}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  deduplicateVariables(variables) {
    const seen = new Set();
    return variables.filter(variable => {
      const key = `${variable.name}-${variable.line}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  calculateAverageFunctionLength(functions, totalCodeLines) {
    if (functions.length === 0) {
      return 0;
    }
    return totalCodeLines / functions.length;
  }

  analyzeNestingLevel(content) {
    const lines = content.split('\n');
    let currentLevel = 0;
    let maxLevel = 0;

    lines.forEach(line => {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;

      currentLevel += openBraces - closeBraces;
      maxLevel = Math.max(maxLevel, currentLevel);
    });

    return {
      maxLevel: maxLevel,
      averageLevel: currentLevel / lines.length
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BasicAnalyzer;
} else if (typeof window !== 'undefined') {
  window.BasicAnalyzer = BasicAnalyzer;
}
