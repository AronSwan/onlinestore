/**
 * AI代码审计安全扫描器 - 符合2025秋季版AI代码审计规范
 * @ai-generated: 基于Claude 4 Sonnet生成，遵循零配置差异、零信任死角、零幻觉容忍原则
 * @version 2.6.0
 * @compliance: PCI-DSS-v4.0, OWASP-Top-10-2021, NIST-CSF-2.0
 */
class SecurityScanner {
  constructor(options = {}) {
    // AI代码审计配置常量
    this.SECURITY_CONSTANTS = {
      // CVSS评分阈值
      CVSS_CRITICAL_THRESHOLD: 9.0,
      CVSS_HIGH_THRESHOLD: 7.0,
      CVSS_MEDIUM_THRESHOLD: 4.0,

      // AI幻觉检测阈值
      AI_HALLUCINATION_THRESHOLD: 0.8,

      // 安全评分权重
      VULNERABILITY_WEIGHT: 0.4,
      COMPLIANCE_WEIGHT: 0.3,
      AI_SAFETY_WEIGHT: 0.3,

      // 扫描深度
      MAX_SCAN_DEPTH: 10,
      MAX_FILE_SIZE: 10485760, // 10MB

      // 超时设置
      SCAN_TIMEOUT_MS: 60000 // 60秒
    };

    // 安全威胁模式库 - 基于OWASP Top 10 2021
    this.THREAT_PATTERNS = {
      // A01:2021 - Broken Access Control
      accessControl: [
        { pattern: /eval\s*\(/gi, severity: 'critical', cwe: 'CWE-95', description: 'Code injection via eval()' },
        { pattern: /Function\s*\(/gi, severity: 'high', cwe: 'CWE-95', description: 'Dynamic code execution' },
        { pattern: /setTimeout\s*\(\s*["']/gi, severity: 'high', cwe: 'CWE-95', description: 'Code injection via setTimeout' },
        { pattern: /setInterval\s*\(\s*["']/gi, severity: 'high', cwe: 'CWE-95', description: 'Code injection via setInterval' }
      ],

      // A02:2021 - Cryptographic Failures
      cryptographic: [
        { pattern: /password\s*=\s*["'][^"']*["']/gi, severity: 'critical', cwe: 'CWE-798', description: 'Hardcoded password' },
        { pattern: /api[_-]?key\s*=\s*["'][^"']*["']/gi, severity: 'critical', cwe: 'CWE-798', description: 'Hardcoded API key' },
        { pattern: /secret\s*=\s*["'][^"']*["']/gi, severity: 'critical', cwe: 'CWE-798', description: 'Hardcoded secret' },
        { pattern: /token\s*=\s*["'][^"']*["']/gi, severity: 'high', cwe: 'CWE-798', description: 'Hardcoded token' },
        { pattern: /md5\s*\(/gi, severity: 'medium', cwe: 'CWE-327', description: 'Weak cryptographic algorithm (MD5)' },
        { pattern: /sha1\s*\(/gi, severity: 'medium', cwe: 'CWE-327', description: 'Weak cryptographic algorithm (SHA1)' }
      ],

      // A03:2021 - Injection
      injection: [
        { pattern: /innerHTML\s*=\s*[^;]+\+/gi, severity: 'high', cwe: 'CWE-79', description: 'XSS via innerHTML concatenation' },
        { pattern: /document\.write\s*\(/gi, severity: 'high', cwe: 'CWE-79', description: 'XSS via document.write' },
        { pattern: /\$\{[^}]*\}/g, severity: 'medium', cwe: 'CWE-79', description: 'Template literal injection risk' },
        { pattern: /SELECT\s+.*\+.*FROM/gi, severity: 'critical', cwe: 'CWE-89', description: 'SQL injection via string concatenation' },
        { pattern: /INSERT\s+.*\+.*VALUES/gi, severity: 'critical', cwe: 'CWE-89', description: 'SQL injection in INSERT statement' },
        { pattern: /UPDATE\s+.*SET\s+.*\+/gi, severity: 'critical', cwe: 'CWE-89', description: 'SQL injection in UPDATE statement' },
        { pattern: /DELETE\s+.*WHERE\s+.*\+/gi, severity: 'critical', cwe: 'CWE-89', description: 'SQL injection in DELETE statement' }
      ],

      // A04:2021 - Insecure Design
      insecureDesign: [
        { pattern: /Math\.random\s*\(\s*\)/gi, severity: 'medium', cwe: 'CWE-338', description: 'Weak random number generation' },
        { pattern: /new\s+Date\s*\(\s*\)\.getTime\s*\(\s*\)/gi, severity: 'low', cwe: 'CWE-338', description: 'Predictable timestamp-based randomness' }
      ],

      // A05:2021 - Security Misconfiguration
      misconfiguration: [
        { pattern: /console\.log\s*\(/gi, severity: 'low', cwe: 'CWE-532', description: 'Information exposure via console.log' },
        { pattern: /alert\s*\(/gi, severity: 'low', cwe: 'CWE-532', description: 'Information exposure via alert' },
        { pattern: /confirm\s*\(/gi, severity: 'low', cwe: 'CWE-532', description: 'Information exposure via confirm' },
        { pattern: /prompt\s*\(/gi, severity: 'low', cwe: 'CWE-532', description: 'Information exposure via prompt' }
      ],

      // A06:2021 - Vulnerable and Outdated Components
      outdatedComponents: [
        { pattern: /jquery-1\.[0-7]/gi, severity: 'high', cwe: 'CWE-1104', description: 'Vulnerable jQuery version' },
        { pattern: /angular-1\.[0-5]/gi, severity: 'high', cwe: 'CWE-1104', description: 'Vulnerable AngularJS version' }
      ],

      // A07:2021 - Identification and Authentication Failures
      authentication: [
        { pattern: /session\s*=\s*["'][^"']*["']/gi, severity: 'medium', cwe: 'CWE-798', description: 'Hardcoded session identifier' },
        { pattern: /cookie\s*=\s*["'][^"']*["']/gi, severity: 'medium', cwe: 'CWE-798', description: 'Hardcoded cookie value' }
      ],

      // A08:2021 - Software and Data Integrity Failures
      integrity: [
        { pattern: /\.innerHTML\s*=\s*[^;]+/gi, severity: 'medium', cwe: 'CWE-79', description: 'Potential DOM manipulation' },
        { pattern: /\.outerHTML\s*=\s*[^;]+/gi, severity: 'medium', cwe: 'CWE-79', description: 'Potential DOM manipulation' }
      ],

      // A09:2021 - Security Logging and Monitoring Failures
      logging: [
        { pattern: /catch\s*\([^)]*\)\s*\{\s*\}/gi, severity: 'medium', cwe: 'CWE-778', description: 'Empty catch block - missing error logging' },
        { pattern: /try\s*\{[^}]*\}\s*catch\s*\([^)]*\)\s*\{\s*\/\//gi, severity: 'low', cwe: 'CWE-778', description: 'Commented error handling' }
      ],

      // A10:2021 - Server-Side Request Forgery (SSRF)
      ssrf: [
        { pattern: /fetch\s*\(\s*[^)]*\+/gi, severity: 'high', cwe: 'CWE-918', description: 'SSRF via dynamic fetch URL' },
        { pattern: /XMLHttpRequest\s*\(\s*\)[^;]*\.open\s*\([^)]*\+/gi, severity: 'high', cwe: 'CWE-918', description: 'SSRF via dynamic XHR URL' }
      ]
    };

    // AI生成代码检测模式
    this.AI_CODE_PATTERNS = [
      { pattern: /@ai-generated/gi, type: 'ai_marker', description: 'AI生成代码标记' },
      { pattern: /@copilot/gi, type: 'ai_marker', description: 'GitHub Copilot生成代码' },
      { pattern: /@cursor/gi, type: 'ai_marker', description: 'Cursor AI生成代码' },
      { pattern: /\/\*\s*AI\s*generated/gi, type: 'ai_marker', description: 'AI生成代码注释' },
      { pattern: /\/\/\s*Generated\s*by\s*AI/gi, type: 'ai_marker', description: 'AI生成代码注释' }
    ];

    // 合规性检查规则
    this.COMPLIANCE_RULES = {
      'PCI-DSS': {
        patterns: [
          { pattern: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g, severity: 'critical', description: 'Potential credit card number exposure' },
          { pattern: /\d{3}[-\s]?\d{2}[-\s]?\d{4}/g, severity: 'high', description: 'Potential SSN exposure' }
        ]
      },
      'GDPR': {
        patterns: [
          { pattern: /email\s*=\s*["'][^"']*@[^"']*["']/gi, severity: 'medium', description: 'Potential PII exposure - email' },
          { pattern: /phone\s*=\s*["'][^"']*["']/gi, severity: 'medium', description: 'Potential PII exposure - phone' }
        ]
      }
    };

    this.config = {
      enableAIDetection: true,
      enableComplianceCheck: true,
      enableVulnerabilityScanning: true,
      maxScanTime: this.SECURITY_CONSTANTS.SCAN_TIMEOUT_MS,
      reportFormat: 'sarif',
      ...options
    };

    this.scanResults = {
      vulnerabilities: [],
      aiCodeDetections: [],
      complianceViolations: [],
      securityScore: 0,
      riskLevel: 'unknown'
    };
  }

  /**
   * 执行全面安全扫描
   * @param {string} content - 代码内容
   * @param {string} filePath - 文件路径
   * @param {Object} options - 扫描选项
   * @returns {Object} 扫描结果
   */
  async scanCode(content, filePath = '', _options = {}) {
    const startTime = Date.now();

    try {
      // 重置扫描结果
      this.resetScanResults();

      // 检查文件大小限制
      if (content.length > this.SECURITY_CONSTANTS.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds limit: ${content.length} > ${this.SECURITY_CONSTANTS.MAX_FILE_SIZE}`);
      }

      // 并行执行各种扫描
      const scanPromises = [
        this.scanVulnerabilities(content, filePath),
        this.detectAIGeneratedCode(content, filePath),
        this.checkCompliance(content, filePath)
      ];

      // 设置超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Scan timeout')), this.config.maxScanTime);
      });

      await Promise.race([Promise.all(scanPromises), timeoutPromise]);

      // 计算安全评分
      this.calculateSecurityScore();

      // 确定风险等级
      this.determineRiskLevel();

      const scanTime = Date.now() - startTime;

      return {
        ...this.scanResults,
        metadata: {
          filePath,
          scanTime,
          timestamp: new Date().toISOString(),
          scannerVersion: '2.6.0',
          compliance: ['PCI-DSS-v4.0', 'OWASP-Top-10-2021', 'NIST-CSF-2.0']
        }
      };
    } catch (error) {
      return {
        error: error.message,
        metadata: {
          filePath,
          scanTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 扫描安全漏洞
   * @param {string} content - 代码内容
   * @param {string} filePath - 文件路径
   */
  async scanVulnerabilities(content, filePath) {
    const vulnerabilities = [];

    // 遍历所有威胁模式
    for (const [category, patterns] of Object.entries(this.THREAT_PATTERNS)) {
      for (const threatPattern of patterns) {
        const matches = this.findMatches(content, threatPattern.pattern);

        for (const match of matches) {
          vulnerabilities.push({
            id: this.generateVulnerabilityId(),
            category,
            severity: threatPattern.severity,
            cwe: threatPattern.cwe,
            description: threatPattern.description,
            location: {
              filePath,
              line: match.line,
              column: match.column,
              snippet: match.snippet
            },
            cvssScore: this.calculateCVSSScore(threatPattern.severity),
            remediation: this.getRemediation(threatPattern.cwe),
            confidence: this.calculateConfidence(match)
          });
        }
      }
    }

    this.scanResults.vulnerabilities = vulnerabilities;
  }

  /**
   * 检测AI生成代码
   * @param {string} content - 代码内容
   * @param {string} filePath - 文件路径
   */
  async detectAIGeneratedCode(content, filePath) {
    if (!this.config.enableAIDetection) { return; }

    const aiDetections = [];

    for (const pattern of this.AI_CODE_PATTERNS) {
      const matches = this.findMatches(content, pattern.pattern);

      for (const match of matches) {
        aiDetections.push({
          type: pattern.type,
          description: pattern.description,
          location: {
            filePath,
            line: match.line,
            column: match.column,
            snippet: match.snippet
          },
          hallucinationRisk: this.assessHallucinationRisk(match.snippet),
          trustScore: this.calculateTrustScore(match.snippet)
        });
      }
    }

    // 检测可能的AI幻觉模式
    const hallucinationPatterns = [
      { pattern: /\/\*\s*TODO:.*AI.*\*\//gi, risk: 'medium', description: 'AI生成的TODO注释' },
      { pattern: /\/\/\s*Note:.*generated/gi, risk: 'low', description: 'AI生成代码说明' },
      { pattern: /function\s+placeholder/gi, risk: 'high', description: '可能的AI占位符函数' }
    ];

    for (const pattern of hallucinationPatterns) {
      const matches = this.findMatches(content, pattern.pattern);

      for (const match of matches) {
        aiDetections.push({
          type: 'hallucination_risk',
          description: pattern.description,
          riskLevel: pattern.risk,
          location: {
            filePath,
            line: match.line,
            column: match.column,
            snippet: match.snippet
          }
        });
      }
    }

    this.scanResults.aiCodeDetections = aiDetections;
  }

  /**
   * 检查合规性
   * @param {string} content - 代码内容
   * @param {string} filePath - 文件路径
   */
  async checkCompliance(content, filePath) {
    if (!this.config.enableComplianceCheck) { return; }

    const violations = [];

    for (const [standard, rules] of Object.entries(this.COMPLIANCE_RULES)) {
      for (const rule of rules.patterns) {
        const matches = this.findMatches(content, rule.pattern);

        for (const match of matches) {
          violations.push({
            standard,
            severity: rule.severity,
            description: rule.description,
            location: {
              filePath,
              line: match.line,
              column: match.column,
              snippet: match.snippet
            },
            remediation: this.getComplianceRemediation(standard, rule.description)
          });
        }
      }
    }

    this.scanResults.complianceViolations = violations;
  }

  /**
   * 查找模式匹配
   * @param {string} content - 内容
   * @param {RegExp} pattern - 正则模式
   * @returns {Array} 匹配结果
   */
  findMatches(content, pattern) {
    const matches = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(line)) !== null) {
        matches.push({
          line: lineIndex + 1,
          column: match.index + 1,
          snippet: line.trim(),
          matchText: match[0]
        });

        // 防止无限循环
        if (!pattern.global) { break; }
      }
    });

    return matches;
  }

  /**
   * 计算CVSS评分
   * @param {string} severity - 严重程度
   * @returns {number} CVSS评分
   */
  calculateCVSSScore(severity) {
    const scoreMap = {
      'critical': 9.5,
      'high': 7.5,
      'medium': 5.0,
      'low': 2.5
    };

    return scoreMap[severity] || 0;
  }

  /**
   * 评估AI幻觉风险
   * @param {string} snippet - 代码片段
   * @returns {number} 幻觉风险评分 (0-1)
   */
  assessHallucinationRisk(snippet) {
    let riskScore = 0;

    // 检查常见的AI幻觉模式
    const hallucinationIndicators = [
      /placeholder/gi,
      /TODO.*implement/gi,
      /FIXME.*AI/gi,
      /example.*only/gi,
      /not.*implemented/gi
    ];

    hallucinationIndicators.forEach(pattern => {
      if (pattern.test(snippet)) {
        riskScore += 0.2;
      }
    });

    return Math.min(riskScore, 1.0);
  }

  /**
   * 计算信任评分
   * @param {string} snippet - 代码片段
   * @returns {number} 信任评分 (0-1)
   */
  calculateTrustScore(snippet) {
    let trustScore = 1.0;

    // 降低信任度的因素
    const trustReducers = [
      { pattern: /eval\s*\(/gi, reduction: 0.5 },
      { pattern: /innerHTML\s*=/gi, reduction: 0.3 },
      { pattern: /document\.write/gi, reduction: 0.4 },
      { pattern: /setTimeout\s*\(\s*["']/gi, reduction: 0.3 }
    ];

    trustReducers.forEach(reducer => {
      if (reducer.pattern.test(snippet)) {
        trustScore -= reducer.reduction;
      }
    });

    return Math.max(trustScore, 0);
  }

  /**
   * 计算安全评分
   */
  calculateSecurityScore() {
    let score = 100;

    // 根据漏洞严重程度扣分
    this.scanResults.vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
      case 'critical':
        score -= 30;
        break;
      case 'high':
        score -= 20;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
      }
    });

    // 根据合规性违规扣分
    this.scanResults.complianceViolations.forEach(violation => {
      switch (violation.severity) {
      case 'critical':
        score -= 25;
        break;
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 8;
        break;
      case 'low':
        score -= 3;
        break;
      }
    });

    // 根据AI代码风险扣分
    this.scanResults.aiCodeDetections.forEach(detection => {
      if (detection.hallucinationRisk > this.SECURITY_CONSTANTS.AI_HALLUCINATION_THRESHOLD) {
        score -= 15;
      }
    });

    this.scanResults.securityScore = Math.max(score, 0);
  }

  /**
   * 确定风险等级
   */
  determineRiskLevel() {
    const score = this.scanResults.securityScore;
    const criticalVulns = this.scanResults.vulnerabilities.filter(v => v.severity === 'critical').length;
    const RISK_THRESHOLDS = {
      CRITICAL: 30,
      HIGH: 50,
      MEDIUM: 70
    };

    if (score < RISK_THRESHOLDS.CRITICAL || criticalVulns > 0) {
      this.scanResults.riskLevel = 'critical';
    } else if (score < RISK_THRESHOLDS.HIGH) {
      this.scanResults.riskLevel = 'high';
    } else if (score < RISK_THRESHOLDS.MEDIUM) {
      this.scanResults.riskLevel = 'medium';
    } else {
      this.scanResults.riskLevel = 'low';
    }
  }

  /**
   * 获取修复建议
   * @param {string} cwe - CWE编号
   * @returns {string} 修复建议
   */
  getRemediation(cwe) {
    const remediations = {
      'CWE-79': '使用适当的输出编码和输入验证来防止XSS攻击',
      'CWE-89': '使用参数化查询或预编译语句来防止SQL注入',
      'CWE-95': '避免使用eval()和动态代码执行，使用安全的替代方案',
      'CWE-798': '移除硬编码的敏感信息，使用环境变量或安全配置',
      'CWE-327': '使用强加密算法，如SHA-256或更高版本',
      'CWE-338': '使用加密安全的随机数生成器',
      'CWE-532': '移除生产环境中的调试信息输出',
      'CWE-778': '实现适当的错误日志记录和监控',
      'CWE-918': '验证和限制外部URL请求，使用白名单机制',
      'CWE-1104': '更新到最新的安全版本'
    };

    return remediations[cwe] || '请参考相关安全最佳实践进行修复';
  }

  /**
   * 获取合规性修复建议
   * @param {string} standard - 合规标准
   * @param {string} description - 违规描述
   * @returns {string} 修复建议
   */
  getComplianceRemediation(standard, description) {
    const remediations = {
      'PCI-DSS': {
        'credit card': '移除或加密信用卡信息，确保符合PCI-DSS标准',
        'SSN': '移除或加密社会安全号码，实施数据保护措施'
      },
      'GDPR': {
        'email': '确保邮箱地址的处理符合GDPR要求，实施数据最小化原则',
        'phone': '确保电话号码的处理符合GDPR要求，获得适当的同意'
      }
    };

    const standardRemediations = remediations[standard];
    if (standardRemediations) {
      for (const [key, remediation] of Object.entries(standardRemediations)) {
        if (description.toLowerCase().includes(key)) {
          return remediation;
        }
      }
    }

    return `确保代码符合${standard}合规要求`;
  }

  /**
   * 生成漏洞ID
   * @returns {string} 漏洞ID
   */
  generateVulnerabilityId() {
    return `VULN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算置信度
   * @param {Object} match - 匹配结果
   * @returns {number} 置信度 (0-1)
   */
  calculateConfidence(match) {
    // 基于匹配的上下文和模式复杂度计算置信度
    let confidence = 0.8; // 基础置信度

    // 如果匹配在注释中，降低置信度
    if (match.snippet.trim().startsWith('//') || match.snippet.includes('/*')) {
      confidence -= 0.3;
    }

    // 如果匹配很短，降低置信度
    if (match.matchText.length < 5) {
      confidence -= 0.2;
    }

    return Math.max(confidence, 0.1);
  }

  /**
   * 重置扫描结果
   */
  resetScanResults() {
    this.scanResults = {
      vulnerabilities: [],
      aiCodeDetections: [],
      complianceViolations: [],
      securityScore: 0,
      riskLevel: 'unknown'
    };
  }

  /**
   * 生成SARIF格式报告
   * @returns {Object} SARIF报告
   */
  generateSARIFReport() {
    const sarif = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'AI-Security-Scanner',
            version: '2.6.0',
            informationUri: 'https://github.com/ai-audit/security-scanner',
            rules: this.generateSARIFRules()
          }
        },
        results: this.generateSARIFResults()
      }]
    };

    return sarif;
  }

  /**
   * 生成SARIF规则
   * @returns {Array} SARIF规则数组
   */
  generateSARIFRules() {
    const rules = [];

    // 为每个威胁模式生成规则
    for (const [category, patterns] of Object.entries(this.THREAT_PATTERNS)) {
      for (const pattern of patterns) {
        rules.push({
          id: pattern.cwe,
          name: pattern.description,
          shortDescription: {
            text: pattern.description
          },
          fullDescription: {
            text: `${category}: ${pattern.description}`
          },
          defaultConfiguration: {
            level: this.mapSeverityToSARIF(pattern.severity)
          },
          properties: {
            category: category,
            cwe: pattern.cwe,
            severity: pattern.severity
          }
        });
      }
    }

    return rules;
  }

  /**
   * 生成SARIF结果
   * @returns {Array} SARIF结果数组
   */
  generateSARIFResults() {
    const results = [];

    // 添加漏洞结果
    this.scanResults.vulnerabilities.forEach(vuln => {
      results.push({
        ruleId: vuln.cwe,
        level: this.mapSeverityToSARIF(vuln.severity),
        message: {
          text: vuln.description
        },
        locations: [{
          physicalLocation: {
            artifactLocation: {
              uri: vuln.location.filePath
            },
            region: {
              startLine: vuln.location.line,
              startColumn: vuln.location.column
            }
          }
        }],
        properties: {
          cvssScore: vuln.cvssScore,
          confidence: vuln.confidence,
          remediation: vuln.remediation
        }
      });
    });

    return results;
  }

  /**
   * 映射严重程度到SARIF级别
   * @param {string} severity - 严重程度
   * @returns {string} SARIF级别
   */
  mapSeverityToSARIF(severity) {
    const mapping = {
      'critical': 'error',
      'high': 'error',
      'medium': 'warning',
      'low': 'note'
    };

    return mapping[severity] || 'note';
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityScanner;
} else if (typeof window !== 'undefined') {
  window.SecurityScanner = SecurityScanner;
}
