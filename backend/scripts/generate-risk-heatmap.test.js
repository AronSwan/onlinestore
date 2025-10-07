#!/usr/bin/env node

/**
 * 风险热力图生成脚本测试
 * 用途: 验证风险热力图生成脚本的功能
 * 使用方法:
 *   node scripts/generate-risk-heatmap.test.js
 *   npx jest scripts/generate-risk-heatmap.test.js
 */

const fs = require('fs');
const path = require('path');

// 导入要测试的函数
const {
  generateRiskHeatmap,
  loadVulnerabilitiesFromJson,
  mapToSystem,
  groupBySystemAndSeverity,
  generateColorGradient,
  getMaxCount,
  generateSVGHeatmap,
  generateNoDataPlaceholder,
  updateHeatmapSection,
  DEFAULT_CONFIG
} = require('./generate-risk-heatmap.js');

// 检测是否在Jest环境中运行
const isJest = process.env.NODE_ENV === 'test' || typeof jest !== 'undefined';

// 默认配置
const TEST_CONFIG = {
  systemMapping: {
    '性能问题': {
      keywords: ['索引', '查询', '性能', '缓存', '优化'],
      priority: 1,
      color: '#43a047'
    },
    '支付系统': {
      keywords: ['支付', '交易', '结算', '账单'],
      priority: 2,
      color: '#e53935'
    },
    '认证授权': {
      keywords: ['认证', '角色', 'JWT', '授权', '登录', '权限', '守卫'],
      priority: 3,
      color: '#fb8c00'
    },
    '数据安全': {
      keywords: ['密码', '用户', '数据', '敏感', '加密', '解密'],
      priority: 4,
      color: '#fdd835'
    },
    '其他': {
      keywords: [],
      priority: 5,
      color: '#1e88e5'
    }
  },
  severityColors: {
    '严重': '#d32f2f',
    '高': '#f57c00',
    '中': '#fbc02d',
    '低': '#388e3c',
    'empty': '#f5f5f5'
  },
  dimensions: {
    cellWidth: 120,
    cellHeight: 40,
    headerHeight: 30,
    headerWidth: 100,
    legendHeight: 50
  }
};

// 测试用例
const testCases = [
  {
    name: '解析标准漏洞表格',
    input: `
# 安全漏洞追踪表

## 漏洞追踪表

| 漏洞ID | 标题 | 规则ID | CVSS评分 | 状态 | 负责人 |
|--------|------|--------|---------|------|--------|
| VULN-001 | JWT认证守卫实现过于简单 | jwt-format-validation | 7.5 (高) | 待修复 | 张三 |
| VULN-002 | 支付控制器缺乏严格输入验证 | input-validation | 9.0 (严重) | 待修复 | 李四 |
`,
    expected: {
      count: 2,
      firstVuln: {
        id: 'VULN-001',
        title: 'JWT认证守卫实现过于简单',
        system: '认证授权',
        severity: '高',
        cvss: 7.5,
        status: '待修复'
      }
    }
  },
  {
    name: '系统分类测试',
    input: [
      { title: '支付控制器缺乏严格输入验证', expected: '支付系统' },
      { title: 'JWT认证守卫实现过于简单', expected: '认证授权' },
      { title: '用户实体密码字段处理不当', expected: '数据安全' },
      { title: '订单实体缺乏数据库索引', expected: '性能问题' },
      { title: '未知类型的漏洞', expected: '其他' }
    ]
  },
  {
    name: '颜色梯度测试',
    input: [
      { baseColor: '#d32f2f', count: 0, maxCount: 5, expected: '#f5f5f5' },
      { baseColor: '#d32f2f', count: 5, maxCount: 5, expected: '#d32f2f' },
      { baseColor: '#d32f2f', count: 3, maxCount: 5, expected: '#a92626' }
    ]
  }
];

