# 图片资源优化指南

## 📁 目录结构
```
images/
├── hero/           # 主页英雄区图片
├── products/       # 产品图片
├── banners/        # 横幅广告图片
└── README.md       # 本指南文件
```

## 🖼️ 图片优化规范

### 格式要求
- **现代格式**: WebP（推荐）、AVIF（高级）
- **回退格式**: JPEG、PNG
- **透明度**: PNG（需要透明度时）

### 尺寸规范
- **英雄区图片**: 1920×1080px（桌面）、1280×720px（平板）、768×432px（手机）
- **产品图片**: 600×800px（标准）、300×400px（缩略图）
- **横幅图片**: 1920×600px（全宽）、1280×400px（中等）

### 文件大小
- **英雄区**: < 200KB（WebP格式）
- **产品图**: < 100KB（WebP格式）
- **横幅**: < 150KB（WebP格式）

### 响应式图片
```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="描述" loading="lazy" fetchpriority="low">
</picture>
```

## 🔄 转换工具推荐
1. **在线工具**: Squoosh.app、TinyPNG
2. **命令行**: `cwebp -q 85 input.jpg -o output.webp`
3. **构建工具**: 集成到webpack/vite构建流程

## 📊 性能目标
- **首次内容绘制(FCP)**: < 1.5秒
- **最大内容绘制(LCP)**: < 2.5秒
- **图片加载时间**: < 100ms（关键图片）  