#!/usr/bin/env python3
"""F5: 将上游 BarlowGX.ttf 构建为 CSS 标准可变字体 barlow-variable.woff2

上游问题（fonts/gx/BarlowGX.ttf @ jpt/barlow master）:
- wght 轴取值 22-188（非 CSS 100-900），default=22（应为 Regular）
- wdth 轴 300-500（300=Condensed, 500=Normal），本站点只需 Normal
- 无 avar：浏览器按 CSS 字重直传轴值会把 400 钳到 188（全文 Black）

处理:
1. instancer 钉死 wdth=500（与现有静态 barlow-400 轮廓逐位吻合，实测 h 宽 385）
2. fvar wght 轴改号为 100/400/900，并加 avar 把新归一化坐标映回旧坐标
   （锚点=9 个命名实例：100↔30, 200↔39, 300↔53, 400↔71, 500↔96,
     600↔116, 700↔141, 800↔166, 900↔188；已用静态 woff2 验证 400/700 轮廓一致）
3. 重建 STAT（wght 100-900）；删无斜体轴的 Italic 冗余实例
4. 输出 woff2（brotli）
"""
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.otlLib.builder import buildStatTable

SRC = "fonts/BarlowGX.ttf"
DST = "fonts/barlow-variable.woff2"

# CSS 字重 -> 上游 wght 轴原值
ANCHORS = [
    (100, 30.0, "Thin"),
    (200, 39.0, "ExtraLight"),
    (300, 53.0, "Light"),
    (400, 71.0, "Regular"),
    (500, 96.0, "Medium"),
    (600, 116.0, "SemiBold"),
    (700, 141.0, "Bold"),
    (800, 166.0, "ExtraBold"),
    (900, 188.0, "Black"),
]
OLD_MIN, OLD_MAX = 22.0, 188.0
NEW_MIN, NEW_DEF, NEW_MAX = 100.0, 400.0, 900.0


def old_norm(v: float) -> float:
    # 旧轴 default=min=22，仅正侧
    return (v - OLD_MIN) / (OLD_MAX - OLD_MIN)


def new_norm(w: float) -> float:
    if w <= NEW_DEF:
        return (w - NEW_DEF) / (NEW_DEF - NEW_MIN)
    return (w - NEW_DEF) / (NEW_MAX - NEW_DEF)


def main() -> None:
    font = TTFont(SRC)

    # 1. 钉死 wdth=500（Normal 宽度），移除 wdth 轴
    instancer.instantiateVariableFont(font, {"wdth": 500}, inplace=True)

    fvar = font["fvar"]
    assert len(fvar.axes) == 1 and fvar.axes[0].axisTag == "wght"

    # 2. wght 轴改号 + avar 映回旧坐标
    axis = fvar.axes[0]
    axis.minValue, axis.defaultValue, axis.maxValue = NEW_MIN, NEW_DEF, NEW_MAX

    from fontTools.ttLib.tables._a_v_a_r import table__a_v_a_r

    avar = table__a_v_a_r()
    avar.segments = {
        "wght": {new_norm(css): old_norm(old) for css, old, _ in ANCHORS}
    }
    font["avar"] = avar

    # 3. fvar 实例改号；删 Italic 冗余（无 ital 轴，坐标与正体重复）
    name = font["name"]
    keep = []
    coord_map = {old: css for css, old, _ in ANCHORS}
    for inst in fvar.instances:
        sub = name.getDebugName(inst.subfamilyNameID) or ""
        if "Italic" in sub:
            continue
        if inst.coordinates.get("wght") in coord_map:
            inst.coordinates["wght"] = coord_map[inst.coordinates["wght"]]
            keep.append(inst)
    fvar.instances = keep

    # 4. 重建 STAT
    if "STAT" in font:
        del font["STAT"]
    buildStatTable(
        font,
        [
            {
                "tag": "wght",
                "name": "Weight",
                "values": [
                    {
                        "value": css,
                        "name": nm,
                        **({"flags": 0x2} if nm == "Regular" else {}),
                    }
                    for css, _, nm in ANCHORS
                ],
            }
        ],
    )

    # 5. 存 woff2
    font.flavor = "woff2"
    font.save(DST)
    print(f"written {DST}")

    # 校验：重新载入，按 CSS 字重插值比对轮廓
    check = TTFont(DST)
    print("axes:", [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in check["fvar"].axes])
    print("avar wght segments:", check["avar"].segments["wght"])
    from fontTools.pens.boundsPen import BoundsPen

    for css_w, expect in ((400, (80, 0, 465, 700)), (700, (52, 0, 498, 700))):
        gs = check.getGlyphSet(location={"wght": css_w})
        pen = BoundsPen(gs)
        gs["h"].draw(pen)
        got = tuple(round(v) for v in pen.bounds)
        print(f"wght={css_w}: h bounds {got} (static reference {expect})")


if __name__ == "__main__":
    main()
