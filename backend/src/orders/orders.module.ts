// 用途：订单管理模块，处理订单相关的业务逻辑
// 依赖文件：database.module.ts, users.module.ts, products.module.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:24:00

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderSnapshotController } from './order-snapshot.controller';
import { PaymentEventsListener } from './payment-events.listener';
import { Order } from './entities/order.entity';
import { OrderSnapshot } from './entities/order-snapshot.entity';
import { OrderSnapshotService } from './order-snapshot.service';
import { OrderSnapshotReadService } from './order-snapshot-read.service';
import { OrderItem } from './entities/order-item.entity';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { MessagingModule } from '../messaging/messaging.module';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, User, Product, OrderSnapshot]),
    UsersModule,
    ProductsModule,
    MonitoringModule,
    MessagingModule,
  ],
  controllers: [OrdersController, OrderSnapshotController],
  providers: [OrdersService, PaymentEventsListener, OrderSnapshotService, OrderSnapshotReadService],
  exports: [OrdersService],
})
export class OrdersModule {}
