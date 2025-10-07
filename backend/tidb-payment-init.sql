-- TiDB 支付功能初始化脚本
CREATE DATABASE IF NOT EXISTS shopping_site CHARACTER SET utf8mb4;
USE shopping_site;

-- 支付表 - TiDB 优化
CREATE TABLE IF NOT EXISTS `payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `paymentId` varchar(64) NOT NULL UNIQUE,
  `orderId` varchar(64) NOT NULL,
  `userId` bigint NOT NULL,
  `amount` decimal(18,8) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'CNY',
  `method` enum('alipay','wechat','unionpay','credit_card','bank_transfer','usdt_trc20','usdt_erc20','usdt_bep20','btc','eth') NOT NULL,
  `gateway` enum('gopay','crypto','manual') NOT NULL,
  `status` enum('pending','processing','success','failed','cancelled','refunded','partial_refunded','expired') NOT NULL DEFAULT 'pending',
  `thirdPartyTransactionId` varchar(128) NULL,
  `blockchainTxHash` varchar(256) NULL,
  `cryptoAddress` varchar(128) NULL,
  `metadata` json NULL,
  `failureReason` varchar(512) NULL,
  `paidAt` timestamp NULL,
  `expiredAt` timestamp NULL,
  `refundedAt` timestamp NULL,
  `refundedAmount` decimal(18,8) NULL,
  `refundId` varchar(128) NULL,
  `retryCount` int NOT NULL DEFAULT 0,
  `idempotencyKey` varchar(64) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_id` (`paymentId`),
  KEY `idx_order_id` (`orderId`),
  KEY `idx_user_id` (`userId`),
  KEY `idx_status` (`status`),
  KEY `idx_method` (`method`),
  KEY `idx_created_at` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;