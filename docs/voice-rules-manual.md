# 规则引擎使用手册（integrity-rules · M4 前端纯函数层）

> 对应 `docs/modernization-discussion.md` v1.1 §2.1 三闸设计与 §2.4 M4 步骤。
> 代码：`js/shared/integrity-rules.js`（纯函数，Node ≥18 与浏览器同构）+ `js/shared/voice-rules.json`（禁用词单一事实源）。
> 测试：`node --test js/shared/integrity-rules.test.js`（Windows 下目录参数请给文件路径）。

## 三个函数与严重级别

| 函数 | 闸位 | 返回 | 管理界面动作 |
|---|---|---|---|
| `lintCopy(text, rules?)` | 语音表 lint（前后端双闸） | `{violations:[{word,index,suggestion,reason}]}` | 输入框下方逐条高亮，`index` 可定位词首 |
| `checkNameImage({name, description, factCard})` | 三闸之第二闸：词表冲突 | `{warnings:[], blockers:[]}` | **黄警可存草稿、发布预览须逐条确认；红拦禁止发布** |
| `sanityCheck({price, originalPrice, stock, peerPrices?})` | 保存前数值校验 | `{errors:[], warnings:[]}` | **errors 禁止保存；warnings 弹确认** |

`checkNameImage` 规则码：`COLOR_MISMATCH`（文案颜色词色系 ∉ 事实卡主色系，黄警）、`CARRY_MISMATCH`（背法不一致，黄警）、`FACT_CARD_COLOR_MISSING` / `FACT_CARD_BAG_MISSING`（黄警，提示回第一闸看图四选）、`BAG_SILHOUETTE_MISMATCH`（结构包型冲突，**红拦**——包型写进名字即主要卖点）、`BAG_TYPE_MISSING`（文案与事实卡均无包型词，红拦）。

## 词表怎么加词

- **禁用词**：改 `js/shared/voice-rules.json`（单一事实源），再同步 `integrity-rules.js` 里的内嵌镜像 `VOICE_RULES`（前端同步用，免 fetch）。测试有用例断言两者深度相等，漏同步会红。条目字段：`word`/`reason`/`suggestion`，可选 `exceptions`（含该词但属误报的长词，如 亲自、宝石——支持前向与后向包含）与 `pattern`+`flags`（正则条目，如多个感叹号 `[!！]{2,}`）。
- **颜色/包型词**：直接编辑 `integrity-rules.js` 导出的 `COLOR_FAMILIES`（色系→成员词）与 `BAG_SILHOUETTES` / `BAG_CARRY_STYLES`（canonical→同义/别名，如 小圆筒+圆筒、托特+tote）。事实卡下拉可直接渲染这三个导出。
- 归一化语义：词先归到色系/词组再比较——湖蓝↔蓝、柠檬黄↔黄、樱花粉↔粉 同系；小圆筒↔圆筒 同包型。事实卡主色含多个根字时全部放行（「蓝白」→ {蓝,白}，「绿橙紫渐变」→ {绿,橙,紫,渐变}）。
- 已知防误报机制（改词表时勿破坏）：颜色词紧邻五金语境跳过（金色五金/银色链条/拉链银）；「链条」紧跟颜色字且后面不是「包」判为链带五金，`链条包` 才是结构包型；禁用词例外表防误报（亲自/母亲/宝蓝/宝石）。
- 扩展点：材质纹理词（织纹/牛皮/帆布，事故 2 的另一半）尚无词表，M4 落地事实卡时按同模式加 `TEXTURE_WORDS` 即可。

## sanity 阈值含义（`SANITY_THRESHOLDS`）

- `PEER_DEVIATION_WARN_RATIO: 0.5`——现价偏离同类中位数超 50% 黄警（抓 399 误输 39.9/3990）。
- `ORIGINAL_INFLATE_WARN_RATIO: 3`——划线价 ≥ 现价 3 倍黄警（涉嫌虚高）。
- errors 类：价格缺失/非数/≤0、原价非法或低于现价、库存缺失/非数/负数/非整数。

## 管理界面（里程碑二 M3/M4）怎么接

浏览器（admin.html，ESM 直引，无构建依赖）：

```html
<script type="module">
  import { lintCopy, checkNameImage, sanityCheck, COLOR_FAMILIES, BAG_SILHOUETTES } from './js/shared/integrity-rules.js';

  const lint = lintCopy(nameEl.value);                    // 输入即扫，violations[].index 高亮
  const gate = checkNameImage({ name: nameEl.value, description: descEl.value, factCard });
  if (gate.blockers.length) publishBtn.disabled = true;   // 红拦禁发布；黄警进发布预览确认单
  const sanity = sanityCheck({ price, originalPrice, stock, peerPrices: similarPrices });
  if (sanity.errors.length) saveBtn.disabled = true;
</script>
```

Node 后端（双闸同源，后端读 JSON，不 import 前端文件）：

```js
import { checkNameImage, sanityCheck } from '<repo>/js/shared/integrity-rules.js'; // 与前端共用冲突引擎
import banned from '<repo>/js/shared/voice-rules.json' with { type: 'json' };      // 禁用词同源
// POST /api/products 服务端复检：lintCopy(name, banned) + checkNameImage + sanityCheck，任一 blocker/error → 400
```

事故回归：三个名实不符历史案例已固化为测试（事故 1 柠檬黄→黄警、事故 2 托特≠凯莉→红拦、事故 3 粉到金∉绿橙紫→双黄警），改词表后跑 `node --test js/shared/integrity-rules.test.js` 防回退。
