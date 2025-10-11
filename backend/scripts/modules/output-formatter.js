/**
 * 输出格式化模块
 * 用途: 格式化安全检查结果为不同格式
 */

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('./env-loader');
const { SECURITY_RULES } = require('./security-rules');
const { SEVERITY_WEIGHT, SEVERITY_TO_SARIF_LEVEL, SEVERITY_I18N } = require('./security-constants');

/**
 * 生成格式化输出
 * @param {Object} checkResult 检查结果
 * @param {Object} options 输出选项
 * @returns {string} 格式化后的输出
 */
function generateOutput(checkResult, options = {}) {
  const { summary, metadata, results } = checkResult;
  const { outputFormat = 'table', output, failOn, ci, noPaths } = options;

  let outputPayload = null;

  if (outputFormat === 'json') {
    outputPayload = JSON.stringify({ summary, metadata, results }, null, 2);
  } else if (outputFormat === 'sarif') {
    outputPayload = generateSARIFReport(results, metadata, noPaths);
  } else {
    outputPayload = generateTableOutput(summary, metadata, results, ci, noPaths);
  }

  // 输出到文件（如果指定）
  if (output && outputPayload) {
    try {
      const outputPath = path.isAbsolute(output) ? output : path.join(PROJECT_ROOT, output);
      fs.writeFileSync(outputPath, outputPayload, 'utf8');
      if (!ci) console.log(`结果已写入文件: ${output}`);
    } catch (e) {
      console.error(`写文件失败: ${e.message}`);
    }
  }

  // 输出到控制台（在文件写入之后）
  if (!ci && !output) {
    console.log(outputPayload);
  } else if (!ci && output) {
    // 如果指定了输出文件，只输出摘要信息
    console.log(`\n=== 安全检查摘要 ===\n`);
    console.log(
      `总计: ${summary.total}, 通过: ${summary.passed}, 失败: ${summary.failed}, 通过率: ${summary.passRate}%`,
    );
    console.log(`结果已写入文件: ${output}`);
  }

  return outputPayload;
}

/**
 * 生成表格格式输出
 * @param {Object} summary 摘要
 * @param {Object} metadata 元数据
 * @param {Array} results 结果
 * @param {boolean} ci CI模式
 * @returns {string} 表格格式输出
 */
function generateTableOutput(summary, metadata, results, ci = false, noPaths = false) {
  let output = '';

  if (!ci) {
    output += '\n=== 安全检查结果 ===\n';
    output += `总计: ${summary.total}, 通过: ${summary.passed}, 失败: ${summary.failed}, 通过率: ${summary.passRate}%\n`;
    output += `环境: ${metadata.environment}, 起始: ${metadata.startTime}, 结束: ${metadata.endTime}, 持续: ${metadata.durationMs}ms\n`;
    if (metadata.envFile) output += `环境文件: ${metadata.envFile}\n`;

    // 添加严重级别统计 - 使用英文键，但显示中文标签
    output += `\n严重级别统计: 严重: ${summary.severityBreakdown.critical || 0}, 高: ${summary.severityBreakdown.high || 0}, 中: ${summary.severityBreakdown.medium || 0}, 低: ${summary.severityBreakdown.low || 0}\n`;

    // 输出详细结果表格
    output += '\n| 规则ID | 规则名称 | 类别 | 严重度 | 状态 | 消息 |\n';
    output += '|--------|----------|------|--------|------|------|\n';

    for (const result of results) {
      const status = result.passed ? '✓ 通过' : '✗ 失败';
      const severity = result.severity || 'medium';
      output += `| ${result.id} | ${result.name} | ${result.category} | ${severity} | ${status} | ${result.message} |\n`;
    }
  } else {
    // CI模式只输出摘要
    output += `Security check summary: ${summary.passed}/${summary.total} passed (${summary.passRate}%)\n`;
    if (summary.failed > 0) {
      output += `Failed checks: ${summary.failed}\n`;
    }
  }

  return output;
}

/**
 * 生成SARIF格式报告
 * @param {Array} results 检查结果
 * @param {Object} metadata 元数据
 * @returns {string} SARIF格式报告
 */
