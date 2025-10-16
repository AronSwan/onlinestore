#!/usr/bin/env node
/**
 * Terminal Anomaly Detector - 终端异常检测器
 * 
 * ## 目标与范围
 * - 目标：智能识别"测试看似通过但与常识/事实矛盾"的终端输出片段，生成结构化摘要
 * - 范围：异常检测、逻辑验证、质量门禁、CI/CD集成
 * 
 * ## 核心原则
 * - 系统性思维：从异常检测到根因分析的全流程覆盖
 * - 质量第一：确保测试结果的真实性和可靠性
 * - 安全边界：严格模式下的非零退出码机制
 * - 持续改进：结构化输出便于后续分析和优化
 *
 * 默认读取：backend/run.out、backend/run.err
 * 输出摘要：backend/test-output/<timestamp>-anomaly-summary.json
 *
 * 用法：
 *   node backend/scripts/ci/terminal-anomaly-detector.cjs
 *   node backend/scripts/ci/terminal-anomaly-detector.cjs --out=backend/run.out --err=backend/run.err
 *   node backend/scripts/ci/terminal-anomaly-detector.cjs --strict  # 若发现异常，以非零退出码结束
 */

const fs = require('fs');
const path = require('path');

// ==================== 核心功能模块 ====================

/**
 * 安全读取文件，避免因文件不存在导致的异常
 */
function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return '';
  }
}

/**
 * 获取字符串尾部内容，用于证据展示
 */
function tail(str, max = 2000) {
  if (!str) return '';
  const len = str.length;
  if (len <= max) return str;
  return str.slice(len - max);
}

/**
 * 解析命令行参数，支持灵活配置
 */
function parseArgs(argv) {
  const options = { out: 'backend/run.out', err: 'backend/run.err', strict: false };
  for (const arg of argv) {
    if (arg.startsWith('--out=')) options.out = arg.slice('--out='.length);
    else if (arg.startsWith('--err=')) options.err = arg.slice('--err='.length);
    else if (arg === '--strict') options.strict = true;
  }
  return options;
}

/**
 * 检测测试通过的指示器，识别虚假成功
 */
function detectPassIndicators(text) {
  if (!text) return false;
  const patterns = [
    /Test Suites:\s*\d+\s*passed/i,
    /Tests:\s*\d+\s*passed/i,
    /All tests passed/i,
    /PASS\b/i,
    /OK\b/i,
  ];
  return patterns.some((re) => re.test(text));
}

/**
 * 异常检测规则库 - 基于业务逻辑和常识的矛盾识别
 */
const ANOMALY_RULES = [
  { 
    id: 'success_with_error', 
    desc: '成功外壳+错误语义', 
    regex: /(\b200\b|\bOK\b|success)[\s\S]{0,120}(error|failed|exception|rollback|invalid)/i,
    severity: 'high'
  },
  { 
    id: 'error_with_success', 
    desc: '错误语义+成功外壳', 
    regex: /(error|failed|exception|rollback|invalid)[\s\S]{0,120}(success|\bOK\b|\b200\b)/i,
    severity: 'high'
  },
  { 
    id: 'inventory_negative', 
    desc: '库存为负', 
    regex: /(库存|inventory|stock)[^\n]{0,60}-\d+/i,
    severity: 'critical'
  },
  { 
    id: 'balance_negative', 
    desc: '余额为负', 
    regex: /(余额|balance)[^\n]{0,60}-\d+/i,
    severity: 'critical'
  },
  { 
    id: 'idempotency_broken', 
    desc: '幂等性破坏', 
    regex: /(幂等|idempotent)[^\n]{0,80}(重复|duplicate|double)/i,
    severity: 'medium'
  },
  { 
    id: 'auth_bypass', 
    desc: '权限被绕过', 
    regex: /(未授权|unauthorized|forbidden)[\s\S]{0,120}(成功|success|created)/i,
    severity: 'critical'
  },
  { 
    id: 'rollback_commit_both', 
    desc: '同时出现rollback与commit', 
    regex: /(rollback)[\s\S]{0,80}(commit)|(commit)[\s\S]{0,80}(rollback)/i,
    severity: 'medium'
  },
  { 
    id: 'timeout_then_success', 
    desc: '超时后仍宣称成功', 
    regex: /(Exceeded timeout|timeout)[\s\S]{0,120}(success|\bOK\b)/i,
    severity: 'high'
  },
];

