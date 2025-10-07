/**
 * Email Verification Routes
 */
const express = require('express');
const EmailVerificationController = require('./email-verification.controller');

const router = express.Router();
const controller = new EmailVerificationController();

// 验证单个邮箱
router.post('/verify', async (req, res) => {
  await controller.verifyEmail(req, res);
});

// 批量验证邮箱
router.post('/verify-batch', async (req, res) => {
  await controller.verifyEmailBatch(req, res);
});

// 健康检查
router.get('/health', async (req, res) => {
  await controller.getHealth(req, res);
});

// 清理缓存
router.post('/cache/clear', async (req, res) => {
  await controller.clearCache(req, res);
});

// 获取配置
router.get('/config', (req, res) => {
  controller.getConfig(req, res);
});

module.exports = router;
