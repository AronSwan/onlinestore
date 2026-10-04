// 用途：M4(2026-10-04) 三闸之第二闸服务端侧——商品名实相符复检（fail-closed）。
// 依赖文件：js/shared/integrity-rules.js（前端同源规则引擎，ESM 纯函数层）
// 背景：docs/modernization-discussion.md v1.1 §2.4 M4「lint 双闸」裁决——
//   词表冲突/禁用词逻辑不在后端重复实现（两份实现必然漂移），改为动态 import
//   前端同源模块；规则文件加载失败 = fail-closed 500 记日志，绝不静默放行。
//   存量兼容：已有商品 specifications 无 factCard——DTO 不带 factCard 即跳过复检
//   （新保存由前端强制：无 factCard 保存按钮禁用）。

import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

/** 复检闸入参（DTO 入口形状；Create/UpdateProductDto 均结构兼容） */
export interface IntegrityGateInput {
  name?: unknown;
  description?: unknown;
  specifications?: Record<string, unknown> | null;
}

/** js/shared/integrity-rules.js 的最小契约面（只声明本闸消费的函数） */
export interface IntegrityRulesModule {
  lintCopy: (
    text: string,
    rules?: unknown[],
  ) => { violations: Array<Record<string, unknown>> };
  checkNameImage: (input: {
    name?: string;
    description?: string;
    factCard?: { mainColor?: string; bagType?: string };
  }) => {
    warnings: Array<Record<string, unknown>>;
    blockers: Array<Record<string, unknown>>;
  };
}

/**
 * 前端规则引擎定位：仓库根 js/shared/integrity-rules.js。
 * 运行布局两种——源码 <backend>/src/products、构建产物 <backend>/dist/src/products，
 * 据此定位 backend 根再上溯一级到仓库根（照抄 products.controller.ts resolveUploadDir 先例），
 * path.resolve 锁定，杜绝 cwd 漂移。
 */
export function resolveIntegrityRulesPath(): string {
  const backendRoot = path.resolve(
    __dirname,
    __dirname.split(path.sep).includes('dist') ? '../../..' : '../..',
  );
  return path.resolve(backendRoot, '..', 'js', 'shared', 'integrity-rules.js');
}

// 间接构造真·ESM 动态 import：TS 在 module:commonjs 下会把 import(x) 转译成 require(x)，
// 而 require() 加载 ESM 属 Node ≥22 的兼容行为，不能当部署前提。用 new Function 绕开
// 转译，任何 Node ≥14 运行时都走原生 import()，specifier 用 file URL 规范形式。
const nativeImport = new Function('specifier', 'return import(specifier);') as (
  specifier: string,
) => Promise<IntegrityRulesModule>;

/**
 * 三级装载链（同一份文件字节，零逻辑重复）：
 *  ① 原生 import(file URL)——生产运行时（node dist）；
 *  ② require()——Node ≥22.12 的 require(esm) 兼容路径；
 *  ③ fs 读取 + 剥离行首 export 关键字 + new Function 求值——jest VM 沙箱下
 *     （动态 import 需 --experimental-vm-modules、jest-require 拒 ESM，两者都不可用）。
 *  ③ 仅做机械转译（^export\s+ → 空），不触碰任何逻辑；求值后按已知导出名收集模块面。
 */
function loadViaSourceEval(filePath: string): IntegrityRulesModule {
  const source = fs.readFileSync(filePath, 'utf8');
  if (!/^export\s+/m.test(source)) {
    throw new Error('规则引擎源文件不含 export 语句，可能已被改动为非 ESM');
  }
  const cjsLike = source.replace(/^export\s+/gm, '');
  const factory = new Function(
    `${cjsLike}\n;return { lintCopy: typeof lintCopy === 'function' ? lintCopy : undefined,` +
      ` checkNameImage: typeof checkNameImage === 'function' ? checkNameImage : undefined,` +
      ` sanityCheck: typeof sanityCheck === 'function' ? sanityCheck : undefined };`,
  );
  const moduleNamespace = factory();
  if (
    typeof moduleNamespace.lintCopy !== 'function' ||
    typeof moduleNamespace.checkNameImage !== 'function'
  ) {
    throw new Error('规则引擎求值后缺少 lintCopy/checkNameImage 导出');
  }
  return moduleNamespace;
}

