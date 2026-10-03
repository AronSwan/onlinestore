# 用途：前端死文件探测器——HTML 引用 + JS import 闭包 + CSS @import 闭包求活性集，
#       全树减去活性集输出待归档清单。复用于每次清理前重算（不信任历史清单）。
# 用法：python scripts/find_dead_frontend.py [--apply]
import os, re, sys

HTMLS = ['index.html', 'login.html', 'orders.html', 'profile.html']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def resolve(base, href):
    if href.startswith(('http', '//', 'data:', '#', 'mailto:')):
        return None
    href = href.split('?')[0].split('#')[0]
    if not href:
        return None
    p = os.path.normpath(os.path.join(base, href))
    return p if os.path.exists(p) else None

active = set()
for h in HTMLS:
    s = open(h, encoding='utf-8').read()
    for m in re.findall(r'(?:src|href|poster)="([^"]+)"', s):
        p = resolve(ROOT, m)
        if p:
            active.add(p)
    for m in re.findall(r"""['"`](\.{1,2}/[^'"`\s]+\.(?:js|css))['"`]""", s):
        p = resolve(ROOT, m)
        if p:
            active.add(p)

changed = True
while changed:
    changed = False
    for f in list(active):
        if not f.endswith('.js'):
            continue
        try:
            s = open(f, encoding='utf-8').read()
        except OSError:
            continue
        base = os.path.dirname(f)
        refs = re.findall(r"""(?:from\s*|import\s*|require\()\s*['"]([^'"]+)['"]""", s)
        refs += re.findall(r"""['"`](\.{1,2}/[^'"`\s]+\.(?:js|css))['"`]""", s)
        for m in refs:
            if m.startswith(('http', '//', 'node:')):
                continue
            p = resolve(base, m)
            if p and p not in active:
                active.add(p)
                changed = True

changed = True
while changed:
    changed = False
    for f in list(active):
        if not f.endswith('.css'):
            continue
        s = open(f, encoding='utf-8').read()
        base = os.path.dirname(f)
        for m in re.findall(r"""@import\s+['"]([^"']+)['"]""", s):
            if m.startswith(('http', '//', 'data:')):
                continue
            p = resolve(base, m)
            if p and p not in active:
                active.add(p)
                changed = True

rel_active = {os.path.relpath(p, ROOT).replace(os.sep, '/') for p in active}

all_js, all_css = set(), set()
for dp, dn, fn in os.walk('js'):
    if '_archive' in dp:
        continue
    for f in fn:
        if f.endswith('.js'):
            all_js.add(os.path.join(dp, f).replace(os.sep, '/'))
for dp, dn, fn in os.walk('css'):
    if '_archive' in dp:
        continue
    for f in fn:
        if f.endswith('.css'):
            all_css.add(os.path.join(dp, f).replace(os.sep, '/'))
if os.path.exists('navigation-styles.css'):
    all_css.add('navigation-styles.css')

dead_js = sorted(all_js - rel_active)
dead_css = sorted(all_css - rel_active)
print(f'js:  全 {len(all_js)} | 活 {len(rel_active & all_js)} | 死 {len(dead_js)}')
print(f'css: 全 {len(all_css)} | 活 {len(rel_active & all_css)} | 死 {len(dead_css)}')
print('--- 死 JS ---')
for x in dead_js:
    print(' ', x)
print('--- 死 CSS ---')
for x in dead_css:
    print(' ', x)

if '--write-lists' in sys.argv:
    open('dead_js.txt', 'w').write('\n'.join(dead_js))
    open('dead_css.txt', 'w').write('\n'.join(dead_css))
    print('清单已写 dead_js.txt / dead_css.txt')
