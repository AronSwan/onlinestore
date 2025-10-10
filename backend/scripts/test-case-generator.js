#!/usr/bin/env node

/**
 * 测试用例生成器
 * 自动生成各种边界条件和异常情况的测试用例
 */

const fs = require('fs');
const path = require('path');

class TestCaseGenerator {
  constructor() {
    this.testCases = [];
    this.generatedCount = 0;
  }
  
  // 生成参数验证测试用例
  generateParameterValidationCases() {
    const cases = [
      // 空值和无效值
      { name: '空参数', args: [] },
      { name: 'null参数', args: [null] },
      { name: 'undefined参数', args: [undefined] },
      { name: '空对象参数', args: [{}] },
      { name: '空字符串参数', args: [''] },
      
      // 边界值测试
      { name: '超长字符串', args: ['a'.repeat(10000)] },
      { name: '特殊字符', args: ['!@#$%^&*()'] },
      { name: 'Unicode字符', args: ['中文测试🎉'] },
      { name: 'SQL注入尝试', args: ["'; DROP TABLE users; --"] },
      { name: '路径遍历尝试', args: ['../../../etc/passwd'] },
      
      // 数值边界
      { name: '负数', args: [-1] },
      { name: '零值', args: [0] },
      { name: '极大值', args: [Number.MAX_SAFE_INTEGER] },
      { name: '极小值', args: [Number.MIN_SAFE_INTEGER] },
      { name: '浮点数', args: [3.14159] },
      { name: 'NaN', args: [NaN] },
      { name: 'Infinity', args: [Infinity] }
    ];
    
    return cases;
  }
  
  // 生成文件路径测试用例
  generateFilePathCases() {
    const cases = [
      // 有效路径
      { name: '相对路径', path: './test/file.js' },
      { name: '绝对路径', path: path.resolve(__dirname, 'test.js') },
      { name: '嵌套路径', path: './src/components/test/file.test.js' },
      
      // 无效路径
      { name: '不存在的路径', path: './nonexistent/file.js' },
      { name: '目录路径', path: './src' },
      { name: '符号链接', path: './link.js' },
      
      // 危险路径
      { name: '路径遍历', path: '../../../../etc/passwd' },
      { name: 'Windows路径', path: 'C:\\Windows\\System32' },
      { name: 'URL路径', path: 'http://example.com/test.js' },
      { name: '数据URI', path: 'data:text/javascript,console.log("test")' }
    ];
    
    return cases;
  }
  
  // 生成性能测试用例
  generatePerformanceCases() {
    const cases = [
      { name: '大量小文件', fileCount: 1000, fileSize: '1KB' },
      { name: '少量大文件', fileCount: 10, fileSize: '10MB' },
      { name: '混合文件大小', fileCount: 100, fileSize: 'mixed' },
      { name: '深度嵌套结构', depth: 10, filesPerLevel: 10 },
      { name: '并发极限测试', concurrency: 100 }
    ];
    
    return cases;
  }
  
  // 生成错误恢复测试用例
  generateErrorRecoveryCases() {
    const cases = [
      { name: '权限错误', errorType: 'EACCES' },
      { name: '文件不存在', errorType: 'ENOENT' },
      { name: '磁盘空间不足', errorType: 'ENOSPC' },
      { name: '内存不足', errorType: 'ENOMEM' },
      { name: '网络超时', errorType: 'ETIMEDOUT' },
      { name: '连接被拒绝', errorType: 'ECONNREFUSED' }
    ];
    
    return cases;
  }
  
  // 生成安全测试用例
  generateSecurityCases() {
    const cases = [
      // 注入攻击
      { name: '命令注入', input: 'test; rm -rf /' },
      { name: '代码注入', input: 'require("child_process").exec("rm -rf /")' },
      { name: '原型污染', input: JSON.stringify({ __proto__: { isAdmin: true } }) },
      
      // 缓冲区相关
      { name: '缓冲区溢出尝试', input: Buffer.alloc(1000000) },
      { name: '格式字符串攻击', input: '%s%s%s%s%s%s%s%s' },
      
      // 正则表达式攻击
      { name: 'ReDoS攻击', input: 'a'.repeat(1000) + '!' },
      { name: '复杂正则', input: '/^(a+)+$/' }
    ];
    
    return cases;
  }
  
