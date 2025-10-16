#!/usr/bin/env node

/**
 * 安全扫描插件 - 提供全面的安全检查和漏洞扫描
 * 实现代码安全分析、依赖检查和配置安全验证
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const EventEmitter = require('events');

// 安全扫描配置
const SecurityScanConfig = {
  // 代码安全检查
  codeSecurity: {
    enabled: true,
    patterns: {
      // 危险函数模式
      dangerousFunctions: [
        /eval\s*\(/,
        /Function\s*\(/,
        /setTimeout\s*\(\s*["'`][^"'`]*["'`]/,
        /setInterval\s*\(\s*["'`][^"'`]*["'`]/,
        /new\s+Function\s*\(/,
        /document\.write\s*\(/,
        /innerHTML\s*=/,
        /outerHTML\s*=/,
        /insertAdjacentHTML\s*\(/,
        /crypto\.subtle\.deriveKey/,
        /crypto\.subtle\.encrypt/,
        /crypto\.subtle\.decrypt/
      ],
      // 敏感信息模式
      sensitiveData: [
        /password\s*[=:]\s*["'`][^"'`]{3,}["'`]/,
        /secret\s*[=:]\s*["'`][^"'`]{3,}["'`]/,
        /token\s*[=:]\s*["'`][^"'`]{10,}["'`]/,
        /api[_-]?key\s*[=:]\s*["'`][^"'`]{10,}["'`]/,
        /private[_-]?key\s*[=:]\s*["'`][^"'`]{10,}["'`]/,
        /access[_-]?token\s*[=:]\s*["'`][^"'`]{10,}["'`]/,
        /refresh[_-]?token\s*[=:]\s*["'`][^"'`]{10,}["'`]/,
        /client[_-]?secret\s*[=:]\s*["'`][^"'`]{10,}["'`]/,
        /auth[_-]?token\s*[=:]\s*["'`][^"'`]{10,}["'`]/,
        /bearer\s+["'`][^"'`]{10,}["'`]/
      ],
      // 不安全的网络请求
      insecureRequests: [
        /http:\/\/[^"'\s]+/i,
        /ws:\/\/[^"'\s]+/i,
        /ftp:\/\/[^"'\s]+/i,
        /\.ajax\s*\(\s*{\s*url\s*:\s*["'`]http:/i,
        /fetch\s*\(\s*["'`]http:/i,
        /XMLHttpRequest\s*\([^)]*http:/i
      ],
      // 弱加密模式
      weakCrypto: [
        /md5\s*\(/i,
        /sha1\s*\(/i,
        /crypto\.createHash\s*\(\s*["'`]md1/i,
        /crypto\.createHash\s*\(\s*["'`]sha1/i,
        /crypto\.createCipher\s*\(/i,
        /crypto\.createDecipher\s*\(/i
      ]
    },
    excludedFiles: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.bundle.js'
    ]
  },
  
  // 依赖安全检查
  dependencySecurity: {
    enabled: true,
    checkVulnerabilities: true,
    checkOutdated: true,
    checkLicenses: true,
    allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
    blockedLicenses: ['GPL-2.0', 'GPL-3.0', 'AGPL-1.0', 'AGPL-3.0']
  },
  
  // 配置安全检查
  configSecurity: {
    enabled: true,
    checks: {
      // 文件权限检查
      filePermissions: {
        maxReadableByOthers: ['*.key', '*.pem', '*.p12', '*.pfx'],
        maxWritableByOthers: ['*.json', '*.config', '*.env'],
        maxExecutableByOthers: ['*.sh', '*.bat', '*.cmd']
      },
      // 敏感文件检查
      sensitiveFiles: [
        '.env',
        '.env.local',
        '.env.development',
        '.env.production',
        'config.json',
        'secrets.json',
        'private.key',
        'id_rsa',
        'known_hosts'
      ],
      // 不安全配置检查
      insecureConfigs: [
        { file: 'package.json', pattern: /"scripts":\s*{\s*["'`]preinstall["'`]/, severity: 'HIGH' },
        { file: 'package.json', pattern: /"scripts":\s*{\s*["'`]postinstall["'`]/, severity: 'MEDIUM' },
        { file: '.gitignore', pattern: /!.*\.env/, severity: 'HIGH' },
        { file: 'docker-compose.yml', pattern: /privileged:\s*true/, severity: 'CRITICAL' }
      ]
    }
  },
  
  // 网络安全检查
  networkSecurity: {
    enabled: true,
    checks: {
      // 开放端口检查
      openPorts: {
        commonPorts: [22, 80, 443, 8080, 3000, 5000, 8000, 9000],
        dangerousPorts: [23, 53, 135, 139, 445, 1433, 3306, 5432, 6379, 27017]
      },
      // SSL/TLS检查
      sslTls: {
        checkCertificates: true,
        checkProtocols: true,
        checkCiphers: true,
        weakProtocols: ['SSLv2', 'SSLv3', 'TLSv1.0', 'TLSv1.1'],
        weakCiphers: ['RC4', 'DES', '3DES', 'MD5', 'SHA1']
      }
    }
  }
};

class SecurityScannerPlugin extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 浅合并基础对象
    this.options = {
      ...SecurityScanConfig,
      ...options
    };

    // 深合并子配置，避免用户覆盖导致属性缺失
    this.options.codeSecurity = {
      ...SecurityScanConfig.codeSecurity,
      ...(options.codeSecurity || {})
    };
    this.options.codeSecurity.patterns = {
      ...SecurityScanConfig.codeSecurity.patterns,
      ...((options.codeSecurity && options.codeSecurity.patterns) || {})
    };
    this.options.codeSecurity.excludedFiles = (
      options.codeSecurity && options.codeSecurity.excludedFiles
    ) || SecurityScanConfig.codeSecurity.excludedFiles;

    this.options.dependencySecurity = {
      ...SecurityScanConfig.dependencySecurity,
      ...(options.dependencySecurity || {})
    };

    this.options.configSecurity = {
      ...SecurityScanConfig.configSecurity,
      ...(options.configSecurity || {})
    };
    this.options.configSecurity.checks = {
      ...SecurityScanConfig.configSecurity.checks,
      ...((options.configSecurity && options.configSecurity.checks) || {})
    };

    this.options.networkSecurity = {
      ...SecurityScanConfig.networkSecurity,
      ...(options.networkSecurity || {})
    };
    this.options.networkSecurity.checks = {
      ...SecurityScanConfig.networkSecurity.checks,
      ...((options.networkSecurity && options.networkSecurity.checks) || {})
    };
    this.options.networkSecurity.checks.openPorts = {
      ...SecurityScanConfig.networkSecurity.checks.openPorts,
      ...((options.networkSecurity && options.networkSecurity.checks && options.networkSecurity.checks.openPorts) || {})
    };
    this.options.networkSecurity.checks.sslTls = {
      ...SecurityScanConfig.networkSecurity.checks.sslTls,
      ...((options.networkSecurity && options.networkSecurity.checks && options.networkSecurity.checks.sslTls) || {})
    };
    
    this.scanResults = {
      codeSecurity: { issues: [], summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 } },
      dependencySecurity: { issues: [], summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 } },
      configSecurity: { issues: [], summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 } },
      networkSecurity: { issues: [], summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 } }
    };
    
    this.scanStartTime = null;
    this.scanEndTime = null;
  }
  
  /**
   * 执行完整安全扫描
   */
  async runFullScan(projectPath = process.cwd()) {
    this.scanStartTime = Date.now();
    this.emit('scan-started', { projectPath });
    
    try {
      // 代码安全扫描
      if (this.options.codeSecurity.enabled) {
        await this.scanCodeSecurity(projectPath);
      }
      
      // 依赖安全扫描
      if (this.options.dependencySecurity.enabled) {
        await this.scanDependencySecurity(projectPath);
      }
      
      // 配置安全扫描
      if (this.options.configSecurity.enabled) {
        await this.scanConfigSecurity(projectPath);
      }
      
      // 网络安全扫描
      if (this.options.networkSecurity.enabled) {
        await this.scanNetworkSecurity(projectPath);
      }
      
      this.scanEndTime = Date.now();
      
      const results = this.generateScanReport();
      this.emit('scan-completed', { results, duration: this.scanEndTime - this.scanStartTime });
      
      return results;
      
    } catch (error) {
      this.emit('scan-error', { error: error.message });
      throw error;
    }
  }
  
  /**
   * 代码安全扫描
   */
  async scanCodeSecurity(projectPath) {
    this.emit('scan-progress', { phase: 'code-security', status: 'started' });
    
    const codeFiles = this.findCodeFiles(projectPath);
    const issues = [];
    
    for (const filePath of codeFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileIssues = this.analyzeCodeSecurity(content, filePath);
        issues.push(...fileIssues);
      } catch (error) {
        this.emit('warning', `Failed to read file ${filePath}: ${error.message}`);
      }
    }
    
    this.scanResults.codeSecurity.issues = issues;
    this.scanResults.codeSecurity.summary = this.calculateSummary(issues);
    
    this.emit('scan-progress', { phase: 'code-security', status: 'completed', issuesFound: issues.length });
  }
  
  /**
   * 查找代码文件
   */
  findCodeFiles(projectPath) {
    const codeFiles = [];
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css', '.json', '.yml', '.yaml'];
    
    const scanDirectory = (dirPath) => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(projectPath, fullPath);
          
          // 检查是否应该排除
          if (this.shouldExcludeFile(relativePath)) {
            continue;
          }
          
          if (entry.isDirectory()) {
            scanDirectory(fullPath);
          } else if (entry.isFile() && extensions.some(ext => fullPath.endsWith(ext))) {
            codeFiles.push(fullPath);
          }
        }
      } catch (error) {
        this.emit('warning', `Failed to scan directory ${dirPath}: ${error.message}`);
      }
    };
    
    scanDirectory(projectPath);
    return codeFiles;
  }
  
  /**
   * 检查文件是否应该排除
   */
  shouldExcludeFile(relativePath) {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const patterns = this.options.codeSecurity && this.options.codeSecurity.excludedFiles
      ? this.options.codeSecurity.excludedFiles
      : SecurityScanConfig.codeSecurity.excludedFiles;

    return patterns.some(pattern => {
      const regex = new RegExp(
        pattern.replace(/\*\*/g, '.*')
               .replace(/\*/g, '[^/]*')
               .replace(/\?/g, '[^/]'),
        'i'
      );
      return regex.test(normalizedPath);
    });
  }
  
  /**
   * 分析代码安全性
   */
  analyzeCodeSecurity(content, filePath) {
    const issues = [];
    const lines = content.split('\n');
    
    // 检查危险函数
    for (const [category, patterns] of Object.entries(this.options.codeSecurity.patterns)) {
      for (const pattern of patterns) {
        let match;
        const regex = new RegExp(pattern, 'gi');
        
        while ((match = regex.exec(content)) !== null) {
          const lineNumber = this.getLineNumber(content, match.index);
          const severity = this.getSeverity(category, match[0]);
          
          issues.push({
            type: 'code-security',
            category,
            severity,
            file: filePath,
            line: lineNumber,
            column: match.index - content.lastIndexOf('\n', match.index) - 1,
            match: match[0],
            description: this.getDescription(category, match[0]),
            recommendation: this.getRecommendation(category, match[0])
          });
        }
      }
    }
    
    return issues;
  }
  
  /**
   * 获取行号
   */
  getLineNumber(content, index) {
    const lines = content.substring(0, index).split('\n');
    return lines.length;
  }
  
  /**
   * 获取严重程度
   */
  getSeverity(category, match) {
    const severityMap = {
      dangerousFunctions: 'HIGH',
      sensitiveData: 'CRITICAL',
      insecureRequests: 'MEDIUM',
      weakCrypto: 'HIGH'
    };
    
    return severityMap[category] || 'MEDIUM';
  }
  
  /**
   * 获取描述
   */
  getDescription(category, match) {
    const descriptions = {
      dangerousFunctions: `Dangerous function detected: ${match}`,
      sensitiveData: `Sensitive data exposed: ${match}`,
      insecureRequests: `Insecure network request: ${match}`,
      weakCrypto: `Weak cryptographic algorithm: ${match}`
    };
    
    return descriptions[category] || `Security issue detected: ${match}`;
  }
  
  /**
   * 获取建议
   */
  getRecommendation(category, match) {
    const recommendations = {
      dangerousFunctions: 'Avoid using dangerous functions. Use safer alternatives or implement proper input validation.',
      sensitiveData: 'Remove hardcoded sensitive data. Use environment variables or secure configuration management.',
      insecureRequests: 'Use HTTPS instead of HTTP for all network communications.',
      weakCrypto: 'Use strong cryptographic algorithms (SHA-256, AES-256, etc.) instead of weak ones.'
    };
    
    return recommendations[category] || 'Review and fix the security issue.';
  }
  
  /**
   * 依赖安全扫描
   */
  async scanDependencySecurity(projectPath) {
    this.emit('scan-progress', { phase: 'dependency-security', status: 'started' });
    
    const issues = [];
    
    try {
      // 检查 package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // 检查漏洞
        if (this.options.dependencySecurity.checkVulnerabilities) {
          const vulnIssues = await this.checkVulnerabilities(projectPath);
          issues.push(...vulnIssues);
        }
        
        // 检查许可证
        if (this.options.dependencySecurity.checkLicenses) {
          const licenseIssues = await this.checkLicenses(projectPath);
          issues.push(...licenseIssues);
        }
      }
      
    } catch (error) {
      this.emit('warning', `Dependency security scan failed: ${error.message}`);
    }
    
    this.scanResults.dependencySecurity.issues = issues;
    this.scanResults.dependencySecurity.summary = this.calculateSummary(issues);
    
    this.emit('scan-progress', { phase: 'dependency-security', status: 'completed', issuesFound: issues.length });
  }
  
  /**
   * 检查漏洞
   */
  async checkVulnerabilities(projectPath) {
    const issues = [];
    
    try {
      // 使用 npm audit 检查漏洞
      const auditResult = await this.runCommand('npm', ['audit', '--json'], { cwd: projectPath });
      const auditData = JSON.parse(auditResult.stdout);
      
      if (auditData.vulnerabilities) {
        for (const [packageName, vulnerability] of Object.entries(auditData.vulnerabilities)) {
          issues.push({
            type: 'dependency-security',
            category: 'vulnerability',
            severity: this.mapNpmSeverity(vulnerability.severity),
            package: packageName,
            version: vulnerability.version,
            title: vulnerability.title,
            url: vulnerability.url,
            description: vulnerability.description,
            fixAvailable: vulnerability.fixAvailable,
            recommendation: vulnerability.fixAvailable ? 
              `Update to version ${vulnerability.fixAvailable.version}` : 
              'No fix available. Consider alternative packages.'
          });
        }
      }
      
    } catch (error) {
      this.emit('warning', `Vulnerability check failed: ${error.message}`);
    }
    
    return issues;
  }
  
  /**
   * 检查许可证
   */
  async checkLicenses(projectPath) {
    const issues = [];
    
    try {
      // 使用 license-checker 检查许可证
      const licenseResult = await this.runCommand('npx', ['license-checker', '--json'], { cwd: projectPath });
      const licenseData = JSON.parse(licenseResult.stdout);
      
      for (const [packageName, packageInfo] of Object.entries(licenseData)) {
        if (packageInfo.licenses) {
          const licenses = Array.isArray(packageInfo.licenses) ? packageInfo.licenses : [packageInfo.licenses];
          
          for (const license of licenses) {
            if (this.options.dependencySecurity.blockedLicenses.includes(license)) {
              issues.push({
                type: 'dependency-security',
                category: 'license',
                severity: 'HIGH',
                package: packageName,
                version: packageInfo.version,
                license: license,
                description: `Package uses blocked license: ${license}`,
                recommendation: 'Replace with a package using a compatible license.'
              });
            }
          }
        }
      }
      
    } catch (error) {
      this.emit('warning', `License check failed: ${error.message}`);
    }
    
    return issues;
  }
  
  /**
   * 映射 npm 严重程度
   */
  mapNpmSeverity(npmSeverity) {
    const severityMap = {
      'low': 'LOW',
      'moderate': 'MEDIUM',
      'high': 'HIGH',
      'critical': 'CRITICAL'
    };
    
    return severityMap[npmSeverity] || 'MEDIUM';
  }
  
  /**
   * 配置安全扫描
   */
  async scanConfigSecurity(projectPath) {
    this.emit('scan-progress', { phase: 'config-security', status: 'started' });
    
    const issues = [];
    const checks = (this.options.configSecurity && this.options.configSecurity.checks) 
      ? this.options.configSecurity.checks 
      : SecurityScanConfig.configSecurity.checks;

    // 检查敏感文件权限
    if (checks.filePermissions) {
      const permissionIssues = this.checkFilePermissions(projectPath);
      issues.push(...permissionIssues);
    }
    
    // 检查不安全配置
    if (checks.insecureConfigs) {
      const configIssues = this.checkInsecureConfigs(projectPath);
      issues.push(...configIssues);
    }
    
    this.scanResults.configSecurity.issues = issues;
    this.scanResults.configSecurity.summary = this.calculateSummary(issues);
    
    this.emit('scan-progress', { phase: 'config-security', status: 'completed', issuesFound: issues.length });
  }
  
  /**
   * 检查文件权限
   */
  checkFilePermissions(projectPath) {
    const issues = [];
    
    for (const [pattern, files] of Object.entries(this.options.configSecurity.checks.filePermissions)) {
      for (const filePattern of files) {
        const matchingFiles = this.findFiles(projectPath, filePattern);
        
        for (const filePath of matchingFiles) {
          try {
            const stats = fs.statSync(filePath);
            const mode = stats.mode;
            
            // 检查其他用户权限
            const othersRead = (mode & fs.constants.S_IROTH) !== 0;
            const othersWrite = (mode & fs.constants.S_IWOTH) !== 0;
            const othersExecute = (mode & fs.constants.S_IXOTH) !== 0;
            
            if (pattern === 'maxReadableByOthers' && othersRead) {
              issues.push({
                type: 'config-security',
                category: 'file-permissions',
                severity: 'HIGH',
                file: filePath,
                description: `Sensitive file is readable by others: ${filePath}`,
                recommendation: 'Restrict file permissions to owner only.'
              });
            }
            
            if (pattern === 'maxWritableByOthers' && othersWrite) {
              issues.push({
                type: 'config-security',
                category: 'file-permissions',
                severity: 'CRITICAL',
                file: filePath,
                description: `Configuration file is writable by others: ${filePath}`,
                recommendation: 'Restrict file permissions to owner only.'
              });
            }
            
          } catch (error) {
            this.emit('warning', `Failed to check permissions for ${filePath}: ${error.message}`);
          }
        }
      }
    }
    
    return issues;
  }
  
  /**
   * 检查不安全配置
   */
  checkInsecureConfigs(projectPath) {
    const issues = [];
    
    for (const config of this.options.configSecurity.checks.insecureConfigs) {
      const filePath = path.join(projectPath, config.file);
      
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          if (config.pattern.test(content)) {
            issues.push({
              type: 'config-security',
              category: 'insecure-config',
              severity: config.severity,
              file: filePath,
              description: `Insecure configuration detected in ${config.file}`,
              recommendation: 'Review and update the configuration to improve security.'
            });
          }
          
        } catch (error) {
          this.emit('warning', `Failed to check config file ${filePath}: ${error.message}`);
        }
      }
    }
    
    return issues;
  }
  
  /**
   * 网络安全扫描
   */
  async scanNetworkSecurity(projectPath) {
    this.emit('scan-progress', { phase: 'network-security', status: 'started' });
    
    const issues = [];
    
    try {
      // 检查开放端口
      if (this.options.networkSecurity.checks.openPorts) {
        const portIssues = await this.checkOpenPorts(projectPath);
        issues.push(...portIssues);
      }
      
      // 检查SSL/TLS配置
      if (this.options.networkSecurity.checks.sslTls) {
        const sslIssues = await this.checkSslTls(projectPath);
        issues.push(...sslIssues);
      }
      
      // 检查Docker配置
      const dockerIssues = await this.checkDockerSecurity(projectPath);
      issues.push(...dockerIssues);
      
      // 检查Kubernetes配置
      const k8sIssues = await this.checkKubernetesSecurity(projectPath);
      issues.push(...k8sIssues);
      
    } catch (error) {
      this.emit('warning', `Network security scan failed: ${error.message}`);
    }
    
    this.scanResults.networkSecurity.issues = issues;
    this.scanResults.networkSecurity.summary = this.calculateSummary(issues);
    
    this.emit('scan-progress', { phase: 'network-security', status: 'completed', issuesFound: issues.length });
  }
  
  /**
   * 检查开放端口
   */
  async checkOpenPorts(projectPath) {
    const issues = [];
    
    try {
      // 检查常见的配置文件中暴露的端口
      const configFiles = [
        'docker-compose.yml',
        'docker-compose.yaml',
        'Dockerfile',
        '.env',
        'package.json',
        'server.js',
        'app.js'
      ];
      
      for (const file of configFiles) {
        const filePath = path.join(projectPath, file);
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // 查找端口配置
            const portPattern = /(?:port|PORT)\s*[:=]\s*(\d+)/g;
            let match;
            
            while ((match = portPattern.exec(content)) !== null) {
              const port = parseInt(match[1]);
              
              if (this.options.networkSecurity.checks.openPorts.dangerousPorts.includes(port)) {
                issues.push({
                  type: 'network-security',
                  category: 'open-port',
                  severity: 'CRITICAL',
                  file: filePath,
                  port: port,
                  description: `Dangerous port exposed: ${port}`,
                  recommendation: 'Avoid using dangerous ports. Use port mapping or firewall rules to restrict access.'
                });
              } else if (this.options.networkSecurity.checks.openPorts.commonPorts.includes(port)) {
                issues.push({
                  type: 'network-security',
                  category: 'open-port',
                  severity: 'MEDIUM',
                  file: filePath,
                  port: port,
                  description: `Common port exposed: ${port}`,
                  recommendation: 'Ensure proper authentication and authorization for this port.'
                });
              }
            }
          } catch (error) {
            this.emit('warning', `Failed to check file ${filePath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.emit('warning', `Open port check failed: ${error.message}`);
    }
    
    return issues;
  }
  
  /**
   * 检查SSL/TLS配置
   */
  async checkSslTls(projectPath) {
    const issues = [];
    
    try {
      // 检查HTTPS配置
      const configFiles = [
        'docker-compose.yml',
        'docker-compose.yaml',
        'nginx.conf',
        'apache2.conf',
        '.env',
        'server.js',
        'app.js'
      ];
      
      for (const file of configFiles) {
        const filePath = path.join(projectPath, file);
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // 检查HTTP URL
            const httpPattern = /http:\/\/[^"'\s]+/gi;
            let match;
            
            while ((match = httpPattern.exec(content)) !== null) {
              issues.push({
                type: 'network-security',
                category: 'insecure-protocol',
                severity: 'HIGH',
                file: filePath,
                url: match[0],
                description: `Insecure protocol detected: ${match[0]}`,
                recommendation: 'Use HTTPS instead of HTTP for all communications.'
              });
            }
            
            // 检查弱SSL/TLS配置
            const sslPattern = /(?:ssl_version|tls_version|ssl_protocols)\s*[:=]\s*["']([^"']+)["']/gi;
            
            while ((match = sslPattern.exec(content)) !== null) {
              const protocols = match[1];
              
              for (const weakProtocol of this.options.networkSecurity.checks.sslTls.weakProtocols) {
                if (protocols.includes(weakProtocol)) {
                  issues.push({
                    type: 'network-security',
                    category: 'weak-ssl-tls',
                    severity: 'HIGH',
                    file: filePath,
                    protocol: weakProtocol,
                    description: `Weak SSL/TLS protocol detected: ${weakProtocol}`,
                    recommendation: 'Disable weak SSL/TLS protocols. Use TLS 1.2 or higher.'
                  });
                }
              }
            }
          } catch (error) {
            this.emit('warning', `Failed to check file ${filePath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.emit('warning', `SSL/TLS check failed: ${error.message}`);
    }
    
    return issues;
  }
  
  /**
   * 检查Docker安全配置
   */
  async checkDockerSecurity(projectPath) {
    const issues = [];
    
    try {
      const dockerFiles = [
        'docker-compose.yml',
        'docker-compose.yaml',
        'Dockerfile'
      ];
      
      for (const file of dockerFiles) {
        const filePath = path.join(projectPath, file);
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // 检查特权模式
            if (content.includes('privileged: true')) {
              issues.push({
                type: 'network-security',
                category: 'docker-privileged',
                severity: 'CRITICAL',
                file: filePath,
                description: 'Docker container running in privileged mode',
                recommendation: 'Avoid running containers in privileged mode. Use specific capabilities instead.'
              });
            }
            
            // 检查root用户
            if (file === 'Dockerfile' && content.includes('USER root')) {
              issues.push({
                type: 'network-security',
                category: 'docker-root-user',
                severity: 'HIGH',
                file: filePath,
                description: 'Docker container running as root user',
                recommendation: 'Create and use a non-root user in the container.'
              });
            }
            
            // 检查敏感数据挂载
            const sensitiveMountPattern = /-\s*(\/(?:var\/run\/docker\.sock|etc\/passwd|etc\/shadow|etc\/hosts))/g;
            let match;
            
            while ((match = sensitiveMountPattern.exec(content)) !== null) {
              issues.push({
                type: 'network-security',
                category: 'docker-sensitive-mount',
                severity: 'HIGH',
                file: filePath,
                mount: match[1],
                description: `Sensitive file mounted in container: ${match[1]}`,
                recommendation: 'Avoid mounting sensitive files in containers.'
              });
            }
          } catch (error) {
            this.emit('warning', `Failed to check Docker file ${filePath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.emit('warning', `Docker security check failed: ${error.message}`);
    }
    
    return issues;
  }
  
  /**
   * 检查Kubernetes安全配置
   */
  async checkKubernetesSecurity(projectPath) {
    const issues = [];
    
    try {
      const k8sDir = path.join(projectPath, 'k8s');
      if (!fs.existsSync(k8sDir)) {
        return issues;
      }
      
      const k8sFiles = this.findFiles(k8sDir, '*.yaml');
      
      for (const filePath of k8sFiles) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // 检查特权容器
          if (content.includes('privileged: true')) {
            issues.push({
              type: 'network-security',
              category: 'k8s-privileged',
              severity: 'CRITICAL',
              file: filePath,
              description: 'Kubernetes pod/container running in privileged mode',
              recommendation: 'Avoid running pods/containers in privileged mode. Use specific capabilities instead.'
            });
          }
          
          // 检查hostNetwork
          if (content.includes('hostNetwork: true')) {
            issues.push({
              type: 'network-security',
              category: 'k8s-host-network',
              severity: 'HIGH',
              file: filePath,
              description: 'Kubernetes pod using host network',
              recommendation: 'Avoid using host network unless absolutely necessary.'
            });
          }
          
          // 检查hostPID
          if (content.includes('hostPID: true')) {
            issues.push({
              type: 'network-security',
              category: 'k8s-host-pid',
              severity: 'HIGH',
              file: filePath,
              description: 'Kubernetes pod sharing host PID namespace',
              recommendation: 'Avoid sharing host PID namespace.'
            });
          }
          
          // 检查hostIPC
          if (content.includes('hostIPC: true')) {
            issues.push({
              type: 'network-security',
              category: 'k8s-host-ipc',
              severity: 'HIGH',
              file: filePath,
              description: 'Kubernetes pod sharing host IPC namespace',
              recommendation: 'Avoid sharing host IPC namespace.'
            });
          }
        } catch (error) {
          this.emit('warning', `Failed to check Kubernetes file ${filePath}: ${error.message}`);
        }
      }
    } catch (error) {
      this.emit('warning', `Kubernetes security check failed: ${error.message}`);
    }
    
    return issues;
  }
  
  /**
   * 查找文件
   */
  findFiles(projectPath, pattern) {
    const files = [];
    const regex = new RegExp(
      pattern.replace(/\*/g, '[^/]*'),
      'i'
    );
    
    const scanDirectory = (dirPath) => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            scanDirectory(fullPath);
          } else if (entry.isFile() && regex.test(entry.name)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    };
    
    scanDirectory(projectPath);
    return files;
  }
  
  /**
   * 运行命令
   */
  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        ...options
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * 计算摘要
   */
  calculateSummary(issues) {
    const summary = { total: issues.length, critical: 0, high: 0, medium: 0, low: 0 };
    
    for (const issue of issues) {
      summary[issue.severity.toLowerCase()]++;
    }
    
    return summary;
  }
  
  /**
   * 生成扫描报告
   */
  generateScanReport() {
    const totalIssues = Object.values(this.scanResults).reduce((sum, result) => sum + result.summary.total, 0);
    const totalCritical = Object.values(this.scanResults).reduce((sum, result) => sum + result.summary.critical, 0);
    const totalHigh = Object.values(this.scanResults).reduce((sum, result) => sum + result.summary.high, 0);
    const totalMedium = Object.values(this.scanResults).reduce((sum, result) => sum + result.summary.medium, 0);
    const totalLow = Object.values(this.scanResults).reduce((sum, result) => sum + result.summary.low, 0);
    
    return {
      scanTime: {
        start: new Date(this.scanStartTime).toISOString(),
        end: new Date(this.scanEndTime).toISOString(),
        duration: this.scanEndTime - this.scanStartTime
      },
      summary: {
        total: totalIssues,
        critical: totalCritical,
        high: totalHigh,
        medium: totalMedium,
        low: totalLow,
        riskScore: this.calculateRiskScore(totalCritical, totalHigh, totalMedium, totalLow)
      },
      results: this.scanResults,
      recommendations: this.generateRecommendations()
    };
  }
  
  /**
   * 计算风险分数
   */
  calculateRiskScore(critical, high, medium, low) {
    return Math.min(100, (critical * 25) + (high * 10) + (medium * 5) + (low * 1));
  }
  
  /**
   * 生成建议
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.scanResults.codeSecurity.summary.critical > 0) {
      recommendations.push('立即修复代码中的关键安全问题');
    }
    
    if (this.scanResults.dependencySecurity.summary.critical > 0) {
      recommendations.push('更新存在关键漏洞的依赖包');
    }
    
    if (this.scanResults.configSecurity.summary.critical > 0) {
      recommendations.push('修复配置文件中的关键安全问题');
    }
    
    return recommendations;
  }
}

module.exports = {
  SecurityScannerPlugin,
  SecurityScanConfig
};