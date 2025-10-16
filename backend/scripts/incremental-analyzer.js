#!/usr/bin/env node

/**
 * 增量分析器
 *
 * 功能：
 * 1. 添加增量分析支持 (PERF-3.3.2)
 * 2. 实现智能文件变更检测
 * 3. 优化测试范围确定
 * 4. 提供增量覆盖率分析
 *
 * @author 架构师团队
 * @version 1.0.0
 * @since 2025-10-12
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 增量分析器类
 */
class IncrementalAnalyzer {
  constructor(options = {}) {
    // 默认配置
    this.config = {
      baseDir: options.baseDir || process.cwd(),
      cacheDir: options.cacheDir || path.join(__dirname, '.cache'),
      maxChangeHistory: options.maxChangeHistory || 100,
      ...options,
    };

    // 确保缓存目录存在
    this.ensureCacheDirectory();

    // 初始化文件依赖图
    this.dependencyGraph = new Map();

    // 初始化变更历史
    this.changeHistory = this.loadChangeHistory();
  }

  /**
   * 确保缓存目录存在
   */
  ensureCacheDirectory() {
    if (!fs.existsSync(this.config.cacheDir)) {
      fs.mkdirSync(this.config.cacheDir, { recursive: true });
    }
  }

  /**
   * 加载变更历史
   */
  loadChangeHistory() {
    try {
      const historyFile = path.join(this.config.cacheDir, 'incremental-history.json');
      if (fs.existsSync(historyFile)) {
        return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      }
      return [];
    } catch (error) {
      console.error('Failed to load change history:', error.message);
      return [];
    }
  }

  /**
   * 保存变更历史
   */
  saveChangeHistory() {
    try {
      const historyFile = path.join(this.config.cacheDir, 'incremental-history.json');

      // 限制历史记录数量
      if (this.changeHistory.length > this.config.maxChangeHistory) {
        this.changeHistory = this.changeHistory.slice(-this.config.maxChangeHistory);
      }

      fs.writeFileSync(historyFile, JSON.stringify(this.changeHistory, null, 2));
    } catch (error) {
      console.error('Failed to save change history:', error.message);
    }
  }

  /**
   * 分析文件变更
   */
  async analyzeChanges(changedFiles = null) {
    // 如果没有提供变更文件列表，自动检测
    if (!changedFiles) {
      changedFiles = await this.detectChangedFiles();
    }

    // 记录变更
    const changeEntry = {
      timestamp: Date.now(),
      files: changedFiles.map(file => ({
        path: file,
        hash: this.getFileHash(file),
      })),
    };

    this.changeHistory.push(changeEntry);
    this.saveChangeHistory();

    // 分析影响范围
    const affectedTests = await this.determineAffectedTests(changedFiles);

    // 分析增量覆盖率
    const incrementalCoverage = await this.analyzeIncrementalCoverage(changedFiles, affectedTests);

    return {
      timestamp: changeEntry.timestamp,
      changedFiles,
      affectedTests,
      incrementalCoverage,
    };
  }

  /**
   * 检测变更的文件
   */
  async detectChangedFiles() {
    const changedFiles = [];

    // 如果有历史记录，比较文件哈希
    if (this.changeHistory.length > 0) {
      const lastEntry = this.changeHistory[this.changeHistory.length - 1];

      for (const fileEntry of lastEntry.files) {
        const currentHash = this.getFileHash(fileEntry.path);
        if (currentHash !== fileEntry.hash) {
          changedFiles.push(fileEntry.path);
        }
      }
    } else {
      // 第一次运行，扫描所有文件
      const allFiles = await this.scanAllFiles();
      changedFiles.push(...allFiles);
    }

    return changedFiles;
  }

