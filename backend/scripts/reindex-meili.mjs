#!/usr/bin/env node
/**
 * 存量商品灌 MeiliSearch 索引（2026-10-07 A 方案立；同日"智能且快"批升级带语义向量）。
 * 用法：node scripts/reindex-meili.mjs [backendUrl] [meiliUrl] [apiKey]
 * 向量=bge-small-zh-v1.5 q8（backend/.local-models 本地），随文档 _vectors 灌入；
 * 形状与 meilisearch.service.ts transformProductForIndexing 逐字段一致——增删字段两处同步改。
 */
import { pipeline } from '@huggingface/transformers';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
process.chdir(path.join(ROOT, 'backend')); // 模型相对路径基准

const BACKEND = process.argv[2] || 'http://localhost:3777';
const MEILI = process.argv[3] || 'http://localhost:7700';
const KEY = process.argv[4] || 'master-key-change-in-production';

const extractor = await pipeline('feature-extraction', '.local-models/bge-small-zh-v1.5', { dtype: 'q8' });
const embed = async (texts) => (await extractor(texts, { pooling: 'mean', normalize: true })).tolist();

const res = await fetch(`${BACKEND}/api/products?limit=100`);
if (!res.ok) throw new Error(`拉商品失败: ${res.status}`);
const data = await res.json();
const products = Array.isArray(data) ? data : (data.products || data.items || []);
if (!products.length) throw new Error('后端返回 0 商品');

// 语义向量（name+description，与 products.service indexProductToSearch 同口径）
const vectors = await embed(products.map(p => `${p.name} ${p.description || ''}`));

const docs = products.map((p, i) => ({
  _vectors: { default: vectors[i] },
  id: p.id, name: p.name, description: p.description, price: p.price,
  originalPrice: p.originalPrice, category: p.category, categoryId: p.categoryId,
  tags: p.tags, stock: p.stock, isActive: p.isActive,
  createdAt: p.createdAt, updatedAt: p.updatedAt, specifications: p.specifications,
}));

// embedders 配置（userProvided 512 维——hybrid 查询的前置）
const er = await fetch(`${MEILI}/indexes/products/settings/embedders`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ default: { source: 'userProvided', dimensions: 512 } }),
});
if (!er.ok) throw new Error(`embedders 配置失败: ${er.status}`);

const r = await fetch(`${MEILI}/indexes/products/documents`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(docs),
});
if (!r.ok) throw new Error(`灌索引失败: ${r.status} ${await r.text()}`);
const task = await r.json();
console.log(JSON.stringify({ indexed: docs.length, withVectors: vectors.length, taskUid: task.taskUid, sample: docs[0]?.name }));
