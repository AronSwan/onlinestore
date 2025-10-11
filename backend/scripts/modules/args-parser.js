/**
 * 参数解析模块
 * 用途: 解析命令行参数
 */

// 有效枚举值
const VALID_FORMATS = ['table', 'json', 'sarif'];
const VALID_FAILURE_LEVELS = ['low', 'medium', 'high', 'critical'];

/**
 * 验证枚举值
 * @param {string} value 要验证的值
 * @param {Array} validValues 有效值数组
 * @param {string} optionName 选项名称
 */
function validateEnum(value, validValues, optionName) {
  if (!validValues.includes(value)) {
    console.error(`错误: 无效的${optionName}值 "${value}"，有效值为: ${validValues.join(', ')}`);
    process.exit(1);
  }
}

/**
 * 解析命令行参数
 * @returns {Object} 解析后的参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  // 在PowerShell中，-- 可能会被解释为参数，需要处理这种情况
  if (args.length > 0 && args[0] === '--') {
    // 如果第一个参数是--，则跳过它
    args.shift();
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // 处理 --key=value 格式的参数
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, value] = arg.substring(2).split('=', 2);

      if (key === 'category') {
        // 支持聚合参数: --category=auth,input-validation
        const categories = value.split(',').map(c => c.trim());
        if (categories.length === 1) {
          options.category = categories[0];
        } else {
          options.categories = categories;
        }
      } else if (key === 'rule') {
        options.rule = value;
      } else if (key === 'format') {
        validateEnum(value, VALID_FORMATS, '输出格式');
        options.outputFormat = value;
      } else if (key === 'output') {
        options.output = value;
      } else if (key === 'fail-on') {
        validateEnum(value, VALID_FAILURE_LEVELS, '失败阈值');
        options.failOn = value;
      } else if (key === 'env-file') {
        options.envFile = value;
      }
    } else if (arg === '--category' && i + 1 < args.length) {
      // 支持聚合参数: --category auth,input-validation
      const categories = args[i + 1].split(',').map(c => c.trim());
      if (categories.length === 1) {
        options.category = categories[0];
      } else {
        options.categories = categories;
      }
      i++;
    } else if (arg === '--rule' && i + 1 < args.length) {
      options.rule = args[i + 1];
      i++;
    } else if ((arg === '--format' || arg === '--sarif') && i + 1 < args.length) {
      // 支持 --sarif 作为 --format sarif 的别名
      const format = arg === '--sarif' ? 'sarif' : args[i + 1];
      validateEnum(format, VALID_FORMATS, '输出格式');
      options.outputFormat = format;
      if (arg !== '--sarif') i++;
    } else if (arg === '--output' && i + 1 < args.length) {
      options.output = args[i + 1];
      i++;
    } else if (arg === '--fail-on' && i + 1 < args.length) {
      const failOn = args[i + 1];
      validateEnum(failOn, VALID_FAILURE_LEVELS, '失败阈值');
      options.failOn = failOn;
      i++;
    } else if (arg === '--env-file' && i + 1 < args.length) {
      options.envFile = args[i + 1];
      i++;
    } else if (arg === '--ci') {
      options.ci = true;
    } else if (arg === '--no-paths') {
      options.noPaths = true;
    } else if (arg === '--env-override') {
      options.envOverride = true;
    } else if (arg === '--check-exemptions') {
      options.checkExemptions = true;
    } else if (arg === '--help') {
      console.log(`
安全检查脚本

用法:
  node scripts/security-check.js [选项]

选项:
  --category <类别>    运行特定类别的检查 (auth, input-validation, data-security, web-security, logging, database, supply-chain, audit)
                       支持聚合: --category auth,input-validation
  --rule <规则>        运行特定规则的检查
  --format <格式>      输出格式 (table, json, sarif)
  --sarif              等同于 --format sarif
  --output <文件>      将结果写入指定文件（配合json/sarif）
  --fail-on <级别>     失败阈值 (low|medium|high|critical)
  --env-file <文件>    指定环境变量文件（优先于默认列表）
  --env-override       覆盖已存在的环境变量
  --ci                 CI模式（减少日志输出）
  --no-paths           隐藏文件路径信息（适用于共享报告）
  --help               显示帮助信息

示例:
  npm run security:check                    # 运行所有检查
  npm run security:check -- --category=auth  # 运行认证相关检查
  npm run security:check -- --category=auth,input-validation  # 运行多个类别
  npm run security:check -- --rule=jwt-expiration  # 运行JWT过期检查
  npm run security:check -- --format=json --output=report.json    # 以JSON格式输出到文件
  npm run security:check -- --sarif --output=report.sarif  # 以SARIF格式输出到文件
  npm run security:check -- --fail-on=high --ci  # CI模式下高风险失败
      `);
      process.exit(0);
    }
  }

  return options;
}

module.exports = {
  parseArgs,
};
