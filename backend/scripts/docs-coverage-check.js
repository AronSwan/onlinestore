const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

class DocumentationCoverageChecker {
  constructor() {
    this.srcDir = 'src';
    this.docsDir = 'docs';
    this.coverage = {
      modules: { total: 0, documented: 0, coverage: 0 },
      apis: { total: 0, documented: 0, coverage: 0 },
      functions: { total: 0, documented: 0, coverage: 0 },
    };
  }

  async checkCoverage() {
    console.log('🔍 开始检查文档覆盖率...');

    await this.checkModuleCoverage();
    await this.checkApiCoverage();
    await this.checkFunctionCoverage();

    await this.generateReport();

    return this.coverage;
  }

  async checkModuleCoverage() {
    try {
      // 获取所有模块目录
      const modulePattern = path.join(this.srcDir, '**/');
      const moduleDirs = glob
        .sync(modulePattern, { onlyDirectories: true })
        .filter(dir => !dir.includes('node_modules'))
        .filter(dir => !dir.includes('test'))
        .filter(dir => !dir.includes('spec'));

      this.coverage.modules.total = moduleDirs.length;

      // 检查每个模块是否有文档
      for (const moduleDir of moduleDirs) {
        const moduleName = path.basename(moduleDir);
        const docPath = path.join(this.docsDir, 'modules', moduleName, 'README.md');

        try {
          await fs.access(docPath);
          this.coverage.modules.documented++;
        } catch (error) {
          console.log(`⚠️  模块 ${moduleName} 缺少文档`);
        }
      }

      this.coverage.modules.coverage = Math.round(
        (this.coverage.modules.documented / this.coverage.modules.total) * 100,
      );
    } catch (error) {
      console.error('❌ 检查模块覆盖率失败:', error);
    }
  }

