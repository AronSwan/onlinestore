import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionInfoEntity } from '../infrastructure/entities/region-info.entity';

@Injectable()
export class RegionService {
  constructor(
    @InjectRepository(RegionInfoEntity) private readonly repo: Repository<RegionInfoEntity>,
  ) {}

  listAll(): Promise<RegionInfoEntity[]> {
    return this.repo.find({ order: { sort: 'ASC' } });
  }

  listByLevel(level: number): Promise<RegionInfoEntity[]> {
    return this.repo.find({ where: { level }, order: { sort: 'ASC' } });
  }

  listByCode(code: string): Promise<RegionInfoEntity[]> {
    return this.repo.find({ where: { code }, order: { sort: 'ASC' } });
  }

  listByParent(parent: string): Promise<RegionInfoEntity[]> {
    return this.repo.find({ where: { parent }, order: { sort: 'ASC' } });
  }
}
