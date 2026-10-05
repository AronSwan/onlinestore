// 用途：M6 哈希链台账纯函数核——canonical 序列化 / 记录哈希 / 链校验三件套。
// 单源纪律：写侧（AuditService.log 事务内回读原生行）、验侧（scripts/verify-audit-chain.mjs
// 经 node:sqlite 只读原生行、backend/scripts/backfill-audit-chain.mjs 重锚、
// AuditController GET /audit/verify）全部 import 本文件，杜绝逻辑第二份。
// 运行形态约束：本文件必须保持 node --experimental-strip-types 可直接加载（不用
// 装饰器/枚举/参数属性，仅类型标注），故脚本与 Nest 双端共用同一字节。
// 加载形态：backend/package.json 是 commonjs——本目录另有 package.json
// {"type":"module"} 标记把本文件翻成 Node ESM（strip-types 按最近 package.json
// 定格式）；该标记被 nest-cli.json assets 排除，绝不进 dist（require(ESM) 会炸）。
// tsc 不受影响（moduleResolution: node 不看 type 字段）。
// 依赖：仅 node:crypto（禁新 npm 依赖，M6 任务书）。
import { createHash } from 'node:crypto';

/** 创世前驱哈希：64 个 '0'（hex 小写，长度与 SHA-256 对齐） */
export const ZERO_HASH = '0'.repeat(64);

/**
 * canonical 定键序（16 字段，设计十决策 #3 定死）。
 * 键序即哈希输入的一部分——追加字段必须排在尾部并全链重锚，不得插入中部。
 */
export const CANONICAL_KEYS = [
  'seq',
  'id',
  'createTime',
  'userId',
  'userName',
  'operation',
  'module',
  'method',
  'url',
  'ip',
  'userAgent',
  'requestParams',
  'responseData',
  'duration',
  'status',
  'errorMessage',
] as const;

export type CanonicalKey = (typeof CANONICAL_KEYS)[number];

/**
 * Date → "YYYY-MM-DD HH:mm:ss.SSS"（UTC）。
 * 逐字节镜像 TypeORM sqlite 驱动 preparePersistentValue → mixedDateToUtcDatetimeString，
 * 使 MySQL 原生行（mysql2 回 Date 对象）与 sqlite 原生行（驱动存 UTC 字符串）落在同一
 * canonical 字节上；sqlite 路径常态下根本不进这个分支（原生行已是字符串，原样透传）。
 */
export function formatCanonicalDate(value: Date): string {
  const pad = (n: number, len: number): string => {
    const s = String(n);
    return '0'.repeat(Math.max(0, len - s.length)) + s;
  };
  return (
    `${pad(value.getUTCFullYear(), 4)}-${pad(value.getUTCMonth() + 1, 2)}-${pad(value.getUTCDate(), 2)} ` +
    `${pad(value.getUTCHours(), 2)}:${pad(value.getUTCMinutes(), 2)}:${pad(value.getUTCSeconds(), 2)}.` +
    pad(value.getUTCMilliseconds(), 3)
  );
}

/**
 * 单值归一：null/undefined → null；Date → UTC 串（见上）；number → String；
 * 其余 → String。写侧回读原生行与验侧同一字节的根在这——两侧拿到的都是驱动
 * 原样值，无 Date 往返漂移。
 */
export function canonicalValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return formatCanonicalDate(value);
  return String(value);
}

/** 整行归一：按 CANONICAL_KEYS 定键序产出 {key: string|null}（JSON.stringify 键序即此序） */
export function canonicalizeRow(row: Record<string, unknown>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const key of CANONICAL_KEYS) out[key] = canonicalValue(row[key]);
  return out;
}

/**
 * 记录哈希 = SHA-256(`${prevHash}\n${canonical}`)，hex 小写 64。
 * seq 用参数值（写侧插入回读时 DB 里还是 NULL，链列尚未补），不从 row 取。
 */
export function computeRecordHash(
  prevHash: string,
  seq: number,
  row: Record<string, unknown>,
): string {
  const canonical = JSON.stringify(canonicalizeRow({ ...row, seq }));
  return createHash('sha256').update(`${prevHash}\n${canonical}`).digest('hex');
}

/** 链问题类型（verify 脚本与 admin 展示共用判词来源） */
export type ChainProblemType = 'UNCHAINED' | 'GAP' | 'DUPLICATE_SEQ' | 'BREAK' | 'CONTENT' | 'FORK';

