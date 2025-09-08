/**
 * DependencyAnalyzer - 依赖关系分析专职类
 * 职责: 分析项目依赖关系，构建依赖图谱
 * 符合单一职责原则(SRP)
 * @ai-generated: 基于Claude 4 Sonnet重构生成，遵循SOLID原则
 */
class DependencyAnalyzer {
  constructor() {
    this.dependencyGraph = new Map();
    this.circularDependencies = [];
    this.orphanFiles = [];
    this.importPatterns = {
      es6: /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g,
      commonjs: /require\s*\(['"]([^'"]+)['"]\)/g,
      dynamic: /import\s*\(['"]([^'"]+)['"]\)/g
    };
  }

  /**
   * 分析项目依赖关系
   * @param {Array} files - 文件列表
   * @param {Object} options - 分析选项
   * @returns {Object} 依赖分析结果
   */
  async analyzeDependencies(files, options = {}) {
    try {
      // 清空之前的分析结果
      this.dependencyGraph.clear();
      this.circularDependencies = [];
      this.orphanFiles = [];

      // 构建依赖图
      await this.buildDependencyGraph(files, options);

      // 检测循环依赖
      this.detectCircularDependencies();

      // 查找孤立文件
      this.findOrphanFiles(files);

      // 计算依赖统计
      const statistics = this.calculateDependencyStatistics();

      return {
        dependencyGraph: this.serializeDependencyGraph(),
        circularDependencies: this.circularDependencies,
        orphanFiles: this.orphanFiles,
        statistics: statistics,
        analysisTime: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`依赖分析失败: ${error.message}`);
    }
  }

  /**
   * 构建依赖图
   * @param {Array} files - 文件列表
   * @param {Object} options - 选项
   */
  async buildDependencyGraph(files, options) {
    const _path = require('path');

    for (const file of files) {
      if (!this.shouldAnalyzeFile(file, options)) {
        continue;
      }

      const dependencies = this.extractDependencies(file.content, file.fullPath);
      const resolvedDependencies = [];

      for (const dep of dependencies) {
        const resolved = this.resolveDependency(dep, file.fullPath, files);
        if (resolved) {
          resolvedDependencies.push(resolved);
        }
      }

      this.dependencyGraph.set(file.path, {
        file: file,
        dependencies: resolvedDependencies,
        dependents: [],
        type: this.classifyFileType(file),
        complexity: this.calculateFileComplexity(file.content)
      });
    }

    // 构建反向依赖关系
    this.buildReverseDependencies();
  }

  /**
   * 提取文件依赖
   * @param {string} content - 文件内容
   * @param {string} filePath - 文件路径
   * @returns {Array} 依赖列表
   */
  extractDependencies(content, _filePath) {
    const dependencies = [];

    // 提取ES6 import
    let match;
    while ((match = this.importPatterns.es6.exec(content)) !== null) {
      dependencies.push({
        module: match[1],
        type: 'es6-import',
        line: this.getLineNumber(content, match.index)
      });
    }

    // 重置正则表达式
    this.importPatterns.es6.lastIndex = 0;

    // 提取CommonJS require
    while ((match = this.importPatterns.commonjs.exec(content)) !== null) {
      dependencies.push({
        module: match[1],
        type: 'commonjs-require',
        line: this.getLineNumber(content, match.index)
      });
    }

    this.importPatterns.commonjs.lastIndex = 0;

    // 提取动态import
    while ((match = this.importPatterns.dynamic.exec(content)) !== null) {
      dependencies.push({
        module: match[1],
        type: 'dynamic-import',
        line: this.getLineNumber(content, match.index)
      });
    }

    this.importPatterns.dynamic.lastIndex = 0;

    return dependencies;
  }

  /**
   * 解析依赖路径
   * @param {Object} dependency - 依赖对象
   * @param {string} fromPath - 源文件路径
   * @param {Array} allFiles - 所有文件列表
   * @returns {Object|null} 解析后的依赖
   */
  resolveDependency(dependency, fromPath, allFiles) {
    const path = require('path');

    // 跳过外部模块
    if (this.isExternalModule(dependency.module)) {
      return {
        ...dependency,
        resolved: false,
        external: true,
        category: 'external'
      };
    }

    // 解析相对路径
    const fromDir = path.dirname(fromPath);
    let resolvedPath = path.resolve(fromDir, dependency.module);

    // 尝试添加常见扩展名
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'];
    let targetFile = null;

    for (const ext of ['', ...extensions]) {
      const testPath = resolvedPath + ext;
      targetFile = allFiles.find(f => f.fullPath === testPath);
      if (targetFile) {
        resolvedPath = testPath;
        break;
      }

      // 尝试index文件
      const indexPath = path.join(resolvedPath, 'index' + ext);
      targetFile = allFiles.find(f => f.fullPath === indexPath);
      if (targetFile) {
        resolvedPath = indexPath;
        break;
      }
    }

    return {
      ...dependency,
      resolved: !!targetFile,
      resolvedPath: resolvedPath,
      targetFile: targetFile,
      category: targetFile ? 'internal' : 'unresolved'
    };
  }

  /**
   * 检测循环依赖
   */
  detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    const path = [];

