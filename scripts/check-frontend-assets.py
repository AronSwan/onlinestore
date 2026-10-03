#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""check-frontend-assets.py -- 前端静态资源引用完整性检查（可复跑审计用）

检查范围（与前端改动范围一致）：
  1. 根目录 4 个 HTML 页面：index.html / login.html / orders.html / profile.html
     - 扫描标签属性 src= / href= / poster= / srcset= 中的本地引用
     - 同时扫描 HTML 内联 <script> 中带资源扩展名的字符串（如动态 import）
  2. js/ 目录下所有 .js 文件（排除 js/_archive/ -- 已归档的死代码，明确不检查）
     - 扫描字符串字面量中带资源扩展名的本地路径
  3. css/ 目录下所有 .css 文件
     - 扫描 @import "..." / @import url(...) 与 url(...) 中的本地引用
     - 按 CSS 语义相对该 CSS 文件所在目录解析（如 css/main.css 的
       './variables/complete-variables.css'、css/variables/xxx.css 引用同目录文件）

路径解析规则：
  - HTML 内的相对路径  -> 相对于仓库根目录（HTML 位于根目录）
  - HTML 内以 / 开头   -> 相对于仓库根目录；仅当带资源扩展名时才检查
                          （/about、/contact 这类无扩展名页面路由视为服务端路由，跳过）
  - JS 内 './x' '../x' -> 相对于该 JS 文件所在目录（ES import 语义）
  - JS 内其余相对路径  -> 相对于仓库根目录（本代码库 JS 的资源引用均为页面相对，
                          如 orders.js 中的 'images/products/product-1.jpg'）
  - CSS 内全部相对路径 -> 相对于该 CSS 文件所在目录（CSS url()/@import 语义）
  - CSS/JS 内以 / 开头 -> 相对于仓库根目录
  - 跳过：http(s)://、协议相对 //、data:、mailto:、tel:、javascript:、纯锚点 #、
          含模板占位（{{ }} / ${}）的字符串

带查询串/锚点的引用会先剥离 ?... #... 再检查。
跳过以 / 结尾的目录型引用。

