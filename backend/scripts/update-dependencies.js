#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 开始依赖更新检查...');

// 读取当前 package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 需要更新的依赖包列表
const dependenciesToUpdate = {
  // NestJS 生态系统 - 升级到 v11
  '@nestjs/common': '^11.1.6',
  '@nestjs/core': '^11.1.6',
  '@nestjs/platform-express': '^11.1.6',
  '@nestjs/testing': '^11.1.6',
  '@nestjs/cli': '^11.0.10',
  '@nestjs/schematics': '^11.0.8',
  '@nestjs/swagger': '^11.2.0',
  '@nestjs/terminus': '^11.0.0',
  '@nestjs/typeorm': '^11.0.0',
  '@nestjs/cqrs': '^11.0.3',
  '@nestjs/bull': '^11.0.3',
  '@nestjs/axios': '^4.0.1',
  '@nestjs/cache-manager': '^3.0.1',
  '@nestjs/config': '^4.0.2',
  
  // OpenTelemetry 包
  '@opentelemetry/auto-instrumentations-node': '^0.64.6',
  '@opentelemetry/exporter-jaeger': '^2.1.0',
  '@opentelemetry/exporter-trace-otlp-http': '^0.205.0',
  '@opentelemetry/resources': '^2.1.0',
  '@opentelemetry/sdk-node': '^0.205.0',
  '@opentelemetry/sdk-trace-base': '^2.1.0',
  
  // 其他重要依赖
  'uuid': '^13.0.0',
  'dotenv': '^17.2.3',
  'helmet': '^8.1.0',
  'joi': '^18.0.1',
  'winston-daily-rotate-file': '^5.0.0',
  
  // TypeScript 和类型定义
  '@types/node': '^24.6.2',
  '@types/jest': '^30.0.0',
  '@types/bcrypt': '^6.0.0',
  '@types/express': '^5.0.3',
  '@types/nodemailer': '^7.0.2',
  '@types/passport-jwt': '^4.0.1',
  '@types/uuid': '^10.0.0',
  
  // 开发工具
  '@typescript-eslint/eslint-plugin': '^8.45.0',
  '@typescript-eslint/parser': '^8.45.0',
  'eslint': '^9.37.0',
  'eslint-config-prettier': '^10.1.8',
  'jest': '^30.2.0',
  'postcss-preset-env': '^10.4.0',
  'supertest': '^7.1.4'
};

// 需要谨慎更新的包（主要版本变更）
const majorVersionUpdates = {
  'express': '^5.1.0',
  'bcrypt': '^6.0.0',
  'nodemailer': '^7.0.6'
};

console.log('📦 更新常规依赖包...');

// 分批更新依赖
const updateBatches = [
  // 批次1: NestJS 核心包
  [
    '@nestjs/common@^11.1.6',
    '@nestjs/core@^11.1.6',
    '@nestjs/platform-express@^11.1.6',
    '@nestjs/testing@^11.1.6'
  ],
  
  // 批次2: NestJS 其他包
  [
    '@nestjs/cli@^11.0.10',
    '@nestjs/schematics@^11.0.8',
    '@nestjs/swagger@^11.2.0',
    '@nestjs/terminus@^11.0.0',
    '@nestjs/typeorm@^11.0.0'
  ],
  
  // 批次3: OpenTelemetry 包
  [
    '@opentelemetry/auto-instrumentations-node@^0.64.6',
    '@opentelemetry/exporter-jaeger@^2.1.0',
    '@opentelemetry/resources@^2.1.0',
    '@opentelemetry/sdk-trace-base@^2.1.0'
  ],
  
  // 批次4: 其他依赖
  [
    'uuid@^13.0.0',
    'dotenv@^17.2.3',
    'helmet@^8.1.0',
    'joi@^18.0.1'
  ],
  
  // 批次5: TypeScript 类型定义
  [
    '@types/node@^24.6.2',
    '@types/jest@^30.0.0',
    '@types/bcrypt@^6.0.0',
    '@types/express@^5.0.3'
  ]
];

function updateBatch(packages, batchName) {
  console.log(`\n🔄 更新批次: ${batchName}`);
  try {
    const command = `npm install ${packages.join(' ')} --legacy-peer-deps`;
    console.log(`执行命令: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log(`✅ ${batchName} 更新完成`);
  } catch (error) {
    console.error(`❌ ${batchName} 更新失败:`, error.message);
    return false;
  }
  return true;
}

// 执行批量更新
updateBatches.forEach((batch, index) => {
  updateBatch(batch, `批次 ${index + 1}`);
});

console.log('\n🔒 检查安全漏洞...');
try {
  execSync('npm audit', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (error) {
  console.log('发现安全漏洞，尝试自动修复...');
  try {
    execSync('npm audit fix', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (fixError) {
    console.log('自动修复失败，需要手动处理某些漏洞');
  }
}

console.log('\n📊 检查最终状态...');
try {
  execSync('npm outdated', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (error) {
  // npm outdated 在有过时包时会返回非零退出码，这是正常的
}

console.log('\n✨ 依赖更新检查完成！');
console.log('\n⚠️  注意事项:');
console.log('1. 请测试应用程序以确保所有功能正常工作');
console.log('2. 某些主要版本更新可能需要代码调整');
console.log('3. 建议在更新后运行完整的测试套件');