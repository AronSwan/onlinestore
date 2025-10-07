#!/usr/bin/env node

/**
 * 安全检查脚本测试
 * 用途: 测试安全检查脚本的功能
 * @author 安全团队
 * @version 1.0.0
 * @since 2025-10-03
 */

const fs = require('fs');
const path = require('path');

// 导入要测试的函数
const { 
  runSecurityChecks, 
  SECURITY_RULES, 
  SECURITY_CATEGORIES 
} = require('../backend/scripts/security-check.js');

// 模拟文件系统操作
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// 模拟子进程
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

describe('安全检查脚本测试', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 设置默认的文件系统模拟
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('');
    fs.writeFileSync.mockImplementation(() => {});
    
    // 控制台输出静默
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // 恢复控制台输出
    jest.restoreAllMocks();
  });

  describe('SECURITY_RULES', () => {
    test('应该包含所有必要的安全规则', () => {
      expect(SECURITY_RULES).toBeDefined();
      expect(typeof SECURITY_RULES).toBe('object');
      
      // 验证关键规则存在
      expect(SECURITY_RULES).toHaveProperty('jwt-expiration');
      expect(SECURITY_RULES).toHaveProperty('jwt-secret-strength');
      expect(SECURITY_RULES).toHaveProperty('input-validation');
      expect(SECURITY_RULES).toHaveProperty('sql-injection-protection');
      expect(SECURITY_RULES).toHaveProperty('xss-protection');
    });

    test('每个规则应该包含必要的属性', () => {
      Object.values(SECURITY_RULES).forEach(rule => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('title');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('severity');
        expect(rule).toHaveProperty('category');
        expect(rule).toHaveProperty('check');
      });
    });

    test('规则严重度应该是有效值', () => {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      
      Object.values(SECURITY_RULES).forEach(rule => {
        expect(validSeverities).toContain(rule.severity);
      });
    });

    test('规则分类应该是有效值', () => {
      Object.values(SECURITY_RULES).forEach(rule => {
        expect(SECURITY_CATEGORIES).toContain(rule.category);
      });
    });
  });

  describe('SECURITY_CATEGORIES', () => {
    test('应该包含所有安全类别', () => {
      expect(SECURITY_CATEGORIES).toBeDefined();
      expect(Array.isArray(SECURITY_CATEGORIES)).toBe(true);
      
      // 验证关键类别存在
      expect(SECURITY_CATEGORIES).toContain('auth');
      expect(SECURITY_CATEGORIES).toContain('input-validation');
      expect(SECURITY_CATEGORIES).toContain('database');
      expect(SECURITY_CATEGORIES).toContain('web-security');
      expect(SECURITY_CATEGORIES).toContain('supply-chain');
    });
  });

  describe('runSecurityChecks', () => {
    test('应该能够运行所有安全检查', async () => {
      const options = {};
      
      // 模拟所有检查通过
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ passed: true });
        }
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('应该能够按类别过滤检查', async () => {
      const options = { category: 'auth' };
      
      // 模拟认证相关检查
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ passed: true });
        }
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      
      // 验证只包含指定类别的规则
      result.results.forEach(result => {
        expect(result.category).toBe('auth');
      });
    });

    test('应该能够按规则ID过滤检查', async () => {
      const options = { rule: 'jwt-expiration' };
      
      // 模拟特定规则检查
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ passed: true });
        }
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(result.results[0].ruleId).toBe('jwt-expiration');
    });

    test('应该正确处理检查失败的情况', async () => {
      const options = {};
      
      // 模拟部分检查失败
      Object.values(SECURITY_RULES).forEach((rule, index) => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ 
            passed: index % 2 === 0 ? false : true,
            message: index % 2 === 0 ? '检查失败' : '检查通过'
          });
        }
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.failed).toBeGreaterThan(0);
      expect(result.summary.passed).toBeGreaterThan(0);
    });

    test('应该正确处理检查异常', async () => {
      const options = {};
      
      // 模拟检查抛出异常
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockImplementation(() => {
            throw new Error('模拟检查异常');
          });
        }
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.errors).toBeGreaterThan(0);
    });

    test('应该支持不同的输出格式', async () => {
      const options = { format: 'json' };
      
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ passed: true });
        }
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('应该支持输出到文件', async () => {
      const options = { output: 'test-output.json' };
      
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ passed: true });
        }
      });
      
      await runSecurityChecks(options);
      
      // 验证文件写入被调用
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('应该支持CI模式', async () => {
      const options = { ci: true };
      
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ passed: true });
        }
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      // CI模式应该有特定的行为
      expect(result.summary).toBeDefined();
    });

    test('应该支持失败阈值设置', async () => {
      const options = { failOn: 'high' };
      
      // 模拟高级别检查失败
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ 
            passed: rule.severity === 'high' ? false : true,
            severity: rule.severity
          });
        }
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('具体规则检查', () => {
    describe('JWT相关规则', () => {
      test('jwt-expiration规则应该检查JWT过期时间', async () => {
        const rule = SECURITY_RULES['jwt-expiration'];
        expect(rule).toBeDefined();
        expect(rule.category).toBe('auth');
        
        if (typeof rule.check === 'function') {
          const result = rule.check();
          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('message');
        }
      });

      test('jwt-secret-strength规则应该检查JWT密钥强度', async () => {
        const rule = SECURITY_RULES['jwt-secret-strength'];
        expect(rule).toBeDefined();
        expect(rule.category).toBe('auth');
        
        if (typeof rule.check === 'function') {
          const result = rule.check();
          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('message');
        }
      });
    });

    describe('输入验证规则', () => {
      test('input-validation规则应该检查输入验证', async () => {
        const rule = SECURITY_RULES['input-validation'];
        expect(rule).toBeDefined();
        expect(rule.category).toBe('input-validation');
        
        if (typeof rule.check === 'function') {
          const result = rule.check();
          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('message');
        }
      });

      test('sql-injection-protection规则应该检查SQL注入防护', async () => {
        const rule = SECURITY_RULES['sql-injection-protection'];
        expect(rule).toBeDefined();
        expect(rule.category).toBe('input-validation');
        
        if (typeof rule.check === 'function') {
          const result = rule.check();
          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('message');
        }
      });

      test('xss-protection规则应该检查XSS防护', async () => {
        const rule = SECURITY_RULES['xss-protection'];
        expect(rule).toBeDefined();
        expect(rule.category).toBe('input-validation');
        
        if (typeof rule.check === 'function') {
          const result = rule.check();
          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('message');
        }
      });
    });

    describe('数据库安全规则', () => {
      test('transaction-usage规则应该检查事务使用', async () => {
        const rule = SECURITY_RULES['transaction-usage'];
        expect(rule).toBeDefined();
        expect(rule.category).toBe('database');
        
        if (typeof rule.check === 'function') {
          const result = rule.check();
          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('message');
        }
      });
    });

    describe('Web安全规则', () => {
      test('security-headers规则应该检查安全响应头', async () => {
        const rule = SECURITY_RULES['security-headers'];
        expect(rule).toBeDefined();
        expect(rule.category).toBe('web-security');
        
        if (typeof rule.check === 'function') {
          const result = rule.check();
          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('message');
        }
      });

      test('cors-config规则应该检查CORS配置', async () => {
        const rule = SECURITY_RULES['cors-config'];
        expect(rule).toBeDefined();
        expect(rule.category).toBe('web-security');
        
        if (typeof rule.check === 'function') {
          const result = rule.check();
          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('message');
        }
      });
    });

    describe('供应链安全规则', () => {
      test('dependency-vulnerability规则应该检查依赖项漏洞', async () => {
        const rule = SECURITY_RULES['dependency-vulnerability'];
        expect(rule).toBeDefined();
        expect(rule.category).toBe('supply-chain');
        
        if (typeof rule.check === 'function') {
          const result = rule.check();
          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('message');
        }
      });
    });
  });

  describe('性能测试', () => {
    test('应该在合理时间内完成所有检查', async () => {
      const options = {};
      
      // 模拟所有检查通过
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ passed: true });
        }
      });
      
      const startTime = Date.now();
      const result = await runSecurityChecks(options);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      // 性能断言：所有检查应该在10秒内完成
      expect(endTime - startTime).toBeLessThan(10000);
    });

    test('应该能够处理大量规则', async () => {
      // 创建大量模拟规则
      const largeRuleSet = {};
      for (let i = 0; i < 100; i++) {
        largeRuleSet[`test-rule-${i}`] = {
          id: `test-rule-${i}`,
          title: `测试规则 ${i}`,
          description: `测试规则描述 ${i}`,
          severity: 'medium',
          category: 'test',
          check: jest.fn().mockReturnValue({ passed: true })
        };
      }
      
      // 临时替换SECURITY_RULES
      const originalRules = SECURITY_RULES;
      Object.assign(SECURITY_RULES, largeRuleSet);
      
      const startTime = Date.now();
      const result = await runSecurityChecks({});
      const endTime = Date.now();
      
      // 恢复原始规则
      Object.keys(SECURITY_RULES).forEach(key => {
        if (!originalRules[key]) {
          delete SECURITY_RULES[key];
        }
      });
      
      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(100);
      // 性能断言：处理大量规则应该在合理时间内完成
      expect(endTime - startTime).toBeLessThan(15000);
    });
  });

  describe('错误处理测试', () => {
    test('应该处理文件系统错误', async () => {
      const options = {};
      
      // 模拟文件系统错误
      fs.existsSync.mockImplementation(() => {
        throw new Error('文件系统错误');
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.errors).toBeGreaterThan(0);
    });

    test('应该处理无效配置', async () => {
      const options = { invalidOption: 'invalid' };
      
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ passed: true });
        }
      });
      
      // 应该能够处理无效配置而不崩溃
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
    });

    test('应该处理规则检查中的异常', async () => {
      const options = {};
      
      // 模拟规则检查抛出异常
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockImplementation(() => {
            throw new Error('规则检查异常');
          });
        }
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      expect(result.summary.errors).toBeGreaterThan(0);
    });
  });

  describe('集成测试', () => {
    test('应该能够生成完整的报告', async () => {
      const options = { 
        format: 'json',
        output: 'test-security-report.json'
      };
      
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ 
            passed: Math.random() > 0.5,
            message: '测试消息',
            details: { test: 'data' }
          });
        }
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.results).toBeDefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('应该支持SARIF格式输出', async () => {
      const options = { 
        format: 'sarif',
        output: 'test-security-report.sarif'
      };
      
      Object.values(SECURITY_RULES).forEach(rule => {
        if (typeof rule.check === 'function') {
          jest.spyOn(rule, 'check').mockReturnValue({ 
            passed: false,
            message: '测试失败',
            severity: 'high'
          });
        }
      });
      
      const result = await runSecurityChecks(options);
      
      expect(result).toBeDefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // 验证SARIF格式
      const writeCall = fs.writeFileSync.mock.calls.find(call => 
        call[0].includes('.sarif')
      );
      if (writeCall) {
        const sarifContent = writeCall[1];
        expect(sarifContent).toContain('"$schema":');
        expect(sarifContent).toContain('"version":');
        expect(sarifContent).toContain('"runs":');
      }
    });
  });
});