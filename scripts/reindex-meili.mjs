#!/usr/bin/env node
/**
 * 存量商品灌 MeiliSearch 索引（一次性运维脚本，2026-10-07 A 方案立）。
 * 用法：node scripts/reindex-meili.mjs [backendUrl] [meiliUrl] [apiKey]
 * 形状与 meilisearch.service.ts transformProductForIndexing 逐字段一致——
 * 增删字段时两处同步改。
 */
const BACKEND = process.argv[2] || 'http://localhost:3777';
const MEILI = process.argv[3] || 'http://localhost:7700';
const KEY = process.argv[4] || 'master-key-change-in-production';

const res = await fetch(`${BACKEND}/api/products?limit=100`);
if (!res.ok) throw new Error(`拉商品失败: ${res.status}`);
const data = await res.json();
const products = Array.isArray(data) ? data : (data.products || data.items || []);
if (!products.length) throw new Error('后端返回 0 商品');

const docs = products.map(p => ({
  id: p.id, name: p.name, description: p.description, price: p.price,
  originalPrice: p.originalPrice, category: p.category, categoryId: p.categoryId,
  tags: p.tags, stock: p.stock, isActive: p.isActive,
  createdAt: p.createdAt, updatedAt: p.updatedAt, specifications: p.specifications,
}));

const r = await fetch(`${MEILI}/indexes/products/documents`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(docs),
});
if (!r.ok) throw new Error(`灌索引失败: ${r.status} ${await r.text()}`);
const task = await r.json();
console.log(JSON.stringify({ indexed: docs.length, taskUid: task.taskUid, sample: docs[0]?.name }));
