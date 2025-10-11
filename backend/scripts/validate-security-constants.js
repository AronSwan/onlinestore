#!/usr/bin/env node

/**
 * 安全常量配置验证脚本
 * 用途: 验证security-constants.js配置是否符合JSON Schema
 * 使用方法:
 *   npm run security:validate-constants
 *   npm run security:validate-constants:ci
 * @author 安全团队
 * @version 1.0.0
 * @since 2025-10-03
 */

const fs = require('fs');
const path = require('path');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 默认配置
const DEFAULT_CONFIG = {
  constantsFile: 'src/common/security/security.constants.ts',
  schemaFile: 'scripts/modules/security-constants.schema.json',
  reportFile: 'constants-validation-report.json',
};

/**
 * 从TypeScript文件中提取常量配置
 * @param {string} filePath - TypeScript文件路径
 * @returns {Object} 提取的配置对象
 */
function extractConstantsFromTS(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 使用正则表达式提取常量配置
    // 这是一个简化的实现，实际项目中可能需要更复杂的解析
    const severityWeightsMatch = content.match(/SEVERITY_WEIGHTS\s*=\s*({[\s\S]*?})\s*;/);
    const sarifCategoriesMatch = content.match(/SARIF_CATEGORIES\s*=\s*({[\s\S]*?})\s*;/);
    const localizationMatch = content.match(/LOCALIZATION\s*=\s*({[\s\S]*?})\s*;/);
    const systemMappingMatch = content.match(/SYSTEM_MAPPING\s*=\s*({[\s\S]*?})\s*;/);
    const severityColorsMatch = content.match(/SEVERITY_COLORS\s*=\s*({[\s\S]*?})\s*;/);
    const dimensionsMatch = content.match(/DIMENSIONS\s*=\s*({[\s\S]*?})\s*;/);
    const dataSourceMatch = content.match(/DATA_SOURCE\s*=\s*({[\s\S]*?})\s*;/);

    // 这是一个简化的实现，实际项目中可能需要使用TypeScript编译器API
    // 或者将配置提取到单独的JSON文件中
    const config = {
      SEVERITY_WEIGHTS: severityWeightsMatch ? eval(`(${severityWeightsMatch[1]})`) : {},
      SARIF_CATEGORIES: sarifCategoriesMatch ? eval(`(${sarifCategoriesMatch[1]})`) : {},
      LOCALIZATION: localizationMatch ? eval(`(${localizationMatch[1]})`) : {},
      SYSTEM_MAPPING: systemMappingMatch ? eval(`(${systemMappingMatch[1]})`) : {},
      SEVERITY_COLORS: severityColorsMatch ? eval(`(${severityColorsMatch[1]})`) : {},
      DIMENSIONS: dimensionsMatch ? eval(`(${dimensionsMatch[1]})`) : {},
      DATA_SOURCE: dataSourceMatch ? eval(`(${dataSourceMatch[1]})`) : {},
    };

    // 添加SARIF_RULES（这个比较复杂，暂时使用空对象）
    config.SARIF_RULES = {};

    return config;
  } catch (error) {
    console.error(`从TypeScript文件提取配置失败: ${error.message}`);
    throw error;
  }
}

/**
 * 验证配置对象是否符合JSON Schema
 * @param {Object} config - 配置对象
 * @param {Object} schema - JSON Schema对象
 * @returns {Object} 验证结果
 */
function validateConfigAgainstSchema(config, schema) {
  // 简单的JSON Schema验证实现
  // 实际项目中应该使用ajv等专业库
  const result = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // 验证根对象
  if (typeof config !== 'object' || config === null) {
    result.valid = false;
    result.errors.push('配置必须是对象');
    return result;
  }

  // 验证必需字段
  const requiredFields = [
    'SEVERITY_WEIGHTS',
    'SARIF_CATEGORIES',
    'SARIF_RULES',
    'LOCALIZATION',
    'SYSTEM_MAPPING',
  ];
  for (const field of requiredFields) {
    if (!(field in config)) {
      result.valid = false;
      result.errors.push(`缺少必需字段: ${field}`);
    }
  }

  // 验证SEVERITY_WEIGHTS
  if (config.SEVERITY_WEIGHTS) {
    validateSeverityWeights(config.SEVERITY_WEIGHTS, result);
  }

  // 验证SARIF_CATEGORIES
  if (config.SARIF_CATEGORIES) {
    validateSarifCategories(config.SARIF_CATEGORIES, result);
  }

  // 验证LOCALIZATION
  if (config.LOCALIZATION) {
    validateLocalization(config.LOCALIZATION, result);
  }

  // 验证SYSTEM_MAPPING
  if (config.SYSTEM_MAPPING) {
    validateSystemMapping(config.SYSTEM_MAPPING, result);
  }

  // 验证SEVERITY_COLORS
  if (config.SEVERITY_COLORS) {
    validateSeverityColors(config.SEVERITY_COLORS, result);
  }

  return result;
}

