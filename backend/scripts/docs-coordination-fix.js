#!/usr/bin/env node

/**
 * 文档协调性修复脚本
 * 自动修复文档系统中的协调性问题
 */

const fs = require('fs');
const path = require('path');

class DocumentationCoordinationFixer {
  constructor(docsPath = './docs') {
    this.docsPath = path.resolve(docsPath);
    this.fixesApplied = [];
  }

  /**
   * 运行完整的协调性修复
   */
  async runFullFix() {
    console.log('🔧 开始文档协调性修复...');
    
    await this.fixDirectoryStructure();
    await this.fixBrokenLinks();
    await this.fixNavigationConsistency();
    await this.fixContentReferences();
    
    this.generateFixReport();
    return this.fixesApplied;
  }

  /**
   * 修复目录结构
   */
  async fixDirectoryStructure() {
    console.log('📁 修复目录结构...');
    
    const requiredDirs = [
      'getting-started',
      'architecture',
      'modules',
      'api',
      'deployment',
      'security',
      'templates',
      'quality',
      'automation'
    ];

    requiredDirs.forEach(dir => {
      const dirPath = path.join(this.docsPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.fixesApplied.push({
          type: 'directory_created',
          description: `创建目录: ${dir}`,
          path: dir
        });
        
        // 创建目录说明文件
        const readmePath = path.join(dirPath, 'README.md');
        fs.writeFileSync(readmePath, `# ${dir.toUpperCase()} 目录\n\n此目录包含 ${dir} 相关文档。\n`);
      }
    });
  }

  /**
   * 修复失效链接
   */
  async fixBrokenLinks() {
    console.log('🔗 修复失效链接...');
    
    const markdownFiles = this.findMarkdownFiles();
    const linkMapping = this.buildLinkMapping();
    
    for (const file of markdownFiles) {
      let content = fs.readFileSync(file, 'utf8');
      const originalContent = content;
      
      // 修复内部链接
      content = this.fixInternalLinks(content, file, linkMapping);
      
      // 修复相对路径链接
      content = this.fixRelativeLinks(content, file);
      
      if (content !== originalContent) {
        fs.writeFileSync(file, content);
        this.fixesApplied.push({
          type: 'links_fixed',
          description: `修复文件中的链接`,
          file: path.relative(this.docsPath, file)
        });
      }
    }
  }

  /**
   * 修复导航一致性
   */
  async fixNavigationConsistency() {
    console.log('🧭 修复导航一致性...');
    
    const indexFile = path.join(this.docsPath, 'index.md');
    if (fs.existsSync(indexFile)) {
      let content = fs.readFileSync(indexFile, 'utf8');
      const originalContent = content;
      
      // 修复导航链接
      content = this.fixNavigationLinks(content);
      
      if (content !== originalContent) {
        fs.writeFileSync(indexFile, content);
        this.fixesApplied.push({
          type: 'navigation_fixed',
          description: '修复导航链接一致性',
          file: 'index.md'
        });
      }
    }
  }

  /**
   * 修复内容引用
   */
  async fixContentReferences() {
    console.log('🔄 修复内容引用...');
    
    const markdownFiles = this.findMarkdownFiles();
    const contentMap = this.buildContentMap();
    
    for (const file of markdownFiles) {
      let content = fs.readFileSync(file, 'utf8');
      const originalContent = content;
      
      // 修复重复内容引用
      content = this.fixDuplicateReferences(content, file, contentMap);
      
      if (content !== originalContent) {
        fs.writeFileSync(file, content);
        this.fixesApplied.push({
          type: 'references_fixed',
          description: '修复内容引用',
          file: path.relative(this.docsPath, file)
        });
      }
    }
  }

