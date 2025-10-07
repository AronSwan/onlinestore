import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

// 模拟购物车数据存储
const cartData = new Map();

app.use(
  cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
    credentials: true,
  }),
);

app.use(express.json());

// 获取购物车商品
app.get('/api/cart/items/:userId', (req, res) => {
  const { userId } = req.params;
  const items = cartData.get(userId) || [];
  res.json({
    items,
    total: items.length,
    message: '获取购物车成功',
  });
});

// 添加商品到购物车
app.post('/api/cart/items/:userId', (req, res) => {
  const { userId } = req.params;
  const cartItem = {
    id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...req.body,
    selectFlag: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const items = cartData.get(userId) || [];
  items.push(cartItem);
  cartData.set(userId, items);

  res.json(cartItem);
});

// 更新购物车商品
app.put('/api/cart/items/:userId/:itemId', (req, res) => {
  const { userId, itemId } = req.params;
  const items = cartData.get(userId) || [];
  const itemIndex = items.findIndex((item: any) => item.id === itemId);

  if (itemIndex !== -1) {
    items[itemIndex] = { ...items[itemIndex], ...req.body, updatedAt: new Date() };
    cartData.set(userId, items);
    res.json(items[itemIndex]);
  } else {
    res.status(404).json({ message: '商品不存在' });
  }
});

// 删除购物车商品
app.delete('/api/cart/items/:userId/:itemId', (req, res) => {
  const { userId, itemId } = req.params;
  const items = cartData.get(userId) || [];
  const filteredItems = items.filter((item: any) => item.id !== itemId);
  cartData.set(userId, filteredItems);
  res.json({ message: '删除成功' });
});

// 全选/全不选
app.put('/api/cart/select-all/:userId', (req, res) => {
  const { userId } = req.params;
  const { selectFlag } = req.body;
  const items = cartData.get(userId) || [];

  items.forEach((item: any) => {
    item.selectFlag = selectFlag;
    item.updatedAt = new Date();
  });

  cartData.set(userId, items);
  res.json({ message: '操作成功' });
});

// 清空选中商品
app.delete('/api/cart/selected/:userId', (req, res) => {
  const { userId } = req.params;
  const items = cartData.get(userId) || [];
  const filteredItems = items.filter((item: any) => !item.selectFlag);
  cartData.set(userId, filteredItems);
  res.json({ message: '清空成功' });
});

// API 文档
app.get('/api/docs', (req, res) => {
  res.json({
    title: '购物车 API 文档',
    version: '1.0.0',
    description: '模拟购物车服务，支持完整的购物车操作',
    endpoints: {
      'GET /api/cart/items/:userId': '获取购物车商品',
      'POST /api/cart/items/:userId': '添加商品到购物车',
      'PUT /api/cart/items/:userId/:itemId': '更新购物车商品',
      'DELETE /api/cart/items/:userId/:itemId': '删除购物车商品',
      'PUT /api/cart/select-all/:userId': '全选/全不选',
      'DELETE /api/cart/selected/:userId': '清空选中商品',
    },
  });
});

app.listen(port, () => {
  console.log(`✅ 模拟购物车服务启动成功！`);
  console.log(`📖 API 文档: http://localhost:${port}/api/docs`);
  console.log(`🛒 购物车 API: http://localhost:${port}/api/cart`);
  console.log(`🌐 前端地址: http://localhost:8080`);
});