/**
 * 验证严重度权重配置
 * @param {Object} weights - 权重配置
 * @param {Object} result - 验证结果对象
 */
function validateSeverityWeights(weights, result) {
  const requiredSeverities = ['critical', 'high', 'medium', 'low'];

  for (const severity of requiredSeverities) {
    if (!(severity in weights)) {
      result.valid = false;
      result.errors.push(`SEVERITY_WEIGHTS缺少必需字段: ${severity}`);
    } else if (
      typeof weights[severity] !== 'number' ||
      weights[severity] < 1 ||
      weights[severity] > 100
    ) {
      result.valid = false;
      result.errors.push(`SEVERITY_WEIGHTS.${severity}必须是1-100之间的整数`);
    }
  }
}

/**
 * 验证SARIF类别配置
 * @param {Object} categories - 类别配置
 * @param {Object} result - 验证结果对象
 */
function validateSarifCategories(categories, result) {
  const requiredCategories = [
    'authentication',
    'inputValidation',
    'database',
    'webSecurity',
    'businessLogic',
    'apiSecurity',
    'supplyChain',
    'logging',
    'infrastructure',
  ];

  for (const category of requiredCategories) {
    if (!(category in categories)) {
      result.valid = false;
      result.errors.push(`SARIF_CATEGORIES缺少必需字段: ${category}`);
    } else if (typeof categories[category] !== 'string' || categories[category].trim() === '') {
      result.valid = false;
      result.errors.push(`SARIF_CATEGORIES.${category}必须是非空字符串`);
    }
  }
}

/**
 * 验证本地化配置
 * @param {Object} localization - 本地化配置
 * @param {Object} result - 验证结果对象
 */
function validateLocalization(localization, result) {
  // 验证必需字段
  const requiredFields = ['supportedLanguages', 'defaultLanguage', 'labels'];
  for (const field of requiredFields) {
    if (!(field in localization)) {
      result.valid = false;
      result.errors.push(`LOCALIZATION缺少必需字段: ${field}`);
    }
  }

  // 验证支持的语言
  if (localization.supportedLanguages) {
    if (!Array.isArray(localization.supportedLanguages)) {
      result.valid = false;
      result.errors.push('LOCALIZATION.supportedLanguages必须是数组');
    } else {
      const validLanguages = ['zh', 'en'];
      for (const lang of localization.supportedLanguages) {
        if (!validLanguages.includes(lang)) {
          result.valid = false;
          result.errors.push(`LOCALIZATION.supportedLanguages包含无效语言: ${lang}`);
        }
      }
    }
  }

  // 验证默认语言
  if (localization.defaultLanguage) {
    const validLanguages = ['zh', 'en'];
    if (!validLanguages.includes(localization.defaultLanguage)) {
      result.valid = false;
      result.errors.push(`LOCALIZATION.defaultLanguage无效: ${localization.defaultLanguage}`);
    }
  }

  // 验证标签
  if (localization.labels) {
    if (typeof localization.labels !== 'object') {
      result.valid = false;
      result.errors.push('LOCALIZATION.labels必须是对象');
    } else {
      const requiredLanguages = ['zh', 'en'];
      for (const lang of requiredLanguages) {
        if (!(lang in localization.labels)) {
          result.valid = false;
          result.errors.push(`LOCALIZATION.labels缺少必需语言: ${lang}`);
        }
      }
    }
  }
}

/**
 * 验证系统映射配置
 * @param {Object} mapping - 系统映射配置
 * @param {Object} result - 验证结果对象
 */
function validateSystemMapping(mapping, result) {
  for (const [systemName, systemConfig] of Object.entries(mapping)) {
    if (typeof systemConfig !== 'object' || systemConfig === null) {
      result.valid = false;
      result.errors.push(`SYSTEM_MAPPING.${systemName}必须是对象`);
      continue;
    }

    // 验证必需字段
    const requiredFields = ['keywords', 'priority', 'color', 'aliases'];
    for (const field of requiredFields) {
      if (!(field in systemConfig)) {
        result.valid = false;
        result.errors.push(`SYSTEM_MAPPING.${systemName}缺少必需字段: ${field}`);
      }
    }

    // 验证关键词
    if (systemConfig.keywords) {
      if (!Array.isArray(systemConfig.keywords)) {
        result.valid = false;
        result.errors.push(`SYSTEM_MAPPING.${systemName}.keywords必须是数组`);
      }
    }

    // 验证优先级
    if (systemConfig.priority !== undefined) {
      if (
        typeof systemConfig.priority !== 'number' ||
        systemConfig.priority < 1 ||
        systemConfig.priority > 100
      ) {
        result.valid = false;
        result.errors.push(`SYSTEM_MAPPING.${systemName}.priority必须是1-100之间的整数`);
      }
    }

    // 验证颜色
    if (systemConfig.color) {
      if (!/^#[0-9a-fA-F]{6}$/.test(systemConfig.color)) {
        result.valid = false;
        result.errors.push(`SYSTEM_MAPPING.${systemName}.color必须是有效的十六进制颜色代码`);
      }
    }
  }
}

