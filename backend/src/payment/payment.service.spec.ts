import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { PaymentService } from './payment.service';
import { Payment, PaymentMethod, PaymentStatus, PaymentGateway } from './entities/payment.entity';
import { PaymentStrategy } from './strategies/payment-strategy.interface';
import { CreatePaymentDto } from './dto/payment.dto';
import { BadRequestException } from '@nestjs/common';
import { RedpandaService } from '../messaging/redpanda.service';
import { PaymentSecurityService } from '../common/security/payment-security.service';
import { LogSanitizerService } from '../common/security/log-sanitizer.service';
import {
  createMockQueryRunner,
  createMockDataSource,
  createMockConfigService,
  createMockRedpandaService,
  createMockPaymentSecurityService,
  createMockLogSanitizerService,
  createMockRepository,
} from '../../test/test-setup-helper';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: Repository<Payment>;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const mockPaymentRepository = createMockRepository();
  const mockConfigService = createMockConfigService();

  const mockAlipayStrategy = {
    createPayment: jest.fn(),
    queryPayment: jest.fn(),
    handleCallback: jest.fn(),
    refund: jest.fn(),
    validateCallback: jest.fn(),
  } as jest.Mocked<PaymentStrategy>;

  const mockWechatStrategy = {
    createPayment: jest.fn(),
    queryPayment: jest.fn(),
    handleCallback: jest.fn(),
    refund: jest.fn(),
    validateCallback: jest.fn(),
  } as jest.Mocked<PaymentStrategy>;

  const mockRedpandaService = createMockRedpandaService();
  const mockPaymentSecurityService = createMockPaymentSecurityService();
  const mockLogSanitizerService = createMockLogSanitizerService();

  // 在beforeEach中创建新的QueryRunner实例
  let mockQueryRunner: QueryRunner;

  // 声明mockDataSource，但稍后在beforeEach中初始化
  let mockDataSource: any;

  beforeEach(async () => {
    // 创建新的QueryRunner实例
    mockQueryRunner = createMockQueryRunner();

    // 初始化mockDataSource
    mockDataSource = createMockDataSource(mockQueryRunner);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'PAYMENT_STRATEGIES',
          useValue: new Map([
            ['alipay', mockAlipayStrategy],
            ['wechat', mockWechatStrategy],
          ]),
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: RedpandaService,
          useValue: mockRedpandaService,
        },
        {
          provide: PaymentSecurityService,
          useValue: mockPaymentSecurityService,
        },
        {
          provide: LogSanitizerService,
          useValue: mockLogSanitizerService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
    dataSource = module.get<DataSource>(DataSource);
    queryRunner = mockQueryRunner;

    // 重置所有 mock
    jest.clearAllMocks();

    // 确保mockDataSource.createQueryRunner返回正确的mockQueryRunner
    (mockDataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);
  });

  afterEach(() => {
    // 清理资源
    jest.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should get payment status successfully', async () => {
      const mockPayment = {
        paymentId: 'PAY_123',
        orderId: 'ORDER_123',
        status: PaymentStatus.SUCCESS,
        amount: 100,
        currency: 'CNY',
        method: PaymentMethod.ALIPAY,
        gateway: PaymentGateway.GOPAY,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 1,
        cryptoAddress: null,
        blockchainTxHash: null,
        paidAt: null,
        expiredAt: null,
        failureReason: null,
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.getPaymentStatus('PAY_123');

      expect(result.paymentId).toBe('PAY_123');
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: { paymentId: 'PAY_123' },
      });
    });

    it('should throw error when payment not found', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.getPaymentStatus('NON_EXISTENT')).rejects.toThrow(BadRequestException);
    });
  });

  describe('支付创建测试', () => {
    const createPaymentDto: CreatePaymentDto = {
      orderId: 'ORDER_123',
      userId: 1,
      amount: 199.99,
      currency: 'CNY',
      method: PaymentMethod.ALIPAY,
      returnUrl: 'https://example.com/return',
      notifyUrl: 'https://example.com/notify',
    };

    it('should create payment successfully', async () => {
      const mockPayment = {
        paymentId: 'PAY_123',
        ...createPaymentDto,
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        gateway: PaymentGateway.GOPAY,
        cryptoAddress: null,
        blockchainTxHash: null,
        paidAt: null,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
        failureReason: null,
        metadata: {},
        idempotencyKey: null,
        thirdPartyTransactionId: null,
        refundedAmount: null,
        refundId: null,
        refundedAt: null,
        updatedAt: new Date(),
      };

      const mockStrategyResponse = {
        success: true,
        paymentId: 'PAY_123',
        redirectUrl: 'https://payment.gateway.com/pay',
        qrCode: undefined,
        deepLink: undefined,
        cryptoAddress: undefined,
        expiredAt: undefined,
      };

      mockPaymentRepository.findOne.mockResolvedValue(null);
      (mockQueryRunner.manager.create as jest.Mock).mockReturnValue(mockPayment);
      (mockQueryRunner.manager.save as jest.Mock).mockResolvedValue(mockPayment);
      mockAlipayStrategy.createPayment.mockResolvedValue(mockStrategyResponse);

      const result = await service.createPayment(createPaymentDto);

      expect(result.paymentId).toBe('PAY_123');
      expect(mockAlipayStrategy.createPayment).toHaveBeenCalled();

      // 验证事务处理流程
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);
      (mockQueryRunner.manager.create as jest.Mock).mockReturnValue(createPaymentDto);
      (mockQueryRunner.manager.save as jest.Mock).mockRejectedValue(new Error('Database error'));
      mockAlipayStrategy.createPayment.mockRejectedValue(new Error('Gateway error'));

      await expect(service.createPayment(createPaymentDto)).rejects.toThrow();

      // 验证事务回滚流程
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should validate payment amount', async () => {
      const invalidAmountDto: CreatePaymentDto = {
        ...createPaymentDto,
        amount: -10,
      };

      await expect(service.createPayment(invalidAmountDto)).rejects.toThrow(BadRequestException);
    });

    it('should validate payment method', async () => {
      const invalidMethodDto: CreatePaymentDto = {
        ...createPaymentDto,
        method: 'invalid-method' as PaymentMethod,
      };

      await expect(service.createPayment(invalidMethodDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle strategy creation failure', async () => {
      const invalidMethodDto: CreatePaymentDto = {
        orderId: 'ORDER_123',
        userId: 1,
        amount: 199.99,
        method: 'invalid_method' as any, // 使用类型断言绕过编译检查
        currency: 'CNY',
      };

      // 确保mockQueryRunner已经正确设置
      (mockQueryRunner.connect as jest.Mock).mockResolvedValue(undefined);
      (mockQueryRunner.startTransaction as jest.Mock).mockResolvedValue(undefined);
      (mockQueryRunner.rollbackTransaction as jest.Mock).mockResolvedValue(undefined);
      (mockQueryRunner.release as jest.Mock).mockResolvedValue(undefined);

      await expect(service.createPayment(invalidMethodDto)).rejects.toThrow(BadRequestException);

      // 验证事务回滚
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('支付回调处理测试', () => {
    const callbackData = {
      out_trade_no: 'PAY_123',
      trade_no: 'ALIPAY_TRADE_123',
      trade_status: 'TRADE_SUCCESS',
      total_amount: '199.99',
      sign: 'valid_signature',
    };

    it('should handle successful payment callback', async () => {
      const mockPayment = {
        paymentId: 'PAY_123',
        orderId: 'ORDER_123',
        status: PaymentStatus.PROCESSING,
        amount: 199.99,
        method: PaymentMethod.ALIPAY,
        userId: 1,
        gateway: PaymentGateway.GOPAY,
        currency: 'CNY',
        createdAt: new Date(),
        updatedAt: new Date(),
        cryptoAddress: null,
        blockchainTxHash: null,
        paidAt: null,
        expiredAt: null,
        failureReason: null,
        metadata: {},
        idempotencyKey: null,
        thirdPartyTransactionId: null,
        refundedAmount: null,
        refundId: null,
        refundedAt: null,
      };

      const callbackResult = {
        success: true,
        paymentId: 'PAY_123',
        status: 'success',
        gatewayTransactionId: 'ALIPAY_TRADE_123',
        paidAt: new Date(),
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockAlipayStrategy.handleCallback.mockResolvedValue(callbackResult);

      // 修改mockPaymentRepository，添加manager属性
      const mockManager = {
        save: jest.fn().mockResolvedValue({
          ...mockPayment,
          status: PaymentStatus.SUCCESS,
        }),
      };

      // 使用Object.defineProperty添加manager属性
      Object.defineProperty(mockPaymentRepository, 'manager', {
        value: {
          transaction: jest.fn().mockImplementation(async callback => {
            return callback(mockManager);
          }),
        },
        writable: true,
        configurable: true,
      });

      const result = await service.handlePaymentCallback(PaymentMethod.ALIPAY, callbackData);

      expect(result.success).toBe(true);
    });

    it('should handle callback for non-existent payment', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);
      mockAlipayStrategy.handleCallback.mockResolvedValue({
        success: false,
        paymentId: 'PAY_123',
        status: 'failed',
      });

      const result = await service.handlePaymentCallback(PaymentMethod.ALIPAY, callbackData);

      expect(result.success).toBe(false);
    });
  });

  describe('支付查询测试', () => {
    it('should query payment successfully', async () => {
      const mockPayment = {
        paymentId: 'PAY_123',
        method: PaymentMethod.ALIPAY,
        status: PaymentStatus.PROCESSING,
        orderId: 'ORDER_123',
        userId: 1,
        amount: 199.99,
        currency: 'CNY',
        gateway: PaymentGateway.GOPAY,
        createdAt: new Date(),
        updatedAt: new Date(),
        cryptoAddress: null,
        blockchainTxHash: null,
        paidAt: null,
        expiredAt: null,
        failureReason: null,
        metadata: {},
        idempotencyKey: null,
        thirdPartyTransactionId: null,
        refundedAmount: null,
        refundId: null,
        refundedAt: null,
      };

      const gatewayResponse = {
        status: PaymentStatus.SUCCESS,
        gatewayTransactionId: 'ALIPAY_TRADE_123',
        paidAt: new Date(),
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockAlipayStrategy.queryPayment.mockResolvedValue(gatewayResponse);
      mockPaymentRepository.save.mockResolvedValue({
        ...mockPayment,
        ...gatewayResponse,
      });

      const result = await service.getPaymentStatus('PAY_123');

      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });
  });

  describe('退款功能测试', () => {
    const refundDto = {
      paymentId: 'PAY_123',
      amount: 99.99,
      reason: '用户申请退款',
    };

    it('should create refund successfully', async () => {
      const mockPayment = {
        paymentId: 'PAY_123',
        status: PaymentStatus.SUCCESS,
        amount: 199.99,
        method: PaymentMethod.ALIPAY,
        paidAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        orderId: 'ORDER_123',
        userId: 1,
        currency: 'CNY',
        gateway: PaymentGateway.GOPAY,
        createdAt: new Date(),
        updatedAt: new Date(),
        cryptoAddress: null,
        blockchainTxHash: null,
        expiredAt: null,
        failureReason: null,
        metadata: {},
        idempotencyKey: null,
        thirdPartyTransactionId: null,
        refundedAmount: null,
        refundId: null,
        refundedAt: null,
      };

      const refundResponse = {
        success: true,
        refundId: 'REFUND_123',
        status: 'processing',
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockAlipayStrategy.refund.mockResolvedValue(refundResponse);
      mockPaymentRepository.save.mockResolvedValue({
        ...mockPayment,
        refundId: 'REFUND_123',
      });

      const result = await service.refundPayment('PAY_123', 99.99, '用户申请退款');

      expect(result.refundId).toBe('REFUND_123');
      expect(result.success).toBe(true);
    });

    it('should reject refund for unpaid payment', async () => {
      const mockPayment = {
        paymentId: 'PAY_123',
        status: PaymentStatus.PENDING,
        amount: 199.99,
        method: PaymentMethod.ALIPAY,
        orderId: 'ORDER_123',
        userId: 1,
        currency: 'CNY',
        gateway: PaymentGateway.GOPAY,
        createdAt: new Date(),
        updatedAt: new Date(),
        cryptoAddress: null,
        blockchainTxHash: null,
        paidAt: null,
        expiredAt: null,
        failureReason: null,
        metadata: {},
        idempotencyKey: null,
        thirdPartyTransactionId: null,
        refundedAmount: null,
        refundId: null,
        refundedAt: null,
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      await expect(service.refundPayment('PAY_123', 99.99)).rejects.toThrow(BadRequestException);
    });

    it('should reject refund amount exceeding payment amount', async () => {
      const mockPayment = {
        paymentId: 'PAY_123',
        status: PaymentStatus.SUCCESS,
        amount: 199.99,
        paidAt: new Date(),
        method: PaymentMethod.ALIPAY,
        orderId: 'ORDER_123',
        userId: 1,
        currency: 'CNY',
        gateway: PaymentGateway.GOPAY,
        createdAt: new Date(),
        updatedAt: new Date(),
        cryptoAddress: null,
        blockchainTxHash: null,
        expiredAt: null,
        failureReason: null,
        metadata: {},
        idempotencyKey: null,
        thirdPartyTransactionId: null,
        refundedAmount: null,
        refundId: null,
        refundedAt: null,
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      await expect(service.refundPayment('PAY_123', 299.99)).rejects.toThrow(BadRequestException);
    });
  });

  describe('批量查询测试', () => {
    it('should batch get payment status', async () => {
      const mockPayments = [
        {
          paymentId: 'PAY_123',
          orderId: 'ORDER_123',
          status: PaymentStatus.SUCCESS,
          amount: 100,
          currency: 'CNY',
          method: PaymentMethod.ALIPAY,
          gateway: PaymentGateway.GOPAY,
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          cryptoAddress: null,
          blockchainTxHash: null,
          paidAt: null,
          expiredAt: null,
          failureReason: null,
          metadata: {},
          idempotencyKey: null,
          thirdPartyTransactionId: null,
          refundedAmount: null,
          refundId: null,
          refundedAt: null,
        },
      ];

      mockPaymentRepository.find.mockResolvedValue(mockPayments);

      const result = await service.batchGetPaymentStatus(['PAY_123']);

      expect(result).toHaveLength(1);
      expect(result[0].paymentId).toBe('PAY_123');
    });

    it('should reject batch query with too many IDs', async () => {
      const paymentIds = Array.from({ length: 101 }, (_, i) => `PAY_${i}`);

      await expect(service.batchGetPaymentStatus(paymentIds)).rejects.toThrow(BadRequestException);
    });
  });

  describe('订单支付记录查询测试', () => {
    it('should get order payments', async () => {
      const mockPayments = [
        {
          paymentId: 'PAY_123',
          orderId: 'ORDER_123',
          status: PaymentStatus.SUCCESS,
          amount: 100,
          currency: 'CNY',
          method: PaymentMethod.ALIPAY,
          gateway: PaymentGateway.GOPAY,
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          cryptoAddress: null,
          blockchainTxHash: null,
          paidAt: null,
          expiredAt: null,
          failureReason: null,
          metadata: {},
          idempotencyKey: null,
          thirdPartyTransactionId: null,
          refundedAmount: null,
          refundId: null,
          refundedAt: null,
        },
      ];

      mockPaymentRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getOrderPayments('ORDER_123');

      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe('ORDER_123');
    });
  });

  describe('错误处理测试', () => {
    it('should handle database connection errors', async () => {
      mockPaymentRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getPaymentStatus('PAY_123')).rejects.toThrow(Error);
    });

    it('should handle strategy not found error', async () => {
      const createPaymentDto: CreatePaymentDto = {
        orderId: 'ORDER_123',
        userId: 1,
        amount: 199.99,
        currency: 'CNY',
        method: 'unknown-method' as PaymentMethod,
      };

      // 模拟数据库连接错误
      mockDataSource.createQueryRunner.mockImplementation(() => {
        throw new Error("Cannot read properties of undefined (reading 'connect')");
      });

      await expect(service.createPayment(createPaymentDto)).rejects.toThrow(Error);
    });
  });
});