  /**
   * 构建链接映射表
   */
  buildLinkMapping() {
    const mapping = new Map();
    const markdownFiles = this.findMarkdownFiles();
    
    markdownFiles.forEach(file => {
      const relativePath = path.relative(this.docsPath, file);
      const fileName = path.basename(file, '.md');
      
      // 添加文件名映射
      mapping.set(fileName.toLowerCase(), relativePath);
      mapping.set(relativePath.toLowerCase(), relativePath);
      
      // 添加标题映射（从文件内容提取）
      try {
        const content = fs.readFileSync(file, 'utf8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          const title = titleMatch[1].toLowerCase();
          mapping.set(title, `./${relativePath}`);
        }
      } catch (error) {
        // 忽略读取错误
      }
    });
    
    return mapping;
  }

  /**
   * 构建内容映射表
   */
  buildContentMap() {
    const contentMap = new Map();
    const markdownFiles = this.findMarkdownFiles();
    
    markdownFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const blocks = this.extractContentBlocks(content);
        
        blocks.forEach(block => {
          if (block.title) {
            const key = block.title.toLowerCase().trim();
            contentMap.set(key, {
              file: path.relative(this.docsPath, file),
              content: block.content
            });
          }
        });
      } catch (error) {
        // 忽略读取错误
      }
    });
    
    return contentMap;
  }

  /**
   * 修复内部链接
   */
  fixInternalLinks(content, sourceFile, linkMapping) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    return content.replace(linkRegex, (match, text, url) => {
      // 跳过外部链接和锚点链接
      if (url.startsWith('http') || url.startsWith('#') || url.startsWith('mailto:')) {
        return match;
      }
      
      // 检查链接是否有效
      const resolvedPath = this.resolveLinkPath(sourceFile, url);
      if (fs.existsSync(resolvedPath)) {
        return match; // 链接有效，无需修复
      }
      
      // 尝试修复链接
      const fixedUrl = this.findBestMatch(url, linkMapping);
      if (fixedUrl) {
        this.fixesApplied.push({
          type: 'link_repaired',
          description: `修复链接: ${url} -> ${fixedUrl}`,
          file: path.relative(this.docsPath, sourceFile)
        });
        return `[${text}](${fixedUrl})`;
      }
      
      return match; // 无法修复，保持原样
    });
  }

  /**
   * 修复相对路径链接
   */
  fixRelativeLinks(content, sourceFile) {
    const relativeRegex = /\]\(\.\.\/([^)]+)\)/g;
    const sourceDir = path.dirname(sourceFile);
    
    return content.replace(relativeRegex, (match, url) => {
      const resolvedPath = path.resolve(sourceDir, '../', url);
      if (!fs.existsSync(resolvedPath)) {
        // 尝试使用相对路径修复
        const relativePath = path.relative(sourceDir, path.join(this.docsPath, url));
        if (fs.existsSync(path.join(sourceDir, relativePath))) {
          return `](${relativePath})`;
        }
      }
      return match;
    });
  }

  /**
   * 修复导航链接
   */
  fixNavigationLinks(content) {
    const lines = content.split('\n');
    const fixedLines = [];
    
    lines.forEach(line => {
      if (line.includes('- [') && line.includes('](')) {
        const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          const [fullMatch, text, url] = match;
          
          // 检查链接是否指向现有文件
          if (!url.startsWith('http') && !url.startsWith('#') && !url.startsWith('mailto:')) {
            const targetPath = path.join(this.docsPath, url.replace('./', ''));
            if (!fs.existsSync(targetPath)) {
              // 尝试找到合适的替代文件
              const alternative = this.findAlternativeFile(text);
              if (alternative) {
                const fixedLine = line.replace(url, alternative);
                fixedLines.push(fixedLine);
                this.fixesApplied.push({
                  type: 'navigation_link_fixed',
                  description: `修复导航链接: ${text}`,
                  oldUrl: url,
                  newUrl: alternative
                });
                return;
              }
            }
          }
        }
      }
      fixedLines.push(line);
    });
    
    return fixedLines.join('\n');
  }

  /**
   * 修复重复内容引用
   */
  fixDuplicateReferences(content, sourceFile, contentMap) {
    // 简单的重复内容检测和修复
    // 在实际应用中，这需要更复杂的算法
    
    const lines = content.split('\n');
    const fixedLines = [];
    const seenContent = new Set();
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('>')) {
        const contentHash = this.hashContent(trimmedLine);
        if (seenContent.has(contentHash)) {
          // 发现重复内容，可以添加引用或删除
          this.fixesApplied.push({
            type: 'duplicate_content_found',
            description: '发现重复内容',
            file: path.relative(this.docsPath, sourceFile),
            content: trimmedLine.substring(0, 50) + '...'
          });
        } else {
          seenContent.add(contentHash);
        }
      }
      fixedLines.push(line);
    });
    
    return fixedLines.join('\n');
  }

  /**
   * 查找最佳匹配文件
   */
  findBestMatch(url, linkMapping) {
    const urlKey = url.toLowerCase().replace('./', '').replace('.md', '');
    
    // 精确匹配
    if (linkMapping.has(urlKey)) {
      return `./${linkMapping.get(urlKey)}`;
    }
    
    // 模糊匹配（基于文件名）
    for (const [key, value] of linkMapping.entries()) {
      if (key.includes(urlKey) || urlKey.includes(key)) {
        return `./${value}`;
      }
    }
    
    return null;
  }

  /**
   * 查找替代文件
   */
  findAlternativeFile(text) {
    const markdownFiles = this.findMarkdownFiles();
    const searchText = text.toLowerCase();
    
    for (const file of markdownFiles) {
      const fileName = path.basename(file, '.md').toLowerCase();
      const relativePath = path.relative(this.docsPath, file);
      
      if (fileName.includes(searchText) || searchText.includes(fileName)) {
        return `./${relativePath}`;
      }
      
      // 检查文件内容中的标题
      try {
        const content = fs.readFileSync(file, 'utf8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch && titleMatch[1].toLowerCase().includes(searchText)) {
          return `./${relativePath}`;
        }
      } catch (error) {
        // 忽略读取错误
      }
    }
    
    return null;
  }

  /**
   * 生成修复报告
   */
  generateFixReport() {
    console.log('\n📋 文档协调性修复报告');
    console.log('='.repeat(50));
    
    const fixTypes = {};
    this.fixesApplied.forEach(fix => {
      fixTypes[fix.type] = (fixTypes[fix.type] || 0) + 1;
    });
    
    console.log(`修复统计: 共应用 ${this.fixesApplied.length} 个修复`);
    Object.entries(fixTypes).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count} 个`);
    });
    
    console.log('\n🔧 应用的修复详情:');
    this.fixesApplied.forEach((fix, index) => {
      console.log(`  ${index + 1}. ${fix.description}`);
      if (fix.file) {
        console.log(`     文件: ${fix.file}`);
      }
    });
  }

  // 辅助方法（与检查脚本相同）
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

  resolveLinkPath(sourceFile, url) {
    if (url.startsWith('http')) {
      return url;
    }
    
    const sourceDir = path.dirname(sourceFile);
    
    if (url.startsWith('./')) {
      return path.resolve(sourceDir, url.substring(2));
    } else if (url.startsWith('../')) {
      return path.resolve(sourceDir, url);
    } else if (url.startsWith('/')) {
      return path.resolve(this.docsPath, url.substring(1));
    } else {
      return path.resolve(sourceDir, url);
    }
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

  hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

// 命令行接口
if (require.main === module) {
  const fixer = new DocumentationCoordinationFixer();
  fixer.runFullFix().then(fixes => {
    if (fixes.length > 0) {
      console.log('✅ 文档协调性修复完成！');
    } else {
      console.log('ℹ️ 未发现需要修复的问题。');
    }
  }).catch(error => {
    console.error('❌ 修复过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = DocumentationCoordinationFixer;