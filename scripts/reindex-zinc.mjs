#!/usr/bin/env node
/**
 * 存量商品灌 Zinc 备引擎索引（2026-10-07 实测立）。
 * 用法：node scripts/reindex-zinc.mjs [backendUrl] [zincUrl] [user] [password]
 * 端点/凭据与 zincsearch.service.ts 同款（PUT /api/{index}/_doc/:id）。
 */
const BACKEND = process.argv[2] || 'http://localhost:3777';
const ZINC = process.argv[3] || 'http://127.0.0.1:4080';
const USER = process.argv[4] || 'admin';
const PASS = process.argv[5] || 'CHANGE_ME_zinc_admin_password';
const H = { 'Authorization': 'Basic ' + Buffer.from(USER + ':' + PASS).toString('base64'), 'Content-Type': 'application/json' };

const res = await fetch(`${BACKEND}/api/products?limit=100`);
if (!res.ok) throw new Error(`拉商品失败: ${res.status}`);
const data = await res.json();
const products = Array.isArray(data) ? data : (data.products || data.items || []);
if (!products.length) throw new Error('后端返回 0 商品');

let n = 0;
for (const p of products) {
  const doc = { id: p.id, name: p.name, description: p.description, price: p.price,
    originalPrice: p.originalPrice, category: p.category, categoryId: p.categoryId,
    tags: p.tags, stock: p.stock, isActive: p.isActive, createdAt: p.createdAt, updatedAt: p.updatedAt };
  const r = await fetch(`${ZINC}/api/products/_doc/${p.id}`, { method: 'PUT', headers: H, body: JSON.stringify(doc) });
  if (!r.ok) throw new Error(`灌索引失败 ${p.id}: ${r.status}`);
  n++;
}
console.log(JSON.stringify({ indexed: n, engine: 'zinc' }));
