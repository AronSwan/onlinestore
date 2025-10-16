#!/usr/bin/env node

/**
 * 重新设计的用户验证模块
 *
 * 基于新的安全理念：
 * 1. 关注测试本身，而不是用户
 * 2. 透明记录，而不是限制
 * 3. 隔离环境，而不是限制用户
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 全局变量，用于跟踪最近显示的安全建议
let lastRecommendationTime = 0;
const RECOMMENDATION_THROTTLE_MS = 5000; // 5秒内不重复显示相同建议

/**
 * 测试影响评估
 */
function assessTestImpact(testConfig) {
  // 根据测试配置评估对环境的潜在影响
  const impact = {
    level: 'low', // low, medium, high
    areas: [], // filesystem, network, system, database
    description: '',
    recommendations: [],
  };

  // 根据测试类型评估影响
  if (testConfig.type === 'read-only') {
    impact.level = 'low';
    impact.areas = [];
    impact.description = '只读测试，对环境无影响';
    impact.recommendations = ['可以在生产环境中运行'];
  } else if (testConfig.type === 'integration') {
    impact.level = 'medium';
    impact.areas = ['network', 'database'];
    impact.description = '集成测试，可能影响网络和数据库';
    impact.recommendations = ['在测试环境中运行', '确保测试数据隔离'];
  } else if (testConfig.type === 'system') {
    impact.level = 'high';
    impact.areas = ['filesystem', 'network', 'system'];
    impact.description = '系统级测试，可能对系统造成影响';
    impact.recommendations = ['在隔离环境中运行', '避免在生产环境中运行'];
  }

  return impact;
}

/**
 * 检查环境隔离
 */
function checkEnvironmentIsolation() {
  // 检查当前环境是否为隔离环境
  const isolation = {
    isIsolated: false,
    type: 'unknown', // docker, vm, container, native
    details: {},
  };

  try {
    // 检查是否在Docker容器中
    if (fs.existsSync('/.dockerenv')) {
      isolation.isIsolated = true;
      isolation.type = 'docker';
      isolation.details.containerId = fs
        .readFileSync('/proc/self/cgroup', 'utf8')
        .split('\n')
        .find(line => line.includes('docker'))
        ?.split('/')
        ?.pop();
    }

    // 检查是否在虚拟机中
    try {
      const product = execSync('wmic computersystem get model /value', { encoding: 'utf8' });
      if (
        product.includes('VirtualBox') ||
        product.includes('VMware') ||
        product.includes('Hyper-V')
      ) {
        isolation.isIsolated = true;
        isolation.type = 'vm';
        isolation.details.model = product;
      }
    } catch (error) {
      // 忽略错误，可能不是Windows系统
    }

    // 检查其他容器技术
    if (process.env.container) {
      isolation.isIsolated = true;
      isolation.type = 'container';
      isolation.details.container = process.env.container;
    }
  } catch (error) {
    console.warn(`Failed to check environment isolation: ${error.message}`);
  }

  return isolation;
}

/**
 * 记录测试活动
 */
function logTestActivity(user, testConfig, impact, isolation) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    user: {
      username: user.username,
      uid: user.uid,
      gid: user.gid,
      isPrivileged: user.username === 'root' || user.username === 'Administrator',
    },
    test: testConfig,
    impact,
    isolation,
    system: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
    },
  };

  // 写入审计日志
  const logPath = path.join(__dirname, '..', 'reports', 'test-audit-log.json');

  try {
    let logs = [];

    if (fs.existsSync(logPath)) {
      const logData = fs.readFileSync(logPath, 'utf8');
      logs = JSON.parse(logData);
    }

    logs.push(logEntry);

    // 保留最近1000条日志
    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }

    if (!fs.existsSync(path.dirname(logPath))) {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
    }

    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));

    return logPath;
  } catch (error) {
    console.error(`Failed to write test audit log: ${error.message}`);
    return null;
  }
}

/**
 * 提供安全建议
 */
function provideSecurityRecommendations(user, testConfig, impact, isolation) {
  const recommendations = [];

  // 基于用户身份提供建议
  if (user.username === 'root' || user.username === 'Administrator') {
    recommendations.push({
      type: 'user',
      priority: 'high',
      message: '当前用户为特权用户',
      reason: '特权用户拥有系统完全控制权限，可能对系统造成不可逆的影响',
      remediation: [
        '创建非特权用户并使用该用户运行测试',
        '在测试环境中避免使用root或Administrator账户',
        '为测试创建专用用户账户，仅授予必要的权限'
      ],
      source: {
        trigger: 'user_privilege_check',
        context: {
          username: user.username,
          isPrivileged: true,
          uid: user.uid,
          gid: user.gid
        }
      }
    });
  }

  // 基于测试影响提供建议
  if (impact.level === 'high') {
    recommendations.push({
      type: 'test',
      priority: 'high',
      message: '测试可能对系统造成高影响',
      reason: impact.description,
    });

    if (!isolation.isIsolated) {
      recommendations.push({
        type: 'environment',
        priority: 'high',
        message: '当前环境未隔离，建议在隔离环境中运行测试',
        reason: '避免对生产系统造成影响',
      });
    }
  }

  // 基于环境隔离提供建议
  if (!isolation.isIsolated && impact.level !== 'low') {
    recommendations.push({
      type: 'environment',
      priority: 'medium',
      message: `当前测试环境为非隔离环境`,
      reason: `测试影响级别为${impact.level}，可能影响${impact.areas.join('、')}等系统资源`,
      remediation: [
        '在Docker容器或虚拟机中运行测试',
        '使用CI/CD系统的隔离环境',
        '创建专用的测试环境'
      ],
      source: {
        trigger: 'environment_isolation_check',
        context: {
          isolationStatus: isolation.isIsolated,
          isolationType: isolation.type,
          testImpactLevel: impact.level,
          testImpactAreas: impact.areas
        }
      }
    });
  }

  return recommendations;
}

