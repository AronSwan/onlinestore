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
