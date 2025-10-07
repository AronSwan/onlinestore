import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';

// 实体
import { CartItemEntity } from './infrastructure/entities/cart-item.entity';

// 控制器
import { CartController } from './interfaces/cart.controller';

// 应用服务
import { CartApplicationService } from './application/cart-application.service';

// 领域服务
import { CartDomainService } from './domain/services/cart-domain.service';

// 仓储实现
import { CartRepositoryImpl } from './infrastructure/repositories/cart-repository.impl';
import { CartRepository } from './domain/repositories/cart.repository';

/**
 * 购物车模块 - 基于 CongoMall 的 DDD 架构设计
 */
@Module({
  imports: [TypeOrmModule.forFeature([CartItemEntity]), CqrsModule],
  controllers: [CartController],
  providers: [
    CartApplicationService,
    CartDomainService,
    {
      provide: CartRepository,
      useClass: CartRepositoryImpl,
    },
  ],
  exports: [CartApplicationService],
})
export class CartModule {}
