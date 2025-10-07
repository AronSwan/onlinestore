export const Topics = {
  NotificationSend: 'notifications.send',
  PaymentSettled: 'payments.settled',
  PaymentFailed: 'payments.failed',
  OrderCreated: 'orders.created',
  InventorySync: 'inventory.sync',
  PAYMENT_EVENTS: 'payments.events', // 兼容调用方期望的键

  // 下面补充代码中引用但尚未列出的主题（保证 TopicName 类型覆盖所有使用场景）
  OrdersUpdated: 'orders.updated',
  PaymentsProcessed: 'payments.processed',
  ProductsCreated: 'products.created',
  ProductsUpdated: 'products.updated',
  ProductsViewed: 'products.viewed',
  InventoryUpdated: 'inventory.updated',
} as const;

export type TopicKey = keyof typeof Topics;
export type TopicName = (typeof Topics)[TopicKey];
