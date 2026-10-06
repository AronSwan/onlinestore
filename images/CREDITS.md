# 图片来源与许可（P1 · 换真图）

> **演示边界（权益批 A5 · 品牌 P1-2 演示补丁）**：演示商品图文为图库素材，非实际销售商品——规格数据为演示虚构。

全部图片来自 Unsplash，依据 [Unsplash License](https://unsplash.com/license)（免费商用、无需署名）使用。
后期统一处理：`sharp .modulate({ brightness: 1.05, saturation: 0.95 })`（调亮 + 微暖），JPEG quality 85 / WebP quality 82。

| 本地文件 | Unsplash Photo ID | 来源页 | 尺寸 | 许可 |
|---|---|---|---|---|
| `hero/hero-main.jpg` + `.webp` | `photo-1758817729450-694d6987de81` | https://unsplash.com/photos/woman-holding-handbag-in-front-of-colorful-mural-33ZCaZJUmmc | 2400×1600 | Unsplash License |
| `products/product-1.jpg` + `.webp` | `photo-1761646238431-dd22150544e8` | https://unsplash.com/photos/pleated-handbag-with-ombre-color-gradient-Uovi1uuW3gQ | 800×1067 (3:4) | Unsplash License |
| `products/product-2.jpg` + `.webp` | `photo-1705909237050-7a7625b47fac` | https://unsplash.com/photos/a-black-leather-bag-on-a-yellow-background-lnbuoKz2GlM | 800×1067 (3:4) | Unsplash License |
| `products/product-3.jpg` + `.webp` | `photo-1652427019217-3ded1a356f10` | https://unsplash.com/photos/a-blue-and-white-handbag-P9EY1oR7PMs | 800×1067 (3:4) | Unsplash License |
| `products/product-4.jpg` + `.webp` | `photo-1524672353063-4f66ee1f385e` | https://unsplash.com/photos/photography-of-crossbody-bags-k5fUTay0ghw | 800×1067 (3:4) | Unsplash License |
| `products/product-5.jpg` + `.webp` | `photo-1591561954555-607968c989ab` | https://unsplash.com/photos/blue-and-brown-floral-leather-handbag-8nyw0tRH3Wt | 800×1067 (3:4) | Unsplash License |
| `products/product-6.jpg` + `.webp` | `photo-1566150905458-1bf1fc113f0d` | https://unsplash.com/photos/pink-leather-crossbody-bag-APNnyM36puU | 800×1067 (3:4) | Unsplash License |
| `banners/banner-promo.jpg` + `.webp` | `photo-1713425885188-f1daa057691f` | https://unsplash.com/photos/three-different-types-of-purses-on-a-white-background-eCSEAlw85zc | 1200×800 | Unsplash License |
| `og/og-image.jpg` | （hero 裁切）`photo-1758817729450-694d6987de81` | 同 hero 来源页 | 1200×630 | Unsplash License |

CDN 直链格式（下载参数）：`https://images.unsplash.com/<photo-id>?w=…&h=…&fit=crop&q=80`（hero 为 `?w=2400&q=85`）。

选图口径：明亮光比（整图平均亮度 hero≈173、商品 122–218、banner≈205），同风格彩色皮具影棚单品照（浅底/彩底影棚、光比一致），已避开 Unsplash+ 付费图（`plus.unsplash.com`）与画面含明显品牌字的图。

## 二次处理记录（M1 · 三灯光归一，2026-10-05）

第四轮整改 B7：六图棚向统一【暖米/纯白系】（product-2 黑底黄荧光棚、product-5 深棕黑棚违宪最重；原图备份于 `products/originals/`，`scripts/reprocess-product-images.mjs` 幂等可重跑）。

管线：`modulate(饱和) → linear(影调) → soft-light 暖米染 → multiply 极浅暖落白`，全局影调、无局部重绘（商品本体色相未篡改：黑包仍黑、蓝花仍蓝）。尖峰验证 p2-G/p3-sat30 案先过白底和谐再批六张。

| 文件 | 处理（饱和/linear/soft-light） | 棚向 L 前→后 | jpg 前→后 | webp 后 |
|---|---|---|---|---|
| `product-1` | 0.95 / (1.0,+8) / (252,248,240) | L210→228 | 53.1→47.7KB | 28.0KB |
| `product-2` | 0.16 / (0.95,+66) / (250,242,228)，jpeg q82 | L113→194 | 131.0→112.5KB | 116.1KB |
| `product-3` | 0.30 / (0.97,+40) / (249,238,220) | L157→227 | 38.6→27.9KB | 12.3KB |
| `product-4` | 0.94 / (1.0,+4) / (252,248,240) | L219→235 | 46.5→34.7KB | 21.8KB |
| `product-5` | 1.02 / (0.92,+62) / (248,240,226)，jpeg q80 | L127→206 | 164.5→119.1KB | 113.0KB |
| `product-6` | 0.93 / (1.0,+4) / (251,246,236) | L217→234 | 57.4→37.4KB | 22.7KB |

旗舰体积闸：product-1 jpg 47.7KB ≤120KB 预算 PASS；LCP 复测（1440×900，5 轮取中位）：原图态 408ms → 处理后 400ms，LCP 元素恒为 `images/hero/hero-main.webp`，无劣化。

## 三次处理记录（国际挑剔用户批 A 档 4 · Retina 重取件，2026-10-06）

Unsplash 源重取 `?w=1600`（商品 `&h=2133&fit=crop&q=85`、hero 自然比例 1600×1067；走代理下载），`products/originals/` 与 `hero/originals/` 备份同步更新为 1600 源。管线不变（M1 同族），变更两点：
1. **调色幅度砍半**（巴黎贵妇"饱和 0.16 是漂白"）：modulate 偏离中性 1.0 的距离减半——p2 0.16→**0.58**、p3 0.30→**0.65**、p5 1.02→**1.01**；linear/softlight 不动。
2. **四档 srcset 变体 + 160 缩略档**：每图产出 `product-N-160/-480/-800/-1200/-1600.webp`（q82）+ `product-N.jpg` 800w 回退档 + `product-N.webp`（=800 档副本，旧引用兼容）；hero 同构 `hero-main-{480,800,1200,1600}.webp` + `hero-main.jpg`（1600w 全幅）+ `hero-main.webp`（=1600 档副本）。脚本 `scripts/reprocess-product-images.mjs`（幂等，从 originals 推导）。

| 图 | 160w | 480w | 800w | 1200w | 1600w | jpg800 回退 | 棚向 L 前→后 |
|---|---|---|---|---|---|---|---|
| `product-1` | 2.3KB | 12.2KB | 29.0KB | 70.6KB | 162.4KB | 46.3KB | L199→224 |
| `product-2` | 5.2KB | 41.4KB | 116.5KB | 252.8KB | 412.1KB | 108.4KB | L106→190 |
| `product-3` | 1.6KB | 6.8KB | 13.2KB | 23.4KB | 38.2KB | 25.3KB | L147→219 |
| `product-4` | 1.4KB | 9.8KB | 23.8KB | 45.9KB | 72.2KB | 33.9KB | L207→230 |
| `product-5` | 7.4KB | 51.0KB | 118.9KB | 208.7KB | 308.8KB | 114.6KB（q78） | L120→202 |
| `product-6` | 1.9KB | 10.4KB | 22.7KB | 41.2KB | 72.9KB | 33.0KB | L206→227 |
| `hero-main` | — | 32.0KB | 70.3KB | 118.7KB | 182.7KB | 260.1KB（1600w jpg） | — |

旗舰体积闸复跑：product-1 jpg800 46.3KB ≤120KB PASS（p5 123.0KB 轻超软预算 → q80→78 压至 114.6KB）。消费端接线：六商品卡（home-products.js srcset/sizes）、hero（index.html `imagesrcset` preload + `<source srcset>`）、PDP（product.js 运行时变体推导）、订单/袋内缩略（orders.js 160w 档）。
