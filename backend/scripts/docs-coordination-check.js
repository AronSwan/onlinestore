#!/usr/bin/env node

/**
 * 文档协调性检查脚本
 * 用于检查文档系统中的协调性问题，包括：
 * - 链接有效性检查
 * - 内容重复性检查
 * - 目录结构一致性检查
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DocumentationCoordinationChecker {
  constructor(docsPath = './docs') {
    this.docsPath = path.resolve(docsPath);
    this.issues = [];
    this.linkMap = new Map();
    this.contentHashes = new Map();
  }

  /**
   * 运行完整的协调性检查
   */
  async runFullCheck() {
    console.log('🔍 开始文档协调性检查...');
    
    await this.checkDirectoryStructure();
    await this.checkLinkValidity();
    await this.checkContentDuplication();
    await this.checkNavigationConsistency();
    await this.checkCrossReferences();
    
    this.generateReport();
    return this.issues;
  }

  /**
   * 检查目录结构一致性
   */
  async checkDirectoryStructure() {
    console.log('📁 检查目录结构...');
    
    const expectedDirs = [
      'getting-started',
      'architecture', 
      'modules',
      'api',
      'deployment',
      'security'
    ];

    const actualDirs = fs.readdirSync(this.docsPath)
      .filter(item => fs.statSync(path.join(this.docsPath, item)).isDirectory());

    expectedDirs.forEach(expectedDir => {
      if (!actualDirs.includes(expectedDir)) {
        this.issues.push({
          type: 'directory_missing',
          severity: 'high',
          description: `预期目录不存在: ${expectedDir}`,
          file: 'index.md',
          suggestion: `创建 ${expectedDir} 目录或更新导航链接`
        });
      }
    });
  }

  /**
   * 检查链接有效性
   */
  async checkLinkValidity() {
    console.log('🔗 检查链接有效性...');
    
    const markdownFiles = this.findMarkdownFiles();
    
    for (const file of markdownFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const links = this.extractLinks(content);
      
      links.forEach(link => {
        const linkPath = this.resolveLinkPath(file, link.url);
        if (!this.isLinkValid(linkPath)) {
          this.issues.push({
            type: 'broken_link',
            severity: link.type === 'navigation' ? 'high' : 'medium',
            description: `失效链接: ${link.url}`,
            file: path.relative(this.docsPath, file),
            suggestion: `修复链接指向或创建目标文件`
          });
        }
        
        // 记录链接关系
        this.linkMap.set(link.url, {
          source: path.relative(this.docsPath, file),
          target: linkPath,
          valid: this.isLinkValid(linkPath)
        });
      });
    }
  }

  /**
   * 检查内容重复性
   */
  async checkContentDuplication() {
    console.log('📝 检查内容重复性...');
    
    const markdownFiles = this.findMarkdownFiles();
    const contentBlocks = new Map();
    
    for (const file of markdownFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const blocks = this.extractContentBlocks(content);
      
      blocks.forEach((block, index) => {
        const hash = this.hashContent(block.content);
        if (contentBlocks.has(hash)) {
          const existing = contentBlocks.get(hash);
          this.issues.push({
            type: 'content_duplication',
            severity: 'medium',
            description: `内容重复: ${block.title || '未命名区块'}`,
            file: path.relative(this.docsPath, file),
            relatedFile: existing.file,
            suggestion: `考虑合并或引用现有内容`
          });
        } else {
          contentBlocks.set(hash, {
            file: path.relative(this.docsPath, file),
            content: block.content,
            title: block.title
          });
        }
      });
    }
  }

  /**
   * 检查导航一致性
   */
  async checkNavigationConsistency() {
    console.log('🧭 检查导航一致性...');
    
    const indexFile = path.join(this.docsPath, 'index.md');
    if (fs.existsSync(indexFile)) {
      const content = fs.readFileSync(indexFile, 'utf8');
      const navLinks = this.extractNavigationLinks(content);
      
      navLinks.forEach(navLink => {
        const targetPath = this.resolveLinkPath(indexFile, navLink.url);
        if (!fs.existsSync(targetPath)) {
          this.issues.push({
            type: 'navigation_inconsistency',
            severity: 'high',
            description: `导航链接目标不存在: ${navLink.text}`,
            file: 'index.md',
            suggestion: `更新导航链接或创建目标文件`
          });
        }
      });
    }
  }

  /**
   * 检查交叉引用
   */
  async checkCrossReferences() {
    console.log('🔄 检查交叉引用...');
    
    const markdownFiles = this.findMarkdownFiles();
    const referencePattern = /\[.*?\]\(.*?\)/g;
    
    for (const file of markdownFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const references = content.match(referencePattern) || [];
      
      references.forEach(ref => {
        const match = ref.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          const [_, text, url] = match;
          if (url.startsWith('http')) return; // 跳过外部链接
          
          const targetPath = this.resolveLinkPath(file, url);
          if (!fs.existsSync(targetPath)) {
            this.issues.push({
              type: 'cross_reference_error',
              severity: 'medium',
              description: `交叉引用失效: ${text} -> ${url}`,
              file: path.relative(this.docsPath, file),
              suggestion: `修复引用链接`
            });
          }
        }
      });
    }
  }

  /**
   * 生成检查报告
   */
  generateReport() {
    console.log('\n📊 文档协调性检查报告');
    console.log('='.repeat(50));
    
    const issueCounts = {
      high: this.issues.filter(i => i.severity === 'high').length,
      medium: this.issues.filter(i => i.severity === 'medium').length,
      low: this.issues.filter(i => i.severity === 'low').length
    };
    
    console.log(`问题统计: 高优先级 ${issueCounts.high} 个, 中优先级 ${issueCounts.medium} 个, 低优先级 ${issueCounts.low} 个`);
    
    // 按优先级分组显示问题
    ['high', 'medium', 'low'].forEach(severity => {
      const severityIssues = this.issues.filter(i => i.severity === severity);
      if (severityIssues.length > 0) {
        console.log(`\n${severity.toUpperCase()} 优先级问题:`);
        severityIssues.forEach(issue => {
          console.log(`  • ${issue.description} (${issue.file})`);
          if (issue.suggestion) {
            console.log(`    建议: ${issue.suggestion}`);
          }
        });
      }
    });
    
    // 生成修复建议
    this.generateFixSuggestions();
  }

  /**
   * 生成修复建议
   */
  generateFixSuggestions() {
    console.log('\n💡 修复建议:');
    
    const suggestions = [];
    
    // 目录结构修复建议
    const missingDirs = this.issues.filter(i => i.type === 'directory_missing');
    if (missingDirs.length > 0) {
      suggestions.push('创建缺失的目录结构或更新导航链接');
    }
    
    // 链接修复建议
    const brokenLinks = this.issues.filter(i => i.type === 'broken_link');
    if (brokenLinks.length > 0) {
      suggestions.push('运行链接修复脚本或手动修复失效链接');
    }
    
    // 内容重复修复建议
    const duplicates = this.issues.filter(i => i.type === 'content_duplication');
    if (duplicates.length > 0) {
      suggestions.push('合并重复内容或建立内容引用机制');
    }
    
    suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
  }

  // 辅助方法
  findMarkdownFiles(dir = this.docsPath) {
    let files = [];
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files = files.concat(this.findMarkdownFiles(fullPath));
      } else if (item.endsWith('.md')) {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  extractLinks(content) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        type: match[1].toLowerCase().includes('导航') ? 'navigation' : 'content'
      });
    }
    
    return links;
  }

  extractNavigationLinks(content) {
    const lines = content.split('\n');
    const navLinks = [];
    
    lines.forEach(line => {
      if (line.includes('- [') && line.includes('](')) {
        const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          navLinks.push({
            text: match[1],
            url: match[2]
          });
        }
      }
    });
    
    return navLinks;
  }

  extractContentBlocks(content) {
    const blocks = [];
    const lines = content.split('\n');
    let currentBlock = { content: '', title: '' };
    
    lines.forEach(line => {
      if (line.startsWith('# ')) {
        if (currentBlock.content) {
          blocks.push({ ...currentBlock });
        }
        currentBlock = { content: line + '\n', title: line.replace('# ', '') };
      } else if (line.startsWith('## ')) {
        if (currentBlock.content) {
          blocks.push({ ...currentBlock });
        }
        currentBlock = { content: line + '\n', title: line.replace('## ', '') };
      } else {
        currentBlock.content += line + '\n';
      }
    });
    
    if (currentBlock.content) {
      blocks.push(currentBlock);
    }
    
    return blocks;
  }

  resolveLinkPath(sourceFile, linkUrl) {
    if (linkUrl.startsWith('http')) {
      return linkUrl; // 外部链接
    }
    
    const sourceDir = path.dirname(sourceFile);
    
    if (linkUrl.startsWith('./')) {
      return path.resolve(sourceDir, linkUrl.substring(2));
    } else if (linkUrl.startsWith('../')) {
      return path.resolve(sourceDir, linkUrl);
    } else if (linkUrl.startsWith('/')) {
      return path.resolve(this.docsPath, linkUrl.substring(1));
    } else {
      return path.resolve(sourceDir, linkUrl);
    }
  }

  isLinkValid(linkPath) {
    if (linkPath.startsWith('http')) {
      return true; // 暂时跳过外部链接检查
    }
    
    try {
      return fs.existsSync(linkPath);
    } catch (error) {
      return false;
    }
  }

  hashContent(content) {
    // 简单的哈希函数，用于内容比较
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
}

// 命令行接口
if (require.main === module) {
  const checker = new DocumentationCoordinationChecker();
  checker.runFullCheck().then(issues => {
    if (issues.length > 0) {
      process.exit(1); // 存在问题，退出码为1
    } else {
      console.log('✅ 文档协调性检查通过！');
      process.exit(0); // 无问题，退出码为0
    }
  }).catch(error => {
    console.error('❌ 检查过程中发生错误:', error);
    process.exit(2); // 检查错误，退出码为2
  });
}

module.exports = DocumentationCoordinationChecker;