#!/usr/bin/env python3
"""
finding_lifecycle.py —— RC3 后果绑定闸 v2（α-1 修：OR→AND + 全宽修复 + 长度上限 + 优先级护栏）

动机（实践 A TC4/TC5/TC11/QA6 抓 4 P0）：
  - v1 regex `r"责任人[=＝].+|升级触发线[=＝].+"` 用 OR 而非 AND——finding 仅含"责任人=A"即过（漏接）
  - `______` 占位通过 `责任人=.+` regex（priority-wrong 漏接）
  - super-long finding 无长度上限（TC4 漏接）
  - v1 误用全角冒号导致三件齐判定失配（修全宽字符类后已修）

修法（α-1）：
  - `3-owner-upgrade` regex 改 AND：要求责任 人= 和 升级触发线= **都出现**
  - 拒占位：责任 人/.+/升级触发线/。+ 不允许 `______`/`TBD`/`N/A` 等占位
  - 长度上限：finding body > 5000 字符拒（防 super-long 凑数）
  - 优先级护栏：finding 必须含"优先"级字段（高/中/低/P0/P1/P2）否则拒
"""
import re, sys, json, pathlib
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
BACKLOG = ROOT / 'docs' / 'BACKLOG.md'

# α-1: AND（实为前瞻断言"责任 人="与"升级触发线="**都出现**；中间可隔任意字符）
REQ = {
    "1-task-book":   r"任务书授权行[::\uFF1A]\s*有",
    "2-ledger-row":  r"已排期批名|可判定触发事件|立账日期",
    "3-owner-upgrade": r"责任人[=＝\uFF1D].+升级触发线[=＝\uFF1D].+",  # AND：两件中间任意字符
}

# 拒占位（v1 漏：______ 通过 .+ 正则）
PLACEHOLDERS = ["______", "TBD", "tbd", "N/A", "n/a", "TODO", "todo", "占位", "待填"]

# 长度上限（防 super-long 凑数）
MAX_BODY = 5000

# 优先级字段必含
PRIORITY_PAT = r"优先级[::\uFF1A]\s*(高|中|低|P0|P1|P2)|\[(P[012])\]"

def find_missing(finding_text):
    miss = []
    for k, pat in REQ.items():
        if not re.search(pat, finding_text):
            miss.append(k)
    return miss

def find_placeholder_violations(finding_text):
    """任一占位符出现在"责任 人"或"升级触发线"附近 30 字内=违规"""
    viols = []
    for m in re.finditer(r"责任人[=＝\uFF1D](.{1,60})升级触发线[=＝\uFF1D](.{1,60})", finding_text):
        seg = m.group(0)
        for ph in PLACEHOLDERS:
            if ph in seg:
                viols.append(f"占位符 '{ph}' 在 责任 人/升级触发线 段内: {seg.strip()[:60]}")
                break
    return viols

def find_size_violation(finding_text):
    if len(finding_text) > MAX_BODY:
        return [f"finding body 长度 {len(finding_text)} > {MAX_BODY}（防 super-long 凑数）"]
    return []

def find_priority_violation(finding_text):
    if not re.search(PRIORITY_PAT, finding_text):
        return ["未含优先级字段（高/中/低/P0/P1/P2）"]
    return []

def main():
    if len(sys.argv) < 2:
        print("用法: py -3.14 finding_lifecycle.py <finding.md|json> [--dry-run] [--no-backlog]", file=sys.stderr); sys.exit(1)
    # γ-bifrost 步骤 2：默认 auto-append BACKLOG（通过即入账）—— 关闭用 --dry-run（仅打印不入账）
    dry_run = '--dry-run' in sys.argv
    no_backlog = '--no-backlog' in sys.argv
    src = pathlib.Path(sys.argv[1])
    text = src.read_text(encoding='utf-8', errors='ignore')
    miss = find_missing(text)
    placeholders = find_placeholder_violations(text)
    over_size = find_size_violation(text)
    no_priority = find_priority_violation(text)
    if miss or placeholders or over_size or no_priority:
        print("[X] 规则 8 三件不齐/含占位/超长/缺优先级——发现**不立案**（防潜伏），缺：")
        for m in miss: print(f"  - {m}")
        for v in placeholders: print(f"  - {v}")
        for v in over_size: print(f"  - {v}")
        for v in no_priority: print(f"  - {v}")
        sys.exit(2)
    print("[OK] 规则 8 三件齐（含 AND + 无占位 + 长度+优先级）——有效立案")
    if src.suffix == '.json':
        finding_obj = json.loads(text)
        num = finding_obj.get('编号', f"R-{date.today().strftime('%Y%m%d')}-X")
        theme = finding_obj.get('主题', '（无主题）')
        owner = finding_obj.get('责任人', '______')
        trig_date = finding_obj.get('触发日期', date.today().isoformat())
        upgrade = finding_obj.get('升级触发线', '______')
        why_not = finding_obj.get('为什么不做', '______')
        period = finding_obj.get('期', '③可判定触发事件：______（必填：触发事件+到来方式）')
        row = (f"- **挂账行【编号={num}】**：{theme}——归" + finding_obj.get('归', '______') + 
               f"，期={period}；责任人={owner}；触发日期={trig_date}；"
               f"为什么不做={why_not}；升级触发线={upgrade}；移交日期={date.today().isoformat()}")
    else:
        m = re.search(r"##\s*挂账行.*?\n(.+?)(?=\n##|\Z)", text, re.S)
        row = m.group(1).strip() if m else "[?] md 输入未找到 ## 挂账行 段"
    print(f"挂账行（已具备入账条件）：\n{row}")
    # γ-bifrost 步骤 2：默认 auto-append BACKLOG（--dry-run 关闭）
    if not no_backlog and not dry_run:
        with BACKLOG.open('a', encoding='utf-8') as f:
            f.write('\n' + row + '\n')
        print(f"[AUTO-APPEND] 已写入 {BACKLOG.name}")
    else:
        print(f"(入账已{'dry-run' if dry_run else '禁用'}：行待手动入账)")

if __name__ == "__main__":
    main()
