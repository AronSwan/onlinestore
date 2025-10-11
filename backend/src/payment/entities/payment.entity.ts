import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIAL_REFUNDED = 'partial_refunded',
  EXPIRED = 'expired',
}

export enum PaymentMethod {
  // 传统支付方式
  ALIPAY = 'alipay',
  WECHAT = 'wechat',
  UNIONPAY = 'unionpay',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',

  // 加密货币支付
  USDT_TRC20 = 'usdt_trc20',
  USDT_ERC20 = 'usdt_erc20',
  USDT_BEP20 = 'usdt_bep20',
  BTC = 'btc',
  ETH = 'eth',
}

export enum PaymentGateway {
  GOPAY = 'gopay',
  CRYPTO = 'crypto',
  MANUAL = 'manual',
}

@Entity('payments')
@Index(['paymentId'], { unique: true })
@Index(['orderId'])
@Index(['userId'])
@Index(['status'])
@Index(['method'])
@Index(['createdAt'])
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, length: 64 })
  paymentId: string;

  @Column({ type: 'varchar', length: 64 })
  orderId: string;

  @Column('int')
  userId: number;

  @Column('decimal', { precision: 18, scale: 8 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'CNY' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  method: PaymentMethod;

  @Column({
    type: 'varchar',
    length: 50,
  })
  gateway: PaymentGateway;

  @Column({
    type: 'varchar',
    length: 50,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'varchar', nullable: true, length: 128 })
  thirdPartyTransactionId: string | null;

  @Column({ type: 'varchar', nullable: true, length: 256 })
  blockchainTxHash: string | null;

  @Column({ type: 'varchar', nullable: true, length: 128 })
  cryptoAddress: string | null;

  @Column('json', { nullable: true })
  metadata: any;

  @Column({ type: 'varchar', nullable: true, length: 512 })
  failureReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiredAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  @Column('decimal', { precision: 18, scale: 8, nullable: true })
  refundedAmount: number | null;

  @Column({ type: 'varchar', nullable: true, length: 128 })
  refundId: string | null;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'varchar', nullable: true, length: 64 })
  idempotencyKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
