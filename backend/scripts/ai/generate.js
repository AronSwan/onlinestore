#!/usr/bin/env node
/**
 * 真实 AI 文档生成入口（TypeDoc / OpenAPI / Remark + Prettier）
 *
 * 输出目录：backend/docs/generated/ai/
 * - openapi/openapi.json
 * - typedoc/（Markdown 文档）
 * - api.md（索引/概览）
 */

const fs = require('fs');
const path = require('path');

function log(msg) {
  console.log(`[docs:ai:generate] ${msg}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const projectRoot = path.resolve(path.join(__dirname, '..', '..'));
const docsDir = path.join(projectRoot, 'docs');
const outDir = path.join(docsDir, 'generated', 'ai');
const openapiOut = path.join(outDir, 'openapi');
const typedocOut = path.join(outDir, 'typedoc');

ensureDir(outDir);
ensureDir(openapiOut);
ensureDir(typedocOut);

// 生成 OpenAPI 文档（基于 Nest + Swagger）
async function generateOpenAPI() {
  log('生成 OpenAPI 文档...');
  // 允许直接加载 TS 源码
  require('ts-node/register');
  require('tsconfig-paths/register');

  const { NestFactory } = require('@nestjs/core');
  const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');

  // 使用精简模块，避免重度外部依赖
  let AppModuleRef;
  try {
    AppModuleRef = require(path.join(projectRoot, 'src', 'app-minimal.module'));
  } catch {
    // 回退到主模块（可能会创建数据库连接）
    AppModuleRef = require(path.join(projectRoot, 'src', 'app.module'));
  }
  const AppModule = AppModuleRef.AppMinimalModule || AppModuleRef.AppModule;

  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle(`${pkg.name} API`)
    .setDescription(pkg.description || 'API documentation')
    .setVersion(pkg.version || '1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  // 同步到传统路径，供其他校验脚本使用
  const legacyOpenapiPath = path.join(docsDir, 'openapi.json');
  fs.writeFileSync(legacyOpenapiPath, JSON.stringify(document, null, 2), 'utf8');
  fs.writeFileSync(path.join(openapiOut, 'openapi.json'), JSON.stringify(document, null, 2), 'utf8');
  await app.close();
  log(`OpenAPI 已生成: ${path.relative(projectRoot, legacyOpenapiPath)} 和 ${path.relative(projectRoot, path.join(openapiOut, 'openapi.json'))}`);
}

// 生成 TypeDoc Markdown 文档
async function generateTypeDoc() {
  log('生成 TypeDoc 文档 (Markdown)...');
  const typedoc = require('typedoc');

  // 优先使用 src 下的入口；如未设置，则以 src 目录为入口
  const srcDir = path.join(projectRoot, 'src');
  const entryCandidates = [];

  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const it of items) {
      const full = path.join(dir, it.name);
      if (it.isDirectory()) {
        // 限制深度适中，避免过多入口导致噪音
        walk(full);
      } else if (it.isFile() && it.name === 'index.ts') {
        entryCandidates.push(full);
      }
    }
  }

  try {
    walk(srcDir);
  } catch {
    // ignore
  }

  const entryPoints = entryCandidates.length > 0 ? entryCandidates : [srcDir];

  const app = await typedoc.Application.bootstrap({
    entryPoints,
    plugin: ['typedoc-plugin-markdown'],
    theme: 'markdown',
    hideGenerator: true,
    categorizeByGroup: true,
    readme: 'none',
  });

  const project = await app.convert();
  if (!project) {
    throw new Error('TypeDoc 转换失败：project 为空');
  }

  await app.generateDocs(project, typedocOut);
  log(`TypeDoc 已生成: ${path.relative(projectRoot, typedocOut)}`);
}

// 生成 API 索引/概览
function generateApiIndex() {
  log('生成 API 索引...');
  const apiIndex = `# API 文档概览\n\n- OpenAPI: ./openapi/openapi.json\n- TypeDoc (Markdown): ./typedoc/\n\n> 以上产物由 scripts/ai/generate.js 生成，可在 CI 中复用。\n`;
  fs.writeFileSync(path.join(outDir, 'api.md'), apiIndex, 'utf8');
}

async function main() {
  try {
    await generateOpenAPI();
  } catch (e) {
    console.error('生成 OpenAPI 失败:', e);
    // 不中断后续步骤，仍尝试生成 TypeDoc
  }

  try {
    await generateTypeDoc();
  } catch (e) {
    console.error('生成 TypeDoc 失败:', e);
  }

  try {
    generateApiIndex();
  } catch (e) {
    console.error('生成 API 索引失败:', e);
  }

  log('完成生成。');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});