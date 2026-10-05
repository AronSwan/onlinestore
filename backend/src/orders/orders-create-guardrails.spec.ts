// 用途：M3 双盲审修复批——下单路径守卫回归测试（独立成文，不动既有大件 spec）。
// 覆盖：
//   P1-1 下架品直购 → BadRequestException(400)「商品已下架」（可行动信息，非 404）
//   P0  乐观锁冲突（update affected=0）→ ConflictException(409)（语义化退出码，
//       并发下单=201+201 或 201+409，绝不 500/半提交——四席验收口径）
//   P0  两路并发 create 的下单事务经全局写互斥串行（事务回调零重叠）
// 依赖文件：orders.service.ts, common/db-write-mutex.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { PaymentMethod } from './enums/order.enums';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrderStatus, PaymentStatus } from './entities/order.entity';
import { MonitoringService } from '../monitoring/monitoring.service';
import { OrderEventsService } from '../messaging/order-events.service';
import { AuditService } from '../common/audit/audit.service';

const mockProductBase = {
  id: 1,
  name: '守卫测试商品',
  price: 100,
  originalPrice: 120,
  stock: 50,
  isActive: true,
  image: '',
  version: 1,
};

const mockOrder = {
  id: 901,
  orderNumber: 'ORDGUARD0001',
  userId: 1,
  totalAmount: 200,
  status: OrderStatus.PENDING,
  paymentStatus: PaymentStatus.PENDING,
};

const mkOrderData = (productId = 1, quantity = 2) => ({
  userId: 1,
  items: [{ productId, quantity, unitPrice: 100 }],
  shippingAddress: '测试地址',
  recipientName: '测试收货人',
  recipientPhone: '13800138000',
  paymentMethod: 'alipay' as PaymentMethod,
});

// 事务管理器桩：getRepository(Product) 返回可注入的 productRepo
const mkTrxManager = (productRepo: unknown) => ({
  getRepository: (entity: unknown) => {
    if (entity === Product) return productRepo;
    if (entity === Order)
      return { create: jest.fn().mockReturnValue(mockOrder), save: jest.fn().mockResolvedValue(mockOrder) };
    if (entity === OrderItem)
      return { create: jest.fn().mockReturnValue({}), save: jest.fn().mockResolvedValue({}) };
    throw new Error(`unexpected entity: ${String(entity)}`);
  },
});

const mkProductRepo = (overrides: Record<string, unknown> = {}) => ({
  findOne: jest.fn().mockResolvedValue({ ...mockProductBase }),
  createQueryBuilder: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  }),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  ...overrides,
});

describe('OrdersService.create 守卫（M3 双盲审修复批）', () => {
  let service: OrdersService;
  let mockOrderRepository: any;

  beforeEach(async () => {
    mockOrderRepository = {
      manager: { transaction: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn() },
        },
        { provide: getRepositoryToken(Product), useValue: { findOne: jest.fn() } },
        { provide: MonitoringService, useValue: { observeDbQuery: jest.fn(), getCurrentTraceId: jest.fn() } },
        { provide: OrderEventsService, useValue: { publishOrderCreated: jest.fn().mockResolvedValue(undefined) } },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('P1-1：下架品（isActive=false）直购 → BadRequestException 400「商品已下架」，不 404', async () => {
    const productRepo = mkProductRepo();
    productRepo.findOne.mockResolvedValue({ ...mockProductBase, isActive: false });
    mockOrderRepository.manager.transaction.mockImplementation(async (cb: any) => cb(mkTrxManager(productRepo)));

    await expect(service.create(mkOrderData())).rejects.toMatchObject({
      constructor: BadRequestException,
      message: expect.stringContaining('商品已下架'),
    });
    await expect(service.create(mkOrderData())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('P1-1：上架品正常下单不受影响（守卫不误伤）', async () => {
    const productRepo = mkProductRepo();
    mockOrderRepository.manager.transaction.mockImplementation(async (cb: any) => cb(mkTrxManager(productRepo)));

    await expect(service.create(mkOrderData())).resolves.toBe(mockOrder);
  });

  it('P0：乐观锁冲突（库存条件 UPDATE affected=0）→ ConflictException 409「请重试」，不 500', async () => {
    const productRepo = mkProductRepo();
    (productRepo.createQueryBuilder as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }), // 并发写先行落库
    });
    mockOrderRepository.manager.transaction.mockImplementation(async (cb: any) => cb(mkTrxManager(productRepo)));

    await expect(service.create(mkOrderData())).rejects.toBeInstanceOf(ConflictException);
    await expect(service.create(mkOrderData())).rejects.toThrow('库存不足或已被其他订单修改');
  });

  it('P0：两路并发 create → 下单事务回调零重叠（全局写互斥串行，sqlite 单连接根因修）', async () => {
    const productRepo = mkProductRepo();
    let active = 0;
    let maxOverlap = 0;
    mockOrderRepository.manager.transaction.mockImplementation(async (cb: any) => {
      active++;
      maxOverlap = Math.max(maxOverlap, active);
      await new Promise(r => setTimeout(r, 15)); // 拉长事务窗口，未互斥时必然重叠
      const out = await cb(mkTrxManager(productRepo));
      active--;
      return out;
    });

    // 两路并发、不同商品（对齐四席复现姿势：异商品无冲突也炸的场景）
    const productRepoB = mkProductRepo();
    const [a, b] = await Promise.all([service.create(mkOrderData(1)), service.create(mkOrderData(2))]);
    // 第二路的事务管理器也指向桩（上面 mockImplementation 单一桩已覆盖两路）
    expect(a).toBe(mockOrder);
    expect(b).toBe(mockOrder);
    expect(maxOverlap).toBe(1);
    expect(mockOrderRepository.manager.transaction).toHaveBeenCalledTimes(2);
  });
});
