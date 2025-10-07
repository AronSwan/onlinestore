
const express = require('express');
const { getMetrics } = require('../middleware/metrics');

const router = express.Router();

// 指标暴露端点
router.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(getMetrics());
});

// 健康检查端点（包含指标状态）
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    metrics: 'enabled'
  });
});

module.exports = router;