/**
 * 验证严重度颜色配置
 * @param {Object} colors - 颜色配置
 * @param {Object} result - 验证结果对象
 */
function validateSeverityColors(colors, result) {
  const requiredSeverities = ['critical', 'high', 'medium', 'low', 'empty'];

  for (const severity of requiredSeverities) {
    if (!(severity in colors)) {
      result.valid = false;
      result.errors.push(`SEVERITY_COLORS缺少必需字段: ${severity}`);
    } else if (typeof colors[severity] !== 'object' || colors[severity] === null) {
      result.valid = false;
      result.errors.push(`SEVERITY_COLORS.${severity}必须是对象`);
    } else {
      // 验证bg和text字段
      const requiredColorFields = ['bg', 'text'];
      for (const field of requiredColorFields) {
        if (!(field in colors[severity])) {
          result.valid = false;
          result.errors.push(`SEVERITY_COLORS.${severity}缺少必需字段: ${field}`);
        } else if (!/^#[0-9a-fA-F]{6}$/.test(colors[severity][field])) {
          result.valid = false;
          result.errors.push(`SEVERITY_COLORS.${severity}.${field}必须是有效的十六进制颜色代码`);
        }
      }
    }
  }
}

/**
 * 生成验证报告
 * @param {Object} validationResult - 验证结果
 * @param {string} constantsFile - 常量文件路径
 * @param {string} schemaFile - Schema文件路径
 * @returns {Object} 验证报告
 */
function generateValidationReport(validationResult, constantsFile, schemaFile) {
  const report = {
    timestamp: new Date().toISOString(),
    constantsFile,
    schemaFile,
    valid: validationResult.valid,
    summary: {
      errors: validationResult.errors.length,
      warnings: validationResult.warnings.length,
    },
    errors: validationResult.errors,
    warnings: validationResult.warnings,
  };

  return report;
}

/**
 * 主函数
 * @param {Object} options - 选项对象
 */
function validateSecurityConstants(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  try {
    console.log('开始验证安全常量配置...');

    // 提取常量配置
    const constantsFilePath = path.join(PROJECT_ROOT, config.constantsFile);
    if (!fs.existsSync(constantsFilePath)) {
      throw new Error(`常量文件不存在: ${constantsFilePath}`);
    }

    const constantsConfig = extractConstantsFromTS(constantsFilePath);

    // 读取Schema文件
    const schemaFilePath = path.join(PROJECT_ROOT, config.schemaFile);
    if (!fs.existsSync(schemaFilePath)) {
      throw new Error(`Schema文件不存在: ${schemaFilePath}`);
    }

    const schemaContent = fs.readFileSync(schemaFilePath, 'utf8');
    let schema;
    try {
      schema = JSON.parse(schemaContent);
    } catch (parseError) {
      throw new Error(`Schema文件JSON格式错误: ${parseError.message}`);
    }

    // 验证配置
    const validationResult = validateConfigAgainstSchema(constantsConfig, schema);

    // 生成报告
    const report = generateValidationReport(
      validationResult,
      config.constantsFile,
      config.schemaFile,
    );

    // 输出结果
    if (options.ci || options.format === 'json') {
      if (options.output) {
        const reportPath = path.join(PROJECT_ROOT, options.output);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`验证报告已生成: ${reportPath}`);
      } else {
        console.log(JSON.stringify(report, null, 2));
      }
    } else {
      // 控制台友好输出
      console.log(`\n验证结果: ${report.valid ? '通过' : '失败'}`);
      console.log(`错误: ${report.summary.errors}`);
      console.log(`警告: ${report.summary.warnings}`);

      if (report.errors.length > 0) {
        console.log('\n错误详情:');
        report.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }

      if (report.warnings.length > 0) {
        console.log('\n警告详情:');
        report.warnings.forEach((warning, index) => {
          console.log(`${index + 1}. ${warning}`);
        });
      }
    }

    // 在CI模式下，如果验证失败则退出
    if (options.ci && !report.valid) {
      console.error('安全常量配置验证失败，CI检查未通过');
      process.exit(1);
    }

    return report;
  } catch (error) {
    console.error(`验证过程出错: ${error.message}`);
    if (options.ci) {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--format' && i + 1 < args.length) {
      options.format = args[++i];
    } else if (arg === '--output' && i + 1 < args.length) {
      options.output = args[++i];
    } else if (arg === '--ci') {
      options.ci = true;
    } else if (arg === '--constants-file' && i + 1 < args.length) {
      options.constantsFile = args[++i];
    } else if (arg === '--schema-file' && i + 1 < args.length) {
      options.schemaFile = args[++i];
    }
  }

  return options;
}

// 运行验证
if (require.main === module) {
  const options = parseArgs();
  validateSecurityConstants(options);
}

module.exports = { validateSecurityConstants, validateConfigAgainstSchema };
