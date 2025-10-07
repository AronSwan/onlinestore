import { watch } from 'chokidar';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface WatchConfig {
  patterns: string[];
  ignored: RegExp[];
  commands: string[];
  debounceMs: number;
}

class DocumentationWatcher {
  private watchers: Map<string, any> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private config: WatchConfig) {}

  async start() {
    console.log('🚀 启动文档监听服务...');
    
    // 监听源代码变化
    await this.watchSourceCode();
    // 监听配置文件变化
    await this.watchConfigFiles();
    // 监听测试文件变化
    await this.watchTestFiles();
    // 监听文档文件变化
    await this.watchDocumentationFiles();

    console.log('✅ 文档监听服务已启动');
  }

  private async watchSourceCode() {
    const watcher = watch('src/**/*.ts', {
      ignored: /node_modules/,
      persistent: true
    });

    watcher.on('change', async (filePath) => {
      console.log(`📝 源文件变更: ${filePath}`);
      await this.debounceRegenerate('source', async () => {
        await this.regenerateApiDocs();
        await this.regenerateCodeDocs();
      });
    });

    this.watchers.set('source', watcher);
  }

  private async watchConfigFiles() {
    const watcher = watch(['*.json', '*.yml', '*.yaml'], {
      ignored: /node_modules/,
      persistent: true
    });

    watcher.on('change', async (filePath) => {
      console.log(`⚙️ 配置文件变更: ${filePath}`);
      await this.debounceRegenerate('config', async () => {
        await this.regenerateConfigDocs();
      });
    });

    this.watchers.set('config', watcher);
  }

  private async watchTestFiles() {
    const watcher = watch(['src/**/*.spec.ts', 'test/**/*.ts'], {
      ignored: /node_modules/,
      persistent: true
    });

    watcher.on('change', async (filePath) => {
      console.log(`🧪 测试文件变更: ${filePath}`);
      await this.debounceRegenerate('test', async () => {
        await this.regenerateTestDocs();
      });
    });

    this.watchers.set('test', watcher);
  }

  private async watchDocumentationFiles() {
    const watcher = watch('docs/**/*.md', {
      ignored: /node_modules/,
      persistent: true
    });

    watcher.on('change', async (filePath) => {
      console.log(`📚 文档文件变更: ${filePath}`);
      await this.validateDocumentation();
    });

    this.watchers.set('docs', watcher);
  }

  private async debounceRegenerate(key: string, callback: () => Promise<void>) {
    // 清除之前的定时器
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    // 设置新的定时器
    const timer = setTimeout(async () => {
      try {
        await callback();
      } catch (error) {
        console.error(`❌ 文档重新生成失败 (${key}):`, error);
      } finally {
        this.debounceTimers.delete(key);
      }
    }, this.config.debounceMs);

    this.debounceTimers.set(key, timer);
  }

  private async regenerateApiDocs() {
    try {
      console.log('🔄 重新生成 API 文档...');
      await execAsync('npm run docs:api');
      console.log('✅ API 文档已更新');
      await this.notifyUpdate('API 文档');
    } catch (error) {
      console.error('❌ API 文档生成失败:', error);
    }
  }

  private async regenerateCodeDocs() {
    try {
      console.log('🔄 重新生成代码文档...');
      await execAsync('npm run docs:code');
      console.log('✅ 代码文档已更新');
      await this.notifyUpdate('代码文档');
    } catch (error) {
      console.error('❌ 代码文档生成失败:', error);
    }
  }

  private async regenerateConfigDocs() {
    try {
      console.log('🔄 重新生成配置文档...');
      // 这里可以添加配置文档生成逻辑
      console.log('✅ 配置文档已更新');
    } catch (error) {
      console.error('❌ 配置文档生成失败:', error);
    }
  }

  private async regenerateTestDocs() {
    try {
      console.log('🔄 重新生成测试文档...');
      await execAsync('npm run docs:coverage');
      console.log('✅ 测试文档已更新');
      await this.notifyUpdate('测试覆盖率报告');
    } catch (error) {
      console.error('❌ 测试文档生成失败:', error);
    }
  }

  private async validateDocumentation() {
    try {
      console.log('🔍 验证文档质量...');
      await execAsync('npm run docs:validate');
      console.log('✅ 文档验证通过');
    } catch (error) {
      console.error('❌ 文档验证失败:', error);
    }
  }

  private async notifyUpdate(docType: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${docType} 已自动更新\n`;
    
    try {
      await fs.appendFile('docs/generated/update-log.txt', logEntry);
    } catch (error) {
      console.error('❌ 无法写入更新日志:', error);
    }
  }

  async stop() {
    console.log('🛑 停止文档监听服务...');
    
    for (const [key, watcher] of this.watchers) {
      await watcher.close();
      console.log(`✅ 已停止监听: ${key}`);
    }
    
    // 清除所有待执行的定时器
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    
    this.watchers.clear();
    this.debounceTimers.clear();
    
    console.log('✅ 文档监听服务已停止');
  }
}

// 配置和启动监听服务
const watchConfig: WatchConfig = {
  patterns: [
    'src/**/*.ts',
    'test/**/*.ts',
    'docs/**/*.md',
    '*.json',
    '*.yml'
  ],
  ignored: [
    /node_modules/,
    /\.git/,
    /dist/,
    /coverage/
  ],
  commands: [
    'npm run docs:api',
    'npm run docs:code',
    'npm run docs:coverage'
  ],
  debounceMs: 2000 // 2秒防抖
};

const watcher = new DocumentationWatcher(watchConfig);

// 优雅关闭处理
process.on('SIGINT', async () => {
  console.log('\n🛑 接收到停止信号...');
  await watcher.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 接收到终止信号...');
  await watcher.stop();
  process.exit(0);
});

// 启动监听服务
watcher.start().catch((error) => {
  console.error('❌ 启动文档监听服务失败:', error);
  process.exit(1);
});

export { DocumentationWatcher, WatchConfig };