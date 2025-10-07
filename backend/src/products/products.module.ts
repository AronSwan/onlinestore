// 用途：产品管理模块，处理商品相关的业务逻辑
// 依赖文件：database.module.ts, cache.module.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:22:00

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { SearchModule } from './search/search.module';

import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductImage } from './entities/product-image.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, ProductImage]),
    MonitoringModule,
    forwardRef(() => SearchModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService, SearchModule],
})
export class ProductsModule {}
