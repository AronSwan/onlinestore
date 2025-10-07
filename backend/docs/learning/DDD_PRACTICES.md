# DDD 实践指南

## 📋 概述
本文档介绍在 Caddy Style Shopping 项目中实施的领域驱动设计（DDD）实践和模式。

## 🏗️ 领域模型设计

### 实体（Entity）
```typescript
// 用户实体示例
@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  // 业务方法
  changeEmail(newEmail: string): void {
    if (!this.isValidEmail(newEmail)) {
      throw new Error('Invalid email address');
    }
    this.email = newEmail;
  }

  private isValidEmail(email: string): boolean {
    // 邮箱验证逻辑
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

### 值对象（Value Object）
```typescript
// 地址值对象示例
@Embeddable()
export class Address {
  @Column()
  street: string;

  @Column()
  city: string;

  @Column()
  postalCode: string;

  @Column()
  country: string;

  // 值对象应该是不可变的
  constructor(street: string, city: string, postalCode: string, country: string) {
    this.street = street;
    this.city = city;
    this.postalCode = postalCode;
    this.country = country;
  }

  equals(other: Address): boolean {
    return this.street === other.street &&
           this.city === other.city &&
           this.postalCode === other.postalCode &&
           this.country === other.country;
  }
}
```

## 🔄 聚合根设计

### 订单聚合根
```typescript
@Entity()
export class Order extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  status: OrderStatus;

  @Column(type => Money)
  totalAmount: Money;

  @OneToMany(() => OrderItem, item => item.order, { cascade: true })
  items: OrderItem[];

  @Column(type => Address)
  shippingAddress: Address;

  // 领域服务注入
  constructor(
    private readonly inventoryService: InventoryService
  ) {}

  // 业务方法
  addItem(productId: string, quantity: number, price: Money): void {
    if (this.status !== OrderStatus.DRAFT) {
      throw new Error('Cannot add items to a confirmed order');
    }

    const available = this.inventoryService.checkAvailability(productId, quantity);
    if (!available) {
      throw new Error('Insufficient inventory');
    }

    const item = new OrderItem(productId, quantity, price);
    this.items.push(item);
    this.calculateTotal();
  }

  confirm(): void {
    if (this.items.length === 0) {
      throw new Error('Cannot confirm an empty order');
    }

    this.status = OrderStatus.CONFIRMED;
    this.confirmedAt = new Date();
  }

  private calculateTotal(): void {
    this.totalAmount = this.items.reduce(
      (total, item) => total.add(item.subtotal),
      new Money(0, 'USD')
    );
  }
}
```

## 🏭 领域服务

### 支付领域服务
```typescript
@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentGateway: PaymentGateway,
    private readonly orderRepository: OrderRepository
  ) {}

  async processPayment(orderId: string, paymentDetails: PaymentDetails): Promise<PaymentResult> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new Error('Order is not confirmed');
    }

    const paymentResult = await this.paymentGateway.charge(
      order.totalAmount,
      paymentDetails
    );

    if (paymentResult.success) {
      order.markAsPaid(paymentResult.transactionId);
      await this.orderRepository.save(order);
    }

    return paymentResult;
  }
}
```

## 📊 仓储模式

### 通用仓储接口
```typescript
export interface Repository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
  // 特定查询方法
  findByCriteria(criteria: Partial<T>): Promise<T[]>;
}
```

### 具体仓储实现
```typescript
@Injectable()
export class UserRepository implements Repository<User> {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }
}
```

## 📈 事件驱动架构

### 领域事件
```typescript
export class OrderConfirmedEvent {
  constructor(
    public readonly orderId: string,
    public readonly totalAmount: Money,
    public readonly confirmedAt: Date
  ) {}
}

// 事件处理器
@Injectable()
export class OrderConfirmedEventHandler {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService
  ) {}

  async handle(event: OrderConfirmedEvent): Promise<void> {
    // 更新库存
    await this.inventoryService.reserveItemsForOrder(event.orderId);
    
    // 发送通知
    await this.notificationService.sendOrderConfirmation(event.orderId);
  }
}
```

## 📚 学习资源
- [领域驱动设计精粹](https://domainlanguage.com/ddd/)
- [实现领域驱动设计](https://www.amazon.com/Implementing-Domain-Driven-Design-Vaughn-Vernon/dp/0321834577)
- [DDD 社区资源](https://dddcommunity.org/)

*最后更新: 2025年10月5日*