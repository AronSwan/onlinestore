#!/usr/bin/env node

// 用途：合并CI/CD工件到统一报告目录
// 功能：将各个作业生成的工件合并到 reports/_artifacts 目录
// 作者：后端开发团队
// 时间：2025-10-12
// 版本：1.0.0

const fs = require('fs');
const path = require('path');

class ArtifactMerger {
  constructor() {
    this.reportsDir = path.resolve(__dirname, '..', 'reports');
    this.artifactsDir = path.join(this.reportsDir, '_artifacts');
    this.targetDir = path.join(this.reportsDir, 'merged');
    // 允许从外部下载目录导入（CI 中 actions/download-artifact 默认到 ./artifacts）
    this.externalArtifactsDir =
      process.env.ARTIFACTS_SOURCE || path.resolve(process.cwd(), 'artifacts');

    // 确保目录存在
    this.ensureDir(this.artifactsDir);
    this.ensureDir(this.targetDir);
  }

  ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 将 ./artifacts 下的各工件类型导入到 reports/_artifacts
  importExternalArtifacts() {
    try {
      if (!this.externalArtifactsDir || !fs.existsSync(this.externalArtifactsDir)) {
        return;
      }
      const entries = fs.readdirSync(this.externalArtifactsDir, { withFileTypes: true });
      if (!entries.length) return;

      for (const ent of entries) {
        // actions/download-artifact@v4 会按 artifact 名创建目录
        if (!ent.isDirectory()) continue;
        const src = path.join(this.externalArtifactsDir, ent.name);
        const dst = path.join(this.artifactsDir, ent.name);
        this.copyDir(src, dst);
      }
      console.log(`📦 已从外部目录导入工件: ${this.externalArtifactsDir}`);
    } catch (e) {
      console.warn('⚠️ 导入外部工件失败（继续使用 _artifacts）:', e.message);
    }
  }

  copyDir(srcDir, dstDir) {
    this.ensureDir(dstDir);
    const stack = [srcDir];
    while (stack.length) {
      const cur = stack.pop();
      const rel = path.relative(srcDir, cur);
      const target = path.join(dstDir, rel);
      this.ensureDir(target);
      const items = fs.readdirSync(cur, { withFileTypes: true });
      for (const it of items) {
        const s = path.join(cur, it.name);
        const d = path.join(target, it.name);
        if (it.isDirectory()) {
          stack.push(s);
        } else {
          try {
            this.ensureDir(path.dirname(d));
            fs.copyFileSync(s, d);
          } catch (err) {
            console.warn(`⚠️ 文件复制失败: ${s} -> ${d}: ${err.message}`);
          }
        }
      }
    }
  }