  async checkApiCoverage() {
    try {
      // 查找所有控制器文件
      const controllerPattern = path.join(this.srcDir, '**/*.controller.ts');
      const controllerFiles = glob.sync(controllerPattern);

      let totalApis = 0;
      let documentedApis = 0;

      for (const file of controllerFiles) {
        const content = await fs.readFile(file, 'utf8');

        // 统计 API 方法 (简单的正则匹配)
        const apiMethods = content.match(/@(Get|Post|Put|Delete|Patch)\(/g) || [];
        totalApis += apiMethods.length;

        // 统计有 @ApiOperation 注解的方法
        const documentedMethods = content.match(/@ApiOperation\(/g) || [];
        documentedApis += documentedMethods.length;
      }

      this.coverage.apis.total = totalApis;
      this.coverage.apis.documented = documentedApis;
      this.coverage.apis.coverage =
        totalApis > 0 ? Math.round((documentedApis / totalApis) * 100) : 100;
    } catch (error) {
      console.error('❌ 检查 API 覆盖率失败:', error);
    }
  }

  async checkFunctionCoverage() {
    try {
      // 查找所有 TypeScript 文件
      const tsPattern = path.join(this.srcDir, '**/*.ts');
      const tsFiles = glob.sync(tsPattern, {
        ignore: ['**/*.spec.ts', '**/*.test.ts'],
      });

      let totalFunctions = 0;
      let documentedFunctions = 0;

      for (const file of tsFiles) {
        const content = await fs.readFile(file, 'utf8');

        // 统计函数和方法 (简单的正则匹配)
        const functions =
          content.match(/(function\s+\w+|async\s+\w+\s*\(|\w+\s*\([^)]*\)\s*{)/g) || [];
        totalFunctions += functions.length;

        // 统计有 JSDoc 注释的函数
        const documentedFuncs =
          content.match(
            /\/\*\*[\s\S]*?\*\/\s*(function\s+\w+|async\s+\w+\s*\(|\w+\s*\([^)]*\)\s*{)/g,
          ) || [];
        documentedFunctions += documentedFuncs.length;
      }

      this.coverage.functions.total = totalFunctions;
      this.coverage.functions.documented = documentedFunctions;
      this.coverage.functions.coverage =
        totalFunctions > 0 ? Math.round((documentedFunctions / totalFunctions) * 100) : 100;
    } catch (error) {
      console.error('❌ 检查函数覆盖率失败:', error);
    }
  }

  async generateReport() {
    const report = `# 文档覆盖率报告

生成时间: ${new Date().toISOString()}

## 📊 总体覆盖率

| 类型 | 总数 | 已文档化 | 覆盖率 | 状态 |
|------|------|----------|--------|------|
| 模块 | ${this.coverage.modules.total} | ${this.coverage.modules.documented} | ${this.coverage.modules.coverage}% | ${this.getStatusEmoji(this.coverage.modules.coverage)} |
| API | ${this.coverage.apis.total} | ${this.coverage.apis.documented} | ${this.coverage.apis.coverage}% | ${this.getStatusEmoji(this.coverage.apis.coverage)} |
| 函数 | ${this.coverage.functions.total} | ${this.coverage.functions.documented} | ${this.coverage.functions.coverage}% | ${this.getStatusEmoji(this.coverage.functions.coverage)} |

## 🎯 目标与现状

- **目标覆盖率**: 95%
- **当前平均覆盖率**: ${this.getAverageCoverage()}%
- **达标状态**: ${this.getOverallStatus()}

## 📈 改进建议

${this.getImprovementSuggestions()}

---

*此报告由自动化脚本生成*
`;

    try {
      await fs.mkdir('docs/generated', { recursive: true });
      await fs.writeFile('docs/generated/coverage-report.md', report);
      console.log('✅ 文档覆盖率报告已生成: docs/generated/coverage-report.md');
    } catch (error) {
      console.error('❌ 生成报告失败:', error);
    }
  }

  getStatusEmoji(coverage) {
    if (coverage >= 90) return '🟢 优秀';
    if (coverage >= 70) return '🟡 良好';
    if (coverage >= 50) return '🟠 一般';
    return '🔴 需改进';
  }

  getAverageCoverage() {
    const total =
      this.coverage.modules.coverage +
      this.coverage.apis.coverage +
      this.coverage.functions.coverage;
    return Math.round(total / 3);
  }

  getOverallStatus() {
    const avg = this.getAverageCoverage();
    return avg >= 95 ? '✅ 已达标' : '⚠️ 未达标';
  }

  getImprovementSuggestions() {
    const suggestions = [];

    if (this.coverage.modules.coverage < 95) {
      suggestions.push('- 📦 为缺少文档的模块创建 README.md 文件');
    }

    if (this.coverage.apis.coverage < 95) {
      suggestions.push('- 🔌 为 API 方法添加 @ApiOperation 注解');
    }

    if (this.coverage.functions.coverage < 95) {
      suggestions.push('- 📝 为重要函数添加 JSDoc 注释');
    }

    if (suggestions.length === 0) {
      suggestions.push('- 🎉 文档覆盖率已达标，继续保持！');
    }

    return suggestions.join('\n');
  }
}

// 运行检查
async function main() {
  const checker = new DocumentationCoverageChecker();
  const coverage = await checker.checkCoverage();

  console.log('\n📊 文档覆盖率结果:');
  console.log(`模块覆盖率: ${coverage.modules.coverage}%`);
  console.log(`API 覆盖率: ${coverage.apis.coverage}%`);
  console.log(`函数覆盖率: ${coverage.functions.coverage}%`);
  console.log(`平均覆盖率: ${checker.getAverageCoverage()}%`);

  // 如果覆盖率低于阈值，退出码为 1
  const avgCoverage = checker.getAverageCoverage();
  if (avgCoverage < 80) {
    console.log('\n❌ 文档覆盖率低于 80%，请改进文档');
    process.exit(1);
  } else {
    console.log('\n✅ 文档覆盖率检查通过');
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DocumentationCoverageChecker;