let integrityRulesPromise: Promise<IntegrityRulesModule> | null = null;

/** 加载（进程内缓存）前端同源规则引擎；失败不缓存，允许下次请求重试。 */
export async function loadIntegrityRules(): Promise<IntegrityRulesModule> {
  if (!integrityRulesPromise) {
    const filePath = resolveIntegrityRulesPath();
    integrityRulesPromise = (async () => {
      try {
        return await nativeImport(pathToFileURL(filePath).href);
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        try {
          return require(filePath) as IntegrityRulesModule;
        } catch {
          return loadViaSourceEval(filePath);
        }
      }
    })();
    integrityRulesPromise.catch(() => {
      integrityRulesPromise = null;
    });
  }
  return integrityRulesPromise;
}

/** specifications 是否带事实卡（存量商品无 → 跳过复检） */
export function hasFactCard(specifications: unknown): specifications is Record<string, unknown> {
  if (typeof specifications !== 'object' || specifications === null || Array.isArray(specifications)) {
    return false;
  }
  const fc = (specifications as Record<string, unknown>).factCard;
  return typeof fc === 'object' && fc !== null && !Array.isArray(fc);
}

/**
 * 复检闸本体：
 *   - DTO 带 specifications.factCard 时执行，否则返回 null（存量兼容跳过）；
 *   - 结构冲突（checkNameImage blockers）或禁用词命中（lintCopy violations）
 *     → 400，明细挂 details.integrity（全局过滤器透传 details 字段）；
 *   - 黄警（warnings）不拦——前端发布预览已逐条人工确认；
 *   - 规则引擎加载失败 → 500 fail-closed 记日志。
 * @param input DTO（或合并了存量商品 name/description 的合并视图）
 * @returns { warnings } 供调用方透传（当前仅日志用途），或 null 表示跳过
 */
export async function enforceProductIntegrityGate(
  input: IntegrityGateInput,
): Promise<{ warnings: Array<Record<string, unknown>> } | null> {
  if (!hasFactCard(input.specifications)) return null;

  let rules: IntegrityRulesModule;
  try {
    rules = await loadIntegrityRules();
  } catch (error) {
    console.error(
      '[M4-复检] 名实相符规则引擎加载失败（fail-closed，阻断本次写入）:',
      (error as Error).message,
    );
    throw new InternalServerErrorException('名实相符规则引擎不可用，写入已阻断（fail-closed）');
  }

  const name = typeof input.name === 'string' ? input.name : '';
  const description = typeof input.description === 'string' ? input.description : '';
  const fc = (input.specifications as Record<string, unknown>).factCard as Record<string, unknown>;

  // 存储形状 {colorGroup,bagType,hardware,occasion} → 引擎消费形状 {mainColor,bagType}
  // （字段名对齐 js/shared/integrity-rules.js 的 checkNameImage JSDoc）
  const factCard = {
    mainColor: typeof fc.colorGroup === 'string' ? fc.colorGroup : undefined,
    bagType: typeof fc.bagType === 'string' ? fc.bagType : undefined,
  };

  const violations = [
    ...rules.lintCopy(name).violations,
    ...rules.lintCopy(description).violations,
  ];
  const gate = rules.checkNameImage({ name, description, factCard });

  if (gate.blockers.length > 0 || violations.length > 0) {
    throw new BadRequestException({
      message: '名实相符复检未通过（第二闸服务端侧）',
      details: {
        integrity: {
          blockers: gate.blockers,
          bannedWords: violations,
        },
      },
    });
  }
  return { warnings: gate.warnings };
}