  mergeArtifacts() {
    console.log('🔄 开始合并CI/CD工件...');

    try {
      // 优先从外部 artifacts 目录导入（如有）
      this.importExternalArtifacts();

      // 如果artifacts目录不存在或为空，创建空索引
      if (!fs.existsSync(this.artifactsDir) || fs.readdirSync(this.artifactsDir).length === 0) {
        console.log('⚠️ 未找到工件目录，创建空索引文件');
        this.createEmptyIndex();
        return;
      }

      // 遍历artifacts目录下的所有子目录
      const artifactTypes = fs
        .readdirSync(this.artifactsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      console.log(`📁 发现 ${artifactTypes.length} 种工件类型: ${artifactTypes.join(', ')}`);

      // 为每种工件类型创建合并后的报告
      for (const artifactType of artifactTypes) {
        this.mergeArtifactType(artifactType);
      }

      // 生成清单与索引文件
      this.createManifest(artifactTypes);
      this.createIndex();

      console.log('✅ 工件合并完成');
      console.log(`📊 合并报告位于: ${this.targetDir}`);
      console.log(`📑 索引文件位于: ${path.join(this.targetDir, 'index.html')}`);
    } catch (error) {
      console.error('❌ 工件合并失败:', error.message);
      process.exit(1);
    }
  }

  mergeArtifactType(artifactType) {
    const sourceDir = path.join(this.artifactsDir, artifactType);
    const targetDir = path.join(this.targetDir, artifactType);

    this.ensureDir(targetDir);

    // 复制所有文件
    const files = this.getAllFiles(sourceDir);

    for (const file of files) {
      const relativePath = path.relative(sourceDir, file);
      const targetPath = path.join(targetDir, relativePath);

      // 确保目标目录存在
      this.ensureDir(path.dirname(targetPath));

      // 复制文件
      fs.copyFileSync(file, targetPath);
    }

    console.log(`📋 合并 ${artifactType} 工件: ${files.length} 个文件`);
  }

  getAllFiles(dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    function traverse(currentDir) {
      let items = [];
      try {
        items = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch (e) {
        console.warn(`⚠️ 无法读取目录: ${currentDir}: ${e.message}`);
        return;
      }
      for (const it of items) {
        const fullPath = path.join(currentDir, it.name);
        try {
          if (it.isDirectory()) {
            traverse(fullPath);
          } else {
            files.push(fullPath);
          }
        } catch (err) {
          console.warn(`⚠️ 访问失败: ${fullPath}: ${err.message}`);
        }
      }
    }
    traverse(dir);
    return files;
  }

  createEmptyIndex() {
    const indexPath = path.join(this.targetDir, 'index.html');
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Monitor 报告 - 无工件</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Test Monitor 报告</h1>
    <div class="warning">
        <h2>⚠️ 无可用工件</h2>
        <p>当前运行未生成任何工件。这可能是因为:</p>
        <ul>
            <li>这是首次运行</li>
            <li>所有测试都已跳过</li>
            <li>配置问题导致工件未生成</li>
        </ul>
    </div>
</body>
</html>
    `;

    fs.writeFileSync(indexPath, html);
    console.log('📑 创建空索引文件');
  }

  createIndex() {
    const indexPath = path.join(this.targetDir, 'index.html');
    const artifactTypes = fs.existsSync(this.targetDir)
      ? fs
          .readdirSync(this.targetDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name)
      : [];

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Monitor 报告</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .artifact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .artifact-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background-color: #f9f9f9; }
        .artifact-title { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
        .artifact-desc { margin-bottom: 15px; color: #666; }
        .artifact-link { display: inline-block; background-color: #007bff; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; }
        .timestamp { text-align: center; margin-top: 30px; color: #888; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Test Monitor 报告</h1>
        <p>构建时间: ${new Date().toISOString()}</p>
    </div>
    
    <div class="artifact-grid">
        ${artifactTypes.map(type => this.generateArtifactCard(type)).join('')}
    </div>
    
    <div class="timestamp">
        <p>报告自动生成 - Test Monitor v2.1.0</p>
    </div>
</body>
</html>
    `;

    fs.writeFileSync(indexPath, html);
    console.log('📑 创建索引文件');
  }

  createManifest(artifactTypes) {
    const manifest = {
      generatedAt: new Date().toISOString(),
      source: {
        external: this.externalArtifactsDir,
        internal: this.artifactsDir,
      },
      mergedDir: this.targetDir,
      artifacts: {},
    };
    for (const type of artifactTypes) {
      const dir = path.join(this.targetDir, type);
      const files = this.getAllFiles(dir);
      manifest.artifacts[type] = {
        count: files.length,
        sample: files.slice(0, 5).map(f => path.relative(this.targetDir, f)),
      };
    }
    const manifestPath = path.join(this.targetDir, 'manifest.json');
    try {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
      console.log('🗂️ 生成合并清单:', manifestPath);
    } catch (e) {
      console.warn('⚠️ 写入合并清单失败:', e.message);
    }
  }

  generateArtifactCard(type) {
    const descriptions = {
      'coverage-reports': '测试覆盖率报告，包含代码覆盖率详细数据',
      'e2e-reports': '端到端测试报告，验证完整用户流程',
      'final-reports': '最终综合报告，包含所有测试结果',
      'integration-reports': '集成测试报告，验证组件间交互',
      'performance-reports': '性能测试报告，包含基准测试和性能指标',
      'quality-reports': '代码质量报告，包含静态分析结果',
      'security-reports': '安全扫描报告，包含漏洞和风险评估',
    };

    const description = descriptions[type] || `${type} 相关报告`;

    return `
        <div class="artifact-card">
            <div class="artifact-title">📊 ${type}</div>
            <div class="artifact-desc">${description}</div>
            <a href="${type}/" class="artifact-link">查看详情</a>
        </div>
    `;
  }
}

// 执行合并
if (require.main === module) {
  const merger = new ArtifactMerger();
  merger.mergeArtifacts();
}

module.exports = ArtifactMerger;