    for (const [filePath] of this.dependencyGraph) {
      if (!visited.has(filePath)) {
        this.dfsCircularDetection(filePath, visited, recursionStack, path);
      }
    }
  }

  /**
   * DFS循环依赖检测
   * @param {string} filePath - 当前文件路径
   * @param {Set} visited - 已访问集合
   * @param {Set} recursionStack - 递归栈
   * @param {Array} path - 当前路径
   */
  dfsCircularDetection(filePath, visited, recursionStack, path) {
    visited.add(filePath);
    recursionStack.add(filePath);
    path.push(filePath);

    const node = this.dependencyGraph.get(filePath);
    if (!node) { return; }

    for (const dep of node.dependencies) {
      if (!dep.resolved || dep.external) { continue; }

      const depPath = dep.targetFile.path;

      if (!visited.has(depPath)) {
        this.dfsCircularDetection(depPath, visited, recursionStack, path);
      } else if (recursionStack.has(depPath)) {
        // 发现循环依赖
        const cycleStart = path.indexOf(depPath);
        const cycle = path.slice(cycleStart).concat([depPath]);
        this.circularDependencies.push({
          cycle: cycle,
          length: cycle.length - 1,
          severity: this.calculateCycleSeverity(cycle)
        });
      }
    }

    recursionStack.delete(filePath);
    path.pop();
  }

  /**
   * 查找孤立文件
   * @param {Array} files - 文件列表
   */
  findOrphanFiles(files) {
    for (const file of files) {
      const node = this.dependencyGraph.get(file.path);
      if (node && node.dependencies.length === 0 && node.dependents.length === 0) {
        this.orphanFiles.push({
          file: file,
          reason: 'no-dependencies-or-dependents'
        });
      }
    }
  }

  /**
   * 构建反向依赖关系
   */
  buildReverseDependencies() {
    for (const [_filePath, node] of this.dependencyGraph) {
      for (const dep of node.dependencies) {
        if (dep.resolved && !dep.external && dep.targetFile) {
          const targetNode = this.dependencyGraph.get(dep.targetFile.path);
          if (targetNode) {
            targetNode.dependents.push({
              file: node.file,
              dependency: dep
            });
          }
        }
      }
    }
  }

  /**
   * 计算依赖统计
   * @returns {Object} 统计信息
   */
  calculateDependencyStatistics() {
    let totalDependencies = 0;
    let externalDependencies = 0;
    let unresolvedDependencies = 0;
    const dependencyDepths = [];

    for (const [, node] of this.dependencyGraph) {
      totalDependencies += node.dependencies.length;

      for (const dep of node.dependencies) {
        if (dep.external) { externalDependencies++; }
        if (!dep.resolved) { unresolvedDependencies++; }
      }

      dependencyDepths.push(node.dependencies.length);
    }

    return {
      totalFiles: this.dependencyGraph.size,
      totalDependencies: totalDependencies,
      externalDependencies: externalDependencies,
      unresolvedDependencies: unresolvedDependencies,
      circularDependencies: this.circularDependencies.length,
      orphanFiles: this.orphanFiles.length,
      averageDependencies: totalDependencies / this.dependencyGraph.size || 0,
      maxDependencies: Math.max(...dependencyDepths, 0),
      minDependencies: Math.min(...dependencyDepths, 0)
    };
  }

  /**
   * 辅助方法
   */
  shouldAnalyzeFile(file, options) {
    const supportedExtensions = options.extensions || ['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'];
    return supportedExtensions.includes(file.extension);
  }

  isExternalModule(moduleName) {
    return !moduleName.startsWith('.') && !moduleName.startsWith('/');
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  classifyFileType(file) {
    const name = file.name.toLowerCase();
    if (name.includes('test') || name.includes('spec')) { return 'test'; }
    if (name.includes('config') || name.includes('setup')) { return 'config'; }
    if (name.includes('util') || name.includes('helper')) { return 'utility'; }
    if (name.includes('component')) { return 'component'; }
    if (name.includes('service')) { return 'service'; }
    return 'module';
  }

  calculateFileComplexity(content) {
    // 简单的复杂度计算
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s+\w+|\w+\s*=>|\w+\s*:\s*function/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;

    return {
      lines: lines,
      functions: functions,
      classes: classes,
      score: lines * 0.1 + functions * 2 + classes * 3
    };
  }

  calculateCycleSeverity(cycle) {
    // 循环长度越长，严重程度越高
    const length = cycle.length - 1;
    if (length <= 2) { return 'low'; }
    if (length <= 4) { return 'medium'; }
    return 'high';
  }

  serializeDependencyGraph() {
    const result = {};
    for (const [filePath, node] of this.dependencyGraph) {
      result[filePath] = {
        dependencies: node.dependencies.map(dep => ({
          module: dep.module,
          type: dep.type,
          resolved: dep.resolved,
          external: dep.external,
          category: dep.category
        })),
        dependents: node.dependents.map(dep => dep.file.path),
        type: node.type,
        complexity: node.complexity
      };
    }
    return result;
  }
}

// 模块导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DependencyAnalyzer;
} else if (typeof window !== 'undefined') {
  window.DependencyAnalyzer = DependencyAnalyzer;
}
