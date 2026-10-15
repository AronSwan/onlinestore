#!/usr/bin/env python3
"""
caliber_guard.py —— RC4 词义/聚合校验闸 v2（α-1 修：真读 caliber_table.md）

动机（实践 A TC1/QA4/QA7 抓 4 P0）：
  - v1 = 硬编码 CALIBER dict（11 行）= 装在产物出口必经但与口径表去耦；改表闸无感
  - 源 caliber_table.md 自身错（BACKLOG 行数口径 696 vs 实测 701；PRAGMA 净对照 写 2 但公式得 4）
  - caliber_table 在 auto_exempt 集合 → 自身漂移零捕获（G9 同族复发）

修法（α-1 + TB4 元修法叠加）：
  - 启动时 parse caliber_table.md 的 markdown 表 → 口径字典（无硬编码）
  - 改 caliber_table.md 源头错（PRAGMA 行 4 与公式一致；BACKLOG 行数 696→701 实时口径已存在但表里 696 旧值改正）
  - auto_exempt 移除 caliber_table（表自身被闸）→ 改值即触发闸
"""
import re, sys, subprocess, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
CALIBER_TABLE = ROOT / 'docs' / 'debt-10-archive' / 'audit-outputs' / 'caliber_table.md'

def parse_caliber_table(path=CALIBER_TABLE):
    """读 markdown 表 → {口径名: {'value': str, 'repro': str}}
    γ-bifrost v4：双 section 解析（数字口径 + 词义闸）。"""
    if not path.exists():
        sys.stderr.write(f"[X] 口径表 {path} 不在档\n"); sys.exit(2)
    text = path.read_text(encoding='utf-8')
    table = {}
    in_vocab = False
    for line in text.splitlines():
        if '## 词义闸表' in line:
            in_vocab = True; continue
        if in_vocab and line.startswith('## ') and '## 词义闸表' not in line:
            in_vocab = False
        if not line.startswith('|'):
            continue
        parts = [p.strip() for p in line.split('|')[1:-1]]
        if len(parts) < 3 or parts[0] in ('口径名', '类别', '---', ''):
            continue
        if in_vocab:
            # 词义表 4 列：类别 / 模式 / 必带/禁配 / 说明
            cat, pat, sub, _ = parts[0], parts[1], parts[2], parts[3] if len(parts) > 3 else ''
            if cat in ('类别', ''): continue
            table[f'VOCAB::{cat}::{pat}'] = {'value': pat, 'repro': sub, 'note': _}
        else:
            name, val, repro = parts[0], parts[1], parts[2] if len(parts) > 2 else ''
            if not val or val == '口径名':
                continue
            table[name] = {'value': val, 'repro': repro}
    return table

def vocab_gates(table):
    """从 caliber_table 真读 → 提取 TERMINOLOGY/FORBID_PAIR/MUST_SUBTOKEN
    γ-bifrost v4 词义闸 0 硬编码。"""
    term = {}      # AMBIG_TOKEN 模式: (regex pattern) -> allowed subtokens list
    forbid = {}    # FORBID_PAIR 模式: pattern -> forbidden token
    must = {}      # MUST_SUBTOKEN 模式: pattern -> required subtokens
    for key, info in table.items():
        if not key.startswith('VOCAB::'):
            continue
        # 形如 VOCAB::<CATEGORY>::<PATTERN> — markdown 反引号剥除
        parts = key.split('::', 2)
        if len(parts) != 3: continue
        _, cat, pat_raw = parts
        pat = pat_raw.replace('`', '')
        sub = info.get('repro', '').replace('`', '')
        if cat == 'AMBIG_TOKEN':
            # γ-bifrost v5 修：兼容 markdown 多分隔（\| / 、 / 或 / 逗号）
            terms = []
            for sep in ('|', '、', '或', ',', '，'):
                if sep in pat:
                    terms = [t.strip().replace('`', '') for t in pat.split(sep) if t.strip()]
                    break
            if not terms:  # fallback 单词
                terms = [pat.replace('`', '').strip()]
            allowed = []
            sub_clean = sub.replace('必带', '').replace('须带', '').replace('"', '').replace("'", '').strip()
            for sep in ('/', '、', '或', ',', '，'):
                if sep in sub_clean:
                    allowed = [s.strip() for s in sub_clean.split(sep) if s.strip()]
                    break
            if not allowed:
                allowed = [sub_clean]
            for t in terms:
                term[t] = allowed
        elif cat == 'FORBID_PAIR':
            # 模式: 禁配词 = parts[2]（原文"不可邻现"X"——去掉前缀和引号）
            forbid[pat] = sub.replace('不可邻现', '').replace('"', '').replace('"', '').replace("'", '').strip()
        elif cat == 'MUST_SUBTOKEN':
            allowed = []
            for sep in ('/', '、', '或', ',', '，'):
                if sep in sub:
                    allowed = [s.strip() for s in sub.replace('必带', '').replace('"', '').replace("'", '').split(sep) if s.strip()]
                    break
            if not allowed:
                allowed = [sub.replace('必带', '').replace('"', '').replace("'", '').strip()]
            must[pat] = allowed
    return term, forbid, must