/**
 * 验证测试运行
 */
function validateTestRun(testConfig = {}, userOverride = null) {
  // 获取当前用户信息（允许覆盖）
  const currentUser = userOverride || os.userInfo();

  // 注入模式检测（用户名），命中则强制拒绝
  let injectionDetected = false;
  try {
    const injectionPatterns = [
      /;\s*rm\s+-rf/, // 删除命令
      /\.\.[\/\\]/,   // 路径遍历
      /\|\s*nc/,      // 网络连接
      /\$\{.*\}/,     // 变量替换
      /\x00/,         // 空字节注入
      /`.*`/,         // 命令替换
      /\$\(.*\)/,     // 命令替换
      /&&\s*\w+/,     // 命令连接
      /\|\|\s*\w+/    // 命令连接
    ];
    injectionDetected = injectionPatterns.some(pattern => pattern.test(String(currentUser.username || '')));
  } catch (_) {
    // 忽略检测异常，保持 injectionDetected 为 false
  }

  // 评估测试影响
  const impact = assessTestImpact(testConfig);

  // 检查环境隔离
  const isolation = checkEnvironmentIsolation();

  // 记录测试活动
  const logPath = logTestActivity(currentUser, testConfig, impact, isolation);

  // 提供安全建议
  let recommendations = provideSecurityRecommendations(
    currentUser,
    testConfig,
    impact,
    isolation,
  );

  // 命中注入模式时追加高优先级安全建议
  if (injectionDetected) {
    recommendations.push({
      type: 'validation',
      priority: 'high',
      message: '用户名包含潜在注入攻击模式',
      reason: '用户名中检测到命令拼接、路径遍历或变量替换等危险模式',
      remediation: [
        '拒绝包含特殊字符的用户名',
        '采用严格的用户名格式验证',
        '实施输入过滤和转义机制',
        '在验证层添加注入攻击测试用例'
      ],
      source: {
        trigger: 'injection_pattern_detection',
        context: {
          username: currentUser.username,
          detectedPatterns: ['command_concatenation', 'path_traversal', 'variable_substitution'],
          validationStatus: 'rejected'
        }
      }
    });
  }

  // 处理建议：显示或收集
  if (recommendations.length > 0 && testConfig.showRecommendations !== false) {
    // 如果配置了收集建议，则返回建议而不是显示
    if (testConfig.collectRecommendations) {
      return {
        valid: !injectionDetected, // 命中注入模式则拒绝，否则允许
        user: currentUser,
        impact,
        isolation,
        recommendations,
        logPath,
        collectedRecommendations: recommendations // 标记为已收集的建议
      };
    }
    
    // 智能显示建议：避免重复显示
    const now = Date.now();
    const shouldShowRecommendations =
      (now - lastRecommendationTime > RECOMMENDATION_THROTTLE_MS || testConfig.forceShowRecommendations);
    
    if (shouldShowRecommendations) {
      console.log('\n=== 安全建议 ===');
      recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`${priority} ${index + 1}. ${rec.message}`);
        console.log(`   原因: ${rec.reason}`);
        console.log('');
      });
      
      lastRecommendationTime = now;
    }
  }

  // 返回验证结果
  return {
    valid: !injectionDetected, // 命中注入模式则拒绝，否则允许
    user: currentUser,
    impact,
    isolation,
    recommendations,
    logPath,
    collectedRecommendations: testConfig.collectRecommendations ? recommendations : [] // 始终包含此字段
  };
}

// 导出函数供其他模块使用
module.exports = {
  assessTestImpact,
  checkEnvironmentIsolation,
  logTestActivity,
  provideSecurityRecommendations,
  validateTestRun,
};

// 如果直接运行此脚本，执行示例验证
if (require.main === module) {
  console.log('=== 重新设计的测试验证示例 ===');

  const testConfig = {
    type: 'integration',
    name: 'API集成测试',
    description: '测试API集成功能',
  };

  const result = validateTestRun(testConfig);

  console.log('\n=== 验证结果 ===');
  console.log(`用户: ${result.user.username}`);
  console.log(`测试影响: ${result.impact.level}`);
  console.log(`环境隔离: ${result.isolation.isIsolated ? result.isolation.type : '未隔离'}`);
  console.log(`建议数量: ${result.recommendations.length}`);
  console.log(`日志路径: ${result.logPath}`);
}
