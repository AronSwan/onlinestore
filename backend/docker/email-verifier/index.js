const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// 中间件
app.use(cors());
app.use(express.json());

// 基本路由
app.get('/', (req, res) => {
  res.json({
    service: 'Email Verifier',
    status: 'running',
    version: '1.0.0'
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 邮箱验证端点
app.post('/verify', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      error: 'Email is required'
    });
  }
  
  // 简单的邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  
  res.json({
    email: email,
    valid: isValid,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log(`Email Verifier service running on ${HOST}:${PORT}`);
});