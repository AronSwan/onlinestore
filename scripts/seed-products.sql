-- ============================================================================
-- seed-products.sql — 首页商品种子数据（P4 · 商品接数据）
--
-- 内容：6 个 Reich 商品（比首页 3 卡多 3 个，让网格有滚动余量）。
--       文案遵循 docs/voice-sheet.md（明亮俏皮从容；禁用限时/抢购/顶级/立即等促销与自夸词）。
-- 字段对齐 backend/src/products/entities/product.entity.ts（products 表实际列）：
--   id,name,description,price,originalPrice,stock,sales,isActive,views,favorites,
--   mainImage,tags(simple-array→逗号分隔文本),specifications(json),
--   createdAt,updatedAt,publishedAt,version,categoryId
--   注：实体无 brand 列（brand 为前端微数据固定值 Reich），故不插入。
-- mainImage 指向 P1 下载的真图（/images/products/product-N.jpg，同目录有 .webp 版本）。
-- 使用 INSERT OR REPLACE：可重复执行；固定 id 1-6（顺带清掉审计期残留的
--   id=2「审计商品A」与 id=6「反诈实践商品」），执行后 products 恰好 6 条。
--
-- 运行方式（在仓库根目录，先停后端再执行，完成后重启）：
--   A. 有 sqlite3 CLI：
--      sqlite3 backend/data/dev_caddy_shopping.db < scripts/seed-products.sql
--   B. 无 sqlite3 CLI（本机实际情况），用 backend 自带的 sqlite3 npm 包：
--      node -e "const fs=require('fs');const sqlite3=require('./backend/node_modules/sqlite3').verbose();const sql=fs.readFileSync('scripts/seed-products.sql','utf8');const db=new sqlite3.Database('backend/data/dev_caddy_shopping.db');db.exec(sql,function(e){if(e){console.error(e.message);process.exit(1)}console.log('seed ok');db.close();});"
--
-- 验证：重启后端后 curl http://localhost:3777/api/products 应返回 6 条（data.products）。
-- 作者：UI 施工组   时间：2026-10-03
-- ============================================================================

INSERT OR REPLACE INTO products
  (id, name, description, price, originalPrice, stock, sales, isActive, views, favorites,
   mainImage, tags, specifications, createdAt, updatedAt, publishedAt, version, categoryId)
VALUES
  (1, '渐变褶皱手袋',
   '粉到金的渐变慢慢晕开，像把一整个下午的好光线收进包里。本季新到，慢慢挑。',
   299.00, NULL, 58, 12, 1, 320, 26,
   '/images/products/product-1.jpg', '新到,手袋',
   '{"材质":"头层牛皮","工艺":"手工褶皱","尺寸":"24×16×8cm"}',
   '2026-10-03 10:06:00', '2026-10-03 10:06:00', '2026-10-03 10:06:00', 1, NULL),
  (2, '柠檬黄小圆筒包',
   '黑色皮革配一面大胆的柠檬黄，装得下手机、口红和一句俏皮话。通勤路上的小太阳。',
   259.00, NULL, 42, 9, 1, 214, 18,
   '/images/products/product-2.jpg', '心头好,手袋',
   '{"材质":"粒面皮革","工艺":"手缝提手","尺寸":"20×13×10cm"}',
   '2026-10-03 10:05:00', '2026-10-03 10:05:00', '2026-10-03 10:05:00', 1, NULL),
  (3, '蓝白织纹托特包',
   '装得下电脑和好心情的那种托特。织纹手作感，越用越有样子，陪你很多年。',
   189.00, NULL, 66, 15, 1, 402, 31,
   '/images/products/product-3.jpg', '经典款,托特包',
   '{"材质":"棉麻织纹配皮革","工艺":"手工编织","尺寸":"36×28×14cm"}',
   '2026-10-03 10:04:00', '2026-10-03 10:04:00', '2026-10-03 10:04:00', 1, NULL),
  (4, '奶油糖果斜挎包',
   '奶油白与糖果黄各一只，挂在细绳上晒太阳。出门前选颜色，是每天的小快乐。',
   168.00, NULL, 50, 7, 1, 168, 12,
   '/images/products/product-4.jpg', '新到,斜挎包',
   '{"材质":"柔面皮革","五金":"金色","尺寸":"18×12×6cm"}',
   '2026-10-03 10:03:00', '2026-10-03 10:03:00', '2026-10-03 10:03:00', 1, NULL),
  (5, '花语皮革手提包',
   '棕与蓝的花纹在蓝底上慢慢开，配金色搭扣，安静又明亮的一只。',
   229.00, NULL, 35, 6, 1, 145, 9,
   '/images/products/product-5.jpg', '心头好,手提包',
   '{"材质":"印花皮革","五金":"金色搭扣","尺寸":"26×18×10cm"}',
   '2026-10-03 10:02:00', '2026-10-03 10:02:00', '2026-10-03 10:02:00', 1, NULL),
  (6, '粉色小方包',
   '小小一只，粉色皮革加金链，刚好装下出门的必备和一点点心动。',
   88.00, NULL, 72, 21, 1, 510, 44,
   '/images/products/product-6.jpg', '新到,斜挎包',
   '{"材质":"粉色皮革","五金":"金色链条","尺寸":"15×10×5cm"}',
   '2026-10-03 10:01:00', '2026-10-03 10:01:00', '2026-10-03 10:01:00', 1, NULL);
