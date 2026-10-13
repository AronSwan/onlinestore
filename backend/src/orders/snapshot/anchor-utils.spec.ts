/**
 * anchor-utils 单元测试（阶段 3 前置 F-002——双盲#4 抽公共后零 spec 债补）
 *
 * 六个纯函数各独立覆盖：
 * - splitCrLfRows: CRLF/LF/CR/混合/尾空白/空串
 * - parseAnchorLine: 标准 3 列 / 短行 null / 字段名注入
 * - isValidAnchorHash: 64 hex 通过 / 短/长/大写/非 hex 拒
 * - forestHashOf: 排序确定性 + 空森林 = SHA256("") = e3b0c44…
 * - detectAnchorCorruption: 无重复 corrupted=false / 有重复 corrupted+duplicate
 * - formatAnchorHeader: 形态+域名单注入
 * - readAnchorFile: 注释行/空行剔除 + CRLF
 */
import {
  splitCrLfRows,
  parseAnchorLine,
  isValidAnchorHash,
  forestHashOf,
  detectAnchorCorruption,
  formatAnchorHeader,
  readAnchorFile,
} from './anchor-utils.ts';

describe('anchor-utils', () => {
  describe('splitCrLfRows', () => {
    it('LF-only 文本：按 \n 拆', () => {
      expect(splitCrLfRows('a\nb\nc')).toEqual(['a', 'b', 'c']);
    });

    it('CRLF 文本：\r 被吃掉', () => {
      expect(splitCrLfRows('a\r\nb\r\nc')).toEqual(['a', 'b', 'c']);
    });

    it('混合 CRLF+LF：都拆', () => {
      expect(splitCrLfRows('a\r\nb\nc')).toEqual(['a', 'b', 'c']);
    });

    it('行尾空白被 trim（防 CRLF 残留）', () => {
      expect(splitCrLfRows('a  \r\nb\t\t\nc   ')).toEqual(['a', 'b', 'c']);
    });

    it('空文本→单空行', () => {
      expect(splitCrLfRows('')).toEqual(['']);
    });

    it('首行注释/空行保留（不做 filter——那是 readAnchorFile 的事）', () => {
      expect(splitCrLfRows('# head\n\nbody')).toEqual(['# head', '', 'body']);
    });
  });

  describe('parseAnchorLine', () => {
    it('标准 3 列（tab 分隔）：解析为 {stamped, seq, hash}', () => {
      const line = '2026-10-12T00:00:00Z\t3\tabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
      const out = parseAnchorLine(line);
      expect(out).toEqual({
        stamped: '2026-10-12T00:00:00Z',
        seq: '3',
        hash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      });
    });

    it('space 分隔也兼容（\\s+ 拆）', () => {
      const out = parseAnchorLine('2026 3 abc');
      expect(out).toEqual({ stamped: '2026', seq: '3', hash: 'abc' });
    });

    it('短行→null', () => {
      expect(parseAnchorLine('only-two-fields here')).toBeNull();
    });

    it('空行→null', () => {
      expect(parseAnchorLine('')).toBeNull();
    });

    it('自定义字段名注入（非默认 schema）', () => {
      const out = parseAnchorLine('x y z', ['a', 'b', 'c']);
      expect(out).toEqual({ a: 'x', b: 'y', c: 'z' });
    });

    it('多余列只取前 3（不越界）', () => {
      const out = parseAnchorLine('x y z extra');
      expect(out).toEqual({ stamped: 'x', seq: 'y', hash: 'z' });
    });
  });

  describe('isValidAnchorHash', () => {
    it('合法 64 hex 通过', () => {
      expect(isValidAnchorHash('0'.repeat(64))).toBe(true);
      expect(isValidAnchorHash('abcdef0123456789'.repeat(4))).toBe(true);
    });

    it('长度不是 64 拒', () => {
      expect(isValidAnchorHash('0'.repeat(63))).toBe(false);
      expect(isValidAnchorHash('0'.repeat(65))).toBe(false);
      expect(isValidAnchorHash('')).toBe(false);
    });

    it('非 hex 字符拒（大写/符号/非字符串）', () => {
      expect(isValidAnchorHash('ABCDEF' + '0'.repeat(58))).toBe(false); // 大写拒
      expect(isValidAnchorHash('g'.repeat(64))).toBe(false); // 非 hex
      expect(isValidAnchorHash('0'.repeat(63) + '!')).toBe(false);
      expect(isValidAnchorHash(null as any)).toBe(false);
      expect(isValidAnchorHash(undefined as any)).toBe(false);
    });
  });

  describe('forestHashOf', () => {
    it('空森林→SHA256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', () => {
      expect(forestHashOf([])).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      );
    });

    it('单链头：orderId:headSeq:headHash 单段 SHA256', () => {
      const perOrder = [{ orderId: 42, headSeq: 1, headHash: 'a'.repeat(64) }];
      const expected = require('node:crypto')
        .createHash('sha256')
        .update(`42:1:${'a'.repeat(64)}`)
        .digest('hex');
      expect(forestHashOf(perOrder)).toBe(expected);
    });

    it('多链头：以 | 分隔拼接后 SHA256（调用方保证 orderId 排序）', () => {
      const perOrder = [
        { orderId: 1, headSeq: 2, headHash: 'b'.repeat(64) },
        { orderId: 2, headSeq: 1, headHash: 'c'.repeat(64) },
      ];
      const expected = require('node:crypto')
        .createHash('sha256')
        .update(
          [
            `1:2:${'b'.repeat(64)}`,
            `2:1:${'c'.repeat(64)}`,
          ].join('|'),
        )
        .digest('hex');
      expect(forestHashOf(perOrder)).toBe(expected);
    });

    it('形状锁：返回 64 hex 字符串', () => {
      const h = forestHashOf([{ orderId: 1, headSeq: 1, headHash: 'a'.repeat(64) }]);
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('detectAnchorCorruption（P2-J 修因：同 hash 多行=合法幂等，不判篡改）', () => {
    it('空 lines→corrupted=false', () => {
      expect(detectAnchorCorruption([])).toEqual({ corrupted: false });
    });

    it('全不同 hash→corrupted=false', () => {
      const lines = [
        `2026-10-12T00:00:00Z\t1\t${'a'.repeat(64)}`,
        `2026-10-12T01:00:00Z\t2\t${'b'.repeat(64)}`,
      ];
      expect(detectAnchorCorruption(lines)).toEqual({ corrupted: false });
    });

    it('单行 anchor→corrupted=false（不可能重复）', () => {
      const lines = [`2026-10-12T00:00:00Z\t1\t${'a'.repeat(64)}`];
      expect(detectAnchorCorruption(lines)).toEqual({ corrupted: false });
    });

    it('不同时间戳同 hash→corrupted=false（合法幂等再锚定）', () => {
      const h = 'a'.repeat(64);
      const lines = [
        `2026-10-12T00:00:00Z\t1\t${h}`,
        `2026-10-12T01:00:00Z\t2\t${h}`, // 链未变再锚定=合法
      ];
      expect(detectAnchorCorruption(lines)).toEqual({ corrupted: false });
    });

    it('同 timestamp+seq 两个不同 hash→corrupted=true（锚行被改写）', () => {
      const lines = [
        `2026-10-12T00:00:00Z\t1\t${'a'.repeat(64)}`,
        `2026-10-12T00:00:00Z\t1\t${'b'.repeat(64)}`, // 同行被改写
      ];
      const out = detectAnchorCorruption(lines);
      expect(out.corrupted).toBe(true);
    });

    it('非法 hash 格式→corrupted=true', () => {
      const lines = ['2026-10-12T00:00:00Z\t1\tnot-a-valid-hash'];
      expect(detectAnchorCorruption(lines).corrupted).toBe(true);
    });
  });

  describe('formatAnchorHeader', () => {
    it('域名单/单量词注入', () => {
      const hdr = formatAnchorHeader({ domain: '审计链', singleSuffix: '条' });
      expect(hdr).toContain('审计链 git 锚');
      expect(hdr).toContain('UTC时间 条数 头森林hash SHA256');
    });

    it('默认 singleSuffix=单', () => {
      const hdr = formatAnchorHeader({ domain: '订单快照链' });
      expect(hdr).toContain('UTC时间 单数 头森林hash SHA256');
    });

    it('5 行注释头 + 空行结尾', () => {
      const hdr = formatAnchorHeader({ domain: 'X' });
      expect(hdr.endsWith('\n\n')).toBe(true);
      expect(hdr.split('\n')).toHaveLength(6); // 5 行内容 + 1 空
    });

    it('含追加式纪律 + verify exit 2 提示', () => {
      const hdr = formatAnchorHeader({ domain: 'X' });
      expect(hdr).toContain('追加式：只增不改');
      expect(hdr).toContain('verify exit 2');
    });
  });

  describe('readAnchorFile', () => {
    const tmpFile = () => require('node:fs').mkdtempSync(require('node:os').tmpdir() + '/anchor-');

    it('剔除注释行与空行', () => {
      const dir = tmpFile();
      const p = require('node:path').join(dir, 'a.txt');
      require('node:fs').writeFileSync(
        p,
        '# head\n\nline1\n# another\nline2\n\n',
        'utf-8',
      );
      expect(readAnchorFile(p)).toEqual(['line1', 'line2']);
    });

    it('CRLF 文件也被正确处理', () => {
      const dir = tmpFile();
      const p = require('node:path').join(dir, 'b.txt');
      require('node:fs').writeFileSync(p, 'line1\r\nline2\r\n', 'utf-8');
      expect(readAnchorFile(p)).toEqual(['line1', 'line2']);
    });

    it('尾部空白行被剔除', () => {
      const dir = tmpFile();
      const p = require('node:path').join(dir, 'c.txt');
      require('node:fs').writeFileSync(p, 'x\n\n   \n\n', 'utf-8');
      expect(readAnchorFile(p)).toEqual(['x']);
    });

    it('只保留非 # 开头非空行', () => {
      const dir = tmpFile();
      const p = require('node:path').join(dir, 'd.txt');
      require('node:fs').writeFileSync(p, '   # indent-comment\nreal\n', 'utf-8');
      // 注释前有空白 —— splitCrLfRows 不去首空白，# 判定是 startsWith('#') 所以这条不算注释
      expect(readAnchorFile(p)).toEqual(['   # indent-comment', 'real']);
    });
  });
});
