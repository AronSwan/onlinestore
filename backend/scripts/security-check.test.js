#!/usr/bin/env node

/**
 * 安全检查脚本单元测试
 * 用途: 验证security-check.js的功能
 * 使用方法:
 *   node scripts/security-check.test.js
 */

const fs = require('fs');
const path = require('path');

// 导入要测试的函数
const { 
  runSecurityCheck,
  parseExemptions,
  generateSARIFReport,
  checkBlockingThresholds
} = require('./security-check.js');

// 测试用例
const testCases = [
  {
    name: '基本安全检查',
    description: '验证基本的安全检查功能',
    input: {
      rules: ['jwt-format-validation', 'password-field-exclusion'],
      format: 'json',
      failOn: 'high'
    },
    expected: {
      passed: true,
      results: {
        'jwt-format-validation': { passed: true },
        'password-field-exclusion': { passed: true }
      }
    }
  },
  {
    name: '豁免标记解析',
    description: '验证豁免标记的解析功能',
    input: {
      fileContent: `
// SECURITY-EXEMPTION: RULE:jwt-format-validation, 原因: 兼容性问题, 批准人: 安全团队, 到期日: 2025-12-31
@Injectable()
export class JwtAuthGuard {
  // 代码实现
}

// SECURITY-EXEMPTION: VULN:VULN-001, 原因: 临时方案, 批准人: 技术负责人, 到期日: 2025-11-30
@Injectable()
export class AuthGuard {
  // 代码实现
}
      `
    },
    expected: {
      exemptions: [
        {
          type: 'RULE',
          id: 'jwt-format-validation',
          reason: '兼容性问题',
          approver: '安全团队',
          expiryDate: '2025-12-31',
          isExpired: false
        },
        {
          type: 'VULN',
          id: 'VULN-001',
          reason: '临时方案',
          approver: '技术负责人',
          expiryDate: '2025-11-30',
          isExpired: false
        }
      ]
    }
  },
  {
    name: 'SARIF报告生成',
    description: '验证SARIF报告的生成功能',
    input: {
      results: [
        {
          ruleId: 'jwt-format-validation',
          level: 'error',
          message: { text: 'JWT格式验证失败' },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: 'src/auth/jwt-auth.guard.ts' },
                region: { startLine: 10, endLine: 15 }
              }
            }
          ]
        },
        {
          ruleId: 'password-field-exclusion',
          level: 'warning',
          message: { text: '密码字段可能被序列化' },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: 'src/user/user.entity.ts' },
                region: { startLine: 5, endLine: 8 }
              }
            }
          ]
        }
      ]
    },
    expected: {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'security-check',
              version: '1.0.0',
              informationUri: 'https://github.com/example/security-check'
            }
          },
          results: [
            {
              ruleId: 'jwt-format-validation',
              level: 'error',
              message: { text: 'JWT格式验证失败' },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri: 'src/auth/jwt-auth.guard.ts' },
                    region: { startLine: 10, endLine: 15 }
                  }
                }
              ]
            },
            {
              ruleId: 'password-field-exclusion',
              level: 'warning',
              message: { text: '密码字段可能被序列化' },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri: 'src/user/user.entity.ts' },
                    region: { startLine: 5, endLine: 8 }
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: '阻断阈值检查',
    description: '验证阻断阈值的检查功能',
    input: {
      results: {
        critical: 1,
        high: 2,
        medium: 5,
        low: 10
      },
      thresholds: {
        critical: 1,
        high: 3,
        medium: 10
      }
    },
    expected: {
      blocked: true,
      reasons: ['严重漏洞数量达到阈值 (1)']
    }
  },
  {
    name: '警告阈值检查',
    description: '验证警告阈值的检查功能',
    input: {
      results: {
        critical: 0,
        high: 2,
        medium: 5,
        low: 10
      },
      thresholds: {
        critical: 1,
        high: 3,
        medium: 10
      }
    },
    expected: {
      blocked: false,
      warnings: ['高危漏洞数量达到警告阈值 (2)']
    }
  }
];

// 测试函数
function runTests() {
  console.log('开始运行安全检查脚本测试...\n');
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`测试: ${testCase.name}`);
    console.log(`描述: ${testCase.description}`);
    
    try {
      let result;
      
      switch (testCase.name) {
        case '基本安全检查':
          result = runSecurityCheck(testCase.input);
          if (result.passed === testCase.expected.passed) {
            console.log('✓ 通过');
            passedTests++;
          } else {
            console.log('✗ 失败');
            console.log(`  期望: ${testCase.expected.passed}`);
            console.log(`  实际: ${result.passed}`);
          }
          break;
          
        case '豁免标记解析':
          result = parseExemptions(testCase.input.fileContent);
          if (result.length === testCase.expected.exemptions.length) {
            let allMatch = true;
            for (let i = 0; i < result.length; i++) {
              if (result[i].type !== testCase.expected.exemptions[i].type ||
                  result[i].id !== testCase.expected.exemptions[i].id) {
                allMatch = false;
                break;
              }
            }
            if (allMatch) {
              console.log('✓ 通过');
              passedTests++;
            } else {
              console.log('✗ 失败');
              console.log('  豁免标记解析不匹配');
            }
          } else {
            console.log('✗ 失败');
            console.log(`  期望: ${testCase.expected.exemptions.length} 个豁免标记`);
            console.log(`  实际: ${result.length} 个豁免标记`);
          }
          break;
          
        case 'SARIF报告生成':
          result = generateSARIFReport(testCase.input.results);
          if (result.version === testCase.expected.version &&
              result.runs.length === testCase.expected.runs.length) {
            console.log('✓ 通过');
            passedTests++;
          } else {
            console.log('✗ 失败');
            console.log('  SARIF报告格式不正确');
          }
          break;
          
        case '阻断阈值检查':
        case '警告阈值检查':
          result = checkBlockingThresholds(testCase.input.results, testCase.input.thresholds);
          if (result.blocked === testCase.expected.blocked) {
            console.log('✓ 通过');
            passedTests++;
          } else {
            console.log('✗ 失败');
            console.log(`  期望阻断: ${testCase.expected.blocked}`);
            console.log(`  实际阻断: ${result.blocked}`);
          }
          break;
          
        default:
          console.log('✗ 失败 - 未知测试用例');
      }
    } catch (error) {
      console.log('✗ 失败 - 异常:', error.message);
    }
    
    console.log('');
  }
  
  // 输出测试结果
  console.log(`测试结果: ${passedTests}/${totalTests} 通过`);
  
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