  /**
   * 扫描所有相关文件
   */
  async scanAllFiles() {
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.json'];
    const excludeDirs = ['node_modules', '.git', 'coverage', '.cache'];
    const allFiles = [];

    const scanDirectory = dir => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // 跳过排除的目录
          if (!excludeDirs.includes(item)) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          // 检查文件扩展名
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            allFiles.push(fullPath);
          }
        }
      }
    };

    scanDirectory(this.config.baseDir);
    return allFiles;
  }

  /**
   * 获取文件哈希
   */
  getFileHash(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      console.error(`Failed to get hash for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * 确定受影响的测试
   */
  async determineAffectedTests(changedFiles) {
    const affectedTests = new Set();

    // 构建依赖图（如果尚未构建）
    if (this.dependencyGraph.size === 0) {
      await this.buildDependencyGraph();
    }

    // 对于每个变更的文件，找到依赖它的测试
    for (const file of changedFiles) {
      const dependents = this.dependencyGraph.get(file) || [];

      for (const dependent of dependents) {
        // 如果依赖者是测试文件
        if (this.isTestFile(dependent)) {
          affectedTests.add(dependent);
        } else {
          // 递归查找依赖链
          const transitiveDependents = this.findTransitiveDependents(dependent);
          for (const transitive of transitiveDependents) {
            if (this.isTestFile(transitive)) {
              affectedTests.add(transitive);
            }
          }
        }
      }
    }

    // 如果没有找到受影响的测试，默认运行所有测试
    if (affectedTests.size === 0) {
      return { type: 'all', reason: 'no-specific-tests-found' };
    }

    return {
      type: 'specific',
      tests: Array.from(affectedTests),
      count: affectedTests.size,
    };
  }

  /**
   * 构建文件依赖图
   */
  async buildDependencyGraph() {
    console.log('Building dependency graph...');

    const allFiles = await this.scanAllFiles();

    for (const file of allFiles) {
      // 跳过非代码文件
      if (!this.isCodeFile(file)) {
        continue;
      }

      try {
        const dependencies = await this.extractDependencies(file);

        for (const dep of dependencies) {
          if (!this.dependencyGraph.has(dep)) {
            this.dependencyGraph.set(dep, []);
          }

          this.dependencyGraph.get(dep).push(file);
        }
      } catch (error) {
        console.error(`Failed to analyze ${file}:`, error.message);
      }
    }

    console.log(`Dependency graph built with ${this.dependencyGraph.size} nodes`);
  }

  /**
   * 提取文件依赖
   */
  async extractDependencies(filePath) {
    const dependencies = [];

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath);

      if (ext === '.js' || ext === '.jsx') {
        // JavaScript/JSX依赖提取
        const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
        const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;

        // 提取require依赖
        let match;
        while ((match = requireRegex.exec(content)) !== null) {
          const dep = match[1];
          if (!dep.startsWith('.')) continue; // 跳过node_modules

          const resolvedPath = path.resolve(path.dirname(filePath), dep);
          dependencies.push(resolvedPath);
        }

        // 提取import依赖
        while ((match = importRegex.exec(content)) !== null) {
          const dep = match[1];
          if (!dep.startsWith('.')) continue; // 跳过node_modules

          const resolvedPath = path.resolve(path.dirname(filePath), dep);
          dependencies.push(resolvedPath);
        }
      } else if (ext === '.ts' || ext === '.tsx') {
        // TypeScript/TSX依赖提取
        const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;

        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const dep = match[1];
          if (!dep.startsWith('.')) continue; // 跳过node_modules

          const resolvedPath = path.resolve(path.dirname(filePath), dep);
          dependencies.push(resolvedPath);
        }
      }
    } catch (error) {
      console.error(`Failed to extract dependencies from ${filePath}:`, error.message);
    }

    return dependencies;
  }

  /**
   * 查找传递依赖
   */
  findTransitiveDependents(file, visited = new Set()) {
    if (visited.has(file)) {
      return [];
    }

    visited.add(file);
    const dependents = this.dependencyGraph.get(file) || [];
    const result = [];

    for (const dependent of dependents) {
      result.push(dependent);
      result.push(...this.findTransitiveDependents(dependent, visited));
    }

    return result;
  }

  /**
   * 判断是否为测试文件
   */
  isTestFile(filePath) {
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);

    return (
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.endsWith('.test.js') ||
      fileName.endsWith('.test.ts') ||
      fileName.endsWith('.spec.js') ||
      fileName.endsWith('.spec.ts') ||
      dirName.includes('__tests__') ||
      dirName.includes('test') ||
      dirName.includes('tests')
    );
  }

  /**
   * 判断是否为代码文件
   */
  isCodeFile(filePath) {
    const ext = path.extname(filePath);
    return ['.js', '.ts', '.jsx', '.tsx'].includes(ext);
  }

  /**
   * 分析增量覆盖率
   */
  async analyzeIncrementalCoverage(changedFiles, affectedTests) {
    // 获取基线覆盖率数据
    const baselineCoverage = this.getBaselineCoverage();

    // 计算增量覆盖率范围
    const incrementalCoverageRanges = this.calculateIncrementalRanges(changedFiles);

    // 分析受影响测试的覆盖率
    const affectedTestCoverage = await this.analyzeAffectedTestCoverage(affectedTests);

    return {
      baseline: baselineCoverage,
      incrementalRanges: incrementalCoverageRanges,
      affectedTests: affectedTestCoverage,
      summary: this.generateCoverageSummary(baselineCoverage, affectedTestCoverage),
    };
  }

  /**
   * 获取基线覆盖率数据
   */
  getBaselineCoverage() {
    try {
      const coverageFile = path.join(this.config.baseDir, 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coverageFile)) {
        return JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to get baseline coverage:', error.message);
    }

    return null;
  }

  /**
   * 计算增量覆盖率范围
   */
  calculateIncrementalRanges(changedFiles) {
    const ranges = [];

    for (const file of changedFiles) {
      try {
        const relativePath = path.relative(this.config.baseDir, file);
        const sourceMapFile = this.findSourceMap(file);

        if (sourceMapFile && fs.existsSync(sourceMapFile)) {
          const sourceMap = JSON.parse(fs.readFileSync(sourceMapFile, 'utf8'));

          // 这里简化处理，实际应该解析sourceMap获取准确的行号范围
          ranges.push({
            file: relativePath,
            lines: { start: 1, end: 1000 }, // 简化处理
            functions: [], // 简化处理
            branches: [], // 简化处理
          });
        } else {
          ranges.push({
            file: relativePath,
            lines: { start: 1, end: 1000 }, // 简化处理
            functions: [], // 简化处理
            branches: [], // 简化处理
          });
        }
      } catch (error) {
        console.error(`Failed to calculate ranges for ${file}:`, error.message);
      }
    }

    return ranges;
  }

  /**
   * 查找source map文件
   */
  findSourceMap(sourceFile) {
    try {
      const content = fs.readFileSync(sourceFile, 'utf8');
      const sourceMapRegex = /\/\/# sourceMappingURL=(.+\.map)/;
      const match = sourceMapRegex.exec(content);

      if (match) {
        const sourceMapFileName = match[1];
        return path.join(path.dirname(sourceFile), sourceMapFileName);
      }
    } catch (error) {
      console.error(`Failed to find source map for ${sourceFile}:`, error.message);
    }

    return null;
  }

  /**
   * 分析受影响测试的覆盖率
   */
  async analyzeAffectedTestCoverage(affectedTests) {
    // 这里简化处理，实际应该运行受影响的测试并收集覆盖率
    return {
      type: affectedTests.type,
      count: affectedTests.count || 0,
      tests: affectedTests.tests || [],
      coverage: null, // 实际应该有覆盖率数据
    };
  }

  /**
   * 生成覆盖率摘要
   */
  generateCoverageSummary(baselineCoverage, affectedTestCoverage) {
    if (!baselineCoverage) {
      return {
        status: 'no-baseline',
        message: 'No baseline coverage data available',
      };
    }

    return {
      status: 'available',
      total: {
        lines: baselineCoverage.total.lines,
        functions: baselineCoverage.total.functions,
        branches: baselineCoverage.total.branches,
        statements: baselineCoverage.total.statements,
      },
      incremental: {
        // 这里应该有实际的增量覆盖率数据
        lines: { pct: 0, covered: 0, total: 0 },
        functions: { pct: 0, covered: 0, total: 0 },
        branches: { pct: 0, covered: 0, total: 0 },
        statements: { pct: 0, covered: 0, total: 0 },
      },
    };
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    const command = args[0];
    const options = {};

    if (command === 'analyze') {
      // 解析选项
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--base-dir=')) {
          options.baseDir = arg.split('=')[1];
        } else if (arg.startsWith('--cache-dir=')) {
          options.cacheDir = arg.split('=')[1];
        } else if (arg.startsWith('--files=')) {
          options.files = arg.split('=')[1].split(',');
        }
      }

      // 创建增量分析器
      const analyzer = new IncrementalAnalyzer(options);

      // 执行分析
      const result = await analyzer.analyzeChanges(options.files);

      console.log('增量分析结果:');
      console.log(`  变更文件数: ${result.changedFiles.length}`);
      console.log(`  受影响测试: ${result.affectedTests.type}`);

      if (result.affectedTests.type === 'specific') {
        console.log(`  测试文件数: ${result.affectedTests.count}`);
      }

      if (result.incrementalCoverage.summary) {
        const summary = result.incrementalCoverage.summary;
        console.log(`  覆盖率状态: ${summary.status}`);

        if (summary.status === 'available') {
          console.log(`  总体覆盖率: ${summary.total.lines.pct}%`);
        }
      }
    } else {
      console.log('用法:');
      console.log('  node incremental-analyzer.js analyze [选项]');
      console.log('');
      console.log('选项:');
      console.log('  --base-dir=<目录>  设置基础目录');
      console.log('  --cache-dir=<目录>  设置缓存目录');
      console.log('  --files=<文件列表>  指定变更文件列表（逗号分隔）');
    }
  } catch (error) {
    console.error('增量分析失败:', error.message);
    process.exit(1);
  }
}

// 导出类供测试使用
module.exports = IncrementalAnalyzer;

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
