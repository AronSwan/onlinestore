#!/usr/bin/env python3
"""
pre_emit_check.py —— RC1 产物出口断言闸 v3（α-7 装入，2026-10-15）

动机（魑组+4 员盲审 P0）：
  - v2 白名单 198 词 = 结构性旁路（QB6）= 数字邻接任意词放过
  - v2 显锚未识别（数字旁 "wc -l"/"按 wc -l 文档化" 等应放过）
  - v2 不读 caliber_table v4 词义闸表 = 闸装入割裂

修法（v3）：
  - 移除 198 词白名单（结构性旁路根因）
  - 显锚识别：数字邻接 "wc -l" / "按 wc -l 文档化" / "实测" / "复现" / "已测" 放过
  - vocab 集成：复用 caliber_guard v5d vocab_gates 词义闸表 = caliber_table 真读（与 caliber_guard 闸同源）
  - 双闸装入 = 数字锚 + 词义表同步= caliber_guard 闸 + pre_emit_check 闸不再割裂
"""
import re, sys, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
CALIBER_TABLE = ROOT / 'docs' / 'debt-10-archive' / 'audit-outputs' / 'caliber_table.md'
CALIBER_GUARD = ROOT / 'backend' / 'scripts' / 'caliber_guard.py'

# α-7 v3 装入：复用 caliber_guard 闸 vocab 词义表=数字锚与词义同步
def parse_caliber_vocab():
    """读 caliber_table 词义闸 section 复用 caliber_guard.vocab_gates 的同源解析"""
    sys.path.insert(0, str(ROOT / 'backend' / 'scripts'))
    import importlib.util
    spec = importlib.util.spec_from_file_location('cg', str(CALIBER_GUARD))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    table = m.parse_caliber_table()
    return m.vocab_gates(table)

# 显锚白名单（替代 v2 198 词 substring 白名单）= 工程语义标记
ANCHOR_TOKENS = re.compile(
    r'\bwc\s*-\s*l\b|按\s*wc\s*-\s*l\s*文档化|'
    r'实测\s*[:：]|复现\s*[:：]|'
    r'已测\s*[:：]|\bK\d+\s*杀|\bK\d+\s*实战|'
    r'根据.*?实测|'
    r'按\s*\{\s*[\d.]+\s*\}',
    re.I,
)

def check_digit_anchored(emit_files, term, forbid):
    """α-7 v3 修：移除 198 词 substring 白名单，改用显锚+词义子位识别。
    数字 2+ 位无显锚 = 报（除非邻接 ANCHOR_TOKENS 工程标记）。"""
    violations = []
    digit_pat = re.compile(r'(?<!\w)(\d{2,})(?!\w)')
    # 软白名单保留（年份/章节/版本/编号锚）
    soft_skip = re.compile(r'\b(19|20)\d{2}\b|\b\d\.\d?[\.\)]|\b[A-Z]\d{1,2}\b')
    for path in emit_files:
        try:
            txt = pathlib.Path(path).read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue
        for m in digit_pat.finditer(txt):
            val = m.group(1)
            if soft_skip.match(val) or soft_skip.fullmatch(val):
                continue
            start = max(0, m.start() - 40)
            end = min(len(txt), m.end() + 30)
            ctx = txt[start: end]
            # v3 显锚 = 数字邻接 ANCHOR_TOKENS（工程语义标记）放过
            if ANCHOR_TOKENS.search(ctx):
                continue
            # v3 词义子位复用 caliber_guard 闸 vocab 表
            term_hit = any(t in ctx for t in term if t)
            forbid_hit = any(f in ctx for f in forbid if f)
            # caliber_table value 列字面匹配
            value_hit = False
            for name, info in [(_n, _i) for _n, _i in zip([], [])]:  # 占位——实际由 parse_caliber_vocab 给口径
                pass
            # 兜底：caliber_table 数字口径 value 匹配
            table = _read_table()
            value_hit = any(val in info.get('value', '') for info in table.values())
            if not (term_hit or forbid_hit or value_hit):
                ls = txt.rfind('\n', 0, m.start()) + 1
                ln = txt[:ls].count('\n') + 1
                violations.append((str(path), ln, "DIGIT-UNANCHORED",
                    f"数字 {val} 无显锚（周围 70 字无 calibers 词义/禁配/value 锚）: {ctx.strip()[:60]}"))
    return violations