输出：所有缺失引用（按文件分组）；发现缺失时 exit 1，全部存在 exit 0。
用法：python3 scripts/check-frontend-assets.py   （在仓库根目录或任意目录运行）
"""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

HTML_FILES = ["index.html", "login.html", "orders.html", "profile.html"]
JS_DIR = "js"
JS_EXCLUDE_DIRS = {"_archive"}  # 已归档死代码，不做检查
CSS_DIR = "css"

ASSET_EXT = re.compile(
    r"\.(html?|css|js|mjs|cjs|json|webmanifest|svg|png|jpe?g|gif|webp|avif|ico|"
    r"bmp|woff2?|ttf|otf|eot|mp4|webm|mp3|pdf)$",
    re.IGNORECASE,
)

SKIP_PREFIXES = (
    "http://", "https://", "//", "data:", "mailto:", "tel:",
    "javascript:", "#", "{{",
)

# 标签属性引用（src / href / poster / srcset）
ATTR_RE = re.compile(
    r"""(?:src|href|poster|srcset)\s*=\s*["']([^"']+)["']""", re.IGNORECASE
)
# 字符串字面量（含模板字符串；含 ${ 的稍后过滤）
STR_RE = re.compile(r"""["'`]([^"'`\n]+)["'`]""")

# CSS @import：@import "x.css" / @import 'x.css' / @import url(x.css) / @import url("x.css")
CSS_IMPORT_RE = re.compile(
    r"""@import\s+(?:url\(\s*)?["']?([^"'()\s;]+)["']?\s*\)?""", re.IGNORECASE
)
# CSS url(...) 引用
CSS_URL_RE = re.compile(r"""url\(\s*["']?([^"')]+)["']?\s*\)""", re.IGNORECASE)
# data: URI（先剔除，避免 SVG data URI 内部的 url(%23anchor) 等子串造成噪音）
CSS_DATA_URI_RE = re.compile(r"""url\(\s*["']?\s*data:[^"')]*["']?\s*\)""", re.IGNORECASE)

TEMPLATE_MARKERS = ("${",)


def candidate_asset(ref: str):
    """返回应检查的 (原始引用, 剥离查询/锚点后的路径)；非资源返回 None。"""
    ref = ref.strip()
    if not ref or ref.endswith("/"):
        return None
    if ref.startswith(SKIP_PREFIXES):
        return None
    if any(marker in ref for marker in TEMPLATE_MARKERS):
        return None
    path = ref.split("?")[0].split("#")[0]
    if not path or path.endswith("/"):
        return None
    if not ASSET_EXT.search(path):
        return None
    return ref, path


def resolve(path: str, base_dir: Path) -> Path:
    if path.startswith("/"):
        return REPO_ROOT / path.lstrip("/")
    return (base_dir / path).resolve()


def collect_html_refs(html_path: Path):
    """收集 HTML 文件中的本地资源引用，返回 {引用字符串: 解析后的绝对路径}。"""
    refs = {}
    text = html_path.read_text(encoding="utf-8", errors="replace")
    base = html_path.parent

    raw_refs = [m for m in ATTR_RE.findall(text)]
    # 内联脚本中的字符串（如动态 import('./js/...')）
    raw_refs += STR_RE.findall(text)

    for ref in raw_refs:
        # srcset 可能是 "a 1x, b 2x" 形式
        for part in ref.split(","):
            part = part.strip().split(" ")[0]
            cand = candidate_asset(part)
            if cand is None:
                continue
            orig, path = cand
            refs.setdefault(orig, resolve(path, base))
    return refs


def collect_js_refs(js_path: Path):
    refs = {}
    text = js_path.read_text(encoding="utf-8", errors="replace")
    for lit in STR_RE.findall(text):
        cand = candidate_asset(lit)
        if cand is None:
            continue
        orig, path = cand
        # './x' / '../x' 按 ES import 语义相对 JS 文件解析；
        # 其余按页面相对（仓库根）解析
        if path.startswith("./") or path.startswith("../"):
            base = js_path.parent
        else:
            base = REPO_ROOT
        refs.setdefault(orig, resolve(path, base))
    return refs


def collect_css_refs(css_path: Path):
    """收集 CSS 文件中的 @import / url() 本地引用，返回 {引用字符串: 解析后的绝对路径}。

    按 CSS 语义相对该 CSS 文件所在目录解析；以 / 开头按仓库根目录解析。
    先剔除 data: URI，再分别匹配 @import 与 url()。
    """
    refs = {}
    text = css_path.read_text(encoding="utf-8", errors="replace")
    text = CSS_DATA_URI_RE.sub("", text)
    base = css_path.parent

    raw_refs = CSS_IMPORT_RE.findall(text) + CSS_URL_RE.findall(text)
    for ref in raw_refs:
        cand = candidate_asset(ref)
        if cand is None:
            continue
        orig, path = cand
        if path.startswith("/"):
            refs.setdefault(orig, resolve(path, REPO_ROOT))
        else:
            refs.setdefault(orig, resolve(path, base))
    return refs


def main() -> int:
    missing = {}
    checked = 0

    for name in HTML_FILES:
        html_path = REPO_ROOT / name
        if not html_path.exists():
            missing.setdefault(str(html_path), []).append(("<检查对象缺失>", html_path))
            continue
        for ref, target in sorted(collect_html_refs(html_path).items()):
            checked += 1
            if not target.exists():
                missing.setdefault(name, []).append((ref, target))

    js_root = REPO_ROOT / JS_DIR
    if js_root.exists():
        for js_path in sorted(js_root.rglob("*.js")):
            if any(part in JS_EXCLUDE_DIRS for part in js_path.relative_to(REPO_ROOT).parts):
                continue
            for ref, target in sorted(collect_js_refs(js_path).items()):
                checked += 1
                if not target.exists():
                    rel = js_path.relative_to(REPO_ROOT).as_posix()
                    missing.setdefault(rel, []).append((ref, target))

    css_root = REPO_ROOT / CSS_DIR
    if css_root.exists():
        for css_path in sorted(css_root.rglob("*.css")):
            if any(part in JS_EXCLUDE_DIRS for part in css_path.relative_to(REPO_ROOT).parts):
                continue  # css/_archive/ 同为归档死代码
            for ref, target in sorted(collect_css_refs(css_path).items()):
                checked += 1
                if not target.exists():
                    rel = css_path.relative_to(REPO_ROOT).as_posix()
                    missing.setdefault(rel, []).append((ref, target))

    print(f"check-frontend-assets: 共检查 {checked} 条本地资源引用")
    if missing:
        print("\n发现缺失的资源引用：\n")
        for src_file, items in sorted(missing.items()):
            for ref, target in items:
                print(f"  [{src_file}]  {ref}")
                print(f"      -> 期望路径: {target}")
        total = sum(len(v) for v in missing.values())
        print(f"\n结果: FAIL -- {total} 条引用缺失")
        return 1

    print("结果: OK -- 所有本地资源引用均存在")
    return 0


if __name__ == "__main__":
    sys.exit(main())
