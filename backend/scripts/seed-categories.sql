-- 用途：基础类目种子（M1-B2）——categories 表由 0 行灌入 4 个基础类目
-- 背景：POST /api/products 原先必败的原因之一是 categories 表为空；
--       id 显式固定 1-4，slug 唯一约束冲突时用 OR IGNORE 保持幂等（可重复执行）。
-- 执行：node -e 脚本或任意 sqlite3 客户端对 backend/data/dev_caddy_shopping.db 执行本文件
-- 时间：2026-10-04

INSERT OR IGNORE INTO "categories" ("id", "name", "slug", "description", "isActive", "sortOrder") VALUES
  (1, '手袋',   'handbag',    '手袋类目',   1, 1),
  (2, '斜挎包', 'crossbody',  '斜挎包类目', 1, 2),
  (3, '手提包', 'tote',       '手提包类目', 1, 3),
  (4, '链条包', 'chain-bag',  '链条包类目', 1, 4);
