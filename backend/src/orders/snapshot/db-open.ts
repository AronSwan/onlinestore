/**
 * SQLite 只读开库 + 重试（阶段 3 前置修因——双盲#4 抽公共）
 *
 * 仓根 scripts/verify-{audit,orders}-chain.mjs 双端 db open 模板逐字 13 行同源。
 * F-003 修复：busy-wait→setTimeout（jest fake timer 兼容 + 不阻塞 event loop）。
 * 纯依赖=node:sqlite 同步接口，无 process.exit 副作用，便于 unit test 模拟失败。
 */

import { DatabaseSync } from 'node:sqlite';

const MAX_ATTEMPTS = 3;
const RETRY_INTERVAL_MS = 200;

/**
 * 打开只读 SQLite db + 三连次硬重试
 * @param dbPath 完整路径（调用方 path.resolve）
 * @param jsonMode true=异常以 JSON 输出（脚本 --json 模式）；false=console.error 文本
 * @param emitError JSON/console 错误输出函数
 * @param onFail 三次重试全部失败后的处理（默认返回 null）
 * @returns 已打开的 db；重试耗尽由 onFail 决策，本函数不抛
 */
export async function openReadOnlyWithRetry({ dbPath, jsonMode, emitError, onFail }: {
  dbPath: string;
  jsonMode: boolean;
  emitError?: (msgOrCode: any, payload?: any) => void;
  onFail?: (err: Error) => any;
}) {
  let db;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      db = new DatabaseSync(dbPath, { readOnly: true });
      break;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        if (jsonMode) {
          emitError?.(3, { error: 'open failed', dbPath, detail: String(err) });
        } else {
          emitError?.(`环境错：打开数据库失败（第 ${attempt} 次重试后放弃）——${err}`);
        }
        return onFail ? onFail(err) : null;
      }
      // 200ms setTimeout（F-003：替换 busy-wait，jest fake timer 兼容）
      await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
    }
  }
  return db;
}