  // 生成配置测试用例
  generateConfigurationCases() {
    const cases = [
      { name: '默认配置', config: {} },
      { name: '最小配置', config: { workers: 1, timeout: 1000 } },
      { name: '最大配置', config: { workers: 100, timeout: 300000 } },
      { name: '无效配置', config: { workers: -1, timeout: -100 } },
      { name: '混合配置', config: { workers: 'auto', timeout: '5000' } },
      { name: '环境变量配置', config: process.env }
    ];
    
    return cases;
  }
  
  // 生成所有测试用例
  generateAllTestCases() {
    const allCases = {
      parameterValidation: this.generateParameterValidationCases(),
      filePaths: this.generateFilePathCases(),
      performance: this.generatePerformanceCases(),
      errorRecovery: this.generateErrorRecoveryCases(),
      security: this.generateSecurityCases(),
      configuration: this.generateConfigurationCases()
    };
    
    this.testCases = allCases;
    this.generatedCount = Object.values(allCases).flat().length;
    
    return allCases;
  }
  
  // 保存测试用例到文件
  saveToFile(filePath = './generated-test-cases.json') {
    const testCases = this.generateAllTestCases();
    
    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalCases: this.generatedCount,
        generatorVersion: '1.0.0'
      },
      testCases: testCases
    };
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
      console.log(`✅ 已生成 ${this.generatedCount} 个测试用例到 ${filePath}`);
      return true;
    } catch (error) {
      console.error('❌ 保存测试用例失败:', error.message);
      return false;
    }
  }
  
  // 生成Jest测试文件
  generateJestTestFile(outputPath = './generated-tests.test.js') {
    const testCases = this.generateAllTestCases();
    
    let jestCode = `/**
 * 自动生成的健壮性测试用例
 * 生成时间: ${new Date().toISOString()}
 * 总测试用例数: ${this.generatedCount}
 */

describe('健壮性测试套件', () => {
`;
    
    // 参数验证测试
    jestCode += `  describe('参数验证测试', () => {
    const testRunner = require('./test-runner-secure.cjs');
    
`;
    
    testCases.parameterValidation.forEach((testCase, index) => {
      jestCode += `    test('${testCase.name}', () => {
      expect(() => {
        // 测试参数验证逻辑
        testRunner.validateOptions(${JSON.stringify(testCase.args)});
      }).not.toThrow();
    });
    
`;
    });
    
    jestCode += `  });

  // 文件路径测试
  describe('文件路径测试', () => {
`;
    
    testCases.filePaths.forEach((testCase, index) => {
      jestCode += `    test('${testCase.name}', () => {
      const result = testRunner.validatePathSafety('${testCase.path.replace(/'/g, "\\'")}');
      expect(result.isSafe).toBe(true);
    });
    
`;
    });
    
    jestCode += `  });

  // 安全测试
  describe('安全测试', () => {
`;
    
    testCases.security.forEach((testCase, index) => {
      jestCode += `    test('${testCase.name}', () => {
      const result = testRunner.validateInputSafety('${String(testCase.input).replace(/'/g, "\\'")}');
      expect(result.isSafe).toBe(true);
    });
    
`;
    });
    
    jestCode += `  });

});
`;
    
    try {
      fs.writeFileSync(outputPath, jestCode);
      console.log(`✅ 已生成Jest测试文件到 ${outputPath}`);
      return true;
    } catch (error) {
      console.error('❌ 生成Jest测试文件失败:', error.message);
      return false;
    }
  }
  
  // 统计信息
  getStatistics() {
    return {
      totalCases: this.generatedCount,
      categories: Object.keys(this.testCases).map(category => ({
        name: category,
        count: this.testCases[category].length
      }))
    };
  }
}

// 命令行使用
if (require.main === module) {
  const generator = new TestCaseGenerator();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'json';
  
  switch (command) {
    case 'json':
      generator.saveToFile('./test-cases.json');
      break;
    case 'jest':
      generator.generateJestTestFile('./generated-tests.test.js');
      break;
    case 'stats':
      generator.generateAllTestCases();
      const stats = generator.getStatistics();
      console.log('测试用例统计:');
      console.log(JSON.stringify(stats, null, 2));
      break;
    default:
      console.log('使用方法:');
      console.log('  node test-case-generator.js json    # 生成JSON格式测试用例');
      console.log('  node test-case-generator.js jest    # 生成Jest测试文件');
      console.log('  node test-case-generator.js stats   # 显示统计信息');
  }
}

module.exports = TestCaseGenerator;