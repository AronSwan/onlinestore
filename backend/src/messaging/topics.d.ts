export declare const Topics: {
    readonly NotificationSend: "notifications.send";
    readonly PaymentSettled: "payments.settled";
    readonly PaymentFailed: "payments.failed";
    readonly OrderCreated: "orders.created";
    readonly InventorySync: "inventory.sync";
    readonly PAYMENT_EVENTS: "payments.events";
    readonly OrdersUpdated: "orders.updated";
    readonly PaymentsProcessed: "payments.processed";
    readonly ProductsCreated: "products.created";
    readonly ProductsUpdated: "products.updated";
    readonly ProductsViewed: "products.viewed";
    readonly InventoryUpdated: "inventory.updated";
};
export type TopicKey = keyof typeof Topics;
export type TopicName = (typeof Topics)[TopicKey];
