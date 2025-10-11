#!/usr/bin/env node

/**
 * 风险热力图生成脚本 Jest 测试
 * 用途: 使用Jest框架测试风险热力图生成脚本的功能
 * @author 安全团队
 * @version 1.0.0
 * @since 2025-10-03
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
  DEFAULT_CONFIG,
} = require('./generate-risk-heatmap-v2.js');

// 模拟文件系统操作
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('风险热力图生成脚本 V2 Jest测试', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();

    // 设置默认的文件系统模拟
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('');
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});

    // 控制台输出静默
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // 恢复控制台输出
    jest.restoreAllMocks();
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
      const result = mapToSystem(
        'Payment controller lacks input validation',
        DEFAULT_CONFIG.systemMapping,
      );
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

    test('应该处理null标题', () => {
      const result = mapToSystem(null, DEFAULT_CONFIG.systemMapping);
      expect(result).toBe('其他');
    });

    test('应该处理undefined标题', () => {
      const result = mapToSystem(undefined, DEFAULT_CONFIG.systemMapping);
      expect(result).toBe('其他');
    });
  });

  describe('generateColorGradient', () => {
    test('应该为0计数返回空单元格颜色', () => {
      const result = generateColorGradient('#d32f2f', 0, 5);
      expect(result.bg).toBe('#f5f5f5');
      expect(result.text).toBe('#000000');
    });

    test('应该为最大计数返回原色', () => {
      const result = generateColorGradient('#d32f2f', 5, 5);
      expect(result.bg).toBe('#d32f2f');
      expect(result.text).toBe('#ffffff');
    });

    test('应该生成中间强度的颜色', () => {
      const result = generateColorGradient('#d32f2f', 3, 5);
      expect(result.bg).toMatch(/^#[0-9a-f]{6}$/);
      expect(result.text).toMatch(/^#[0-9a-f]{6}$/);
    });

    test('应该处理边界情况', () => {
      const result = generateColorGradient('#d32f2f', 1, 100);
      expect(result.bg).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('getMaxCount', () => {
    test('应该找到最大计数值', () => {
      const heatmapData = {
        支付系统: { 严重: 1, 高: 2, 中: 0, 低: 0 },
        认证授权: { 严重: 0, 高: 3, 中: 1, 低: 0 },
      };

      const result = getMaxCount(heatmapData);
      expect(result).toBe(3);
    });

    test('应该处理空数据', () => {
      const heatmapData = {
        支付系统: { 严重: 0, 高: 0, 中: 0, 低: 0 },
      };

      const result = getMaxCount(heatmapData);
      expect(result).toBe(0);
    });

    test('应该处理所有系统都为0的情况', () => {
      const heatmapData = {
        支付系统: { 严重: 0, 高: 0, 中: 0, 低: 0 },
        认证授权: { 严重: 0, 高: 0, 中: 0, 低: 0 },
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
        { system: '数据安全', severity: '中' },
      ];

      const result = groupBySystemAndSeverity(vulnerabilities, DEFAULT_CONFIG);

      expect(result['支付系统']['严重']).toBe(1);
      expect(result['支付系统']['高']).toBe(1);
      expect(result['认证授权']['高']).toBe(1);
      expect(result['数据安全']['中']).toBe(1);
    });

    test('应该处理空数组', () => {
      const vulnerabilities = [];
      const result = groupBySystemAndSeverity(vulnerabilities, DEFAULT_CONFIG);

      // 验证所有系统都有初始化
      Object.keys(DEFAULT_CONFIG.systemMapping).forEach(system => {
        expect(result[system]).toBeDefined();
        expect(result[system]['严重']).toBe(0);
        expect(result[system]['高']).toBe(0);
        expect(result[system]['中']).toBe(0);
        expect(result[system]['低']).toBe(0);
      });
    });

    test('应该处理未知系统和严重度', () => {
      const vulnerabilities = [
        { system: '未知系统', severity: '未知严重度' },
        { system: '支付系统', severity: '高' },
      ];

      const result = groupBySystemAndSeverity(vulnerabilities, DEFAULT_CONFIG);

      expect(result['支付系统']['高']).toBe(1);
      // 未知系统应该被忽略
    });
  });

  describe('generateSVGHeatmap', () => {
    test('应该生成有效的SVG', () => {
      const heatmapData = {
        支付系统: { 严重: 1, 高: 2, 中: 0, 低: 0 },
        认证授权: { 严重: 0, 高: 1, 中: 1, 低: 0 },
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
        'Payment System': { Critical: 1, High: 0, Medium: 0, Low: 0 },
      };

      const svg = generateSVGHeatmap(heatmapData, DEFAULT_CONFIG, 'en');

      expect(svg).toContain('System/Severity');
      expect(svg).toContain('Critical');
      expect(svg).toContain('Legend:');
    });

    test('应该生成正确的尺寸', () => {
      const heatmapData = {
        支付系统: { 严重: 1, 高: 0, 中: 0, 低: 0 },
      };

      const svg = generateSVGHeatmap(heatmapData, DEFAULT_CONFIG, 'zh');

      // 验证SVG包含正确的尺寸属性
      expect(svg).toMatch(/width="\d+"/);
      expect(svg).toMatch(/height="\d+"/);
    });

    test('应该包含时间戳', () => {
      const heatmapData = {
        支付系统: { 严重: 1, 高: 0, 中: 0, 低: 0 },
      };

      const svg = generateSVGHeatmap(heatmapData, DEFAULT_CONFIG, 'zh');

      // 验证SVG包含当前日期
      const today = new Date().toISOString().split('T')[0];
      expect(svg).toContain(today);
    });
  });

  describe('generateNoDataPlaceholder', () => {
    test('应该生成有效的占位SVG', () => {
      const svg = generateNoDataPlaceholder(DEFAULT_CONFIG, 'zh');

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('暂无漏洞数据');
    });

    test('应该支持英文占位符', () => {
      const svg = generateNoDataPlaceholder(DEFAULT_CONFIG, 'en');

      expect(svg).toContain('No vulnerability data available');
    });

    test('应该使用正确的尺寸', () => {
      const svg = generateNoDataPlaceholder(DEFAULT_CONFIG, 'zh');

      expect(svg).toContain('width="600"');
      expect(svg).toContain('height="200"');
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

    test('应该保留自动生成标记', () => {
      const content = `# 文档标题

## 风险热力图

![风险热力图](docs/security-risk-heatmap.svg)

**数据来源**: 结构化漏洞数据

<!-- 自动生成内容开始 -->
![风险热力图](docs/security-risk-heatmap.svg)
<!-- 自动生成内容结束 -->

## 其他部分`;

      const result = updateHeatmapSection(content, 'docs/new-heatmap.svg', 'zh');

      expect(result).toContain('<!-- 自动生成内容开始 -->');
      expect(result).toContain('<!-- 自动生成内容结束 -->');
      expect(result).toContain('docs/new-heatmap.svg');
    });
  });

  describe('loadVulnerabilitiesFromJson', () => {
    test('应该正确加载JSON数据', () => {
      const mockData = {
        vulnerabilities: [
          {
            id: 'VULN-001',
            title: '测试漏洞',
            severity: '高',
            cvss: 7.5,
            status: '待修复',
          },
        ],
      };

      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      const result = loadVulnerabilitiesFromJson('test.json');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('VULN-001');
      expect(result[0].title).toBe('测试漏洞');
      expect(result[0].system).toBe('其他'); // 默认系统分类
    });

    test('应该处理文件不存在的情况', () => {
      fs.existsSync.mockReturnValue(false);

      expect(() => {
        loadVulnerabilitiesFromJson('nonexistent.json');
      }).toThrow('数据源文件不存在');
    });

    test('应该处理无效JSON格式', () => {
      fs.readFileSync.mockReturnValue('invalid json');

      expect(() => {
        loadVulnerabilitiesFromJson('invalid.json');
      }).toThrow();
    });

    test('应该处理缺少vulnerabilities数组的情况', () => {
      const mockData = { metadata: {} };
      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      expect(() => {
        loadVulnerabilitiesFromJson('incomplete.json');
      }).toThrow('数据源格式不正确');
    });
  });

  describe('generateRiskHeatmap', () => {
    test('应该完整执行生成流程', () => {
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
            targetDate: '2025-10-05',
          },
        ],
      };

      fs.readFileSync.mockImplementation(filePath => {
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

    test('应该处理无数据情况', () => {
      const mockData = { vulnerabilities: [] };
      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      generateRiskHeatmap();

      // 验证生成了占位图
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('应该处理JSON加载失败的情况', () => {
      fs.existsSync.mockReturnValue(false);

      generateRiskHeatmap();

      // 应该生成错误占位图
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('应该处理异常情况', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('模拟错误');
      });

      // 不应该抛出异常，而是生成错误占位图
      expect(() => {
        generateRiskHeatmap();
      }).not.toThrow();

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    test('应该能处理大量漏洞数据', () => {
      const largeVulnerabilityList = Array.from({ length: 1000 }, (_, i) => ({
        id: `VULN-${i.toString().padStart(3, '0')}`,
        title: `测试漏洞 ${i}`,
        severity: ['低', '中', '高', '严重'][i % 4],
        cvss: 3.0 + (i % 7),
        status: '待修复',
      }));

      const mockData = { vulnerabilities: largeVulnerabilityList };
      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      const startTime = Date.now();
      generateRiskHeatmap();
      const endTime = Date.now();

      // 性能断言：处理1000条记录应该在5秒内完成
      expect(endTime - startTime).toBeLessThan(5000);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('边界条件测试', () => {
    test('应该处理极端CVSS值', () => {
      const mockData = {
        vulnerabilities: [
          {
            id: 'VULN-001',
            title: '最低CVSS',
            severity: '低',
            cvss: 0.0,
            status: '待修复',
          },
          {
            id: 'VULN-002',
            title: '最高CVSS',
            severity: '严重',
            cvss: 10.0,
            status: '待修复',
          },
        ],
      };

      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      expect(() => {
        generateRiskHeatmap();
      }).not.toThrow();
    });

    test('应该处理特殊字符', () => {
      const mockData = {
        vulnerabilities: [
          {
            id: 'VULN-001',
            title: '包含特殊字符的漏洞 <script>alert("xss")</script>',
            severity: '高',
            cvss: 7.5,
            status: '待修复',
          },
        ],
      };

      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      expect(() => {
        generateRiskHeatmap();
      }).not.toThrow();
    });
  });
});
