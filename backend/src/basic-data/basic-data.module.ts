import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegionInfoEntity } from './infrastructure/entities/region-info.entity';
import { RegionController } from './interfaces/region.controller';
import { RegionService } from './application/region.service';

@Module({
  imports: [TypeOrmModule.forFeature([RegionInfoEntity])],
  controllers: [RegionController],
  providers: [RegionService],
  exports: [RegionService],
})
export class BasicDataModule {}