/**
 * 查找所有异常模式，返回结构化异常信息
 */
function findAnomalies(textAll) {
  const anomalies = [];
  if (!textAll) return anomalies;

  for (const rule of ANOMALY_RULES) {
    const m = textAll.match(rule.regex);
    if (m) {
      const idx = m.index || 0;
      const start = Math.max(0, idx - 200);
      const end = Math.min(textAll.length, idx + 200);
      const snippet = textAll.slice(start, end);
      anomalies.push({ 
        type: rule.id, 
        desc: rule.desc, 
        severity: rule.severity,
        evidence: snippet,
        position: idx
      });
    }
  }
  return anomalies;
}

/**
 * 生成结构化摘要报告
 */
function generateSummary(options, outText, errText, passSeen, anomalies) {
  const combined = `${outText}\n\n===== STDERR =====\n\n${errText}`;
  
  return {
    timestamp: new Date().toISOString(),
    metadata: {
      tool: 'terminal-anomaly-detector',
      version: '1.0.0',
      strictMode: options.strict
    },
    files: {
      out: { path: options.out, exists: !!outText, size: outText.length },
      err: { path: options.err, exists: !!errText, size: errText.length },
    },
    analysis: {
      verdict: anomalies.length > 0 ? (passSeen ? 'PASS_WITH_ANOMALY' : 'SUSPECT_OUTPUT') : (passSeen ? 'PASS' : 'UNKNOWN'),
      errorCategory: anomalies.length > 0 ? 'logic-mismatch' : 'none',
      anomalyCount: anomalies.length,
      passIndicatorsFound: passSeen,
      context: {
        note: anomalies.length > 0 ? '终端输出颠三倒四/常识冲突（需人工复核）' : '未检测到异常签名',
        recommendation: anomalies.length > 0 ? '建议进行根因分析和代码审查' : '可继续后续流程'
      },
    },
    anomalies: anomalies,
    evidenceTail: {
      stdoutTail: tail(outText, 2000),
      stderrTail: tail(errText, 2000),
    },
    performance: {
      totalTextLength: combined.length,
      analysisTime: new Date().toISOString()
    }
  };
}

/**
 * 保存摘要报告到文件系统
 */
function saveSummary(summary, outDir) {
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (_) {}
  
  const fileName = `${Date.now()}-anomaly-summary.json`;
  const outPath = path.join(outDir, fileName);
  
  try {
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
    return outPath;
  } catch (e) {
    console.error('保存摘要文件失败:', e.message);
    return null;
  }
}

/**
 * 输出检测结果到控制台
 */
function reportResults(anomalies, outPath, options) {
  if (anomalies.length > 0) {
    console.log(`🔍 发现 ${anomalies.length} 个常识/逻辑异常签名`);
    console.log(`📄 详细摘要已写入: ${outPath}`);
    
    console.log('\n📋 异常详情:');
    anomalies.forEach((a, i) => {
      console.log(`  [#${i + 1}] ${a.type} - ${a.desc} (严重性: ${a.severity})`);
    });
    
    if (options.strict) {
      console.log('\n🚨 严格模式已启用: 检测到异常，退出码为 2');
      process.exitCode = 2;
    }
  } else {
    console.log(`✅ 未发现异常签名`);
    console.log(`📄 摘要已写入: ${outPath}`);
  }
}

// ==================== 主执行流程 ====================

function main() {
  try {
    // 1. 解析参数
    const options = parseArgs(process.argv.slice(2));
    
    // 2. 读取文件
    const outText = readFileSafe(options.out);
    const errText = readFileSafe(options.err);
    
    // 3. 检测分析
    const passSeen = detectPassIndicators(outText + errText);
    const anomalies = findAnomalies(outText + errText);
    
    // 4. 生成报告
    const summary = generateSummary(options, outText, errText, passSeen, anomalies);
    const outDir = path.resolve('backend/test-output');
    const outPath = saveSummary(summary, outDir);
    
    // 5. 输出结果
    if (outPath) {
      reportResults(anomalies, outPath, options);
    } else {
      console.error('❌ 无法保存检测结果');
      process.exitCode = 1;
    }
    
  } catch (error) {
    console.error('❌ 检测器执行失败:', error.message);
    process.exitCode = 1;
  }
}

// 执行主程序
main();