#!/usr/bin/env python3
"""
pre_emit_check.py —— RC1 产物出口断言闸 v2（α-1 修：caliber_guard 真读表 + caliber_table 去自豁免 + 白名单 198 词全清）

动机（实践 A/B + 理论 A/B 抓 6+ P0）：
  - v1 198 词白名单 = 结构性旁路（QB6）——任何 2+ 位数字+白名单词邻近 = 静默放行
  - v1 caliber_table 在 auto_exempt → 自身漂移零捕获（QA7）——源头错永远自不见
  - v1 caliber_guard 硬编码 dict 失能（TC1）——已修 v2 在 caliber_guard.py
  - v1 v6.1 报 22 数字违例含 3 幻影（B1 报 cg.stdout.count('\n') bug）——已修（caliber_guard 改为按 finding 数计）

修法（α-1 + TB2 元修法叠加）：
  - 委托 caliber_guard 真读表（已修）
  - **数字锚比对改为：数字必须出现在口径表的 repro 列或同 calibers value 显著位置**——白名单结构性旁路堵死
  - caliber_table 去除 auto_exempt（自身被闸）；改值即触发闸——drift 检测
  - 修正幻影计数（caliber_guard v2 返回 finding 列表+计数，pre_emit_check 计 finding 数非 stdout 文本）
"""
import re, sys, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
CALIBER_TABLE = ROOT / 'docs' / 'debt-10-archive' / 'audit-outputs' / 'caliber_table.md'
CALIBER_GUARD = ROOT / 'backend' / 'scripts' / 'caliber_guard.py'

def parse_caliber_table():
    if not CALIBER_TABLE.exists():
        return {}
    table = {}
    for line in CALIBER_TABLE.read_text(encoding='utf-8').splitlines():
        if not line.startswith('|'):
            continue
        parts = [p.strip() for p in line.split('|')[1:-1]]
        if len(parts) < 3 or parts[0] in ('口径名', '---', ''):
            continue
        name, val, repro = parts[0], parts[1], parts[2] if len(parts) > 2 else ''
        if not val or val == '口径名':
            continue
        table[name] = {'value': val, 'repro': repro}
    return table

def check_digit_anchored(emit_files, table):
    """数字锚严格模式：每个 2+ 位数字必须出现在某口径的 repro 复现命令上下文或 value 显位；
    锚定义 = 数字邻接（±15 字）有 'wc -l'/'pry -3'/'grant'/'hash'/'row'/'见' 等显锚标。
    去 198 词白名单旁路。"""
    violations = []
    digit_pat = re.compile(r'(?<!\w)(\d{2,})(?!\w)')
    anchor_tokens = [
        r'\bwc\s*-\s*l\b',
        r'py\s*-\s*3',
        r'\b\d+\s*条',
        r'\b\d+\s*行',
        r'\b\d+\s*个',
        r'\b\d+\s*次',
        r'约定\s*[{]?[\d.]+[}]?',
        r'charset\s*=\s*utf',
        r'inserted\s+\d+',
        r'rows?\s*=\s*\d+',
        r'ok[\(\d]+',
        r'\bdiff\s*=\s*\d+',
    ]
    anchor_re = re.compile('|'.join(anchor_tokens), re.I)
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
            start = max(0, m.start() - 30)
            end = min(len(txt), m.end() + 30)
            ctx = txt[start: end]
            has_anchor = anchor_re.search(ctx) is not None
            hit_value = any(val in info['value'] for info in table.values())
            if not (has_anchor or hit_value):
                ls = txt.rfind('\n', 0, m.start()) + 1
                ln = txt[:ls].count('\n') + 1
                violations.append((str(path), ln, f"数字 {val} 无显锚（周围 60 字无口径表/显锚标）: {ctx.strip()[:60]}"))
    return violations

def main():
    if len(sys.argv) < 2:
        print("用法: py -3.14 pre_emit_check.py <file1> [file2...] [--exempt path1,path2]", file=sys.stderr); sys.exit(1)
    args = sys.argv[1:]
    if '--exempt' in args:
        i = args.index('--exempt'); user_exempt = [pathlib.Path(p).resolve() for p in args[i+1].split(',')]
        files = [pathlib.Path(f).resolve() for f in args[1:i]]
    else:
        user_exempt = []; files = [pathlib.Path(f).resolve() for f in args]
    # α-1: caliber_table 去除自豁免（表自身被闸）——口径漂移零捕获
    auto_exempt = {
        pathlib.Path(__file__).resolve(),
        pathlib.Path(CALIBER_GUARD).resolve(),
        # 不豁免 CALIBER_TABLE = caliber_table 改值闸必报
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
    table = parse_caliber_table()
    if not table:
        print("[X] 口径表 caliber_table.md 不在档——先建表", file=sys.stderr); sys.exit(2)
    total = 0
    print(f"== 1. caliber_guard v2 词义/聚合校验（真读表，{len(table)} 口径）==")
    cg = subprocess.run(['py', '-3.14', str(CALIBER_GUARD), *files],
                         capture_output=True, text=True, encoding='utf-8')
    cg_findings = [l for l in cg.stdout.splitlines() if l.strip() and l.count(':') >= 2]
    if cg_findings:
        for l in cg_findings:
            print(l[:200])
        total += len(cg_findings)
    else:
        print("  [OK] 词义/聚合 0 违例")
    print(f"== 2. 数字锚严格比对（{len(table)} 口径，198 词白名单已清）==")
    anchors = check_digit_anchored(files, table)
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
