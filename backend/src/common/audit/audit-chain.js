"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_KEYS = exports.ZERO_HASH = void 0;
exports.formatCanonicalDate = formatCanonicalDate;
exports.canonicalValue = canonicalValue;
exports.canonicalizeRow = canonicalizeRow;
exports.computeRecordHash = computeRecordHash;
exports.verifyChain = verifyChain;
const node_crypto_1 = require("node:crypto");
exports.ZERO_HASH = '0'.repeat(64);
exports.CANONICAL_KEYS = [
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
];
function formatCanonicalDate(value) {
    const pad = (n, len) => {
        const s = String(n);
        return '0'.repeat(Math.max(0, len - s.length)) + s;
    };
    return (`${pad(value.getUTCFullYear(), 4)}-${pad(value.getUTCMonth() + 1, 2)}-${pad(value.getUTCDate(), 2)} ` +
        `${pad(value.getUTCHours(), 2)}:${pad(value.getUTCMinutes(), 2)}:${pad(value.getUTCSeconds(), 2)}.` +
        pad(value.getUTCMilliseconds(), 3));
}
function canonicalValue(value) {
    if (value === null || value === undefined)
        return null;
    if (value instanceof Date)
        return formatCanonicalDate(value);
    return String(value);
}
function canonicalizeRow(row) {
    const out = {};
    for (const key of exports.CANONICAL_KEYS)
        out[key] = canonicalValue(row[key]);
    return out;
}
function computeRecordHash(prevHash, seq, row) {
    const canonical = JSON.stringify(canonicalizeRow({ ...row, seq }));
    return (0, node_crypto_1.createHash)('sha256').update(`${prevHash}\n${canonical}`).digest('hex');
}
function verifyChain(rows) {
    const problems = [];
    const chained = [];
    for (const row of rows) {
        if (row.seq === null || row.seq === undefined) {
            problems.push({
                type: 'UNCHAINED',
                seq: null,
                id: row.id == null ? null : String(row.id),
                detail: '链列（seq/prevHash/recordHash）为 NULL——未链化写入或绕过链路的行',
            });
        }
        else {
            chained.push(row);
        }
    }
    chained.sort((a, b) => Number(a.seq) - Number(b.seq));
    let expectedSeq = 1;
    let prevHash = exports.ZERO_HASH;
    const prevHashOwner = new Map();
    const seqSeen = new Set();
    let headHash = exports.ZERO_HASH;
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
            }
            else {
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
            }
            else {
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
        prevHash = storedHash ?? recomputed;
        expectedSeq = seq + 1;
        headHash = storedHash ?? recomputed;
        headSeq = seq;
        seqSeen.add(seq);
    }
    return { valid: problems.length === 0, length: chained.length, headHash, headSeq, problems };
}