export interface ChainProblem {
  type: ChainProblemType;
  seq: number | null;
  id: string | null;
  detail: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  /** 已链化行数（UNCHAINED 行不计入） */
  length: number;
  /** 链头哈希（空链为 ZERO_HASH） */
  headHash: string;
  /** 链头序号（空链为 0） */
  headSeq: number;
  problems: ChainProblem[];
}

/**
 * 单遍 O(n) 全链校验。
 * 输入：任意来源的原生行（node:sqlite 只读 / em.query 原生 / 测试构造），
 * 不要求预排序。规则（设计十决策 #5）：
 * - 三链列 NULL 的行 → UNCHAINED 剥离（每行记一笔问题）
 * - 按 seq 升序逐行：seq != 期望 → GAP（断档）或 DUPLICATE_SEQ（重号），就地重同步
 * - prevHash != 期望前驱 → BREAK@seq；重算哈希 != recordHash → CONTENT@seq
 * - 同一 prevHash 被两行引用 → FORK（分叉）
 * 断点后续行按"该行自身存档哈希"继续比对，把损伤定位到行而非全线报错。
 */
export function verifyChain(rows: ReadonlyArray<Record<string, unknown>>): ChainVerificationResult {
  const problems: ChainProblem[] = [];
  const chained: Array<Record<string, unknown>> = [];

  for (const row of rows) {
    if (row.seq === null || row.seq === undefined) {
      problems.push({
        type: 'UNCHAINED',
        seq: null,
        id: row.id == null ? null : String(row.id),
        detail: '链列（seq/prevHash/recordHash）为 NULL——未链化写入或绕过链路的行',
      });
    } else {
      chained.push(row);
    }
  }

  chained.sort((a, b) => Number(a.seq) - Number(b.seq));

  let expectedSeq = 1;
  let prevHash = ZERO_HASH;
  const prevHashOwner = new Map<string, number>();
  const seqSeen = new Set<number>();
  let headHash = ZERO_HASH;
  let headSeq = 0;

  for (const row of chained) {
    const seq = Number(row.seq);
    const id = row.id == null ? null : String(row.id);

    if (seq !== expectedSeq) {
      if (seqSeen.has(seq) || seq < expectedSeq) {
        problems.push({
          type: 'DUPLICATE_SEQ',
          seq,
          id,
          detail: `seq 重号：期望 ${expectedSeq}，实为 ${seq}`,
        });
      } else {
        problems.push({
          type: 'GAP',
          seq,
          id,
          detail: `序号断档：期望 ${expectedSeq}，实为 ${seq}（${expectedSeq}..${seq - 1} 缺失或被删）`,
        });
      }
      expectedSeq = seq;
    }

    const rowPrev = row.prevHash == null ? null : String(row.prevHash);
    if (rowPrev !== prevHash) {
      problems.push({
        type: 'BREAK',
        seq,
        id,
        detail: `prevHash 与链头不符：期望 ${prevHash.slice(0, 8)}…，实为 ${rowPrev == null ? 'NULL' : `${rowPrev.slice(0, 8)}…`}`,
      });
    }

    if (rowPrev !== null) {
      const owner = prevHashOwner.get(rowPrev);
      if (owner !== undefined) {
        problems.push({
          type: 'FORK',
          seq,
          id,
          detail: `prevHash 与 seq ${owner} 指向同一前驱——链分叉`,
        });
      } else {
        prevHashOwner.set(rowPrev, seq);
      }
    }

    const storedHash = row.recordHash == null ? null : String(row.recordHash);
    const recomputed = computeRecordHash(prevHash, seq, row);
    if (storedHash !== recomputed) {
      problems.push({
        type: 'CONTENT',
        seq,
        id,
        detail: `重算哈希与存档不符：存 ${storedHash == null ? 'NULL' : `${storedHash.slice(0, 8)}…`}，算 ${recomputed.slice(0, 8)}…`,
      });
    }

    // 就地重同步：后续行以该行自身存档哈希为前驱继续比对（损伤定位到行）
    prevHash = storedHash ?? recomputed;
    expectedSeq = seq + 1;
    headHash = storedHash ?? recomputed;
    headSeq = seq;
    seqSeen.add(seq);
  }

  return { valid: problems.length === 0, length: chained.length, headHash, headSeq, problems };
}