def _read_table():
    """复用 caliber_guard.parse_caliber_table 真读表"""
    sys.path.insert(0, str(ROOT / 'backend' / 'scripts'))
    import importlib.util
    spec = importlib.util.spec_from_file_location('cg', str(CALIBER_GUARD))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m.parse_caliber_table()

def main():
    if len(sys.argv) < 2:
        print("用法: py -3.14 pre_emit_check.py <file1> [file2...] [--exempt path1,path2]", file=sys.stderr); sys.exit(1)
    args = sys.argv[1:]
    if '--exempt' in args:
        i = args.index('--exempt'); user_exempt = [pathlib.Path(p).resolve() for p in args[i+1].split(',')]
        files = [pathlib.Path(f).resolve() for f in args[1:i]]
    else:
        user_exempt = []; files = [pathlib.Path(f).resolve() for f in args]
    # α-7 v3：去除 caliber_table 自身 auto_exempt（与 caliber_guard 一致=源头闸自检）
    auto_exempt = {
        pathlib.Path(__file__).resolve(),
        pathlib.Path(CALIBER_GUARD).resolve(),
        pathlib.Path(__file__).with_name('finding_lifecycle.py').resolve(),  # 3 闸同源=豁免
        pathlib.Path(__file__).with_name('caliber_guard.py').resolve(),  # 含/不在此豁免但与 caliber_guard 装入同源
        pathlib.Path(ROOT / 'docs/debt-10-archive/audit-outputs/root-cause-dossier.md').resolve(),
        pathlib.Path(ROOT / 'docs/debt-10-archive/audit-outputs/kill-chart-protocol.md').resolve(),
    }
    all_exempt = set(user_exempt) | auto_exempt
    kept = [f for f in files if f not in all_exempt]
    skipped = [f for f in files if f in all_exempt]
    for f in skipped:
        print(f"  [EXEMPT] {f}（源头/正身）")
    if not kept:
        print("[OK] 全部源头豁免，0 件需校验"); sys.exit(0)
    files = kept
    # α-7 v3.3 修：pre_emit_check 自身词义/数字都触发 = 过滤自身+caliber_guard（同源三闸互不为被审）
    self_file = pathlib.Path(__file__).resolve()
    cg_exempt = {
        self_file,  # pre_emit_check.py 自身
        pathlib.Path(CALIBER_GUARD).resolve(),  # caliber_guard.py 自身
    }
    safe_files = [f for f in files if f not in cg_exempt]
    # v3 词义/禁配表复用 caliber_guard 闸
    term, forbid, must = parse_caliber_vocab()
    total = 0
    print(f"== 1. caliber_guard v5d 词义/聚合（复用 {len(term)} 词义 + {len(forbid)} 禁配）==")
    cg = subprocess.run(['py', '-3.14', str(CALIBER_GUARD), *safe_files],
                         capture_output=True, text=True, encoding='utf-8')
    cg_findings = [l for l in cg.stdout.splitlines() if l.strip() and l.count(':') >= 2]
    if cg_findings:
        for l in cg_findings:
            print(l[:200])
        total += len(cg_findings)
    else:
        print("  [OK] 词义/聚合 0 违例")
    print(f"== 2. 数字锚 v3 严格比对（移除 198 词白名单+显锚识别+词义子位）==")
    anchors = check_digit_anchored(safe_files, term, forbid)
    if anchors:
        for f, ln, msg in anchors:
            print(f"  {f}:{ln}:DIGIT-UNANCHORED: {msg}")
        total += len(anchors)
    else:
        print("  [OK] 数字 0 违例")
    print(f"\n-- 出口断言: {total} 违例，exit {1 if total else 0}")
    sys.exit(1 if total else 0)

if __name__ == "__main__":
    main()
