// 用途：更新产品数据传输对象
// 依赖文件：product.entity.ts, create-product.dto.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:40:00

import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty({ description: '是否上架', required: false })
  isActive?: boolean;
}
