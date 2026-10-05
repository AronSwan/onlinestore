# 图片来源与许可（P1 · 换真图）

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
