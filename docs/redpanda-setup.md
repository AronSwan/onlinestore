# Redpanda 集成与使用指南

适用范围
- 当前后端：NestJS + kafkajs
- MQ：Redpanda（Kafka 协议兼容）

1. 本地启动 Redpanda
- 位置：backend/docker/redpanda/docker-compose.yml
- 启动命令：
  cd backend/docker/redpanda
  docker compose up -d

- 控制台（可视化）：
  http://localhost:8080
  Kafka Broker：localhost:9092

2. 服务端环境变量（可选）
- REDPANDA_BROKERS=localhost:9092
- REDPANDA_CLIENT_ID=onlinestore-backend
- REDPANDA_SSL=false
- REDPANDA_SASL_USERNAME=...
- REDPANDA_SASL_PASSWORD=...

3. 应用内集成
- 消息模块：src/messaging
  - messaging.module.ts（导出 RedpandaService）
  - redpanda.service.ts（封装生产者/消费者）
  - topics.ts（统一主题名）
- 已在 AppModule 引入 MessagingModule
- 通知模块已注册消费者：src/notification/consumers/notification.consumer.ts 订阅 notifications.send

4. 发送与消费样例
- 发送（任意服务注入 RedpandaService）：
  await redpanda.publish({
    topic: Topics.NotificationSend,
    key: String(userId),
    value: {
      userId,
      channel: 'email',
      template: 'ORDER_PAID',
      payload: { orderId, total },
      requestId,
    },
  });

- 消费（通知模块已自动订阅）：
  启动 backend 后，收到消息会打印日志：
  `[NotificationConsumer]` Received notifications.send -> {...}

5. 主题规划（建议）
- notifications.send（通知请求）
- payments.settled / payments.failed（支付结果）
- orders.created（订单创建）
- inventory.sync（库存同步）

6. 生产环境建议
- 使用多分区（topics: numPartitions ≥ 3）
- 设置独立消费组（groupId 区分服务）
- 健康检查：监控消费者延迟、积压、重试/死信
- 部署：优先使用 Redpanda Operator 或 Helm（参考官方仓库 https://github.com/redpanda-data/redpanda）

7. 常见问题
- 无法连接：检查 Broker 地址、防火墙、端口映射
- 订阅未触发：确认 groupId 是否变化、是否有新消息、是否 fromBeginning
- JSON 解析异常：统一消息格式为 JSON，约定 schema 并校验