function generateSARIFReport(results, metadata, noPaths = false) {
  // 获取仓库基础URL，用于生成完整的文档链接
  const repoBaseUrl = process.env.REPO_BASE_URL || 'https://github.com/example/repo';

  // 创建规则ID到标题文本的映射，用于生成GitHub锚点
  const ruleIdToTitle = {
    'jwt-expiration': 'jwt令牌过期时间检查',
    'jwt-secret-strength': 'jwt密钥强度检查',
    'jwt-format-validation': 'jwt格式验证检查',
    'jwt-refresh-mechanism': 'jwt刷新机制检查',
    'jwt-minimal-payload': 'jwt最小载荷检查',
    'roles-guard': '角色守卫检查',
    'input-length-validation': '输入长度限制检查',
    'input-validation': '输入验证检查',
    'sql-injection-protection': 'sql注入防护检查',
    'password-field-exclusion': '密码字段排除检查',
    'security-headers': '安全响应头检查',
    'cors-config': 'cors配置检查',
    'csrf-protection': 'csrf防护检查',
    'password-hash': '密码哈希检查',
    'audit-logging': '审计日志检查',
    'database-indexes': '数据库索引检查',
    'transaction-usage': '事务使用检查',
    'transaction-rollback': '事务回滚检查',
    'session-management': '会话管理检查',
    'rate-limiting': '速率限制检查',
    'ssrf-protection': 'ssrf防护检查',
    'dependency-vulnerability': '依赖项漏洞检查',
    'file-upload-security': '文件上传安全检查',
    'path-traversal-protection': '路径遍历防护检查',
    'evidence-validation': '证据有效性检查',
  };

  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'security-check',
            version: '1.0.0',
            informationUri: `${repoBaseUrl}/blob/main/SECURITY_CHECKLIST.md`,
            rules: Object.keys(SECURITY_RULES).map(id => {
              // 使用规则ID生成GitHub锚点，避免中文编码问题
              // GitHub会自动处理标题中的中文字符，所以我们使用更可靠的ID格式
              const anchor = `rule-${id}`;

              return {
                id,
                name: SECURITY_RULES[id].name,
                shortDescription: { text: SECURITY_RULES[id].description },
                fullDescription: { text: SECURITY_RULES[id].description },
                helpUri: `${repoBaseUrl}/blob/main/SECURITY_CHECKLIST.md#${anchor}`,
                properties: {
                  category: SECURITY_RULES[id].category,
                  severity: SECURITY_RULES[id].severity || 'medium',
                  standards: SECURITY_RULES[id].standards || [],
                  weight: SEVERITY_WEIGHT[SECURITY_RULES[id].severity || 'medium'],
                },
                defaultConfiguration: {
                  level:
                    (SECURITY_RULES[id]?.severity || 'medium') === 'critical'
                      ? 'error'
                      : (SECURITY_RULES[id]?.severity || 'medium') === 'high'
                        ? 'error'
                        : 'warning',
                },
              };
            }),
          },
        },
        results: results.map(r => {
          // 构建位置信息
          let locations = [];

          if (!noPaths && r.files && r.files.length > 0) {
            locations = r.files.map(filePath => {
              // 获取相对路径
              const relativePath = path.relative(PROJECT_ROOT, filePath);

              // 尝试找到具体行号
              let lineNumber = 1;
              if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n');

                // 根据规则ID查找相关行
                switch (r.id) {
                  case 'jwt-expiration':
                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].includes('exp:') || lines[i].includes('expiresIn:')) {
                        lineNumber = i + 1;
                        break;
                      }
                    }
                    break;
                  case 'jwt-secret-strength':
                    // 环境变量检查不对应具体代码行
                    break;
                  case 'jwt-format-validation':
                    for (let i = 0; i < lines.length; i++) {
                      if (
                        lines[i].includes('extractTokenFromHeader') ||
                        lines[i].includes('Bearer')
                      ) {
                        lineNumber = i + 1;
                        break;
                      }
                    }
                    break;
                  case 'sql-injection-protection':
                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].includes('SELECT') && lines[i].includes('${')) {
                        lineNumber = i + 1;
                        break;
                      }
                    }
                    break;
                  case 'security-headers':
                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].includes('helmet(') || lines[i].includes('HelmetMiddleware')) {
                        lineNumber = i + 1;
                        break;
                      }
                    }
                    break;
                  case 'cors-config':
                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].includes('enableCors(')) {
                        lineNumber = i + 1;
                        break;
                      }
                    }
                    break;
                  case 'csrf-protection':
                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].includes('csurf') || lines[i].includes('Csrf')) {
                        lineNumber = i + 1;
                        break;
                      }
                    }
                    break;
                  case 'password-hash':
                    for (let i = 0; i < lines.length; i++) {
                      if (
                        lines[i].includes('bcrypt.hash(') ||
                        lines[i].includes('bcrypt.genSalt(')
                      ) {
                        lineNumber = i + 1;
                        break;
                      }
                    }
                    break;
                  case 'transaction-usage':
                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].includes('manager.transaction')) {
                        lineNumber = i + 1;
                        break;
                      }
                    }
                    break;
                }
              }

              return {
                physicalLocation: {
                  artifactLocation: {
                    uri: relativePath.replace(/\\/g, '/'), // 确保使用正斜杠
                  },
                  region: {
                    startLine: lineNumber,
                  },
                },
              };
            });
          }

          return {
            ruleId: r.id,
            level: r.passed
              ? 'note'
              : SEVERITY_TO_SARIF_LEVEL[r.severity || SECURITY_RULES[r.id]?.severity || 'medium'],
            message: {
              text: r.message,
              markdown: r.passed ? `✅ **PASS** - ${r.message}` : `❌ **FAIL** - ${r.message}`,
            },
            kind: r.passed ? 'pass' : 'fail',
            properties: {
              severity: r.severity || SECURITY_RULES[r.id]?.severity || 'medium',
              weight: SEVERITY_WEIGHT[r.severity || SECURITY_RULES[r.id]?.severity || 'medium'],
              exemption: r.exemption || false,
            },
            locations: locations.length > 0 ? locations : undefined,
          };
        }),
        invocations: [
          {
            executionSuccessful: true,
            startTimeUtc: metadata.startTime,
            endTimeUtc: metadata.endTime,
            properties: {
              ...metadata,
              summary: {
                total: results.length,
                passed: results.filter(r => r.passed).length,
                failed: results.filter(r => !r.passed).length,
                severityBreakdown: {
                  critical: results.filter(
                    r => (r.severity || SECURITY_RULES[r.id]?.severity || 'medium') === 'critical',
                  ).length,
                  high: results.filter(
                    r => (r.severity || SECURITY_RULES[r.id]?.severity || 'medium') === 'high',
                  ).length,
                  medium: results.filter(
                    r => (r.severity || SECURITY_RULES[r.id]?.severity || 'medium') === 'medium',
                  ).length,
                  low: results.filter(
                    r => (r.severity || SECURITY_RULES[r.id]?.severity || 'medium') === 'low',
                  ).length,
                },
              },
            },
          },
        ],
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

