/**
 * ProjectScanner - 项目文件扫描专职类
 * 职责: 扫描项目文件结构，收集文件信息
 * 符合单一职责原则(SRP)
 * @ai-generated: 基于Claude 4 Sonnet重构生成，遵循SOLID原则
 */
class ProjectScanner {
  constructor() {
    this.supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'];
    this.excludePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.nyc_output',
      'test',
      'tests',
      '__tests__'
    ];
    this.maxFileSize = 1024 * 1024; // 1MB
  }

  /**
   * 扫描项目文件
   * @param {string} projectPath - 项目根路径
   * @param {Object} options - 扫描选项
   * @returns {Object} 文件结构信息
   */
  async scanProjectFiles(projectPath, options = {}) {
    try {
      const fileStructure = {
        projectPath: projectPath,
        files: [],
        directories: [],
        languages: new Map(),
        totalSize: 0,
        scanTime: new Date().toISOString()
      };

      await this.scanDirectory(projectPath, fileStructure, options);

      // 计算统计信息
      this.calculateStatistics(fileStructure);

      return fileStructure;
    } catch (error) {
      throw new Error(`项目扫描失败: ${error.message}`);
    }
  }

  /**
   * 递归扫描目录
   * @param {string} dirPath - 目录路径
   * @param {Object} fileStructure - 文件结构对象
   * @param {Object} options - 扫描选项
   */
  async scanDirectory(dirPath, fileStructure, options) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(fileStructure.projectPath, fullPath);

        // 检查是否应该排除
        if (this.shouldExclude(relativePath, options)) {
          continue;
        }

        if (entry.isDirectory()) {
          fileStructure.directories.push({
            name: entry.name,
            path: relativePath,
            fullPath: fullPath
          });

          // 递归扫描子目录
          await this.scanDirectory(fullPath, fileStructure, options);
        } else if (entry.isFile()) {
          const fileInfo = await this.analyzeFile(fullPath, relativePath);
          if (fileInfo) {
            fileStructure.files.push(fileInfo);
            fileStructure.totalSize += fileInfo.size;

            // 统计语言
            const count = fileStructure.languages.get(fileInfo.language) || 0;
            fileStructure.languages.set(fileInfo.language, count + 1);
          }
        }
      }
    } catch (error) {
      console.warn(`扫描目录失败 ${dirPath}: ${error.message}`);
    }
  }

  /**
   * 分析单个文件
   * @param {string} fullPath - 文件完整路径
   * @param {string} relativePath - 文件相对路径
   * @returns {Object|null} 文件信息
   */
  async analyzeFile(fullPath, relativePath) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const stats = await fs.stat(fullPath);

      // 检查文件大小
      if (stats.size > this.maxFileSize) {
        console.warn(`文件过大，跳过: ${relativePath} (${stats.size} bytes)`);
        return null;
      }

      const ext = path.extname(fullPath);
      const language = this.detectLanguage(ext);

      // 只处理支持的文件类型
      if (!language) {
        return null;
      }

      const content = await fs.readFile(fullPath, 'utf8');
      const lines = content.split('\n').length;

      return {
        name: path.basename(fullPath),
        path: relativePath,
        fullPath: fullPath,
        extension: ext,
        language: language,
        size: stats.size,
        lines: lines,
        modified: stats.mtime,
        created: stats.birthtime || stats.ctime,
        content: content
      };
    } catch (error) {
      console.warn(`分析文件失败 ${relativePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * 检查是否应该排除文件/目录
   * @param {string} relativePath - 相对路径
   * @param {Object} options - 选项
   * @returns {boolean} 是否排除
   */
  shouldExclude(relativePath, options) {
    const excludePatterns = options.excludePatterns || this.excludePatterns;

    return excludePatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return relativePath.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(relativePath);
      }
      return false;
    });
  }

  /**
   * 检测文件语言
   * @param {string} extension - 文件扩展名
   * @returns {string|null} 语言类型
   */
  detectLanguage(extension) {
    const languageMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.vue': 'Vue',
      '.svelte': 'Svelte',
      '.json': 'JSON',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.less': 'LESS',
      '.html': 'HTML',
      '.md': 'Markdown'
    };

    return languageMap[extension.toLowerCase()] || null;
  }

  /**
   * 计算统计信息
   * @param {Object} fileStructure - 文件结构对象
   */
  calculateStatistics(fileStructure) {
    // 计算平均文件大小
    fileStructure.averageFileSize = fileStructure.files.length > 0
      ? Math.round(fileStructure.totalSize / fileStructure.files.length)
      : 0;

    // 计算平均行数
    const totalLines = fileStructure.files.reduce((sum, file) => sum + file.lines, 0);
    fileStructure.averageLines = fileStructure.files.length > 0
      ? Math.round(totalLines / fileStructure.files.length)
      : 0;

    // 转换语言统计为对象
    fileStructure.languageStats = Object.fromEntries(fileStructure.languages);

    // 找出最大的文件
    fileStructure.largestFile = fileStructure.files.reduce((largest, file) => {
      return (!largest || file.size > largest.size) ? file : largest;
    }, null);

    // 找出行数最多的文件
    fileStructure.longestFile = fileStructure.files.reduce((longest, file) => {
      return (!longest || file.lines > longest.lines) ? file : longest;
    }, null);
  }

  /**
   * 获取项目概览
   * @param {Object} fileStructure - 文件结构对象
   * @returns {Object} 项目概览
   */
  getProjectOverview(fileStructure) {
    return {
      totalFiles: fileStructure.files.length,
      totalDirectories: fileStructure.directories.length,
      totalSize: fileStructure.totalSize,
      averageFileSize: fileStructure.averageFileSize,
      averageLines: fileStructure.averageLines,
      languages: fileStructure.languageStats,
      largestFile: fileStructure.largestFile ? {
        name: fileStructure.largestFile.name,
        size: fileStructure.largestFile.size,
        lines: fileStructure.largestFile.lines
      } : null,
      longestFile: fileStructure.longestFile ? {
        name: fileStructure.longestFile.name,
        lines: fileStructure.longestFile.lines,
        size: fileStructure.longestFile.size
      } : null
    };
  }
}

// 模块导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProjectScanner;
} else if (typeof window !== 'undefined') {
  window.ProjectScanner = ProjectScanner;
}