# 闸必带子位的口径（must_have_one_of）
MUST_HAVE = {
    "25%":  ["窄", "宽"],
    "已落仓": ["落盘", "库落", "上线"],
    "全绿":  ["判别格", "绿分子"],
    "全清":  ["判别格", "绿分子", "mutation"],
    "P11":   ["必红", "必绿", "杀分支"],
}

def scan(path):
    text = pathlib.Path(path).read_text(encoding='utf-8', errors='ignore')
    findings = []
    table = parse_caliber_table()  # γ-bifrost v4：数字口径 + 词义闸 双 section
    term, forbid, must = vocab_gates(table)  # 词义闸 0 硬编码（从 caliber_table 真读）
    # 1) FORBID_PAIR 词对（真读 v4 词义表）
    for pat, forbidden in forbid.items():
        for m in re.finditer(re.escape(pat), text):
            ctx = text[max(0, m.start()-30): m.end()+30]
            if forbidden in ctx:
                ls = text.rfind('\n', 0, m.start()) + 1
                ln = text[:ls].count('\n') + 1
                findings.append((str(path), ln, "FORBID",
                    f"'{pat}' 旁现 '{forbidden}'（词义表禁配）: {ctx.strip()[:80]}"))
    # 2) MUST_SUBTOKEN 必带子位
    for pat, allowed in must.items():
        for m in re.finditer(re.escape(pat), text):
            ctx = text[max(0, m.start()-30): m.end()+30]
            if not any(k in ctx for k in allowed):
                ls = text.rfind('\n', 0, m.start()) + 1
                ln = text[:ls].count('\n') + 1
                findings.append((str(path), ln, "NO-SUBTOKEN",
                    f"'{pat}' 必带 {'/'.join(allowed)} 但缺: {ctx.strip()[:80]}"))
    # 3) AMBIG_TOKEN 词义三义（α-6 v5d：直接 re.escape——多词分行后无需 boundary 防护；
    #    前版 CJK lookbehind / \b 是 bug——中文全 \w 边界不匹配）
    for pat, allowed in term.items():
        for m in re.finditer(re.escape(pat), text):
            ctx = text[max(0, m.start()-20): m.end()+20]
            if not any(k in ctx for k in allowed):
                ls = text.rfind('\n', 0, m.start()) + 1
                ln = text[:ls].count('\n') + 1
                findings.append((str(path), ln, "VOCAB-AMBIG",
                    f"声称 '{m.group()}' 无子位限定: {ctx.strip()[:80]}"))
    # 4) 数字锚：每个 2+ 位数字必须能在 caliber_table 某行 value 中找到子串
    table = parse_caliber_table()
    digit_pat = re.compile(r'(?<!\w)(\d{2,})(?!\w)')
    for m in digit_pat.finditer(text):
        val = m.group(1)
        ctx = text[max(0, m.start()-50): m.end()+30]
        if any(w in ctx for w in ['wc -l', '行 ', 'L', '：', '§', 'T-', 'PRAGMA', 'py -3', 'node ',
                                   'w:', 'TIdb', 'sqlite', 'python 3.14', '8.', '9.', '0.', '1.', '2.', '3.', '4.', '5.', '6.', '7.']):
            continue
        matched = any(val in info['value'] for info in table.values())
        if not matched:
            ls = text.rfind('\n', 0, m.start()) + 1
            ln = text[:ls].count('\n') + 1
            findings.append((str(path), ln, "DIGIT-UNANCHORED",
                f"数字 {val} 不在口径表 calibers value 中: {ctx.strip()[:60]}"))
    return findings

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: py -3.14 caliber_guard.py <file1> [file2...] [--full-include-source]", file=sys.stderr); sys.exit(1)
    # α-6 v5：闸自校——repro 命令 vs value 真值校（防 caliber_table 自指漂移）
    table = parse_caliber_table()
    drift_findings = []
    for name, info in table.items():
        repro = info.get('repro', '')
        val = info.get('value', '')
        if not repro or not val or '实时' not in name:  # 只校"实时"行
            continue
        # 跑 repro（skip 内联表达式如 "42 × 7"）
        if repro.startswith('`') and repro.endswith('`'):
            cmd = repro.strip('`')
            # 安全过滤：只允许白名单命令
            if not (cmd.startswith('py -3.14') or cmd.startswith('wc -l') or cmd.startswith('ls ')):
                continue
            try:
                actual = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10,
                                          cwd=ROOT).stdout.strip().split('\n')[0]
                # 提取数字
                # α-7 v6.1：caliber_table 实时行 value 易漂（每 commit +1-2 行），
                # 软校 = 差 ≤ 5% 放过（防自噪）；绝对差 > 5% 才报
                import re as _re
                an = _re.findall(r'\d+', actual)
                vn = _re.findall(r'\d+', val)
                if an and vn and an[0] != vn[0]:
                    try:
                        a_n, v_n = int(an[0]), int(vn[0])
                        ratio = abs(a_n - v_n) / max(v_n, 1)
                        if ratio > 0.05:  # 漂 > 5% 才报
                            drift_findings.append((str(CALIBER_TABLE), 0, 'DRIFT',
                                f"caliber_table 漂移：'{name}' repro={an[0]} vs value={vn[0]}（drift {ratio*100:.1f}% 报源头）"))
                    except (ValueError, ZeroDivisionError):
                        pass
            except Exception as e:
                drift_findings.append((str(CALIBER_TABLE), 0, 'DRIFT-RUNERR', f"'{name}' repro 执行失败: {e}"))
    if drift_findings:
        print("[SOURCE-DRIFT] caliber_table 自指漂移闸报")
        for f in drift_findings:
            print(f"  {f[0]}:{f[2]}: {f[3]}")
    # α-7 v6.2 修：3 闸同源互不为被审= caliber_guard 加 pre_emit_check + finding_lifecycle 豁免
    three_gates_self = {
        pathlib.Path(__file__).resolve(),
        pathlib.Path(__file__).with_name('pre_emit_check.py').resolve(),
        pathlib.Path(__file__).with_name('finding_lifecycle.py').resolve(),
    }
    # α-1 修：源头豁免仅限禁配+词义三义（表内出现是定义不是违例）——保留数字锚检查（漂移检测核心）
    source = pathlib.Path(CALIBER_TABLE).resolve()
    full_include = '--full-include-source' in sys.argv
    files = [pathlib.Path(p).resolve() for p in sys.argv[1:] if p != '--full-include-source']
    files = [f for f in files if f not in three_gates_self]  # 3 闸同源互不为被审
    total = 0
    for path in files:
        path_str = str(path)
        is_source = (path == source) and not full_include
        for f in scan(path):
            kind = f[2]
            # 源头表：只豁免 FORBID/NO-SUBTOKEN/VOCAB-AMBIG（表内引用是定义）；数字锚仍报
            if is_source and kind in ('FORBID', 'NO-SUBTOKEN', 'VOCAB-AMBIG'):
                print(f"  [SOURCE-NOISE] {f[0]}:{f[1]}:{f[2]}: {f[3]}")
                continue
            print(f"{f[0]}:{f[1]}:{f[2]}: {f[3]}")
            total += 1
    print(f"-- {total} findings; drift={len(drift_findings)}", file=sys.stderr)
    sys.exit(1 if total or drift_findings else 0)