/**
 * 检查是否应该失败
 * @param {Array} results 检查结果
 * @param {string} failOn 失败阈值
 * @returns {boolean} 是否应该失败
 */
function shouldFail(results, failOn) {
  // 失败阈值处理
  // 严重度映射：critical(严重) > high(高) > medium(中) > low(低)

  const threshold = failOn ? SEVERITY_WEIGHT[failOn] || SEVERITY_WEIGHT.medium : null;
  const failedResults = results.filter(r => !r.passed);

  return threshold == null
    ? failedResults.length > 0
    : failedResults.some(
        r =>
          (SEVERITY_WEIGHT[r.severity || SECURITY_RULES[r.id]?.severity || 'medium'] || 2) >=
          threshold,
      );
}

/**
 * 获取失败退出码
 * @param {Array} results 检查结果
 * @param {string} failOn 失败阈值
 * @returns {number} 退出码
 */
function getExitCode(results, failOn) {
  // 退出码策略: critical(2) > high(1) > medium/low(1)
  // 任何失败都会返回非零退出码，严重级别失败返回2，其他失败返回1

  const threshold = failOn ? SEVERITY_WEIGHT[failOn] || SEVERITY_WEIGHT.medium : null;
  const failedResults = results.filter(r => !r.passed);

  if (!shouldFail(results, failOn)) {
    return 0;
  }

  // 检查是否有严重或高危失败
  const hasCriticalFailures = failedResults.some(r => {
    const severity = r.severity || SECURITY_RULES[r.id]?.severity || 'medium';
    return severity === 'critical';
  });

  const hasHighFailures = failedResults.some(r => {
    const severity = r.severity || SECURITY_RULES[r.id]?.severity || 'medium';
    return severity === 'high';
  });

  if (hasCriticalFailures) {
    return 2; // 严重级别失败
  } else if (hasHighFailures) {
    return 1; // 高级别失败
  } else {
    return 1; // 中/低级别失败
  }
}

module.exports = {
  generateOutput,
  generateTableOutput,
  generateSARIFReport,
  shouldFail,
  getExitCode,
};
