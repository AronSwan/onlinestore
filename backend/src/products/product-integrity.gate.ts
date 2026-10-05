// 用途：M4(2026-10-04) 三闸之第二闸服务端侧——商品名实相符复检（fail-closed）。
// 依赖文件：js/shared/integrity-rules.js（前端同源规则引擎，ESM 纯函数层）
// 背景：docs/modernization-discussion.md v1.1 §2.4 M4「lint 双闸」裁决——
//   词表冲突/禁用词逻辑不在后端重复实现（两份实现必然漂移），改为动态 import
//   前端同源模块；规则文件加载失败 = fail-closed 500 记日志，绝不静默放行。
//
// P1-2 修复（双盲审 2026-10-05）：原实现把闸的存在性绑在"请求带 factCard"上，
//   POST/PATCH 不带 specifications 即整体跳过（"限时抢购"实测落库）。新契约：
//   ① 禁用词 lintCopy 对所有 create/update 无条件生效（不依赖事实卡）；
//   ② 词表冲突 checkNameImage 按"合并视图有 factCard 即生效"（update 合并
//      存量 specifications，调用方 products.controller.update 负责构造合并视图）；
//   ③ factCard 形状校验：数组/标量 → 400（席X P3：factCard 数组不得静默跳过）；
//      旧拼法 mainColor 与存储拼法 colorGroup 均识别（防旧数据静默失去颜色比对）；
//   ④ factCard 存在但缺 colorGroup/bagType 字段时不再静默——交由引擎 R4/R5
//      给出 FACT_CARD_*/BAG_TYPE_MISSING 黄警或红拦信号。

import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

/** 复检闸入参（DTO 入口形状；Create/UpdateProductDto 均结构兼容） */
export interface IntegrityGateInput {
  name?: unknown;
  description?: unknown;
  specifications?: Record<string, unknown> | null;
  /** P2-8（三修，fix2 §三 8）：tags 数组逐项过禁用词 lint（首页徽章渲染面） */
  tags?: unknown;
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

/** specifications 是否带事实卡（存量商品无 → 复检走 lint-only 路径） */
export function hasFactCard(specifications: unknown): specifications is Record<string, unknown> {
  if (typeof specifications !== 'object' || specifications === null || Array.isArray(specifications)) {
    return false;
  }
  const fc = (specifications as Record<string, unknown>).factCard;
  return typeof fc === 'object' && fc !== null && !Array.isArray(fc);
}

/**
 * 提取并校验 specifications.factCard（P1-2 ③）：
 *   - specifications 缺省/无 factCard 键 → undefined（lint-only 路径，存量兼容）；
 *   - factCard 为数组或标量 → 400（形状非法，防"缺字段即静默跳过"式绕过）；
 *   - factCard.colorGroup / factCard.bagType 键存在但非字符串（且非 null）→ 400
 *     带字段名（P2-4·三修，fix2 §三 4：X 组共中——数字/数组形状静默按"缺字段"
 *     处理，事实卡比对被无声跳过）；null 视为未填（合法的空四选结果）；
 *   - colorGroup/bagType 超过 50 字符 → 400（四修 P2 长度上限：看图四选是
 *     下单选词不是自由文本，超长值只会是注入载荷/脏数据，词表比对面同步收口）；
 *   - plain object → 原样返回。
 */
const FACT_CARD_FIELD_MAX_LENGTH = 50;
function extractFactCard(specifications: unknown): Record<string, unknown> | undefined {
  if (
    typeof specifications !== 'object' ||
    specifications === null ||
    Array.isArray(specifications) ||
    !('factCard' in specifications)
  ) {
    return undefined;
  }
  const fc = (specifications as Record<string, unknown>).factCard;
  if (typeof fc !== 'object' || fc === null || Array.isArray(fc)) {
    throw new BadRequestException(
      'specifications.factCard 必须是对象（看图四选结果 {colorGroup,bagType,hardware,occasion}），不接受数组或标量',
    );
  }
  for (const field of ['colorGroup', 'bagType'] as const) {
    const v = (fc as Record<string, unknown>)[field];
    if (v !== undefined && v !== null && typeof v !== 'string') {
      throw new BadRequestException(
        `specifications.factCard.${field} 必须是字符串（看图四选结果），不接受 ${Array.isArray(v) ? '数组' : typeof v}`,
      );
    }
    if (typeof v === 'string' && v.length > FACT_CARD_FIELD_MAX_LENGTH) {
      throw new BadRequestException(
        `specifications.factCard.${field} 不能超过 ${FACT_CARD_FIELD_MAX_LENGTH} 字符（看图四选是选词，不是自由文本）`,
      );
    }
  }
  return fc as Record<string, unknown>;
}

/**
 * 复检闸本体（P1-2 新契约：对所有 create/update 无条件生效）：
 *   - 禁用词 lintCopy 扫描 name/description——命中即 400，与有无 factCard 无关；
 *   - 合并视图带 factCard 时叠加 checkNameImage 词表冲突复检（含形状校验与
 *     旧拼法 mainColor 识别），结构冲突 → 400；
 *   - 黄警（warnings）不拦——前端发布预览已逐条人工确认；
 *   - 规则引擎加载失败 → 500 fail-closed 记日志。
 * @param input DTO（或合并了存量商品 name/description/specifications 的合并视图）
 * @returns { warnings } 供调用方透传（当前仅日志用途）
 */
export async function enforceProductIntegrityGate(
  input: IntegrityGateInput,
): Promise<{ warnings: Array<Record<string, unknown>> }> {
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

  // 禁用词对所有写入无条件生效（P1-2 ①——原实现无 factCard 即整体跳过）
  const violations = [
    ...rules.lintCopy(name).violations,
    ...rules.lintCopy(description).violations,
  ];

  // P2-8（三修，fix2 §三 8）：tags 逐项过禁用词 lint——tags 渲染首页徽章，
  // 是与 name/description 同面的展示文案（X1：'限时' 徽章走私）。命中即 400，
  // 明细带 tagIndex/tag 定位到具体数组项；非字符串项不 lint（DTO @IsString({each})
  // 已在 HTTP 面拦形状，非字符串项不可能携带词面）。已知限制：PATCH 未提交 tags
  // 时不回扫存量 tags（存量脏数据治理另列，见三修汇报）。
  if (Array.isArray(input.tags)) {
    input.tags.forEach((tag, tagIndex) => {
      if (typeof tag !== 'string') return;
      for (const v of rules.lintCopy(tag).violations) {
        violations.push({ ...v, field: 'tags', tagIndex, tag });
      }
    });
  }

  // 词表冲突复检：合并视图带 factCard 即生效（P1-2 ②③）
  const gate = { warnings: [] as Array<Record<string, unknown>>, blockers: [] as Array<Record<string, unknown>> };
  const fc = extractFactCard(input.specifications);
  if (fc) {
    // 存储形状 {colorGroup,bagType,hardware,occasion} → 引擎消费形状 {mainColor,bagType}；
    // colorGroup 优先，旧拼法 mainColor 兜底（旧数据不得静默失去颜色比对）。
    const mainColor =
      typeof fc.colorGroup === 'string'
        ? fc.colorGroup
        : typeof fc.mainColor === 'string'
          ? fc.mainColor
          : undefined;
    const bagType = typeof fc.bagType === 'string' ? fc.bagType : undefined;
    const result = rules.checkNameImage({ name, description, factCard: { mainColor, bagType } });
    gate.warnings = result.warnings;
    gate.blockers = result.blockers;
  }

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