// Jest测试套件
if (isJest) {
  // 模拟文件系统操作
  jest.mock('fs');
  
  describe('风险热力图生成脚本测试', () => {
    beforeEach(() => {
      // 重置所有模拟
      jest.clearAllMocks();
      
      // 设置默认的文件系统模拟
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('');
      fs.writeFileSync.mockImplementation(() => {});
      fs.mkdirSync.mockImplementation(() => {});
    });

    describe('mapToSystem', () => {
      test('应该正确映射到支付系统', () => {
        const result = mapToSystem('支付控制器缺乏严格输入验证', DEFAULT_CONFIG.systemMapping);
        expect(result).toBe('支付系统');
      });

      test('应该正确映射到认证授权', () => {
        const result = mapToSystem('JWT认证守卫实现过于简单', DEFAULT_CONFIG.systemMapping);
        expect(result).toBe('认证授权');
      });

      test('应该正确映射到性能问题', () => {
        const result = mapToSystem('订单实体缺乏数据库索引', DEFAULT_CONFIG.systemMapping);
        expect(result).toBe('性能问题');
      });

      test('应该处理英文关键词', () => {
        const result = mapToSystem('Payment controller lacks input validation', DEFAULT_CONFIG.systemMapping);
        expect(result).toBe('支付系统');
      });

      test('应该返回其他作为默认值', () => {
        const result = mapToSystem('未知类型的漏洞', DEFAULT_CONFIG.systemMapping);
        expect(result).toBe('其他');
      });

      test('应该处理空标题', () => {
        const result = mapToSystem('', DEFAULT_CONFIG.systemMapping);
        expect(result).toBe('其他');
      });
    });

    describe('generateColorGradient', () => {
      test('应该为0计数返回空单元格颜色', () => {
        const result = generateColorGradient('#d32f2f', 0, 5);
        expect(result.bg).toBe('#f5f5f5');
      });

      test('应该为最大计数返回原色', () => {
        const result = generateColorGradient('#d32f2f', 5, 5);
        expect(result.bg).toBe('#d32f2f');
      });

      test('应该生成中间强度的颜色', () => {
        const result = generateColorGradient('#d32f2f', 3, 5);
        expect(result.bg).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    describe('getMaxCount', () => {
      test('应该找到最大计数值', () => {
        const heatmapData = {
          '支付系统': { '严重': 1, '高': 2, '中': 0, '低': 0 },
          '认证授权': { '严重': 0, '高': 3, '中': 1, '低': 0 }
        };
        
        const result = getMaxCount(heatmapData);
        expect(result).toBe(3);
      });

      test('应该处理空数据', () => {
        const heatmapData = {
          '支付系统': { '严重': 0, '高': 0, '中': 0, '低': 0 }
        };
        
        const result = getMaxCount(heatmapData);
        expect(result).toBe(0);
      });
    });

    describe('groupBySystemAndSeverity', () => {
      test('应该正确分组漏洞', () => {
        const vulnerabilities = [
          { system: '支付系统', severity: '严重' },
          { system: '支付系统', severity: '高' },
          { system: '认证授权', severity: '高' },
          { system: '数据安全', severity: '中' }
        ];
        
        const result = groupBySystemAndSeverity(vulnerabilities, DEFAULT_CONFIG);
        
        expect(result['支付系统']['严重']).toBe(1);
        expect(result['支付系统']['高']).toBe(1);
        expect(result['认证授权']['高']).toBe(1);
        expect(result['数据安全']['中']).toBe(1);
      });
    });

    describe('generateSVGHeatmap', () => {
      test('应该生成有效的SVG', () => {
        const heatmapData = {
          '支付系统': { '严重': 1, '高': 2, '中': 0, '低': 0 },
          '认证授权': { '严重': 0, '高': 1, '中': 1, '低': 0 }
        };
        
        const svg = generateSVGHeatmap(heatmapData, DEFAULT_CONFIG, 'zh');
        
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
        expect(svg).toContain('支付系统');
        expect(svg).toContain('认证授权');
        expect(svg).toContain('系统/严重度');
      });

      test('应该支持英文标签', () => {
        const heatmapData = {
          'Payment System': { 'Critical': 1, 'High': 0, 'Medium': 0, 'Low': 0 }
        };
        
        const svg = generateSVGHeatmap(heatmapData, DEFAULT_CONFIG, 'en');
        
        expect(svg).toContain('System/Severity');
        expect(svg).toContain('Critical');
        expect(svg).toContain('Legend:');
      });
    });

    describe('updateHeatmapSection', () => {
      test('应该更新现有的热力图部分', () => {
        const content = `# 文档标题

## 风险热力图

![风险热力图](docs/security-risk-heatmap.svg)

**数据来源**: 漏洞追踪表中的CVSS评分和优先级

## 其他部分`;
      
        const result = updateHeatmapSection(content, 'docs/new-heatmap.svg', 'zh');
        
        expect(result).toContain('docs/new-heatmap.svg');
      });

      test('应该处理英文热力图部分', () => {
        const content = `# Document Title

## Risk Heatmap

![Risk Heatmap](docs/security-risk-heatmap.svg)

**Data Source**: Vulnerability tracking table

## Other Section`;
      
        const result = updateHeatmapSection(content, 'docs/new-heatmap.svg', 'en');
        
        expect(result).toContain('docs/new-heatmap.svg');
      });

      test('应该添加新的热力图部分如果不存在', () => {
        const content = `# 文档标题

## 其他部分`;
      
        const result = updateHeatmapSection(content, 'docs/security-risk-heatmap.svg', 'zh');
        
        expect(result).toContain('## 风险热力图');
        expect(result).toContain('docs/security-risk-heatmap.svg');
      });
    });

    describe('异常路径测试', () => {
      test('应该处理不存在的文件', () => {
        fs.existsSync.mockReturnValue(false);
        
        expect(() => {
          generateRiskHeatmap();
        }).not.toThrow(); // V2版本有错误处理，不会抛出异常
      });

      test('应该处理文件读取错误', () => {
        fs.readFileSync.mockImplementation(() => {
          throw new Error('文件读取失败');
        });
        
        expect(() => {
          generateRiskHeatmap();
        }).not.toThrow(); // V2版本有错误处理，不会抛出异常
      });

      test('应该处理文件写入错误', () => {
        fs.writeFileSync.mockImplementation(() => {
          throw new Error('文件写入失败');
        });
        
        expect(() => {
          generateRiskHeatmap();
        }).not.toThrow(); // V2版本有错误处理，不会抛出异常
      });
    });

    describe('集成测试', () => {
      test('应该完整执行生成流程', () => {
        // 模拟JSON数据源
        const mockData = {
          vulnerabilities: [
            {
              id: 'VULN-001',
              title: 'JWT认证守卫实现过于简单',
              ruleId: 'jwt-format-validation',
              cvss: 7.5,
              severity: '高',
              status: '待修复',
              owner: '张三',
              priority: '高',
              businessImpact: '可能导致未授权访问',
              firstFound: '2025-10-01',
              targetDate: '2025-10-05'
            }
          ]
        };

        // 模拟JSON文件读取
        fs.readFileSync.mockImplementation((filePath) => {
          if (filePath.includes('security-vulnerabilities.json')) {
            return JSON.stringify(mockData);
          }
          return '';
        });
        
        // 执行生成流程
        generateRiskHeatmap();
        
        // 验证文件操作调用
        expect(fs.existsSync).toHaveBeenCalled();
        expect(fs.readFileSync).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalled();
      });
    });
  });
} else {
  // 自定义测试框架实现
  function runTests() {
    console.log('开始运行风险热力图生成脚本测试...\n');
    
    let passedTests = 0;
    let totalTests = 0;
    
    // 测试1: 系统分类
    console.log('测试1: 系统分类');
    totalTests++;
    let allPassed = true;
    try {
      for (const testCase of testCases[1].input) {
        const result = mapToSystem(testCase.title, TEST_CONFIG.systemMapping);
        if (result !== testCase.expected) {
          console.log(`✗ 失败 - "${testCase.title}" 期望 "${testCase.expected}" 但得到 "${result}"`);
          allPassed = false;
        }
      }
      if (allPassed) {
        console.log('✓ 通过');
        passedTests++;
      }
    } catch (error) {
      console.log('✗ 失败 - 异常:', error.message);
    }
    
    // 测试2: 颜色梯度
    console.log('\n测试2: 颜色梯度');
    totalTests++;
    allPassed = true;
    try {
      for (const testCase of testCases[2].input) {
        const result = generateColorGradient(testCase.baseColor, testCase.count, testCase.maxCount);
        if (result.bg !== testCase.expected) {
          console.log(`✗ 失败 - 颜色梯度测试 期望 "${testCase.expected}" 但得到 "${result.bg}"`);
          allPassed = false;
        }
      }
      if (allPassed) {
        console.log('✓ 通过');
        passedTests++;
      }
    } catch (error) {
      console.log('✗ 失败 - 异常:', error.message);
    }
    
    // 测试3: 分组功能
    console.log('\n测试3: 分组功能');
    totalTests++;
    try {
      const vulnerabilities = [
        { system: '支付系统', severity: '严重' },
        { system: '支付系统', severity: '高' },
        { system: '认证授权', severity: '高' },
        { system: '数据安全', severity: '中' }
      ];
      
      const result = groupBySystemAndSeverity(vulnerabilities, TEST_CONFIG);
      
      if (result['支付系统']['严重'] === 1 &&
          result['支付系统']['高'] === 1 &&
          result['认证授权']['高'] === 1 &&
          result['数据安全']['中'] === 1) {
        console.log('✓ 通过');
        passedTests++;
      } else {
        console.log('✗ 失败 - 分组结果不正确');
        console.log('  实际:', JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.log('✗ 失败 - 异常:', error.message);
    }
    
    // 测试4: SVG生成
    console.log('\n测试4: SVG生成');
    totalTests++;
    try {
      const heatmapData = {
        '支付系统': { '严重': 1, '高': 2, '中': 0, '低': 0 },
        '认证授权': { '严重': 0, '高': 1, '中': 1, '低': 0 }
      };
      
      const svg = generateSVGHeatmap(heatmapData, TEST_CONFIG);
      
      if (svg.includes('<svg') && 
          svg.includes('</svg>') && 
          svg.includes('支付系统') && 
          svg.includes('认证授权')) {
        console.log('✓ 通过');
        passedTests++;
      } else {
        console.log('✗ 失败 - SVG格式不正确');
      }
    } catch (error) {
      console.log('✗ 失败 - 异常:', error.message);
    }
    
    // 测试5: 更新热力图段落
    console.log('\n测试5: 更新热力图段落');
    totalTests++;
    try {
      const content = `# 文档标题

## 风险热力图

![风险热力图](docs/security-risk-heatmap.svg)

**数据来源**: 漏洞追踪表中的CVSS评分和优先级

## 其他部分`;
      
      const result = updateHeatmapSection(content, 'docs/new-heatmap.svg');
      
      if (result.includes('docs/new-heatmap.svg')) {
        console.log('✓ 通过');
        passedTests++;
      } else {
        console.log('✗ 失败 - 段落更新不正确');
        console.log('  结果:', result);
      }
    } catch (error) {
      console.log('✗ 失败 - 异常:', error.message);
    }
    
    // 输出测试结果
    console.log(`\n测试结果: ${passedTests}/${totalTests} 通过`);
    
    if (passedTests === totalTests) {
      console.log('🎉 所有测试通过！');
      process.exit(0);
    } else {
      console.log('❌ 有测试失败');
      process.exit(1);
    }
  }
  
  // 运行测试
  if (require.main === module) {
    runTests();
  }
  
  module.exports = { runTests };
}